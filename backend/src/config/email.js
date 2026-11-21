const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { env } = require('./env');
const logger = require('../utils/logger');

let transporter = null;
let warnedGmailDeliverability = false;

/** Domains / patterns used by QA suites — never hit real SMTP. */
const TEST_EMAIL_RE =
  /(?:^|\+)qa[-_]?(?:audit|e2e|test)|@(?:example\.(?:test|com)|test|localhost|mailinator\.com|guerrillamail\.com|tempmail|yopmail\.com)\b/i;

const SHARED_INBOX_HOSTS = new Set([
  'smtp.gmail.com',
  'smtp.googlemail.com',
  'smtp-relay.gmail.com',
]);

function isTestOrFakeRecipient(to) {
  const addr = String(to || '')
    .toLowerCase()
    .trim();
  if (!addr || !addr.includes('@')) return true;
  return TEST_EMAIL_RE.test(addr);
}

function emailEnabled() {
  if (env.EMAIL_ENABLED === false) return false;
  if (env.RESEND_API_KEY) return true;
  return Boolean(env.SMTP_USER && env.SMTP_PASS);
}

function parseAddress(value) {
  const raw = String(value || '').trim();
  if (!raw) return { name: '', address: '' };
  const angled = raw.match(/^(.*)<([^>]+)>\s*$/);
  if (angled) {
    return {
      name: angled[1].replace(/^["']|["']$/g, '').trim(),
      address: angled[2].trim().toLowerCase(),
    };
  }
  return { name: '', address: raw.toLowerCase() };
}

function formatAddress(name, address) {
  const addr = String(address || '').trim();
  const display = String(name || '').trim();
  if (!addr) return '';
  if (!display) return addr;
  return `${display} <${addr}>`;
}

function domainOf(emailAddress) {
  const { address } = parseAddress(emailAddress);
  const at = address.lastIndexOf('@');
  return at >= 0 ? address.slice(at + 1) : '';
}

function usesSharedInboxSmtp(host = env.SMTP_HOST) {
  return SHARED_INBOX_HOSTS.has(String(host || '').toLowerCase());
}

function usesResend() {
  return Boolean(env.RESEND_API_KEY) || String(env.SMTP_HOST || '').toLowerCase() === 'smtp.resend.com';
}

/**
 * Keep From aligned with the authenticated mailbox on Gmail/shared inboxes.
 * A custom-domain From over Gmail SMTP is a common spam / rejection trigger.
 */
function resolveFrom() {
  const configured = parseAddress(env.SMTP_FROM || env.SMTP_USER);
  const smtpUser = parseAddress(env.SMTP_USER).address;
  const brandName = configured.name || 'SCOSHA';

  if (usesResend()) {
    return formatAddress(brandName, configured.address || smtpUser);
  }

  if (usesSharedInboxSmtp() && smtpUser) {
    if (configured.address && configured.address !== smtpUser) {
      logger.warn(
        'SMTP_FROM domain does not match Gmail SMTP_USER — forcing From to the authenticated mailbox to reduce spam'
      );
    }
    return formatAddress(brandName, smtpUser);
  }

  return formatAddress(brandName, configured.address || smtpUser);
}

function resolveReplyTo() {
  if (env.SMTP_REPLY_TO) return env.SMTP_REPLY_TO;
  if (env.ADMIN_EMAIL) return env.ADMIN_EMAIL;
  return parseAddress(resolveFrom()).address || undefined;
}

function smtpAuthConfig() {
  if (env.RESEND_API_KEY) {
    return {
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: String(env.RESEND_API_KEY).trim(),
      },
    };
  }

  const pass = String(env.SMTP_PASS || '').replace(/\s+/g, '');
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass,
    },
  };
}

function getTransporter() {
  if (!emailEnabled()) {
    return null;
  }

  if (!transporter) {
    const smtp = smtpAuthConfig();
    transporter = nodemailer.createTransport({
      ...smtp,
      connectionTimeout: env.SMTP_TIMEOUT_MS,
      greetingTimeout: env.SMTP_TIMEOUT_MS,
      socketTimeout: env.SMTP_TIMEOUT_MS,
    });

    if (usesSharedInboxSmtp(smtp.host) && !warnedGmailDeliverability) {
      warnedGmailDeliverability = true;
      logger.warn(
        'Customer mail is using a shared inbox SMTP (e.g. Gmail). Expect spam-folder delivery. Set RESEND_API_KEY + verified domain SMTP_FROM — see EMAIL_DELIVERABILITY.md'
      );
    }
  }

  return transporter;
}

/** Clear cached transporter after SMTP env changes / auth failures */
function resetTransporter() {
  transporter = null;
}

async function verifyEmailConnection() {
  const transport = getTransporter();
  if (!transport) {
    logger.warn('SMTP not configured — emails will be logged only');
    return false;
  }

  try {
    await transport.verify();
    logger.info('SMTP transporter verified', {
      provider: usesResend() ? 'resend' : usesSharedInboxSmtp() ? 'gmail' : 'smtp',
      from: resolveFrom(),
    });
    return true;
  } catch (error) {
    logger.error('SMTP verification failed', { message: error.message });
    resetTransporter();
    return false;
  }
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function buildMailOptions({ to, subject, html, text, attachments }) {
  const from = resolveFrom();
  const replyTo = resolveReplyTo();
  const fromDomain = domainOf(from) || 'localhost';
  const messageId = `<${crypto.randomUUID()}@${fromDomain}>`;
  const unsub = env.SMTP_REPLY_TO || replyTo;

  return {
    from,
    to,
    replyTo,
    subject,
    html,
    text: text || (html ? htmlToText(html) : undefined),
    attachments,
    messageId,
    headers: {
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'All',
      ...(unsub
        ? {
            'List-Unsubscribe': `<mailto:${parseAddress(unsub).address}?subject=unsubscribe>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }
        : {}),
    },
  };
}

async function sendEmail({ to, subject, html, text, attachments }) {
  if (isTestOrFakeRecipient(to)) {
    logger.info(`[email-skipped-test] ${subject} -> ${to}`);
    return { success: false, message: 'Skipped test/fake recipient', skipped: true };
  }

  const transport = getTransporter();

  if (!transport) {
    logger.warn(`Email not sent (SMTP not configured): ${subject} -> ${to}`);
    logger.info(`[email-preview] ${subject} -> ${to}`);
    return { success: false, message: 'SMTP not configured' };
  }

  try {
    const mail = buildMailOptions({ to, subject, html, text, attachments });
    const info = await withTimeout(transport.sendMail(mail), env.SMTP_TIMEOUT_MS, 'SMTP send');

    logger.info(`Email sent: ${subject} -> ${to}`, {
      messageId: info.messageId,
      from: mail.from,
      provider: usesResend() ? 'resend' : usesSharedInboxSmtp() ? 'gmail' : 'smtp',
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    resetTransporter();
    logger.error(`Email failed: ${subject} -> ${to}`, { message: error.message });
    return {
      success: false,
      message: error.message || 'Failed to send email',
    };
  }
}

/**
 * Fire-and-forget email. Never rejects; logs failures.
 * Use for order notifications and other non-critical mail so the API
 * response is not blocked by SMTP latency.
 */
function sendEmailAsync(payload) {
  setImmediate(() => {
    sendEmail(payload).catch((error) => {
      logger.error('Background email failed', { message: error.message });
    });
  });
}

module.exports = {
  getTransporter,
  resetTransporter,
  verifyEmailConnection,
  sendEmail,
  sendEmailAsync,
  emailEnabled,
  isTestOrFakeRecipient,
  parseAddress,
  resolveFrom,
  resolveReplyTo,
  buildMailOptions,
  usesResend,
  usesSharedInboxSmtp,
};

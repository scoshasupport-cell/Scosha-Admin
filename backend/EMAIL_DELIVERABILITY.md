# SCOSHA — Email deliverability (stop spam folder)

Customer mail sent through **Gmail SMTP** often lands in spam. Filters treat automated store mail from `@gmail.com` as bulk / untrusted.

## Fix (recommended): Resend + your domain

1. Buy or use a domain you control (e.g. `scosha.com`).
2. Sign up at [resend.com](https://resend.com) (free tier is enough to start).
3. **Domains → Add** your domain and add the DNS records Resend shows (SPF, DKIM, optionally DMARC).
4. Wait until the domain status is **Verified**.
5. Create an API key and put it in `backend/.env`:

```env
RESEND_API_KEY=re_xxxxxxxx
SMTP_FROM=SCOSHA <orders@yourdomain.com>
SMTP_REPLY_TO=support@yourdomain.com
ADMIN_EMAIL=support@yourdomain.com
EMAIL_ENABLED=1
```

Leave `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` empty when `RESEND_API_KEY` is set — the app switches to Resend SMTP automatically.

6. Restart the backend. Logs should show `provider: "resend"`.
7. Place a test order to a real inbox (Gmail/Outlook) and confirm it arrives in **Inbox**.

## What the app already does

- Aligns `From` with the authenticated mailbox on Gmail (avoids domain spoofing).
- Adds `Reply-To`, plain-text body, stable `Message-ID`, and `List-Unsubscribe` headers.
- Warns in logs when still using Gmail for outbound mail.

## Alternatives

Same pattern works with SendGrid, Amazon SES, Postmark, or Mailgun: set their SMTP host/user/pass and a **verified-domain** `SMTP_FROM`. Do not use a custom-domain `From` over Gmail SMTP.

## Verify headers

In the received message → Show original / View source. You want **SPF = pass**, **DKIM = pass**, **DMARC = pass**.

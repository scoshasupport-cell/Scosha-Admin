/**
 * Rich PDF / Excel builders for retail-style reports (Top sellers + DSR).
 */
const https = require('https');
const http = require('http');
const { URL } = require('url');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

function fetchImageBuffer(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') return resolve(null);
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return resolve(null);
    }
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.get(
      url,
      {
        timeout: timeoutMs,
        headers: { 'User-Agent': 'SCOSHA-Report/1.0', Accept: 'image/*' },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return fetchImageBuffer(res.headers.location, timeoutMs).then(resolve);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return resolve(null);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      },
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function preloadImages(urls, concurrency = 6) {
  const unique = [...new Set(urls.filter(Boolean))];
  const map = new Map();
  let i = 0;
  async function worker() {
    while (i < unique.length) {
      const idx = i++;
      const u = unique[idx];
      map.set(u, await fetchImageBuffer(u));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, () => worker()));
  return map;
}

function fmtMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n) {
  if (n == null || Number.isNaN(Number(n))) return '';
  const v = Number(n);
  return `${v >= 0 ? '' : ''}${v.toFixed(0)}%`;
}

function startPdf(title, { landscape = true } = {}) {
  const doc = new PDFDocument({
    margin: 28,
    size: 'A4',
    layout: landscape ? 'landscape' : 'portrait',
  });
  const chunks = [];
  const done = new Promise((resolve, reject) => {
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  return { doc, done };
}

function drawHeader(doc, { title, subtitle, meta }) {
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text(title, { continued: false });
  if (subtitle) {
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text(subtitle);
  }
  if (meta) {
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(meta);
  }
  doc.moveDown(0.5);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#cbd5e1')
    .stroke();
  doc.moveDown(0.4);
}

function ensureSpace(doc, need = 80) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - need) {
    doc.addPage();
  }
}

/**
 * Top sellers catalog PDF with product thumbnails (Top 50 / category / theme style).
 */
async function buildTopSellersPdf({
  title,
  subtitle,
  meta,
  sections,
}) {
  const { doc, done } = startPdf(title, { landscape: true });
  drawHeader(doc, { title, subtitle, meta });

  const allUrls = [];
  for (const section of sections) {
    for (const row of section.rows || []) {
      if (row.image) allUrls.push(row.image);
    }
  }
  const images = await preloadImages(allUrls);

  const left = doc.page.margins.left;
  const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const imgW = 42;
  const rankW = 28;
  const qtyW = 48;
  const revW = 72;
  const pctW = 44;
  const catW = 90;
  const nameW = usable - imgW - rankW - qtyW - revW - revW - pctW - catW - 24;

  for (const section of sections) {
    ensureSpace(doc, 100);
    if (section.heading) {
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#1e3a5f').text(section.heading);
      if (section.subheading) {
        doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(section.subheading);
      }
      doc.moveDown(0.3);
    }

    // Column headers
    ensureSpace(doc, 40);
    const hy = doc.y;
    doc.rect(left, hy, usable, 16).fill('#1e3a5f');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    let x = left + 4;
    const headers = [
      ['#', rankW],
      ['', imgW],
      ['Product', nameW],
      ['Category', catW],
      ['Qty', qtyW],
      ['Sales USD', revW],
      ['Sales LBP', revW],
      ['Weight', pctW],
    ];
    for (const [label, w] of headers) {
      doc.text(label, x, hy + 4, { width: w - 4, align: label === 'Product' ? 'left' : 'center' });
      x += w;
    }
    doc.y = hy + 20;
    doc.fillColor('#0f172a');

    let alt = false;
    for (const row of section.rows || []) {
      ensureSpace(doc, 52);
      const y = doc.y;
      const rowH = 48;
      if (alt) {
        doc.rect(left, y, usable, rowH).fill('#f1f5f9');
      }
      alt = !alt;
      doc.fillColor('#0f172a').font('Helvetica').fontSize(8);

      let cx = left + 4;
      doc.font('Helvetica-Bold').text(String(row.rank ?? ''), cx, y + 16, {
        width: rankW - 4,
        align: 'center',
      });
      cx += rankW;

      const buf = images.get(row.image) || null;
      if (buf) {
        try {
          doc.image(buf, cx + 2, y + 4, { width: imgW - 6, height: rowH - 8, fit: [imgW - 6, rowH - 8] });
        } catch {
          /* skip bad image */
        }
      } else {
        doc.rect(cx + 2, y + 4, imgW - 6, rowH - 8).strokeColor('#cbd5e1').stroke();
      }
      cx += imgW;

      doc
        .font('Helvetica')
        .fillColor('#0f172a')
        .text(row.name || '', cx, y + 10, { width: nameW - 4, height: rowH - 14, ellipsis: true });
      cx += nameW;

      doc.text(row.category || '', cx, y + 16, { width: catW - 4, ellipsis: true });
      cx += catW;

      doc.text(String(row.qty ?? 0), cx, y + 16, { width: qtyW - 4, align: 'center' });
      cx += qtyW;

      doc.text(fmtMoney(row.revenueUsd), cx, y + 16, { width: revW - 4, align: 'right' });
      cx += revW;

      doc.text(row.revenueLbp || '', cx, y + 16, { width: revW - 4, align: 'right' });
      cx += revW;

      const weight = row.weightPct;
      const wColor = weight != null && weight < 0 ? '#dc2626' : '#0f172a';
      doc.fillColor(wColor).text(weight != null ? fmtPct(weight) : '', cx, y + 16, {
        width: pctW - 4,
        align: 'center',
      });

      doc.y = y + rowH;
    }

    if (section.footer) {
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(9).fillColor('#334155').text(section.footer);
    }
    doc.moveDown(0.6);
  }

  doc.end();
  return done;
}

/**
 * Weekly-style summary PDF (KPIs + category weights + alerts).
 */
async function buildWeeklySummaryPdf({ title, subtitle, meta, summary, categories, insights }) {
  const { doc, done } = startPdf(title, { landscape: false });
  drawHeader(doc, { title, subtitle, meta });

  // KPI strip
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a5f').text('Summary');
  doc.moveDown(0.3);
  for (const line of summary || []) {
    doc.font('Helvetica').fontSize(10).fillColor('#0f172a').text(`• ${line}`);
  }
  doc.moveDown(0.6);

  if (insights?.length) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a5f').text('Insights');
    doc.moveDown(0.3);
    for (const line of insights) {
      doc.font('Helvetica').fontSize(9).fillColor('#334155').text(`• ${line}`, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      });
    }
    doc.moveDown(0.6);
  }

  // Category table
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a5f').text('Performance by Category');
  doc.moveDown(0.3);

  const left = doc.page.margins.left;
  const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const cols = [
    { h: 'Category', w: usable * 0.28 },
    { h: 'Sales USD', w: usable * 0.16 },
    { h: 'Qty', w: usable * 0.1 },
    { h: '% Weight', w: usable * 0.12 },
    { h: 'SR %', w: usable * 0.12 },
    { h: 'Target', w: usable * 0.1 },
    { h: 'Alert', w: usable * 0.12 },
  ];

  const hy = doc.y;
  doc.rect(left, hy, usable, 18).fill('#1e3a5f');
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
  let x = left + 3;
  for (const c of cols) {
    doc.text(c.h, x, hy + 5, { width: c.w - 4 });
    x += c.w;
  }
  doc.y = hy + 22;

  for (const row of categories || []) {
    ensureSpace(doc, 22);
    const y = doc.y;
    const alertHigh = row.alert === 'High SR';
    const bg = alertHigh ? '#dcfce7' : row.alert === 'Low SR' ? '#ffedd5' : '#ffffff';
    doc.rect(left, y, usable, 18).fill(bg);
    doc.fillColor('#0f172a').font('Helvetica').fontSize(8);
    x = left + 3;
    const vals = [
      row.category,
      fmtMoney(row.revenueUsd),
      String(row.qty ?? 0),
      fmtPct(row.weightPct),
      fmtPct(row.srPct),
      fmtPct(row.srTarget),
      row.alert || '',
    ];
    vals.forEach((v, i) => {
      const color = row.alert === 'Low SR' && i === 6 ? '#c2410c' : row.alert === 'High SR' && i === 6 ? '#15803d' : '#0f172a';
      doc.fillColor(color).text(String(v ?? ''), x, y + 5, { width: cols[i].w - 4 });
      x += cols[i].w;
    });
    doc.y = y + 20;
  }

  doc.end();
  return done;
}

/**
 * DSR Excel workbook matching retail daily sales report layout.
 */
async function buildDsrWorkbook({ title, days, weeks, kpis, dailyTarget }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SCOSHA';
  const sheet = workbook.addWorksheet('DSR', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const headers = [
    'Date',
    'Day',
    'Week',
    'Month',
    'Year',
    'Tickets',
    'Items Sold Qty',
    'F/F',
    'Cash Sales',
    'Credit Sales',
    'Cheque',
    'Sales',
    'Total Target',
    'Total Target %',
    'LAL',
    'Total LAL %',
    'Conversion %',
    'ARP',
    'UPT',
    'ATV',
  ];

  sheet.addRow(headers);
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 28;

  const moneyCols = new Set([9, 10, 11, 12, 13, 15, 18, 20]); // 1-based-ish via key index later

  const pushDay = (d, opts = {}) => {
    const row = sheet.addRow([
      d.date,
      d.dayName,
      d.week,
      d.month,
      d.year,
      d.tickets,
      d.soldQty,
      d.footfall ?? '',
      Number(d.cashSales || 0),
      Number(d.creditSales || 0),
      Number(d.chequeSales || 0),
      Number(d.sales || 0),
      d.target != null ? Number(d.target) : dailyTarget || '',
      d.targetPct != null ? Number(d.targetPct) / 100 : '',
      d.lal != null ? Number(d.lal) : '',
      d.lalPct != null ? Number(d.lalPct) / 100 : '',
      d.conversionPct != null ? Number(d.conversionPct) / 100 : '',
      d.arp != null ? Number(d.arp) : '',
      d.upt != null ? Number(d.upt) : '',
      d.atv != null ? Number(d.atv) : '',
    ]);
    if (opts.summary) {
      row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A5F' },
      };
    }
    return row;
  };

  for (const week of weeks || []) {
    for (const day of week.days || []) {
      pushDay(day);
    }
    if (week.total) {
      pushDay(
        {
          ...week.total,
          date: week.total.date || `Week ${week.week} Total`,
          dayName: '',
        },
        { summary: true },
      );
    }
  }

  // Also support flat days if weeks not provided
  if (!weeks?.length && days?.length) {
    for (const day of days) pushDay(day);
  }

  // Column widths
  const widths = [12, 10, 8, 10, 8, 10, 12, 8, 12, 12, 10, 12, 12, 12, 12, 12, 12, 10, 8, 10];
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });

  // Number formats
  [9, 10, 11, 12, 13, 15, 18, 20].forEach((col) => {
    sheet.getColumn(col).numFmt = '#,##0.00';
  });
  [14, 16, 17].forEach((col) => {
    sheet.getColumn(col).numFmt = '0%';
  });
  sheet.getColumn(19).numFmt = '0.00';

  // KPI sheet
  const kpiSheet = workbook.addWorksheet('KPI Summary');
  kpiSheet.addRow(['KPI', 'Target', 'Target to date', 'Actual', '%']);
  const kr = kpiSheet.getRow(1);
  kr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  kr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  for (const k of kpis || []) {
    const row = kpiSheet.addRow([
      k.name,
      k.target ?? '',
      k.targetToDate ?? '',
      k.actual ?? '',
      k.pct != null ? Number(k.pct) / 100 : '',
    ]);
    if (k.pct != null) {
      row.getCell(5).numFmt = '0%';
      if (k.pct < 0) row.getCell(5).font = { color: { argb: 'FFDC2626' }, bold: true };
      else if (k.ok) row.getCell(5).font = { color: { argb: 'FF15803D' }, bold: true };
    }
  }
  kpiSheet.columns = [{ width: 18 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 10 }];
  if (title) {
    kpiSheet.insertRow(1, [title]);
    kpiSheet.getRow(1).font = { bold: true, size: 14 };
  }

  return workbook.xlsx.writeBuffer();
}

/**
 * Simple DSR PDF (portrait summary + daily table).
 */
async function buildDsrPdf({ title, subtitle, meta, days, kpis, insights }) {
  const { doc, done } = startPdf(title, { landscape: true });
  drawHeader(doc, { title, subtitle, meta });

  if (insights?.length) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a5f').text('Highlights');
    doc.moveDown(0.2);
    for (const line of insights) {
      doc.font('Helvetica').fontSize(9).fillColor('#334155').text(`• ${line}`);
    }
    doc.moveDown(0.5);
  }

  if (kpis?.length) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a5f').text('KPI Summary');
    doc.moveDown(0.2);
    for (const k of kpis) {
      const pct = k.pct != null ? ` (${fmtPct(k.pct)})` : '';
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#0f172a')
        .text(`${k.name}: ${k.actual ?? '—'}${pct}`);
    }
    doc.moveDown(0.5);
  }

  const left = doc.page.margins.left;
  const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const cols = [
    ['Date', 0.1],
    ['Day', 0.07],
    ['Wk', 0.05],
    ['Tickets', 0.07],
    ['Qty', 0.06],
    ['Cash', 0.09],
    ['Credit', 0.09],
    ['Sales', 0.1],
    ['Target %', 0.08],
    ['LAL %', 0.07],
    ['ARP', 0.07],
    ['UPT', 0.06],
    ['ATV', 0.09],
  ].map(([h, f]) => ({ h, w: usable * f }));

  ensureSpace(doc, 40);
  let hy = doc.y;
  doc.rect(left, hy, usable, 16).fill('#1e3a5f');
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(7);
  let x = left + 2;
  for (const c of cols) {
    doc.text(c.h, x, hy + 4, { width: c.w - 2, align: 'center' });
    x += c.w;
  }
  doc.y = hy + 18;

  for (const d of days || []) {
    ensureSpace(doc, 16);
    const y = doc.y;
    const isWeek = String(d.date || '').toLowerCase().includes('week') || d.isWeekTotal;
    if (isWeek) doc.rect(left, y, usable, 14).fill('#1e3a5f');
    doc
      .fillColor(isWeek ? '#ffffff' : '#0f172a')
      .font(isWeek ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(7);
    const vals = [
      d.date,
      d.dayName || '',
      d.week ?? '',
      d.tickets ?? 0,
      d.soldQty ?? 0,
      fmtMoney(d.cashSales),
      fmtMoney(d.creditSales),
      fmtMoney(d.sales),
      d.targetPct != null ? fmtPct(d.targetPct) : '',
      d.lalPct != null ? fmtPct(d.lalPct) : '',
      d.arp != null ? fmtMoney(d.arp) : '',
      d.upt != null ? Number(d.upt).toFixed(2) : '',
      d.atv != null ? fmtMoney(d.atv) : '',
    ];
    x = left + 2;
    vals.forEach((v, i) => {
      const neg = typeof v === 'string' && v.trim().startsWith('-');
      if (!isWeek && neg) doc.fillColor('#dc2626');
      else doc.fillColor(isWeek ? '#ffffff' : '#0f172a');
      doc.text(String(v), x, y + 3, { width: cols[i].w - 2, align: 'center' });
      x += cols[i].w;
    });
    doc.y = y + 14;
  }

  doc.end();
  return done;
}

module.exports = {
  fetchImageBuffer,
  preloadImages,
  buildTopSellersPdf,
  buildWeeklySummaryPdf,
  buildDsrWorkbook,
  buildDsrPdf,
  fmtMoney,
  fmtPct,
};

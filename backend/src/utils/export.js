const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

function toCsv(rows, columns) {
  const escape = (value) => {
    const str = value == null ? '' : String(value);
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const header = columns.map((c) => escape(c.header)).join(',');
  const lines = rows.map((row) =>
    columns.map((c) => escape(typeof c.value === 'function' ? c.value(row) : row[c.key])).join(',')
  );
  return [header, ...lines].join('\n');
}

async function toXlsx(rows, columns, sheetName = 'Report') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width || 18,
  }));

  rows.forEach((row) => {
    const data = {};
    columns.forEach((c) => {
      data[c.key] = typeof c.value === 'function' ? c.value(row) : row[c.key];
    });
    sheet.addRow(data);
  });

  sheet.getRow(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
}

function toPdf(rows, columns, title = 'Report') {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colCount = Math.max(columns.length, 1);
    const colWidth = pageWidth / colCount;

    doc.fontSize(16).font('Helvetica-Bold').text(title, { underline: true });
    doc.moveDown(0.6);
    doc.font('Helvetica').fontSize(8);

    const drawRow = (values, bold = false) => {
      const y = doc.y;
      if (y > doc.page.height - 50) {
        doc.addPage();
      }
      const startY = doc.y;
      let maxH = 0;
      values.forEach((val, i) => {
        const text = val == null ? '' : String(val);
        const h = doc.heightOfString(text, { width: colWidth - 6 });
        if (h > maxH) maxH = h;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
        doc.text(text, doc.page.margins.left + i * colWidth, startY, {
          width: colWidth - 6,
          lineBreak: true,
        });
      });
      doc.y = startY + Math.max(maxH, 12) + 4;
    };

    drawRow(
      columns.map((c) => c.header),
      true
    );
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor('#cccccc')
      .stroke();
    doc.moveDown(0.3);

    rows.forEach((row) => {
      drawRow(
        columns.map((c) => {
          const val = typeof c.value === 'function' ? c.value(row) : row[c.key];
          return val == null ? '' : val;
        })
      );
    });

    doc.end();
  });
}

/**
 * Build an export buffer/string and content-type for the given format.
 */
async function buildExport({ format, rows, columns, title, sheetName }) {
  const fmt = String(format || 'csv').toLowerCase();

  if (fmt === 'xlsx') {
    const buffer = await toXlsx(rows, columns, sheetName || title || 'Report');
    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${(title || 'report').replace(/\s+/g, '-').toLowerCase()}.xlsx`,
    };
  }

  if (fmt === 'pdf') {
    const buffer = await toPdf(rows, columns, title || 'Report');
    return {
      buffer,
      contentType: 'application/pdf',
      filename: `${(title || 'report').replace(/\s+/g, '-').toLowerCase()}.pdf`,
    };
  }

  const csv = toCsv(rows, columns);
  return {
    buffer: Buffer.from(csv, 'utf8'),
    contentType: 'text/csv; charset=utf-8',
    filename: `${(title || 'report').replace(/\s+/g, '-').toLowerCase()}.csv`,
  };
}

module.exports = {
  toCsv,
  toXlsx,
  toPdf,
  buildExport,
};

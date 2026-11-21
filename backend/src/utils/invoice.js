const PDFDocument = require('pdfkit');
const {
  formatUsd,
  formatLbp,
  formatOrderDateParts,
  orderReference,
  resolveUsdToLbp,
} = require('./orderMoney');
const { orderTrackUrl, qrPngBuffer } = require('./qr');

const BRAND = process.env.STORE_BRAND || 'SCOSHA';

function shipAddr(order) {
  return order.shippingAddress || {};
}

function customerBits(order, addr) {
  return {
    name: addr.name || addr.fullName || order.customerName || '—',
    phone: addr.phone || order.customerPhone || '',
    email: addr.email || order.customerEmail || '',
  };
}

/**
 * Generate a compact e-ticket / purchase receipt PDF (Zara-style) with track QR.
 * @param {object} order
 * @param {object} [settings]
 * @returns {Promise<Buffer>}
 */
async function generateInvoicePdf(order, settings = {}) {
  const trackUrl = orderTrackUrl(order);
  let qrBuf;
  try {
    qrBuf = await qrPngBuffer(trackUrl, 160);
  } catch {
    qrBuf = null;
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const addr = shipAddr(order);
    const cust = customerBits(order, addr);
    const rate = resolveUsdToLbp(settings);
    const { date, time } = formatOrderDateParts(order.createdAt);
    const ref = orderReference(order);

    doc.fontSize(18).font('Helvetica-Bold').text(BRAND, { align: 'left' });
    doc.moveDown(0.6);
    doc.font('Helvetica').fontSize(10).fillColor('#666').text('E-TICKET / PURCHASE RECEIPT');
    doc.moveDown(0.8);

    doc.fillColor('#000').fontSize(11);
    doc.text(`Order : ${date}`);
    doc.font('Helvetica-Bold').fontSize(14).text(ref);
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor('#444');
    doc.text(`Time: ${time}`);
    doc.text(`Payment: Cash on Delivery`);
    doc.moveDown();

    doc.fillColor('#000').font('Helvetica-Bold').fontSize(11).text('HOME DELIVERY');
    doc.font('Helvetica').fontSize(10).fillColor('#333');
    doc.text(cust.name);
    if (cust.phone) doc.text(cust.phone);
    doc.text([addr.line1, addr.line2].filter(Boolean).join(', '));
    doc.text([addr.city, addr.state, addr.zip || addr.postalCode].filter(Boolean).join(', '));
    doc.text(addr.country || '');
    doc.moveDown();

    doc.fillColor('#000').font('Helvetica-Bold').fontSize(11).text('ITEMS');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10);

    (order.items || []).forEach((item) => {
      const unit = Number(item.unitPrice || item.price || 0);
      const qty = Number(item.quantity || 0);
      const line = Number(item.lineTotal ?? unit * qty);
      const sizeColor = [item.size, item.color].filter(Boolean).join(' ').toUpperCase();
      doc.font('Helvetica-Bold').fillColor('#000').text(item.name || 'Item');
      doc.font('Helvetica').fillColor('#333');
      doc.text(`${item.sku || ref}  ·  Qty ${qty}`);
      doc.text(`Selected size: ${item.size || '—'}   ${sizeColor}`);
      doc.text(`${formatUsd(line)}   |   ${formatLbp(line, rate)}`);
      doc.moveDown(0.5);
    });

    doc.moveDown(0.3);
    doc.fillColor('#000').fontSize(10);
    doc.text(`SUBTOTAL     ${formatUsd(order.subtotal)}   (${formatLbp(order.subtotal, rate)})`);
    doc.text(
      `SHIPPING     ${formatUsd(order.shippingCharge)}   (${formatLbp(order.shippingCharge, rate)})`,
    );
    if (Number(order.couponDiscount) > 0) {
      doc.text(`DISCOUNT    -${formatUsd(order.couponDiscount)}`);
    }
    doc.moveDown(0.3);
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`TOTAL     ${formatUsd(order.total)}`);
    doc.font('Helvetica').fontSize(10).fillColor('#444');
    doc.text(formatLbp(order.total, rate));

    doc.moveDown(1);
    if (qrBuf) {
      doc.font('Helvetica-Bold').fillColor('#000').fontSize(11).text('SCAN TO TRACK ORDER');
      doc.moveDown(0.4);
      doc.image(qrBuf, { width: 100, height: 100 });
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(8).fillColor('#666').text(trackUrl, { width: 400 });
    }

    doc.moveDown(0.8);
    doc.fillColor('#666').fontSize(9);
    doc.text(
      'This receipt is required to return purchased items. You can present it on your phone or print it out. Scan the QR code to track your order.',
      { width: 480 },
    );
    doc.moveDown(0.5);
    doc.text(`Reference: ${ref}`);

    doc.end();
  });
}

/**
 * Packing / parcel label for admin to print and stick on the shipment.
 * Includes order + customer address + items + track QR.
 * @param {object} order
 * @param {object} [settings]
 * @returns {Promise<Buffer>}
 */
async function generatePackingSlipPdf(order, settings = {}) {
  const trackUrl = orderTrackUrl(order);
  let qrBuf;
  try {
    qrBuf = await qrPngBuffer(trackUrl, 140);
  } catch {
    qrBuf = null;
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const addr = shipAddr(order);
    const cust = customerBits(order, addr);
    const rate = resolveUsdToLbp(settings);
    const { date, time } = formatOrderDateParts(order.createdAt);
    const ref = orderReference(order);
    const orderNo = order.orderNumber || ref;
    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Header band
    doc.rect(doc.page.margins.left, doc.page.margins.top, pageW, 52).fill('#111');
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(18);
    doc.text(BRAND, doc.page.margins.left + 14, doc.page.margins.top + 10, { continued: false });
    doc.font('Helvetica').fontSize(10).fillColor('#ccc');
    doc.text('PACKING RECEIPT / PARCEL LABEL', doc.page.margins.left + 14, doc.page.margins.top + 32);

    doc.fillColor('#000');
    doc.y = doc.page.margins.top + 68;

    // Meta + QR side by side
    const metaTop = doc.y;
    doc.font('Helvetica').fontSize(9).fillColor('#666').text('ORDER NUMBER');
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000').text(String(orderNo));
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor('#333');
    doc.text(`Reference: ${ref}`);
    doc.text(`Date: ${date}  ·  Time: ${time}`);
    doc.text(`Status: ${String(order.status || 'pending').toUpperCase()}`);
    doc.text(`Payment: Cash on Delivery`);
    doc.text(`Delivery: ${order.deliveryMethod || 'standard'}`);
    if (order.trackingNumber) {
      doc.text(`Tracking #: ${order.trackingNumber}`);
    }

    if (qrBuf) {
      const qrX = doc.page.width - doc.page.margins.right - 110;
      doc.image(qrBuf, qrX, metaTop, { width: 100, height: 100 });
      doc.font('Helvetica').fontSize(7).fillColor('#666');
      doc.text('Scan to track', qrX, metaTop + 104, { width: 100, align: 'center' });
    }

    doc.y = Math.max(doc.y, metaTop + 120);
    doc.moveDown(0.6);

    // Ship-to box
    doc.strokeColor('#111').lineWidth(1.5);
    const boxY = doc.y;
    doc.rect(doc.page.margins.left, boxY, pageW, 118).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000');
    doc.text('SHIP TO', doc.page.margins.left + 10, boxY + 8);
    doc.font('Helvetica-Bold').fontSize(13).text(cust.name, doc.page.margins.left + 10, boxY + 26);
    doc.font('Helvetica').fontSize(11).fillColor('#222');
    let ty = boxY + 46;
    if (cust.phone) {
      doc.text(cust.phone, doc.page.margins.left + 10, ty);
      ty += 14;
    }
    if (cust.email) {
      doc.text(cust.email, doc.page.margins.left + 10, ty);
      ty += 14;
    }
    doc.text([addr.line1, addr.line2].filter(Boolean).join(', '), doc.page.margins.left + 10, ty, {
      width: pageW - 20,
    });
    ty = doc.y + 2;
    doc.text(
      [addr.city, addr.state, addr.zip || addr.postalCode].filter(Boolean).join(', '),
      doc.page.margins.left + 10,
      ty,
      { width: pageW - 20 },
    );
    doc.text(addr.country || '', doc.page.margins.left + 10, doc.y + 2);

    doc.y = boxY + 128;
    doc.moveDown(0.4);

    // Items table header
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000').text('ITEMS TO PACK');
    doc.moveDown(0.3);
    const col = {
      sku: doc.page.margins.left,
      name: doc.page.margins.left + 90,
      size: doc.page.width - doc.page.margins.right - 140,
      qty: doc.page.width - doc.page.margins.right - 70,
      price: doc.page.width - doc.page.margins.right - 50,
    };
    doc.font('Helvetica').fontSize(8).fillColor('#666');
    doc.text('SKU / REF', col.sku, doc.y, { width: 85 });
    doc.text('PRODUCT', col.name, doc.y, { width: 200 });
    doc.text('SIZE', col.size, doc.y, { width: 60 });
    doc.text('QTY', col.qty, doc.y, { width: 30, align: 'right' });
    doc.moveDown(0.2);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor('#111')
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.3);

    (order.items || []).forEach((item) => {
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
      }
      const qty = Number(item.quantity || 0);
      const y = doc.y;
      doc.font('Helvetica').fontSize(9).fillColor('#000');
      doc.text(String(item.sku || ref).slice(0, 16), col.sku, y, { width: 85 });
      doc.text(String(item.name || 'Item'), col.name, y, { width: 200 });
      doc.text(String(item.size || '—'), col.size, y, { width: 60 });
      doc.font('Helvetica-Bold').text(String(qty), col.qty, y, { width: 30, align: 'right' });
      doc.moveDown(0.15);
      if (item.color) {
        doc.font('Helvetica').fontSize(8).fillColor('#666').text(`Color: ${item.color}`, col.name);
      }
      doc.moveDown(0.35);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor('#e5e5e5')
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(0.35);
    });

    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(10).fillColor('#000');
    doc.text(`Subtotal: ${formatUsd(order.subtotal)}  (${formatLbp(order.subtotal, rate)})`);
    doc.text(
      `Shipping: ${formatUsd(order.shippingCharge ?? order.shipping ?? 0)}  (${formatLbp(order.shippingCharge ?? order.shipping ?? 0, rate)})`,
    );
    if (Number(order.couponDiscount || order.discount) > 0) {
      doc.text(`Discount: -${formatUsd(order.couponDiscount || order.discount)}`);
    }
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`TOTAL DUE (COD): ${formatUsd(order.total)}  ·  ${formatLbp(order.total, rate)}`);

    if (order.notes) {
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(9).fillColor('#444');
      doc.text(`Notes: ${order.notes}`, { width: pageW });
    }

    doc.moveDown(1);
    doc.font('Helvetica').fontSize(8).fillColor('#888');
    doc.text('Place this receipt on the outside of the parcel before handover to delivery.', {
      width: pageW,
    });
    doc.text(`Generated ${new Date().toISOString()}  ·  ${BRAND}`, { width: pageW });

    doc.end();
  });
}

module.exports = { generateInvoicePdf, generatePackingSlipPdf };

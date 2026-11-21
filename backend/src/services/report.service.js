const { prisma } = require('../config/prisma');
const { buildExport } = require('../utils/export');
const {
  buildTopSellersPdf,
  buildWeeklySummaryPdf,
  buildDsrWorkbook,
  buildDsrPdf,
} = require('../utils/reportVisual');
const { PAID_STATUSES } = require('./dashboard.service');
const { getSingleton } = require('./setting.service');
const { resolveUsdToLbp, formatLbp } = require('../utils/orderMoney');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function shiftYears(d, years) {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + years);
  return x;
}

function classifyPayment(method) {
  const m = String(method || '').toLowerCase();
  if (!m || m === 'cod' || m.includes('cash')) return 'cash';
  if (m.includes('cheque') || m.includes('check')) return 'cheque';
  if (m.includes('card') || m.includes('credit') || m.includes('stripe') || m.includes('visa')) {
    return 'credit';
  }
  return 'credit';
}

function pctChange(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p === 0) return c === 0 ? 0 : 100;
  return ((c - p) / p) * 100;
}

async function loadOrderItems(query = {}) {
  const where = {
    order: {
      status: { in: PAID_STATUSES },
      ...dateFilter({ from: query.from, to: query.to }),
    },
  };
  return prisma.orderItem.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: true,
          tags: true,
          categoryId: true,
          category: { select: { id: true, name: true, slug: true } },
          collections: {
            include: { collection: { select: { id: true, title: true, slug: true } } },
            take: 3,
          },
        },
      },
      order: { select: { id: true, createdAt: true, paymentMethod: true, status: true } },
    },
  });
}

function productImage(product, fallback) {
  const imgs = product?.images;
  if (Array.isArray(imgs) && imgs[0]) return imgs[0];
  return fallback || '';
}

function aggregateProducts(items) {
  const map = new Map();
  for (const item of items) {
    const pid = item.productId || `name:${item.name}`;
    const product = item.product;
    const cur = map.get(pid) || {
      productId: item.productId,
      name: item.name || product?.name || 'Unknown',
      image: productImage(product, item.imageUrl),
      category: product?.category?.name || 'Uncategorized',
      categoryId: product?.categoryId || product?.category?.id || null,
      themes: [],
      qty: 0,
      revenue: 0,
    };
    cur.qty += item.quantity;
    cur.revenue += num(item.unitPrice) * item.quantity;
    if (!cur.image) cur.image = productImage(product, item.imageUrl);
    if (product?.collections?.length) {
      for (const pc of product.collections) {
        const t = pc.collection?.title;
        if (t && !cur.themes.includes(t)) cur.themes.push(t);
      }
    }
    if (Array.isArray(product?.tags)) {
      for (const tag of product.tags) {
        if (typeof tag === 'string' && tag && !cur.themes.includes(tag)) cur.themes.push(tag);
      }
    }
    map.set(pid, cur);
  }
  return [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
}

function withWeights(rows, rate) {
  const totalRev = rows.reduce((s, r) => s + (Number(r.revenue) || 0), 0) || 1;
  return rows.map((r, i) => ({
    ...r,
    rank: i + 1,
    revenueUsd: Number(r.revenue) || 0,
    revenueLbp: formatLbp(r.revenue, rate),
    weightPct: ((Number(r.revenue) || 0) / totalRev) * 100,
    __usdToLbp: rate,
  }));
}

async function categoryStockMap() {
  const variants = await prisma.productVariant.findMany({
    where: { status: 'active' },
    select: { stock: true, product: { select: { categoryId: true } } },
  });
  const map = new Map();
  for (const v of variants) {
    const cid = v.product?.categoryId;
    if (cid == null) continue;
    map.set(cid, (map.get(cid) || 0) + (Number(v.stock) || 0));
  }
  return map;
}

function num(v) {
  if (v == null) return v;
  return Number(v);
}

function dateFilter(query = {}) {
  if (!query.from && !query.to) return {};
  const createdAt = {};
  if (query.from) createdAt.gte = new Date(query.from);
  if (query.to) createdAt.lte = new Date(query.to);
  return { createdAt };
}

function dateKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

async function usdToLbpRate() {
  const settings = await getSingleton();
  return resolveUsdToLbp(settings);
}

/** USD column + Lebanese Lira equivalent column */
function moneyColumns(headerUsd, key, getValue) {
  const getter =
    typeof getValue === 'function' ? getValue : (row) => num(row[key]);
  return [
    {
      header: `${headerUsd} (USD)`,
      key: `${key}Usd`,
      value: (r) => {
        const v = getter(r);
        return v == null || Number.isNaN(Number(v)) ? '' : Number(v).toFixed(2);
      },
    },
    {
      header: `${headerUsd} (LBP)`,
      key: `${key}Lbp`,
      value: (r) => {
        const v = getter(r);
        if (v == null || Number.isNaN(Number(v))) return '';
        return formatLbp(v, r.__usdToLbp);
      },
    },
  ];
}

function withRate(rows, rate) {
  return rows.map((r) => ({ ...r, __usdToLbp: rate }));
}

async function salesReport(query = {}) {
  const rate = await usdToLbpRate();
  const where = { ...dateFilter(query), status: { in: PAID_STATUSES } };
  const rows = await prisma.order.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = withRate(
    rows.map((r) => ({
      ...r,
      subtotal: num(r.subtotal),
      couponDiscount: num(r.couponDiscount),
      shippingCharge: num(r.shippingCharge),
      tax: num(r.tax),
      total: num(r.total),
      userId: r.user
        ? { _id: r.user.id, id: r.user.id, name: r.user.name, email: r.user.email }
        : r.userId,
    })),
    rate,
  );

  const columns = [
    { header: 'Order #', key: 'orderNumber' },
    { header: 'Customer', key: 'customer', value: (r) => r.userId?.name || '' },
    { header: 'Email', key: 'email', value: (r) => r.userId?.email || '' },
    ...moneyColumns('Subtotal', 'subtotal'),
    ...moneyColumns('Discount', 'couponDiscount'),
    ...moneyColumns('Shipping', 'shippingCharge'),
    ...moneyColumns('Tax', 'tax'),
    ...moneyColumns('Total', 'total'),
    { header: 'Status', key: 'status' },
    { header: 'Date', key: 'createdAt', value: (r) => new Date(r.createdAt).toISOString() },
  ];

  return buildExport({
    format: query.format,
    rows: mapped,
    columns,
    title: 'Sales Report',
  });
}

async function revenueReport(query = {}) {
  const rate = await usdToLbpRate();
  const where = { ...dateFilter(query), status: { in: PAID_STATUSES } };
  const orders = await prisma.order.findMany({
    where,
    select: { createdAt: true, total: true, couponDiscount: true },
  });

  const map = new Map();
  for (const order of orders) {
    const key = dateKey(order.createdAt);
    const cur = map.get(key) || { _id: key, orders: 0, revenue: 0, discount: 0 };
    cur.orders += 1;
    cur.revenue += num(order.total);
    cur.discount += num(order.couponDiscount);
    map.set(key, cur);
  }

  const rows = withRate(
    [...map.values()].sort((a, b) => (a._id < b._id ? -1 : 1)),
    rate,
  );

  const columns = [
    { header: 'Date', key: '_id' },
    { header: 'Orders', key: 'orders' },
    ...moneyColumns('Revenue', 'revenue'),
    ...moneyColumns('Discount', 'discount'),
  ];

  return buildExport({
    format: query.format,
    rows,
    columns,
    title: 'Revenue Report',
  });
}

async function ordersReport(query = {}) {
  const rate = await usdToLbpRate();
  const where = { ...dateFilter(query) };
  if (query.status) where.status = query.status;
  const rows = await prisma.order.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = withRate(
    rows.map((r) => ({
      ...r,
      total: num(r.total),
      userId: r.user
        ? { _id: r.user.id, id: r.user.id, name: r.user.name, email: r.user.email }
        : r.userId,
    })),
    rate,
  );

  const columns = [
    { header: 'Order #', key: 'orderNumber' },
    { header: 'Customer', key: 'customer', value: (r) => r.userId?.name || '' },
    ...moneyColumns('Total', 'total'),
    { header: 'Status', key: 'status' },
    { header: 'Payment', key: 'paymentMethod' },
    { header: 'Items', key: 'items', value: (r) => (r.items || []).length },
    { header: 'Date', key: 'createdAt', value: (r) => new Date(r.createdAt).toISOString() },
  ];

  return buildExport({
    format: query.format,
    rows: mapped,
    columns,
    title: 'Orders Report',
  });
}

async function customersReport(query = {}) {
  const where = { ...dateFilter(query) };
  if (query.status) where.status = query.status;
  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const columns = [
    { header: 'Name', key: 'name' },
    { header: 'Email', key: 'email' },
    { header: 'Phone', key: 'phone' },
    { header: 'Status', key: 'status' },
    { header: 'Verified', key: 'isEmailVerified' },
    { header: 'Joined', key: 'createdAt', value: (r) => new Date(r.createdAt).toISOString() },
  ];

  return buildExport({
    format: query.format,
    rows,
    columns,
    title: 'Customers Report',
  });
}

async function productsReport(query = {}) {
  const rate = await usdToLbpRate();
  const where = {};
  if (query.status) where.status = query.status;
  const rows = await prisma.product.findMany({
    where,
    include: {
      brand: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = withRate(
    rows.map((r) => ({
      ...r,
      basePrice: num(r.basePrice),
      comparePrice: r.comparePrice != null ? num(r.comparePrice) : null,
      ratingAvg: num(r.ratingAvg),
      brandId: r.brand ? { _id: r.brand.id, id: r.brand.id, name: r.brand.name } : r.brandId,
      categoryId: r.category
        ? { _id: r.category.id, id: r.category.id, name: r.category.name }
        : r.categoryId,
    })),
    rate,
  );

  const columns = [
    { header: 'Name', key: 'name' },
    { header: 'Slug', key: 'slug' },
    { header: 'Brand', key: 'brand', value: (r) => r.brandId?.name || '' },
    { header: 'Category', key: 'category', value: (r) => r.categoryId?.name || '' },
    ...moneyColumns('Price', 'basePrice'),
    ...moneyColumns('Compare at', 'comparePrice'),
    { header: 'Status', key: 'status' },
    { header: 'Rating', key: 'ratingAvg' },
    { header: 'Reviews', key: 'reviewCount' },
  ];

  return buildExport({
    format: query.format,
    rows: mapped,
    columns,
    title: 'Products Report',
  });
}

async function inventoryReport(query = {}) {
  const settings = await getSingleton();
  const rate = resolveUsdToLbp(settings);
  const threshold = settings.lowStockThreshold ?? 5;
  const where = {};
  if (query.lowStock === 'true' || query.lowStock === true) {
    where.stock = { lte: threshold };
  }

  const rows = await prisma.productVariant.findMany({
    where,
    include: { product: { select: { id: true, name: true, slug: true } } },
    orderBy: { stock: 'asc' },
  });

  const mapped = withRate(
    rows.map((r) => ({
      ...r,
      price: num(r.price),
      color: { name: r.colorName, hex: r.colorHex },
      productId: r.product
        ? { _id: r.product.id, id: r.product.id, name: r.product.name, slug: r.product.slug }
        : r.productId,
    })),
    rate,
  );

  const columns = [
    { header: 'SKU', key: 'sku' },
    { header: 'Product', key: 'product', value: (r) => r.productId?.name || '' },
    { header: 'Color', key: 'color', value: (r) => r.color?.name || '' },
    { header: 'Size', key: 'size' },
    { header: 'Stock', key: 'stock' },
    ...moneyColumns('Price', 'price'),
    { header: 'Status', key: 'status' },
  ];

  return buildExport({
    format: query.format,
    rows: mapped,
    columns,
    title: 'Inventory Report',
  });
}

function periodLabel(query = {}) {
  const from = query.from ? new Date(query.from).toISOString().slice(0, 10) : 'all';
  const to = query.to ? new Date(query.to).toISOString().slice(0, 10) : 'now';
  return `${from} → ${to}`;
}

function topSellerColumns() {
  return [
    { header: 'Rank', key: 'rank' },
    { header: 'Product', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'Qty Sold', key: 'qty' },
    ...moneyColumns('Sales', 'revenueUsd', (r) => r.revenueUsd),
    {
      header: 'Weight %',
      key: 'weightPct',
      value: (r) => (r.weightPct != null ? Number(r.weightPct).toFixed(1) : ''),
    },
    { header: 'Image', key: 'image' },
  ];
}

async function topProductsReport(query = {}) {
  const rate = await usdToLbpRate();
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
  const items = await loadOrderItems(query);
  const ranked = withWeights(aggregateProducts(items).slice(0, limit), rate);
  const fmt = String(query.format || 'csv').toLowerCase();
  const title = `Top ${limit} Products`;
  const subtitle = 'SCOSHA — Top sellers by units sold';
  const meta = `Period: ${periodLabel(query)} · Generated ${new Date().toISOString().slice(0, 10)}`;

  if (fmt === 'pdf') {
    const buffer = await buildTopSellersPdf({
      title,
      subtitle,
      meta,
      sections: [
        {
          heading: `Top ${ranked.length} selling products`,
          subheading: 'Ranked by quantity sold (then revenue)',
          rows: ranked,
          footer: ranked[0]
            ? `Top product: ${ranked[0].name} · ${ranked[0].qty} units · $${Number(ranked[0].revenueUsd).toFixed(2)}`
            : 'No paid sales in this period.',
        },
      ],
    });
    return {
      buffer,
      contentType: 'application/pdf',
      filename: `top-products-${limit}.pdf`,
    };
  }

  return buildExport({
    format: fmt,
    rows: ranked,
    columns: topSellerColumns(),
    title,
    sheetName: 'Top Products',
  });
}

async function topByCategoryReport(query = {}) {
  const rate = await usdToLbpRate();
  const perCategory = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const items = await loadOrderItems(query);
  const all = aggregateProducts(items);

  const byCat = new Map();
  for (const row of all) {
    const key = row.category || 'Uncategorized';
    if (!byCat.has(key)) byCat.set(key, []);
    byCat.get(key).push(row);
  }

  const sections = [...byCat.entries()]
    .map(([category, rows]) => {
      const ranked = withWeights(rows.slice(0, perCategory), rate);
      const catRev = rows.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
      const catQty = rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
      return {
        category,
        catRev,
        catQty,
        heading: category,
        subheading: `Top ${ranked.length} · ${catQty} units · $${catRev.toFixed(2)}`,
        rows: ranked,
        footer: ranked[0] ? `Category top seller: ${ranked[0].name}` : '',
      };
    })
    .sort((a, b) => b.catRev - a.catRev);

  const fmt = String(query.format || 'csv').toLowerCase();
  const title = `Top ${perCategory} per Category`;
  const meta = `Period: ${periodLabel(query)} · ${sections.length} categories`;

  if (fmt === 'pdf') {
    const buffer = await buildTopSellersPdf({
      title,
      subtitle: 'SCOSHA — Top sellers for each category',
      meta,
      sections,
    });
    return {
      buffer,
      contentType: 'application/pdf',
      filename: 'top-by-category.pdf',
    };
  }

  const flat = sections.flatMap((s) =>
    s.rows.map((r) => ({ ...r, categorySection: s.category })),
  );
  return buildExport({
    format: fmt,
    rows: flat,
    columns: [
      { header: 'Category', key: 'categorySection' },
      ...topSellerColumns(),
    ],
    title,
    sheetName: 'Top by Category',
  });
}

async function topByThemeReport(query = {}) {
  const rate = await usdToLbpRate();
  const perTheme = Math.min(20, Math.max(1, parseInt(query.limit, 10) || 5));
  const items = await loadOrderItems(query);
  const all = aggregateProducts(items);

  const byTheme = new Map();
  for (const row of all) {
    const themes = row.themes?.length ? row.themes : ['Uncategorized'];
    for (const theme of themes) {
      if (!byTheme.has(theme)) byTheme.set(theme, new Map());
      const map = byTheme.get(theme);
      const key = row.productId || row.name;
      const cur = map.get(key) || { ...row, qty: 0, revenue: 0 };
      cur.qty += row.qty;
      cur.revenue += row.revenue;
      map.set(key, cur);
    }
  }

  // Avoid double-counting when flattening for overall — per-theme lists are independent.
  const sections = [...byTheme.entries()]
    .map(([theme, map]) => {
      const rows = [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);
      const ranked = withWeights(rows.slice(0, perTheme), rate);
      const themeRev = rows.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
      return {
        theme,
        themeRev,
        heading: theme,
        subheading: `Top ${ranked.length} theme sellers`,
        rows: ranked,
      };
    })
    .sort((a, b) => b.themeRev - a.themeRev)
    .slice(0, 40);

  const fmt = String(query.format || 'csv').toLowerCase();
  const title = `Top ${perTheme} per Theme`;
  const meta = `Period: ${periodLabel(query)} · Themes / collections / tags`;

  if (fmt === 'pdf') {
    const buffer = await buildTopSellersPdf({
      title,
      subtitle: 'SCOSHA — Top 5 theme / collection sellers',
      meta,
      sections,
    });
    return {
      buffer,
      contentType: 'application/pdf',
      filename: 'top-by-theme.pdf',
    };
  }

  const flat = sections.flatMap((s) => s.rows.map((r) => ({ ...r, theme: s.theme })));
  return buildExport({
    format: fmt,
    rows: flat,
    columns: [{ header: 'Theme', key: 'theme' }, ...topSellerColumns()],
    title,
    sheetName: 'Top by Theme',
  });
}

async function loadOrdersForDsr(from, to) {
  return prisma.order.findMany({
    where: {
      status: { in: PAID_STATUSES },
      createdAt: { gte: from, lte: to },
    },
    include: {
      items: { select: { quantity: true, unitPrice: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

function emptyDayMetrics(date) {
  return {
    date: date.toISOString().slice(0, 10),
    dayName: DAY_NAMES[date.getDay()],
    week: isoWeek(date),
    month: MONTH_NAMES[date.getMonth()],
    year: date.getFullYear(),
    tickets: 0,
    soldQty: 0,
    footfall: null,
    cashSales: 0,
    creditSales: 0,
    chequeSales: 0,
    sales: 0,
    target: null,
    targetPct: null,
    lal: null,
    lalPct: null,
    conversionPct: null,
    arp: null,
    upt: null,
    atv: null,
  };
}

function finalizeDayMetrics(m, dailyTarget) {
  const sales = Number(m.sales) || 0;
  const tickets = Number(m.tickets) || 0;
  const soldQty = Number(m.soldQty) || 0;
  m.arp = soldQty > 0 ? sales / soldQty : 0;
  m.upt = tickets > 0 ? soldQty / tickets : 0;
  m.atv = tickets > 0 ? sales / tickets : 0;
  if (dailyTarget != null && Number(dailyTarget) > 0) {
    m.target = Number(dailyTarget);
    m.targetPct = (sales / Number(dailyTarget)) * 100;
  }
  if (m.lal != null) {
    m.lalPct = pctChange(sales, m.lal);
  }
  return m;
}

function sumDayMetrics(days, label) {
  const total = emptyDayMetrics(new Date());
  total.date = label;
  total.dayName = '';
  total.isWeekTotal = true;
  total.footfall = null;
  for (const d of days) {
    total.tickets += d.tickets;
    total.soldQty += d.soldQty;
    total.cashSales += d.cashSales;
    total.creditSales += d.creditSales;
    total.chequeSales += d.chequeSales;
    total.sales += d.sales;
    if (d.lal != null) total.lal = (total.lal || 0) + Number(d.lal);
  }
  if (days[0]) {
    total.week = days[0].week;
    total.month = days[0].month;
    total.year = days[0].year;
  }
  const targetSum = days.reduce((s, d) => s + (Number(d.target) || 0), 0);
  return finalizeDayMetrics(total, targetSum > 0 ? targetSum : null);
}

async function dsrReport(query = {}) {
  const rate = await usdToLbpRate();
  const to = query.to ? endOfDay(new Date(query.to)) : endOfDay(new Date());
  const from = query.from
    ? startOfDay(new Date(query.from))
    : startOfDay(new Date(to.getFullYear(), to.getMonth(), 1));
  const dailyTarget = query.dailyTarget != null ? Number(query.dailyTarget) : null;

  const [orders, priorOrders] = await Promise.all([
    loadOrdersForDsr(from, to),
    loadOrdersForDsr(shiftYears(from, -1), shiftYears(to, -1)),
  ]);

  const dayMap = new Map();
  for (let t = from.getTime(); t <= to.getTime(); t += 86400000) {
    const d = new Date(t);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, emptyDayMetrics(d));
  }

  for (const order of orders) {
    const key = dateKey(order.createdAt);
    const m = dayMap.get(key) || emptyDayMetrics(new Date(order.createdAt));
    m.tickets += 1;
    const itemsQty = (order.items || []).reduce((s, i) => s + i.quantity, 0);
    m.soldQty += itemsQty;
    const total = num(order.total);
    m.sales += total;
    const bucket = classifyPayment(order.paymentMethod);
    if (bucket === 'cash') m.cashSales += total;
    else if (bucket === 'cheque') m.chequeSales += total;
    else m.creditSales += total;
    dayMap.set(key, m);
  }

  const priorByDay = new Map();
  for (const order of priorOrders) {
    // Map prior-year calendar day onto current-year key (same month-day)
    const od = new Date(order.createdAt);
    const key = `${String(od.getMonth() + 1).padStart(2, '0')}-${String(od.getDate()).padStart(2, '0')}`;
    priorByDay.set(key, (priorByDay.get(key) || 0) + num(order.total));
  }

  const days = [...dayMap.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((m) => {
      const md = m.date.slice(5); // MM-DD
      m.lal = priorByDay.has(md) ? priorByDay.get(md) : 0;
      return finalizeDayMetrics(m, dailyTarget);
    });

  // Group into ISO weeks
  const weekMap = new Map();
  for (const d of days) {
    const wk = d.week;
    if (!weekMap.has(wk)) weekMap.set(wk, []);
    weekMap.get(wk).push(d);
  }
  const weeks = [...weekMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, wdays]) => ({
      week,
      days: wdays,
      total: sumDayMetrics(wdays, `Week ${week} Total`),
    }));

  const grand = sumDayMetrics(days, `Grand Total`);
  const monthName = MONTH_NAMES[from.getMonth()];
  const year = from.getFullYear();

  const kpis = [
    {
      name: 'Tickets',
      target: null,
      targetToDate: null,
      actual: grand.tickets,
      pct: null,
    },
    {
      name: 'Sold Qty',
      target: null,
      targetToDate: null,
      actual: grand.soldQty,
      pct: null,
    },
    {
      name: 'Net Sales (USD)',
      target: dailyTarget && days.length ? dailyTarget * days.length : null,
      targetToDate: dailyTarget && days.length ? dailyTarget * days.length : null,
      actual: Number(grand.sales).toFixed(2),
      pct:
        dailyTarget && days.length
          ? pctChange(grand.sales, dailyTarget * days.length)
          : grand.lal
            ? grand.lalPct
            : null,
      ok: grand.lalPct != null ? grand.lalPct >= 0 : undefined,
    },
    {
      name: 'LAL (USD)',
      target: null,
      targetToDate: null,
      actual: Number(grand.lal || 0).toFixed(2),
      pct: grand.lalPct,
      ok: grand.lalPct != null ? grand.lalPct >= 0 : undefined,
    },
    { name: 'ARP (USD)', target: null, targetToDate: null, actual: Number(grand.arp || 0).toFixed(2), pct: null },
    { name: 'UPT', target: null, targetToDate: null, actual: Number(grand.upt || 0).toFixed(2), pct: null },
    { name: 'ATV (USD)', target: null, targetToDate: null, actual: Number(grand.atv || 0).toFixed(2), pct: null },
    {
      name: 'Net Sales (LBP)',
      target: null,
      targetToDate: null,
      actual: formatLbp(grand.sales, rate),
      pct: null,
    },
  ];

  const topDay = [...days].sort((a, b) => b.sales - a.sales)[0];
  const insights = [
    `Period ${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)} · ${grand.tickets} tickets · ${grand.soldQty} units · $${Number(grand.sales).toFixed(2)}`,
    grand.lalPct != null
      ? `Like-for-like vs last year: ${grand.lalPct >= 0 ? '+' : ''}${Number(grand.lalPct).toFixed(0)}%`
      : 'No prior-year sales for LAL comparison.',
    topDay
      ? `Best day: ${topDay.date} (${topDay.dayName}) · $${Number(topDay.sales).toFixed(2)}`
      : null,
  ].filter(Boolean);

  const fmt = String(query.format || 'xlsx').toLowerCase();
  const title = `DSR ${monthName} ${year}`;

  if (fmt === 'pdf') {
    const pdfDays = [];
    for (const w of weeks) {
      pdfDays.push(...w.days);
      pdfDays.push(w.total);
    }
    pdfDays.push({ ...grand, isWeekTotal: true });
    const buffer = await buildDsrPdf({
      title,
      subtitle: 'SCOSHA Daily Sales Report',
      meta: `Rate USD→LBP ${rate} · ${periodLabel(query)}`,
      days: pdfDays,
      kpis,
      insights,
    });
    return { buffer, contentType: 'application/pdf', filename: `dsr-${year}-${String(from.getMonth() + 1).padStart(2, '0')}.pdf` };
  }

  if (fmt === 'csv') {
    const flat = [];
    for (const w of weeks) {
      flat.push(...w.days);
      flat.push(w.total);
    }
    flat.push(grand);
    return buildExport({
      format: 'csv',
      rows: flat,
      columns: [
        { header: 'Date', key: 'date' },
        { header: 'Day', key: 'dayName' },
        { header: 'Week', key: 'week' },
        { header: 'Month', key: 'month' },
        { header: 'Year', key: 'year' },
        { header: 'Tickets', key: 'tickets' },
        { header: 'Items Sold Qty', key: 'soldQty' },
        { header: 'Cash Sales', key: 'cashSales', value: (r) => Number(r.cashSales || 0).toFixed(2) },
        { header: 'Credit Sales', key: 'creditSales', value: (r) => Number(r.creditSales || 0).toFixed(2) },
        { header: 'Cheque', key: 'chequeSales', value: (r) => Number(r.chequeSales || 0).toFixed(2) },
        { header: 'Sales', key: 'sales', value: (r) => Number(r.sales || 0).toFixed(2) },
        { header: 'Target', key: 'target' },
        { header: 'Target %', key: 'targetPct', value: (r) => (r.targetPct != null ? Number(r.targetPct).toFixed(1) : '') },
        { header: 'LAL', key: 'lal', value: (r) => (r.lal != null ? Number(r.lal).toFixed(2) : '') },
        { header: 'LAL %', key: 'lalPct', value: (r) => (r.lalPct != null ? Number(r.lalPct).toFixed(1) : '') },
        { header: 'ARP', key: 'arp', value: (r) => (r.arp != null ? Number(r.arp).toFixed(2) : '') },
        { header: 'UPT', key: 'upt', value: (r) => (r.upt != null ? Number(r.upt).toFixed(2) : '') },
        { header: 'ATV', key: 'atv', value: (r) => (r.atv != null ? Number(r.atv).toFixed(2) : '') },
      ],
      title,
    });
  }

  const buffer = await buildDsrWorkbook({
    title,
    days,
    weeks,
    kpis,
    dailyTarget,
  });
  return {
    buffer,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `dsr-${year}-${String(from.getMonth() + 1).padStart(2, '0')}.xlsx`,
  };
}

async function weeklyReport(query = {}) {
  const rate = await usdToLbpRate();
  const srTarget = query.srTarget != null ? Number(query.srTarget) : 40;
  const to = query.to ? endOfDay(new Date(query.to)) : endOfDay(new Date());
  const from = query.from
    ? startOfDay(new Date(query.from))
    : startOfDay(new Date(to.getTime() - 6 * 86400000));

  const priorFrom = new Date(from.getTime() - (to.getTime() - from.getTime()) - 86400000);
  const priorTo = new Date(from.getTime() - 86400000);

  const [items, priorItems, stockByCat] = await Promise.all([
    loadOrderItems({ from, to }),
    loadOrderItems({ from: priorFrom, to: priorTo }),
    categoryStockMap(),
  ]);

  const products = aggregateProducts(items);
  const priorProducts = aggregateProducts(priorItems);
  const totalRev = products.reduce((s, r) => s + r.revenue, 0);
  const totalQty = products.reduce((s, r) => s + r.qty, 0);
  const priorRev = priorProducts.reduce((s, r) => s + r.revenue, 0);
  const l4l = pctChange(totalRev, priorRev);

  const catMap = new Map();
  for (const p of products) {
    const key = p.category || 'Uncategorized';
    const cur = catMap.get(key) || {
      category: key,
      categoryId: p.categoryId,
      qty: 0,
      revenueUsd: 0,
    };
    cur.qty += p.qty;
    cur.revenueUsd += p.revenue;
    catMap.set(key, cur);
  }
  const priorCat = new Map();
  for (const p of priorProducts) {
    const key = p.category || 'Uncategorized';
    priorCat.set(key, (priorCat.get(key) || 0) + p.revenue);
  }

  const categories = [...catMap.values()]
    .map((c) => {
      const soh = stockByCat.get(c.categoryId) || 0;
      const sold = c.qty;
      const srPct = sold + soh > 0 ? (sold / (sold + soh)) * 100 : 0;
      return {
        ...c,
        weightPct: totalRev > 0 ? (c.revenueUsd / totalRev) * 100 : 0,
        l4lPct: pctChange(c.revenueUsd, priorCat.get(c.category) || 0),
        srPct,
        srTarget,
        alert: srPct >= srTarget ? 'High SR' : 'Low SR',
      };
    })
    .sort((a, b) => b.revenueUsd - a.revenueUsd);

  const topProduct = products[0];
  const topCat = categories[0];
  const bottomCat = categories[categories.length - 1];
  const weekNo = isoWeek(to);

  const summary = [
    `Total Sales: $${totalRev.toFixed(2)} (${formatLbp(totalRev, rate)})`,
    `Orders units: ${totalQty}`,
    `L4L vs prior period: ${l4l >= 0 ? '+' : ''}${l4l.toFixed(0)}%`,
    topProduct ? `Top Product: ${topProduct.name}` : 'Top Product: —',
    topCat ? `Top Category: ${topCat.category}` : 'Top Category: —',
    bottomCat ? `Bottom Performer: ${bottomCat.category}` : 'Bottom Performer: —',
  ];

  const declines = [...categories]
    .filter((c) => c.l4lPct < 0)
    .sort((a, b) => a.l4lPct - b.l4lPct)
    .slice(0, 3);
  const insights = [
    `Overall L4L ${l4l >= 0 ? 'positive' : 'negative'} at ${l4l.toFixed(0)}%.`,
    declines.length
      ? `Biggest declines: ${declines.map((c) => `${c.category} (${c.l4lPct.toFixed(0)}%)`).join(', ')}`
      : 'No category declines vs prior period.',
    `Sell-through target ${srTarget}% · ${categories.filter((c) => c.alert === 'High SR').length} categories above target.`,
  ];

  const fmt = String(query.format || 'pdf').toLowerCase();
  const title = `Weekly Report WK${weekNo} — SCOSHA`;
  const meta = `Period ${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}`;

  if (fmt === 'pdf') {
    const buffer = await buildWeeklySummaryPdf({
      title,
      subtitle: 'Category performance · success rates · top sellers',
      meta,
      summary,
      categories,
      insights,
    });
    return { buffer, contentType: 'application/pdf', filename: `weekly-wk${weekNo}.pdf` };
  }

  return buildExport({
    format: fmt,
    rows: categories,
    columns: [
      { header: 'Category', key: 'category' },
      ...moneyColumns('Sales', 'revenueUsd', (r) => r.revenueUsd),
      { header: 'Qty', key: 'qty' },
      { header: 'Weight %', key: 'weightPct', value: (r) => Number(r.weightPct).toFixed(1) },
      { header: 'L4L %', key: 'l4lPct', value: (r) => Number(r.l4lPct).toFixed(1) },
      { header: 'SR %', key: 'srPct', value: (r) => Number(r.srPct).toFixed(1) },
      { header: 'SR Target', key: 'srTarget' },
      { header: 'Alert', key: 'alert' },
    ],
    title,
    sheetName: 'Weekly',
  });
}

/** Estimated unit cost when product costPrice is not set (DEFAULT_COST_RATIO). */
function resolveCost(unitCost, sellPrice, variantCost, productCost) {
  if (unitCost != null && Number(unitCost) >= 0) return Number(unitCost);
  if (variantCost != null && Number(variantCost) >= 0) return Number(variantCost);
  if (productCost != null && Number(productCost) >= 0) return Number(productCost);
  const ratio = Number(process.env.DEFAULT_COST_RATIO || 0.55);
  return Math.round(Number(sellPrice || 0) * ratio * 100) / 100;
}

async function inOutReport(query = {}) {
  const rate = await usdToLbpRate();
  const where = dateFilter({ from: query.from, to: query.to });
  const movements = await prisma.stockMovement.findMany({
    where: Object.keys(where).length ? { createdAt: where.createdAt } : {},
    include: {
      variant: {
        select: {
          sku: true,
          colorName: true,
          size: true,
          price: true,
          product: { select: { name: true, category: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: Number(query.limit) || 5000,
  });

  // Also include paid sales as OUT when no movements exist yet (historical)
  const saleItems = await loadOrderItems(query);
  const rows = [];

  for (const m of movements) {
    const qty = Number(m.quantity) || 0;
    const direction = qty >= 0 ? 'IN' : 'OUT';
    rows.push({
      date: m.createdAt,
      direction,
      reason: m.reason,
      sku: m.variant?.sku || '',
      product: m.variant?.product?.name || '',
      category: m.variant?.product?.category?.name || '',
      color: m.variant?.colorName || '',
      size: m.variant?.size || '',
      qty: Math.abs(qty),
      stockBefore: m.stockBefore,
      stockAfter: m.stockAfter,
      note: m.note || '',
      orderId: m.orderId || '',
    });
  }

  if (!movements.length && saleItems.length) {
    for (const item of saleItems) {
      rows.push({
        date: item.order?.createdAt,
        direction: 'OUT',
        reason: 'sale',
        sku: item.sku || '',
        product: item.name || item.product?.name || '',
        category: item.product?.category?.name || '',
        color: item.color || '',
        size: item.size || '',
        qty: item.quantity,
        stockBefore: '',
        stockAfter: '',
        note: 'Derived from orders (pre-ledger)',
        orderId: item.order?.id || '',
      });
    }
  }

  const inQty = rows.filter((r) => r.direction === 'IN').reduce((s, r) => s + r.qty, 0);
  const outQty = rows.filter((r) => r.direction === 'OUT').reduce((s, r) => s + r.qty, 0);

  return buildExport({
    rows: withRate(rows, rate),
    columns: [
      { header: 'Date', key: 'date', value: (r) => (r.date ? new Date(r.date).toISOString().slice(0, 19) : '') },
      { header: 'Direction', key: 'direction' },
      { header: 'Reason', key: 'reason' },
      { header: 'SKU', key: 'sku' },
      { header: 'Product', key: 'product' },
      { header: 'Category', key: 'category' },
      { header: 'Color', key: 'color' },
      { header: 'Size', key: 'size' },
      { header: 'Qty', key: 'qty' },
      { header: 'Stock before', key: 'stockBefore' },
      { header: 'Stock after', key: 'stockAfter' },
      { header: 'Note', key: 'note' },
    ],
    title: `In & Out Report — IN ${inQty} / OUT ${outQty}`,
    sheetName: 'InOut',
    format: query.format,
  });
}

async function costsReport(query = {}) {
  const rate = await usdToLbpRate();
  const variants = await prisma.productVariant.findMany({
    where: { status: 'active' },
    include: {
      product: {
        select: {
          name: true,
          costPrice: true,
          basePrice: true,
          category: { select: { name: true } },
          brand: { select: { name: true } },
        },
      },
    },
    orderBy: { sku: 'asc' },
  });

  const rows = variants.map((v) => {
    const sell = Number(v.price) || Number(v.product?.basePrice) || 0;
    const unitCost = resolveCost(null, sell, v.costPrice, v.product?.costPrice);
    const stock = Number(v.stock) || 0;
    return {
      sku: v.sku,
      product: v.product?.name || '',
      brand: v.product?.brand?.name || '',
      category: v.product?.category?.name || '',
      color: v.colorName,
      size: v.size,
      stock,
      sellPrice: sell,
      unitCost,
      stockCost: unitCost * stock,
      costSource: v.costPrice != null || v.product?.costPrice != null ? 'set' : 'estimated',
    };
  });

  const totalCost = rows.reduce((s, r) => s + r.stockCost, 0);

  return buildExport({
    rows: withRate(rows, rate),
    columns: [
      { header: 'SKU', key: 'sku' },
      { header: 'Product', key: 'product' },
      { header: 'Brand', key: 'brand' },
      { header: 'Category', key: 'category' },
      { header: 'Color', key: 'color' },
      { header: 'Size', key: 'size' },
      { header: 'Stock', key: 'stock' },
      ...moneyColumns('Sell price', 'sellPrice'),
      ...moneyColumns('Unit cost', 'unitCost'),
      ...moneyColumns('Stock cost', 'stockCost'),
      { header: 'Cost source', key: 'costSource' },
    ],
    title: `Costs / Inventory valuation — total $${totalCost.toFixed(2)}`,
    sheetName: 'Costs',
    format: query.format,
  });
}

async function marginsReport(query = {}) {
  const rate = await usdToLbpRate();
  const items = await loadOrderItems(query);
  const map = new Map();

  for (const item of items) {
    const key = item.productId || item.sku || item.name;
    const sell = Number(item.unitPrice) || 0;
    const cost = resolveCost(item.unitCost, sell, item.variant?.costPrice, item.product?.costPrice);
    const qty = Number(item.quantity) || 0;
    const cur = map.get(key) || {
      product: item.name || item.product?.name || '',
      category: item.product?.category?.name || '',
      sku: item.sku || '',
      qty: 0,
      revenue: 0,
      cogs: 0,
    };
    cur.qty += qty;
    cur.revenue += sell * qty;
    cur.cogs += cost * qty;
    map.set(key, cur);
  }

  const rows = [...map.values()]
    .map((r) => {
      const gross = r.revenue - r.cogs;
      const marginPct = r.revenue > 0 ? (gross / r.revenue) * 100 : 0;
      return { ...r, grossProfit: gross, marginPct };
    })
    .sort((a, b) => b.grossProfit - a.grossProfit);

  return buildExport({
    rows: withRate(rows, rate),
    columns: [
      { header: 'Product', key: 'product' },
      { header: 'SKU', key: 'sku' },
      { header: 'Category', key: 'category' },
      { header: 'Qty sold', key: 'qty' },
      ...moneyColumns('Revenue', 'revenue'),
      ...moneyColumns('COGS', 'cogs'),
      ...moneyColumns('Gross profit', 'grossProfit'),
      { header: 'Margin %', key: 'marginPct', value: (r) => Number(r.marginPct).toFixed(1) },
    ],
    title: 'Margins by product',
    sheetName: 'Margins',
    format: query.format,
  });
}

async function pnlReport(query = {}) {
  const rate = await usdToLbpRate();
  const where = {
    status: { in: PAID_STATUSES },
    ...dateFilter({ from: query.from, to: query.to }),
  };
  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
  });

  let revenue = 0;
  let discounts = 0;
  let shipping = 0;
  let tax = 0;
  let cogs = 0;
  let tickets = orders.length;
  let units = 0;

  for (const o of orders) {
    revenue += Number(o.subtotal) || 0;
    discounts += Number(o.couponDiscount) || 0;
    shipping += Number(o.shippingCharge) || 0;
    tax += Number(o.tax) || 0;
    for (const item of o.items || []) {
      const sell = Number(item.unitPrice) || 0;
      const cost = resolveCost(item.unitCost, sell);
      const qty = Number(item.quantity) || 0;
      cogs += cost * qty;
      units += qty;
    }
  }

  const netSales = revenue - discounts;
  const grossProfit = netSales - cogs;
  const netBeforeTax = grossProfit + shipping - tax;

  const rows = [
    { line: 'Gross merchandise (subtotal)', amount: revenue },
    { line: 'Discounts / coupons', amount: -discounts },
    { line: 'Net sales', amount: netSales },
    { line: 'Cost of goods (COGS)', amount: -cogs },
    { line: 'Gross profit', amount: grossProfit },
    { line: 'Shipping charged', amount: shipping },
    { line: 'Tax', amount: -tax },
    { line: 'Contribution (approx.)', amount: netBeforeTax },
    { line: 'Orders (tickets)', amount: tickets },
    { line: 'Units sold', amount: units },
    {
      line: 'Gross margin %',
      amount: netSales > 0 ? (grossProfit / netSales) * 100 : 0,
    },
  ];

  return buildExport({
    rows: withRate(rows, rate),
    columns: [
      { header: 'Line', key: 'line' },
      {
        header: 'Amount',
        key: 'amount',
        value: (r) =>
          String(r.line).includes('%')
            ? `${Number(r.amount).toFixed(1)}%`
            : Number(r.amount).toFixed(2),
      },
      {
        header: 'Amount (LBP)',
        key: 'amountLbp',
        value: (r) =>
          String(r.line).includes('%') || String(r.line).includes('Orders') || String(r.line).includes('Units')
            ? ''
            : formatLbp(r.amount, r.__usdToLbp),
      },
    ],
    title: 'Profit & Loss',
    sheetName: 'PnL',
    format: query.format,
  });
}

async function kpisReport(query = {}) {
  const rate = await usdToLbpRate();
  const where = {
    status: { in: PAID_STATUSES },
    ...dateFilter({ from: query.from, to: query.to }),
  };
  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
  });

  const tickets = orders.length;
  let sales = 0;
  let units = 0;
  let cogs = 0;
  for (const o of orders) {
    sales += Number(o.total) || 0;
    for (const item of o.items || []) {
      units += Number(item.quantity) || 0;
      const sell = Number(item.unitPrice) || 0;
      cogs += resolveCost(item.unitCost, sell) * (Number(item.quantity) || 0);
    }
  }

  const upt = tickets > 0 ? units / tickets : 0;
  const avgBasket = tickets > 0 ? sales / tickets : 0;
  const marginPct = sales > 0 ? ((sales - cogs) / sales) * 100 : 0;

  const stockAgg = await prisma.productVariant.aggregate({
    where: { status: 'active' },
    _sum: { stock: true },
    _count: true,
  });

  const rows = [
    { kpi: 'Tickets (orders)', value: tickets },
    { kpi: 'Units sold', value: units },
    { kpi: 'Net sales (USD)', value: Number(sales.toFixed(2)) },
    { kpi: 'UPT (units per transaction)', value: Number(upt.toFixed(2)) },
    { kpi: 'Average basket / ATV (USD)', value: Number(avgBasket.toFixed(2)) },
    { kpi: 'Est. COGS (USD)', value: Number(cogs.toFixed(2)) },
    { kpi: 'Est. margin %', value: Number(marginPct.toFixed(1)) },
    { kpi: 'Active SKUs', value: stockAgg._count || 0 },
    { kpi: 'Units on hand', value: stockAgg._sum?.stock || 0 },
  ];

  return buildExport({
    rows: withRate(rows, rate),
    columns: [
      { header: 'KPI', key: 'kpi' },
      { header: 'Value', key: 'value' },
    ],
    title: 'KPIs',
    sheetName: 'KPIs',
    format: query.format,
  });
}

async function uptReport(query = {}) {
  const rate = await usdToLbpRate();
  const where = {
    status: { in: PAID_STATUSES },
    ...dateFilter({ from: query.from, to: query.to }),
  };
  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  });

  const byDay = new Map();
  for (const o of orders) {
    const key = dateKey(o.createdAt);
    const cur = byDay.get(key) || { date: key, tickets: 0, units: 0 };
    cur.tickets += 1;
    cur.units += (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    byDay.set(key, cur);
  }

  const rows = [...byDay.values()].map((r) => ({
    ...r,
    upt: r.tickets > 0 ? r.units / r.tickets : 0,
  }));

  const totals = rows.reduce(
    (a, r) => ({ tickets: a.tickets + r.tickets, units: a.units + r.units }),
    { tickets: 0, units: 0 },
  );

  return buildExport({
    rows: withRate(rows, rate),
    columns: [
      { header: 'Date', key: 'date' },
      { header: 'Tickets', key: 'tickets' },
      { header: 'Units', key: 'units' },
      { header: 'UPT', key: 'upt', value: (r) => Number(r.upt).toFixed(2) },
    ],
    title: `UPT — overall ${(totals.tickets ? totals.units / totals.tickets : 0).toFixed(2)}`,
    sheetName: 'UPT',
    format: query.format,
  });
}

async function averageBasketReport(query = {}) {
  const rate = await usdToLbpRate();
  const where = {
    status: { in: PAID_STATUSES },
    ...dateFilter({ from: query.from, to: query.to }),
  };
  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  });

  const byDay = new Map();
  for (const o of orders) {
    const key = dateKey(o.createdAt);
    const cur = byDay.get(key) || { date: key, tickets: 0, sales: 0, units: 0 };
    cur.tickets += 1;
    cur.sales += Number(o.total) || 0;
    cur.units += (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    byDay.set(key, cur);
  }

  const rows = [...byDay.values()].map((r) => ({
    ...r,
    avgBasket: r.tickets > 0 ? r.sales / r.tickets : 0,
    avgUnits: r.tickets > 0 ? r.units / r.tickets : 0,
  }));

  return buildExport({
    rows: withRate(rows, rate),
    columns: [
      { header: 'Date', key: 'date' },
      { header: 'Tickets', key: 'tickets' },
      ...moneyColumns('Sales', 'sales'),
      ...moneyColumns('Avg basket', 'avgBasket'),
      { header: 'Avg units / ticket', key: 'avgUnits', value: (r) => Number(r.avgUnits).toFixed(2) },
    ],
    title: 'Average basket (ATV)',
    sheetName: 'AvgBasket',
    format: query.format,
  });
}

async function leftoversReport(query = {}) {
  const rate = await usdToLbpRate();
  const days = Number(query.days) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const items = await loadOrderItems({
    from: since.toISOString().slice(0, 10),
    to: query.to,
  });
  const soldByVariant = new Map();
  for (const item of items) {
    if (!item.variantId) continue;
    soldByVariant.set(
      item.variantId,
      (soldByVariant.get(item.variantId) || 0) + (Number(item.quantity) || 0),
    );
  }

  const variants = await prisma.productVariant.findMany({
    where: { status: 'active', stock: { gt: 0 } },
    include: {
      product: {
        select: {
          name: true,
          costPrice: true,
          category: { select: { name: true } },
          brand: { select: { name: true } },
        },
      },
    },
  });

  const rows = variants
    .map((v) => {
      const sold = soldByVariant.get(v.id) || 0;
      const stock = Number(v.stock) || 0;
      const sell = Number(v.price) || 0;
      const unitCost = resolveCost(null, sell, v.costPrice, v.product?.costPrice);
      const sellThrough = stock + sold > 0 ? (sold / (stock + sold)) * 100 : 0;
      return {
        sku: v.sku,
        product: v.product?.name || '',
        brand: v.product?.brand?.name || '',
        category: v.product?.category?.name || '',
        color: v.colorName,
        size: v.size,
        stock,
        soldLastPeriod: sold,
        sellThroughPct: sellThrough,
        unitCost,
        leftoverValue: unitCost * stock,
        flag: sold === 0 ? 'No sales' : sellThrough < 15 ? 'Slow' : 'OK',
      };
    })
    .filter((r) => r.flag !== 'OK')
    .sort((a, b) => b.leftoverValue - a.leftoverValue);

  return buildExport({
    rows: withRate(rows, rate),
    columns: [
      { header: 'Flag', key: 'flag' },
      { header: 'SKU', key: 'sku' },
      { header: 'Product', key: 'product' },
      { header: 'Brand', key: 'brand' },
      { header: 'Category', key: 'category' },
      { header: 'Color', key: 'color' },
      { header: 'Size', key: 'size' },
      { header: 'Stock (leftover)', key: 'stock' },
      { header: `Sold (${days}d)`, key: 'soldLastPeriod' },
      { header: 'Sell-through %', key: 'sellThroughPct', value: (r) => Number(r.sellThroughPct).toFixed(1) },
      ...moneyColumns('Unit cost', 'unitCost'),
      ...moneyColumns('Leftover value', 'leftoverValue'),
    ],
    title: `Leftovers / slow movers (${days}d)`,
    sheetName: 'Leftovers',
    format: query.format,
  });
}

const REPORT_HANDLERS = {
  sales: salesReport,
  revenue: revenueReport,
  orders: ordersReport,
  customers: customersReport,
  products: productsReport,
  inventory: inventoryReport,
  'top-products': topProductsReport,
  'top-by-category': topByCategoryReport,
  'top-by-theme': topByThemeReport,
  dsr: dsrReport,
  weekly: weeklyReport,
  'in-out': inOutReport,
  costs: costsReport,
  margins: marginsReport,
  pnl: pnlReport,
  kpis: kpisReport,
  upt: uptReport,
  'average-basket': averageBasketReport,
  leftovers: leftoversReport,
};

async function generate(type, query = {}) {
  const handler = REPORT_HANDLERS[type];
  if (!handler) {
    const { ApiError } = require('../utils/ApiError');
    throw ApiError.badRequest(`Unknown report type: ${type}`);
  }
  return handler(query);
}

module.exports = {
  generate,
  salesReport,
  revenueReport,
  ordersReport,
  customersReport,
  productsReport,
  inventoryReport,
  topProductsReport,
  topByCategoryReport,
  topByThemeReport,
  dsrReport,
  weeklyReport,
  inOutReport,
  costsReport,
  marginsReport,
  pnlReport,
  kpisReport,
  uptReport,
  averageBasketReport,
  leftoversReport,
};

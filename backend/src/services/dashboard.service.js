const { Prisma } = require('@prisma/client');
const { prisma } = require('../config/prisma');
const { getSingleton } = require('./setting.service');

const PAID_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered'];

function periodToDays(period = '30d') {
  if (period === '7d') return 7;
  if (period === '90d') return 90;
  if (period === '12m') return 365;
  return 30;
}

function num(v) {
  if (v == null) return 0;
  return Number(v);
}

function dateKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

async function getStats() {
  const settings = await getSingleton();
  const threshold = settings.lowStockThreshold ?? 5;

  const [revenueAgg, ordersCount, customers, products, lowStockCount] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: PAID_STATUSES } },
      _sum: { total: true },
    }),
    prisma.order.count(),
    prisma.user.count({ where: { status: 'active' } }),
    prisma.product.count({ where: { status: { not: 'archived' } } }),
    prisma.productVariant.count({
      where: { stock: { lte: threshold }, status: { not: 'inactive' } },
    }),
  ]);

  return {
    revenue: num(revenueAgg._sum.total),
    ordersCount,
    customers,
    products,
    lowStockCount,
  };
}

async function revenueChart(period = '30d') {
  const days = periodToDays(period);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));

  // Aggregate in MySQL (uses the (status, createdAt) index) instead of loading every order row.
  const rows = await prisma.$queryRaw`
    SELECT DATE(createdAt) AS day, SUM(total) AS revenue, COUNT(*) AS orders
    FROM orders
    WHERE createdAt >= ${from} AND status IN (${Prisma.join(PAID_STATUSES)})
    GROUP BY DATE(createdAt)
  `;

  const map = new Map();
  for (const row of rows) {
    map.set(dateKey(row.day), { revenue: num(row.revenue), orders: num(row.orders) });
  }

  const series = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = dateKey(d);
    const row = map.get(key);
    series.push({
      date: key,
      revenue: row?.revenue || 0,
      orders: row?.orders || 0,
    });
  }

  return { period, series };
}

async function ordersChart(period = '30d') {
  const chart = await revenueChart(period);
  return {
    period: chart.period,
    series: chart.series.map((s) => ({ date: s.date, orders: s.orders })),
  };
}

async function latestOrders(limit = 10) {
  const rows = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(50, limit),
    select: {
      id: true,
      orderNumber: true,
      total: true,
      status: true,
      createdAt: true,
      paymentMethod: true,
      userId: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    total: num(o.total),
    status: o.status,
    createdAt: o.createdAt,
    paymentMethod: o.paymentMethod,
    userId: o.user
      ? { _id: o.user.id, id: o.user.id, name: o.user.name, email: o.user.email }
      : o.userId,
  }));
}

async function topProducts(limit = 10) {
  const take = Math.max(1, Math.min(50, Number(limit) || 10));
  // Previously every order item ever sold was loaded into Node and summed in JS;
  // this grows without bound. GROUP BY in MySQL returns only the top rows.
  const rows = await prisma.$queryRaw`
    SELECT oi.productId AS productId,
           MAX(oi.name) AS name,
           SUM(oi.quantity) AS quantitySold,
           SUM(oi.unitPrice * oi.quantity) AS revenue
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi.orderId
    WHERE oi.productId IS NOT NULL
      AND o.status IN (${Prisma.join([...PAID_STATUSES, 'pending'])})
    GROUP BY oi.productId
    ORDER BY quantitySold DESC
    LIMIT ${take}
  `;

  return rows.map((row) => ({
    _id: row.productId,
    id: row.productId,
    name: row.name,
    quantitySold: num(row.quantitySold),
    revenue: Math.round(num(row.revenue) * 100) / 100,
  }));
}

async function lowStock(limit = 20) {
  const settings = await getSingleton();
  const threshold = settings.lowStockThreshold ?? 5;
  const rows = await prisma.productVariant.findMany({
    where: { stock: { lte: threshold } },
    orderBy: { stock: 'asc' },
    take: Math.min(100, limit),
    include: {
      product: { select: { id: true, name: true, slug: true, images: true } },
    },
  });

  return rows.map((v) => ({
    ...v,
    price: num(v.price),
    comparePrice: v.comparePrice != null ? num(v.comparePrice) : null,
    weight: v.weight != null ? num(v.weight) : null,
    color: { name: v.colorName, hex: v.colorHex },
    productId: v.product
      ? {
          _id: v.product.id,
          id: v.product.id,
          name: v.product.name,
          slug: v.product.slug,
          images: v.product.images,
        }
      : v.productId,
    product: undefined,
  }));
}

async function recentCustomers(limit = 10) {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(50, limit),
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      lastLogin: true,
      avatar: true,
    },
  });
}

module.exports = {
  getStats,
  revenueChart,
  ordersChart,
  latestOrders,
  topProducts,
  lowStock,
  recentCustomers,
  PAID_STATUSES,
};

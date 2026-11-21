const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { env } = require('../config/env');
const { prisma } = require('../config/prisma');

const MODULES = [
  'products',
  'categories',
  'brands',
  'collections',
  'orders',
  'customers',
  'reviews',
  'coupons',
  'inventory',
  'media',
  'homepage',
  'pages',
  'blogs',
  'faqs',
  'contact',
  'newsletter',
  'reports',
  'users',
  'roles',
  'settings',
  'notifications',
  'audit',
  'banners',
  'admins',
];

const ACTIONS = ['create', 'read', 'update', 'delete'];

async function seedPermissions() {
  const docs = [];
  for (const moduleName of MODULES) {
    for (const action of ACTIONS) {
      const permission = await prisma.permission.upsert({
        where: {
          module_action: { module: moduleName, action },
        },
        create: {
          module: moduleName,
          action,
          description: `${action} ${moduleName}`,
        },
        update: {
          description: `${action} ${moduleName}`,
        },
      });
      docs.push(permission);
    }
  }
  return docs;
}

async function syncRolePermissions(roleId, permissionIds) {
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  if (!permissionIds.length) return;

  await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
    skipDuplicates: true,
  });
}

async function seedRoles(permissions) {
  const allIds = permissions.map((p) => p.id);

  const customerPerms = permissions
    .filter((p) => ['orders', 'reviews'].includes(p.module) && ['create', 'read', 'update'].includes(p.action))
    .map((p) => p.id);

  const adminPerms = permissions
    .filter((p) => !['roles', 'admins', 'audit'].includes(p.module))
    .map((p) => p.id);

  const superAdmin = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    create: {
      name: 'Super Admin',
      description: 'Full system access',
      isSystem: true,
    },
    update: {
      description: 'Full system access',
      isSystem: true,
    },
  });
  await syncRolePermissions(superAdmin.id, allIds);

  const admin = await prisma.role.upsert({
    where: { name: 'Admin' },
    create: {
      name: 'Admin',
      description: 'Store administrator',
      isSystem: true,
    },
    update: {
      description: 'Store administrator',
      isSystem: true,
    },
  });
  await syncRolePermissions(admin.id, adminPerms);

  const customer = await prisma.role.upsert({
    where: { name: 'Customer' },
    create: {
      name: 'Customer',
      description: 'Storefront customer',
      isSystem: true,
    },
    update: {
      description: 'Storefront customer',
      isSystem: true,
    },
  });
  await syncRolePermissions(customer.id, customerPerms);

  return { superAdmin, admin, customer };
}

async function seedSuperAdmin(superAdminRole) {
  const email = 'admin@scosha.com';
  const passwordHash = await bcrypt.hash('Admin@123', env.BCRYPT_SALT_ROUNDS);

  const admin = await prisma.admin.upsert({
    where: { email },
    create: {
      name: 'Super Admin',
      email,
      passwordHash,
      roleId: superAdminRole.id,
      status: 'active',
    },
    update: {
      name: 'Super Admin',
      passwordHash,
      roleId: superAdminRole.id,
      status: 'active',
    },
  });

  return admin;
}

async function seedSettings() {
  let settings = await prisma.setting.findFirst();
  if (!settings) {
    settings = await prisma.setting.create({
      data: {
        storeName: 'SCOSHA',
        email: 'hello@scosha.com',
        phone: '+961 81 428 503',
        currency: 'USD',
        timezone: 'UTC',
        language: 'en',
        adminEmail: 'admin@scosha.com',
        shipping: {
          standardCharge: env.DEFAULT_SHIPPING_CHARGE,
          expressCharge: 25,
          freeShippingThreshold: env.FREE_SHIPPING_THRESHOLD,
          standardEta: '3-5 business days',
          expressEta: 'Same day',
        },
        taxes: { rate: env.TAX_RATE, included: false },
        paymentMethods: [{ key: 'cod', label: 'Cash on Delivery', enabled: true }],
        lowStockThreshold: 10,
        socialLinks: {
          instagram: 'https://www.instagram.com/scosha.lb',
          facebook: 'https://www.facebook.com/share/1aJYKZbcoN/',
          whatsapp: 'https://wa.me/message/XO72WXVTPGZGL1',
        },
      },
    });
  }
  return settings;
}

async function seedHomepageSections() {
  const defaults = [
    { type: 'announcement', title: 'Announcement Bar', sortOrder: 0, config: { text: 'Free shipping over $150' }, isActive: true },
    { type: 'hero', title: 'Hero Banner', sortOrder: 1, config: { slides: [] }, isActive: true },
    { type: 'featuredCategories', title: 'Featured Categories', sortOrder: 2, config: { categoryIds: [] }, isActive: true },
    { type: 'featuredProducts', title: 'Featured Products', sortOrder: 3, config: { productIds: [] }, isActive: true },
    { type: 'trending', title: 'Trending', sortOrder: 4, config: {}, isActive: true },
    { type: 'bestSellers', title: 'Best Sellers', sortOrder: 5, config: {}, isActive: true },
    { type: 'newArrivals', title: 'New Arrivals', sortOrder: 6, config: {}, isActive: true },
    { type: 'promoBanners', title: 'Promotional Banners', sortOrder: 7, config: { banners: [] }, isActive: true },
    { type: 'newsletter', title: 'Newsletter', sortOrder: 8, config: { heading: 'Stay in the loop' }, isActive: true },
    { type: 'footer', title: 'Footer', sortOrder: 9, config: {}, isActive: true },
    { type: 'navigation', title: 'Navigation', sortOrder: 10, config: { items: [] }, isActive: true },
  ];

  for (const section of defaults) {
    await prisma.homepageSection.upsert({
      where: { type: section.type },
      create: section,
      update: {
        title: section.title,
        sortOrder: section.sortOrder,
        config: section.config,
        isActive: section.isActive,
      },
    });
  }
}

async function seed() {
  logger.info('Starting database seed...');

  const permissions = await seedPermissions();
  logger.info(`Permissions ready: ${permissions.length}`);

  const roles = await seedRoles(permissions);
  logger.info('Roles ready: Super Admin, Admin, Customer');

  const admin = await seedSuperAdmin(roles.superAdmin);
  logger.info(`Super admin ready: ${admin.email} / Admin@123`);

  await seedSettings();
  logger.info('Settings singleton ready');

  await seedHomepageSections();
  logger.info('Homepage sections ready');

  await prisma.$disconnect();
  logger.info('Seed finished successfully');
}

seed().catch(async (error) => {
  logger.error('Seed failed', { message: error.message, stack: error.stack });
  try {
    await prisma.$disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});

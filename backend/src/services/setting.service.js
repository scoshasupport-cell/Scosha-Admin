const { prisma } = require('../config/prisma');
const { logAdminAction } = require('../utils/audit');

const PUBLIC_FIELDS = [
  'storeName',
  'logo',
  'favicon',
  'currency',
  'language',
  'shipping',
  'socialLinks',
];

async function getSingleton() {
  let settings = await prisma.setting.findFirst();
  if (!settings) {
    settings = await prisma.setting.create({ data: {} });
  }
  return settings;
}

function pickPublic(settings) {
  const obj = { ...settings };
  const publicSettings = {};
  PUBLIC_FIELDS.forEach((key) => {
    if (obj[key] !== undefined) publicSettings[key] = obj[key];
  });
  return publicSettings;
}

async function getPublic() {
  const settings = await getSingleton();
  return pickPublic(settings);
}

async function getAdmin() {
  return getSingleton();
}

async function update(payload, adminId, req) {
  const settings = await getSingleton();
  const before = { ...settings };
  const updated = await prisma.setting.update({
    where: { id: settings.id },
    data: payload,
  });
  await logAdminAction(adminId, 'update', 'Setting', settings.id, before, updated, req);
  return updated;
}

module.exports = {
  getPublic,
  getAdmin,
  update,
  pickPublic,
  getSingleton,
};

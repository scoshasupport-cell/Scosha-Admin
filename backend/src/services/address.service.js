const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const { parseId, withLegacyId } = require('../utils/prismaHelpers');

async function list(userId) {
  const rows = await prisma.address.findMany({
    where: { userId: parseId(userId) },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  });
  return rows.map(withLegacyId);
}

async function getById(userId, id) {
  const address = await prisma.address.findFirst({
    where: { id: parseId(id), userId: parseId(userId) },
  });
  if (!address) throw ApiError.notFound('Address not found');
  return withLegacyId(address);
}

async function unsetOtherDefaults(userId, exceptId = null, tx = prisma) {
  const uid = parseId(userId);
  await tx.address.updateMany({
    where: {
      userId: uid,
      isDefault: true,
      ...(exceptId ? { id: { not: parseId(exceptId) } } : {}),
    },
    data: { isDefault: false },
  });
}

async function create(userId, data) {
  const uid = parseId(userId);
  const created = await prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId: uid } });
    const isDefault = data.isDefault === true || count === 0;

    if (isDefault) {
      await unsetOtherDefaults(uid, null, tx);
    }

    return tx.address.create({
      data: {
        userId: uid,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        line1: data.line1,
        line2: data.line2 || null,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country || 'US',
        isDefault,
      },
    });
  });
  return withLegacyId(created);
}

async function update(userId, id, data) {
  const address = await getById(userId, id);

  const fields = [
    'name',
    'phone',
    'email',
    'line1',
    'line2',
    'city',
    'state',
    'zip',
    'country',
    'isDefault',
  ];
  const patch = {};
  for (const field of fields) {
    if (data[field] !== undefined) {
      patch[field] = data[field];
    }
  }

  return prisma.$transaction(async (tx) => {
    const nextDefault = patch.isDefault !== undefined ? patch.isDefault : address.isDefault;
    if (nextDefault) {
      await unsetOtherDefaults(userId, address.id, tx);
      patch.isDefault = true;
    }

    const updated = await tx.address.update({
      where: { id: address.id },
      data: patch,
    });
    return withLegacyId(updated);
  });
}

async function setDefault(userId, id) {
  const address = await getById(userId, id);
  return prisma.$transaction(async (tx) => {
    await unsetOtherDefaults(userId, address.id, tx);
    const updated = await tx.address.update({
      where: { id: address.id },
      data: { isDefault: true },
    });
    return withLegacyId(updated);
  });
}

async function remove(userId, id) {
  const address = await getById(userId, id);
  const wasDefault = address.isDefault;

  await prisma.address.delete({ where: { id: address.id } });

  if (wasDefault) {
    const next = await prisma.address.findFirst({
      where: { userId: parseId(userId) },
      orderBy: { updatedAt: 'desc' },
    });
    if (next) {
      await prisma.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  return address;
}

module.exports = {
  list,
  getById,
  create,
  update,
  setDefault,
  remove,
};

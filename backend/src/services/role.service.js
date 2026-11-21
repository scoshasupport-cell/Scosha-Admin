const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');
const { getPagination, paginatedResponse, getSort, toPrismaOrderBy } = require('../utils/pagination');
const { logAdminAction } = require('../utils/audit');

const roleInclude = {
  permissions: {
    include: { permission: true },
  },
};

function mapRole(role) {
  if (!role) return role;
  const { permissions, ...rest } = role;
  return {
    ...rest,
    permissions: (permissions || []).map((rp) => rp.permission || rp),
  };
}

async function syncRolePermissions(roleId, permissionIds = []) {
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  const ids = [...new Set(permissionIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) return;
  await prisma.rolePermission.createMany({
    data: ids.map((permissionId) => ({ roleId, permissionId })),
    skipDuplicates: true,
  });
}

async function listRoles(query = {}) {
  const { page, limit, skip } = getPagination(query);
  const orderBy = toPrismaOrderBy(getSort(query, 'name'));
  const where = {};
  if (query.q) where.name = { contains: query.q };

  const [rows, total] = await Promise.all([
    prisma.role.findMany({ where, include: roleInclude, orderBy, skip, take: limit }),
    prisma.role.count({ where }),
  ]);
  return paginatedResponse(rows.map(mapRole), total, page, limit);
}

async function getRole(id) {
  const role = await prisma.role.findUnique({
    where: { id: Number(id) },
    include: roleInclude,
  });
  if (!role) throw ApiError.notFound('Role not found');
  return mapRole(role);
}

async function createRole(payload, adminId, req) {
  const existing = await prisma.role.findUnique({ where: { name: payload.name } });
  if (existing) throw ApiError.conflict('Role name already exists');

  const { permissions, ...rest } = payload;
  const role = await prisma.role.create({ data: rest });
  if (permissions?.length) {
    await syncRolePermissions(role.id, permissions);
  }

  const full = await getRole(role.id);
  await logAdminAction(adminId, 'create', 'Role', role.id, null, full, req);
  return full;
}

async function updateRole(id, payload, adminId, req) {
  const role = await prisma.role.findUnique({
    where: { id: Number(id) },
    include: roleInclude,
  });
  if (!role) throw ApiError.notFound('Role not found');
  if (role.isSystem && payload.name && payload.name !== role.name) {
    throw ApiError.badRequest('Cannot rename system role');
  }

  const before = mapRole(role);
  const { permissions, ...rest } = payload;
  await prisma.role.update({
    where: { id: role.id },
    data: rest,
  });
  if (permissions !== undefined) {
    await syncRolePermissions(role.id, permissions || []);
  }

  const after = await getRole(role.id);
  await logAdminAction(adminId, 'update', 'Role', role.id, before, after, req);
  return after;
}

async function deleteRole(id, adminId, req) {
  const role = await prisma.role.findUnique({
    where: { id: Number(id) },
    include: roleInclude,
  });
  if (!role) throw ApiError.notFound('Role not found');
  if (role.isSystem) throw ApiError.badRequest('Cannot delete system role');

  const inUse = await prisma.admin.count({ where: { roleId: role.id } });
  if (inUse > 0) throw ApiError.conflict('Role is assigned to admins');

  const before = mapRole(role);
  await prisma.role.delete({ where: { id: role.id } });
  await logAdminAction(adminId, 'delete', 'Role', id, before, null, req);
  return { deleted: true, id: role.id };
}

async function listPermissions() {
  return prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  });
}

module.exports = {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  listPermissions,
};

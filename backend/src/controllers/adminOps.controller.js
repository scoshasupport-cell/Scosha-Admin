const dashboardService = require('../services/dashboard.service');
const reportService = require('../services/report.service');
const customerService = require('../services/customer.service');
const logService = require('../services/log.service');
const notificationService = require('../services/notification.service');
const roleService = require('../services/role.service');
const adminUserService = require('../services/adminUser.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');

// Dashboard
const getStats = asyncHandler(async (_req, res) => {
  const stats = await dashboardService.getStats();
  return ApiResponse.success(res, stats, 'Dashboard stats fetched');
});

const revenueChart = asyncHandler(async (req, res) => {
  const data = await dashboardService.revenueChart(req.query.period);
  return ApiResponse.success(res, data, 'Revenue chart fetched');
});

const ordersChart = asyncHandler(async (req, res) => {
  const data = await dashboardService.ordersChart(req.query.period || '30d');
  return ApiResponse.success(res, data, 'Orders chart fetched');
});

const latestOrders = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const data = await dashboardService.latestOrders(limit);
  return ApiResponse.success(res, data, 'Latest orders fetched');
});

const topProducts = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const data = await dashboardService.topProducts(limit);
  return ApiResponse.success(res, data, 'Top products fetched');
});

const lowStock = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;
  const data = await dashboardService.lowStock(limit);
  return ApiResponse.success(res, data, 'Low stock fetched');
});

const recentCustomers = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const data = await dashboardService.recentCustomers(limit);
  return ApiResponse.success(res, data, 'Recent customers fetched');
});

// Reports
const exportReport = asyncHandler(async (req, res) => {
  const file = await reportService.generate(req.params.type, req.query);
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  return res.send(file.buffer);
});

// Customers
const listCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.list(req.query);
  return ApiResponse.success(res, result.data, 'Customers fetched', 200, result.meta);
});

const listVipCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.list({ ...req.query, isVip: true });
  return ApiResponse.success(res, result.data, 'VIP customers fetched', 200, result.meta);
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.getById(req.params.id);
  return ApiResponse.success(res, customer, 'Customer fetched');
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const result = await customerService.remove(req.params.id, req.admin.id, req);
  return ApiResponse.success(res, result, 'Customer deleted');
});

// Logs
const listAuditLogs = asyncHandler(async (req, res) => {
  const result = await logService.listAuditLogs(req.query);
  return ApiResponse.success(res, result.data, 'Audit logs fetched', 200, result.meta);
});

const listActivityLogs = asyncHandler(async (req, res) => {
  const result = await logService.listActivityLogs(req.query);
  return ApiResponse.success(res, result.data, 'Activity logs fetched', 200, result.meta);
});

// Notifications
const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.listForAdmin(req.admin.id, req.query);
  return ApiResponse.success(res, result.data, 'Notifications fetched', 200, result.meta);
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead(req.params.id, req.admin.id);
  return ApiResponse.success(res, notification, 'Notification marked as read');
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.admin.id);
  return ApiResponse.success(res, result, 'All notifications marked as read');
});

// Roles & permissions
const listRoles = asyncHandler(async (req, res) => {
  const result = await roleService.listRoles(req.query);
  return ApiResponse.success(res, result.data, 'Roles fetched', 200, result.meta);
});

const getRole = asyncHandler(async (req, res) => {
  const role = await roleService.getRole(req.params.id);
  return ApiResponse.success(res, role, 'Role fetched');
});

const createRole = asyncHandler(async (req, res) => {
  const role = await roleService.createRole(req.body, req.admin.id, req);
  return ApiResponse.created(res, role, 'Role created');
});

const updateRole = asyncHandler(async (req, res) => {
  const role = await roleService.updateRole(req.params.id, req.body, req.admin.id, req);
  return ApiResponse.success(res, role, 'Role updated');
});

const deleteRole = asyncHandler(async (req, res) => {
  const result = await roleService.deleteRole(req.params.id, req.admin.id, req);
  return ApiResponse.success(res, result, 'Role deleted');
});

const listPermissions = asyncHandler(async (_req, res) => {
  const permissions = await roleService.listPermissions();
  return ApiResponse.success(res, permissions, 'Permissions fetched');
});

// Admins
const listAdmins = asyncHandler(async (req, res) => {
  const result = await adminUserService.list(req.query);
  return ApiResponse.success(res, result.data, 'Admins fetched', 200, result.meta);
});

const getAdmin = asyncHandler(async (req, res) => {
  const admin = await adminUserService.getById(req.params.id);
  return ApiResponse.success(res, admin, 'Admin fetched');
});

const createAdmin = asyncHandler(async (req, res) => {
  const admin = await adminUserService.create(req.body, req.admin.id, req);
  return ApiResponse.created(res, admin, 'Admin created');
});

const updateAdmin = asyncHandler(async (req, res) => {
  const admin = await adminUserService.update(req.params.id, req.body, req.admin.id, req);
  return ApiResponse.success(res, admin, 'Admin updated');
});

const deleteAdmin = asyncHandler(async (req, res) => {
  const result = await adminUserService.remove(req.params.id, req.admin.id, req);
  return ApiResponse.success(res, result, 'Admin deleted');
});

module.exports = {
  getStats,
  revenueChart,
  ordersChart,
  latestOrders,
  topProducts,
  lowStock,
  recentCustomers,
  exportReport,
  listCustomers,
  listVipCustomers,
  getCustomer,
  deleteCustomer,
  listAuditLogs,
  listActivityLogs,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  listPermissions,
  listAdmins,
  getAdmin,
  createAdmin,
  updateAdmin,
  deleteAdmin,
};

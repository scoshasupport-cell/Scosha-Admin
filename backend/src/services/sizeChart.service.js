const sizeChartRepository = require('../repositories/sizeChart.repository');

async function createChart(data) {
  const payload = {
    name: data.name,
    brandId: data.brandId ? Number(data.brandId) : null,
    gender: data.gender || 'women',
    category: data.category || 'tops',
    unit: data.unit || 'cm',
    measurementFields: data.measurementFields || [],
    sizes: data.sizes || [],
    recommendationRules: data.recommendationRules || null,
    isDefault: Boolean(data.isDefault),
    status: data.status || 'active',
  };
  return sizeChartRepository.create(payload);
}

async function getChartById(id) {
  return sizeChartRepository.findById(id);
}

async function listCharts(params = {}) {
  const { gender, category, brandId, status, page = 1, limit = 50 } = params;
  const filter = {};
  if (gender) filter.gender = gender;
  if (category) filter.category = category;
  if (brandId) filter.brandId = Number(brandId);
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    sizeChartRepository.find(filter, { skip, limit: Number(limit) }),
    sizeChartRepository.count(filter),
  ]);

  return { items, total, page: Number(page), limit: Number(limit) };
}

async function updateChart(id, data) {
  const payload = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.brandId !== undefined) payload.brandId = data.brandId ? Number(data.brandId) : null;
  if (data.gender !== undefined) payload.gender = data.gender;
  if (data.category !== undefined) payload.category = data.category;
  if (data.unit !== undefined) payload.unit = data.unit;
  if (data.measurementFields !== undefined) payload.measurementFields = data.measurementFields;
  if (data.sizes !== undefined) payload.sizes = data.sizes;
  if (data.recommendationRules !== undefined) payload.recommendationRules = data.recommendationRules;
  if (data.isDefault !== undefined) payload.isDefault = Boolean(data.isDefault);
  if (data.status !== undefined) payload.status = data.status;

  return sizeChartRepository.updateById(id, payload);
}

async function deleteChart(id) {
  return sizeChartRepository.deleteById(id);
}

async function resolveChart(gender, category, brandId) {
  // Try exact brand + gender + category
  if (brandId) {
    const chart = await sizeChartRepository.findOne({
      gender,
      category,
      brandId: Number(brandId),
      status: 'active',
    });
    if (chart) return chart;
  }

  // Try gender + category (default/generic)
  const defaultChart = await sizeChartRepository.findOne({
    gender,
    category,
    status: 'active',
  });

  return defaultChart || null;
}

module.exports = {
  createChart,
  getChartById,
  listCharts,
  updateChart,
  deleteChart,
  resolveChart,
};

const express = require('express');
const sizeChartController = require('../controllers/sizeChart.controller');

const router = express.Router();

router.get('/', sizeChartController.listPublic);
router.get('/resolve', sizeChartController.resolve);
router.get('/:id', sizeChartController.getById);

module.exports = router;

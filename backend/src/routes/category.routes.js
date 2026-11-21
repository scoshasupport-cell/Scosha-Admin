const express = require('express');
const categoryController = require('../controllers/category.controller');
const { validate } = require('../middlewares/validate');
const { optionalAuth } = require('../middlewares/auth');
const { categoryQuery, slugParams } = require('../validators/category.validator');

const router = express.Router();

router.get('/', optionalAuth, validate(categoryQuery, 'query'), categoryController.listPublic);
router.get('/tree', optionalAuth, categoryController.getTree);
router.get('/:slug', optionalAuth, validate(slugParams, 'params'), categoryController.getBySlug);

module.exports = router;

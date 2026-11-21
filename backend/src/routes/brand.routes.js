const express = require('express');
const brandController = require('../controllers/brand.controller');
const { validate } = require('../middlewares/validate');
const { optionalAuth } = require('../middlewares/auth');
const { paginationQuery, slugParams } = require('../validators/brand.validator');

const router = express.Router();

router.get('/', optionalAuth, validate(paginationQuery, 'query'), brandController.listPublic);
router.get('/:slug', optionalAuth, validate(slugParams, 'params'), brandController.getBySlug);

module.exports = router;

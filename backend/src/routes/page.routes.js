const express = require('express');
const contentController = require('../controllers/content.controller');
const { validate } = require('../middlewares/validate');
const { slugParams } = require('../validators/content.validator');

const router = express.Router();

router.get('/:slug', validate(slugParams, 'params'), contentController.getPageBySlug);

module.exports = router;

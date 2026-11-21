const express = require('express');
const contentController = require('../controllers/content.controller');
const { validate } = require('../middlewares/validate');
const { paginationQuery, slugParams } = require('../validators/content.validator');

const router = express.Router();

router.get('/', validate(paginationQuery, 'query'), contentController.listBlogsPublic);
router.get('/:slug', validate(slugParams, 'params'), contentController.getBlogBySlug);

module.exports = router;

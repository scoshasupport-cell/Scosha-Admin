const express = require('express');
const contentController = require('../controllers/content.controller');
const { validate } = require('../middlewares/validate');
const { paginationQuery } = require('../validators/content.validator');

const router = express.Router();

router.get('/', validate(paginationQuery, 'query'), contentController.listBannersPublic);

module.exports = router;

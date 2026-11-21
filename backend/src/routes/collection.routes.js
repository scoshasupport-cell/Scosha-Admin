const express = require('express');
const collectionController = require('../controllers/collection.controller');
const { validate } = require('../middlewares/validate');
const { optionalAuth } = require('../middlewares/auth');
const { collectionQuery, slugParams } = require('../validators/collection.validator');

const router = express.Router();

router.get('/', optionalAuth, validate(collectionQuery, 'query'), collectionController.listPublic);
router.get('/:slug', optionalAuth, validate(slugParams, 'params'), collectionController.getBySlug);

module.exports = router;

const express = require('express');
const searchController = require('../controllers/search.controller');
const { validate } = require('../middlewares/validate');
const { optionalAuth } = require('../middlewares/auth');
const { searchQuery, suggestionsQuery } = require('../validators/search.validator');

const router = express.Router();

router.get('/', optionalAuth, validate(searchQuery, 'query'), searchController.search);
router.get(
  '/suggestions',
  optionalAuth,
  validate(suggestionsQuery, 'query'),
  searchController.suggestions
);

module.exports = router;

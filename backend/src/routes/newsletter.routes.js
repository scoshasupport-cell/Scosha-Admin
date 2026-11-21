const express = require('express');
const contentController = require('../controllers/content.controller');
const { validate } = require('../middlewares/validate');
const { newsletterSubscribeSchema } = require('../validators/content.validator');

const router = express.Router();

router.post('/subscribe', validate(newsletterSubscribeSchema), contentController.subscribeNewsletter);

module.exports = router;

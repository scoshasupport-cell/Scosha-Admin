const express = require('express');
const contentController = require('../controllers/content.controller');
const { validate } = require('../middlewares/validate');
const { contactSchema } = require('../validators/content.validator');

const router = express.Router();

router.post('/', validate(contactSchema), contentController.submitContact);

module.exports = router;

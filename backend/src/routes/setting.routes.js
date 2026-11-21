const express = require('express');
const settingController = require('../controllers/setting.controller');

const router = express.Router();

router.get('/', settingController.getPublic);

module.exports = router;

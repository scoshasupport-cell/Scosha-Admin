const express = require('express');
const addressController = require('../controllers/address.controller');
const { validate } = require('../middlewares/validate');
const { authenticateCustomer } = require('../middlewares/auth');
const {
  createAddressSchema,
  updateAddressSchema,
  idParams,
} = require('../validators/address.validator');

const router = express.Router();

router.use(authenticateCustomer);

router.get('/', addressController.list);
router.get('/:id', validate(idParams, 'params'), addressController.getById);
router.post('/', validate(createAddressSchema), addressController.create);
router.put(
  '/:id',
  validate(idParams, 'params'),
  validate(updateAddressSchema),
  addressController.update
);
router.patch('/:id/default', validate(idParams, 'params'), addressController.setDefault);
router.delete('/:id', validate(idParams, 'params'), addressController.remove);

module.exports = router;

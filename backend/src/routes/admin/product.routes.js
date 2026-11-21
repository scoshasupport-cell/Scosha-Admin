const express = require('express');
const productController = require('../../controllers/product.controller');
const variantController = require('../../controllers/variant.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  createProductSchema,
  updateProductSchema,
  flagsSchema,
  relatedSchema,
  productQuery,
  idParams,
} = require('../../validators/product.validator');
const {
  createVariantSchema,
  updateVariantSchema,
  productIdParams,
  variantParams,
} = require('../../validators/variant.validator');
const { z } = require('zod');

const seoBody = z.object({
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }),
});

const router = express.Router();

router.use(authenticateAdmin);

router.get('/', requirePermission('products', 'read'), validate(productQuery, 'query'), productController.listAdmin);
router.post('/', requirePermission('products', 'create'), validate(createProductSchema), productController.create);

router.get('/:id', requirePermission('products', 'read'), validate(idParams, 'params'), productController.getById);
router.patch('/:id', requirePermission('products', 'update'), validateRequest({ params: idParams, body: updateProductSchema }), productController.update);
router.patch('/:id/flags', requirePermission('products', 'update'), validateRequest({ params: idParams, body: flagsSchema }), productController.updateFlags);
router.patch('/:id/related', requirePermission('products', 'update'), validateRequest({ params: idParams, body: relatedSchema }), productController.setRelated);
router.patch('/:id/seo', requirePermission('products', 'update'), validateRequest({ params: idParams, body: seoBody }), productController.updateSeo);
router.delete('/:id', requirePermission('products', 'delete'), validate(idParams, 'params'), productController.remove);

// Nested variants
router.get(
  '/:id/variants',
  requirePermission('products', 'read'),
  validate(productIdParams, 'params'),
  variantController.listByProduct
);
router.post(
  '/:id/variants',
  requirePermission('products', 'create'),
  validateRequest({ params: productIdParams, body: createVariantSchema }),
  variantController.create
);
router.get(
  '/:id/variants/:variantId',
  requirePermission('products', 'read'),
  validate(variantParams, 'params'),
  variantController.getById
);
router.patch(
  '/:id/variants/:variantId',
  requirePermission('products', 'update'),
  validateRequest({ params: variantParams, body: updateVariantSchema }),
  variantController.update
);
router.delete(
  '/:id/variants/:variantId',
  requirePermission('products', 'delete'),
  validate(variantParams, 'params'),
  variantController.remove
);

module.exports = router;

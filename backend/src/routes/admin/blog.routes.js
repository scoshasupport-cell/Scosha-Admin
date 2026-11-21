const express = require('express');
const contentController = require('../../controllers/content.controller');
const { validate, validateRequest } = require('../../middlewares/validate');
const { authenticateAdmin, requirePermission } = require('../../middlewares/auth');
const {
  paginationQuery,
  idParams,
  createBlogSchema,
  updateBlogSchema,
} = require('../../validators/content.validator');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', requirePermission('blogs', 'read'), validate(paginationQuery, 'query'), contentController.listBlogsAdmin);
router.post('/', requirePermission('blogs', 'create'), validate(createBlogSchema), contentController.createBlog);
router.get('/:id', requirePermission('blogs', 'read'), validate(idParams, 'params'), contentController.getBlogAdmin);
router.put(
  '/:id',
  requirePermission('blogs', 'update'),
  validateRequest({ params: idParams, body: updateBlogSchema }),
  contentController.updateBlog
);
router.patch(
  '/:id',
  requirePermission('blogs', 'update'),
  validateRequest({ params: idParams, body: updateBlogSchema }),
  contentController.updateBlog
);
router.delete('/:id', requirePermission('blogs', 'delete'), validate(idParams, 'params'), contentController.deleteBlog);

module.exports = router;

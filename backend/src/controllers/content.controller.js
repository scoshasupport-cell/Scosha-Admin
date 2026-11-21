const homepageService = require('../services/homepage.service');
const bannerService = require('../services/banner.service');
const pageService = require('../services/page.service');
const blogService = require('../services/blog.service');
const faqService = require('../services/faq.service');
const contactService = require('../services/contact.service');
const newsletterService = require('../services/newsletter.service');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');

// Homepage
const getHomepage = asyncHandler(async (_req, res) => {
  const sections = await homepageService.listPublic();
  return ApiResponse.success(res, sections, 'Homepage fetched');
});

const listHomepageSections = asyncHandler(async (req, res) => {
  const result = await homepageService.listAdmin(req.query);
  return ApiResponse.success(res, result.data, 'Homepage sections fetched', 200, result.meta);
});

const getHomepageSection = asyncHandler(async (req, res) => {
  const section = await homepageService.getById(req.params.id);
  return ApiResponse.success(res, section, 'Homepage section fetched');
});

const createHomepageSection = asyncHandler(async (req, res) => {
  const section = await homepageService.create(req.body, req.admin.id, req);
  return ApiResponse.created(res, section, 'Homepage section created');
});

const updateHomepageSection = asyncHandler(async (req, res) => {
  const section = await homepageService.update(req.params.id, req.body, req.admin.id, req);
  return ApiResponse.success(res, section, 'Homepage section updated');
});

const deleteHomepageSection = asyncHandler(async (req, res) => {
  const result = await homepageService.remove(req.params.id, req.admin.id, req);
  return ApiResponse.success(res, result, 'Homepage section deleted');
});

// Banners
const listBannersPublic = asyncHandler(async (req, res) => {
  const banners = await bannerService.listPublic(req.query);
  return ApiResponse.success(res, banners, 'Banners fetched');
});

const listBannersAdmin = asyncHandler(async (req, res) => {
  const result = await bannerService.listAdmin(req.query);
  return ApiResponse.success(res, result.data, 'Banners fetched', 200, result.meta);
});

const getBanner = asyncHandler(async (req, res) => {
  const banner = await bannerService.getById(req.params.id);
  return ApiResponse.success(res, banner, 'Banner fetched');
});

const createBanner = asyncHandler(async (req, res) => {
  const banner = await bannerService.create(req.body, req.admin.id, req);
  return ApiResponse.created(res, banner, 'Banner created');
});

const updateBanner = asyncHandler(async (req, res) => {
  const banner = await bannerService.update(req.params.id, req.body, req.admin.id, req);
  return ApiResponse.success(res, banner, 'Banner updated');
});

const deleteBanner = asyncHandler(async (req, res) => {
  const result = await bannerService.remove(req.params.id, req.admin.id, req);
  return ApiResponse.success(res, result, 'Banner deleted');
});

// Pages
const getPageBySlug = asyncHandler(async (req, res) => {
  const page = await pageService.getBySlug(req.params.slug);
  return ApiResponse.success(res, page, 'Page fetched');
});

const listPagesAdmin = asyncHandler(async (req, res) => {
  const result = await pageService.listAdmin(req.query);
  return ApiResponse.success(res, result.data, 'Pages fetched', 200, result.meta);
});

const getPageAdmin = asyncHandler(async (req, res) => {
  const page = await pageService.getById(req.params.id);
  return ApiResponse.success(res, page, 'Page fetched');
});

const createPage = asyncHandler(async (req, res) => {
  const page = await pageService.create(req.body, req.admin.id, req);
  return ApiResponse.created(res, page, 'Page created');
});

const updatePage = asyncHandler(async (req, res) => {
  const page = await pageService.update(req.params.id, req.body, req.admin.id, req);
  return ApiResponse.success(res, page, 'Page updated');
});

const deletePage = asyncHandler(async (req, res) => {
  const result = await pageService.remove(req.params.id, req.admin.id, req);
  return ApiResponse.success(res, result, 'Page deleted');
});

// Blogs
const listBlogsPublic = asyncHandler(async (req, res) => {
  const result = await blogService.listPublic(req.query);
  return ApiResponse.success(res, result.data, 'Blogs fetched', 200, result.meta);
});

const getBlogBySlug = asyncHandler(async (req, res) => {
  const blog = await blogService.getBySlug(req.params.slug);
  return ApiResponse.success(res, blog, 'Blog fetched');
});

const listBlogsAdmin = asyncHandler(async (req, res) => {
  const result = await blogService.listAdmin(req.query);
  return ApiResponse.success(res, result.data, 'Blogs fetched', 200, result.meta);
});

const getBlogAdmin = asyncHandler(async (req, res) => {
  const blog = await blogService.getById(req.params.id);
  return ApiResponse.success(res, blog, 'Blog fetched');
});

const createBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.create(req.body, req.admin.id, req);
  return ApiResponse.created(res, blog, 'Blog created');
});

const updateBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.update(req.params.id, req.body, req.admin.id, req);
  return ApiResponse.success(res, blog, 'Blog updated');
});

const deleteBlog = asyncHandler(async (req, res) => {
  const result = await blogService.remove(req.params.id, req.admin.id, req);
  return ApiResponse.success(res, result, 'Blog deleted');
});

// FAQs
const listFaqsPublic = asyncHandler(async (req, res) => {
  const faqs = await faqService.listPublic(req.query);
  return ApiResponse.success(res, faqs, 'FAQs fetched');
});

const listFaqsAdmin = asyncHandler(async (req, res) => {
  const result = await faqService.listAdmin(req.query);
  return ApiResponse.success(res, result.data, 'FAQs fetched', 200, result.meta);
});

const getFaq = asyncHandler(async (req, res) => {
  const faq = await faqService.getById(req.params.id);
  return ApiResponse.success(res, faq, 'FAQ fetched');
});

const createFaq = asyncHandler(async (req, res) => {
  const faq = await faqService.create(req.body, req.admin.id, req);
  return ApiResponse.created(res, faq, 'FAQ created');
});

const updateFaq = asyncHandler(async (req, res) => {
  const faq = await faqService.update(req.params.id, req.body, req.admin.id, req);
  return ApiResponse.success(res, faq, 'FAQ updated');
});

const deleteFaq = asyncHandler(async (req, res) => {
  const result = await faqService.remove(req.params.id, req.admin.id, req);
  return ApiResponse.success(res, result, 'FAQ deleted');
});

// Contact
const submitContact = asyncHandler(async (req, res) => {
  const message = await contactService.create(req.body);
  return ApiResponse.created(res, message, 'Message sent');
});

const listContactMessages = asyncHandler(async (req, res) => {
  const result = await contactService.listAdmin(req.query);
  return ApiResponse.success(res, result.data, 'Contact messages fetched', 200, result.meta);
});

const getContactMessage = asyncHandler(async (req, res) => {
  const message = await contactService.getById(req.params.id);
  return ApiResponse.success(res, message, 'Contact message fetched');
});

const markContactRead = asyncHandler(async (req, res) => {
  const message = await contactService.markRead(req.params.id, req.admin.id, req);
  return ApiResponse.success(res, message, 'Marked as read');
});

const replyContact = asyncHandler(async (req, res) => {
  const message = await contactService.reply(req.params.id, req.body.reply, req.admin.id, req);
  return ApiResponse.success(res, message, 'Reply sent');
});

// Newsletter
const subscribeNewsletter = asyncHandler(async (req, res) => {
  const result = await newsletterService.subscribe(req.body.email);
  return ApiResponse.success(
    res,
    result.subscriber,
    result.alreadySubscribed ? 'Already subscribed' : 'Subscribed successfully'
  );
});

const listNewsletter = asyncHandler(async (req, res) => {
  const result = await newsletterService.listAdmin(req.query);
  return ApiResponse.success(res, result.data, 'Subscribers fetched', 200, result.meta);
});

const exportNewsletter = asyncHandler(async (req, res) => {
  const file = await newsletterService.exportSubscribers(req.query);
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  return res.send(file.buffer);
});

module.exports = {
  getHomepage,
  listHomepageSections,
  getHomepageSection,
  createHomepageSection,
  updateHomepageSection,
  deleteHomepageSection,
  listBannersPublic,
  listBannersAdmin,
  getBanner,
  createBanner,
  updateBanner,
  deleteBanner,
  getPageBySlug,
  listPagesAdmin,
  getPageAdmin,
  createPage,
  updatePage,
  deletePage,
  listBlogsPublic,
  getBlogBySlug,
  listBlogsAdmin,
  getBlogAdmin,
  createBlog,
  updateBlog,
  deleteBlog,
  listFaqsPublic,
  listFaqsAdmin,
  getFaq,
  createFaq,
  updateFaq,
  deleteFaq,
  submitContact,
  listContactMessages,
  getContactMessage,
  markContactRead,
  replyContact,
  subscribeNewsletter,
  listNewsletter,
  exportNewsletter,
};

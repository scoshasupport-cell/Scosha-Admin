const swaggerJsdoc = require('swagger-jsdoc');
const { env } = require('./env');

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'SCOSHA E-commerce API',
    version: '1.0.0',
    description: 'REST API for the SCOSHA fashion storefront and admin panel',
    contact: {
      name: 'SCOSHA Support',
      email: env.ADMIN_EMAIL,
    },
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}/api/v1`,
      description: 'Local development',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {},
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Health', description: 'Service health checks' },
    { name: 'Auth', description: 'Customer authentication (register, OTP, login)' },
    { name: 'Admin', description: 'Admin authentication and management' },
    { name: 'Catalog', description: 'Products, categories, brands, collections' },
    { name: 'Cart', description: 'Guest and authenticated cart' },
    { name: 'Orders', description: 'COD checkout and order management' },
    { name: 'Content', description: 'Homepage, pages, blogs, FAQs' },
  ],
};

const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [
    './src/routes/**/*.js',
    './src/docs/**/*.js',
  ],
});

module.exports = { swaggerSpec, swaggerDefinition };

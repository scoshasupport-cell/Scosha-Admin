/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is healthy
 *
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register customer (sends OTP email)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201:
 *         description: Registered; OTP sent
 *
 * /auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email OTP and receive JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string }
 *               otp: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: Verified
 *
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Customer login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *
 * /products:
 *   get:
 *     tags: [Catalog]
 *     summary: List products with filters
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: brand
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product list
 *
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create COD order (requires verified email)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [addressId, deliveryMethod]
 *             properties:
 *               addressId: { type: string }
 *               deliveryMethod: { type: string, enum: [standard, express] }
 *               couponCode: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Order created; admin notified by email
 *
 * /admin/auth/login:
 *   post:
 *     tags: [Admin]
 *     summary: Admin login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Admin authenticated
 *
 * /admin/dashboard/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Dashboard statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stats payload
 */

module.exports = {};

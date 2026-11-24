/**
 * @openapi
 * tags:
 *   - name: Authentication
 *     description: Student registration and login
 *
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a student
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Rahul Sharma
 *               email:
 *                 type: string
 *                 example: rahul@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: ExamplePass123
 *               board:
 *                 type: string
 *                 enum: [RBSE, CBSE]
 *               classLevel:
 *                 type: string
 *                 enum: ["11", "12", BCom, CA_FOUNDATION]
 *     responses:
 *       "201":
 *         description: Student registered
 *       "400":
 *         description: Invalid registration details
 *       "409":
 *         description: Email already registered
 *
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Log in a student or admin
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: rahul@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: ExamplePass123
 *     responses:
 *       "200":
 *         description: Login successful
 *       "401":
 *         description: Invalid credentials
 *
 * /api/auth/me:
 *   get:
 *     tags: [Authentication]
 *     summary: Get the current user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Profile retrieved
 *       "401":
 *         description: Authentication required
 */
export {};

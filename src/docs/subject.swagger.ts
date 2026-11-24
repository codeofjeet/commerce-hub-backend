/**
 * Commerce Hub Kota — Subject API Documentation
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Subject:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 671f12ab34cd56ef78901234
 *         name:
 *           type: string
 *           example: Accountancy
 *         slug:
 *           type: string
 *           example: accountancy
 *         boards:
 *           type: array
 *           items:
 *             type: string
 *             enum: [RBSE, CBSE]
 *           example: [RBSE, CBSE]
 *         courseLevels:
 *           type: array
 *           items:
 *             type: string
 *             enum: ["11", "12", BCom, CA_FOUNDATION]
 *           example: ["11", "12"]
 *         description:
 *           type: string
 *           example: Accountancy subject for commerce students
 *         isActive:
 *           type: boolean
 *           example: true
 *
 * /api/subjects:
 *   get:
 *     tags:
 *       - Subjects
 *     summary: Get all active subjects
 *     description: Optionally filter subjects by board and class or course.
 *     parameters:
 *       - in: query
 *         name: board
 *         schema:
 *           type: string
 *           enum: [RBSE, CBSE]
 *         required: false
 *         description: Filter by education board
 *       - in: query
 *         name: courseLevel
 *         schema:
 *           type: string
 *           enum: ["11", "12", BCom, CA_FOUNDATION]
 *         required: false
 *         description: Filter by class or course
 *     responses:
 *       "200":
 *         description: Subjects retrieved successfully
 *       "400":
 *         description: Invalid filter
 *       "500":
 *         description: Server error
 *
 *   post:
 *     tags:
 *       - Subjects
 *     summary: Create a subject
 *     description: Admin access required.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *                 example: Accountancy
 *               slug:
 *                 type: string
 *                 example: accountancy
 *               boards:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [RBSE, CBSE]
 *                 example: [RBSE, CBSE]
 *               courseLevels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: ["11", "12", BCom, CA_FOUNDATION]
 *                 example: ["11", "12"]
 *               description:
 *                 type: string
 *                 example: Accountancy for Classes 11 and 12
 *     responses:
 *       "201":
 *         description: Subject created successfully
 *       "400":
 *         description: Invalid subject data
 *       "401":
 *         description: Authentication required
 *       "403":
 *         description: Admin access required
 *       "409":
 *         description: Duplicate subject slug
 *
 * /api/subjects/{id}:
 *   get:
 *     tags:
 *       - Subjects
 *     summary: Get a subject by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Subject retrieved successfully
 *       "400":
 *         description: Invalid subject ID
 *       "404":
 *         description: Subject not found
 *
 *   put:
 *     tags:
 *       - Subjects
 *     summary: Update a subject
 *     description: Admin access required.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               boards:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [RBSE, CBSE]
 *               courseLevels:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: ["11", "12", BCom, CA_FOUNDATION]
 *               description:
 *                 type: string
 *     responses:
 *       "200":
 *         description: Subject updated successfully
 *       "400":
 *         description: Invalid input or ID
 *       "401":
 *         description: Authentication required
 *       "403":
 *         description: Admin access required
 *       "404":
 *         description: Subject not found
 *
 *   delete:
 *     tags:
 *       - Subjects
 *     summary: Deactivate a subject
 *     description: Admin access required. This does not permanently delete the record.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Subject deactivated successfully
 *       "400":
 *         description: Invalid subject ID
 *       "401":
 *         description: Authentication required
 *       "403":
 *         description: Admin access required
 *       "404":
 *         description: Active subject not found
 */
export {};

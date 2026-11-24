/**
 * @swagger
 * components:
 *   schemas:
 *     TimedTest:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "6ae37577da21ffaf95139d39"
 *         title:
 *           type: string
 *           example: "Accountancy Class 11 Test 1"
 *         description:
 *           type: string
 *           example: "First chapter assessment"
 *         subject:
 *           type: string
 *           example: "6ae376d04b5c92ee582d0605"
 *         chapters:
 *           type: array
 *           items:
 *             type: string
 *         board:
 *           type: string
 *           enum: [RBSE, CBSE]
 *         courseLevel:
 *           type: string
 *           enum: ["11", "12", BCom, CA_FOUNDATION]
 *         questions:
 *           type: array
 *           items:
 *             type: string
 *         durationMinutes:
 *           type: integer
 *           example: 30
 *         totalQuestions:
 *           type: integer
 *           example: 10
 *         totalMarks:
 *           type: number
 *           example: 20
 *         isActive:
 *           type: boolean
 *           example: true
 *
 *     CreateTimedTest:
 *       type: object
 *       required:
 *         - title
 *         - subject
 *         - chapters
 *         - board
 *         - courseLevel
 *         - questions
 *         - durationMinutes
 *       properties:
 *         title:
 *           type: string
 *           example: "Accountancy Class 11 Test 1"
 *         description:
 *           type: string
 *           example: "First chapter assessment"
 *         subject:
 *           type: string
 *           example: "6ae376d04b5c92ee582d0605"
 *         chapters:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: string
 *           example:
 *             - "6ae44bd82b0166de6df4bc82"
 *         board:
 *           type: string
 *           enum: [RBSE, CBSE]
 *           example: CBSE
 *         courseLevel:
 *           type: string
 *           enum: ["11", "12", BCom, CA_FOUNDATION]
 *           example: "11"
 *         questions:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: string
 *           example:
 *             - "6ae500000000000000000001"
 *         durationMinutes:
 *           type: integer
 *           minimum: 1
 *           maximum: 600
 *           example: 30
 *
 *     UpdateTimedTestStatus:
 *       type: object
 *       required:
 *         - isActive
 *       properties:
 *         isActive:
 *           type: boolean
 *           example: false
 */

/**
 * @swagger
 * /api/timed-tests:
 *   get:
 *     summary: Get all timed tests
 *     description: Retrieve timed tests with optional filters and pagination.
 *     tags: [Timed Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Filter by subject ID
 *       - in: query
 *         name: board
 *         schema:
 *           type: string
 *           enum: [RBSE, CBSE]
 *       - in: query
 *         name: courseLevel
 *         schema:
 *           type: string
 *           enum: ["11", "12", BCom, CA_FOUNDATION]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Timed tests retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Failed to retrieve timed tests
 *
 *   post:
 *     summary: Create a timed test
 *     description: Creates a test using published questions with verified answers. Total questions and marks are calculated by the server.
 *     tags: [Timed Tests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTimedTest'
 *     responses:
 *       201:
 *         description: Timed test created successfully
 *       400:
 *         description: Invalid data or question references
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Failed to create timed test
 *
 * /api/timed-tests/{id}:
 *   get:
 *     summary: Get timed test by ID
 *     tags: [Timed Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Timed test ID
 *     responses:
 *       200:
 *         description: Timed test retrieved successfully
 *       400:
 *         description: Invalid timed test ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Timed test not found
 *
 *   put:
 *     summary: Update a timed test
 *     description: Updates test details and recalculates question count and total marks.
 *     tags: [Timed Tests]
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
 *             allOf:
 *               - $ref: '#/components/schemas/CreateTimedTest'
 *             description: All fields are optional when updating.
 *     responses:
 *       200:
 *         description: Timed test updated successfully
 *       400:
 *         description: Invalid timed test data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Timed test not found
 *
 * /api/timed-tests/{id}/status:
 *   patch:
 *     summary: Activate or deactivate a timed test
 *     tags: [Timed Tests]
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
 *             $ref: '#/components/schemas/UpdateTimedTestStatus'
 *     responses:
 *       200:
 *         description: Timed test status updated successfully
 *       400:
 *         description: Invalid status data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Timed test not found
 */

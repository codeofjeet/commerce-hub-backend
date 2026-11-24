/**
 * @swagger
 * tags:
 *   name: Teachers
 *   description: Admin management of teachers and subject assignments
 */

/**
 * @swagger
 * /api/teachers:
 *   post:
 *     summary: Create a teacher account
 *     description: Admin creates a teacher account and optionally assigns active subjects.
 *     tags: [Teachers]
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
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Rahul Sharma"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "rahul@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "Teacher@123"
 *               assignedSubjects:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - "65f123456789abcdef123456"
 *                   - "65f123456789abcdef123457"
 *     responses:
 *       201:
 *         description: Teacher created successfully
 *       400:
 *         description: Invalid teacher details or subject IDs
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/teachers:
 *   get:
 *     summary: Get all teachers
 *     description: Retrieves all teacher accounts with their assigned subjects.
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teachers retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/teachers/{id}/subjects:
 *   patch:
 *     summary: Update teacher subject assignments
 *     description: Replaces the assigned subjects of an existing teacher.
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: MongoDB teacher ID
 *         schema:
 *           type: string
 *         example: "65f123456789abcdef123456"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedSubjects
 *             properties:
 *               assignedSubjects:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example:
 *                   - "65f123456789abcdef123456"
 *                   - "65f123456789abcdef123457"
 *     responses:
 *       200:
 *         description: Teacher subject assignments updated successfully
 *       400:
 *         description: Invalid teacher ID or subject assignment data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Teacher not found
 *       500:
 *         description: Server error
 */

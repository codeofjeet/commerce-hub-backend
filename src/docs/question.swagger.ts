/**
 * @openapi
 * components:
 *   schemas:
 *     Question:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         questionText:
 *           type: string
 *           example: What is accounting?
 *         subject:
 *           type: string
 *         chapter:
 *           type: string
 *         board:
 *           type: string
 *           enum: [CBSE, RBSE]
 *         courseLevel:
 *           type: string
 *           enum: ["11", "12", BCom, CA_FOUNDATION]
 *         questionType:
 *           type: string
 *           enum: [MCQ, SHORT, LONG, NUMERICAL]
 *         options:
 *           type: array
 *           items:
 *             type: string
 *         difficulty:
 *           type: string
 *           enum: [easy, medium, hard]
 *         marks:
 *           type: number
 *         status:
 *           type: string
 *           enum: [draft, published, archived]
 *
 * /api/questions:
 *   get:
 *     tags:
 *       - Questions
 *     summary: Get published questions
 *     description: Public endpoint. Supports filters and pagination.
 *     parameters:
 *       - in: query
 *         name: board
 *         schema:
 *           type: string
 *           enum: [CBSE, RBSE]
 *       - in: query
 *         name: courseLevel
 *         schema:
 *           type: string
 *           enum: ["11", "12", BCom, CA_FOUNDATION]
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *       - in: query
 *         name: chapter
 *         schema:
 *           type: string
 *       - in: query
 *         name: questionType
 *         schema:
 *           type: string
 *           enum: [MCQ, SHORT, LONG, NUMERICAL]
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *         description: Published questions retrieved successfully
 *
 *   post:
 *     tags:
 *       - Questions
 *     summary: Create a question
 *     description: Admin only. New questions are saved as drafts.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - questionText
 *               - subject
 *               - chapter
 *               - board
 *               - courseLevel
 *             properties:
 *               questionText:
 *                 type: string
 *                 example: What is accounting?
 *               subject:
 *                 type: string
 *                 example: 6ae376d04b5c92ee582d0605
 *               chapter:
 *                 type: string
 *                 example: 6ae44bd82b0166de6df4bc82
 *               board:
 *                 type: string
 *                 enum: [CBSE, RBSE]
 *               courseLevel:
 *                 type: string
 *                 enum: ["11", "12", BCom, CA_FOUNDATION]
 *               questionType:
 *                 type: string
 *                 enum: [MCQ, SHORT, LONG, NUMERICAL]
 *                 default: SHORT
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *                 default: medium
 *               marks:
 *                 type: number
 *                 default: 1
 *     responses:
 *       201:
 *         description: Question created successfully as draft
 *       400:
 *         description: Invalid question data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *
 * /api/questions/{id}:
 *   get:
 *     tags:
 *       - Questions
 *     summary: Get a published question by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Question retrieved successfully
 *       404:
 *         description: Published question not found
 *
 *   put:
 *     tags:
 *       - Questions
 *     summary: Update or publish a question
 *     description: Admin only. Set status to published to make it visible to students.
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
 *               questionText:
 *                 type: string
 *               subject:
 *                 type: string
 *               chapter:
 *                 type: string
 *               board:
 *                 type: string
 *                 enum: [CBSE, RBSE]
 *               courseLevel:
 *                 type: string
 *                 enum: ["11", "12", BCom, CA_FOUNDATION]
 *               questionType:
 *                 type: string
 *                 enum: [MCQ, SHORT, LONG, NUMERICAL]
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               marks:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *     responses:
 *       200:
 *         description: Question updated successfully
 *       404:
 *         description: Question not found
 *
 *   delete:
 *     tags:
 *       - Questions
 *     summary: Archive a question
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Question archived successfully
 */

export {};

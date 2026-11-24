/**
 * @openapi
 * components:
 *   schemas:
 *     Answer:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         question:
 *           type: string
 *         answerText:
 *           type: string
 *           example: Accounting is the process of identifying, recording, classifying and summarizing financial transactions.
 *         explanation:
 *           type: string
 *           example: It helps businesses understand their financial position and performance.
 *         isVerified:
 *           type: boolean
 *
 * /api/answers:
 *   post:
 *     tags:
 *       - Answers
 *     summary: Create an answer
 *     description: Admin only. Creates an unverified answer for a question.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - question
 *               - answerText
 *             properties:
 *               question:
 *                 type: string
 *                 example: 6ae44f2e53761b1c2997248b
 *               answerText:
 *                 type: string
 *                 example: Accounting is the process of identifying, recording, classifying and summarizing financial transactions.
 *               explanation:
 *                 type: string
 *                 example: It helps businesses understand their financial position and performance.
 *     responses:
 *       201:
 *         description: Answer created successfully
 *       400:
 *         description: Invalid answer data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       409:
 *         description: Answer already exists
 *
 * /api/answers/question/{questionId}:
 *   get:
 *     tags:
 *       - Answers
 *     summary: Get a verified answer for a published question
 *     description: Public endpoint. Only returns verified answers when the question is published.
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Verified answer retrieved successfully
 *       404:
 *         description: Published question or verified answer not found
 *
 * /api/answers/{id}:
 *   put:
 *     tags:
 *       - Answers
 *     summary: Update or verify an answer
 *     description: Admin only. Set isVerified to true after reviewing the answer.
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
 *               answerText:
 *                 type: string
 *               explanation:
 *                 type: string
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Answer updated successfully
 *       404:
 *         description: Answer not found
 *
 *   delete:
 *     tags:
 *       - Answers
 *     summary: Delete an answer
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
 *         description: Answer deleted successfully
 *       404:
 *         description: Answer not found
 */

export {};

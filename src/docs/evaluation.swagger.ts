/**
 * @swagger
 * tags:
 *   name: Evaluations
 *   description: Teacher and admin evaluation of student practice answers
 */

/**
 * @swagger
 * /api/evaluations/pending:
 *   get:
 *     summary: Get all pending student answers
 *     tags: [Evaluations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending evaluations retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin or teacher access required
 */

/**
 * @swagger
 * /api/evaluations/{responseId}:
 *   get:
 *     summary: Get student answer and verified answer details
 *     tags: [Evaluations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student response ID
 *     responses:
 *       200:
 *         description: Evaluation details retrieved successfully
 *       404:
 *         description: Student response not found
 *       403:
 *         description: Admin or teacher access required
 */

/**
 * @swagger
 * /api/evaluations/{responseId}/submit:
 *   post:
 *     summary: Evaluate a student's written answer
 *     tags: [Evaluations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student response ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - marksAwarded
 *             properties:
 *               marksAwarded:
 *                 type: number
 *                 minimum: 0
 *                 example: 1
 *               feedback:
 *                 type: string
 *                 example: Good answer. All important points are covered.
 *     responses:
 *       200:
 *         description: Student answer evaluated successfully
 *       400:
 *         description: Invalid marks or evaluation details
 *       404:
 *         description: Pending student response not found
 *       403:
 *         description: Admin or teacher access required
 */

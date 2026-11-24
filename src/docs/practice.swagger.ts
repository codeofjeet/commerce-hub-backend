/**
 * @swagger
 * tags:
 *   - name: Practice
 *     description: Student question practice APIs
 */

/**
 * @swagger
 * /api/practice/start:
 *   post:
 *     summary: Start a practice session
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chapterId
 *             properties:
 *               chapterId:
 *                 type: string
 *                 example: "6ae44bd82b0166de6df4bc82"
 *               questionLimit:
 *                 type: integer
 *                 default: 10
 *                 example: 10
 *     responses:
 *       201:
 *         description: Practice started successfully
 *       400:
 *         description: Invalid practice details
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Chapter or questions not found
 *
 * /api/practice/my-attempts:
 *   get:
 *     summary: Get my previous practice sessions
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Practice history retrieved
 *
 * /api/practice/{attemptId}:
 *   get:
 *     summary: Get current practice question
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current question retrieved
 *       404:
 *         description: Practice attempt not found
 *
 * /api/practice/{attemptId}/answer:
 *   post:
 *     summary: Submit answer to current question
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
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
 *               selectedOptionIndex:
 *                 type: integer
 *                 example: 1
 *               responseText:
 *                 type: string
 *                 example: "Accounting is the process of identifying and recording financial transactions."
 *     responses:
 *       201:
 *         description: Answer submitted successfully
 *       400:
 *         description: Invalid answer
 *       409:
 *         description: Question already answered
 *
 * /api/practice/{attemptId}/next:
 *   post:
 *     summary: Move to the next question
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Next question ready or practice completed
 *
 * /api/practice/{attemptId}/result:
 *   get:
 *     summary: Get practice result
 *     tags: [Practice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Practice result retrieved
 */

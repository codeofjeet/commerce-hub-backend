/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Student chatbot APIs
 */

/**
 * @swagger
 * /api/chat/message:
 *   post:
 *     summary: Send a question to the student chatbot
 *     description: Search the verified question bank and submit unanswered questions for teacher review.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subjectId
 *               - questionText
 *             properties:
 *               subjectId:
 *                 type: string
 *                 example: "65f123456789abcdef123456"
 *               questionText:
 *                 type: string
 *                 example: "What is accounting?"
 *               conversationId:
 *                 type: string
 *                 nullable: true
 *                 example: "65f123456789abcdef123457"
 *     responses:
 *       200:
 *         description: Chat response generated successfully
 *       400:
 *         description: Invalid request or question data
 *       401:
 *         description: Authentication required
 */

/**
 * @swagger
 * /api/chat/history/{conversationId}/rename:
 *   patch:
 *     summary: Rename a student conversation
 *     description: Updates the custom title of a conversation belonging to the authenticated student.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         description: MongoDB conversation ID
 *         schema:
 *           type: string
 *         example: "65f123456789abcdef123457"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customTitle
 *             properties:
 *               customTitle:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Accounting Chapter 1"
 *     responses:
 *       200:
 *         description: Conversation renamed successfully
 *       400:
 *         description: Invalid conversation ID or title
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/chat/history/{conversationId}:
 *   delete:
 *     summary: Delete a student conversation
 *     description: Permanently deletes a conversation belonging to the authenticated student. Associated question submissions are not deleted.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         description: MongoDB conversation ID
 *         schema:
 *           type: string
 *         example: "65f123456789abcdef123457"
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
 *       400:
 *         description: Invalid conversation ID
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */

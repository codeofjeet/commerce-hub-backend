/**
 * @swagger
 * /api/chat/history:
 *   get:
 *     summary: Get all previous chat conversations
 *     description: Retrieves all active chatbot conversations belonging to the authenticated student.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 */

/**
 * @swagger
 * /api/chat/history/{conversationId}:
 *   get:
 *     summary: Get chat conversation details
 *     description: Retrieves all messages from a selected conversation belonging to the authenticated student.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB conversation ID
 *     responses:
 *       200:
 *         description: Conversation retrieved successfully
 *       400:
 *         description: Invalid conversation ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Access denied
 *       404:
 *         description: Conversation not found
 */

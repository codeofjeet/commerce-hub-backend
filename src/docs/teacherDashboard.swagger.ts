/**
 * @swagger
 * /api/question-submissions/teacher/dashboard-stats:
 *   get:
 *     summary: Get teacher dashboard statistics
 *     description: Retrieves pending questions, submitted answers, verified answers, and assigned subject counts for the authenticated teacher.
 *     tags:
 *       - Teacher Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Teacher dashboard statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     pendingQuestions:
 *                       type: integer
 *                       example: 0
 *                     answersSubmitted:
 *                       type: integer
 *                       example: 3
 *                     verifiedAnswers:
 *                       type: integer
 *                       example: 3
 *                     assignedSubjects:
 *                       type: integer
 *                       example: 1
 *       401:
 *         description: Invalid teacher authentication
 *       404:
 *         description: Teacher not found or inactive
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/question-submissions/teacher/performance-reports:
 *   get:
 *     summary: Get teacher performance reports
 *     description: Retrieves subject-wise statistics, six months of teacher activity, and timed examination evaluation performance.
 *     tags:
 *       - Teacher Dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher performance reports retrieved successfully
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
 *                   example: Teacher performance reports retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     subjectStatistics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           subjectId:
 *                             type: string
 *                           subjectName:
 *                             type: string
 *                           answersSubmitted:
 *                             type: integer
 *                           verifiedAnswers:
 *                             type: integer
 *                           pendingQuestions:
 *                             type: integer
 *                     monthlyActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           year:
 *                             type: integer
 *                           month:
 *                             type: integer
 *                           answersSubmitted:
 *                             type: integer
 *                           timedAnswersEvaluated:
 *                             type: integer
 *                           marksAwarded:
 *                             type: number
 *                     timedTestPerformance:
 *                       type: object
 *                       properties:
 *                         totalEvaluated:
 *                           type: integer
 *                         totalMarksAwarded:
 *                           type: number
 *       401:
 *         description: Invalid teacher authentication
 *       404:
 *         description: Teacher not found or inactive
 *       500:
 *         description: Failed to retrieve teacher performance reports
 */

/**
 * @swagger
 * /api/teacher-timed-tests/pending:
 *   get:
 *     summary: Get pending timed test answers
 *     description: Retrieves written answers awaiting evaluation for subjects assigned to the authenticated teacher.
 *     tags: [Teacher Timed Tests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending answers retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Teacher access required or subject not assigned
 *       500:
 *         description: Server error
 *
 * /api/teacher-timed-tests/{responseId}/evaluate:
 *   patch:
 *     summary: Evaluate a student's timed test answer
 *     description: Awards marks and feedback for a written answer and recalculates the examination result.
 *     tags: [Teacher Timed Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: responseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Test response ID
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
 *                 example: "Good answer. All important accounting concepts are covered."
 *     responses:
 *       200:
 *         description: Answer evaluated successfully
 *       400:
 *         description: Invalid marks or answer already evaluated
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Teacher is not assigned to this subject
 *       404:
 *         description: Answer or examination not found
 *       500:
 *         description: Server error
 */

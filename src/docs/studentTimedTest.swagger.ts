/**
 * @swagger
 * tags:
 *   name: Student Timed Tests
 *   description: Student timed examination, answer submission and results
 */

/**
 * @swagger
 * /api/student-timed-tests:
 *   get:
 *     summary: Get available timed tests
 *     description: Returns active tests matching the authenticated student's board and class. Optionally filter by subject.
 *     tags: [Student Timed Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Optional subject ID
 *     responses:
 *       200:
 *         description: Available tests retrieved successfully
 *       400:
 *         description: Invalid subject ID or incomplete student profile
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Student access required
 *
 * /api/student-timed-tests/attempts:
 *   get:
 *     summary: Get student's timed test history
 *     tags: [Student Timed Tests]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test history retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Student access required
 *
 * /api/student-timed-tests/{testId}/start:
 *   post:
 *     summary: Start a timed test
 *     description: Creates a student attempt and calculates its expiry time on the server.
 *     tags: [Student Timed Tests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: testId
 *         required: true
 *         schema:
 *           type: string
 *         description: Timed test ID
 *     responses:
 *       201:
 *         description: Timed test started successfully
 *       200:
 *         description: Existing active attempt returned
 *       400:
 *         description: Invalid test ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Student access required
 *       404:
 *         description: Available test not found
 *
 * /api/student-timed-tests/attempts/{attemptId}:
 *   get:
 *     summary: Get test questions and saved answers
 *     description: Returns questions without exposing correct answers.
 *     tags: [Student Timed Tests]
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
 *         description: Test attempt retrieved successfully
 *       400:
 *         description: Invalid attempt ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Student access required
 *       404:
 *         description: Attempt not found
 *
 * /api/student-timed-tests/attempts/{attemptId}/answer:
 *   post:
 *     summary: Save or update a test answer
 *     description: Saves an MCQ selection or descriptive answer. Students can update saved answers before submission.
 *     tags: [Student Timed Tests]
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
 *             required:
 *               - questionId
 *             properties:
 *               questionId:
 *                 type: string
 *                 example: "6ae44f2e53761b1c2997248b"
 *               selectedOptionIndex:
 *                 type: integer
 *                 nullable: true
 *                 example: 1
 *               responseText:
 *                 type: string
 *                 example: "Accounting is the process of recording financial transactions."
 *     responses:
 *       200:
 *         description: Answer saved successfully
 *       400:
 *         description: Invalid answer or test no longer accepting answers
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Student access required
 *       404:
 *         description: Attempt or question not found
 *
 * /api/student-timed-tests/attempts/{attemptId}/submit:
 *   post:
 *     summary: Submit timed test
 *     description: Submits saved answers and automatically evaluates MCQ questions. Descriptive answers remain pending teacher evaluation.
 *     tags: [Student Timed Tests]
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
 *         description: Test submitted successfully
 *       400:
 *         description: Test already submitted or expired
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Student access required
 *       404:
 *         description: Attempt not found
 *
 * /api/student-timed-tests/attempts/{attemptId}/result:
 *   get:
 *     summary: Get timed test result
 *     description: Returns marks, correct answers, incorrect answers and pending teacher evaluations.
 *     tags: [Student Timed Tests]
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
 *         description: Test result retrieved successfully
 *       400:
 *         description: Test is still in progress
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Student access required
 *       404:
 *         description: Attempt not found
 */

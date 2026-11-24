/**
 * @openapi
 * /api/question-submissions:
 *   post:
 *     tags:
 *       - Question Submissions
 *     summary: Submit a question
 *     description: Student only. Submits a question for admin review.
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
 *               - board
 *               - courseLevel
 *               - subject
 *             properties:
 *               questionText:
 *                 type: string
 *                 example: What is the difference between bookkeeping and accounting?
 *               board:
 *                 type: string
 *                 enum: [CBSE, RBSE]
 *               courseLevel:
 *                 type: string
 *                 enum: ["11", "12", BCom, CA_FOUNDATION]
 *               subject:
 *                 type: string
 *                 example: 6ae376d04b5c92ee582d0605
 *               chapter:
 *                 type: string
 *                 example: 6ae44bd82b0166de6df4bc82
 *     responses:
 *       201:
 *         description: Question submitted successfully
 *       400:
 *         description: Invalid submission data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Student access required
 *
 *   get:
 *     tags:
 *       - Question Submissions
 *     summary: Get all student submissions
 *     description: Admin only. Supports status filtering and pagination.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_review, answered, rejected]
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
 *         description: Submissions retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *
 * /api/question-submissions/my:
 *   get:
 *     tags:
 *       - Question Submissions
 *     summary: Get my submitted questions
 *     description: Student only. Returns submissions belonging to the logged-in student.
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Student submissions retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Student access required
 *
 * /api/question-submissions/{id}:
 *   put:
 *     tags:
 *       - Question Submissions
 *     summary: Review a student submission
 *     description: Admin only. Update status, add notes, and link a published question.
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
 *               status:
 *                 type: string
 *                 enum: [pending, in_review, answered, rejected]
 *               adminNotes:
 *                 type: string
 *               publishedQuestion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Submission updated successfully
 *       400:
 *         description: Invalid submission update
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Submission not found
 */

/**
 * @openapi
 * /api/question-submissions/teacher:
 *   get:
 *     tags:
 *       - Question Submissions
 *     summary: Get submissions for assigned subjects
 *     description: Teacher only. Returns student submissions belonging exclusively to the authenticated teacher's assigned subjects.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         description: Filter submissions by status.
 *         schema:
 *           type: string
 *           enum: [pending, in_review, answered, rejected]
 *       - in: query
 *         name: page
 *         description: Page number.
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         description: Number of submissions per page (maximum 50).
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Assigned subject submissions retrieved successfully
 *       400:
 *         description: Invalid submission status
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Teacher access required
 *       404:
 *         description: Active teacher account not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/question-submissions/{id}/answer:
 *   post:
 *     tags:
 *       - Question Submissions
 *     summary: Submit or edit a teacher answer
 *     description: Teacher only. Creates a draft question and an unverified answer, or edits the teacher's own unverified answer. The teacher must be assigned to the submission's subject.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Student question submission ID
 *         schema:
 *           type: string
 *         example: "6aeaf191afce53b2b4594d44"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answerText
 *             properties:
 *               answerText:
 *                 type: string
 *                 example: "Accounting is the process of identifying, recording, classifying, summarizing and interpreting financial transactions."
 *               explanation:
 *                 type: string
 *                 example: "It helps users understand the financial position and performance of a business."
 *     responses:
 *       201:
 *         description: Answer submitted successfully and is awaiting admin verification
 *       200:
 *         description: Existing unverified answer updated successfully
 *       400:
 *         description: Invalid answer, unavailable submission, or missing chapter
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Teacher is not assigned to this subject or cannot edit this answer
 *       404:
 *         description: Submission or teacher account not found
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/question-submissions/{id}/chapter:
 *   patch:
 *     tags:
 *       - Question Submissions
 *     summary: Assign or update submission chapter
 *     description: Admin only. Assigns a valid chapter matching the submission's subject, board, and course level. Chapter cannot be changed after a teacher creates a draft question.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Student question submission ID
 *         schema:
 *           type: string
 *         example: "6aeaf191afce53b2b4594d44"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chapter
 *             properties:
 *               chapter:
 *                 type: string
 *                 example: "6ae44bd82b0166de6df4bc82"
 *     responses:
 *       200:
 *         description: Submission chapter assigned successfully
 *       400:
 *         description: Invalid chapter or submission status
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Submission not found
 *       409:
 *         description: Chapter cannot be changed after draft creation
 *       500:
 *         description: Server error
 */

/**
 * @openapi
 * /api/question-submissions/{id}/verify:
 *   patch:
 *     tags:
 *       - Question Submissions
 *     summary: Verify teacher answer and publish question
 *     description: Admin only. Verifies the teacher's answer, publishes the linked draft question, and marks the student submission as answered. All three updates occur in a MongoDB transaction.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Student question submission ID
 *         schema:
 *           type: string
 *         example: "6ae8bfcfddb7ddac36b90a72"
 *     responses:
 *       200:
 *         description: Teacher answer verified and question published successfully
 *       400:
 *         description: Submission is not in review or draft question is invalid
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Submission, draft question, or answer not found
 *       409:
 *         description: Answer already verified
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/question-submissions/teacher/my-answers:
 *   get:
 *     summary: Get answers submitted by the logged-in teacher
 *     description: Retrieve questions answered by the authenticated teacher, including answer verification status.
 *     tags: [Question Submissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher answers retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher access required
 *       500:
 *         description: Internal server error
 */

export {};

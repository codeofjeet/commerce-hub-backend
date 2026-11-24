/**
 * @openapi
 * components:
 *   schemas:
 *     Chapter:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *           example: Introduction to Accounting
 *         chapterNumber:
 *           type: integer
 *           example: 1
 *         subject:
 *           type: string
 *           example: 6ae376d04b5c92ee582d0605
 *         board:
 *           type: string
 *           enum: [CBSE, RBSE]
 *         courseLevel:
 *           type: string
 *           enum: ["11", "12", BCom, CA_FOUNDATION]
 *         isActive:
 *           type: boolean
 *
 * /api/chapters:
 *   get:
 *     tags:
 *       - Chapters
 *     summary: Get all active chapters
 *     parameters:
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Filter chapters by subject ID
 *       - in: query
 *         name: board
 *         schema:
 *           type: string
 *           enum: [CBSE, RBSE]
 *       - in: query
 *         name: courseLevel
 *         schema:
 *           type: string
 *           enum: ["11", "12", BCom, CA_FOUNDATION]
 *     responses:
 *       200:
 *         description: Chapters retrieved successfully
 *
 *   post:
 *     tags:
 *       - Chapters
 *     summary: Create a chapter
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - chapterNumber
 *               - subject
 *               - board
 *               - courseLevel
 *             properties:
 *               title:
 *                 type: string
 *                 example: Introduction to Accounting
 *               chapterNumber:
 *                 type: integer
 *                 example: 1
 *               subject:
 *                 type: string
 *                 example: 6ae376d04b5c92ee582d0605
 *               board:
 *                 type: string
 *                 enum: [CBSE, RBSE]
 *               courseLevel:
 *                 type: string
 *                 enum: ["11", "12", BCom, CA_FOUNDATION]
 *     responses:
 *       201:
 *         description: Chapter created successfully
 *       400:
 *         description: Invalid chapter data
 *       401:
 *         description: Unauthorized
 *
 * /api/chapters/{id}:
 *   get:
 *     tags:
 *       - Chapters
 *     summary: Get a chapter by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chapter retrieved successfully
 *
 *   put:
 *     tags:
 *       - Chapters
 *     summary: Update a chapter
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
 *               title:
 *                 type: string
 *               chapterNumber:
 *                 type: integer
 *               subject:
 *                 type: string
 *               board:
 *                 type: string
 *                 enum: [CBSE, RBSE]
 *               courseLevel:
 *                 type: string
 *                 enum: ["11", "12", BCom, CA_FOUNDATION]
 *     responses:
 *       200:
 *         description: Chapter updated successfully
 *
 *   delete:
 *     tags:
 *       - Chapters
 *     summary: Deactivate a chapter
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
 *         description: Chapter deactivated successfully
 */

export {};

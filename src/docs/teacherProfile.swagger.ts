/**
 * @swagger
 * tags:
 *   - name: Teacher Profile
 *     description: Teacher profile management and password security
 */

/**
 * @swagger
 * /api/teachers/profile:
 *   get:
 *     summary: Get teacher profile
 *     tags: [Teacher Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher profile retrieved successfully
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Teacher not found or inactive
 *
 *   put:
 *     summary: Update teacher profile
 *     tags: [Teacher Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Rahul Sharma
 *               mobileNumber:
 *                 type: string
 *                 example: "9876543210"
 *               city:
 *                 type: string
 *                 example: Jaipur
 *     responses:
 *       200:
 *         description: Teacher profile updated successfully
 *       400:
 *         description: Invalid profile information
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Teacher not found or inactive
 *
 * /api/teachers/change-password:
 *   patch:
 *     summary: Change teacher password
 *     tags: [Teacher Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: OldPassword123
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: NewPassword123
 *     responses:
 *       200:
 *         description: Teacher password changed successfully
 *       400:
 *         description: Current password incorrect or invalid password data
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Teacher not found or inactive
 */

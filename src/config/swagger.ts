import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",

    info: {
      title: "Commerce Hub Kota API",
      version: "1.0.0",
      description:
        "API documentation for the Commerce Hub Kota student question bank.",
    },

    servers: [
      {
        url: "http://localhost:5000",
        description: "Local development server",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token",
        },
      },
    },

    tags: [
      { name: "Health", description: "Backend health checks" },
      { name: "Authentication", description: "Student registration and login" },
      { name: "Subjects", description: "Manage commerce subjects" },
      { name: "Chapters", description: "Manage subject chapters" },
      {
        name: "Questions",
        description: "Manage question bank and published questions",
      },
      {
        name: "Answers",
        description: "Manage question answers and verification",
      },
      {
        name: "Question Submissions",
        description: "Student question submissions and admin review",
      },
      {
        name: "Practice",
        description:
          "Student practice sessions, answer submission, and results",
      },
      {
        name: "Evaluations",
        description: "Teacher and admin evaluation of student practice answers",
      },
      {
        name: "Chat",
        description:
          "Student chatbot for searching verified answers and submitting unanswered questions for teacher/admin review",
      },
      {
        name: "Teachers",
        description:
          "Admin management of teacher accounts and subject assignments",
      },
      {
        name: "Timed Tests",
        description:
          "Admin management of timed examinations, test questions, duration, and activation status",
      },
      {
        name: "Student Timed Tests",
        description:
          "Student access to available timed examinations, test attempts, answer submission, and results",
      },
      {
        name: "Teacher Timed Tests",
        description:
          "Teacher access to pending timed test answers and written answer evaluation",
      },

      {
        name: "Teacher Dashboard",
        description:
          "Teacher dashboard statistics, assigned subjects, pending questions, and answer summaries",
      },
      {
        name: "Teacher Profile",
        description:
          "Teacher profile management, personal information, and password security",
      },
      {
        name: "Notifications",
        description:
          "User notifications, unread counts, and notification read status management",
      },
    ],
  },

  apis: ["./src/docs/*.swagger.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;

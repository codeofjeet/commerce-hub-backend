import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

import authRoutes from "./routes/auth.routes.js";
import subjectRoutes from "./routes/subject.routes.js";
import chapterRoutes from "./routes/chapter.routes.js";
import questionRoutes from "./routes/question.routes.js";
import answerRoutes from "./routes/answer.routes.js";
import questionSubmissionRoutes from "./routes/questionSubmission.routes.js";
import practiceRoutes from "./routes/practice.routes.js";
import timedTestRoutes from "./routes/timedTest.routes.js";
import evaluationRoutes from "./routes/evaluation.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import chatHistoryRoutes from "./routes/chatHistory.routes.js";
import teacherRoutes from "./routes/teacher.routes.js";
import studentTimedTestRoutes from "./routes/studentTimedTest.routes.js";
import teacherTimedTestRoutes from "./routes/teacherTimedTest.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/chapters", chapterRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/answers", answerRoutes);
app.use("/api/question-submissions", questionSubmissionRoutes);
app.use("/api/practice", practiceRoutes);
app.use("/api/timed-tests", timedTestRoutes);
app.use("/api/evaluations", evaluationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/chat", chatHistoryRoutes);
app.use("/api/student-timed-tests", studentTimedTestRoutes);
app.use("/api/teacher-timed-tests", teacherTimedTestRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Commerce Hub Kota API is running",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Backend is healthy",
  });
});

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Commerce Hub API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error);
    process.exit(1);
  }
};

void startServer();

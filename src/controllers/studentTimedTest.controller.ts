import { Request, Response } from "express";
import mongoose from "mongoose";

import User from "../models/User.js";
import TimedTest from "../models/TimedTest.js";
import TestAttempt from "../models/TestAttempt.js";
import TestResponse from "../models/TestResponse.js";
import Question from "../models/Question.js";

import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

// --------------------------------------------------
// Helper: Get authenticated active student
// --------------------------------------------------

const getStudentProfile = async (userId: string) => {
  return User.findOne({
    _id: userId,
    role: "student",
    isActive: true,
  }).select("board classLevel isActive");
};

// --------------------------------------------------
// Helper: Get attempt belonging to a student
// --------------------------------------------------

const getOwnedAttempt = async (attemptId: string, studentId: string) => {
  return TestAttempt.findOne({
    _id: attemptId,
    student: studentId,
  });
};

// --------------------------------------------------
// Helper: Evaluate saved answers and finalize attempt
// --------------------------------------------------

const finalizeAttempt = async (
  attempt: any,
  finalStatus: "submitted" | "expired",
): Promise<void> => {
  if (attempt.status !== "in_progress") {
    return;
  }

  const [responses, questions] = await Promise.all([
    TestResponse.find({
      attempt: attempt._id,
      student: attempt.student,
    }),

    Question.find({
      _id: { $in: attempt.questions },
    }),
  ]);

  const questionMap = new Map(
    questions.map((question) => [String(question._id), question]),
  );

  let answeredQuestions = 0;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let marksObtained = 0;

  for (const response of responses) {
    const question = questionMap.get(String(response.question));

    if (!question) {
      continue;
    }

    answeredQuestions++;

    if (question.questionType === "MCQ") {
      const isCorrect =
        response.selectedOptionIndex === question.correctOptionIndex;

      const awardedMarks = isCorrect ? Number(question.marks || 0) : 0;

      response.isCorrect = isCorrect;
      response.marksAwarded = awardedMarks;
      response.evaluationStatus = "auto_evaluated";

      response.feedback = isCorrect ? "Correct answer." : "Incorrect answer.";

      if (isCorrect) {
        correctAnswers++;
      } else {
        incorrectAnswers++;
      }

      marksObtained += awardedMarks;
    } else {
      response.isCorrect = null;
      response.marksAwarded = 0;
      response.evaluationStatus = "pending_review";
    }

    await response.save();
  }

  attempt.answeredQuestions = answeredQuestions;
  attempt.correctAnswers = correctAnswers;
  attempt.incorrectAnswers = incorrectAnswers;
  attempt.marksObtained = marksObtained;

  // Count answers that still need teacher evaluation.
  const pendingEvaluation = responses.filter(
    (response) => response.evaluationStatus === "pending_review",
  ).length;

  // Automatically evaluate MCQ-only tests.
  // Written-answer tests remain submitted until teacher evaluation.
  if (finalStatus === "expired") {
    attempt.status = "expired";
  } else {
    attempt.status = pendingEvaluation === 0 ? "evaluated" : "submitted";
  }

  attempt.submittedAt = new Date();

  await attempt.save();
};

// --------------------------------------------------
// Helper: Automatically expire a test when deadline passes
// --------------------------------------------------

const expireAttemptIfNeeded = async (attempt: any): Promise<boolean> => {
  if (attempt.status === "in_progress") {
    if (new Date() >= new Date(attempt.expiresAt)) {
      await finalizeAttempt(attempt, "expired");
      return true;
    }
  }

  return attempt.status === "expired";
};

// --------------------------------------------------
// GET /api/student-timed-tests
// Get available tests according to student board and class
// --------------------------------------------------

export const getAvailableTimedTests = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const studentId = authReq.user?.userId;

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const student = await getStudentProfile(studentId);

    if (!student) {
      res.status(403).json({
        success: false,
        message: "Active student account not found.",
      });
      return;
    }

    if (!student.board || !student.classLevel) {
      res.status(400).json({
        success: false,
        message: "Please complete your board and class profile.",
      });
      return;
    }

    const filter: Record<string, unknown> = {
      board: student.board,
      courseLevel: student.classLevel,
      isActive: true,
    };

    if (req.query.subject) {
      const subjectId = String(req.query.subject);

      if (!mongoose.isValidObjectId(subjectId)) {
        res.status(400).json({
          success: false,
          message: "Invalid subject ID.",
        });
        return;
      }

      filter.subject = subjectId;
    }

    const tests = await TimedTest.find(filter)
      .populate("subject", "name slug")
      .populate("chapters", "title chapterNumber")
      .select("-questions -createdBy")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tests.length,
      data: tests,
    });
  } catch (error) {
    console.error("Get available timed tests error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve available tests.",
    });
  }
};

// --------------------------------------------------
// POST /api/student-timed-tests/:testId/start
// Start a timed test
// --------------------------------------------------

export const startTimedTest = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const studentId = authReq.user?.userId;
    const testId = String(req.params.testId);

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!mongoose.isValidObjectId(testId)) {
      res.status(400).json({
        success: false,
        message: "Invalid timed test ID.",
      });
      return;
    }

    const student = await getStudentProfile(studentId);

    if (!student) {
      res.status(403).json({
        success: false,
        message: "Active student account not found.",
      });
      return;
    }

    const test = await TimedTest.findOne({
      _id: testId,
      board: student.board,
      courseLevel: student.classLevel,
      isActive: true,
    });

    if (!test) {
      res.status(404).json({
        success: false,
        message: "Available timed test not found.",
      });
      return;
    }

    // Prevent multiple simultaneous attempts.
    const existingAttempt = await TestAttempt.findOne({
      student: studentId,
      test: testId,
      status: "in_progress",
    });

    if (existingAttempt) {
      const expired = await expireAttemptIfNeeded(existingAttempt);

      if (!expired) {
        res.status(200).json({
          success: true,
          message: "You already have an active attempt for this test.",
          data: {
            attemptId: existingAttempt._id,
            expiresAt: existingAttempt.expiresAt,
            status: existingAttempt.status,
          },
        });
        return;
      }
    }

    const startedAt = new Date();

    const expiresAt = new Date(
      startedAt.getTime() + test.durationMinutes * 60 * 1000,
    );

    const attempt = await TestAttempt.create({
      student: studentId,
      test: test._id,
      questions: test.questions,
      totalQuestions: test.totalQuestions,
      totalMarks: test.totalMarks,
      startedAt,
      expiresAt,
      status: "in_progress",
    });

    res.status(201).json({
      success: true,
      message: "Timed test started successfully.",
      data: {
        attemptId: attempt._id,
        testTitle: test.title,
        totalQuestions: attempt.totalQuestions,
        totalMarks: attempt.totalMarks,
        durationMinutes: test.durationMinutes,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        status: attempt.status,
      },
    });
  } catch (error) {
    console.error("Start timed test error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to start timed test.",
    });
  }
};

// --------------------------------------------------
// GET /api/student-timed-tests/attempts/:attemptId
// Get questions and saved answers
// --------------------------------------------------

export const getTimedTestAttempt = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const studentId = authReq.user?.userId;
    const attemptId = String(req.params.attemptId);

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!mongoose.isValidObjectId(attemptId)) {
      res.status(400).json({
        success: false,
        message: "Invalid attempt ID.",
      });
      return;
    }

    const attempt = await getOwnedAttempt(attemptId, studentId);

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Test attempt not found.",
      });
      return;
    }

    await expireAttemptIfNeeded(attempt);

    const [test, questions, responses] = await Promise.all([
      TimedTest.findById(attempt.test).select("title description"),

      Question.find({
        _id: { $in: attempt.questions },
      }).select("questionText questionType options difficulty marks"),

      TestResponse.find({
        attempt: attempt._id,
        student: studentId,
      }).select("question selectedOptionIndex responseText submittedAt"),
    ]);

    if (!test) {
      res.status(404).json({
        success: false,
        message: "Associated timed test not found.",
      });
      return;
    }

    const questionMap = new Map(
      questions.map((question) => [String(question._id), question]),
    );

    const responseMap = new Map(
      responses.map((response) => [String(response.question), response]),
    );

    const orderedQuestions = attempt.questions.map(
      (questionId: mongoose.Types.ObjectId) => {
        const question = questionMap.get(String(questionId));
        const response = responseMap.get(String(questionId));

        return {
          question,
          selectedOptionIndex: response?.selectedOptionIndex ?? null,
          responseText: response?.responseText ?? "",
          isAnswered: Boolean(response),
        };
      },
    );

    res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id,
        test,
        status: attempt.status,
        totalQuestions: attempt.totalQuestions,
        totalMarks: attempt.totalMarks,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        questions: orderedQuestions,
      },
    });
  } catch (error) {
    console.error("Get timed test attempt error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve test attempt.",
    });
  }
};

// --------------------------------------------------
// POST /api/student-timed-tests/attempts/:attemptId/answer
// Save or update an answer
// --------------------------------------------------

export const saveTimedTestAnswer = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const studentId = authReq.user?.userId;
    const attemptId = String(req.params.attemptId);

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!mongoose.isValidObjectId(attemptId)) {
      res.status(400).json({
        success: false,
        message: "Invalid attempt ID.",
      });
      return;
    }

    const { questionId, selectedOptionIndex, responseText } = req.body;

    if (
      typeof questionId !== "string" ||
      !mongoose.isValidObjectId(questionId)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid question ID.",
      });
      return;
    }

    const attempt = await getOwnedAttempt(attemptId, studentId);

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Test attempt not found.",
      });
      return;
    }

    const expired = await expireAttemptIfNeeded(attempt);

    if (attempt.status !== "in_progress" || expired) {
      res.status(400).json({
        success: false,
        message: "This test is no longer accepting answers.",
      });
      return;
    }

    if (
      !attempt.questions.some(
        (id: mongoose.Types.ObjectId) => String(id) === questionId,
      )
    ) {
      res.status(400).json({
        success: false,
        message: "Question does not belong to this test attempt.",
      });
      return;
    }

    const question = await Question.findById(questionId);

    if (!question) {
      res.status(404).json({
        success: false,
        message: "Question not found.",
      });
      return;
    }

    let selectedIndex: number | null = null;
    let answerText = "";

    if (question.questionType === "MCQ") {
      if (
        !Number.isInteger(selectedOptionIndex) ||
        selectedOptionIndex < 0 ||
        selectedOptionIndex >= question.options.length
      ) {
        res.status(400).json({
          success: false,
          message: "Select a valid MCQ option.",
        });
        return;
      }

      selectedIndex = selectedOptionIndex;
    } else {
      if (
        typeof responseText !== "string" ||
        responseText.trim().length === 0
      ) {
        res.status(400).json({
          success: false,
          message: "Answer text is required.",
        });
        return;
      }

      if (responseText.length > 10000) {
        res.status(400).json({
          success: false,
          message: "Answer must not exceed 10000 characters.",
        });
        return;
      }

      answerText = responseText.trim();
    }

    const response = await TestResponse.findOneAndUpdate(
      {
        attempt: attempt._id,
        question: questionId,
      },
      {
        $set: {
          student: studentId,
          selectedOptionIndex: selectedIndex,
          responseText: answerText,
          isCorrect: null,
          evaluationStatus: "pending_review",
          marksAwarded: 0,
          feedback: "",
          evaluatedBy: null,
          evaluatedAt: null,
          submittedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    res.status(200).json({
      success: true,
      message: "Answer saved successfully.",
      data: {
        questionId: response.question,
        selectedOptionIndex: response.selectedOptionIndex,
        responseText: response.responseText,
      },
    });
  } catch (error) {
    console.error("Save timed test answer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save answer.",
    });
  }
};

// --------------------------------------------------
// POST /api/student-timed-tests/attempts/:attemptId/submit
// Submit test and evaluate MCQs
// --------------------------------------------------

export const submitTimedTest = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const studentId = authReq.user?.userId;
    const attemptId = String(req.params.attemptId);

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!mongoose.isValidObjectId(attemptId)) {
      res.status(400).json({
        success: false,
        message: "Invalid attempt ID.",
      });
      return;
    }

    const attempt = await getOwnedAttempt(attemptId, studentId);

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Test attempt not found.",
      });
      return;
    }

    if (attempt.status !== "in_progress") {
      res.status(400).json({
        success: false,
        message: "This test has already been submitted or expired.",
      });
      return;
    }

    const isExpired = new Date() >= new Date(attempt.expiresAt);

    await finalizeAttempt(attempt, isExpired ? "expired" : "submitted");

    const responses = await TestResponse.find({
      attempt: attempt._id,
      student: studentId,
    });

    const pendingEvaluation = responses.filter(
      (response) => response.evaluationStatus === "pending_review",
    ).length;

    res.status(200).json({
      success: true,
      message: isExpired
        ? "Test time expired. Saved answers have been submitted."
        : "Timed test submitted successfully.",
      data: {
        attemptId: attempt._id,
        totalQuestions: attempt.totalQuestions,
        answeredQuestions: attempt.answeredQuestions,
        unansweredQuestions: attempt.totalQuestions - attempt.answeredQuestions,
        correctAnswers: attempt.correctAnswers,
        incorrectAnswers: attempt.incorrectAnswers,
        pendingEvaluation,
        marksObtained: attempt.marksObtained,
        totalMarks: attempt.totalMarks,
        status: attempt.status,
      },
    });
  } catch (error) {
    console.error("Submit timed test error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to submit timed test.",
    });
  }
};

// --------------------------------------------------
// GET /api/student-timed-tests/attempts/:attemptId/result
// Get test result
// --------------------------------------------------

export const getTimedTestResult = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const studentId = authReq.user?.userId;
    const attemptId = String(req.params.attemptId);

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!mongoose.isValidObjectId(attemptId)) {
      res.status(400).json({
        success: false,
        message: "Invalid attempt ID.",
      });
      return;
    }

    const attempt = await getOwnedAttempt(attemptId, studentId);

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Test attempt not found.",
      });
      return;
    }

    if (attempt.status === "in_progress") {
      await expireAttemptIfNeeded(attempt);
    }

    if (attempt.status === "in_progress") {
      res.status(400).json({
        success: false,
        message: "Submit the test before viewing the result.",
      });
      return;
    }

    const [test, responses] = await Promise.all([
      TimedTest.findById(attempt.test).select(
        "title subject board courseLevel",
      ),

      TestResponse.find({
        attempt: attempt._id,
        student: studentId,
      })
        .populate("question", "questionText questionType options marks")
        .sort({ createdAt: 1 }),
    ]);

    const pendingEvaluation = responses.filter(
      (response) => response.evaluationStatus === "pending_review",
    ).length;

    res.status(200).json({
      success: true,
      data: {
        attempt,
        test,
        pendingEvaluation,
        responses,
      },
    });
  } catch (error) {
    console.error("Get timed test result error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve test result.",
    });
  }
};

// --------------------------------------------------
// GET /api/student-timed-tests/attempts
// Get student's own test history
// --------------------------------------------------

export const getMyTimedTestAttempts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const studentId = authReq.user?.userId;

    if (!studentId) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const attempts = await TestAttempt.find({
      student: studentId,
    })
      .populate("test", "title description durationMinutes subject")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts,
    });
  } catch (error) {
    console.error("Get timed test history error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve test history.",
    });
  }
};

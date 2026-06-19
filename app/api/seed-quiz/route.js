import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import QuizQuestion from "@/app/models/QuizQuestion";
import { quizData } from "@/app/quiz/seedQuestions";

export async function GET() {
  try {
    await connectDB();

    await QuizQuestion.deleteMany({});

    const allQuestions = [];

    Object.entries(quizData).forEach(([jobType, questions]) => {
      questions.forEach((q) => {
        allQuestions.push({
          jobType,
          type: q.type,
          question: q.question,
          options: q.options || [],
          answer: q.answer,
          marks: 0.5,
        });
      });
    });

    await QuizQuestion.insertMany(allQuestions);

    return NextResponse.json({
      success: true,
      message: "Quiz questions seeded successfully",
      count: allQuestions.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

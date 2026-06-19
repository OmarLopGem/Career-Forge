import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import QuizQuestion from "@/app/models/QuizQuestion";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const jobType = searchParams.get("jobType");

    const filter = jobType ? { jobType } : {};

    const questions = await QuizQuestion.find(filter);

    return NextResponse.json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
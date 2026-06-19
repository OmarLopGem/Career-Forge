import mongoose from "mongoose";

const QuizQuestionSchema = new mongoose.Schema({
  jobType: String,
  type: String,
  question: String,
  options: [String],
  answer: String,
  marks: Number,
});

export default mongoose.models.QuizQuestion ||
  mongoose.model("QuizQuestion", QuizQuestionSchema);
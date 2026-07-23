"use client";

import { useEffect, useState } from "react";
import { requestJson } from "@/lib/job-tracker/client/api.js";

// The quiz page is intentionally self-contained for now: it loads question sets
// by job type, tracks temporary answers in memory, and derives feedback locally.
export default function QuizPage() {
  const jobTypes = [
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "QA Tester",
    "Database Developer",
  ];

  const [jobType, setJobType] = useState(jobTypes[0]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalMarks, setTotalMarks] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [passed, setPassed] = useState(false);
  const [questionResults, setQuestionResults] = useState({});
  const [feedback, setFeedback] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadQuestions() {
      setLoading(true);

      try {
        const res = await fetch(
          `/api/quiz?jobType=${encodeURIComponent(jobType)}`
        );

        const data = await res.json();
        setQuestions(data.questions || []);
      } catch (error) {
        console.error("Failed to load quiz questions:", error);
        setQuestions([]);
      }

      setLoading(false);
    }

    loadQuestions();
  }, [jobType]);

  const handleJobChange = (value) => {
    setJobType(value);
    setAnswers({});
    setScore(null);
    setCorrectCount(0);
    setTotalMarks(0);
    setTotalQuestions(0);
    setPassed(false);
    setQuestionResults({});
    setFeedback("");
    setShowResult(false);
    setError("");
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: value,
    });
  };

  const getDifficulty = (question) => {
    if (question.difficulty) return question.difficulty;
    if (question.type === "short") return "Advanced";
    if (question.type === "blank") return "Intermediate";
    return "Beginner";
  };

  const difficultyStyles = {
    Beginner: "bg-[var(--cyan-soft)] text-[var(--success-green)]",
    Intermediate: "bg-[var(--orange-soft)] text-[var(--forge-orange)]",
    Advanced: "bg-[var(--blue-soft)] text-[var(--brand-blue)]",
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    setError("");

    try {
      const result = await requestJson("/api/quiz/submit", {
        method: "POST",
        body: JSON.stringify({ jobType, answers }),
      });
      setCorrectCount(result.correctCount);
      setTotalQuestions(result.totalQuestions);
      setScore(result.score);
      setTotalMarks(result.totalMarks);
      setPassed(result.passed);
      setFeedback(result.feedback);
      setQuestionResults(
        Object.fromEntries(
          result.questionResults.map((questionResult) => [
            questionResult.questionId,
            questionResult,
          ]),
        ),
      );
      setShowResult(true);

      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }, 100);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit the quiz.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const retakeQuiz = () => {
    setAnswers({});
    setScore(null);
    setCorrectCount(0);
    setTotalMarks(0);
    setTotalQuestions(0);
    setPassed(false);
    setQuestionResults({});
    setFeedback("");
    setShowResult(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-[var(--navy)]">
          AI Interview Quiz
        </h1>

        <p className="mt-2 text-[var(--text-muted)]">
          Select a job type and complete its interview questions. Your result is
          calculated securely and saved to your account. Passing score: 70%.
        </p>

        <div className="mt-6">
          <label className="font-semibold text-[var(--text-main)]">
            Select Job Type
          </label>

          <select
            value={jobType}
            onChange={(e) => handleJobChange(e.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white p-3 text-[var(--text-main)] outline-none focus:border-[var(--brand-blue)]"
          >
            {jobTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 rounded-xl bg-[var(--blue-soft)] p-4 text-[var(--text-main)]">
          <p>
            <strong>Quiz Format:</strong> 10 MCQs, 5 fill in the blanks, and 5
            one-line answers.
          </p>
          <p className="mt-1">
            <strong>Marking:</strong> Each question may have a different mark value.
            Your final score is calculated from the full question set.
          </p>
        </div>

        {loading && (
          <p className="mt-8 text-[var(--text-muted)]">
            Loading quiz questions...
          </p>
        )}

        {!loading && questions.length === 0 && (
          <p className="mt-8 font-semibold text-red-600">
            No questions found for this job type.
          </p>
        )}

        {!loading && questions.length > 0 && (
          <>
            <div className="mt-8 space-y-6">
              {questions.map((q, index) => (
                <div
                  key={q._id}
                  className="rounded-xl border border-[var(--border)] bg-white p-5"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <h2 className="font-semibold text-[var(--navy)]">
                      Q{index + 1}. {q.question}
                    </h2>

                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <span className={`rounded-full px-3 py-1 text-sm font-medium ${difficultyStyles[getDifficulty(q)]}`}>
                        {getDifficulty(q)}
                      </span>
                      <span className="rounded-full bg-[var(--orange-soft)] px-3 py-1 text-sm font-medium text-[var(--forge-orange)]">
                        {q.type === "mcq"
                          ? "MCQ"
                          : q.type === "blank"
                          ? "Blank"
                          : "One Line"}
                      </span>
                    </div>
                  </div>

                  {q.type === "mcq" ? (
                    <div className="space-y-2">
                      {q.options.map((option) => (
                        <label
                          key={option}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--cyan-soft)]"
                        >
                          <input
                            type="radio"
                            name={`${jobType}-question-${q._id}`}
                            value={option}
                            checked={answers[q._id] === option}
                            onChange={(e) =>
                              handleAnswerChange(q._id, e.target.value)
                            }
                          />
                          <span className="text-[var(--text-main)]">
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={answers[q._id] || ""}
                      onChange={(e) =>
                        handleAnswerChange(q._id, e.target.value)
                      }
                      placeholder={
                        q.type === "blank"
                          ? "Fill in the blank..."
                          : "Write one-line answer..."
                      }
                      className="w-full rounded-lg border border-[var(--border)] p-3 text-[var(--text-main)] outline-none focus:border-[var(--brand-blue)]"
                    />
                  )}

                  {showResult && (
                    <div className="mt-4 rounded-lg bg-[var(--cyan-soft)] p-3">
                      {questionResults[q._id]?.correct ? (
                        <p className="font-medium text-[var(--success-green)]">
                          Correct
                        </p>
                      ) : (
                        <p className="font-medium text-[var(--forge-orange)]">
                          Incorrect. Correct answer: {questionResults[q._id]?.correctAnswer ?? q.answer}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!showResult && (
              <button
                onClick={submitQuiz}
                disabled={submitting}
                className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                {submitting ? "Calculating..." : "Submit Quiz"}
              </button>
            )}
          </>
        )}

        {error && (
          <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 font-medium text-red-600">
            {error}
          </p>
        )}

        {showResult && (
          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--cyan-soft)] p-6">
            <h2 className="text-2xl font-bold text-[var(--navy)]">
              Quiz Result
            </h2>

            <p className="mt-3 text-xl font-semibold text-[var(--text-main)]">
              Correct Answers: {correctCount}/{totalQuestions}
            </p>

            <p className="mt-1 text-xl font-semibold text-[var(--text-main)]">
              Score: {score}/{totalMarks}
            </p>

            {!passed ? (
              <p className="mt-2 font-semibold text-[var(--forge-orange)]">
                Score below 70%. You can retake this quiz today.
              </p>
            ) : (
              <p className="mt-2 font-semibold text-[var(--success-green)]">
                Great job. You passed this quiz.
              </p>
            )}

            <p className="mt-4 text-[var(--text-muted)]">{feedback}</p>

            {!passed && (
              <button
                onClick={retakeQuiz}
                className="mt-5 rounded-xl px-6 py-3 font-medium text-white"
                style={{ backgroundColor: "#dc2626" }}
              >
                Retake Quiz
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

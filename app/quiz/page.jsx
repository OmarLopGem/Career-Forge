"use client";

import { useEffect, useState } from "react";

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
  const [feedback, setFeedback] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);

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
    setFeedback("");
    setShowResult(false);
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers({
      ...answers,
      [questionId]: value,
    });
  };

  const normalize = (text) => {
    return text.toString().trim().toLowerCase();
  };

  const isAnswerCorrect = (question, userAnswer) => {
    if (!userAnswer) return false;

    const correctAnswer = normalize(question.answer);
    const givenAnswer = normalize(userAnswer);

    if (question.type === "short") {
      return givenAnswer.includes(correctAnswer);
    }

    return givenAnswer === correctAnswer;
  };

  const getAIFeedback = (finalScore, selectedJob) => {
    if (finalScore < 5) {
      return `AI Feedback: You need more practice for the ${selectedJob} role. Review the basic concepts first, then retake the quiz.`;
    }

    if (finalScore < 7) {
      return `AI Feedback: You are close to passing for the ${selectedJob} role. Focus on the questions you missed and retake the quiz today.`;
    }

    return `AI Feedback: Strong performance for the ${selectedJob} role. You showed good interview readiness. Keep practicing advanced questions.`;
  };

  const submitQuiz = () => {
    let totalCorrect = 0;

    questions.forEach((q) => {
      const userAnswer = answers[q._id];

      if (isAnswerCorrect(q, userAnswer)) {
        totalCorrect++;
      }
    });

    const finalScore = totalCorrect * 0.5;

    setCorrectCount(totalCorrect);
    setScore(finalScore);
    setFeedback(getAIFeedback(finalScore, jobType));
    setShowResult(true);

    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  const retakeQuiz = () => {
    setAnswers({});
    setScore(null);
    setCorrectCount(0);
    setFeedback("");
    setShowResult(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-[var(--navy)]">
          AI Interview Quiz
        </h1>

        <p className="mt-2 text-[var(--text-muted)]">
          Select a job type and complete 20 interview questions. Total marks:
          10. Passing score: 7/10.
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
            <strong>Marking:</strong> 20 questions × 0.5 marks = 10 marks.
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

                    <span className="shrink-0 rounded-full bg-[var(--orange-soft)] px-3 py-1 text-sm font-medium text-[var(--forge-ornage)]">
                      {q.type === "mcq"
                        ? "MCQ"
                        : q.type === "blank"
                        ? "Blank"
                        : "One Line"}
                    </span>
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
                      {isAnswerCorrect(q, answers[q._id]) ? (
                        <p className="font-medium text-[var(--success-green)]">
                          Correct
                        </p>
                      ) : (
                        <p className="font-medium text-[var(--forge-ornage)]">
                          Incorrect. Correct answer: {q.answer}
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
                className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
              >
                Submit Quiz
              </button>
            )}
          </>
        )}

        {showResult && (
          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--cyan-soft)] p-6">
            <h2 className="text-2xl font-bold text-[var(--navy)]">
              Quiz Result
            </h2>

            <p className="mt-3 text-xl font-semibold text-[var(--text-main)]">
              Correct Answers: {correctCount}/20
            </p>

            <p className="mt-1 text-xl font-semibold text-[var(--text-main)]">
              Score: {score}/10
            </p>

            {score < 7 ? (
              <p className="mt-2 font-semibold text-[var(--forge-ornage)]">
                Score below 7. You can retake this quiz today.
              </p>
            ) : (
              <p className="mt-2 font-semibold text-[var(--success-green)]">
                Great job. You passed this quiz.
              </p>
            )}

            <p className="mt-4 text-[var(--text-muted)]">{feedback}</p>

            {score < 7 && (
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
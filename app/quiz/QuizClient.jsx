'use client'

import { useEffect, useState, useTransition } from 'react'
import { requestJson } from '@/lib/job-tracker/client/api.js'

const jobTypes = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'QA Tester',
  'Database Developer',
]

function normalize(text) {
  return text.toString().trim().toLowerCase()
}

function isAnswerCorrect(question, userAnswer) {
  if (!userAnswer) return false

  const correctAnswer = normalize(question.answer)
  const givenAnswer = normalize(userAnswer)

  if (question.type === 'short') {
    return givenAnswer.includes(correctAnswer)
  }

  return givenAnswer === correctAnswer
}

function getAIFeedback(finalScore, selectedJob) {
  if (finalScore < 5) {
    return `AI Feedback: You need more practice for the ${selectedJob} role. Review the basic concepts first, then retake the quiz.`
  }

  if (finalScore < 7) {
    return `AI Feedback: You are close to passing for the ${selectedJob} role. Focus on the questions you missed and retake the quiz today.`
  }

  return `AI Feedback: Strong performance for the ${selectedJob} role. You showed good interview readiness. Keep practicing advanced questions.`
}

export default function QuizClient() {
  const [jobType, setJobType] = useState(jobTypes[0])
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [score, setScore] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveMessage, setSaveMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function loadQuestions() {
      setLoading(true)

      try {
        const data = await requestJson(`/api/quiz?jobType=${encodeURIComponent(jobType)}`)
        setQuestions(data.questions || [])
      } catch (error) {
        console.error('Failed to load quiz questions:', error)
        setQuestions([])
      }

      setLoading(false)
    }

    loadQuestions()
  }, [jobType])

  const handleJobChange = (value) => {
    setJobType(value)
    setAnswers({})
    setScore(null)
    setCorrectCount(0)
    setFeedback('')
    setShowResult(false)
    setSaveMessage('')
  }

  const handleAnswerChange = (questionId, value) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }))
  }

  const submitQuiz = () => {
    let totalCorrect = 0

    questions.forEach((question) => {
      if (isAnswerCorrect(question, answers[question._id])) {
        totalCorrect += 1
      }
    })

    const finalScore = totalCorrect * 0.5
    const nextFeedback = getAIFeedback(finalScore, jobType)

    setCorrectCount(totalCorrect)
    setScore(finalScore)
    setFeedback(nextFeedback)
    setShowResult(true)
    setSaveMessage('')

    startTransition(async () => {
      try {
        await requestJson('/api/quiz/results', {
          method: 'POST',
          body: JSON.stringify({
            jobType,
            score: finalScore,
            correctCount: totalCorrect,
            totalQuestions: questions.length,
            feedback: nextFeedback,
          }),
        })
        setSaveMessage('Result saved to your private progress history.')
      } catch (error) {
        setSaveMessage(error instanceof Error ? error.message : 'Unable to save this quiz result.')
      }
    })

    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }, 100)
  }

  const retakeQuiz = () => {
    setAnswers({})
    setScore(null)
    setCorrectCount(0)
    setFeedback('')
    setShowResult(false)
    setSaveMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-navy">AI Interview Quiz</h1>

        <p className="mt-2 text-text-muted">
          Select a job type and complete 20 interview questions. Total marks: 10. Passing score: 7/10.
        </p>

        <div className="mt-6">
          <label className="font-semibold text-text-main">Select Job Type</label>

          <select
            value={jobType}
            onChange={(event) => handleJobChange(event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-white p-3 text-text-main outline-none focus:border-brand-blue"
          >
            {jobTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 rounded-xl bg-blue-soft p-4 text-text-main">
          <p>
            <strong>Quiz Format:</strong> 10 MCQs, 5 fill in the blanks, and 5 one-line answers.
          </p>
          <p className="mt-1">
            <strong>Marking:</strong> 20 questions x 0.5 marks = 10 marks.
          </p>
        </div>

        {loading ? <p className="mt-8 text-text-muted">Loading quiz questions...</p> : null}

        {!loading && questions.length === 0 ? (
          <p className="mt-8 font-semibold text-red-600">No questions found for this job type.</p>
        ) : null}

        {!loading && questions.length > 0 ? (
          <>
            <div className="mt-8 space-y-6">
              {questions.map((question, index) => (
                <div
                  key={question._id}
                  className="rounded-xl border border-border bg-white p-5"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <h2 className="font-semibold text-navy">
                      Q{index + 1}. {question.question}
                    </h2>

                    <span className="shrink-0 rounded-full bg-orange-soft px-3 py-1 text-sm font-medium text-forge-orange">
                      {question.type === 'mcq'
                        ? 'MCQ'
                        : question.type === 'blank'
                          ? 'Blank'
                          : 'One Line'}
                    </span>
                  </div>

                  {question.type === 'mcq' ? (
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <label
                          key={option}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-cyan-soft"
                        >
                          <input
                            type="radio"
                            name={`${jobType}-question-${question._id}`}
                            value={option}
                            checked={answers[question._id] === option}
                            onChange={(event) => handleAnswerChange(question._id, event.target.value)}
                          />
                          <span className="text-text-main">{option}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={answers[question._id] || ''}
                      onChange={(event) => handleAnswerChange(question._id, event.target.value)}
                      placeholder={question.type === 'blank' ? 'Fill in the blank...' : 'Write one-line answer...'}
                      className="w-full rounded-lg border border-border p-3 text-text-main outline-none focus:border-brand-blue"
                    />
                  )}

                  {showResult ? (
                    <div className="mt-4 rounded-lg bg-cyan-soft p-3">
                      {isAnswerCorrect(question, answers[question._id]) ? (
                        <p className="font-medium text-success-green">Correct</p>
                      ) : (
                        <p className="font-medium text-forge-orange">
                          Incorrect. Correct answer: {question.answer}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {!showResult ? (
              <button
                type="button"
                onClick={submitQuiz}
                className="mt-8 rounded-xl bg-brand-blue px-6 py-3 font-medium text-white hover:bg-brand-blue-hover"
              >
                Submit Quiz
              </button>
            ) : null}
          </>
        ) : null}

        {showResult ? (
          <div className="mt-8 rounded-2xl border border-border bg-cyan-soft p-6">
            <h2 className="text-2xl font-bold text-navy">Quiz Result</h2>

            <p className="mt-3 text-xl font-semibold text-text-main">Correct Answers: {correctCount}/{questions.length}</p>
            <p className="mt-1 text-xl font-semibold text-text-main">Score: {score}/10</p>

            {score < 7 ? (
              <p className="mt-2 font-semibold text-forge-orange">Score below 7. You can retake this quiz today.</p>
            ) : (
              <p className="mt-2 font-semibold text-success-green">Great job. You passed this quiz.</p>
            )}

            <p className="mt-4 text-text-muted">{feedback}</p>
            <p className="mt-4 text-sm font-medium text-brand-blue">
              {isPending ? 'Saving result...' : saveMessage}
            </p>

            {score < 7 ? (
              <button
                type="button"
                onClick={retakeQuiz}
                className="mt-5 rounded-xl bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700"
              >
                Retake Quiz
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  )
}

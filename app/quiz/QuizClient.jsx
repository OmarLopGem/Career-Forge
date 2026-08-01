'use client'

import { useEffect, useState } from 'react'
import { requestJson } from '@/lib/job-tracker/client/api.js'
import StreakBadge from './components/StreakBadge.jsx'

const jobTypes = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'QA Tester',
  'Database Developer',
]

export default function QuizClient() {
  const [jobType, setJobType] = useState(jobTypes[0])
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [score, setScore] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalMarks, setTotalMarks] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [passed, setPassed] = useState(false)
  const [difficulty, setDifficulty] = useState('Beginner')
  const [nextDifficulty, setNextDifficulty] = useState('Beginner')
  const [questionResults, setQuestionResults] = useState({})
  const [feedback, setFeedback] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [quizVersion, setQuizVersion] = useState(0)

  useEffect(() => {
    async function loadQuestions() {
      setLoading(true)
      setError('')

      try {
        const data = await requestJson(`/api/quiz?jobType=${encodeURIComponent(jobType)}`)
        setQuestions(data.questions || [])
        setDifficulty(data.difficulty || 'Beginner')
        setNextDifficulty(data.difficulty || 'Beginner')
      } catch (loadError) {
        console.error('Failed to load quiz questions:', loadError)
        setQuestions([])
        setError(loadError instanceof Error ? loadError.message : 'Unable to load quiz questions.')
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [jobType, quizVersion])

  const handleJobChange = (value) => {
    setJobType(value)
    setAnswers({})
    setScore(null)
    setCorrectCount(0)
    setTotalMarks(0)
    setTotalQuestions(0)
    setPassed(false)
    setDifficulty('Beginner')
    setNextDifficulty('Beginner')
    setQuestionResults({})
    setFeedback('')
    setShowResult(false)
    setError('')
  }

  const handleAnswerChange = (questionId, value) => {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }))
  }

  const submitQuiz = async () => {
    setSubmitting(true)
    setError('')

    try {
      const result = await requestJson('/api/quiz/submit', {
        method: 'POST',
        body: JSON.stringify({ jobType, difficulty, answers }),
      })
      setCorrectCount(result.correctCount)
      setTotalQuestions(result.totalQuestions)
      setScore(result.score)
      setTotalMarks(result.totalMarks)
      setPassed(result.passed)
      setDifficulty(result.difficulty)
      setNextDifficulty(result.nextDifficulty)
      setFeedback(result.feedback)
      setQuestionResults(
        Object.fromEntries(
          result.questionResults.map((questionResult) => [
            questionResult.questionId,
            questionResult,
          ]),
        ),
      )
      setShowResult(true)

      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
      }, 100)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to submit the quiz.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const retakeQuiz = () => {
    setAnswers({})
    setScore(null)
    setCorrectCount(0)
    setTotalMarks(0)
    setTotalQuestions(0)
    setPassed(false)
    setQuestionResults({})
    setFeedback('')
    setShowResult(false)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startNextQuiz = () => {
    setAnswers({})
    setScore(null)
    setCorrectCount(0)
    setTotalMarks(0)
    setTotalQuestions(0)
    setPassed(false)
    setQuestionResults({})
    setFeedback('')
    setShowResult(false)
    setError('')
    setQuizVersion((current) => current + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getDifficulty = (question) => {
    return question.difficulty || difficulty
  }

  const difficultyStyles = {
    Beginner: 'bg-cyan-soft text-success-green',
    Intermediate: 'bg-orange-soft text-forge-orange',
    Advanced: 'bg-blue-soft text-brand-blue',
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-navy">AI Interview Quiz</h1>
            <p className="mt-2 max-w-2xl text-text-muted">
              Select a job type and complete its interview questions. Your result is
              calculated securely and saved to your account. Passing score: 70%.
            </p>
            <span className="mt-4 inline-flex rounded-full bg-blue-soft px-4 py-2 text-sm font-semibold text-brand-blue">
              Current level: {difficulty}
            </span>
          </div>
          <StreakBadge className="min-w-[220px]" />
        </div>

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
            <strong>Quiz Format:</strong> 10 {difficulty} questions using multiple choice and fill in the blanks.
          </p>
          <p className="mt-1">
            <strong>Progression:</strong> Pass with 70% to unlock the next level. One-line answers are not included.
          </p>
        </div>

        {loading ? <p className="mt-8 text-text-muted">Loading quiz questions...</p> : null}

        {!loading && questions.length === 0 ? (
          <p className="mt-8 font-semibold text-red-600">
            No {difficulty.toLowerCase()} questions found for this job type.
          </p>
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

                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${difficultyStyles[getDifficulty(question)]}`}
                      >
                        {getDifficulty(question)}
                      </span>
                      <span className="rounded-full bg-orange-soft px-3 py-1 text-sm font-medium text-forge-orange">
                        {question.type === 'mcq'
                          ? 'MCQ'
                          : 'Blank'}
                      </span>
                    </div>
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
                      placeholder="Fill in the blank..."
                      className="w-full rounded-lg border border-border p-3 text-text-main outline-none focus:border-brand-blue"
                    />
                  )}

                  {showResult ? (
                    <div className="mt-4 rounded-lg bg-cyan-soft p-3">
                      {questionResults[question._id]?.correct ? (
                        <p className="font-medium text-success-green">Correct</p>
                      ) : (
                        <p className="font-medium text-forge-orange">
                          Incorrect. Correct answer:{' '}
                          {questionResults[question._id]?.correctAnswer}
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
                disabled={submitting}
                className="mt-8 rounded-xl bg-brand-blue px-6 py-3 font-medium text-white hover:bg-brand-blue-hover"
              >
                {submitting ? 'Calculating...' : 'Submit Quiz'}
              </button>
            ) : null}
          </>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 font-medium text-red-600">
            {error}
          </p>
        ) : null}

        {showResult ? (
          <div className="mt-8 rounded-2xl border border-border bg-cyan-soft p-6">
            <h2 className="text-2xl font-bold text-navy">Quiz Result</h2>

            <p className="mt-3 text-xl font-semibold text-text-main">Correct Answers: {correctCount}/{totalQuestions}</p>
            <p className="mt-1 text-xl font-semibold text-text-main">Score: {score}/{totalMarks}</p>

            {!passed ? (
              <p className="mt-2 font-semibold text-forge-orange">Score below 70%. You can retake this quiz today.</p>
            ) : (
              <p className="mt-2 font-semibold text-success-green">
                {nextDifficulty === difficulty
                  ? `Great job. You completed the ${difficulty} level.`
                  : `Great job. You passed ${difficulty} and unlocked ${nextDifficulty}.`}
              </p>
            )}

            <p className="mt-4 text-text-muted">{feedback}</p>

            {!passed ? (
              <button
                type="button"
                onClick={retakeQuiz}
                className="mt-5 rounded-xl bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700"
              >
                Retake Quiz
              </button>
            ) : (
              <button
                type="button"
                onClick={startNextQuiz}
                className="mt-5 rounded-xl bg-brand-blue px-6 py-3 font-medium text-white hover:bg-brand-blue-hover"
              >
                {nextDifficulty === difficulty
                  ? `Practice ${difficulty} Again`
                  : `Start ${nextDifficulty} Quiz`}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </main>
  )
}

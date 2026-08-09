'use client'

import { useEffect, useState } from 'react'
import { requestJson } from '@/lib/job-tracker/client/api.js'
import { JOB_ROLE_CATEGORIES } from '@/lib/quiz/job-role-catalog.js'
import StreakBadge from './components/StreakBadge.jsx'

const defaultJobType = JOB_ROLE_CATEGORIES[0].roles[0]

export default function QuizClient() {
  const [jobType, setJobType] = useState(defaultJobType)
  const [attemptId, setAttemptId] = useState('')
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
  const [gradingMode, setGradingMode] = useState('')
  const [aiWarning, setAIWarning] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let isCurrentRequest = true

    async function loadQuestions() {
      setLoading(true)
      setError('')

      try {
        const forceNew = quizVersion > 0 ? '&new=1' : ''
        const data = await requestJson(
          `/api/quiz?jobType=${encodeURIComponent(jobType)}${forceNew}`,
          { signal: controller.signal },
        )
        if (!isCurrentRequest) return

        setQuestions(data.questions || [])
        setAttemptId(data.attemptId || '')
        setDifficulty(data.difficulty || 'Beginner')
        setNextDifficulty(data.difficulty || 'Beginner')
        setAIWarning(data.aiWarning || '')
      } catch (loadError) {
        if (!isCurrentRequest || loadError?.name === 'AbortError') return
        setQuestions([])
        setError(loadError instanceof Error ? loadError.message : 'Unable to load quiz questions.')
      } finally {
        if (isCurrentRequest) setLoading(false)
      }
    }

    loadQuestions()
    return () => {
      isCurrentRequest = false
      controller.abort()
    }
  }, [jobType, quizVersion])

  const handleJobChange = (value) => {
    setJobType(value)
    setAttemptId('')
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
    setGradingMode('')
    setAIWarning('')
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
        body: JSON.stringify({ attemptId, jobType, difficulty, answers }),
      })
      setCorrectCount(result.correctCount)
      setTotalQuestions(result.totalQuestions)
      setScore(result.score)
      setTotalMarks(result.totalMarks)
      setPassed(result.passed)
      setDifficulty(result.difficulty)
      setNextDifficulty(result.nextDifficulty)
      setFeedback(result.feedback)
      setGradingMode(result.gradingMode || 'answer-key')
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
    setGradingMode('')
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
    setAttemptId('')
    setGradingMode('')
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
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h1 className="text-3xl font-bold text-navy sm:text-4xl">AI Interview Quiz</h1>
            <p className="mt-2 max-w-2xl text-text-muted">
              Choose a job role and complete a secure interview-practice quiz. Beginner
              questions can be generated directly by AI and are saved to the shared
              question bank. Passing score: 70%.
            </p>
            <span className="mt-4 inline-flex rounded-full bg-blue-soft px-4 py-2 text-sm font-semibold text-brand-blue">
              Current level: {difficulty}
            </span>
          </div>
          <StreakBadge className="min-w-[220px]" />
        </div>

        <div className="mt-6">
          <label htmlFor="quiz-job-type" className="font-semibold text-text-main">Select Job Type</label>

          <select
            id="quiz-job-type"
            value={jobType}
            onChange={(event) => handleJobChange(event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-white p-3 text-text-main outline-none focus:border-brand-blue"
          >
            {JOB_ROLE_CATEGORIES.map(({ category, roles }) => (
              <optgroup key={category} label={category}>
                {roles.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="mt-6 rounded-xl bg-blue-soft p-4 text-text-main">
          <p>
            <strong>Quiz Format:</strong> 10 {difficulty} questions using multiple choice and fill in the blanks.
          </p>
          <p className="mt-1">
            <strong>Progression:</strong> Pass with 70% to unlock the next seeded level.
          </p>
        </div>

        {loading ? <p className="mt-8 text-text-muted" role="status">Preparing your quiz questions...</p> : null}

        {aiWarning ? (
          <p className="mt-4 rounded-xl bg-orange-soft px-4 py-3 text-sm font-medium text-forge-orange" role="status">
            AI generation was unavailable, so a stored quiz was loaded. {aiWarning}
          </p>
        ) : null}

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
                  <div className="mb-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
                    <h2 className="font-semibold text-navy">
                      Q{index + 1}. {question.question}
                    </h2>

                    <div className="flex shrink-0 flex-wrap justify-start gap-2 sm:justify-end">
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
                      {questionResults[question._id]?.feedback ? (
                        <p className="mt-1 text-sm text-text-muted">
                          {questionResults[question._id].feedback}
                        </p>
                      ) : null}
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
                className="mt-8 w-full rounded-xl bg-brand-blue px-6 py-3 font-medium text-white hover:bg-brand-blue-hover sm:w-auto"
              >
                {submitting ? 'Checking answers...' : 'Submit Quiz'}
              </button>
            ) : null}
          </>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 font-medium text-red-600" role="alert">
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
            <p className="mt-2 text-sm font-medium text-text-muted">
              {gradingMode === 'ai-assisted'
                ? 'AI-assisted grading was used for this Beginner attempt.'
                : gradingMode === 'answer-key-fallback'
                  ? 'The secure answer-key fallback was used because AI grading was unavailable.'
                  : 'This level was graded with the secure answer key.'}
            </p>

            {!passed ? (
              <button
                type="button"
                onClick={retakeQuiz}
                className="mt-5 w-full rounded-xl bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700 sm:w-auto"
              >
                Retake Quiz
              </button>
            ) : (
              <button
                type="button"
                onClick={startNextQuiz}
                className="mt-5 w-full rounded-xl bg-brand-blue px-6 py-3 font-medium text-white hover:bg-brand-blue-hover sm:w-auto"
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

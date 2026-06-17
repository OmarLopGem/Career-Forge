'use client'

import { useMemo, useState } from 'react'

const today = new Date()
const demoMonth = new Date(2026, 5, 1)
const demoSelectedDate = '2026-06-15'

const initialJobs = [
  {
    id: 'job_001',
    externalId: 'adzuna_001',
    source: 'Adzuna',

    title: 'Frontend Developer',
    company: 'Shopify',
    location: 'Toronto, ON',

    description: 'We are looking for a frontend developer with React experience.',
    salaryMin: 65000,
    salaryMax: 85000,

    url: 'https://example.com/job',

    requiredSkills: ['React', 'JavaScript', 'CSS'],
    category: 'Web Development',

    createdAt: '2026-06-10T14:30:00Z',
    updatedAt: '2026-06-10T14:30:00Z',
  },
  {
    id: 'job_002',
    externalId: 'adzuna_002',
    source: 'Adzuna',

    title: 'Junior Web Developer',
    company: 'RBC',
    location: 'Remote',

    description: 'Junior web developer role focused on modern frontend development.',
    salaryMin: 55000,
    salaryMax: 72000,

    url: 'https://example.com/job-2',

    requiredSkills: ['HTML', 'CSS', 'JavaScript'],
    category: 'Web Development',

    createdAt: '2026-06-08T14:30:00Z',
    updatedAt: '2026-06-08T14:30:00Z',
  },
  {
    id: 'job_003',
    externalId: 'adzuna_003',
    source: 'Adzuna',

    title: 'React Developer',
    company: 'Old Tech Inc.',
    location: 'Waterloo, ON',

    description: 'React developer role for a small software company.',
    salaryMin: 60000,
    salaryMax: 78000,

    url: 'https://example.com/job-3',

    requiredSkills: ['React', 'TypeScript', 'Git'],
    category: 'Web Development',

    createdAt: '2026-04-20T14:30:00Z',
    updatedAt: '2026-04-20T14:30:00Z',
  },
]

const initialJobApplications = [
  {
    id: 'application_001',
    userId: 'user_001',
    jobId: 'job_001',

    jobSnapshot: {
      title: 'Frontend Developer',
      company: 'Shopify',
      location: 'Toronto, ON',
      url: 'https://example.com/job',
      source: 'Adzuna',
    },

    status: 'interview',
    previousStatus: null,

    appliedAt: '2026-06-10',
    lastActivityAt: '2026-06-12',
    promisedResponseDate: '2026-06-20',

    notes: 'Applied with adapted profile description.',
    adaptedDescription: 'Frontend developer with React experience and strong UI skills.',

    isArchived: false,
    archivedAt: null,
    archivedReason: null,

    isDeleted: false,
    deletedAt: null,

    createdAt: '2026-06-10T14:30:00Z',
    updatedAt: '2026-06-12T10:00:00Z',
  },
  {
    id: 'application_002',
    userId: 'user_001',
    jobId: 'job_002',

    jobSnapshot: {
      title: 'Junior Web Developer',
      company: 'RBC',
      location: 'Remote',
      url: 'https://example.com/job-2',
      source: 'Adzuna',
    },

    status: 'waiting_response',
    previousStatus: null,

    appliedAt: '2026-06-08',
    lastActivityAt: '2026-06-08',
    promisedResponseDate: '2026-06-18',

    notes: 'Waiting for recruiter response.',
    adaptedDescription: 'Junior web developer focused on frontend and responsive UI.',

    isArchived: false,
    archivedAt: null,
    archivedReason: null,

    isDeleted: false,
    deletedAt: null,

    createdAt: '2026-06-08T14:30:00Z',
    updatedAt: '2026-06-08T14:30:00Z',
  },
  {
    id: 'application_003',
    userId: 'user_001',
    jobId: 'job_003',

    jobSnapshot: {
      title: 'React Developer',
      company: 'Old Tech Inc.',
      location: 'Waterloo, ON',
      url: 'https://example.com/job-3',
      source: 'Adzuna',
    },

    status: 'waiting_response',
    previousStatus: null,

    appliedAt: '2026-04-20',
    lastActivityAt: '2026-04-22',
    promisedResponseDate: '2026-05-01',

    notes: 'No response after follow-up.',
    adaptedDescription: 'React developer with TypeScript and Git experience.',

    isArchived: false,
    archivedAt: null,
    archivedReason: null,

    isDeleted: false,
    deletedAt: null,

    createdAt: '2026-04-20T14:30:00Z',
    updatedAt: '2026-04-22T14:30:00Z',
  },
]

const initialCalendarEvents = [
  {
    id: 'event_001',
    userId: 'user_001',
    jobApplicationId: 'application_001',

    title: 'Frontend Developer Interview',
    type: 'interview',

    startDate: '2026-06-15',
    startTime: '10:30',
    endTime: '11:30',

    status: 'scheduled',

    notes: 'Technical interview with hiring manager.',
    reminderEnabled: true,

    createdAt: '2026-06-10T15:00:00Z',
    updatedAt: '2026-06-10T15:00:00Z',
  },
  {
    id: 'event_002',
    userId: 'user_001',
    jobApplicationId: 'application_001',

    title: 'Promised Response Date',
    type: 'promised_response',

    startDate: '2026-06-20',
    startTime: '09:00',
    endTime: '09:15',

    status: 'scheduled',

    notes: 'Company said they would respond by this date.',
    reminderEnabled: true,

    createdAt: '2026-06-10T15:00:00Z',
    updatedAt: '2026-06-10T15:00:00Z',
  },
  {
    id: 'event_003',
    userId: 'user_001',
    jobApplicationId: 'application_002',

    title: 'Follow up with recruiter',
    type: 'follow_up',

    startDate: '2026-06-18',
    startTime: '12:00',
    endTime: '12:15',

    status: 'scheduled',

    notes: 'Send follow-up email if no response.',
    reminderEnabled: true,

    createdAt: '2026-06-08T15:00:00Z',
    updatedAt: '2026-06-08T15:00:00Z',
  },
]

const jobStatusStyles = {
  saved: 'bg-blue-soft text-brand-blue',
  applied: 'bg-blue-soft text-brand-blue',
  interview: 'bg-cyan-soft text-success-green',
  waiting_response: 'bg-orange-soft text-forge-orange',
  offer: 'bg-cyan-soft text-success-green',
  rejected: 'bg-orange-soft text-forge-orange',
  archived: 'bg-border text-text-muted',
}

const eventTypeStyles = {
  interview: 'bg-cyan-soft text-success-green',
  deadline: 'bg-orange-soft text-forge-orange',
  follow_up: 'bg-blue-soft text-brand-blue',
  promised_response: 'bg-orange-soft text-forge-orange',
  reminder: 'bg-blue-soft text-brand-blue',
}

const eventTypeLabels = {
  interview: 'Interview',
  deadline: 'Deadline',
  follow_up: 'Follow Up',
  promised_response: 'Response Date',
  reminder: 'Reminder',
}

const jobStatusLabels = {
  saved: 'Saved',
  applied: 'Applied',
  interview: 'Interview',
  waiting_response: 'Waiting Response',
  offer: 'Offer',
  rejected: 'Rejected',
  archived: 'Archived',
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)

  return new Date(year, month - 1, day)
}

function getDaysDifference(startDate, endDate) {
  const start = parseLocalDate(startDate)
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())

  const diffInMs = end - start

  return diffInMs / (1000 * 60 * 60 * 24)
}

function autoArchiveApplications(applications) {
  const archiveableStatuses = ['saved', 'applied', 'interview', 'waiting_response']

  return applications.map((application) => {
    const daysWithoutUpdate = getDaysDifference(application.lastActivityAt, today)

    if (
      daysWithoutUpdate >= 30 &&
      !application.isArchived &&
      !application.isDeleted &&
      archiveableStatuses.includes(application.status)
    ) {
      return {
        ...application,
        previousStatus: application.status,
        status: 'archived',
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archivedReason: 'No updates after 30 days',
        updatedAt: new Date().toISOString(),
      }
    }

    return application
  })
}

function getMonthDays(currentDate) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  const firstDayIndex = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const days = []

  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day))
  }

  while (days.length % 7 !== 0) {
    days.push(null)
  }

  return days
}

function formatMonthTitle(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(demoMonth)
  const [selectedDate, setSelectedDate] = useState(demoSelectedDate)
  const [jobApplications, setJobApplications] = useState(() =>
    autoArchiveApplications(initialJobApplications)
  )
  const [calendarEvents, setCalendarEvents] = useState(initialCalendarEvents)
  const [activeView, setActiveView] = useState('active')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [eventForm, setEventForm] = useState({
    jobApplicationId: 'application_001',
    title: '',
    type: 'interview',
    startDate: demoSelectedDate,
    startTime: '09:00',
    endTime: '10:00',
    notes: '',
  })

  const monthDays = useMemo(() => getMonthDays(currentMonth), [currentMonth])

  const visibleApplications = useMemo(() => {
    return jobApplications.filter((application) => {
      if (application.isDeleted) return false

      if (activeView === 'archived') {
        return application.isArchived
      }

      return !application.isArchived
    })
  }, [jobApplications, activeView])

  const visibleApplicationIds = useMemo(() => {
    return visibleApplications.map((application) => application.id)
  }, [visibleApplications])

  const visibleEvents = useMemo(() => {
    return calendarEvents.filter((event) =>
      visibleApplicationIds.includes(event.jobApplicationId)
    )
  }, [calendarEvents, visibleApplicationIds])

  const selectedDateEvents = visibleEvents.filter(
    (event) => event.startDate === selectedDate
  )

  const activeApplicationsCount = jobApplications.filter(
    (application) => !application.isArchived && !application.isDeleted
  ).length

  const archivedApplicationsCount = jobApplications.filter(
    (application) => application.isArchived && !application.isDeleted
  ).length

  const getApplicationById = (applicationId) => {
    return jobApplications.find((application) => application.id === applicationId)
  }

  const getJobById = (jobId) => {
    return initialJobs.find((job) => job.id === jobId)
  }

  const getJobInfoFromApplication = (application) => {
    if (!application) return null

    const originalJob = getJobById(application.jobId)

    return originalJob || application.jobSnapshot
  }

  const getJobInfoFromEvent = (event) => {
    const application = getApplicationById(event.jobApplicationId)
    const jobInfo = getJobInfoFromApplication(application)

    return {
      application,
      jobInfo,
    }
  }

  const getEventsForDate = (date) => {
    if (!date) return []

    const dateString = formatDate(date)

    return visibleEvents.filter((event) => event.startDate === dateString)
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    )
  }

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    )
  }

  const goToToday = () => {
    setCurrentMonth(today)
    setSelectedDate(formatDate(today))
  }

  const openAddEventModal = () => {
    const firstActiveApplication = jobApplications.find(
      (application) => !application.isArchived && !application.isDeleted
    )

    setEventForm({
      jobApplicationId: firstActiveApplication?.id || '',
      title: '',
      type: 'interview',
      startDate: selectedDate,
      startTime: '09:00',
      endTime: '10:00',
      notes: '',
    })

    setIsModalOpen(true)
  }

  const handleAddEvent = (event) => {
    event.preventDefault()

    if (!eventForm.jobApplicationId || !eventForm.startDate) return

    const relatedApplication = getApplicationById(eventForm.jobApplicationId)
    const jobInfo = getJobInfoFromApplication(relatedApplication)

    const fallbackTitle = jobInfo ? `${eventTypeLabels[eventForm.type]} - ${jobInfo.company}` : eventTypeLabels[eventForm.type]

    const newEvent = {
      id: `event_${Date.now()}`,
      userId: 'user_001',
      jobApplicationId: eventForm.jobApplicationId,
      title: eventForm.title || fallbackTitle,
      type: eventForm.type,
      startDate: eventForm.startDate,
      startTime: eventForm.startTime,
      endTime: eventForm.endTime,
      status: 'scheduled',
      notes: eventForm.notes,
      reminderEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setCalendarEvents((currentEvents) => [...currentEvents, newEvent])

    setJobApplications((currentApplications) =>
      currentApplications.map((application) => {
        if (application.id !== eventForm.jobApplicationId) return application

        let newStatus = application.status

        if (eventForm.type === 'interview') {
          newStatus = 'interview'
        }

        if (eventForm.type === 'promised_response' || eventForm.type === 'follow_up') {
          newStatus = 'waiting_response'
        }

        return {
          ...application,
          status: application.isArchived ? application.status : newStatus,
          lastActivityAt: eventForm.startDate,
          updatedAt: new Date().toISOString(),
        }
      })
    )

    setSelectedDate(eventForm.startDate)
    setIsModalOpen(false)
  }

  const handleDeleteApplication = (applicationId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this job process? This will remove it from your active list.'
    )

    if (!confirmed) return

    setJobApplications((currentApplications) =>
      currentApplications.map((application) => {
        if (application.id !== applicationId) return application

        return {
          ...application,
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      })
    )
  }

  const handleArchiveApplication = (applicationId) => {
    setJobApplications((currentApplications) =>
      currentApplications.map((application) => {
        if (application.id !== applicationId) return application

        return {
          ...application,
          previousStatus: application.status,
          status: 'archived',
          isArchived: true,
          archivedAt: new Date().toISOString(),
          archivedReason: 'Archived manually',
          updatedAt: new Date().toISOString(),
        }
      })
    )
  }

  const handleRecoverApplication = (applicationId) => {
    setJobApplications((currentApplications) =>
      currentApplications.map((application) => {
        if (application.id !== applicationId) return application

        return {
          ...application,
          status: application.previousStatus || 'waiting_response',
          previousStatus: null,
          isArchived: false,
          archivedAt: null,
          archivedReason: null,
          lastActivityAt: formatDate(today),
          updatedAt: new Date().toISOString(),
        }
      })
    )
  }

  return (
    <div className="bg-background min-h-screen">
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <span className="inline-flex rounded-full bg-blue-soft px-4 py-2 text-sm font-medium text-brand-blue">
              Application Calendar
            </span>

            <h1 className="mt-5 text-4xl md:text-5xl font-bold text-navy tracking-tight">
              Track your job application process.
            </h1>

            <p className="mt-4 text-text-muted max-w-2xl leading-7">
              Organize interviews, deadlines, follow-ups, promised response dates,
              and job statuses in one visual calendar.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddEventModal}
            className="rounded-xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5 hover:shadow-md"
          >
            Add Event
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-surface border border-border p-5">
            <p className="text-sm text-text-muted">Active Applications</p>
            <p className="mt-2 text-3xl font-bold text-brand-blue">
              {activeApplicationsCount}
            </p>
          </div>

          <div className="rounded-2xl bg-surface border border-border p-5">
            <p className="text-sm text-text-muted">Archived Applications</p>
            <p className="mt-2 text-3xl font-bold text-forge-orange">
              {archivedApplicationsCount}
            </p>
          </div>

          <div className="rounded-2xl bg-surface border border-border p-5">
            <p className="text-sm text-text-muted">Selected Day Events</p>
            <p className="mt-2 text-3xl font-bold text-success-green">
              {selectedDateEvents.length}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveView('active')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 ${
              activeView === 'active'
                ? 'bg-brand-blue text-white'
                : 'bg-surface border border-border text-text-muted hover:text-brand-blue'
            }`}
          >
            Active Applications
          </button>

          <button
            type="button"
            onClick={() => setActiveView('archived')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 ${
              activeView === 'archived'
                ? 'bg-forge-orange text-white'
                : 'bg-surface border border-border text-text-muted hover:text-forge-orange'
            }`}
          >
            Archived
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-8">
          <div className="rounded-3xl bg-surface border border-border p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-navy">
                  {formatMonthTitle(currentMonth)}
                </h2>

                <p className="mt-1 text-sm text-text-muted">
                  Select a day to view related job events.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="h-10 w-10 rounded-full border border-border text-navy hover:text-brand-blue hover:border-brand-blue transition-colors"
                >
                  ←
                </button>

                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:text-brand-blue hover:border-brand-blue transition-colors"
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="h-10 w-10 rounded-full border border-border text-navy hover:text-brand-blue hover:border-brand-blue transition-colors"
                >
                  →
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-text-muted uppercase"
                >
                  {day}
                </div>
              ))}

              {monthDays.map((day, index) => {
                const dateString = day ? formatDate(day) : null
                const dayEvents = day ? getEventsForDate(day) : []
                const isSelected = dateString === selectedDate
                const isToday = dateString === formatDate(today)

                return (
                  <button
                    key={index}
                    type="button"
                    disabled={!day}
                    onClick={() => day && setSelectedDate(dateString)}
                    className={`
                      min-h-32 rounded-2xl border p-3 text-left transition-all duration-300
                      ${
                        day
                          ? 'bg-background hover:border-brand-blue hover:-translate-y-0.5'
                          : 'bg-transparent border-transparent cursor-default'
                      }
                      ${
                        isSelected
                          ? 'border-brand-blue ring-2 ring-blue-soft'
                          : 'border-border'
                      }
                    `}
                  >
                    {day && (
                      <>
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm font-bold ${
                              isToday ? 'text-brand-blue' : 'text-navy'
                            }`}
                          >
                            {day.getDate()}
                          </span>

                          {isToday && (
                            <span className="rounded-full bg-blue-soft px-2 py-0.5 text-[10px] font-semibold text-brand-blue">
                              Today
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-2">
                          {dayEvents.slice(0, 2).map((event) => {
                            const { jobInfo } = getJobInfoFromEvent(event)

                            return (
                              <div
                                key={event.id}
                                className={`rounded-lg px-2 py-1 text-[11px] font-semibold truncate ${
                                  eventTypeStyles[event.type]
                                }`}
                              >
                                {eventTypeLabels[event.type]} · {jobInfo?.company}
                              </div>
                            )
                          })}

                          {dayEvents.length > 2 && (
                            <p className="text-[11px] text-text-muted">
                              +{dayEvents.length - 2} more
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-surface border border-border p-6">
              <h2 className="text-xl font-bold text-navy">
                Selected Day
              </h2>

              <p className="mt-1 text-sm text-text-muted">
                {selectedDate}
              </p>

              <div className="mt-5 space-y-4">
                {selectedDateEvents.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    No events for this date.
                  </p>
                ) : (
                  selectedDateEvents.map((event) => {
                    const { application, jobInfo } = getJobInfoFromEvent(event)

                    return (
                      <div
                        key={event.id}
                        className="rounded-2xl bg-background border border-border p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-navy">
                              {event.title}
                            </h3>

                            <p className="mt-1 text-sm text-text-muted">
                              {event.startTime} - {event.endTime}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              eventTypeStyles[event.type]
                            }`}
                          >
                            {eventTypeLabels[event.type]}
                          </span>
                        </div>

                        {application && jobInfo && (
                          <div className="mt-4">
                            <p className="text-sm font-semibold text-navy">
                              {jobInfo.title}
                            </p>

                            <p className="text-sm text-text-muted">
                              {jobInfo.company} · {jobInfo.location}
                            </p>

                            <span
                              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                jobStatusStyles[application.status]
                              }`}
                            >
                              {jobStatusLabels[application.status]}
                            </span>
                          </div>
                        )}

                        {event.notes && (
                          <p className="mt-4 text-sm leading-6 text-text-muted">
                            {event.notes}
                          </p>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-surface border border-border p-6">
              <h2 className="text-xl font-bold text-navy">
                {activeView === 'archived' ? 'Archived Jobs' : 'Job Applications'}
              </h2>

              <p className="mt-1 text-sm text-text-muted">
                {activeView === 'archived'
                  ? 'Jobs with no recent updates.'
                  : 'Current applications being tracked.'}
              </p>

              <div className="mt-5 space-y-4">
                {visibleApplications.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    No jobs to show.
                  </p>
                ) : (
                  visibleApplications.map((application) => {
                    const jobInfo = getJobInfoFromApplication(application)

                    return (
                      <div
                        key={application.id}
                        className="rounded-2xl bg-background border border-border p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-navy">
                              {jobInfo?.title}
                            </h3>

                            <p className="mt-1 text-sm text-text-muted">
                              {jobInfo?.company} · {jobInfo?.location}
                            </p>
                          </div>

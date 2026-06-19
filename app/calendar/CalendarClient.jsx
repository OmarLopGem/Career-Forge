'use client'

import { useMemo, useState, useTransition } from 'react'
import { requestJson, requestJsonWithoutBody } from '@/lib/job-tracker/client/api.js'
import {
  eventTypeLabels,
  eventTypeStyles,
  formatDate,
  formatMonthTitle,
  getMonthDays,
  jobStatusLabels,
  jobStatusStyles,
} from '@/lib/job-tracker/client/constants.js'

const today = new Date()

function createEmptyEventForm(selectedDate, hasApplications) {
  return {
    id: null,
    scope: hasApplications ? 'application' : 'personal',
    jobApplicationId: '',
    title: '',
    type: 'interview',
    eventDate: selectedDate,
    startTime: '09:00',
    endTime: '10:00',
    notes: '',
    reminderEnabled: true,
  }
}

function createEmptyApplicationForm(jobListings) {
  return {
    mode: 'manual',
    jobListingId: jobListings[0]?._id ?? '',
    status: 'applied',
    appliedAt: formatDate(today),
    promisedResponseDate: '',
    notes: '',
    adaptedDescription: '',
    jobSnapshot: {
      title: '',
      company: '',
      location: '',
      url: '',
      source: 'Manual',
    },
  }
}

export default function CalendarClient({
  initialApplications,
  initialEvents,
  initialJobListings,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(formatDate(today))
  const [applications, setApplications] = useState(initialApplications)
  const [events, setEvents] = useState(initialEvents)
  const [jobListings] = useState(initialJobListings)
  const [activeView, setActiveView] = useState('active')
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false)
  const [eventForm, setEventForm] = useState(createEmptyEventForm(formatDate(today), initialApplications.length > 0))
  const [applicationForm, setApplicationForm] = useState(createEmptyApplicationForm(initialJobListings))
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const monthDays = useMemo(() => getMonthDays(currentMonth), [currentMonth])

  const listingMap = useMemo(() => {
    return new Map(jobListings.map((listing) => [listing._id, listing]))
  }, [jobListings])

  const visibleApplications = useMemo(() => {
    return applications.filter((application) => {
      if (activeView === 'archived') {
        return application.isArchived
      }

      return !application.isArchived
    })
  }, [applications, activeView])

  const visibleApplicationIds = useMemo(() => {
    return new Set(visibleApplications.map((application) => application._id))
  }, [visibleApplications])

  const visibleEvents = useMemo(() => {
    return events.filter((event) => {
      if (event.scope === 'personal') return true
      return visibleApplicationIds.has(event.jobApplicationId)
    })
  }, [events, visibleApplicationIds])

  const selectedDateEvents = useMemo(() => {
    return visibleEvents.filter((event) => event.eventDate === selectedDate)
  }, [selectedDate, visibleEvents])

  const activeApplicationsCount = applications.filter((application) => !application.isArchived).length
  const archivedApplicationsCount = applications.filter((application) => application.isArchived).length

  const getApplicationById = (applicationId) => {
    return applications.find((application) => application._id === applicationId) ?? null
  }

  const getJobInfoFromApplication = (application) => {
    if (!application) return null
    if (application.jobListingId && listingMap.has(application.jobListingId)) {
      return listingMap.get(application.jobListingId)
    }

    return application.jobSnapshot
  }

  const getEventsForDate = (date) => {
    if (!date) return []
    const dateString = formatDate(date)
    return visibleEvents.filter((event) => event.eventDate === dateString)
  }

  const refreshApplications = async () => {
    const { applications: nextApplications } = await requestJsonWithoutBody('/api/job-applications')
    setApplications(nextApplications)
  }

  const openCreateEventModal = () => {
    const firstActiveApplication = applications.find((application) => !application.isArchived)

    setEventForm({
      ...createEmptyEventForm(selectedDate, applications.length > 0),
      jobApplicationId: firstActiveApplication?._id ?? '',
      scope: firstActiveApplication ? 'application' : 'personal',
    })
    setError('')
    setIsEventModalOpen(true)
  }

  const openEditEventModal = (calendarEvent) => {
    setEventForm({
      id: calendarEvent._id,
      scope: calendarEvent.scope,
      jobApplicationId: calendarEvent.jobApplicationId ?? '',
      title: calendarEvent.title,
      type: calendarEvent.type,
      eventDate: calendarEvent.eventDate,
      startTime: calendarEvent.startTime ?? '',
      endTime: calendarEvent.endTime ?? '',
      notes: calendarEvent.notes ?? '',
      reminderEnabled: calendarEvent.reminderEnabled !== false,
    })
    setError('')
    setIsEventModalOpen(true)
  }

  const openCreateApplicationModal = () => {
    setApplicationForm(createEmptyApplicationForm(jobListings))
    setError('')
    setIsApplicationModalOpen(true)
  }

  const handleSaveEvent = (event) => {
    event.preventDefault()
    setError('')

    startTransition(async () => {
      try {
        const method = eventForm.id ? 'PATCH' : 'POST'
        const url = eventForm.id
          ? `/api/calendar/events/${eventForm.id}`
          : '/api/calendar/events'
        const payload = {
          ...eventForm,
          jobApplicationId: eventForm.scope === 'application' ? eventForm.jobApplicationId : null,
        }

        const result = await requestJson(url, {
          method,
          body: JSON.stringify(payload),
        })

        setEvents((current) => {
          if (eventForm.id) {
            return current.map((item) => (item._id === result.event._id ? result.event : item))
          }

          return [...current, result.event]
        })

        await refreshApplications()
        setSelectedDate(result.event.eventDate)
        setIsEventModalOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to save event.')
      }
    })
  }

  const handleDeleteEvent = (eventId) => {
    const confirmed = window.confirm('Are you sure you want to delete this event?')
    if (!confirmed) return

    setError('')

    startTransition(async () => {
      try {
        await requestJsonWithoutBody(`/api/calendar/events/${eventId}`, { method: 'DELETE' })
        setEvents((current) => current.filter((item) => item._id !== eventId))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to delete event.')
      }
    })
  }

  const handleSaveApplication = (event) => {
    event.preventDefault()
    setError('')

    startTransition(async () => {
      try {
        const payload = applicationForm.mode === 'listing'
          ? {
              jobListingId: applicationForm.jobListingId,
              status: applicationForm.status,
              appliedAt: applicationForm.appliedAt,
              promisedResponseDate: applicationForm.promisedResponseDate,
              notes: applicationForm.notes,
              adaptedDescription: applicationForm.adaptedDescription,
            }
          : {
              status: applicationForm.status,
              appliedAt: applicationForm.appliedAt,
              promisedResponseDate: applicationForm.promisedResponseDate,
              notes: applicationForm.notes,
              adaptedDescription: applicationForm.adaptedDescription,
              jobSnapshot: applicationForm.jobSnapshot,
            }

        const { application } = await requestJson('/api/job-applications', {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        setApplications((current) => [application, ...current])
        setIsApplicationModalOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to save application.')
      }
    })
  }

  const handleArchiveApplication = (applicationId) => {
    setError('')

    startTransition(async () => {
      try {
        const { application } = await requestJson(`/api/job-applications/${applicationId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'archived' }),
        })

        setApplications((current) =>
          current.map((item) => (item._id === application._id ? application : item)),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to archive application.')
      }
    })
  }

  const handleRecoverApplication = (applicationId) => {
    setError('')

    startTransition(async () => {
      try {
        const { application } = await requestJson(
          `/api/job-applications/${applicationId}/restore`,
          { method: 'POST' },
        )

        setApplications((current) =>
          current.map((item) => (item._id === application._id ? application : item)),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to recover application.')
      }
    })
  }

  const handleDeleteApplication = (applicationId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this job process? This will remove it from your tracker.',
    )
    if (!confirmed) return

    setError('')

    startTransition(async () => {
      try {
        await requestJsonWithoutBody(`/api/job-applications/${applicationId}`, { method: 'DELETE' })
        setApplications((current) => current.filter((item) => item._id !== applicationId))
        setEvents((current) =>
          current.filter((item) => item.scope === 'personal' || item.jobApplicationId !== applicationId),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to delete application.')
      }
    })
  }

  return (
    <div className="bg-background min-h-screen">
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-blue-soft px-4 py-2 text-sm font-medium text-brand-blue">
              Application Calendar
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-navy md:text-5xl">
              Track the full job application process.
            </h1>
            <p className="mt-4 max-w-3xl leading-7 text-text-muted">
              Store your applications in Mongo, link events to them, add personal
              reminders, and let the tracker archive stale processes after 30 days.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openCreateApplicationModal}
              className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-navy transition-all duration-300 hover:border-brand-blue hover:text-brand-blue"
            >
              Add Application
            </button>
            <button
              type="button"
              onClick={openCreateEventModal}
              className="rounded-xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover"
            >
              Add Event
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-6 rounded-2xl border border-forge-orange/30 bg-orange-soft px-4 py-3 text-sm text-forge-orange">
            {error}
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Active Applications" value={activeApplicationsCount} valueClass="text-brand-blue" />
          <StatCard label="Archived Applications" value={archivedApplicationsCount} valueClass="text-forge-orange" />
          <StatCard label="Selected Day Events" value={selectedDateEvents.length} valueClass="text-success-green" />
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

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-3xl border border-border bg-surface p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-navy">{formatMonthTitle(currentMonth)}</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Select a day to review job events and personal reminders.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-navy transition-colors hover:border-brand-blue hover:text-brand-blue"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                    setSelectedDate(formatDate(today))
                  }}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-navy transition-colors hover:border-brand-blue hover:text-brand-blue"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-navy transition-colors hover:border-brand-blue hover:text-brand-blue"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-7 gap-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-7 gap-3">
              {monthDays.map((day, index) => {
                const dateString = day ? formatDate(day) : null
                const isSelected = dateString === selectedDate
                const isToday = dateString === formatDate(today)
                const dayEvents = day ? getEventsForDate(day) : []

                return (
                  <button
                    key={dateString ?? `empty-${index}`}
                    type="button"
                    onClick={() => day && setSelectedDate(dateString)}
                    disabled={!day}
                    className={`min-h-32 rounded-2xl border p-3 text-left transition-all duration-300 ${
                      day ? 'bg-background hover:-translate-y-0.5 hover:border-brand-blue' : 'bg-transparent border-transparent cursor-default'
                    } ${isSelected ? 'border-brand-blue ring-2 ring-blue-soft' : 'border-border'}`}
                  >
                    {day ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${isToday ? 'text-brand-blue' : 'text-navy'}`}>
                            {day.getDate()}
                          </span>
                          {isToday ? (
                            <span className="rounded-full bg-blue-soft px-2 py-0.5 text-[10px] font-semibold text-brand-blue">
                              Today
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-3 space-y-2">
                          {dayEvents.slice(0, 2).map((calendarEvent) => {
                            const application = getApplicationById(calendarEvent.jobApplicationId)
                            const jobInfo = getJobInfoFromApplication(application)

                            return (
                              <div
                                key={calendarEvent._id}
                                className={`truncate rounded-lg px-2 py-1 text-[11px] font-semibold ${eventTypeStyles[calendarEvent.type]}`}
                              >
                                {eventTypeLabels[calendarEvent.type]}
                                {jobInfo?.company ? ` · ${jobInfo.company}` : ''}
                              </div>
                            )
                          })}

                          {dayEvents.length > 2 ? (
                            <p className="text-[11px] text-text-muted">+{dayEvents.length - 2} more</p>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-surface p-6">
              <h2 className="text-xl font-bold text-navy">Selected Day</h2>
              <p className="mt-1 text-sm text-text-muted">{selectedDate}</p>

              <div className="mt-5 space-y-4">
                {selectedDateEvents.length === 0 ? (
                  <p className="text-sm text-text-muted">No events for this date.</p>
                ) : (
                  selectedDateEvents.map((calendarEvent) => {
                    const application = getApplicationById(calendarEvent.jobApplicationId)
                    const jobInfo = getJobInfoFromApplication(application)

                    return (
                      <div key={calendarEvent._id} className="rounded-2xl border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-navy">{calendarEvent.title}</h3>
                            <p className="mt-1 text-sm text-text-muted">
                              {calendarEvent.startTime || '--:--'} - {calendarEvent.endTime || '--:--'}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${eventTypeStyles[calendarEvent.type]}`}>
                            {eventTypeLabels[calendarEvent.type]}
                          </span>
                        </div>

                        {jobInfo ? (
                          <div className="mt-4">
                            <p className="text-sm font-semibold text-navy">{jobInfo.title}</p>
                            <p className="text-sm text-text-muted">
                              {jobInfo.company}
                              {jobInfo.location ? ` · ${jobInfo.location}` : ''}
                            </p>

                            {application ? (
                              <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${jobStatusStyles[application.status]}`}>
                                {jobStatusLabels[application.status]}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <p className="mt-4 text-sm font-semibold text-navy">Personal reminder</p>
                        )}

                        {calendarEvent.notes ? (
                          <p className="mt-4 text-sm leading-6 text-text-muted">{calendarEvent.notes}</p>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditEventModal(calendarEvent)}
                            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-brand-blue hover:text-brand-blue"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(calendarEvent._id)}
                            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-forge-orange hover:text-forge-orange"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-6">
              <h2 className="text-xl font-bold text-navy">
                {activeView === 'archived' ? 'Archived Jobs' : 'Job Applications'}
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                {activeView === 'archived'
                  ? 'Jobs with no recent updates or manually archived processes.'
                  : 'Current applications being tracked in your account.'}
              </p>

              <div className="mt-5 space-y-4">
                {visibleApplications.length === 0 ? (
                  <p className="text-sm text-text-muted">No jobs to show.</p>
                ) : (
                  visibleApplications.map((application) => {
                    const jobInfo = getJobInfoFromApplication(application)

                    return (
                      <div key={application._id} className="rounded-2xl border border-border bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-navy">{jobInfo?.title}</h3>
                            <p className="mt-1 text-sm text-text-muted">
                              {jobInfo?.company}
                              {jobInfo?.location ? ` · ${jobInfo.location}` : ''}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${jobStatusStyles[application.status]}`}>
                            {jobStatusLabels[application.status]}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-text-muted">Applied</p>
                            <p className="font-semibold text-navy">{application.appliedAt || 'Not set'}</p>
                          </div>
                          <div>
                            <p className="text-text-muted">Last Activity</p>
                            <p className="font-semibold text-navy">{application.lastActivityAt}</p>
                          </div>
                        </div>

                        {application.isArchived ? (
                          <p className="mt-4 text-sm text-text-muted">
                            Archived reason: {application.archivedReason}
                          </p>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2">
                          {application.isArchived ? (
                            <button
                              type="button"
                              onClick={() => handleRecoverApplication(application._id)}
                              className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-blue-hover"
                            >
                              Recover
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleArchiveApplication(application._id)}
                              className="rounded-xl bg-orange-soft px-4 py-2 text-xs font-semibold text-forge-orange transition-colors"
                            >
                              Archive
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteApplication(application._id)}
                            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-forge-orange hover:text-forge-orange"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {isEventModalOpen ? (
        <ModalShell
          title={eventForm.id ? 'Edit Calendar Event' : 'Add Calendar Event'}
          description="Link this event to a job application or keep it as a personal reminder."
          onClose={() => setIsEventModalOpen(false)}
        >
          <form onSubmit={handleSaveEvent} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-navy">Scope</span>
                <select
                  value={eventForm.scope}
                  onChange={(event) =>
                    setEventForm((current) => ({
                      ...current,
                      scope: event.target.value,
                      jobApplicationId: event.target.value === 'personal' ? '' : current.jobApplicationId,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
                >
                  <option value="application">Job Application</option>
                  <option value="personal">Personal Reminder</option>
                </select>
              </label>

              {eventForm.scope === 'application' ? (
                <label className="block">
                  <span className="text-sm font-semibold text-navy">Job Application</span>
                  <select
                    value={eventForm.jobApplicationId}
                    onChange={(event) =>
                      setEventForm((current) => ({ ...current, jobApplicationId: event.target.value }))
                    }
                    className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
                  >
                    {applications
                      .filter((application) => !application.isArchived)
                      .map((application) => {
                        const jobInfo = getJobInfoFromApplication(application)
                        return (
                          <option key={application._id} value={application._id}>
                            {jobInfo?.title} · {jobInfo?.company}
                          </option>
                        )
                      })}
                  </select>
                </label>
              ) : null}
            </div>

            <FormField
              label="Event Title"
              value={eventForm.title}
              onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Example: Technical interview"
            />

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-navy">Event Type</span>
                <select
                  value={eventForm.type}
                  onChange={(event) => setEventForm((current) => ({ ...current, type: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
                >
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <FormField
                label="Date"
                type="date"
                value={eventForm.eventDate}
                onChange={(event) => setEventForm((current) => ({ ...current, eventDate: event.target.value }))}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                label="Start Time"
                type="time"
                value={eventForm.startTime}
                onChange={(event) => setEventForm((current) => ({ ...current, startTime: event.target.value }))}
              />
              <FormField
                label="End Time"
                type="time"
                value={eventForm.endTime}
                onChange={(event) => setEventForm((current) => ({ ...current, endTime: event.target.value }))}
              />
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-navy">Notes</span>
              <textarea
                value={eventForm.notes}
                onChange={(event) => setEventForm((current) => ({ ...current, notes: event.target.value }))}
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
              />
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEventModalOpen(false)}
                className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-text-muted transition-colors hover:text-navy"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Saving...' : 'Save Event'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {isApplicationModalOpen ? (
        <ModalShell
          title="Add Job Application"
          description="Create a manual process or connect one directly to a shared job listing."
          onClose={() => setIsApplicationModalOpen(false)}
        >
          <form onSubmit={handleSaveApplication} className="space-y-5">
            <div className="flex flex-wrap gap-3">
              {[
                ['manual', 'Manual entry'],
                ['listing', 'From listing'],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setApplicationForm((current) => ({ ...current, mode }))}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                    applicationForm.mode === mode
                      ? 'bg-brand-blue text-white'
                      : 'border border-border bg-background text-text-muted hover:text-brand-blue'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {applicationForm.mode === 'listing' ? (
              <label className="block">
                <span className="text-sm font-semibold text-navy">Job Listing</span>
                <select
                  value={applicationForm.jobListingId}
                  onChange={(event) =>
                    setApplicationForm((current) => ({ ...current, jobListingId: event.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
                >
                  {jobListings.map((listing) => (
                    <option key={listing._id} value={listing._id}>
                      {listing.title} · {listing.company}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  label="Job Title"
                  value={applicationForm.jobSnapshot.title}
                  onChange={(event) =>
                    setApplicationForm((current) => ({
                      ...current,
                      jobSnapshot: { ...current.jobSnapshot, title: event.target.value },
                    }))
                  }
                />
                <FormField
                  label="Company"
                  value={applicationForm.jobSnapshot.company}
                  onChange={(event) =>
                    setApplicationForm((current) => ({
                      ...current,
                      jobSnapshot: { ...current.jobSnapshot, company: event.target.value },
                    }))
                  }
                />
                <FormField
                  label="Location"
                  value={applicationForm.jobSnapshot.location}
                  onChange={(event) =>
                    setApplicationForm((current) => ({
                      ...current,
                      jobSnapshot: { ...current.jobSnapshot, location: event.target.value },
                    }))
                  }
                />
                <FormField
                  label="Source"
                  value={applicationForm.jobSnapshot.source}
                  onChange={(event) =>
                    setApplicationForm((current) => ({
                      ...current,
                      jobSnapshot: { ...current.jobSnapshot, source: event.target.value },
                    }))
                  }
                />
                <div className="md:col-span-2">
                  <FormField
                    label="Listing URL"
                    type="url"
                    value={applicationForm.jobSnapshot.url}
                    onChange={(event) =>
                      setApplicationForm((current) => ({
                        ...current,
                        jobSnapshot: { ...current.jobSnapshot, url: event.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-navy">Status</span>
                <select
                  value={applicationForm.status}
                  onChange={(event) => setApplicationForm((current) => ({ ...current, status: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
                >
                  {['saved', 'applied', 'interview', 'waiting_response', 'offer', 'rejected'].map((status) => (
                    <option key={status} value={status}>
                      {jobStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>

              <FormField
                label="Applied At"
                type="date"
                value={applicationForm.appliedAt}
                onChange={(event) => setApplicationForm((current) => ({ ...current, appliedAt: event.target.value }))}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                label="Promised Response Date"
                type="date"
                value={applicationForm.promisedResponseDate}
                onChange={(event) =>
                  setApplicationForm((current) => ({
                    ...current,
                    promisedResponseDate: event.target.value,
                  }))
                }
              />
              <FormField
                label="Adapted Description"
                value={applicationForm.adaptedDescription}
                onChange={(event) =>
                  setApplicationForm((current) => ({
                    ...current,
                    adaptedDescription: event.target.value,
                  }))
                }
                placeholder="Optional summary tailored to the job."
              />
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-navy">Notes</span>
              <textarea
                value={applicationForm.notes}
                onChange={(event) => setApplicationForm((current) => ({ ...current, notes: event.target.value }))}
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
              />
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsApplicationModalOpen(false)}
                className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-text-muted transition-colors hover:text-navy"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Saving...' : 'Save Application'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  )
}

function ModalShell({ title, description, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 px-6">
      <div className="w-full max-w-3xl rounded-3xl bg-surface p-6 shadow-xl md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-navy">{title}</h2>
            <p className="mt-1 text-sm text-text-muted">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full border border-border text-navy transition-colors hover:border-forge-orange hover:text-forge-orange"
          >
            ×
          </button>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

function FormField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-navy">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
      />
    </label>
  )
}

function StatCard({ label, value, valueClass }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <p className="text-sm text-text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
    </div>
  )
}

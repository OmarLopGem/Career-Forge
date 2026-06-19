import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CalendarClient from './CalendarClient.jsx'

const initialApplications = [
  {
    _id: 'application-1',
    jobListingId: null,
    jobSnapshot: {
      title: 'Frontend Developer',
      company: 'Nova Apps',
      location: 'Remote',
      url: 'https://example.com/frontend',
      source: 'Manual',
    },
    status: 'applied',
    previousStatus: null,
    appliedAt: '2026-06-10',
    lastActivityAt: '2026-06-10',
    promisedResponseDate: null,
    notes: '',
    adaptedDescription: '',
    isArchived: false,
    archivedAt: null,
    archivedReason: null,
    createdAt: '2026-06-10T12:00:00.000Z',
    updatedAt: '2026-06-10T12:00:00.000Z',
  },
]

const initialEvents = [
  {
    _id: 'event-1',
    scope: 'application',
    jobApplicationId: 'application-1',
    title: 'Frontend Interview',
    type: 'interview',
    eventDate: '2026-06-15',
    startTime: '10:00',
    endTime: '11:00',
    status: 'scheduled',
    notes: 'Bring portfolio.',
    reminderEnabled: true,
    createdAt: '2026-06-10T12:00:00.000Z',
    updatedAt: '2026-06-10T12:00:00.000Z',
  },
]

describe('CalendarClient', () => {
  it('renders applications from server data', () => {
    render(
      <CalendarClient
        initialApplications={initialApplications}
        initialEvents={initialEvents}
        initialJobListings={[]}
      />,
    )

    expect(screen.getByText('Frontend Developer')).toBeInTheDocument()
    expect(screen.getAllByText('Active Applications').length).toBeGreaterThan(0)
  })

  it('opens the event modal', async () => {
    const user = userEvent.setup()

    render(
      <CalendarClient
        initialApplications={initialApplications}
        initialEvents={initialEvents}
        initialJobListings={[]}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add Event' }))

    expect(screen.getByText('Add Calendar Event')).toBeInTheDocument()
    expect(screen.getByLabelText('Event Title')).toBeInTheDocument()
  })
})

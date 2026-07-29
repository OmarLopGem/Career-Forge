import { render, screen, within } from '@testing-library/react'
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
  {
    _id: 'application-2',
    jobListingId: null,
    jobSnapshot: {
      title: 'QA Analyst',
      company: 'Orbit QA',
      location: 'Toronto',
      url: 'https://example.com/qa',
      source: 'Manual',
    },
    status: 'waiting_response',
    previousStatus: null,
    appliedAt: '2026-06-11',
    lastActivityAt: '2026-06-11',
    promisedResponseDate: null,
    notes: '',
    adaptedDescription: '',
    isArchived: false,
    archivedAt: null,
    archivedReason: null,
    createdAt: '2026-06-11T12:00:00.000Z',
    updatedAt: '2026-06-11T12:00:00.000Z',
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

const initialJobListings = [
  {
    _id: 'listing-1',
    source: 'Adzuna',
    title: 'Frontend Developer',
    company: 'Nova Apps',
    location: 'Remote',
    description: 'Build responsive interfaces.',
    salaryMin: 60000,
    salaryMax: 75000,
    url: 'https://example.com/listings/frontend',
    requiredSkills: ['React', 'Next.js'],
    category: 'Frontend Development',
    employmentType: 'Full-time',
    postedAt: '2026-06-10T12:00:00.000Z',
    isActive: true,
    createdAt: '2026-06-10T12:00:00.000Z',
    updatedAt: '2026-06-10T12:00:00.000Z',
  },
  {
    _id: 'listing-2',
    source: 'LinkedIn',
    title: 'QA Analyst',
    company: 'Orbit QA',
    location: 'Toronto',
    description: 'Test web applications and automation flows.',
    salaryMin: 50000,
    salaryMax: 65000,
    url: 'https://example.com/listings/qa',
    requiredSkills: ['QA', 'Cypress'],
    category: 'QA',
    employmentType: 'Full-time',
    postedAt: '2026-06-11T12:00:00.000Z',
    isActive: true,
    createdAt: '2026-06-11T12:00:00.000Z',
    updatedAt: '2026-06-11T12:00:00.000Z',
  },
]

const initialCVProfiles = [
  {
    _id: 'cv-profile-1',
    title: 'Frontend Profile',
    isDefault: true,
    targetRole: 'Frontend Developer',
    professionalNiche: 'Frontend Development',
  },
]

describe('CalendarClient', () => {
  it('renders applications from server data', () => {
    render(
      <CalendarClient
        initialApplications={initialApplications}
        initialEvents={initialEvents}
        initialJobListings={initialJobListings}
        initialCVProfiles={initialCVProfiles}
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
        initialJobListings={initialJobListings}
        initialCVProfiles={initialCVProfiles}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add Event' }))

    expect(screen.getByText('Add Calendar Event')).toBeInTheDocument()
    expect(screen.getByLabelText('Event Title')).toBeInTheDocument()
  })

  it('lets the user enable or disable reminders in the event modal', async () => {
    const user = userEvent.setup()

    render(
      <CalendarClient
        initialApplications={initialApplications}
        initialEvents={initialEvents}
        initialJobListings={initialJobListings}
        initialCVProfiles={initialCVProfiles}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add Event' }))

    const reminderToggle = screen.getByLabelText('Enable reminder')
    expect(reminderToggle).toBeChecked()

    await user.click(reminderToggle)
    expect(reminderToggle).not.toBeChecked()
  })

  it('filters job applications in the event modal while typing', async () => {
    const user = userEvent.setup()

    const { container } = render(
      <CalendarClient
        initialApplications={initialApplications}
        initialEvents={initialEvents}
        initialJobListings={initialJobListings}
        initialCVProfiles={initialCVProfiles}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add Event' }))

    const applicationInput = screen.getByLabelText('Job Application')
    const optionsPanel = container.querySelector('#event-application-options')

    expect(optionsPanel).not.toBeNull()
    expect(within(optionsPanel).getByRole('button', { name: /Frontend Developer/i })).toBeInTheDocument()
    expect(within(optionsPanel).getByRole('button', { name: /QA Analyst/i })).toBeInTheDocument()

    await user.clear(applicationInput)
    await user.type(applicationInput, 'qa')

    expect(within(optionsPanel).getByRole('button', { name: /QA Analyst/i })).toBeInTheDocument()
    expect(within(optionsPanel).queryByRole('button', { name: /Frontend Developer/i })).not.toBeInTheDocument()
  })

  it('keeps showing all options after selecting an application until the user types', async () => {
    const user = userEvent.setup()

    const { container } = render(
      <CalendarClient
        initialApplications={initialApplications}
        initialEvents={initialEvents}
        initialJobListings={initialJobListings}
        initialCVProfiles={initialCVProfiles}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add Event' }))
    await user.click(screen.getByRole('button', { name: /QA Analyst/i }))
    await user.click(screen.getByRole('button', { name: 'Toggle job application options' }))

    const optionsPanel = container.querySelector('#event-application-options')

    expect(screen.getByLabelText('Job Application')).toHaveValue('QA Analyst · Orbit QA · Toronto')
    expect(optionsPanel).not.toBeNull()
    expect(within(optionsPanel).getByRole('button', { name: /Frontend Developer/i })).toBeInTheDocument()
    expect(within(optionsPanel).getByRole('button', { name: /QA Analyst/i })).toBeInTheDocument()
  })

  it('hides the source field for manual applications', async () => {
    const user = userEvent.setup()

    render(
      <CalendarClient
        initialApplications={initialApplications}
        initialEvents={initialEvents}
        initialJobListings={initialJobListings}
        initialCVProfiles={initialCVProfiles}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add Application' }))

    expect(screen.queryByLabelText('Source')).not.toBeInTheDocument()
  })

  it('filters job listings in the application modal while typing', async () => {
    const user = userEvent.setup()

    const { container } = render(
      <CalendarClient
        initialApplications={initialApplications}
        initialEvents={initialEvents}
        initialJobListings={initialJobListings}
        initialCVProfiles={initialCVProfiles}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Add Application' }))
    await user.click(screen.getByRole('button', { name: 'From listing' }))

    const listingInput = screen.getByLabelText('Job Listing')
    const optionsPanel = container.querySelector('#application-listing-options')

    expect(optionsPanel).not.toBeNull()
    expect(within(optionsPanel).getByRole('button', { name: /Frontend Developer/i })).toBeInTheDocument()
    expect(within(optionsPanel).getByRole('button', { name: /QA Analyst/i })).toBeInTheDocument()

    await user.clear(listingInput)
    await user.type(listingInput, 'qa')

    expect(within(optionsPanel).getByRole('button', { name: /QA Analyst/i })).toBeInTheDocument()
    expect(within(optionsPanel).queryByRole('button', { name: /Frontend Developer/i })).not.toBeInTheDocument()
  })
})

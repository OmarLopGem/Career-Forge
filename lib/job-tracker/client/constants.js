export const jobStatusStyles = {
  saved: 'bg-blue-soft text-brand-blue',
  applied: 'bg-blue-soft text-brand-blue',
  interview: 'bg-cyan-soft text-success-green',
  waiting_response: 'bg-orange-soft text-forge-orange',
  offer: 'bg-cyan-soft text-success-green',
  rejected: 'bg-orange-soft text-forge-orange',
  archived: 'bg-border text-text-muted',
}

export const eventTypeStyles = {
  interview: 'bg-cyan-soft text-success-green',
  deadline: 'bg-orange-soft text-forge-orange',
  follow_up: 'bg-blue-soft text-brand-blue',
  promised_response: 'bg-orange-soft text-forge-orange',
  reminder: 'bg-blue-soft text-brand-blue',
}

export const eventTypeLabels = {
  interview: 'Interview',
  deadline: 'Deadline',
  follow_up: 'Follow Up',
  promised_response: 'Response Date',
  reminder: 'Reminder',
}

export const jobStatusLabels = {
  saved: 'Saved',
  applied: 'Applied',
  interview: 'Interview',
  waiting_response: 'Waiting Response',
  offer: 'Offer',
  rejected: 'Rejected',
  archived: 'Archived',
}

export function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function parseLocalDate(dateString) {
  const [year, month, day] = String(dateString).split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getMonthDays(currentDate) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstDayIndex = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()
  const days = []

  for (let i = 0; i < firstDayIndex; i += 1) {
    days.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day))
  }

  while (days.length % 7 !== 0) {
    days.push(null)
  }

  return days
}

export function formatMonthTitle(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

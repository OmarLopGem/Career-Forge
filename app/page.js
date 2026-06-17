import Link from 'next/link'
import ToolPreviewCarousel from './components/ToolPreviewCarousel'

export const metadata = {
  title: 'Career Forge',
  description:
    'A career workspace that helps unemployed people improve their resume, find matched jobs, track applications, and prepare for interviews.',
}

export default function Home() {
  const tools = [
    {
      title: 'Resume Studio',
      description:
        'Analyze your PDF resume, receive AI feedback, compare it with professional formats, and improve your score over time.',
      href: '/resume',
      label: 'AI Resume Analysis',
    },
    {
      title: 'CV Assistant',
      description:
        'Upload a CV, review the parsed profile, get AI niche and improvement feedback, choose a template, and download a polished PDF.',
      href: '/cv-assistant',
      label: '5-Step CV Assistant',
    },
    {
      title: 'Career Profile',
      description:
        'Create an online CV with your photo, skills, experience, description, and job-specific professional summaries.',
      href: '/profile',
      label: 'Online CV',
    },
    {
      title: 'Job Matches',
      description:
        'Explore job listings based on your profile, skills, niche, and job descriptions that match your career goals.',
      href: '/jobs',
      label: 'Job Listings',
    },
    {
      title: 'Calendar',
      description:
        'Track interviews, follow-ups, deadlines, reminders, and job process status changes in one place.',
      href: '/calendar',
      label: 'Application Tracker',
    },
    {
      title: 'Practice',
      description:
        'Prepare with daily interview quizzes, feedback when your grade is below 7, difficulty progression, and streaks.',
      href: '/practice',
      label: 'Interview Prep',
    },
    {
      title: 'Progress Tracker',
      description:
        'See your resume grade history, highest quiz scores, and the jobs you have applied to over time.',
      href: '/progress',
      label: 'Career Progress',
    },
  ]

  const process = [
    {
      number: '01',
      title: 'Create your profile',
      description:
        'Register and build your professional profile with skills, experience, photo, and description.',
    },
    {
      number: '02',
      title: 'Improve your resume',
      description:
        'Upload your resume and receive AI feedback, niche detection, grades, and improvement suggestions.',
    },
    {
      number: '03',
      title: 'Find matched jobs',
      description:
        'Explore job listings that align with your profile and adapt your description for specific opportunities.',
    },
    {
      number: '04',
      title: 'Track and prepare',
      description:
        'Add jobs to your calendar, practice with quizzes, receive reminders, and monitor your progress.',
    },
  ]

  return (
    
    <div className="bg-background">
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="inline-flex items-center rounded-full bg-blue-soft px-4 py-2 text-sm font-medium text-brand-blue">
              Career workspace for job seekers
            </span>

            <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight text-navy leading-tight">
              Build a stronger path toward your next job.
            </h1>

            <p className="mt-6 text-lg text-text-muted leading-8 max-w-xl">
              Career Forge helps unemployed people improve their resume, create a
              professional profile, find matched jobs, track applications, and prepare
              for interviews.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/resume"
                className="inline-flex justify-center items-center rounded-xl bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5 hover:shadow-md"
              >
                Upload Resume
              </Link>

              <Link
                href="/jobs"
                className="inline-flex justify-center items-center rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-navy transition-all duration-300 hover:border-brand-blue hover:text-brand-blue hover:-translate-y-0.5"
              >
                Explore Job Matches
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-blue-soft blur-2xl opacity-60" />

            <div className="relative bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-blue-soft flex items-center justify-center">
                    <img
                      src="/career-forge-logo.png"
                      alt="Career Forge Logo"
                      className="h-10 w-10 object-contain"
                    />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-navy">
                      Career Overview
                    </h2>
                    <p className="text-sm text-text-muted">
                      Resume, jobs, calendar and practice
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex rounded-full bg-cyan-soft px-3 py-1 text-xs font-semibold text-success-green">
                  Active
                </span>
              </div>

              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-background p-5">
                  <p className="text-sm text-text-muted">Resume Score</p>
                  <p className="mt-2 text-3xl font-bold text-success-green">
                    82%
                  </p>
                  <div className="mt-4 h-2 rounded-full bg-border overflow-hidden">
                    <div className="h-full w-[82%] rounded-full bg-success-green" />
                  </div>
                </div>

                <div className="rounded-2xl bg-background p-5">
                  <p className="text-sm text-text-muted">Job Matches</p>
                  <p className="mt-2 text-3xl font-bold text-brand-blue">
                    24
                  </p>
                  <div className="mt-4 h-2 rounded-full bg-border overflow-hidden">
                    <div className="h-full w-[70%] rounded-full bg-brand-blue" />
                  </div>
                </div>

                <div className="rounded-2xl bg-background p-5 sm:col-span-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-text-muted">
                        Next calendar event
                      </p>
                      <p className="mt-1 font-semibold text-navy">
                        Frontend Developer Interview
                      </p>
                      <p className="mt-1 text-sm text-text-muted">
                        Tomorrow at 10:30 AM
                      </p>
                    </div>

                    <span className="rounded-full bg-orange-soft px-3 py-1 text-xs font-semibold text-forge-orange">
                      Interview
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-background p-5 sm:col-span-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-text-muted">
                        Interview practice streak
                      </p>
                      <p className="mt-1 font-semibold text-navy">
                        5 days of preparation
                      </p>
                    </div>

                    <p className="text-2xl font-bold text-brand-blue">
                      5
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <ToolPreviewCarousel />

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-navy">
            Tools designed around the job search process
          </h2>

          <p className="mt-4 text-text-muted leading-7">
            Each tool supports a key part of landing a job: preparing your profile,
            finding opportunities, tracking applications, and improving over time.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className="group rounded-2xl bg-surface border border-border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-brand-blue"
            >
              <span className="inline-flex rounded-full bg-blue-soft px-3 py-1 text-xs font-semibold text-brand-blue">
                {tool.label}
              </span>

              <h3 className="mt-5 text-xl font-bold text-navy group-hover:text-brand-blue transition-colors">
                {tool.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-text-muted">
                {tool.description}
              </p>

              <span className="mt-5 inline-block text-sm font-semibold text-brand-blue">
                Learn more →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="rounded-3xl bg-surface border border-border p-8 md:p-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-navy">
              From resume to interview preparation
            </h2>

            <p className="mt-4 text-text-muted leading-7">
              Career Forge helps users follow a clearer process instead of managing
              their job search through scattered files and reminders.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {process.map((step) => (
              <div key={step.number} className="rounded-2xl bg-background p-6">
                <span className="text-sm font-bold text-brand-blue">
                  {step.number}
                </span>

                <h3 className="mt-3 text-lg font-bold text-navy">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-text-muted">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="rounded-3xl bg-surface border border-border p-8">
            <span className="inline-flex rounded-full bg-orange-soft px-3 py-1 text-xs font-semibold text-forge-orange">
              Notifications
            </span>

            <h2 className="mt-5 text-2xl font-bold text-navy">
              Never miss an important hiring step
            </h2>

            <p className="mt-4 text-text-muted leading-7">
              Users can receive email and platform notifications for interviews,
              reminders, follow-ups, deadlines, and important application updates.
            </p>
          </div>

          <div className="rounded-3xl bg-surface border border-border p-8">
            <span className="inline-flex rounded-full bg-cyan-soft px-3 py-1 text-xs font-semibold text-success-green">
              Progress
            </span>

            <h2 className="mt-5 text-2xl font-bold text-navy">
              Measure improvement over time
            </h2>

            <p className="mt-4 text-text-muted leading-7">
              Career Forge stores resume grades, quiz performance, best scores,
              application history, and progress data to help users understand their growth.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 pb-24">
        <div className="rounded-3xl bg-navy px-8 py-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Start building your path to a better job.
          </h2>

          <p className="mt-4 text-slate-300 max-w-2xl mx-auto leading-7">
            Create your profile, upload your resume, find job matches, and keep your
            hiring process organized.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="rounded-xl bg-brand-blue px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5"
            >
              Create Account
            </Link>

            <Link
              href="/resume"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-navy transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-soft"
            >
              Upload Resume
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
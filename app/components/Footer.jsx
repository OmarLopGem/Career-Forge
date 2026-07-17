import Image from 'next/image'
import Link from 'next/link'

// The footer mirrors the platform information architecture so users always have
// a secondary navigation path into the main tools and future sections.
export default function Footer() {
  const year = new Date().getFullYear()

  const footerLinks = [
    {
      title: 'Platform',
      links: [
        { name: 'Home', href: '/' },
        { name: 'CV Assistant', href: '/cv-assistant' },
        { name: 'Job Matches', href: '/jobs' },
        { name: 'Calendar', href: '/calendar' },
        { name: 'Practice', href: '/quiz' },
        { name: 'Profile', href: '/profile' },
      ],
    },
    {
      title: 'Career Tools',
      links: [
        { name: 'Resume Studio', href: '/cv-assistant' },
        { name: 'Progress Tracker', href: '/progress' },
        { name: 'Notifications', href: '/notifications' },
        { name: 'Career Profile', href: '/profile' },
      ],
    },
    {
      title: 'Access',
      links: [
        { name: 'Login', href: '/login' },
        { name: 'Register', href: '/register' },
        { name: 'Notifications', href: '/notifications' },
      ],
    },
  ]

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="group flex w-fit items-center gap-3">
              <Image
                src="/career-forge-logo.png"
                alt="Career Forge Logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain transition-transform duration-300 group-hover:scale-105"
              />

              <span className="text-xl font-bold leading-none text-navy">
                Career <span className="text-brand-blue">Forge</span>
              </span>
            </Link>

            <p className="mt-4 max-w-xs text-sm leading-6 text-text-muted">
              A career workspace that helps job seekers improve their resume,
              find matched jobs, track applications, and prepare for interviews.
            </p>

            <Link
              href="/cv-assistant"
              className="mt-5 inline-flex rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-blue-hover"
            >
              Upload Resume
            </Link>
          </div>

          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-navy">{section.title}</h3>

              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted transition-colors duration-300 hover:text-brand-blue"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-sm text-text-muted">(c) {year} Career Forge. All rights reserved.</p>

          <div className="flex items-center gap-5">
            <Link
              href="/progress"
              className="text-sm text-text-muted transition-colors duration-300 hover:text-brand-blue"
            >
              Progress
            </Link>

            <Link
              href="/quiz"
              className="text-sm text-text-muted transition-colors duration-300 hover:text-brand-blue"
            >
              Practice
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

import Link from 'next/link'

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
      title: 'Company',
      links: [
        { name: 'About', href: '/about' },
        { name: 'Contact Admin', href: '/contact' },
        { name: 'Privacy Policy', href: '/privacy' },
      ],
    },
  ]

  return (
    <footer className="bg-surface border-t border-border">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-3 group w-fit">
              <img
                src="/career-forge-logo.png"
                alt="Career Forge Logo"
                className="h-10 w-10 object-contain transition-transform duration-300 group-hover:scale-105"
              />

              <span className="text-xl font-bold leading-none text-navy">
                Career <span className="text-brand-blue">Forge</span>
              </span>
            </Link>

            <p className="mt-4 text-sm leading-6 text-text-muted max-w-xs">
              A career workspace that helps job seekers improve their resume,
              find matched jobs, track applications, and prepare for interviews.
            </p>

            <Link
              href="/cv-assistant"
              className="mt-5 inline-flex rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5"
            >
              Upload Resume
            </Link>
          </div>

          {/* Links */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-navy">
                {section.title}
              </h3>

              <ul className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted hover:text-brand-blue transition-colors duration-300"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-text-muted">
            © {year} Career Forge. All rights reserved.
          </p>

          <div className="flex items-center gap-5">
            <Link
              href="/terms"
              className="text-sm text-text-muted hover:text-brand-blue transition-colors duration-300"
            >
              Terms
            </Link>

            <Link
              href="/privacy"
              className="text-sm text-text-muted hover:text-brand-blue transition-colors duration-300"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

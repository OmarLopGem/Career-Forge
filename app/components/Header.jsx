'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton.jsx'

export default function Header({ currentUser }) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const primaryLinks = [
    {
      name: 'Home',
      href: '/',
    },
  ]

  const authenticatedLinks = [
    {
      name: 'CV Assistant',
      href: '/cv-assistant',
    },
    {
      name: 'Job Matches',
      href: '/jobs',
    },
    {
      name: 'Calendar',
      href: '/calendar',
    },
    {
      name: 'Practice',
      href: '/quiz',
    },
    {
      name: 'Profile',
      href: '/profile',
    },
  ]

  const navLinks = currentUser ? [...primaryLinks, ...authenticatedLinks] : primaryLinks

  const isActiveLink = (href) => {
    if (href === '/') {
      return pathname === '/'
    }

    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-50 bg-surface/95 backdrop-blur-md border-b border-border">
      <nav className="max-w-7xl mx-auto px-5 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group"
            onClick={() => setIsOpen(false)}
          >
            <img
              src="/career-forge-logo.png"
              alt="Career Forge Logo"
              className="h-10 w-10 sm:h-11 sm:w-11 object-contain translate-y-[1px] transition-transform duration-300 group-hover:scale-105"
            />

            <span className="text-xl sm:text-2xl font-bold leading-none text-navy tracking-tight">
              Career <span className="text-brand-blue">Forge</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2">
            {navLinks.map((link) => {
              const isActive = isActiveLink(link.href)

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`
                    group relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                    ${
                      isActive
                        ? 'text-brand-blue bg-blue-soft'
                        : 'text-text-muted hover:text-brand-blue hover:bg-cyan-soft'
                    }
                  `}
                >
                  {link.name}

                  <span
                    className={`
                      absolute left-4 right-4 -bottom-1 h-0.5 rounded-full bg-brand-blue 
                      transition-all duration-300 origin-center
                      ${
                        isActive
                          ? 'opacity-100 scale-x-100'
                          : 'opacity-0 scale-x-0 group-hover:opacity-100 group-hover:scale-x-100'
                      }
                    `}
                  />
                </Link>
              )
            })}

            {currentUser ? (
              <>
                <span className="ml-3 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-navy">
                  {currentUser.firstName}
                </span>
                <Link
                  href="/cv-assistant"
                  className="rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5 hover:shadow-md"
                >
                  Upload Resume
                </Link>
                <LogoutButton className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:border-brand-blue hover:text-brand-blue" />
              </>
            ) : (
              <div className="ml-3 flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-brand-blue hover:text-brand-blue"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5 hover:shadow-md"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
            className="lg:hidden flex flex-col items-center justify-center gap-1.5 h-10 w-10 rounded-lg hover:bg-cyan-soft transition-colors"
          >
            <span
              className={`
                h-0.5 w-6 bg-navy rounded-full transition-all duration-300
                ${isOpen ? 'rotate-45 translate-y-2' : ''}
              `}
            />
            <span
              className={`
                h-0.5 w-6 bg-navy rounded-full transition-all duration-300
                ${isOpen ? 'opacity-0' : 'opacity-100'}
              `}
            />
            <span
              className={`
                h-0.5 w-6 bg-navy rounded-full transition-all duration-300
                ${isOpen ? '-rotate-45 -translate-y-2' : ''}
              `}
            />
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={`
            lg:hidden overflow-hidden transition-all duration-300 ease-in-out
            ${isOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="flex flex-col gap-2 pt-4 border-t border-border">
            {navLinks.map((link) => {
              const isActive = isActiveLink(link.href)

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300
                    ${
                      isActive
                        ? 'text-brand-blue bg-blue-soft'
                        : 'text-text-muted hover:text-brand-blue hover:bg-cyan-soft'
                    }
                  `}
                >
                  {link.name}
                </Link>
              )
            })}

            {currentUser ? (
              <>
                <Link
                  href="/cv-assistant"
                  onClick={() => setIsOpen(false)}
                  className="mt-2 rounded-xl bg-brand-blue px-4 py-3 text-center text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover"
                >
                  Upload Resume
                </Link>
                <LogoutButton className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-text-muted transition-colors hover:border-brand-blue hover:text-brand-blue" />
              </>
            ) : (
              <div className="mt-2 grid gap-2">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold text-navy transition-colors hover:border-brand-blue hover:text-brand-blue"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl bg-brand-blue px-4 py-3 text-center text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}

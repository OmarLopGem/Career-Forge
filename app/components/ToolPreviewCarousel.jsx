'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'

export default function ToolPreviewCarousel() {
  const carouselRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const previews = [
    {
      title: 'CV Assistant',
      subtitle: '5-step guided flow',
      description:
        'Upload, parse, review, analyze and download a polished resume in one of five templates.',
      href: '/cv-assistant',
      stat: '5',
      statLabel: 'Templates',
      badge: 'CV',
      color: 'text-brand-blue',
      bg: 'bg-blue-soft',
      bar: 'bg-brand-blue',
    },
    {
      title: 'Resume Studio',
      subtitle: 'AI Resume Analysis',
      description:
        'Upload your PDF resume and get a professional niche, improvement feedback, and resume score.',
      href: '/cv-assistant',
      stat: '82%',
      statLabel: 'Resume Score',
      badge: 'Resume',
      color: 'text-success-green',
      bg: 'bg-cyan-soft',
      bar: 'bg-success-green',
    },
    {
      title: 'Job Matches',
      subtitle: 'Smart job listings',
      description:
        'Find job offers that match your profile, skills, niche, and professional experience.',
      href: '/jobs',
      stat: '24',
      statLabel: 'Matched Jobs',
      badge: 'Jobs',
      color: 'text-brand-blue',
      bg: 'bg-blue-soft',
      bar: 'bg-brand-blue',
    },
    {
      title: 'Calendar',
      subtitle: 'Hiring process tracker',
      description:
        'Save interviews, follow-ups, reminders, deadlines, and important job application dates.',
      href: '/calendar',
      stat: '3',
      statLabel: 'Upcoming Events',
      badge: 'Calendar',
      color: 'text-forge-orange',
      bg: 'bg-orange-soft',
      bar: 'bg-forge-orange',
    },
    {
      title: 'Practice',
      subtitle: 'Interview quizzes',
      description:
        'Take daily quizzes, build a streak, increase difficulty, and store your best grades.',
      href: '/quiz',
      stat: '5',
      statLabel: 'Day Streak',
      badge: 'Quizzes',
      color: 'text-brand-blue',
      bg: 'bg-blue-soft',
      bar: 'bg-brand-blue',
    },
  ]

  const scrollToCard = (index) => {
    const carousel = carouselRef.current

    if (!carousel) return

    const card = carousel.children[index]

    if (!card) return

    carousel.scrollTo({
      left: card.offsetLeft - carousel.offsetLeft,
      behavior: 'smooth',
    })

    setActiveIndex(index)
  }

  const handlePrevious = () => {
    const newIndex = activeIndex === 0 ? previews.length - 1 : activeIndex - 1
    scrollToCard(newIndex)
  }

  const handleNext = () => {
    const newIndex = activeIndex === previews.length - 1 ? 0 : activeIndex + 1
    scrollToCard(newIndex)
  }

  const handleScroll = () => {
    const carousel = carouselRef.current

    if (!carousel) return

    const cards = Array.from(carousel.children)

    const closestIndex = cards.reduce((closest, card, index) => {
      const distance = Math.abs(
        card.offsetLeft - carousel.offsetLeft - carousel.scrollLeft
      )

      const closestDistance = Math.abs(
        cards[closest].offsetLeft - carousel.offsetLeft - carousel.scrollLeft
      )

      return distance < closestDistance ? index : closest
    }, 0)

    setActiveIndex(closestIndex)
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold text-navy">
            Everything connected in one career workspace
          </h2>

          <p className="mt-3 text-text-muted max-w-2xl leading-7">
            Career Forge connects your resume, profile, job matches, calendar,
            practice quizzes, notifications, and progress history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrevious}
            aria-label="Previous preview"
            className="h-11 w-11 rounded-full border border-border bg-surface text-navy transition-all duration-300 hover:border-brand-blue hover:text-brand-blue hover:-translate-y-0.5 hover:shadow-sm"
          >
            ←
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next preview"
            className="h-11 w-11 rounded-full border border-border bg-surface text-navy transition-all duration-300 hover:border-brand-blue hover:text-brand-blue hover:-translate-y-0.5 hover:shadow-sm"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="mt-10 flex w-full max-w-full gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar pb-4"
      >
        {previews.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="snap-start flex-none w-[85%] sm:w-[460px] lg:w-[620px] group rounded-3xl bg-surface border border-border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-brand-blue"
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={`rounded-full ${item.bg} px-3 py-1 text-xs font-semibold ${item.color}`}
              >
                {item.badge}
              </span>

              <span className="text-xs font-medium text-text-muted">
                {item.subtitle}
              </span>
            </div>

            <h3 className="mt-6 text-2xl font-bold text-navy group-hover:text-brand-blue transition-colors">
              {item.title}
            </h3>

            <p className="mt-3 text-sm leading-6 text-text-muted">
              {item.description}
            </p>

            <div className="mt-6 rounded-2xl bg-background p-5">
              <p className="text-sm text-text-muted">
                {item.statLabel}
              </p>

              <p className={`mt-2 text-3xl font-bold ${item.color}`}>
                {item.stat}
              </p>

              <div className="mt-4 h-2 rounded-full bg-border overflow-hidden">
                <div className={`h-full w-[75%] rounded-full ${item.bar}`} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {previews.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => scrollToCard(index)}
            aria-label={`Go to ${item.title}`}
            className={`
              h-2.5 rounded-full transition-all duration-300
              ${
                activeIndex === index
                  ? 'w-8 bg-brand-blue'
                  : 'w-2.5 bg-border hover:bg-text-muted'
              }
            `}
          />
        ))}
      </div>
    </section>
  )
}

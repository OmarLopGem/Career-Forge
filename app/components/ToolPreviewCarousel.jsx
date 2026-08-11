'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'

const ACTIVE_EDGE_TOLERANCE = 24

// The carousel gives the homepage a quick tour of the product modules without
// forcing the user to navigate away before understanding the platform.
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
      title: 'Job Listings',
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

  const getActiveIndexFromScroll = (carousel) => {
    const cards = Array.from(carousel.children)

    if (cards.length === 0) {
      return 0
    }

    if (carousel.scrollLeft <= ACTIVE_EDGE_TOLERANCE) {
      return 0
    }

    if (carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - ACTIVE_EDGE_TOLERANCE) {
      return cards.length - 1
    }

    const viewportCenter = carousel.scrollLeft + carousel.clientWidth / 2

    return cards.reduce((closest, card, index) => {
      const cardCenter =
        card.offsetLeft - carousel.offsetLeft + card.clientWidth / 2
      const closestCard = cards[closest]
      const closestCardCenter =
        closestCard.offsetLeft - carousel.offsetLeft + closestCard.clientWidth / 2

      return Math.abs(cardCenter - viewportCenter) < Math.abs(closestCardCenter - viewportCenter)
        ? index
        : closest
    }, 0)
  }

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

    setActiveIndex(getActiveIndexFromScroll(carousel))
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-navy md:text-4xl">
            Everything connected in one career workspace
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-text-muted">
            Career Forge connects your resume, profile, job listings, calendar,
            practice quizzes, notifications, and progress history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrevious}
            aria-label="Previous preview"
            className="h-11 w-11 rounded-full border border-border bg-surface text-navy transition-all duration-300 hover:border-brand-blue hover:text-brand-blue hover:shadow-sm"
          >
            <span aria-hidden="true">&larr;</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next preview"
            className="h-11 w-11 rounded-full border border-border bg-surface text-navy transition-all duration-300 hover:border-brand-blue hover:text-brand-blue hover:shadow-sm"
          >
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>

      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="mt-10 flex w-full max-w-full gap-6 overflow-x-auto px-1 pb-6 pt-2 scroll-smooth snap-x snap-mandatory no-scrollbar"
      >
        {previews.map((item, index) => (
          <Link
            key={item.title}
            href={item.href}
            className={`group flex-none snap-start overflow-hidden rounded-[2rem] border p-6 transition-[border-color,box-shadow,background-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30 ${
              activeIndex === index
                ? 'w-[88%] border-brand-blue/80 bg-white shadow-[0_24px_60px_-34px_rgba(37,99,235,0.28)] sm:w-[460px] lg:w-[620px]'
                : 'w-[88%] border-border bg-surface shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)] hover:border-brand-blue/60 hover:bg-white hover:shadow-[0_24px_60px_-34px_rgba(15,23,42,0.26)] sm:w-[460px] lg:w-[620px]'
            }`}
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

            <h3 className="mt-6 text-2xl font-bold text-navy transition-colors group-hover:text-brand-blue">
              {item.title}
            </h3>

            <p className="mt-3 text-sm leading-6 text-text-muted">
              {item.description}
            </p>

            <div className="mt-6 rounded-2xl bg-background p-5">
              <p className="text-sm text-text-muted">{item.statLabel}</p>

              <p className={`mt-2 text-3xl font-bold ${item.color}`}>
                {item.stat}
              </p>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
                <div className={`h-full w-[75%] rounded-full ${item.bar}`} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-2 flex justify-center gap-2">
        {previews.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => scrollToCard(index)}
            aria-label={`Go to ${item.title}`}
            aria-pressed={activeIndex === index}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              activeIndex === index
                ? 'w-8 bg-brand-blue shadow-[0_0_0_4px_rgba(37,99,235,0.12)]'
                : 'w-2.5 bg-border hover:bg-text-muted'
            }`}
          />
        ))}
      </div>
    </section>
  )
}

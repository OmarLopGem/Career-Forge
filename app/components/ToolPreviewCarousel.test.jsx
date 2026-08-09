import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ToolPreviewCarousel from './ToolPreviewCarousel.jsx'

describe('ToolPreviewCarousel', () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollTo = vi.fn()
  })

  it('marks the last dot as active when the scroll reaches the end', () => {
    render(<ToolPreviewCarousel />)

    const carousel = screen.getByRole('link', { name: /CV Assistant/i }).parentElement
    const cards = Array.from(carousel.children)

    Object.defineProperty(carousel, 'clientWidth', {
      configurable: true,
      value: 900,
    })
    Object.defineProperty(carousel, 'scrollWidth', {
      configurable: true,
      value: 2500,
    })
    Object.defineProperty(carousel, 'offsetLeft', {
      configurable: true,
      value: 0,
    })
    Object.defineProperty(carousel, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: 1605,
    })

    cards.forEach((card, index) => {
      Object.defineProperty(card, 'offsetLeft', {
        configurable: true,
        value: index * 500,
      })
      Object.defineProperty(card, 'clientWidth', {
        configurable: true,
        value: 420,
      })
    })

    fireEvent.scroll(carousel)

    expect(screen.getByRole('button', { name: 'Go to Practice' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

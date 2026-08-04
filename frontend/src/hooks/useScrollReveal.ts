import { useEffect, useRef } from 'react'

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = '0px 0px -6% 0px',
}: {
  threshold?: number
  rootMargin?: string
} = {}) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      el.classList.add('in')
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in')
          observer.unobserve(el)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(el)

    const timeout = setTimeout(() => {
      if (!el.classList.contains('in')) {
        observer.unobserve(el)
        el.classList.add('in')
      }
    }, 4000)

    return () => {
      observer.disconnect()
      clearTimeout(timeout)
    }
  }, [threshold, rootMargin])

  return ref
}

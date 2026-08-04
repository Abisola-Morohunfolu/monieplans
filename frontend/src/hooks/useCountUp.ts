import { useEffect, useRef, useState } from 'react'

export function useCountUp(
  target: number,
  suffix: string = '',
  duration: number = 1500,
  shouldAnimate: boolean = true,
): string {
  const [display, setDisplay] = useState(() => `${target.toLocaleString('en-US')}${suffix}`)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!shouldAnimate) {
      setDisplay(`${target.toLocaleString('en-US')}${suffix}`)
      return
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setDisplay(`${target.toLocaleString('en-US')}${suffix}`)
      return
    }

    let start: number | null = null

    function step(ts: number) {
      if (start === null) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(`${Math.round(target * eased).toLocaleString('en-US')}${suffix}`)
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [target, suffix, duration, shouldAnimate])

  return display
}

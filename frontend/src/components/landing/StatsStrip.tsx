import { useScrollReveal } from '../../hooks/useScrollReveal'
import { useCountUp } from '../../hooks/useCountUp'
import { useRef, useState, useEffect } from 'react'

function CountUpStat({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [animate, setAnimate] = useState(false)
  const display = useCountUp(value, suffix, 1500, animate)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setAnimate(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimate(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="font-heading text-[clamp(52px,5vw,72px)] font-medium tracking-[-0.02em] leading-none text-on-dark">
      {display}
    </div>
  )
}

export default function StatsStrip() {
  const leftRef = useScrollReveal<HTMLDivElement>()

  return (
    <section
      className="stats py-[88px]"
      style={{
        background: 'linear-gradient(135deg, var(--color-dark-1, #151812), var(--color-dark-2, #20251A) 46%, var(--color-dark-3, #2A3322))',
      }}
    >
      <div className="container inner grid md:grid-cols-[1.05fr_1.95fr] gap-16 items-center max-md:grid-cols-1 max-md:gap-11">
        {/* TODO: placeholder stats — replace with real product numbers before launch */}
        <div ref={leftRef} className="stats-copy reveal text-on-dark">
          <div className="eyebrow on-dark text-[11px] font-semibold tracking-[0.22em] uppercase text-sage">
            Honest mechanics
          </div>
          <p className="mt-[18px] text-[19px] text-on-dark-muted leading-[1.6]">
            Budgeting that works on real machinery — not vanity metrics.
          </p>
        </div>

        <div className="stats-row grid grid-cols-3 gap-7">
          <div className="stat reveal border-l border-[rgba(241,239,230,0.12)] pl-7">
            <CountUpStat value={40} suffix="+" />
            <div className="mt-3 text-[13.5px] text-on-dark-muted">
              Spending categories built in
            </div>
          </div>
          <div className="stat reveal border-l border-[rgba(241,239,230,0.12)] pl-7" style={{ transitionDelay: '100ms' } as React.CSSProperties}>
            <CountUpStat value={12} suffix="" />
            <div className="mt-3 text-[13.5px] text-on-dark-muted">
              Recurring bill types on autopilot
            </div>
          </div>
          <div className="stat reveal border-l border-[rgba(241,239,230,0.12)] pl-7" style={{ transitionDelay: '200ms' } as React.CSSProperties}>
            <CountUpStat value={9} suffix="" />
            <div className="mt-3 text-[13.5px] text-on-dark-muted">
              Bank statement formats read
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

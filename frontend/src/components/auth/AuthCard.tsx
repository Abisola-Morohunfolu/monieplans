import { useEffect, useRef, useState, type ReactNode } from 'react'

interface AuthCardProps {
  eyebrow: string
  title: ReactNode
  subtitle: string
  children: ReactNode
}

export function AuthCard({ eyebrow, title, subtitle, children }: AuthCardProps) {
  const [visible, setVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useRef(false)

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion.current) {
      setVisible(true)
      return
    }
    let raf1: number
    let raf2: number
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setVisible(true)
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [])

  return (
    <div className="relative min-h-screen flex items-center justify-center px-5 py-10 overflow-hidden bg-bg-base">
      <div
        className="absolute w-[520px] h-[520px] rounded-full blur-[48px] opacity-15 pointer-events-none"
        style={{
          top: -160,
          right: -140,
          background: 'radial-gradient(circle at center, var(--color-sage), transparent 62%)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute w-[520px] h-[520px] rounded-full blur-[48px] opacity-15 pointer-events-none"
        style={{
          bottom: -180,
          left: -140,
          background: 'radial-gradient(circle at center, var(--color-forest), transparent 62%)',
        }}
        aria-hidden="true"
      />

      <div
        ref={cardRef}
        className={`relative w-full max-w-[440px] bg-bg-card border border-text-primary/8 rounded-[26px] p-10 shadow-[0_30px_60px_-20px_rgba(23,21,18,0.35),0_8px_20px_-12px_rgba(59,75,52,0.25)] max-[480px]:p-7 transition-all duration-600 ease-[cubic-bezier(.22,1,.36,1)] ${
          visible ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-4 blur-[8px]'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <svg
            className="text-sage shrink-0"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
          <span className="font-[Cormorant_Garamond,Georgia,serif] text-[26px] font-medium leading-none -tracking-[0.01em] text-text-primary">
            MoniePlans
          </span>
        </div>

        <p className="mt-6 mb-2 text-center text-xs font-medium tracking-[0.22em] uppercase text-sage">
          {eyebrow}
        </p>

        <h1 className="m-0 text-center font-[Cormorant_Garamond,Georgia,serif] font-medium text-[28px] leading-tight -tracking-[0.01em] text-text-primary">
          {title}
        </h1>
        <p className="mt-2 text-center text-[13px] leading-relaxed text-text-secondary">
          {subtitle}
        </p>

        {children}
      </div>
    </div>
  )
}

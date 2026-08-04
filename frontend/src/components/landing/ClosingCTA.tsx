import { useScrollReveal } from '../../hooks/useScrollReveal';

export default function ClosingCTA() {
  const headingRef = useScrollReveal<HTMLHeadingElement>();

  return (
    <section
      className="closing relative text-center py-[116px] overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, var(--color-dark-1, #151812), var(--color-dark-2, #20251A) 50%, var(--color-dark-3, #2A3322))',
        color: 'var(--color-on-dark, #F1EFE6)',
      }}
      id="closing"
    >
      <div
        className="absolute w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(142,156,117,0.18), transparent 70%)',
          top: -220,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
        aria-hidden="true"
      />
      <div className="container inner relative z-[1]">
        <h2
          ref={headingRef}
          className="reveal-words text-[clamp(36px,4.6vw,60px)] text-white"
        >
          Start with{' '}
          <em className="italic text-sage font-heading">this month&apos;s</em>{' '}
          numbers.
        </h2>
        <p className="lead-light mx-auto mt-[22px] text-[17px] text-on-dark-muted max-w-[52ch]">
          Create a budget period in under a minute. No bank linking, no setup
          calls, no fine print.
        </p>
        <div className="closing-actions mt-[38px] flex gap-[14px] justify-center flex-wrap">
          <a className="btn-on-dark" href="#pricing">
            Start budgeting free
          </a>
        </div>
        <div className="closing-note mt-5 text-[13px] text-on-dark-muted">
          Free forever for one budget period.
        </div>
      </div>
    </section>
  );
}

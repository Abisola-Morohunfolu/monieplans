import { useScrollReveal } from '../../hooks/useScrollReveal';

export default function AISpotlight() {
  const cardRef = useScrollReveal<HTMLDivElement>();

  return (
    <section
      className="section-pad py-[104px]"
      style={{
        background: 'var(--color-bg-alt, #EDE8DD)',
      }}
      id="insights"
    >
      <div className="container ai-wrap grid md:grid-cols-[1.02fr_0.98fr] gap-16 items-center max-md:grid-cols-1 max-md:gap-12">
        <div className="ai-copy">
          <div className="eyebrow text-[11px] font-semibold tracking-[0.22em] uppercase text-text-secondary">
            AI recommendations
          </div>
          <h2 className="reveal mt-[18px]">
            Insights you can{' '}
            <em className="serif-em italic text-forest font-heading">
              actually
            </em>{' '}
            act on
          </h2>
          <p className="lead mt-[18px] text-[clamp(17px,1.6vw,19px)] text-text-secondary leading-[1.65] max-w-[58ch]">
            Upload a bank statement and MoniePlans reads it against your own
            history — then tells you what changed and what to do about it, in
            plain language.
          </p>

          <div className="ai-lists grid grid-cols-2 gap-8 mt-10 max-sm:grid-cols-1">
            <div className="ai-list">
              <h4 className="text-xs font-semibold tracking-[0.14em] uppercase text-text-secondary">
                What it does
              </h4>
              <ul className="mt-4 flex flex-col gap-3">
                <li className="flex gap-3 text-[14.5px] text-text-secondary leading-[1.55] items-start">
                  <span
                    className="w-[7px] h-[7px] rounded-[2px] bg-sage mt-2 flex-none"
                    aria-hidden="true"
                  />
                  Flags real changes against your own spending history
                </li>
                <li className="flex gap-3 text-[14.5px] text-text-secondary leading-[1.55] items-start">
                  <span
                    className="w-[7px] h-[7px] rounded-[2px] bg-sage mt-2 flex-none"
                    aria-hidden="true"
                  />
                  Suggests limits you can accept, edit, or ignore
                </li>
                <li className="flex gap-3 text-[14.5px] text-text-secondary leading-[1.55] items-start">
                  <span
                    className="w-[7px] h-[7px] rounded-[2px] bg-sage mt-2 flex-none"
                    aria-hidden="true"
                  />
                  Explains every number in plain language
                </li>
              </ul>
            </div>
            <div className="ai-list">
              <h4 className="text-xs font-semibold tracking-[0.14em] uppercase text-text-secondary">
                What it never does
              </h4>
              <ul className="mt-4 flex flex-col gap-3">
                <li className="flex gap-3 text-[14.5px] text-text-secondary leading-[1.55] items-start">
                  <span
                    className="w-[7px] h-[7px] rounded-[2px] bg-sage mt-2 flex-none"
                    aria-hidden="true"
                  />
                  Never trades, invests, or moves money for you
                </li>
                <li className="flex gap-3 text-[14.5px] text-text-secondary leading-[1.55] items-start">
                  <span
                    className="w-[7px] h-[7px] rounded-[2px] bg-sage mt-2 flex-none"
                    aria-hidden="true"
                  />
                  No credit scores or future predictions
                </li>
                <li className="flex gap-3 text-[14.5px] text-text-secondary leading-[1.55] items-start">
                  <span
                    className="w-[7px] h-[7px] rounded-[2px] bg-sage mt-2 flex-none"
                    aria-hidden="true"
                  />
                  No linking your bank account — ever
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* TODO: mock AI insight — replace with a real generated example before launch */}
        <div
          ref={cardRef}
          className="reveal insight-card relative rounded-[26px] p-10 shadow-[0_40px_90px_-40px_rgba(21,24,18,0.5)] overflow-hidden max-sm:p-8 max-sm:px-[26px]"
          style={{
            background:
              'linear-gradient(160deg, var(--color-dark-2, #20251A), var(--color-dark-3, #2A3322))',
            transitionDelay: '120ms',
          }}
        >
          <div
            className="absolute w-[340px] h-[340px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(185,106,74,0.22), transparent 70%)',
              top: -120,
              right: -120,
            }}
            aria-hidden="true"
          />
          <div className="ic-head flex items-center justify-between gap-3 relative z-[1] flex-wrap">
            <span className="ic-src text-[11.5px] tracking-[0.1em] uppercase text-on-dark-muted font-medium">
              From your statement &middot; May 2026
            </span>
            <span className="ic-badge text-[10px] font-bold tracking-[0.16em] uppercase text-bg-lightest bg-rust py-[6px] px-3 rounded-full">
              Insight
            </span>
          </div>
          <div className="ic-title font-heading text-[clamp(26px,2.6vw,34px)] font-medium tracking-[-0.01em] leading-[1.1] mt-6 text-on-dark text-balance">
            Dining is up 34% this month.
          </div>
          <p className="ic-body mt-[14px] text-[15px] leading-[1.65] text-on-dark/80 max-w-[44ch]">
            That&apos;s about &#8358;9,400 more than your three-month average. A
            weekly cap of &#8358;25,000 would bring you back in line by the end
            of the month.
          </p>
          <div className="ic-actions flex items-center gap-4 mt-7 relative z-[1]">
            <button className="ic-cta bg-bg-lightest text-forest font-semibold text-[14px] py-3 px-6 rounded-full hover:bg-on-dark transition-colors duration-200 cursor-pointer">
              Set the cap
            </button>
            <button className="ic-link text-on-dark-muted text-[14px] font-medium py-3 px-[6px] hover:text-on-dark transition-colors duration-200 cursor-pointer">
              Dismiss
            </button>
          </div>
          <div className="ic-foot mt-7 pt-4 border-t border-[rgba(241,239,230,0.12)] text-xs text-on-dark-muted relative z-[1]">
            Based on 214 transactions &middot; May 1–31, 2026
          </div>
        </div>
      </div>
    </section>
  );
}

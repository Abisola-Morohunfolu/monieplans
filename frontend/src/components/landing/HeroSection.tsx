import { Camera, FileText } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

export default function HeroSection() {
  const frameRef = useScrollReveal<HTMLDivElement>();
  const receiptRef = useScrollReveal<HTMLDivElement>({
    rootMargin: '0px 0px -6% 0px',
  });
  const statementRef = useScrollReveal<HTMLDivElement>({
    rootMargin: '0px 0px -6% 0px',
  });

  return (
    <section
      className="hero relative pt-[180px] pb-0 overflow-hidden"
      id="hero"
    >
      <div
        className="blob sage absolute rounded-full blur-[70px] pointer-events-none z-[0] w-[420px] h-[420px] bg-sage/30 top-[6%] -left-[120px]"
        aria-hidden="true"
      />
      <div
        className="blob forest absolute rounded-full blur-[70px] pointer-events-none z-[0] w-[480px] h-[480px] bg-forest/20 top-[20%] -right-[140px]"
        aria-hidden="true"
      />
      <div
        className="blob rust absolute rounded-full blur-[70px] pointer-events-none z-[0] w-[300px] h-[300px] bg-rust/14 bottom-[-30px] left-[38%]"
        aria-hidden="true"
      />

      <div className="container inner text-center flex flex-col items-center relative z-[1]">
        <h1 className="max-w-[650px] text-5xl md:text-7xl ">
          Budgets built from your{' '}
          <em className="serif-em italic text-forest font-heading">real</em>{' '}
          spending
        </h1>

        <p className="lead mt-[26px] mx-auto text-[clamp(16px,1.6vw,19px)] text-text-secondary leading-[1.65] max-w-[58ch]">
          Track every expense by hand or from a receipt, keep bills and savings
          goals on schedule, and get plain-language recommendations from your
          bank statements.
        </p>

        <div className="hero-actions flex gap-[14px] mt-[38px] flex-wrap justify-center">
          <a className="btn-primary" href="#pricing">
            Start budgeting free
          </a>
          <a className="btn-ghost" href="#how-it-works">
            See how it works
          </a>
        </div>

        {/* TODO: replace mock figures before launch */}
        <div className="app-wrap relative mt-[76px] pb-3 z-[1]">
          <div
            ref={frameRef}
            className="reveal app-frame relative rounded-[28px] bg-[rgba(247,244,237,0.82)] backdrop-blur-[20px] border border-text-primary/8 shadow-[0_40px_90px_-40px_rgba(21,24,18,0.4)] overflow-hidden"
          >
            <div className="frame-chrome flex items-center gap-[14px] py-4 px-[22px] border-b border-text-primary/10">
              <div className="dots flex gap-[7px]" aria-hidden="true">
                <i className="w-[11px] h-[11px] rounded-full bg-rust/75" />
                <i className="w-[11px] h-[11px] rounded-full bg-sage/85" />
                <i className="w-[11px] h-[11px] rounded-full bg-text-primary/10" />
              </div>
              <div className="frame-title text-[13px] font-semibold">
                MoniePlans
              </div>
              <div className="frame-chip ml-auto text-[12px] text-text-secondary border border-text-primary/10 py-[5px] px-3 rounded-full">
                August 2026
              </div>
            </div>
            <div className="frame-body grid grid-cols-[160px_1fr] max-md:grid-cols-1">
              <aside
                className="mock-side py-[22px] px-4 border-r border-text-primary/10 flex flex-col gap-1 max-md:hidden"
                aria-hidden="true"
              >
                {[
                  'Dashboard',
                  'Budget',
                  'Expenses',
                  'Bills',
                  'Goals',
                  'Statements',
                ].map((item, i) => (
                  <div
                    key={item}
                    className={`ms-item text-[12.5px] py-[9px] px-3 rounded-[9px] font-medium ${i === 0 ? 'active bg-forest/8 text-forest font-semibold' : 'text-text-secondary'}`}
                  >
                    {item}
                  </div>
                ))}
              </aside>
              <div className="mock-main p-[22px] flex flex-col gap-[18px]">
                <div className="mock-grid grid md:grid-cols-[1.15fr_1fr] gap-[18px] max-sm:grid-cols-1">
                  <div className="mock-card bg-bg-lightest border border-text-primary/6 rounded-2xl py-4 px-[18px] shadow-[0_10px_24px_-18px_rgba(21,24,18,0.25)]">
                    <div className="m-label text-[10.5px] font-semibold tracking-[0.14em] uppercase text-text-secondary">
                      Spent this month
                    </div>
                    <div className="m-big font-heading text-[34px] font-medium tracking-[-0.01em] mt-[6px] leading-none">
                      &#8358;260,500
                    </div>
                    <div className="m-sub text-[11.5px] text-text-secondary mt-[5px]">
                      of &#8358;350,000 budget &middot; 74%
                    </div>
                    <div className="m-progress h-[7px] rounded-full bg-text-primary/8 mt-3 overflow-hidden">
                      <span
                        style={{ width: '74%' }}
                        className="block h-full rounded-full bg-forest"
                      />
                    </div>
                    <div className="m-foot flex justify-between text-[11.5px] text-text-secondary mt-[10px]">
                      <span>Remaining</span>
                      <span className="m-foot-val text-text-primary font-semibold">
                        &#8358;89,500
                      </span>
                    </div>
                  </div>
                  <div className="mock-card bg-bg-lightest border border-text-primary/6 rounded-2xl py-4 px-[18px] shadow-[0_10px_24px_-18px_rgba(21,24,18,0.25)]">
                    <div className="m-label text-[10.5px] font-semibold tracking-[0.14em] uppercase text-text-secondary">
                      Emergency fund
                    </div>
                    <div className="m-big small font-heading text-[26px] font-medium tracking-[-0.01em] mt-[6px] leading-none">
                      &#8358;248,000
                    </div>
                    <div className="m-sub text-[11.5px] text-text-secondary mt-[5px]">
                      of &#8358;400,000 &middot; 62%
                    </div>
                    <div className="m-progress sage h-[7px] rounded-full bg-text-primary/8 mt-3 overflow-hidden">
                      <span
                        style={{ width: '62%' }}
                        className="block h-full rounded-full bg-sage"
                      />
                    </div>
                  </div>
                </div>
                <div className="mock-grid grid md:grid-cols-[1.15fr_1fr] gap-[18px] max-sm:grid-cols-1">
                  <div className="mock-card bg-bg-lightest border border-text-primary/6 rounded-2xl py-4 px-[18px] shadow-[0_10px_24px_-18px_rgba(21,24,18,0.25)]">
                    <div className="m-label text-[10.5px] font-semibold tracking-[0.14em] uppercase text-text-secondary">
                      Where it went
                    </div>
                    {[
                      { label: 'Rent', pct: 46, amt: '₦120k', cls: '' },
                      {
                        label: 'Groceries',
                        pct: 25,
                        amt: '₦64.5k',
                        cls: 'sage',
                      },
                      { label: 'Dining', pct: 14, amt: '₦36.8k', cls: 'alert' },
                      { label: 'Transport', pct: 11, amt: '₦28k', cls: '' },
                      {
                        label: 'Subscriptions',
                        pct: 4,
                        amt: '₦11.2k',
                        cls: 'sage',
                      },
                    ].map(({ label, pct, amt, cls }) => (
                      <div
                        key={label}
                        className="bar-row grid grid-cols-[88px_1fr_60px] items-center gap-[10px] mt-[9px]"
                      >
                        <span className="bar-label text-[11.5px] text-text-secondary">
                          {label}
                        </span>
                        <span className="bar-track h-[6px] rounded-full bg-text-primary/7">
                          <i
                            style={{ width: `${pct}%` }}
                            className={`block h-full rounded-full ${cls === 'sage' ? 'bg-sage' : cls === 'alert' ? 'bg-rust' : 'bg-forest'}`}
                          />
                        </span>
                        <span className="bar-value text-[11.5px] font-semibold text-right">
                          {amt}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mock-card insight bg-bg-lightest border border-rust/35 rounded-2xl py-4 px-[18px] shadow-[0_10px_24px_-18px_rgba(21,24,18,0.25)]">
                    <span className="insight-badge inline-flex items-center gap-[6px] text-[10px] font-bold tracking-[0.16em] uppercase text-bg-lightest bg-rust py-1 px-[10px] rounded-full">
                      Insight
                    </span>
                    <div className="insight-title font-heading text-[21px] font-medium tracking-[-0.01em] mt-[10px] leading-[1.15]">
                      Dining is up 34%.
                    </div>
                    <p className="insight-body text-xs text-text-secondary leading-[1.55] mt-[6px]">
                      About &#8358;9,400 above your three-month average. A
                      &#8358;25,000 weekly cap brings you back in line.
                    </p>
                    <div className="insight-actions flex gap-[14px] items-center mt-3">
                      <span className="insight-cta text-xs font-semibold text-bg-lightest bg-forest py-2 px-[15px] rounded-full cursor-pointer">
                        Set the cap
                      </span>
                    </div>
                    <div className="insight-note text-[10.5px] text-text-secondary mt-3">
                      From your statement &middot; 214 transactions
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            ref={receiptRef}
            className="reveal float-chip absolute z-[2] flex items-center gap-[10px] bg-[rgba(251,249,244,0.92)] backdrop-blur-[12px] border border-text-primary/8 rounded-[14px] py-3 px-4 shadow-[0_18px_40px_-20px_rgba(21,24,18,0.35)] text-[12.5px] font-medium receipt top-[-20px] right-[34px] max-sm:right-3 max-sm:top-[-16px]"
            style={{ transitionDelay: '120ms' }}
          >
            <span className="fc-icon w-[30px] h-[30px] rounded-[9px] grid place-items-center bg-forest text-bg-lightest">
              <Camera className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <b className="font-semibold">Receipt scanned</b>
              <small className="block text-text-secondary font-normal text-[11px] mt-px">
                &#8358;4,200 &middot; Café
              </small>
            </div>
          </div>

          <div
            ref={statementRef}
            className="reveal float-chip absolute z-[2] flex items-center gap-[10px] bg-[rgba(251,249,244,0.92)] backdrop-blur-[12px] border border-text-primary/8 rounded-[14px] py-3 px-4 shadow-[0_18px_40px_-20px_rgba(21,24,18,0.35)] text-[12.5px] font-medium statement bottom-[-18px] left-[36px] max-sm:hidden"
            style={{ transitionDelay: '200ms' }}
          >
            <span className="fc-icon w-[30px] h-[30px] rounded-[9px] grid place-items-center bg-forest text-bg-lightest">
              <FileText className="w-4 h-4" aria-hidden="true" />
            </span>
            <div>
              <b className="font-semibold">Statement uploaded</b>
              <small className="block text-text-secondary font-normal text-[11px] mt-px">
                214 transactions &middot; reading…
              </small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

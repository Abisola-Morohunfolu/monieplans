import { useRef } from 'react';
import SectionHeading from './SectionHeading';
import { Check, Camera, ChevronLeft, ChevronRight } from 'lucide-react';

export default function FeaturesCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollBy(dir: -1 | 1) {
    const el = trackRef.current;
    if (!el) return;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    el.scrollBy({
      left: el.clientWidth * 0.8 * dir,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }

  return (
    <section className="section-pad py-[104px] bg-bg-alt" id="features">
      <div className="container">
        <div className="features-head flex items-end justify-between gap-7 flex-wrap">
          <SectionHeading
            eyebrow="What's inside"
            heading={
              <>
                Everything a budget needs to{' '}
                <em className="serif-em italic text-forest font-heading">
                  stay real
                </em>
              </>
            }
          />
          <div
            className="carousel-nav flex gap-[10px]"
            aria-label="Scroll features"
          >
            <button
              className="cn-btn w-12 h-12 rounded-full border-[1.5px] border-text-primary/10 grid place-items-center text-text-primary hover:border-forest hover:bg-sage/12 hover:text-forest transition-colors duration-200"
              aria-label="Previous features"
              onClick={() => scrollBy(-1)}
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              className="cn-btn w-12 h-12 rounded-full border-[1.5px] border-text-primary/10 grid place-items-center text-text-primary hover:border-forest hover:bg-sage/12 hover:text-forest transition-colors duration-200"
              aria-label="Next features"
              onClick={() => scrollBy(1)}
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          ref={trackRef}
          className="features-track mt-12 grid grid-flow-col auto-cols-[minmax(300px,340px)] max-sm:auto-cols-[minmax(78vw,320px)] gap-[22px] overflow-x-auto scroll-snap-x scroll-px-2 pb-6"
        >
          {/* Budget Periods */}
          <article className="feature-card reveal scroll-snap-start bg-bg-card border border-text-primary/7 rounded-[26px] overflow-hidden flex flex-col shadow-[0_20px_44px_-30px_rgba(21,24,18,0.25)]">
            <div className="feature-thumb p-[26px_26px_0]">
              <div className="thumb aspect-[16/10] rounded-[18px] bg-bg-lightest border border-text-primary/6 overflow-hidden relative p-4 flex flex-col gap-2">
                <span className="t-label text-[9.5px] font-semibold tracking-[0.14em] uppercase text-text-secondary">
                  Budget period
                </span>
                <div className="t-chips flex gap-[6px] flex-wrap">
                  {['Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map((m, i) => (
                    <span
                      key={m}
                      className={`t-chip text-[10px] py-1 px-[9px] rounded-full border ${i === 2 ? 'on bg-forest text-bg-lightest border-forest font-semibold' : 'border-text-primary/10 text-text-secondary'}`}
                    >
                      {m}
                    </span>
                  ))}
                </div>
                <div className="ring-row flex items-center gap-[14px] mt-1">
                  <div
                    className="ring relative w-[60px] h-[60px] rounded-full flex-none grid place-items-center"
                    style={{
                      background:
                        'conic-gradient(var(--color-forest, #3B4B34) calc(74 * 1%), rgba(23,21,18,0.09) 0)',
                    }}
                  >
                    <div className="absolute w-[44px] h-[44px] rounded-full bg-bg-lightest" />
                    <span className="relative text-[11px] font-semibold z-[1]">
                      74%
                    </span>
                  </div>
                  <div className="ring-side">
                    <p className="text-[11px] text-text-secondary leading-[1.5]">
                      <b className="text-text-primary font-semibold">
                        &#8358;260,500
                      </b>{' '}
                      spent
                    </p>
                    <p className="text-[11px] text-text-secondary leading-[1.5]">
                      of &#8358;350,000 &middot; &#8358;89,500 left
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="feature-body p-[22px_26px_28px]">
              <h3 className="text-[20px]">Budget periods</h3>
              <p className="mt-2 text-[14.5px] text-text-secondary leading-[1.55]">
                Monthly cycles that reset cleanly, with a fresh total and
                per-category caps each time.
              </p>
            </div>
          </article>

          {/* Expense Tracking */}
          <article
            className="feature-card reveal scroll-snap-start bg-bg-card border border-text-primary/7 rounded-[26px] overflow-hidden flex flex-col shadow-[0_20px_44px_-30px_rgba(21,24,18,0.25)]"
            style={{ transitionDelay: '70ms' }}
          >
            <div className="feature-thumb p-[26px_26px_0]">
              <div className="thumb aspect-[16/10] rounded-[18px] bg-bg-lightest border border-text-primary/6 overflow-hidden relative p-4 flex flex-col gap-2">
                <span className="t-label text-[9.5px] font-semibold tracking-[0.14em] uppercase text-text-secondary">
                  Expense log
                </span>
                <div className="receipt bg-bg-lightest border border-dashed border-text-primary/22 rounded-xs py-3 px-[14px] text-[10.5px]">
                  <div className="r-shop flex justify-between font-semibold">
                    Café Sante{' '}
                    <em className="not-italic text-text-secondary font-normal">
                      12 Aug
                    </em>
                  </div>
                  <div className="r-line flex justify-between text-text-secondary mt-[6px]">
                    <span>Flat white</span>
                    <span>&#8358;2,400</span>
                  </div>
                  <div className="r-line flex justify-between text-text-secondary mt-[6px]">
                    <span>Croissant</span>
                    <span>&#8358;1,800</span>
                  </div>
                  <div className="r-total flex justify-between border-t border-dashed border-text-primary/10 mt-2 pt-2 font-semibold">
                    <span>Total</span>
                    <span>&#8358;4,200</span>
                  </div>
                  <div className="r-ocr mt-[9px] flex items-center gap-[7px] text-[10px] text-sage font-medium bg-sage/14 rounded-full py-[5px] px-[11px] w-max">
                    <Camera className="w-4 h-4" aria-hidden="true" />
                    OCR &middot; read from photo
                  </div>
                </div>
              </div>
            </div>
            <div className="feature-body p-[22px_26px_28px]">
              <h3 className="text-[20px]">Expense tracking</h3>
              <p className="mt-2 text-[14.5px] text-text-secondary leading-[1.55]">
                Manual entry for speed, receipt upload for accuracy — the
                amount, category, and date handled.
              </p>
            </div>
          </article>

          {/* Recurring Bills */}
          <article
            className="feature-card reveal scroll-snap-start bg-bg-card border border-text-primary/7 rounded-[26px] overflow-hidden flex flex-col shadow-[0_20px_44px_-30px_rgba(21,24,18,0.25)]"
            style={{ transitionDelay: '140ms' }}
          >
            <div className="feature-thumb p-[26px_26px_0]">
              <div className="thumb aspect-[16/10] rounded-[18px] bg-bg-lightest border border-text-primary/6 overflow-hidden relative p-4 flex flex-col gap-2">
                <span className="t-label text-[9.5px] font-semibold tracking-[0.14em] uppercase text-text-secondary">
                  Recurring bills
                </span>
                <div>
                  {[
                    { name: 'Rent', sub: 'due 1st', amt: '₦120k', warn: false },
                    {
                      name: 'Internet',
                      sub: 'due 9th',
                      amt: '₦25k',
                      warn: false,
                    },
                    {
                      name: 'Streaming',
                      sub: 'renews 14th',
                      amt: '₦4.9k',
                      warn: false,
                    },
                    {
                      name: 'Gym',
                      sub: 'renews 22nd',
                      amt: '₦12k',
                      warn: true,
                    },
                  ].map((b) => (
                    <div
                      key={b.name}
                      className="bill-row flex items-center gap-[9px] text-[10.5px] py-[7px] border-b border-dashed border-text-primary/10 last:border-b-0"
                    >
                      <span
                        className={`bill-dot w-[7px] h-[7px] rounded-full flex-none ${b.warn ? 'amber bg-rust' : 'bg-sage'}`}
                      />
                      <b className="font-semibold">{b.name}</b>
                      <span className="b-sub text-text-secondary font-normal">
                        {b.sub}
                      </span>
                      <span className="b-amt ml-auto font-semibold">
                        {b.amt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="feature-body p-[22px_26px_28px]">
              <h3 className="text-[20px]">Recurring bills</h3>
              <p className="mt-2 text-[14.5px] text-text-secondary leading-[1.55]">
                Every subscription and utility in one list, so nothing renews
                silently and surprises you.
              </p>
            </div>
          </article>

          {/* Savings Goals */}
          <article
            className="feature-card reveal scroll-snap-start bg-bg-card border border-text-primary/7 rounded-[26px] overflow-hidden flex flex-col shadow-[0_20px_44px_-30px_rgba(21,24,18,0.25)]"
            style={{ transitionDelay: '210ms' }}
          >
            <div className="feature-thumb p-[26px_26px_0]">
              <div className="thumb aspect-[16/10] rounded-[18px] bg-bg-lightest border border-text-primary/6 overflow-hidden relative p-4 flex flex-col gap-2">
                <span className="t-label text-[9.5px] font-semibold tracking-[0.14em] uppercase text-text-secondary">
                  Savings goals
                </span>
                {[
                  { name: 'Emergency fund', pct: 62, cls: '' },
                  { name: 'New laptop', pct: 30, cls: 'sage' },
                ].map((g) => (
                  <div key={g.name} className="goal mt-[9px]">
                    <div className="goal-head flex justify-between gap-[10px] text-[10.5px] text-text-secondary">
                      <b className="text-text-primary font-semibold">
                        {g.name}
                      </b>
                    </div>
                    <div className="goal-bar h-[6px] rounded-full bg-text-primary/8 mt-[5px] overflow-hidden">
                      <i
                        style={{ width: `${g.pct}%` }}
                        className={`block h-full rounded-full ${g.cls === 'sage' ? 'bg-sage' : 'bg-forest'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="feature-body p-[22px_26px_28px]">
              <h3 className="text-[20px]">Savings goals</h3>
              <p className="mt-2 text-[14.5px] text-text-secondary leading-[1.55]">
                Set a target, add to it from each budget period, and watch real
                progress against it.
              </p>
            </div>
          </article>

          {/* Bank Statements & AI */}
          <article
            className="feature-card gradient reveal scroll-snap-start overflow-hidden flex flex-col shadow-[0_20px_44px_-30px_rgba(21,24,18,0.25)]"
            style={{
              transitionDelay: '280ms',
              borderRadius: 26,
              border: '1px solid transparent',
              background:
                'linear-gradient(var(--color-bg-card, #F7F4ED), var(--color-bg-card, #F7F4ED)) padding-box, linear-gradient(135deg, rgba(185,106,74,0.5), rgba(142,156,117,0.5), rgba(59,75,52,0.55)) border-box',
            }}
          >
            <div className="feature-thumb p-[26px_26px_0]">
              <div className="thumb aspect-[16/10] rounded-[18px] bg-bg-lightest border border-text-primary/6 overflow-hidden relative p-4 flex flex-col gap-2">
                <span className="t-label text-[9.5px] font-semibold tracking-[0.14em] uppercase text-text-secondary">
                  Statement analysis
                </span>
                <div className="doc bg-bg-lightest border border-text-primary/8 rounded-xs py-3 px-[14px]">
                  <div className="doc-head flex items-center gap-2 text-[10.5px] font-semibold">
                    <Check className="w-4 h-4 text-sage" aria-hidden="true" />
                    statement_may.pdf
                  </div>
                  <div className="doc-meta text-[10px] text-text-secondary mt-[3px]">
                    214 transactions &middot; read successfully
                  </div>
                  <div
                    className="doc-line w90 h-[5px] rounded-full bg-text-primary/8 mt-[7px]"
                    style={{ width: '90%' }}
                  />
                  <div
                    className="doc-line w70 h-[5px] rounded-full bg-text-primary/8 mt-[7px]"
                    style={{ width: '70%' }}
                  />
                  <div
                    className="doc-line w55 h-[5px] rounded-full bg-text-primary/8 mt-[7px]"
                    style={{ width: '55%' }}
                  />
                  <div className="doc-insight mt-[10px] flex items-center gap-[7px] text-[10px] font-bold tracking-[0.08em] uppercase text-bg-lightest bg-rust rounded-full py-[5px] px-[11px] w-max">
                    Dining +34%
                  </div>
                </div>
              </div>
            </div>
            <div className="feature-body p-[22px_26px_28px]">
              <h3 className="text-[20px]">Bank statements &amp; AI</h3>
              <p className="mt-2 text-[14.5px] text-text-secondary leading-[1.55]">
                Upload a statement; get recommendations grounded in what you
                actually spent — never guesses.
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

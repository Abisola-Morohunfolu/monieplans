import { useScrollReveal } from '../../hooks/useScrollReveal'

export default function TestimonialSection() {
  const ref = useScrollReveal<HTMLDivElement>()

  return (
    <section className="section-pad py-[104px]">
      <div className="container testimonial reveal max-w-[820px] mx-auto text-center" ref={ref}>
        <span className="quote-mark font-heading text-[88px] leading-[0.4] text-sage/50 block" aria-hidden="true">
          &ldquo;
        </span>
        {/* TODO: placeholder testimonial — replace before launch */}
        <blockquote className="font-heading text-[clamp(26px,3vw,38px)] font-medium tracking-[-0.01em] leading-[1.3] text-balance mt-[22px]">
          I stopped guessing where the money went. MoniePlans showed me, in one month, what I&apos;d been ignoring for years.
        </blockquote>
        <div className="t-person flex items-center justify-center gap-[14px] mt-[34px]">
          <div className="t-avatar w-[52px] h-[52px] rounded-full bg-forest text-bg-lightest grid place-items-center font-semibold text-base" aria-hidden="true">
            AO
          </div>
          <div className="text-left">
            <div className="t-name font-semibold text-[15px]">Adaeze Okafor</div>
            <div className="t-role text-[13.5px] text-text-secondary mt-[2px]">
              Freelance designer &middot; Lagos
            </div>
          </div>
        </div>
        <div className="placeholder-note mt-[30px] inline-flex items-center gap-[7px] border border-dashed border-text-primary/10 rounded-full py-2 px-4 text-xs text-text-secondary">
          Placeholder — swap in a real quote before launch
        </div>
      </div>
    </section>
  )
}

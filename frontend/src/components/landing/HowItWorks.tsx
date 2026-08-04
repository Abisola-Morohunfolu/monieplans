import SectionHeading from './SectionHeading'

const steps = [
  {
    num: '01',
    title: 'Create a budget period',
    description: 'Pick a month, set a total, and split it across the categories that matter to you.',
  },
  {
    num: '02',
    title: 'Log your expenses',
    description: 'Type an expense in seconds, or snap a receipt and let the amount, category, and date be read for you.',
  },
  {
    num: '03',
    title: 'Bills & goals on autopilot',
    description: 'Recurring bills stay on schedule and savings goals track real progress, period after period.',
  },
  {
    num: '04',
    title: 'Upload a statement',
    description: 'Drop in a bank statement and get plain-language recommendations about where your money actually goes.',
  },
]

export default function HowItWorks() {
  return (
    <section className="section-pad py-[104px]" id="how-it-works">
      <div className="container">
        <SectionHeading
          eyebrow="How it works"
          heading={<>Four steps to a budget that <em className="serif-em italic text-forest font-heading">holds</em></>}
        />

        <div className="steps-wrap grid grid-cols-4 gap-7 mt-16 max-md:grid-cols-2 max-sm:grid-cols-1">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="step reveal border-t border-text-primary/10 pt-5"
              style={{ transitionDelay: `${i * 90}ms` } as React.CSSProperties}
            >
              <div className="step-num font-heading italic text-[clamp(46px,4.4vw,68px)] font-medium leading-none text-sage">
                {step.num}
              </div>
              <h3 className="mt-5 font-heading text-[22px] font-medium tracking-[-0.01em] leading-[1.2] text-balance">
                {step.title}
              </h3>
              <p className="mt-[10px] text-[15px] text-text-secondary leading-[1.6]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

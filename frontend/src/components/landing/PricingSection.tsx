import { useScrollReveal } from '../../hooks/useScrollReveal'
import SectionHeading from './SectionHeading'
import { Check } from 'lucide-react'

interface Plan {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  buttonClass: string
  featured: boolean
  badge?: string
}

const plans: Plan[] = [
  {
    name: 'Free',
    price: '₦0',
    period: '/ forever',
    description: 'For a first budget, tracked by hand.',
    features: [
      'One budget period at a time',
      'Manual expense entry',
      '1 savings goal',
      'Receipt scanning · 10 / month',
    ],
    cta: 'Start for free',
    buttonClass: 'btn-ghost',
    featured: false,
  },
  {
    name: 'Plus',
    price: '₦1,200',
    period: '/ month',
    description: 'The full picture — statements included.',
    features: [
      'Unlimited periods & goals',
      'Recurring bill tracking',
      'Bank statement uploads',
      'AI recommendations',
    ],
    cta: 'Start 30-day trial',
    buttonClass: 'btn-on-dark',
    featured: true,
    badge: 'Most popular',
  },
  {
    name: 'Family',
    price: '₦2,500',
    period: '/ month',
    description: 'Shared budgets for households that split things.',
    features: [
      'Up to 5 shared budgets',
      'Shared bills & splits',
      'Household reporting',
      'Priority support',
    ],
    cta: 'Start with family',
    buttonClass: 'btn-ghost',
    featured: false,
  },
]

function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  const ref = useScrollReveal<HTMLElement>()

  return (
    <article
      ref={ref}
      className={`plan reveal relative rounded-[26px] py-9 px-[30px] flex flex-col shadow-[0_20px_44px_-34px_rgba(21,24,18,0.28)] ${plan.featured ? 'featured' : 'bg-bg-card border border-text-primary/8'}`}
      style={{
        transitionDelay: `${index * 90}ms`,
        ...(plan.featured ? {
          background: 'linear-gradient(160deg, var(--color-dark-2, #20251A), var(--color-dark-3, #2A3322)) padding-box, linear-gradient(135deg, rgba(185,106,74,0.55), rgba(142,156,117,0.5), rgba(59,75,52,0.7)) border-box',
          border: '1px solid transparent',
          padding: '44px 32px',
        } : {}),
      } as React.CSSProperties}
    >
      {plan.badge && (
        <span className="pop-badge absolute top-[-14px] left-1/2 -translate-x-1/2 bg-forest text-bg-lightest text-[10.5px] font-bold tracking-[0.14em] uppercase py-[7px] px-4 rounded-full shadow-[0_10px_24px_-10px_rgba(21,24,18,0.5)] whitespace-nowrap">
          {plan.badge}
        </span>
      )}
      <div className={`plan-name text-xs font-bold tracking-[0.14em] uppercase ${plan.featured ? 'text-sage' : 'text-text-secondary'}`}>
        {plan.name}
      </div>
      <div className={`plan-price font-heading text-[50px] font-medium tracking-[-0.02em] mt-4 leading-none ${plan.featured ? 'text-on-dark' : ''}`}>
        {plan.price}
        <small className={`font-sans text-[14px] font-medium tracking-normal ${plan.featured ? 'text-on-dark-muted' : 'text-text-secondary'}`}>
          {plan.period}
        </small>
      </div>
      <p className={`plan-desc mt-2 text-[14.5px] min-h-[2.5em] ${plan.featured ? 'text-on-dark-muted' : 'text-text-secondary'}`}>
        {plan.description}
      </p>
      <ul className={`mt-[26px] pt-6 flex flex-col gap-[11px] ${plan.featured ? 'border-t border-[rgba(241,239,230,0.12)]' : 'border-t border-text-primary/10'}`}>
        {plan.features.map((f) => (
          <li key={f} className={`flex gap-[10px] text-[14px] items-start ${plan.featured ? 'text-on-dark' : 'text-text-primary'}`}>
            <Check className={`w-4 h-4 mt-[3px] ${plan.featured ? 'text-sage' : 'text-text-secondary'}`} aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>
      <div className="plan-cta mt-[30px]">
        <a
          className={`btn !w-full ${plan.buttonClass}`}
          href="#closing"
        >
          {plan.cta}
        </a>
      </div>
    </article>
  )
}

export default function PricingSection() {
  return (
    <section className="section-pad py-[104px] bg-bg-alt" id="pricing">
      <div className="container">
        <SectionHeading
          eyebrow="Simple pricing"
          heading={<>A plan for every kind of <em className="serif-em italic text-forest font-heading">budget</em></>}
          center
        />

        {/* TODO: placeholder pricing — confirm before launch */}
        <div className="plans mt-16 grid grid-cols-3 gap-[22px] items-stretch max-md:grid-cols-1 max-md:max-w-[480px] max-md:mx-auto">
          {plans.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

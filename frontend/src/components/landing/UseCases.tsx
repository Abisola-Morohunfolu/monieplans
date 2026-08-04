import SectionHeading from './SectionHeading'
import { TrendingUp, Users, RefreshCw } from 'lucide-react'

const cases = [
  {
    icon: TrendingUp,
    title: 'Freelancers with irregular income',
    description: 'Income lands unevenly, so the budget flexes: set aside in good months, protect the lean ones.',
    tags: ['Irregular income', 'Project work', 'Tax season'],
  },
  {
    icon: Users,
    title: 'Households sharing bills',
    description: 'One shared budget, bills split fairly, and a clear record of who paid what and when.',
    tags: ['Shared rent', 'Groceries', 'Utilities'],
  },
  {
    icon: RefreshCw,
    title: 'Anyone drowning in subscriptions',
    description: 'See every auto-renew at a glance and decide, calmly, what actually earns its keep.',
    tags: ['Streaming', 'SaaS', 'Memberships'],
  },
]

export default function UseCases() {
  return (
    <section className="section-pad py-[104px]" id="use-cases">
      <div className="container">
        <SectionHeading
          eyebrow="Made for real life"
          heading={<>Built for the way you <em className="serif-em italic text-forest font-heading">actually</em> spend</>}
        />

        <div className="cases mt-[60px] grid grid-cols-3 gap-6 max-md:grid-cols-1">
          {cases.map((c, i) => (
            <article
              key={c.title}
              className="case reveal bg-bg-card border border-text-primary/7 rounded-[26px] py-9 px-8 flex flex-col shadow-[0_20px_44px_-34px_rgba(21,24,18,0.28)]"
              style={{ transitionDelay: `${i * 90}ms` } as React.CSSProperties}
            >
              <div className="case-icon w-12 h-12 rounded-[14px] bg-text-primary text-bg-lightest grid place-items-center mb-6">
                <c.icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-[21px]">{c.title}</h3>
              <p className="mt-[10px] text-[15px] text-text-secondary leading-[1.6]">
                {c.description}
              </p>
              <div className="tags flex flex-wrap gap-2 mt-auto pt-[26px]">
                {c.tags.map((t) => (
                  <span key={t} className="tag text-[12.5px] text-text-secondary border border-text-primary/10 rounded-full py-[6px] px-[13px]">
                    {t}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

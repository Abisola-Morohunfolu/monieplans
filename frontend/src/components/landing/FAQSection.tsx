import { useState } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import SectionHeading from './SectionHeading';
import { ChevronDown } from 'lucide-react';

const faqItems = [
  {
    question: 'Is my bank data secure?',
    answer:
      'Statements are encrypted in transit, used only to build your insights, and never sold. You stay in control and can delete them at any time.',
  },
  {
    question: 'Which banks and statement formats are supported?',
    answer:
      "Nine formats today — PDF, CSV, QIF, OFX, MT940 and more from most Nigerian banks. If yours isn't supported, tell us and we'll prioritise it.",
  },
  {
    question: 'Do I need to upload a statement to use MoniePlans?',
    answer:
      'No. Manual tracking, bills, and goals all work without one. Uploads are optional — they simply unlock AI insights.',
  },
  {
    question: 'What does the AI actually recommend?',
    answer:
      'It compares your spending against your own history, flags real changes, and suggests limits or budget tweaks you can accept, edit, or ignore.',
  },
  {
    question: 'Can I use it without linking a bank account?',
    answer:
      "Yes — there's no account linking at all. You upload files or track manually; the app never touches your bank login.",
  },
];

export default function FAQSection() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const ref = useScrollReveal<HTMLDivElement>();

  function toggle(i: number) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <section className="section-pad py-[104px]" id="faq">
      <div className="container">
        <SectionHeading
          eyebrow="Questions"
          heading={
            <>
              Straight answers,{' '}
              <em className="serif-em italic text-forest font-heading">no</em>{' '}
              fine print
            </>
          }
          center
        />

        <div ref={ref} className="faq reveal max-w-[760px] mx-auto mt-[56px]">
          {faqItems.map((item, i) => {
            const isOpen = openItems.has(i);
            return (
              <div
                key={i}
                className={`faq-item border-b border-text-primary/10 ${i === 0 ? 'border-t' : ''} ${isOpen ? 'open' : ''}`}
              >
                <button
                  className="faq-btn w-full flex justify-between items-center gap-5 py-6 px-[2px] text-left text-[17px] font-semibold tracking-[-0.01em] leading-[1.4] cursor-pointer"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                >
                  {item.question}
                  <span
                    className={`chev flex-none w-10 h-10 rounded-full border border-text-primary/10 grid place-items-center transition-transform duration-300 ${isOpen ? 'rotate-180 !border-forest !bg-sage/12 !text-forest' : ''}`}
                  >
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  </span>
                </button>
                <div
                  className="faq-panel grid"
                  style={{
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                    transition:
                      'grid-template-rows .35s cubic-bezier(.22,.61,.36,1)',
                  }}
                >
                  <div className="overflow-hidden">
                    <p className="faq-ans pb-[26px] pr-11 pl-[2px] text-[15px] text-text-secondary leading-[1.7] max-w-[64ch]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

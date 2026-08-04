import { useScrollReveal } from '../../hooks/useScrollReveal';

interface SectionHeadingProps {
  eyebrow: string;
  heading: React.ReactNode;
  subtitle?: string;
  center?: boolean;
  dark?: boolean;
}

export default function SectionHeading({
  eyebrow,
  heading,
  subtitle,
  center = false,
  dark = false,
}: SectionHeadingProps) {
  const ref = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`reveal sec-head max-w-[720px] ${center ? 'mx-auto text-center' : ''}`}
    >
      <div
        className={`eyebrow text-[11px] font-semibold tracking-[0.22em] uppercase ${dark ? 'text-sage' : 'text-text-secondary'}`}
      >
        {eyebrow}
      </div>
      <h2 className="mt-[18px] text-5xl">{heading}</h2>
      {subtitle && (
        <p
          className={`mt-[18px] ${dark ? 'text-on-dark-muted' : 'text-text-secondary'}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function LandingFooter() {
  const footerLinks = {
    Product: [
      { href: '#features', label: 'Features' },
      { href: '#how-it-works', label: 'How it works' },
      { href: '#pricing', label: 'Pricing' },
      { href: '#closing', label: 'Changelog' },
    ],
    Resources: [
      { href: '#faq', label: 'Help center' },
      { href: '#insights', label: 'Statement formats' },
      { href: '#how-it-works', label: 'Guides' },
      { href: '#faq', label: 'Status' },
    ],
    Company: [
      { href: '#top', label: 'About' },
      { href: '#closing', label: 'Careers' },
      { href: '#faq', label: 'Privacy' },
      { href: '#faq', label: 'Terms' },
    ],
  }

  return (
    <footer
      className="site-footer py-20 pb-9 border-t border-[rgba(241,239,230,0.06)]"
      style={{
        background: 'var(--color-dark-1, #151812)',
        color: 'var(--color-on-dark, #F1EFE6)',
      }}
    >
      <div className="container">
        <div className="footer-grid grid grid-cols-[2.2fr_1fr_1fr_1fr] gap-12 max-md:grid-cols-2 max-md:gap-y-11">
          <div className="footer-brand">
            <a
              className="brand flex items-center gap-[11px] font-semibold text-[17px] tracking-[-0.01em] text-on-dark hover:no-underline"
              href="#top"
              aria-label="MoniePlans home"
            >
              <span
                className="brand-mark w-[34px] h-[34px] rounded-[10px] bg-bg-lightest text-forest grid place-items-center font-heading italic text-[20px] font-semibold"
                aria-hidden="true"
              >
                M
              </span>
              <span>MoniePlans</span>
            </a>
            <p className="text-on-dark-muted text-[14px] mt-4 max-w-[34ch]">
              Budgeting that understands your spending — built on real numbers, not hype.
            </p>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <nav key={title} className="footer-cols" aria-label={title}>
              <h4 className="text-xs font-semibold tracking-[0.14em] uppercase text-on-dark-muted mb-[18px]">
                {title}
              </h4>
              {links.map(({ href, label }) => (
                <a
                  key={label}
                  href={href}
                  className="block py-[6px] text-[14px] text-on-dark/70 hover:text-on-dark transition-colors duration-200"
                >
                  {label}
                </a>
              ))}
            </nav>
          ))}
        </div>

        <div className="footer-bottom mt-16 pt-[26px] border-t border-[rgba(241,239,230,0.08)] flex justify-between gap-4 flex-wrap text-[13px] text-on-dark-muted">
          <span>© 2026 MoniePlans. All figures on this page are placeholders pending launch.</span>
          <span>Made for people who track where the money goes.</span>
        </div>
      </div>
    </footer>
  )
}

import { useEffect, useState, useCallback } from 'react';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header
      className={`site-header fixed inset-x-0 top-0 z-[60] transition-all duration-300 ${scrolled ? 'scrolled' : ''}`}
    >
      <div
        className="container inner !mx-auto flex items-center justify-between gap-6"
        style={{ height: 76 }}
      >
        <a
          className="brand flex items-center gap-[11px] font-semibold text-[17px] tracking-[-0.01em] text-text-primary hover:no-underline"
          href="#top"
          aria-label="MoniePlans home"
        >
          <span
            className="brand-mark w-[34px] h-[34px] rounded-[10px] bg-forest text-bg-lightest grid place-items-center font-heading italic text-[20px] font-semibold"
            aria-hidden="true"
          >
            M
          </span>
          <span className="hidden md:inline">MoniePlans</span>
        </a>

        <nav
          className="nav hidden md:flex items-center gap-[30px]"
          aria-label="Primary"
        >
          {navLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-[14px] font-medium text-text-secondary hover:text-text-primary transition-colors duration-200"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            className="btn-ghost btn-sm hidden sm:inline-flex header-cta"
            href="#pricing"
          >
            Start budgeting
          </a>
          <button
            className="menu-toggle md:hidden w-[44px] h-[44px] rounded-[12px] border border-text-primary/10 grid place-items-center"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <nav
        id="mobile-menu"
        aria-label="Mobile"
        className={`mobile-menu md:hidden bg-[rgba(242,238,229,0.96)] backdrop-blur-[18px] border-b border-text-primary/10 px-6 pt-5 pb-[26px] ${mobileOpen ? 'open' : ''}`}
      >
        {navLinks.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            onClick={closeMobile}
            className="block py-[14px] text-[17px] font-medium border-b border-text-primary/10"
          >
            {label}
          </a>
        ))}
        <div className="mm-cta mt-5">
          <a className="btn-primary" href="#pricing" onClick={closeMobile}>
            Start budgeting free
          </a>
        </div>
      </nav>
    </header>
  );
}

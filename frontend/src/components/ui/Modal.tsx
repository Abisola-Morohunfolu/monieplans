import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({
  open,
  onClose,
  title = 'Details',
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    close = useRef(onClose),
    id = useId();
  close.current = onClose;
  useEffect(() => {
    if (!open || !ref.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const dialog = ref.current;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        close.current();
      }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (
          e.target === e.currentTarget &&
          (e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom)
        )
          close.current();
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Tab') return;
        const elements = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
          ),
        ).filter((el) => el.getClientRects().length > 0);
        const first = elements[0],
          last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      className={`expense-dialog ${maxWidth}`}
    >
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 id={id} className="text-xl font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => close.current()}
          className="icon-button"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

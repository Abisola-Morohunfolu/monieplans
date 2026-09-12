import { type ReactNode } from 'react'

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p
      className="mt-4 flex items-center justify-center gap-1.5 text-[13px] font-medium leading-relaxed text-rust"
      role="alert"
    >
      {children}
    </p>
  )
}

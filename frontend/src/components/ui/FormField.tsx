import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';
export function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const generated = useId(),
    child = isValidElement<{ id?: string; 'aria-describedby'?: string }>(
      children,
    )
      ? children
      : null,
    id = child?.props.id ?? generated;
  return (
    <div>
      <label
        htmlFor={id}
        className="block mb-1.5 text-sm font-medium text-text-secondary"
      >
        {label}
      </label>
      {child
        ? cloneElement(
            child as ReactElement<{ id?: string; 'aria-describedby'?: string }>,
            {
              id,
              'aria-describedby': hint
                ? `${generated}-hint`
                : child.props['aria-describedby'],
            },
          )
        : children}
      {hint && (
        <p
          id={`${generated}-hint`}
          className="mt-1 text-sm text-text-secondary"
        >
          {hint}
        </p>
      )}
    </div>
  );
}

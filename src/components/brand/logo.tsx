type LogoProps = {
  className?: string;
};

/** The Krąg mark: two white rings on a green circle, as in the prototype. */
export function Logo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <circle cx="24" cy="24" r="24" className="fill-brand" />
      <g fill="none" stroke="#fff" strokeWidth="2.4">
        <circle cx="24" cy="24" r="9.3" />
        <circle cx="24" cy="24" r="3.8" />
      </g>
    </svg>
  );
}

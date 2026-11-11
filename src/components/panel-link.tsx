import Link from "next/link";

type PanelLinkProps = {
  href: string;
  title: string;
  description: string;
};

/** A large, easy-to-tap card link with a title and a short description. */
export function PanelLink({ href, title, description }: PanelLinkProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-card border border-line bg-surface p-5 transition-colors hover:border-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="flex flex-1 flex-col gap-1">
        <span className="text-lg font-bold">{title}</span>
        <span className="text-muted">{description}</span>
      </span>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-6 shrink-0 text-brand transition-transform group-hover:translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}

import { Link } from "@/lib/i18n/navigation";

export interface Crumb {
  label: string;
  href: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={item.href} className="flex items-center gap-1">
            {i > 0 && (
              <span aria-hidden="true" className="inline-block rtl:-scale-x-100">
                ›
              </span>
            )}
            {i === items.length - 1 ? (
              <span className="text-ink font-medium">
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="hover:text-accent-strong">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";

export async function Pagination({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;
  const t = await getTranslations("pagination");

  // A path segment (not `?page=N`) so page 1 — the overwhelmingly common,
  // most-linked-to case — never touches `searchParams`, which would force
  // the whole route into fully dynamic (uncached) rendering in Next.js and
  // defeat the static/ISR tiering this site relies on at scale. Page 2+
  // gets its own path-param route instead, which stays cacheable too.
  const pageHref = (page: number) => (page <= 1 ? basePath : `${basePath}/page/${page}`);

  // Windowed page list: first, last, and a small range around current.
  const pages = new Set<number>([1, totalPages, currentPage]);
  for (let p = currentPage - 1; p <= currentPage + 1; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);

  const items: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) items.push("ellipsis");
    items.push(p);
    prev = p;
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 text-sm pt-4">
      <Link
        href={pageHref(Math.max(1, currentPage - 1))}
        aria-disabled={currentPage === 1}
        className={`px-3 py-1.5 rounded-lg border border-line ${ currentPage === 1 ? "pointer-events-none opacity-40" : "hover:border-accent"
        }`}
      >
        {t("prev")}
      </Link>
      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span key={`e${i}`} className="px-2 text-ink-subtle">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={pageHref(item)}
            aria-current={item === currentPage ? "page" : undefined}
            className={`px-3 py-1.5 rounded-lg border ${ item === currentPage
                ? "border-accent bg-accent text-white"
                : "border-line hover:border-accent"
            }`}
          >
            {item}
          </Link>
        )
      )}
      <Link
        href={pageHref(Math.min(totalPages, currentPage + 1))}
        aria-disabled={currentPage === totalPages}
        className={`px-3 py-1.5 rounded-lg border border-line ${ currentPage === totalPages ? "pointer-events-none opacity-40" : "hover:border-accent"
        }`}
      >
        {t("next")}
      </Link>
    </nav>
  );
}

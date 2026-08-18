"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import type { SearchResult } from "@/lib/data/search";

export function SearchBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const q = query.trim();
    // Clearing on a too-short query is handled in onChange (a real user
    // event), not here — an effect should only setState from a callback
    // reacting to an external change (the fetch response below), not
    // synchronously in the effect body.
    if (q.length < 2) return;
    const controller = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        // `Response.json()` types as `Promise<unknown>` — cast at the
        // source rather than annotating the next `.then`'s parameter,
        // which TS no longer back-infers from an unknown-typed promise.
        .then((r) => r.json() as Promise<{ results: SearchResult[] }>)
        .then((data) => {
          setResults(data.results);
          setOpen(true);
          setActiveIndex(-1);
        })
        .catch(() => {});
    }, 200); // debounce
    return () => {
      clearTimeout(id);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      go(results[activeIndex].href);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md mx-auto">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoFocus={autoFocus}
        value={query}
        aria-controls="search-results-listbox"
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          if (value.trim().length < 2) {
            setResults([]);
            setOpen(false);
          }
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={t("nav.searchPlaceholder")}
        className="w-full rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent"
      />
      {open && results.length > 0 && (
        <ul
          id="search-results-listbox"
          role="listbox"
          className="absolute z-10 mt-1 w-full rounded-lg border border-line bg-surface shadow-lg overflow-hidden"
        >
          {results.map((r, i) => (
            <li key={r.href}>
              <button
                type="button"
                onClick={() => go(r.href)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full text-start px-4 py-2 text-sm flex items-baseline justify-between gap-2 ${ i === activeIndex ? "bg-accent-tint" : ""
                }`}
              >
                <span>
                  {r.label}
                  {r.type === "country" && (
                    <span className="ms-1.5 text-xs text-ink-subtle">
                      {t("search.countryLabel")}
                    </span>
                  )}
                </span>
                <span className="text-ink-subtle text-xs shrink-0">{r.sublabel}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useLocale } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function switchTo(next: Locale) {
    setOpen(false);
    // `pathname` here is already locale-agnostic (next-intl's usePathname
    // strips the prefix), and router.replace re-adds the target locale's
    // prefix — the current country/state/city path segments are preserved
    // unchanged since place slugs don't vary by locale (plan §URL Structure).
    router.replace(pathname, { locale: next });
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="text-sm rounded-lg border border-line px-2.5 py-1.5 hover:border-accent"
      >
        {localeNames[locale as Locale]}
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute end-0 z-20 mt-1 max-h-80 w-48 overflow-y-auto rounded-lg border border-line bg-surface shadow-lg"
        >
          {locales.map((l) => (
            <li key={l}>
              <button
                type="button"
                role="option"
                aria-selected={l === locale}
                onClick={() => switchTo(l)}
                className={`w-full text-start px-3 py-2 text-sm ${ l === locale
                    ? "bg-accent-tint font-medium"
                    : "hover:bg-surface-band"
                }`}
              >
                {localeNames[l]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

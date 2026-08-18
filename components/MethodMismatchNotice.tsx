"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  METHOD_COOKIE,
  MADHAB_COOKIE,
  isValidMethod,
  isValidMadhab,
} from "@/lib/prayer-times/preferences";
import type { MethodKey, MadhabKey } from "@/lib/prayer-times/method-by-country";

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

/**
 * Reconciles the one place this page can visibly contradict itself.
 *
 * The times *table* is a client component that applies the visitor's
 * saved method/madhab override. The prose and FAQ are server-rendered
 * and deliberately use the country default, because reading the cookie
 * server-side would make every city page dynamic and forfeit ISR at
 * 34k-cities scale.
 *
 * Normally those agree. When a visitor has overridden the method they
 * disagree — observed live as the table showing Isha 8:07 PM while the
 * text below said 8:13 PM, with nothing explaining why. Rather than
 * silently leaving two different numbers on one page, say so.
 *
 * Renders nothing (the overwhelmingly common case) when no override is
 * set or it matches the page default.
 */
export function MethodMismatchNotice({
  defaultMethod,
  defaultMadhab,
}: {
  defaultMethod: MethodKey;
  defaultMadhab: MadhabKey;
}) {
  const t = useTranslations("methodNotice");
  const tMadhab = useTranslations("methodSelector");
  const [override, setOverride] = useState<{
    method: MethodKey;
    madhab: MadhabKey;
  } | null>(null);

  useEffect(() => {
    const m = readCookie(METHOD_COOKIE);
    const d = readCookie(MADHAB_COOKIE);
    const method = isValidMethod(m) ? m : defaultMethod;
    const madhab = isValidMadhab(d) ? d : defaultMadhab;
    const differs = method !== defaultMethod || madhab !== defaultMadhab;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cookies are only readable post-hydration; seeding from them once on mount is the point, not derived state
    setOverride(differs ? { method, madhab } : null);
  }, [defaultMethod, defaultMadhab]);

  if (!override) return null;

  return (
    <p
      role="status"
      className="rounded-lg border border-line bg-surface-band px-4 py-3 text-sm text-ink-muted"
    >
      {t("message", {
        selectedMethod: override.method,
        selectedMadhab: tMadhab(override.madhab),
        defaultMethod,
        defaultMadhab: tMadhab(defaultMadhab),
      })}
    </p>
  );
}

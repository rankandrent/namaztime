"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { METHOD_COOKIE, MADHAB_COOKIE, SELECTABLE_METHODS } from "@/lib/prayer-times/preferences";
import type { MethodKey, MadhabKey } from "@/lib/prayer-times/method-by-country";

function setCookie(name: string, value: string) {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${value}; path=/; max-age=${oneYear}; samesite=lax`;
}

export function MethodSelector({
  method,
  madhab,
  onChange,
  onChangeMadhab,
}: {
  method: MethodKey;
  madhab: MadhabKey;
  onChange: (method: MethodKey) => void;
  onChangeMadhab: (madhab: MadhabKey) => void;
}) {
  const t = useTranslations("methodSelector");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-accent-strong hover:underline"
      >
        {t("toggle")}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm rounded-lg border border-line px-4 py-3">
      <label className="flex items-center gap-2">
        {t("methodLabel")}
        <select
          value={method}
          onChange={(e) => {
            const next = e.target.value as MethodKey;
            setCookie(METHOD_COOKIE, next);
            onChange(next);
          }}
          className="rounded border border-line-strong bg-transparent px-2 py-1"
        >
          {SELECTABLE_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        {t("madhabLabel")}
        <select
          value={madhab}
          onChange={(e) => {
            const next = e.target.value as MadhabKey;
            setCookie(MADHAB_COOKIE, next);
            onChangeMadhab(next);
          }}
          className="rounded border border-line-strong bg-transparent px-2 py-1"
        >
          <option value="shafi">{t("shafi")}</option>
          <option value="hanafi">{t("hanafi")}</option>
        </select>
      </label>
    </div>
  );
}

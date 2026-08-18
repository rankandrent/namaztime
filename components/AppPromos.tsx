import { getTranslations, getLocale } from "next-intl/server";
import { PRAYER_APPS, RATINGS_CHECKED_ON } from "@/lib/data/apps";
import {
  GOOGLE_PLAY_BADGE_SRC,
  APP_STORE_BADGE_SRC,
  STORE_BADGE_ASPECT,
} from "@/lib/data/store-badges";
import { formatDate } from "@/lib/format";
import { DateTime } from "luxon";

/**
 * Site-wide recommendation block for the mobile prayer-time apps, one
 * hero card per app (screenshots + icon/rating/description/store links).
 *
 * `rel="sponsored nofollow noopener"` on every outbound link: this is
 * promotional placement repeated across ~650,000 pages, and a followed
 * site-wide link block at that scale is exactly the pattern Google
 * treats as a link scheme. `sponsored` is the correct annotation for
 * promotional links whether or not money changes hands.
 *
 * Icons/screenshots are hotlinked from Play's own CDN, not re-hosted —
 * see lib/data/apps.ts's file header for why. The store badges below are
 * local static assets (public/badges/) instead — see
 * lib/data/store-badges.ts for why that's a *different* tradeoff than
 * the icons/screenshots, not an inconsistency. Plain <img> throughout
 * rather than next/image: the icons/screenshots are external and
 * shouldn't go through Next's optimizer (see apps.ts), and the local
 * badge SVGs are two small, already-final vector files with nothing for
 * an image optimizer to usefully do.
 *
 * Server-rendered with no client JS — it appears on every page, so
 * anything it costs is paid 650,000 times over.
 */
export async function AppPromos() {
  const t = await getTranslations("apps");
  const locale = await getLocale();
  const checked = formatDate(DateTime.fromISO(RATINGS_CHECKED_ON), locale);

  return (
    <section
      aria-labelledby="app-promos-heading"
      className="border-t border-line pt-8 space-y-6"
    >
      <div>
        <h2
          id="app-promos-heading"
          className="text-lg font-semibold tracking-tight"
        >
          {t("heading")}
        </h2>
        <p className="text-sm text-ink-muted mt-1">{t("intro")}</p>
      </div>

      <ul className="space-y-4">
        {PRAYER_APPS.map((app) => (
          <li
            key={app.id}
            className="rounded-2xl border border-line bg-surface-band/60 p-5 sm:p-6"
          >
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:items-center">
              {/* Screenshot strip — scrolls horizontally; 3 landscape-crop
                  screenshots don't fit an ~420px column at any breakpoint,
                  so this stays scrollable rather than switching to
                  "visible" and spilling into the text column next to it. */}
              <div className="flex gap-2 overflow-x-auto">
                {app.screenshots.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element -- external, unoptimized by design; see file header
                  <img
                    key={src}
                    src={src}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    width={526}
                    height={296}
                    className="h-28 sm:h-32 w-auto shrink-0 rounded-lg border border-line object-cover"
                  />
                ))}
              </div>

              {/* Identity + rating + CTA */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external, unoptimized by design; see file header */}
                  <img
                    src={app.icon}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-xl border border-line"
                  />
                  <div>
                    <h3 className="font-semibold leading-snug">{app.name}</h3>
                    <p className="text-xs text-ink-muted">{app.developer}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span aria-hidden="true" className="text-warn">
                    ★
                  </span>
                  <span className="font-semibold tabular-nums">
                    {app.rating.toFixed(1)}
                  </span>
                  <span className="text-ink-muted text-xs">
                    {t("reviewCount", { count: app.reviews })}
                  </span>
                  <span
                    className="text-ink-subtle"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                  <span className="text-ink-muted text-xs">
                    {t("installs", { count: app.installs })}
                  </span>
                </div>

                <p className="text-sm text-ink-muted leading-relaxed">
                  {t(`descriptions.${app.id}`)}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href={app.playUrl}
                    target="_blank"
                    rel="sponsored nofollow noopener"
                    className="inline-block rounded-md opacity-90 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- local SVG, already minimal; next/image's raster pipeline needs dangerouslyAllowSVG for no benefit here */}
                    <img
                      src={GOOGLE_PLAY_BADGE_SRC}
                      alt={t("googlePlay")}
                      width={STORE_BADGE_ASPECT.width}
                      height={STORE_BADGE_ASPECT.height}
                      className="h-10 w-auto"
                    />
                  </a>
                  <a
                    href={app.appStoreUrl}
                    target="_blank"
                    rel="sponsored nofollow noopener"
                    className="inline-block rounded-md opacity-90 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- local SVG, already minimal; next/image's raster pipeline needs dangerouslyAllowSVG for no benefit here */}
                    <img
                      src={APP_STORE_BADGE_SRC}
                      alt={t("appStore")}
                      width={STORE_BADGE_ASPECT.width}
                      height={STORE_BADGE_ASPECT.height}
                      className="h-10 w-auto"
                    />
                  </a>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-ink-subtle">{t("ratingsNote", { date: checked })}</p>
    </section>
  );
}

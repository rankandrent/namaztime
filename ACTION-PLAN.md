# Strategic Action Plan: Traffic Recovery & Ranking Optimization

**Target Domain:** `https://maghrib-time.com`  
**Goal:** Restore Google search impressions, eliminate all 5xx/crawl errors, establish instant Cloudflare edge caching, and dominate high-volume prayer and Maghrib search queries.

---

## Roadmap Overview

```
[Phase 1: Emergency Infrastructure Fixes] ────► [Phase 2: Crawl Budget & Sitemap Control]
(Fix 307 ISR loop, Set-Cookie, DNS www, pagination)  (Stage sitemaps, fix canonicals, update lastmod)
                        │
                        ▼
[Phase 3: On-Page SEO & Search Intent] ────────► [Phase 4: Schema & Knowledge Graph]
(Target "Maghrib Time" & "Namaz", Hero Snippet)       (Organization schema, sameAs Wikidata links)
                        │
                        ▼
[Phase 5: Authority & Backlink Campaign] ──────► [Phase 6: GSC Recovery & Monitoring]
(Embeddable widget, Islamic directories, PR)          (Validate 5xx fixes, monitor crawl rate & impressions)
```

---

## Phase 1: Immediate Critical Infrastructure Fixes (0–48 Hours)

### 1.1 Fix the ISR Revalidation 307 Loop in `middleware.ts`
* **Root Cause:** Next.js App Router internal revalidation requests hit `HEAD /en/...` with headers `x-prerender-revalidate` and `x-isr: 1`. The `next-intl` middleware intercepts these and returns a 307 redirect to the bare path, causing OpenNext's Durable Object queue to fail and leave English pages permanently stale.
* **Action:** Update [middleware.ts](file:///Users/umar.sarwar/vibe%20codding/prayer%20time/middleware.ts) to bypass or rewrite internal ISR revalidation requests so Next.js can execute the route handler and return HTTP 200 with `x-nextjs-cache: REVALIDATED`:
  ```ts
  import createMiddleware from "next-intl/middleware";
  import { routing } from "./lib/i18n/routing";
  import { NextRequest, NextResponse } from "next/server";

  const intlMiddleware = createMiddleware(routing);

  export default function middleware(request: NextRequest) {
    // If this is an internal ISR revalidation request, bypass redirect to allow Next.js to render
    if (
      request.headers.get("x-isr") === "1" ||
      request.headers.has("x-prerender-revalidate")
    ) {
      return NextResponse.next();
    }
    return intlMiddleware(request);
  }
  ```

### 1.2 Unlock Cloudflare Edge CDN Caching by Disabling `Set-Cookie`
* **Root Cause:** `next-intl` sets `set-cookie: NEXT_LOCALE=en` on every response, which instructs Cloudflare Edge CDN to bypass caching for all HTML responses.
* **Action:** Update [lib/i18n/routing.ts](file:///Users/umar.sarwar/vibe%20codding/prayer%20time/lib/i18n/routing.ts) to set `localeCookie: false`:
  ```ts
  export const routing = defineRouting({
    locales,
    defaultLocale,
    localePrefix: "as-needed",
    localeDetection: false,
    localeCookie: false, // Prevents Set-Cookie on every request, unlocking Edge CDN caching
  });
  ```

### 1.3 Resolve `www.maghrib-time.com` DNS & Set Up 301 Permanent Redirect
* **Action in Cloudflare Dashboard:**
  1. Go to **DNS > Records**:
     - Type: `CNAME`
     - Name: `www`
     - Target: `maghrib-time.com`
     - Proxy status: `Proxied` (Orange cloud)
  2. Go to **Rules > Redirect Rules**:
     - Rule Name: `Redirect WWW to Apex`
     - When incoming requests match: `Hostname equals www.maghrib-time.com`
     - Action: `URL Redirect`
     - Type: `Permanent (301)`
     - Target URL: `https://maghrib-time.com` + `Preserve query string: Yes`

### 1.4 Add Metadata & Self-Referential Canonicals to Paginated State Pages
* **Root Cause:** [app/[locale]/[country]/[region]/page/[num]/page.tsx](file:///Users/umar.sarwar/vibe%20codding/prayer%20time/app/%5Blocale%5D/%5Bcountry%5D/%5Bregion%5D/page/%5Bnum%5D/page.tsx) currently has no `generateMetadata()` function, resulting in duplicate home page titles and missing canonical tags across hundreds of state paginated pages.
* **Action:** Add `generateMetadata()` in `RegionPageN`:
  ```tsx
  export async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string; country: string; region: string; num: string }>;
  }): Promise<Metadata> {
    const { locale, country: countrySlug, region: regionSlug, num } = await params;
    const country = await getCountryBySlug(countrySlug);
    if (!country) return {};
    const resolved = await resolveRegionOrCity(country.code, regionSlug);
    if (resolved.kind !== "state") return {};

    const t = await getTranslations({ locale, namespace: "state" });
    const stateName = admin1DisplayName(resolved.state, locale);
    const countryName = countryDisplayName(country, locale);
    const path = `/${country.slug}/${resolved.state.slug}/page/${num}`;

    return {
      title: `${t("metaTitle", { state: stateName, country: countryName })} — Page ${num}`,
      description: `${t("metaDescription", { state: stateName, country: countryName })} (Page ${num})`,
      alternates: buildAlternates(locale, path),
    };
  }
  ```

---

## Phase 2: Crawl Budget & Sitemap Restructuring (Days 2–5)

### 2.1 Stage the Sitemap to Align with Fresh Domain Authority
* **Current Issue:** Exposing 648,227 URLs immediately triggers crawl budget exhaustion on a new domain.
* **Action:** Update [scripts/build-sitemap-paths.ts](file:///Users/umar.sarwar/vibe%20codding/prayer%20time/scripts/build-sitemap-paths.ts) to re-enable tiered staging:
  - **Tier 1 (Immediate):** All 252 Countries + all ~3,800 States + Top 10,000 most populous global cities in the top 8 languages (~120,000 URLs).
  - State hub pages still link to all underlying cities, allowing Googlebot to discover the long-tail organically without forcing a 650k bulk indexing demand.
  - **Tier 2 (After 30 days of clean crawling):** Expand to top 25,000 cities.
  - **Tier 3:** Full long-tail once domain authority reaches DR 20+.

### 2.2 Fix Root URL Trailing Slash in Sitemap
* **Action:** In [lib/i18n/paths.ts](file:///Users/umar.sarwar/vibe%20codding/prayer%20time/lib/i18n/paths.ts), ensure the homepage canonical and sitemap URL match exactly:
  - If canonical emits `https://maghrib-time.com/`, sitemap must emit `https://maghrib-time.com/`.

### 2.3 Meaningful `lastmod` Generation
* **Action:** Update [scripts/build-sitemap-paths.ts](file:///Users/umar.sarwar/vibe%20codding/prayer%20time/scripts/build-sitemap-paths.ts) so that city pages reflect when their calculation parameters were established, and rebuild sitemaps weekly with updated build timestamps.

---

## Phase 3: On-Page SEO & Search Intent Dominance (Days 5–10)

### 3.1 Align Title Tags & H1 with Core Search Queries
* **Problem:** The domain is `maghrib-time.com`, but the city `H1` and `<title>` omit the terms **"Maghrib Time"** and **"Namaz"**.
* **Action:** Update translations in [messages/en.json](file:///Users/umar.sarwar/vibe%20codding/prayer%20time/messages/en.json) (and corresponding locale files):
  - **`city.heading`:** `Maghrib Time & Prayer Times in {city}, {country}`
  - **`city.headingWithState`:** `Maghrib Time & Prayer Times in {city}, {state}`
  - **`city.metaTitle`:** `{city} Maghrib Time Today — Prayer & Namaz Timings`
  - **`city.metaDescription`:** `Accurate Maghrib time today in {city}, {country}. Check Fajr, Dhuhr, Asr, Maghrib, and Isha namaz timings, Qibla direction, and monthly timetable.`

### 3.2 Add a Featured Snippet Hero Card for Maghrib Time
* **Action:** In [components/CityPageContent.tsx](file:///Users/umar.sarwar/vibe%20codding/prayer%20time/components/CityPageContent.tsx), add a high-visibility hero callout right below the `H1`:
  ```tsx
  <div className="rounded-2xl border border-accent/30 bg-accent-tint/40 p-5 text-center sm:text-left sm:flex sm:items-center sm:justify-between">
    <div>
      <span className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
        Today's Maghrib in {displayName}
      </span>
      <div className="text-3xl sm:text-4xl font-bold text-ink mt-1 font-mono">
        {formatTime(facts.times.maghrib, locale)}
      </div>
      <p className="text-xs text-ink-muted mt-1">
        Sunset & Iftar time on {formatDate(facts.date, locale)}
      </p>
    </div>
    <div className="mt-4 sm:mt-0 text-sm font-medium text-accent-strong">
      Next Prayer: {nextPrayerName} in {timeRemaining}
    </div>
  </div>
  ```

---

## Phase 4: Schema Markup & Knowledge Graph (Days 10–14)

### 4.1 Add Site-Wide `Organization` Schema
* **Action:** In [lib/seo/json-ld.ts](file:///Users/umar.sarwar/vibe%20codding/prayer%20time/lib/seo/json-ld.ts), add an `Organization` schema to establish the publisher entity:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://maghrib-time.com#organization",
    "name": "Maghrib Time",
    "url": "https://maghrib-time.com",
    "logo": "https://maghrib-time.com/favicon.ico",
    "description": "Global astronomical Islamic prayer times and Qibla direction service."
  }
  ```

### 4.2 Link Cities to Authoritative Knowledge Graph Entities (`sameAs`)
* **Action:** In `cityPlaceJsonLd`, add `sameAs` pointing to the official GeoNames entry:
  ```json
  "about": {
    "@type": "City",
    "@id": "https://maghrib-time.com/pakistan/punjab/prayer-times-lahore#place",
    "name": "Lahore",
    "sameAs": "https://www.geonames.org/1172451/"
  }
  ```

---

## Phase 5: Authority Building & Off-Page Acquisition (Weeks 3–8)

### 5.1 Embeddable Widget for Islamic Websites & Mosques
* **Action:** Create a standalone route `/embed/[country]/[city]` that serves a responsive, minimal 250px × 300px card displaying today's prayer times.
* Provide a "Get Widget for Your Website" modal with code:
  ```html
  <iframe src="https://maghrib-time.com/embed/pakistan/lahore" width="300" height="280" frameborder="0"></iframe>
  <p><a href="https://maghrib-time.com/pakistan/punjab/prayer-times-lahore">Lahore Prayer Times</a> by Maghrib Time</p>
  ```

### 5.2 Community Outreach & Directory Placement
* Submit to high-authority curated directories:
  - Product Hunt (Launch campaign as a clean, fast, ad-light Islamic prayer utility).
  - GitHub Open Source repository (share prayer time calculation logic or timezone handling).
  - Global Islamic software and community resource lists.

---

## Phase 6: Google Search Console Recovery & Verification (Post-Deploy)

1. **Deploy all Phase 1 fixes** to production using `npm run deploy`.
2. Open **Google Search Console**:
   - Navigate to **Indexing > Pages > Server error (5xx)**.
   - Click **Validate Fix** to trigger Google's automated re-crawl.
3. Use the **URL Inspection Tool** to inspect 5 high-priority city URLs (e.g. `/pakistan/punjab/prayer-times-lahore`, `/united-kingdom/england/prayer-times-london`).
   - Confirm **Test Live URL** returns HTTP 200 with today's fresh date and complete schema.
   - Click **Request Indexing**.
4. Re-submit `https://maghrib-time.com/sitemap_index.xml` in GSC under **Sitemaps**.
5. Monitor **Settings > Crawl stats** in GSC:
   - Ensure the average response time drops below 300ms.
   - Verify that 5xx errors decline to 0%.

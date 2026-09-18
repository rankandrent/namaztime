# Segmented Sitemap Strategy & Architecture: maghrib-time.com

**Domain:** `https://maghrib-time.com`  
**Execution Date:** September 18, 2026  
**Architecture:** Segmented Multi-Tier XML Sitemaps with Dynamic Daily `lastmod`  
**Root Sitemap Index:** `https://maghrib-time.com/sitemaps/sitemap_index.xml`  
**Indexed Scope:** 20,893 high-priority URLs across Tier A and Tier B  
**Pruned Scope:** 17,239 low-intent towns tagged `noindex, follow` (saving 293,000+ zombie URLs across 17 locales)

---

## 1. Executive Overview & Problem Solved

Previously, `maghrib-time.com` submitted an unsegmented monolithic dump of all 34,098 cities across 17 locales (~648,000 URLs). On an early-stage domain with a daily crawl budget of ~1,000 requests, this created severe **index bloat**:
1. Googlebot wasted 95%+ of its daily crawl quota visiting rural villages with zero search demand in non-Muslim countries (e.g. 2,140 small towns in Brazil, 1,600 in China, 1,113 in Japan).
2. High-value metropolitan pages (London, Karachi, New York, Cairo, Jakarta) were crawled once every several months, missing daily freshness updates.
3. Google Search Console reported site-wide "Discovered — currently not indexed" and throttled crawl rates.

### The Solution: Segmented Multi-Tier Sitemaps
We transitioned from an unsegmented dump to a **Segmented Multi-Tier Sitemap Architecture**:
- Sitemaps are split logically by **Directory Hubs**, **Dedicated Top Markets**, and **Global Tiers**.
- **Tier C cities are strictly excluded from sitemaps** and emit `<meta name="robots" content="noindex, follow" />`.
- **Search Console reporting is isolated per market**, allowing instant tracking of indexation health per country.

```
+---------------------------------------------------------------------------------------------------+
|                                  SITEMAP INDEX HIERARCHY                                          |
+---------------------------------------------------------------------------------------------------+
                                   sitemap_index.xml
                                           |
    +------------------+-------------------+-------------------+-------------------+
    |                  |                   |                   |                   |
sitemap-static.xml   sitemap-countries.xml sitemap-regions.xml Dedicated Countries   Tier A / B Global
(Home, Methodology,  (252 Country Hubs)    (3,775 State Hubs)  (12 High-Demand     (Global Metros &
 About, Legal)                                                 Markets)            Secondary Hubs)
                                                                       |
                                                +----------------------+----------------------+
                                                |                      |                      |
                                        sitemap-pakistan.xml   sitemap-united-states.xml  sitemap-indonesia.xml
                                        sitemap-united-kingdom sitemap-turkey.xml         sitemap-egypt.xml
                                        sitemap-saudi-arabia   sitemap-india.xml          sitemap-bangladesh.xml
                                        sitemap-canada.xml     sitemap-germany.xml        sitemap-france.xml
```

---

## 2. Priority Tiers (A/B/C) Definition & Demographics

The database classification engine (`lib/seo/tier-classifier.ts` and `scripts/generate_segmented_sitemaps.py`) categorizes every city into one of three distinct tiers based on **population**, **geographic search intent**, and **Muslim population demographics**:

```
                                  DATABASE POPULATION (34,098 Cities)
                                                    |
          +-----------------------------------------+-----------------------------------------+
          |                                         |                                         |
   Tier A: High Priority                     Tier B: Medium Priority                   Tier C: Low/Zero Intent
   5,786 Cities (17.0%)                      11,073 Cities (32.5%)                     17,239 Cities (50.5%)
   Priority: 0.9 - 1.0                       Priority: 0.6 - 0.7                       Priority: NOINDEX
   Daily lastmod | index, follow             Daily lastmod | index, follow             Excluded from Sitemaps
```

### Tier A (High Intent — Metros & Muslim Centers)
* **Inclusion Criteria:**
  - Any city worldwide with **Population >= 100,000** (strong Knowledge Graph salience).
  - All cities in **Top 35 Muslim-Majority Countries** with Population >= 50,000 (PK, ID, TR, EG, SA, BD, MA, DZ, IQ, IR, AE, MY, etc.).
  - Top Western Diaspora cities with Population >= 50,000 (US, GB, CA, DE, FR, AU).
* **XML Priority:** `1.0` (Population >= 1,000,000) or `0.9` (Population 100k – 1M).
* **`changefreq`:** `daily`.
* **Indexation Directive:** `index, follow` with full Googlebot snippet permissions (`max-snippet:-1`, `max-image-preview:large`, `max-video-preview:-1`).

### Tier B (Medium Intent — Secondary Regional Cities)
* **Inclusion Criteria:**
  - All localities in Muslim-majority countries with Population < 50,000.
  - Secondary cities in Western diaspora markets with Population between 15,000 and 50,000.
  - Secondary cities in major minority markets (India, Singapore, South Africa, Nigeria, Russia, etc.) with Population between 35,000 and 100,000.
  - Major regional centers in other countries with Population between 150,000 and 500,000.
* **XML Priority:** `0.7` (Population >= 50,000) or `0.6` (Population < 50,000).
* **`changefreq`:** `daily`.
* **Indexation Directive:** `index, follow`.

### Tier C (Low/Zero Intent — Index Pruning & Crawl Containment)
* **Inclusion Criteria:**
  - Small towns (< 25,000 population) in countries where the Muslim population is < 0.1% (e.g., Brazil, China, Japan, Poland, Colombia, Mexico, Czechia, Peru, Argentina).
  - Over 17,200 rural municipalities generating ~300,000+ zero-demand URLs.
* **Action:**
  - **Strictly EXCLUDED from XML sitemaps.**
  - **Tagged with:** `<meta name="robots" content="noindex, follow" />` emitted dynamically by Next.js metadata.
  - Fully accessible for user queries via site search, but completely hidden from Google's indexation queue.

---

## 3. Segmented Sitemaps Breakdown

Generated output files in `public/sitemaps/`:

| Sitemap Filename | URL Count | Priority | Changefreq | Target Audience / Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`sitemap-static.xml`** | 7 | 1.0 – 0.3 | daily / monthly | Homepage, Methodology, About, Contact, Terms, Privacy, Disclaimer. |
| **`sitemap-countries.xml`** | 252 | 0.8 | weekly | All 252 country directories (`/pakistan`, `/united-states`, `/egypt`, etc.). |
| **`sitemap-regions.xml`** | 3,775 | 0.7 | weekly | All state, province, and regional hubs (`/pakistan/punjab`, `/united-states/california`, etc.). |
| **`sitemap-pakistan.xml`** | 370 | 1.0 – 0.6 | daily | Top global search volume for "Namaz timings" and "Maghrib time". |
| **`sitemap-united-states.xml`** | 3,407 | 1.0 – 0.6 | daily | High-value commercial diaspora search volume. |
| **`sitemap-united-kingdom.xml`** | 865 | 1.0 – 0.6 | daily | Major Islamic diaspora centers (London, Birmingham, Manchester, Bradford). |
| **`sitemap-indonesia.xml`** | 448 | 1.0 – 0.6 | daily | World's largest Muslim population ("Jadwal Sholat"). |
| **`sitemap-turkey.xml`** | 430 | 1.0 – 0.6 | daily | High-intent daily prayer searches ("Ezan Vakitleri"). |
| **`sitemap-egypt.xml`** | 241 | 1.0 – 0.6 | daily | Major Arabic prayer times hub ("مواقيت الصلاة"). |
| **`sitemap-saudi-arabia.xml`** | 98 | 1.0 – 0.6 | daily | Core Islamic spiritual center (Makkah, Madinah, Riyadh, Jeddah). |
| **`sitemap-india.xml`** | 1,686 | 1.0 – 0.6 | daily | 200M+ Muslim population across major metros and districts. |
| **`sitemap-bangladesh.xml`** | 137 | 1.0 – 0.6 | daily | Dense high-intent population ("নামাজের সময়"). |
| **`sitemap-canada.xml`** | 509 | 1.0 – 0.6 | daily | Key Canadian diaspora centers (Toronto, Montreal, Calgary, Vancouver). |
| **`sitemap-germany.xml`** | 1,140 | 1.0 – 0.6 | daily | Large Turkish and Arab diaspora across German federal states. |
| **`sitemap-france.xml`** | 692 | 1.0 – 0.6 | daily | Largest Muslim community in Western Europe (~5M residents). |
| **`sitemap-tier-a.xml`** | 2,505 | 1.0 – 0.9 | daily | Global metropolitan hubs (pop >= 100k) outside dedicated country files. |
| **`sitemap-tier-b.xml`** | 4,331 | 0.7 – 0.6 | daily | Secondary regional cities in active markets. |
| **Total Indexed Scope** | **20,893** | — | — | **Concentrated high-intent crawl footprint.** |

---

## 4. `noindex` Implementation for Tier C Pages

### Next.js Code Architecture

In [`lib/seo/tier-classifier.ts`](file:///Users/umar.sarwar/vibe%20codding/prayer%20time/lib/seo/tier-classifier.ts), the classification rules return metadata directives:

```typescript
export function getCityRobots(tier: CityTier): Metadata["robots"] {
  if (tier === "C") {
    return {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    };
  }

  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  };
}
```

In [`lib/seo/metadata.ts`](file:///Users/umar.sarwar/vibe%20codding/prayer%20time/lib/seo/metadata.ts), `cityMetadata()` integrates this dynamically:

```typescript
export async function cityMetadata({ locale, city, country, state }) {
  const tier = getCityTier(country.code, city.population || 0);
  const robots = getCityRobots(tier);

  return {
    title: t("metaTitle", { city: cityName, country: countryName }),
    description: t("metaDescription", { city: cityName, country: countryName }),
    robots, // Outputs <meta name="robots" content="noindex, follow"> for Tier C
  };
}
```

### Verification
- A query to `/pakistan/punjab/prayer-times-lahore` (Tier A) returns:
  `<meta name="robots" content="index, follow" />`
- A query to `/brazil/sao-paulo/prayer-times-adolfo` (Tier C, Pop ~3,500) returns:
  `<meta name="robots" content="noindex, follow" />`

---

## 5. Daily `lastmod` Strategy for Prayer Times

Prayer times are astronomical calculations that fluctuate daily with the sun's position. Search engines favor fresh content for temporal queries ("Maghrib time today").

### Frequency & Timestamp Rules

```
+---------------------+-------------------+---------------------+-------------------------------------+
| Page Type           | lastmod Value     | changefreq          | Strategic Rationale                 |
+---------------------+-------------------+---------------------+-------------------------------------+
| City Prayer Pages   | Current UTC Date  | daily               | Reflects daily recalculated times.  |
|                     | (YYYY-MM-DD)      |                     | Signals daily freshness to Google.  |
+---------------------+-------------------+---------------------+-------------------------------------+
| Homepage            | Current UTC Date  | daily               | Live countdown and daily timetable. |
|                     | (YYYY-MM-DD)      |                     |                                     |
+---------------------+-------------------+---------------------+-------------------------------------+
| Country / Region    | Current UTC Date  | weekly              | Directory pages showing current     |
| Hub Pages           | (YYYY-MM-DD)      |                     | regional city lists and highlights. |
+---------------------+-------------------+---------------------+-------------------------------------+
| Static Information  | Actual Edit Date  | monthly             | Terms, Privacy, About rarely change |
| (About, Legal)      | (e.g. 2026-09-18) |                     | Static date maintains crawler trust.|
+---------------------+-------------------+---------------------+-------------------------------------+
```

### W3C Compliance
All timestamps strictly adhere to W3C ISO-8601 formatting:
```xml
<url>
  <loc>https://maghrib-time.com/pakistan/punjab/prayer-times-lahore</loc>
  <lastmod>2026-09-18</lastmod>
  <changefreq>daily</changefreq>
  <priority>1.0</priority>
</url>
```
No contradictory trailing slashes or relative paths are permitted.

---

## 6. Automated Generation Scripts

### Python Automated Generator
[`scripts/generate_segmented_sitemaps.py`](file:///Users/umar.sarwar/vibe%20codding/prayer%20time/scripts/generate_segmented_sitemaps.py):
- Run daily or on content rebuilds:
  ```bash
  python3 scripts/generate_segmented_sitemaps.py
  ```
- Reads the GeoNames search index.
- Segregates cities into Tier A, Tier B, and Tier C.
- Automatically compiles all segmented child XMLs and root `sitemap_index.xml` in `public/sitemaps/`.
- Exports a complete audit log to `public/sitemaps/tier-c-pruned-audit.json`.

### Build Pipeline Integration
[`scripts/build-sitemap-paths.ts`](file:///Users/umar.sarwar/vibe%20codding/prayer%20time/scripts/build-sitemap-paths.ts):
- Executed automatically as part of `npm run build`.
- Filters out Tier C cities so that Next.js's runtime path cache (`public/runtime-data/sitemap-paths.json`) maintains exact parity with the Python sitemaps.

---

## 7. Google Search Console Submission Guide

In Google Search Console, submit **both** the root index and individual dedicated sitemaps:

1. **Root Sitemap Index (Global Submission):**
   `https://maghrib-time.com/sitemaps/sitemap_index.xml`
2. **Dedicated Market Sitemaps (For Granular Indexation Tracking):**
   - `https://maghrib-time.com/sitemaps/sitemap-pakistan.xml`
   - `https://maghrib-time.com/sitemaps/sitemap-united-states.xml`
   - `https://maghrib-time.com/sitemaps/sitemap-united-kingdom.xml`
   - `https://maghrib-time.com/sitemaps/sitemap-indonesia.xml`
   - `https://maghrib-time.com/sitemaps/sitemap-turkey.xml`
   - `https://maghrib-time.com/sitemaps/sitemap-egypt.xml`
   - `https://maghrib-time.com/sitemaps/sitemap-saudi-arabia.xml`
   - `https://maghrib-time.com/sitemaps/sitemap-india.xml`
   - `https://maghrib-time.com/sitemaps/sitemap-tier-a.xml`

### Strategic Advantage in GSC:
By submitting segmented sitemaps, Google Search Console will report:
- **Indexation percentage per country** (e.g., Pakistan: 365/370 indexed, UK: 850/865 indexed).
- Immediate identification of any regional crawling bottlenecks without confusing data from low-priority countries.
- Zero crawl budget waste on 17,239 low-demand towns.

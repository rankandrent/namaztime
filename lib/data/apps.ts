/**
 * Third-party prayer-time apps we recommend, shown site-wide by
 * <AppPromos>.
 *
 * ## Why the ratings are static
 *
 * Google offers no public API for the rating of an app you don't own —
 * the Play Developer API only covers your own listings. The only way to
 * read another app's live rating is to scrape the store page, which
 * (a) is against Google's Terms of Service, and (b) breaks silently
 * whenever they change their markup, leaving wrong numbers on 650,000
 * pages. So these are recorded by hand and rendered with a visible
 * "as of" date, which is honest about what the reader is looking at.
 *
 * Refresh by opening each `playUrl`, reading the rating/reviews/installs
 * shown, and updating the figures plus RATINGS_CHECKED_ON below.
 *
 * ## Why the images are hotlinked from Google's CDN, not downloaded
 *
 * The icon and screenshot URLs point at `play-lh.googleusercontent.com`
 * — Google's own asset CDN for Play listings — rather than at files
 * copied into this repo. Three reasons, together:
 *   1. These are the developers' copyrighted assets; we have permission
 *      to *link to* their public listing, not to redistribute a copy.
 *   2. Google serves the bytes either way; hotlinking doesn't shift any
 *      bandwidth cost onto us at 650,000 pages, whereas re-hosting would.
 *   3. When a developer updates their screenshots, the hotlink updates
 *      with them automatically — a downloaded copy would silently go
 *      stale instead.
 *   The one real cost is that Google could rotate these path segments;
 *   if a card ever shows broken images, re-capture the URLs from the
 *   listing (og:image for the icon, the screenshot carousel for the
 *   rest) rather than assuming the component broke.
 */

export interface PrayerApp {
  id: string;
  /** App title as it appears on the store listing. */
  name: string;
  /** Publisher, as shown on the listing. */
  developer: string;
  playUrl: string;
  appStoreUrl: string;
  /** Play Store star rating, 0–5. */
  rating: number;
  /** Play Store review count, verbatim ("1.92M", "331K"). */
  reviews: string;
  /** Play Store install count, verbatim ("100M+"). */
  installs: string;
  /** Square app icon, hotlinked from Play's CDN — see file header. */
  icon: string;
  /** 2–4 screenshots from the listing's carousel, same CDN, same caveat. */
  screenshots: string[];
}

/** Date the figures below were last read off the Play Store listings. */
export const RATINGS_CHECKED_ON = "2026-08-16";

const CDN = "https://play-lh.googleusercontent.com";

export const PRAYER_APPS: PrayerApp[] = [
  {
    id: "athan",
    name: "Athan: Prayer Times & Al Quran",
    developer: "IslamicFinder.org",
    playUrl: "https://play.google.com/store/apps/details?id=com.athan",
    appStoreUrl:
      "https://apps.apple.com/us/app/athan-prayer-times-dua-azkar/id505858403",
    rating: 4.8,
    reviews: "331K",
    installs: "10M+",
    icon: `${CDN}/Nbx1ahl94L9V7i0xPT0nnHxv49gYm6ZvdSOabPZ9fvnu1EIyZ4Gr5XgYcL6UFOMuAPOdDWVyhXYk5yWeO6iY=w256-h256-rw`,
    screenshots: [
      `${CDN}/_r9w_rDoyhSvAKbZaKwXynLYXztN1R9klOIAY9e3IegPKPX0W1R_Qu_RadrV4qP-EKJCFpOhzMMOnvP9T7SCaw=w526-h296-rw`,
      `${CDN}/vQMzUn4Usg8NBdxsw9zd08YDhEQrTB8p_xLNBzQjiHNlNdzuFxiN9hgJQniL1wR5eUIw92dh-dcYmJ_qNUzg=w526-h296-rw`,
      `${CDN}/gkOrpMZwEDkY3dI42mzzCGulOJBBmUQ5Sk_AWaQi0Rr2gQofOAQ6Gd7XxLUh5SF5blJTBlzZkJYuW-De-6lh=w526-h296-rw`,
    ],
  },
  {
    id: "dawateislami",
    name: "Prayer Times - Qibla & Namaz",
    developer: "Dawat-e-Islami",
    playUrl: "https://play.google.com/store/apps/details?id=com.dawateislami.namaz",
    appStoreUrl: "https://apps.apple.com/pk/app/prayer-times-qibla-salah/id430204572",
    rating: 4.8,
    reviews: "153K",
    installs: "5M+",
    icon: `${CDN}/LUiRPSXxeT75JFcChcxz6l7ZU-ihZmY0h6AcGGBksIR8WN3LE6-P9blKE47E16vgWrBZdRDQ5TxgmXIb2U79Fg=w256-h256-rw`,
    screenshots: [
      `${CDN}/0cqp79r-_Vzm52d9HVzwjX7TijKiM8_BfKhPpaKa81ar2J7H_oaDLvUj9IWcrPrVkRpV_667SfkwWdy7FfDm=w526-h296-rw`,
      `${CDN}/R5wWGDDkGTr1HRtFtYJT3EUo1RBLPYmnG7Rb2t6FqJSA1u7bVoFdu_RWe195rkDX7pWZJBOyrSnHxhIsnWkZpS8=w526-h296-rw`,
      `${CDN}/wwR6ip8qtUd5LcddDotJj76EMcy-5mYMxMF2Q4DcZjxqyRpj27dcNdzd40XjteQob9mlVge5BAHzw7ZRbCmO=w526-h296-rw`,
    ],
  },
  {
    id: "muslimpro",
    name: "Muslim Pro: Quran Athan Prayer",
    developer: "Bitsmedia",
    playUrl:
      "https://play.google.com/store/apps/details?id=com.bitsmedia.android.muslimpro",
    appStoreUrl: "https://apps.apple.com/us/app/muslim-pro-quran-athan/id388389451",
    rating: 4.4,
    reviews: "1.92M",
    installs: "100M+",
    icon: `${CDN}/mD2Ynl51BEdwEezsHFLvv2iGQmUFN0e5_SCHT-FgCK_cmg9QU-cYkPhteRBqlgwqlZrQmtC8iu4sN_1Y3tpMWw=w256-h256-rw`,
    screenshots: [
      `${CDN}/eWIjoXtQITPPuOXGJp-H5aSrWILN55Dg8GssiALxlmT9uVi4FwGNCLwsvJrW2OImFhQqLFVHt93TiWjHzcUx7Q=w526-h296-rw`,
      `${CDN}/C4dwt5bKUSm8MqFdlrAaOLRHBbGJOhYf451a2Uoq4ze85GBis0vtGkB7BIrbUcKRD73-NhalW9b3j4wbR_Wk=w526-h296-rw`,
      `${CDN}/Knwcj5i6hgSYSGPXFxufUo9t3hVVVZM_DE0EvlnwexVSNukLvtyNfc11sfivUBSeTsXlW5k_xJgM69c-FhnGSJg=w526-h296-rw`,
    ],
  },
];

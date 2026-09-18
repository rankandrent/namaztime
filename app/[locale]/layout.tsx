import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { AppPromos } from "@/components/AppPromos";
import { SiteFooter } from "@/components/SiteFooter";
import { routing } from "@/lib/i18n/routing";
import { SITE_URL } from "@/lib/seo/site";
import { isRtl } from "@/lib/i18n/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const tNav = await getTranslations({ locale, namespace: "nav" });
  return {
    // metadataBase lets Next resolve relative URLs in metadata (OG images,
    // canonicals) against the real origin instead of localhost.
    metadataBase: new URL(SITE_URL),
    title: {
      // `default` is the home page's own title, already brand-led, so it
      // must not also take the suffix — hence `default` + `template`
      // rather than `absolute` repeated on every page.
      default: t("title"),
      template: `%s | ${tNav("siteName")}`,
    },
    description: t("description"),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enables static rendering for this locale's pages (next-intl needs to
  // know the request's locale during prerendering, not just at runtime).
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <SiteHeader />
          {children}
          {/* Site-wide, below the page's own content so it never
              outranks the prayer times someone actually came for. */}
          <div className="mx-auto w-full max-w-3xl px-4 pb-10">
            <AppPromos />
          </div>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

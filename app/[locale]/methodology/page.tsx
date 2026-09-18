import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { StaticPage, Section, Prose } from "@/components/legal/StaticPage";
import { buildAlternates } from "@/lib/seo/metadata";

const PATH = "/methodology";
const UPDATED = "2026-09-18";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === "ar";
  
  const title = isAr
    ? "منهجية حساب أوقات الصلاة والمصادر الفلكية — Maghrib Time"
    : "Prayer Times Calculation Methodology & Astronomical Standards — Maghrib Time";
  const description = isAr
    ? "شرح مفصل للمعادلات الفلكية والزوايا المعتمدة من الهيئات الإسلامية العالمية (أم القرى، كراتشي، رابطة العالم الإسلامي، إسنا) لحساب مواقيت الصلاة واتجاه القبلة بدقة."
    : "Detailed explanation of the astronomical formulas, solar depression angles, and fiqh conventions (Umm al-Qura, Karachi, ISNA, MWL) used to compute prayer times and Qibla bearings.";

  return {
    title,
    description,
    alternates: buildAlternates(locale, PATH),
  };
}

export default async function MethodologyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isAr = locale === "ar";

  if (isAr) {
    return (
      <StaticPage
        title="منهجية حساب مواقيت الصلاة"
        intro="المعايير الفلكية، المعادلات الرياضية، والهيئات الفقهية المعتمدة لحساب أوقات الصلاة واتجاه القبلة في منصة Maghrib Time."
        updatedIso={UPDATED}
        path={PATH}
      >
        <Section heading="١. المبادئ الفلكية والأساس العلمي">
          <Prose>
            لا تعتمد منصة Maghrib Time على جداول زمنية ثابتة أو تقريبية؛ بل نقوم بحساب مواقيت الصلاة لحظياً باستخدام معادلات الميكانيكا السماوية وموقع الشمس الظاهري لكل إحداثي جغرافي (خطوط الطول والعرض) والمنطقة الزمنية المحلية المعتمدة من قاعدة بيانات IANA.
          </Prose>
          <Prose>
            يتم تحديد وقت الزوال (الظهر) عندما تعبر الشمس خط الزوال السماوي للمدينة، في حين يتم حساب أوقات الفجر والعشاء وفقاً لزوايا انخفاض الشمس تحت الأفق الغربي والشرقي، ويُحسب وقت المغرب لحظة غروب الحافة العليا لقرص الشمس تماماً تحت الأفق الحقيقي مع مراعاة الانكسار الجوي (Atmospheric Refraction).
          </Prose>
        </Section>

        <Section heading="٢. الهيئات الفقهية والزوايا المعتمدة">
          <Prose>
            تختلف معايير تحديد وقتي الفجر والعشاء بين الهيئات الإسلامية الكبرى. نطبق تلقائياً المعيار المعتمد في كل دولة وفقاً للتالي:
          </Prose>
          <ul className="list-disc list-inside space-y-1 text-sm text-ink-muted ps-2">
            <li><strong>جامعة العلوم الإسلامية بكراتشي:</strong> الفجر ١٨°، العشاء ١٨° (معتمد في باكستان، الهند، بنغلاديش، وأفغانستان).</li>
            <li><strong>تقويم أم القرى (مكة المكرمة):</strong> الفجر ١٨.٥°، والعشاء ٩٠ دقيقة ثابتة بعد المغرب (١٢٠ دقيقة في شهر رمضان المبارك).</li>
            <li><strong>الجمعية الإسلامية لأمريكا الشمالية (ISNA):</strong> الفجر ١٥°، العشاء ١٥° (الولايات المتحدة الأمريكية وكندا).</li>
            <li><strong>رابطة العالم الإسلامي (MWL):</strong> الفجر ١٨°، العشاء ١٧° (أوروبا ومعظم دول العالم).</li>
            <li><strong>الهيئة المصرية العامة للمساحة:</strong> الفجر ١٩.٥°، العشاء ١٧.٥° (مصر، إفريقيا، وبلاد الشام).</li>
            <li><strong>رئاسة الشؤون الدينية التركية (Diyanet):</strong> الفجر ١٨°، العشاء ١٧° (تركيا وبلدان البلقان).</li>
            <li><strong>المجلس الإسلامي السنغافوري (MUIS):</strong> الفجر ٢٠°، العشاء ١٨° (سنغافورة، ماليزيا، وإندونيسيا).</li>
          </ul>
        </Section>

        <Section heading="٣. حساب وقت صلاة العصر (المذهب الشافعي والحنفي)">
          <Prose>
            يُحسب وقت دخول صلاة العصر عند الجمهور (الشافعية، المالكية، الحنابلة) عندما يصبح ظل كل شيء مثله مضافاً إليه ظل الزوال. وفي المذهب الحنفي يدخل الوقت عندما يصبح ظل الشيء مثليه مضافاً إليه ظل الزوال. تتيح منصتنا للمستخدمين في أي مدينة في العالم التبديل الفوري بين الموقفين بكل سهولة.
          </Prose>
        </Section>

        <Section heading="٤. حل مشكلة خطوط العرض العليا والمناطق القطبية">
          <Prose>
            في المدن الواقعة شمال دائرة عرض ٥٥° (مثل إسكندنافيا وشمال روسيا والمملكة المتحدة خلال فصل الصيف)، قد لا تختفي الشفق الفلكي ليلاً مما يجعل حساب الفجر والعشاء بالطرق التقليدية متعذراً. نطبق في هذه الحالات قاعدة «أقرب البلاد» (Aqrab al-Balad) وفقاً لقرارات مجمع الفقه الإسلامي الدولي، مع تنبيه الزائر بشفافية عند تطبيق هذا التعديل.
          </Prose>
        </Section>

        <Section heading="٥. اتجاه القبلة والمسافة إلى الكعبة المشرفة">
          <Prose>
            يتم حساب زاوية القبلة باستخدام معادلة الدائرة العظمى (Great-Circle Bearing) بين إحداثيات المدينة وإحداثيات الكعبة المشرفة في المسجد الحرام (٢١.٤٢٢٥° شمالاً، ٣٩.٨٢٦٢° شرقاً). الزاوية المعروضة مقاسة من الشمال الجغرافي الحقيقي (True North).
          </Prose>
        </Section>

        <Section heading="٦. فريق العمل والاعتمادية (E-E-A-T)">
          <Prose>
            يتم فحص وتدقيق الخوارزميات الحسابية ومقارنتها دورياً مع المخرجات الرسمية للمراصد الفلكية الدولية، ومطابقتها مع التقاويم المطبوعة في العواصم الإسلامية الكبرى. مع ذلك، نؤكد دائماً أن الحسابات الفلكية هي أداة إرشادية، ويُنصح دائماً بمتابعة مواعيد الإقامة والأذان في المسجد المحلي.
          </Prose>
        </Section>
      </StaticPage>
    );
  }

  return (
    <StaticPage
      title="Prayer Times Calculation Methodology"
      intro="The astronomical mechanics, solar algorithms, and international fiqh authorities that govern prayer times on Maghrib Time."
      updatedIso={UPDATED}
      path={PATH}
    >
      <Section heading="1. Astronomical Foundations & Principles">
        <Prose>
          Maghrib Time does not rely on static lookup tables or generalized estimates. Every prayer time is calculated on demand using celestial mechanics, the Earth&apos;s axial tilt, orbital eccentricity, and the exact coordinates (latitude and longitude) of each city, converted into its native IANA timezone.
        </Prose>
        <Prose>
          Solar noon (Dhuhr) is determined at the moment the sun transits the local celestial meridian. Maghrib begins at the exact second the upper limb of the solar disk sets beneath the astronomical horizon, incorporating atmospheric refraction correction (-0.833°).
        </Prose>
      </Section>

      <Section heading="2. Recognized Fiqh Authorities & Twilight Angles">
        <Prose>
          The onset of Fajr (true dawn / Subh Sadiq) and Isha depends on the angle of solar depression below the horizon. Different Islamic jurisdictions apply criteria based on historical observation and institutional rulings:
        </Prose>
        <ul className="list-disc list-inside space-y-1.5 text-sm text-ink-muted ps-2">
          <li><strong>University of Islamic Sciences, Karachi:</strong> Fajr 18.0°, Isha 18.0° (Standard in Pakistan, India, Bangladesh, Afghanistan).</li>
          <li><strong>Umm al-Qura University, Makkah:</strong> Fajr 18.5°, Isha 90 min after Maghrib (120 min during Ramadan) (Saudi Arabia, Arabian Peninsula).</li>
          <li><strong>Islamic Society of North America (ISNA):</strong> Fajr 15.0°, Isha 15.0° (United States and Canada).</li>
          <li><strong>Muslim World League (MWL):</strong> Fajr 18.0°, Isha 17.0° (Europe, Far East, and international default).</li>
          <li><strong>Egyptian General Authority of Survey:</strong> Fajr 19.5°, Isha 17.5° (Egypt, Middle East, North/East Africa).</li>
          <li><strong>Diyanet İşleri Başkanlığı:</strong> Fajr 18.0°, Isha 17.0° (Turkey, Azerbaijan, Balkans).</li>
          <li><strong>Majlis Ugama Islam Singapura (MUIS):</strong> Fajr 20.0°, Isha 18.0° (Singapore, Malaysia, Brunei, Indonesia).</li>
        </ul>
      </Section>

      <Section heading="3. Asr Shadow Calculations (Shafi vs. Hanafi)">
        <Prose>
          The Jumhur (Shafi, Maliki, and Hanbali schools of law) define Asr as the moment an object&apos;s shadow equals its midday length plus the length of the object itself (1x shadow ratio). The Hanafi school defines Asr when the shadow equals twice the object&apos;s length plus its midday shadow (2x shadow ratio). Our system applies the regional default for each country and provides an instant one-click selector for visitor preference.
        </Prose>
      </Section>

      <Section heading="4. Polar Circle Resolution & High-Latitude Rules">
        <Prose>
          At latitudes beyond 55° N or S during summer months, the sun may remain close to the horizon throughout the night, preventing astronomical twilight from ever occurring. Under standard calculations, this returns unresolved or NaN times.
        </Prose>
        <Prose>
          In accordance with the resolutions of the International Islamic Fiqh Academy and the European Council for Fatwa and Research, our platform applies the <em>Aqrab al-Balad</em> (&quot;nearest locality&quot;) resolution for affected polar dates, computing times based on the nearest latitude where the sun sets normally and disclosing this adjustment clearly on the page.
        </Prose>
      </Section>

      <Section heading="5. Qibla Bearing & Great-Circle Geodesics">
        <Prose>
          The Qibla direction from any city to the Holy Kaaba in Makkah (21.4225° N, 39.8262° E) is computed using the forward azimuth of the great-circle geodesic (orthodromic bearing). The bearing is expressed relative to true geographic north. Users utilizing magnetic compasses are reminded to account for local magnetic declination.
        </Prose>
      </Section>

      <Section heading="6. Editorial Review, Accuracy & Credentials">
        <Prose>
          Our calculation pipeline leverages the tested, peer-reviewed Adhan astronomical library combined with high-precision time resolution via Luxon and SRTM Digital Elevation Models. Calculations are verified continuously against published mosque timetables in major global capitals. Believers are always reminded that astronomical calculations serve as an essential guide, but congregational prayer schedules (Iqamah) announced by local masjids take precedence.
        </Prose>
      </Section>
    </StaticPage>
  );
}

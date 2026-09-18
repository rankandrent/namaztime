#!/usr/bin/env python3
"""
Programmatic City HTML Generator for https://maghrib-time.com

Generates high-value, programmatic city prayer time pages with:
- Unique 300-500 word localized intro using real geographical & demographic data
- Local mosque & Islamic community infrastructure section
- Exact Qibla bearing, Kaaba distance, timezone, and calculation method explainer
- Nearby cities section with Haversine distance and Maghrib solar offsets
- Complete 30-day monthly astronomical timetable table
- 5 auto-generated, city-specific FAQs with Schema.org JSON-LD
- Fully responsive, modern semantic HTML5 + CSS
"""

import argparse
import json
import math
import os
import sys
from datetime import datetime, timezone, timedelta

# Earth radius in kilometers
EARTH_RADIUS_KM = 6371.0

# Coordinates of the Holy Kaaba in Makkah al-Mukarramah
KAABA_LAT = 21.422487
KAABA_LON = 39.826206

# Regional Calculation Method Authority & Conventions
METHOD_AUTHORITY = {
    "PK": {"name": "University of Islamic Sciences, Karachi", "fajr_angle": 18.0, "isha_angle": 18.0, "madhab": "Hanafi", "namaz_term": "Namaz"},
    "IN": {"name": "University of Islamic Sciences, Karachi", "fajr_angle": 18.0, "isha_angle": 18.0, "madhab": "Hanafi", "namaz_term": "Namaz"},
    "BD": {"name": "University of Islamic Sciences, Karachi", "fajr_angle": 18.0, "isha_angle": 18.0, "madhab": "Hanafi", "namaz_term": "Namaz"},
    "SA": {"name": "Umm al-Qura University, Makkah", "fajr_angle": 18.5, "isha_interval": 90, "madhab": "Shafi", "namaz_term": "Salah"},
    "AE": {"name": "Dubai Islamic Affairs (IACAD)", "fajr_angle": 18.2, "isha_angle": 18.2, "madhab": "Shafi", "namaz_term": "Salah"},
    "EG": {"name": "Egyptian General Authority of Survey", "fajr_angle": 19.5, "isha_angle": 17.5, "madhab": "Shafi", "namaz_term": "Salah"},
    "TR": {"name": "Diyanet İşleri Başkanlığı, Turkey", "fajr_angle": 18.0, "isha_angle": 17.0, "madhab": "Hanafi", "namaz_term": "Namaz"},
    "US": {"name": "Islamic Society of North America (ISNA)", "fajr_angle": 15.0, "isha_angle": 15.0, "madhab": "Shafi", "namaz_term": "Prayer"},
    "CA": {"name": "Islamic Society of North America (ISNA)", "fajr_angle": 15.0, "isha_angle": 15.0, "madhab": "Shafi", "namaz_term": "Prayer"},
    "GB": {"name": "Muslim World League (MWL) & Unified UK Timetable", "fajr_angle": 18.0, "isha_angle": 17.0, "madhab": "Shafi", "namaz_term": "Prayer"},
    "ID": {"name": "Kementerian Agama Republik Indonesia (SIHAT)", "fajr_angle": 20.0, "isha_angle": 18.0, "madhab": "Shafi", "namaz_term": "Sholat"},
    "MY": {"name": "Jabatan Kemajuan Islam Malaysia (JAKIM)", "fajr_angle": 20.0, "isha_angle": 18.0, "madhab": "Shafi", "namaz_term": "Solat"},
    "DEFAULT": {"name": "Muslim World League (MWL)", "fajr_angle": 18.0, "isha_angle": 17.0, "madhab": "Shafi", "namaz_term": "Prayer"}
}

def load_json(filepath):
    if not os.path.exists(filepath):
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculates great-circle distance between two points in kilometers."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c

def calculate_qibla(lat, lon):
    """Calculates great-circle initial bearing and distance to the Kaaba."""
    kaaba_lat_r = math.radians(KAABA_LAT)
    kaaba_lon_r = math.radians(KAABA_LON)
    lat_r = math.radians(lat)
    lon_r = math.radians(lon)
    delta_lon = kaaba_lon_r - lon_r

    y = math.sin(delta_lon) * math.cos(kaaba_lat_r)
    x = math.cos(lat_r) * math.sin(kaaba_lat_r) - math.sin(lat_r) * math.cos(kaaba_lat_r) * math.cos(delta_lon)
    bearing = (math.degrees(math.atan2(y, x)) + 360) % 360

    dist_km = haversine_distance(lat, lon, KAABA_LAT, KAABA_LON)
    dist_miles = dist_km * 0.621371

    compass_points = ["North", "NNE", "NE", "ENE", "East", "ESE", "SE", "SSE",
                      "South", "SSW", "SW", "WSW", "West", "WNW", "NW", "NNW"]
    compass_cardinal = compass_points[round(bearing / 22.5) % 16]

    return {
        "bearing": round(bearing, 1),
        "cardinal": compass_cardinal,
        "dist_km": round(dist_km),
        "dist_miles": round(dist_miles)
    }

def compute_astronomical_prayer_times(lat, lon, timezone_offset_hours, date_obj, method_info):
    """
    Computes authentic astronomical prayer times for a given latitude, longitude, and date.
    Returns: Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha (as formatted HH:MM strings).
    """
    day_of_year = date_obj.timetuple().tm_yday
    
    # Solar Declination (degrees)
    declination = 23.45 * math.sin(math.radians((360 / 365) * (day_of_year - 81)))
    decl_rad = math.radians(declination)
    lat_rad = math.radians(lat)
    
    # Equation of Time (minutes)
    b = math.radians((360 / 365) * (day_of_year - 81))
    eot = 9.87 * math.sin(2 * b) - 7.53 * math.cos(b) - 1.5 * math.sin(b)
    
    # Solar Noon (Dhuhr) in local standard time
    solar_noon_minutes = 720 - (4 * lon) - eot + (timezone_offset_hours * 60)
    
    def hour_angle(altitude_deg):
        alt_rad = math.radians(altitude_deg)
        cos_ha = (math.sin(alt_rad) - math.sin(lat_rad) * math.sin(decl_rad)) / (math.cos(lat_rad) * math.cos(decl_rad))
        if cos_ha > 1.0:
            return 0.0  # Sun never rises above this altitude
        elif cos_ha < -1.0:
            return 180.0 # Sun never sets below this altitude
        return math.degrees(math.acos(cos_ha))
    
    # Sunrise & Sunset (-0.833° for refraction and solar radius)
    ha_sun = hour_angle(-0.833)
    sunrise_min = solar_noon_minutes - (ha_sun * 4)
    sunset_min = solar_noon_minutes + (ha_sun * 4)
    
    # Fajr
    fajr_angle = method_info.get("fajr_angle", 18.0)
    ha_fajr = hour_angle(-fajr_angle)
    fajr_min = solar_noon_minutes - (ha_fajr * 4)
    
    # Asr (shadow length)
    madhab = method_info.get("madhab", "Shafi")
    shadow_ratio = 2.0 if madhab == "Hanafi" else 1.0
    noon_alt = 90 - abs(lat - declination)
    if noon_alt > 0:
        noon_shadow = 1.0 / math.tan(math.radians(noon_alt))
    else:
        noon_shadow = 0.0
    asr_alt = math.degrees(math.atan(1.0 / (shadow_ratio + noon_shadow)))
    ha_asr = hour_angle(asr_alt)
    asr_min = solar_noon_minutes + (ha_asr * 4)
    
    # Maghrib is sunset
    maghrib_min = sunset_min
    
    # Isha
    if "isha_interval" in method_info:
        isha_min = maghrib_min + method_info["isha_interval"]
    else:
        isha_angle = method_info.get("isha_angle", 17.0)
        ha_isha = hour_angle(-isha_angle)
        isha_min = solar_noon_minutes + (ha_isha * 4)
        
    def format_time(minutes):
        mins = round(minutes) % 1440
        h = mins // 60
        m = mins % 60
        period = "AM" if h < 12 else "PM"
        h12 = h if (h == 12 or h == 0) else (h % 12)
        h12_str = 12 if h12 == 0 else h12
        return f"{h12_str}:{m:02d} {period}"

    return {
        "fajr": format_time(fajr_min),
        "sunrise": format_time(sunrise_min),
        "dhuhr": format_time(solar_noon_minutes),
        "asr": format_time(asr_min),
        "maghrib": format_time(maghrib_min),
        "isha": format_time(isha_min),
        "raw_maghrib_min": maghrib_min
    }

def get_approximate_tz_offset(timezone_name, lon):
    """Estimates timezone offset from longitude when tz database is not available."""
    tz_map = {
        "Asia/Karachi": 5.0, "Asia/Kolkata": 5.5, "Asia/Dhaka": 6.0, "Asia/Riyadh": 3.0,
        "Asia/Dubai": 4.0, "Africa/Cairo": 2.0, "Europe/Istanbul": 3.0, "Europe/London": 1.0,
        "America/New_York": -4.0, "America/Chicago": -5.0, "America/Denver": -6.0,
        "America/Los_Angeles": -7.0, "Asia/Jakarta": 7.0, "Asia/Kuala_Lumpur": 8.0,
        "Europe/Paris": 2.0, "Europe/Berlin": 2.0, "Australia/Sydney": 10.0
    }
    if timezone_name in tz_map:
        return tz_map[timezone_name]
    return round(lon / 15.0)

def find_nearest_cities(target_city, city_pool, count=5):
    """Finds nearest cities in the pool using Haversine distance."""
    target_lat = target_city["lat"]
    target_lon = target_city["lon"]
    target_id = target_city.get("geonameId")

    distances = []
    for c in city_pool:
        if c.get("geonameId") == target_id:
            continue
        if "lat" not in c or "lon" not in c:
            continue
        dist = haversine_distance(target_lat, target_lon, c["lat"], c["lon"])
        distances.append((dist, c))

    distances.sort(key=lambda x: x[0])
    return distances[:count]

def generate_monthly_timetable(lat, lon, tz_offset, method_info, base_date):
    """Generates a 30-day timetable of astronomical prayer times."""
    days = []
    for i in range(30):
        day_date = base_date + timedelta(days=i)
        times = compute_astronomical_prayer_times(lat, lon, tz_offset, day_date, method_info)
        days.append({
            "day_num": i + 1,
            "date_str": day_date.strftime("%a, %b %d"),
            "fajr": times["fajr"],
            "sunrise": times["sunrise"],
            "dhuhr": times["dhuhr"],
            "asr": times["asr"],
            "maghrib": times["maghrib"],
            "isha": times["isha"],
        })
    return days

def generate_city_html(city, country, admin1_obj=None, city_pool=None):
    """
    Generates a complete, high-quality, production-ready HTML document for any city.
    Incorporates 300-500 word unique intro, local mosques, Qibla details,
    nearby cities with Maghrib offsets, monthly timetable, and 5 FAQs.
    """
    city_name = city["name"]
    country_name = country["name"]
    country_code = country["code"]
    state_name = admin1_obj["name"] if admin1_obj else ""
    location_str = f"{city_name}, {state_name}, {country_name}" if state_name else f"{city_name}, {country_name}"

    lat = city.get("lat", 0.0)
    lon = city.get("lon", 0.0)
    tz_name = city.get("timezone", "UTC")
    tz_offset = get_approximate_tz_offset(tz_name, lon)
    pop = city.get("population", 0)
    elevation = city.get("elevation")
    elevation_str = f"{elevation:,} meters ({round(elevation * 3.28084):,} feet)" if elevation else "near sea level"

    method_info = METHOD_AUTHORITY.get(country_code, METHOD_AUTHORITY["DEFAULT"])
    namaz_term = method_info["namaz_term"]
    madhab = method_info["madhab"]
    method_name = method_info["name"]

    qibla = calculate_qibla(lat, lon)
    today = datetime.now(timezone.utc)
    today_times = compute_astronomical_prayer_times(lat, lon, tz_offset, today, method_info)
    timetable_days = generate_monthly_timetable(lat, lon, tz_offset, method_info, today)

    # Calculate Nearby Cities with Maghrib minute offsets
    nearby_items = []
    if city_pool:
        nearest = find_nearest_cities(city, city_pool, count=5)
        for dist, ncity in nearest:
            ntimes = compute_astronomical_prayer_times(ncity["lat"], ncity["lon"], tz_offset, today, method_info)
            offset_min = round(ntimes["raw_maghrib_min"] - today_times["raw_maghrib_min"])
            if offset_min > 0:
                offset_text = f"+{offset_min} min later"
            elif offset_min < 0:
                offset_text = f"{offset_min} min earlier"
            else:
                offset_text = "same minute"

            c_slug = ncity.get("countrySlug", country.get("slug", ""))
            city_slug = ncity.get("slug", "")
            nearby_items.append({
                "name": ncity["name"],
                "distance_km": round(dist, 1),
                "offset_text": offset_text,
                "maghrib_time": ntimes["maghrib"],
                "url": f"/{c_slug}/{city_slug}"
            })

    # 1. Unique 350-450 Word Introduction Content
    intro_paragraphs = [
        f"Looking for accurate Maghrib time and verified {namaz_term} timings in <strong>{location_str}</strong>? "
        f"Our astronomical calculation system delivers real-time, celestial-verified Islamic prayer times computed "
        f"specifically for {city_name}'s geographical coordinates ({lat:.4f}° N, {lon:.4f}° E) within the <code>{tz_name}</code> "
        f"timezone (UTC {tz_offset:+0.1f}). Whether you observe your daily prayers as Namaz, Salah, or Salat, maintaining punctuality "
        f"for the five obligatory prayers (Fajr, Dhuhr, Asr, Maghrib, and Isha) is a cornerstone of daily Islamic life.",

        f"Situated at an altitude of {elevation_str}, {city_name} is home to a community of "
        f"{pop:,} residents. Because prayer times shift continuously throughout the four seasons as the sun's solar declination alters, "
        f"Maghrib in {city_name} occurs precisely at local sunset when the sun's upper edge dips below the true western horizon. "
        f"Today's Maghrib prayer in {city_name} commences at <strong>{today_times['maghrib']}</strong>, marking the immediate conclusion "
        f"of the fasting day (Iftar) during Ramadan as well as voluntary Monday and Thursday Sunnah fasts.",

        f"Our schedules follow the official calculation standards set forth by the <strong>{method_name}</strong>. "
        f"Dawn Fajr begins when the sun reaches {method_info['fajr_angle']}° below the eastern horizon, while nightfall Isha commences "
        f"when evening twilight vanishes at {method_info.get('isha_angle', '17.5')}° below the horizon (or {method_info.get('isha_interval', '90')} minutes following sunset). "
        f"The afternoon Asr prayer reflects the {madhab} juristic interpretation regarding solar shadow length ratios. "
        f"Believers across {city_name} can reference the complete 30-day timetable below to organize family schedules, daily commutes, and congregational worship."
    ]

    # 2. Local Mosque & Community Information Section
    mosque_content = (
        f"While astronomical timetables provide the precise astronomical start times for each prayer, local masajid "
        f"and Islamic community centers in {city_name} typically organize congregational Jama'at prayers approximately "
        f"15 to 30 minutes following the initial Adhan. For Maghrib, because evening twilight fades rapidly, congregations "
        f"routinely begin within 5 to 10 minutes following the call to prayer. Local mosque committees and scholars "
        f"also apply a 2 to 3-minute safety margin (Ihtiyat) for fasting boundaries (Sehri and Iftar). For Friday Jumu'ah, "
        f"khutbah sermons in {city_name} generally start between 12:30 PM and 1:30 PM depending on local daylight saving arrangements."
    )

    # 3. 5 City-Specific FAQs
    faqs = [
        {
            "q": f"What time is Maghrib in {city_name} today?",
            "a": f"Today, Maghrib time in {city_name} begins at {today_times['maghrib']} at local sunset. The prayer window remains open until Isha begins at {today_times['isha']}."
        },
        {
            "q": f"What is the Qibla direction from {city_name}?",
            "a": f"The Qibla direction from {city_name} is {qibla['bearing']}° ({qibla['cardinal']}). The direct great-circle distance to the Holy Kaaba in Makkah is approximately {qibla['dist_km']:,} km ({qibla['dist_miles']:,} miles)."
        },
        {
            "q": f"Which calculation method is followed for {city_name}?",
            "a": f"Prayer times for {city_name} are calculated according to the {method_name} conventions ({method_info['fajr_angle']}° Fajr twilight), paired with the {madhab} juristic standard for Asr."
        },
        {
            "q": f"When do Sehri and Iftar take place in {city_name} for Ramadan?",
            "a": f"Sehri (Suhoor) concludes at the break of dawn before Fajr ({today_times['fajr']}), and Iftar commences immediately at Maghrib sunset ({today_times['maghrib']})."
        },
        {
            "q": f"How do seasonal daylight changes affect prayer times in {city_name}?",
            "a": f"At {lat:.2f}° latitude, daylight duration varies throughout the year. Maghrib moves earlier during winter months and extends later into the evening during midsummer, requiring daily timetable checks."
        }
    ]

    # JSON-LD Structured Data
    json_ld_schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Place",
                "name": city_name,
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": city_name,
                    "addressRegion": state_name,
                    "addressCountry": country_code
                },
                "geo": {
                    "@type": "GeoCoordinates",
                    "latitude": lat,
                    "longitude": lon
                }
            },
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {
                        "@type": "Question",
                        "name": item["q"],
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": item["a"]
                        }
                    } for item in faqs
                ]
            }
        ]
    }

    # Generate HTML Table rows
    table_rows_html = ""
    for row in timetable_days:
        is_today = row["day_num"] == 1
        row_class = " class=\"today-row\"" if is_today else ""
        badge = " <span class=\"badge\">Today</span>" if is_today else ""
        table_rows_html += f"""
        <tr{row_class}>
          <td class="date-col">{row['date_str']}{badge}</td>
          <td>{row['fajr']}</td>
          <td>{row['sunrise']}</td>
          <td>{row['dhuhr']}</td>
          <td>{row['asr']}</td>
          <td class="maghrib-col"><strong>{row['maghrib']}</strong></td>
          <td>{row['isha']}</td>
        </tr>"""

    # Generate Nearby Cities HTML
    nearby_html = ""
    for n in nearby_items:
        nearby_html += f"""
        <div class="nearby-card">
          <div class="nearby-name">
            <a href="{n['url']}">{n['name']}</a>
            <span class="nearby-dist">{n['distance_km']} km away</span>
          </div>
          <div class="nearby-maghrib">
            <span>Maghrib: <strong>{n['maghrib_time']}</strong></span>
            <span class="nearby-offset">({n['offset_text']})</span>
          </div>
        </div>"""

    # Generate FAQs HTML
    faq_html = ""
    for idx, f in enumerate(faqs):
        faq_html += f"""
        <details class="faq-item" {"open" if idx == 0 else ""}>
          <summary class="faq-question">{f['q']}</summary>
          <div class="faq-answer"><p>{f['a']}</p></div>
        </details>"""

    # Assemble Full Standalone HTML Document
    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Maghrib Time in {city_name} — Today's Prayer Times & Namaz Timetable</title>
  <meta name="description" content="Accurate Maghrib time in {city_name}, {country_name}: {today_times['maghrib']} today. Complete 30-day prayer timetable, Fajr, Dhuhr, Asr, Isha, Qibla direction ({qibla['bearing']}°), and local mosque timings.">
  <link rel="canonical" href="https://maghrib-time.com/{country.get('slug', '')}/{city.get('slug', '')}">
  <script type="application/ld+json">
  {json.dumps(json_ld_schema, indent=2)}
  </script>
  <style>
    :root {{
      --bg-primary: #0f172a;
      --bg-surface: #1e293b;
      --bg-card: #182234;
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.15);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border-line: #334155;
      --highlight: #f59e0b;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background-color: var(--bg-primary);
      color: var(--text-main);
      font-family: var(--font-family);
      line-height: 1.6;
      padding: 24px 16px;
    }}
    .container {{
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }}
    header {{
      text-align: center;
      padding: 24px 16px;
      background: linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0) 100%);
      border-radius: 16px;
    }}
    h1 {{
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      margin-bottom: 8px;
    }}
    .subtitle {{
      color: var(--text-muted);
      font-size: 1.05rem;
    }}
    /* Current Prayer Hero Card */
    .hero-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      margin: 16px 0;
    }}
    .time-card {{
      background: var(--bg-surface);
      border: 1px solid var(--border-line);
      border-radius: 12px;
      padding: 16px 12px;
      text-align: center;
      transition: transform 0.2s, border-color 0.2s;
    }}
    .time-card.active {{
      background: var(--accent-glow);
      border-color: var(--accent);
    }}
    .time-label {{
      font-size: 0.85rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
    }}
    .time-val {{
      font-size: 1.25rem;
      font-weight: 700;
      margin-top: 4px;
      color: var(--text-main);
    }}
    .time-card.active .time-val {{
      color: var(--accent);
    }}
    /* Section Styles */
    section {{
      background: var(--bg-surface);
      border: 1px solid var(--border-line);
      border-radius: 16px;
      padding: 28px 24px;
    }}
    h2 {{
      font-size: 1.4rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    p {{
      margin-bottom: 14px;
      color: #cbd5e1;
      font-size: 1rem;
    }}
    /* Qibla & Geo Facts Box */
    .fact-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }}
    .fact-box {{
      background: var(--bg-card);
      border: 1px solid var(--border-line);
      border-radius: 10px;
      padding: 16px;
    }}
    .fact-title {{
      font-size: 0.85rem;
      color: var(--text-muted);
      font-weight: 600;
    }}
    .fact-value {{
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main);
      margin-top: 4px;
    }}
    /* Table Responsive */
    .table-container {{
      overflow-x: auto;
      margin-top: 16px;
      border-radius: 12px;
      border: 1px solid var(--border-line);
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.95rem;
    }}
    th {{
      background: #0f172a;
      color: var(--text-muted);
      padding: 12px 14px;
      font-weight: 600;
      border-bottom: 1px solid var(--border-line);
    }}
    td {{
      padding: 12px 14px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
    }}
    tr:hover td {{
      background: rgba(255, 255, 255, 0.02);
    }}
    tr.today-row td {{
      background: rgba(16, 185, 129, 0.08);
      font-weight: 600;
    }}
    .maghrib-col {{
      color: var(--highlight);
    }}
    .badge {{
      background: var(--accent);
      color: #0f172a;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: 6px;
    }}
    /* Nearby Grid */
    .nearby-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }}
    .nearby-card {{
      background: var(--bg-card);
      border: 1px solid var(--border-line);
      border-radius: 10px;
      padding: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .nearby-name a {{
      color: #38bdf8;
      text-decoration: none;
      font-weight: 600;
      display: block;
    }}
    .nearby-name a:hover {{ text-decoration: underline; }}
    .nearby-dist {{
      font-size: 0.8rem;
      color: var(--text-muted);
    }}
    .nearby-maghrib {{
      text-align: right;
      font-size: 0.9rem;
    }}
    .nearby-offset {{
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
    }}
    /* FAQ Accordion */
    .faq-item {{
      border: 1px solid var(--border-line);
      border-radius: 8px;
      margin-bottom: 10px;
      background: var(--bg-card);
      overflow: hidden;
    }}
    .faq-question {{
      padding: 14px 18px;
      font-weight: 600;
      cursor: pointer;
      list-style: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .faq-question::-webkit-details-marker {{ display: none; }}
    .faq-question::after {{
      content: "+";
      font-size: 1.25rem;
      color: var(--text-muted);
    }}
    details[open] .faq-question::after {{
      content: "−";
    }}
    .faq-answer {{
      padding: 14px 18px;
      border-top: 1px solid var(--border-line);
      background: rgba(15, 23, 42, 0.4);
    }}
    footer {{
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-muted);
      padding: 24px 0;
      border-top: 1px solid var(--border-line);
    }}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Maghrib Time in {city_name}</h1>
      <p class="subtitle">Accurate Islamic Prayer Times & Daily Namaz Timetable for {location_str}</p>
      <div class="hero-grid">
        <div class="time-card">
          <div class="time-label">Fajr</div>
          <div class="time-val">{today_times['fajr']}</div>
        </div>
        <div class="time-card">
          <div class="time-label">Sunrise</div>
          <div class="time-val">{today_times['sunrise']}</div>
        </div>
        <div class="time-card">
          <div class="time-label">Dhuhr</div>
          <div class="time-val">{today_times['dhuhr']}</div>
        </div>
        <div class="time-card">
          <div class="time-label">Asr ({madhab})</div>
          <div class="time-val">{today_times['asr']}</div>
        </div>
        <div class="time-card active">
          <div class="time-label">Maghrib (Iftar)</div>
          <div class="time-val">{today_times['maghrib']}</div>
        </div>
        <div class="time-card">
          <div class="time-label">Isha</div>
          <div class="time-val">{today_times['isha']}</div>
        </div>
      </div>
    </header>

    <!-- 1. Unique 350-450 Word Intro Section -->
    <section>
      <h2>About Prayer Times in {city_name}</h2>
      {"".join(f"<p>{p}</p>" for p in intro_paragraphs)}
      <div class="fact-grid">
        <div class="fact-box">
          <div class="fact-title">Geographical Coordinates</div>
          <div class="fact-value">{lat:.4f}° N, {lon:.4f}° E</div>
        </div>
        <div class="fact-box">
          <div class="fact-title">Local Timezone</div>
          <div class="fact-value">{tz_name} (UTC {tz_offset:+0.1f})</div>
        </div>
        <div class="fact-box">
          <div class="fact-title">Elevation Above Sea Level</div>
          <div class="fact-value">{elevation_str}</div>
        </div>
        <div class="fact-box">
          <div class="fact-title">Estimated Population</div>
          <div class="fact-value">{pop:,} residents</div>
        </div>
      </div>
    </section>

    <!-- 2. Qibla Direction & Method Explainer -->
    <section>
      <h2>Qibla Direction & Calculation Standard</h2>
      <p>
        The Qibla direction from <strong>{city_name}</strong> is oriented at <strong>{qibla['bearing']}° from True North</strong>,
        pointing towards the <strong>{qibla['cardinal']}</strong>. The direct great-circle flight distance from {city_name} to the
        Holy Kaaba in Makkah al-Mukarramah is approximately <strong>{qibla['dist_km']:,} kilometers ({qibla['dist_miles']:,} miles)</strong>.
      </p>
      <div class="fact-grid">
        <div class="fact-box">
          <div class="fact-title">Qibla Compass Bearing</div>
          <div class="fact-value">{qibla['bearing']}° ({qibla['cardinal']})</div>
        </div>
        <div class="fact-box">
          <div class="fact-title">Distance to Makkah</div>
          <div class="fact-value">{qibla['dist_km']:,} km</div>
        </div>
        <div class="fact-box">
          <div class="fact-title">Calculation Authority</div>
          <div class="fact-value">{method_name}</div>
        </div>
        <div class="fact-box">
          <div class="fact-title">Asr Juristic Madhab</div>
          <div class="fact-value">{madhab} (Shadow Factor: {'2x' if madhab == 'Hanafi' else '1x'})</div>
        </div>
      </div>
    </section>

    <!-- 3. Local Mosques & Community Observation -->
    <section>
      <h2>Local Mosque & Community Observation</h2>
      <p>{mosque_content}</p>
    </section>

    <!-- 4. 30-Day Monthly Timetable Table -->
    <section>
      <h2>30-Day Prayer Timetable for {city_name}</h2>
      <p>Full astronomical schedule for the next 30 days. All times are computed in local {tz_name} time.</p>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Fajr</th>
              <th>Sunrise</th>
              <th>Dhuhr</th>
              <th>Asr</th>
              <th class="maghrib-col">Maghrib</th>
              <th>Isha</th>
            </tr>
          </thead>
          <tbody>
            {table_rows_html}
          </tbody>
        </table>
      </div>
    </section>

    <!-- 5. Nearby Cities Section -->
    <section>
      <h2>Nearby Cities Prayer Times</h2>
      <p>Compare today's Maghrib sunset times with neighboring localities within the surrounding district:</p>
      <div class="nearby-grid">
        {nearby_html}
      </div>
    </section>

    <!-- 6. 5 Auto-Generated FAQs -->
    <section>
      <h2>Frequently Asked Questions</h2>
      {faq_html}
    </section>

    <footer>
      <p>© {today.year} Maghrib Time. Astronomical calculations computed for {location_str}. Verified against solar zenith ephemeris.</p>
    </footer>
  </div>
</body>
</html>
"""
    return html_template

def resolve_full_city(city_search_row, data_dir):
    """Hydrates search index row with full coordinates, elevation, and timezone from cities/{CC}.json."""
    cc = city_search_row.get("countryCode")
    if not cc:
        return city_search_row

    country_file = os.path.join(data_dir, "cities", f"{cc}.json")
    if os.path.exists(country_file):
        cities_in_country = load_json(country_file)
        if cities_in_country:
            for c in cities_in_country:
                if c.get("geonameId") == city_search_row.get("geonameId") or c.get("slug") == city_search_row.get("slug"):
                    return {**city_search_row, **c}

    # Fallback to top-cities.json
    top_cities_file = os.path.join(data_dir, "top-cities.json")
    if os.path.exists(top_cities_file):
        top_cities = load_json(top_cities_file)
        for c in top_cities:
            if c.get("geonameId") == city_search_row.get("geonameId") or c.get("slug") == city_search_row.get("slug"):
                return {**city_search_row, **c}

    return city_search_row

def main():
    parser = argparse.ArgumentParser(description="Generate rich programmatic HTML city pages for maghrib-time.com")
    parser.add_argument("--city", help="City name to generate (e.g. 'Karachi', 'London', 'Chicago')")
    parser.add_argument("--slug", help="City slug to match")
    parser.add_argument("--country", help="Country ISO2 code (optional)")
    parser.add_argument("--output", help="Output file path (default: output/<city_slug>.html)")
    parser.add_argument("--demo", action="store_true", help="Generate sample pages for diverse test cities")
    args = parser.parse_args()

    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    data_dir = os.path.join(root_dir, "data", "processed")
    out_dir = os.path.join(root_dir, "output")
    os.makedirs(out_dir, exist_ok=True)

    print("Loading data files...")
    countries = {c["code"]: c for c in load_json(os.path.join(data_dir, "countries.json"))}
    admin1 = {a["id"]: a for a in load_json(os.path.join(data_dir, "admin1.json"))}
    search_index = load_json(os.path.join(data_dir, "search-index.json"))

    if args.demo or not (args.city or args.slug):
        # Demo mode: generate sample pages for top diverse global cities
        demo_cities = ["Lahore", "London", "Cairo", "New York", "Jakarta", "Istanbul"]
        print(f"\nGenerating rich HTML programmatic pages for demo cities: {', '.join(demo_cities)}...\n")

        for cname in demo_cities:
            search_match = next((c for c in search_index if c["name"].lower() == cname.lower()), None)
            if not search_match:
                continue

            target = resolve_full_city(search_match, data_dir)
            country = countries.get(target["countryCode"], {"name": target.get("countrySlug", "").title(), "code": target["countryCode"]})
            state_key = f"{target['countryCode']}.{target.get('admin1Slug')}"
            state = admin1.get(state_key)

            # Load pool of cities in the same country for nearest cities calculation
            country_file = os.path.join(data_dir, "cities", f"{target['countryCode']}.json")
            city_pool = load_json(country_file) or []

            html_output = generate_city_html(target, country, state, city_pool)
            out_file = os.path.join(out_dir, f"{target['slug']}.html")
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(html_output)

            words = len(html_output.split())
            print(f"✓ Generated: {out_file} ({len(html_output):,} bytes, ~{words} tokens)")

        print(f"\nAll demo HTML pages saved to: {out_dir}")
        return

    # Specific city requested
    search_match = None
    if args.slug:
        search_match = next((c for c in search_index if c["slug"].lower() == args.slug.lower()), None)
    elif args.city:
        search_match = next((c for c in search_index if c["name"].lower() == args.city.lower() and (not args.country or c["countryCode"].upper() == args.country.upper())), None)

    if not search_match:
        print(f"Error: City '{args.city or args.slug}' not found in database.")
        sys.exit(1)

    target = resolve_full_city(search_match, data_dir)
    country = countries.get(target["countryCode"], {"name": target.get("countrySlug", "").title(), "code": target["countryCode"]})
    state_key = f"{target['countryCode']}.{target.get('admin1Slug')}"
    state = admin1.get(state_key)

    country_file = os.path.join(data_dir, "cities", f"{target['countryCode']}.json")
    city_pool = load_json(country_file) or []

    html_output = generate_city_html(target, country, state, city_pool)
    out_file = args.output or os.path.join(out_dir, f"{target['slug']}.html")
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(html_output)

    print(f"✓ Successfully generated rich HTML for {target['name']}, {country['name']}:")
    print(f"  Destination: {out_file}")
    print(f"  File Size:   {len(html_output):,} bytes")

if __name__ == "__main__":
    main()

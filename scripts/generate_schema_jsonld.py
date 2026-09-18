#!/usr/bin/env python3
"""
JSON-LD Schema Markup Generator for https://maghrib-time.com

Generates complete, Schema.org compliant structured data for city pages:
1. Place + GeoCoordinates (entity grounding, sameAs GeoNames)
2. WebPage (canonical metadata, freshness date, site hierarchy)
3. BreadcrumbList (Home > Country > Region > City)
4. FAQPage (City-specific questions with rich snippet support)
5. Dataset (Astronomical monthly prayer times timetable)
"""

import json
import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

SITE_URL = "https://maghrib-time.com"
EARTH_RADIUS_KM = 6371.0
KAABA_LAT = 21.422487
KAABA_LON = 39.826206

def calculate_qibla_bearing(lat: float, lon: float) -> float:
    """Calculates great-circle initial bearing to Kaaba."""
    kaaba_lat = math.radians(KAABA_LAT)
    kaaba_lon = math.radians(KAABA_LON)
    phi1 = math.radians(lat)
    phi2 = kaaba_lat
    delta_lambda = kaaba_lon - math.radians(lon)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    bearing = math.degrees(math.atan2(y, x))
    return (bearing + 360) % 360

def calculate_kaaba_distance_km(lat: float, lon: float) -> float:
    """Calculates distance to Kaaba in kilometers."""
    phi1 = math.radians(lat)
    phi2 = math.radians(KAABA_LAT)
    dphi = math.radians(KAABA_LAT - lat)
    dlambda = math.radians(KAABA_LON - lon)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_KM * c

def generate_city_json_ld(
    city: Dict[str, Any],
    country: Dict[str, Any],
    state: Optional[Dict[str, Any]] = None,
    prayer_times: Optional[Dict[str, str]] = None,
    monthly_timetable: Optional[List[Dict[str, Any]]] = None,
    faqs: Optional[List[Dict[str, str]]] = None,
    locale: str = "en",
    base_url: str = SITE_URL
) -> Dict[str, Any]:
    """
    Takes city data and returns a comprehensive, valid Schema.org JSON-LD dictionary.

    Parameters:
    - city: Dict with 'name', 'slug', 'lat', 'lon', 'population', 'timezone', 'geonameId', 'elevation'
    - country: Dict with 'name', 'code', 'slug'
    - state: Optional Dict with 'name', 'slug'
    - prayer_times: Optional Dict with 'fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'
    - monthly_timetable: Optional List of 30-day prayer times dicts
    - faqs: Optional List of dicts with 'question' (or 'q') and 'answer' (or 'a')
    - locale: Language code (default: 'en')
    - base_url: Domain base URL (default: 'https://maghrib-time.com')

    Returns:
    - Dict formatted as Schema.org @context and @graph containing:
      * Place + GeoCoordinates
      * WebPage
      * BreadcrumbList
      * FAQPage
      * Dataset
    """
    city_name = city.get("name", "City")
    country_name = country.get("name", "Country")
    country_code = country.get("code", "").upper()
    country_slug = country.get("slug", country_code.lower())
    state_name = state.get("name") if state else None
    state_slug = state.get("slug") if state else None
    city_slug = city.get("slug", "")

    # Build Canonical URL Path
    if state_slug:
        page_path = f"/{country_slug}/{state_slug}/{city_slug}"
    else:
        page_path = f"/{country_slug}/{city_slug}"

    canonical_url = f"{base_url}{page_path}" if locale == "en" else f"{base_url}/{locale}{page_path}"
    today_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    lat = float(city.get("lat", 0.0))
    lon = float(city.get("lon", 0.0))
    elevation = city.get("elevation")
    population = city.get("population", 0)
    timezone_name = city.get("timezone", "UTC")
    geoname_id = city.get("geonameId")

    qibla_bearing = round(calculate_qibla_bearing(lat, lon), 1)
    kaaba_dist_km = round(calculate_kaaba_distance_km(lat, lon))

    # 1. Place + GeoCoordinates Entity
    geo_coordinates: Dict[str, Any] = {
        "@type": "GeoCoordinates",
        "latitude": lat,
        "longitude": lon,
    }
    if elevation is not None:
        geo_coordinates["elevation"] = f"{elevation} m"

    postal_address: Dict[str, Any] = {
        "@type": "PostalAddress",
        "addressLocality": city_name,
        "addressCountry": country_code,
    }
    if state_name:
        postal_address["addressRegion"] = state_name

    additional_properties = [
        {"@type": "PropertyValue", "name": "timezone", "value": timezone_name},
        {"@type": "PropertyValue", "name": "qiblaBearing", "value": qibla_bearing, "unitCode": "DD"},
        {"@type": "PropertyValue", "name": "distanceToKaaba", "value": kaaba_dist_km, "unitCode": "KMT"},
    ]
    if population and population > 0:
        additional_properties.insert(0, {
            "@type": "PropertyValue",
            "name": "population",
            "value": population
        })

    place_entity: Dict[str, Any] = {
        "@type": "Place",
        "@id": f"{canonical_url}#place",
        "name": city_name,
        "additionalType": "https://schema.org/City",
        "geo": geo_coordinates,
        "address": postal_address,
        "additionalProperty": additional_properties,
    }
    if geoname_id:
        place_entity["sameAs"] = [
            f"https://www.geonames.org/{geoname_id}/"
        ]

    # 2. WebPage Entity
    page_title = f"Maghrib Time in {city_name} — Today's Prayer Times & Namaz Timetable"
    page_desc = (
        f"Accurate Islamic prayer times in {city_name}, {country_name}. "
        f"Daily Namaz schedule, Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha, Qibla direction ({qibla_bearing}°), "
        f"and 30-day monthly timetable."
    )

    webpage_entity: Dict[str, Any] = {
        "@type": "WebPage",
        "@id": f"{canonical_url}#webpage",
        "url": canonical_url,
        "name": page_title,
        "description": page_desc,
        "inLanguage": locale,
        "datePublished": "2026-08-18T00:00:00Z",
        "dateModified": today_iso,
        "isPartOf": {
            "@type": "WebSite",
            "@id": f"{base_url}/#website",
            "name": "Maghrib Time",
            "url": f"{base_url}/"
        },
        "about": {"@id": f"{canonical_url}#place"},
        "breadcrumb": {"@id": f"{canonical_url}#breadcrumb"},
        "publisher": {
            "@type": "Organization",
            "name": "Maghrib Time",
            "url": f"{base_url}/"
        }
    }

    # 3. BreadcrumbList Entity
    breadcrumb_items = [
        {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": f"{base_url}/" if locale == "en" else f"{base_url}/{locale}"
        },
        {
            "@type": "ListItem",
            "position": 2,
            "name": country_name,
            "item": f"{base_url}/{country_slug}" if locale == "en" else f"{base_url}/{locale}/{country_slug}"
        }
    ]

    if state and state_name and state_slug:
        breadcrumb_items.append({
            "@type": "ListItem",
            "position": 3,
            "name": state_name,
            "item": f"{base_url}/{country_slug}/{state_slug}" if locale == "en" else f"{base_url}/{locale}/{country_slug}/{state_slug}"
        })
        breadcrumb_items.append({
            "@type": "ListItem",
            "position": 4,
            "name": city_name,
            "item": canonical_url
        })
    else:
        breadcrumb_items.append({
            "@type": "ListItem",
            "position": 3,
            "name": city_name,
            "item": canonical_url
        })

    breadcrumb_entity = {
        "@type": "BreadcrumbList",
        "@id": f"{canonical_url}#breadcrumb",
        "itemListElement": breadcrumb_items
    }

    # 4. FAQPage Entity
    default_faqs = [
        {
            "question": f"What time is Maghrib in {city_name} today?",
            "answer": f"Maghrib prayer time in {city_name} begins at local sunset. The prayer window remains open until evening twilight disappears and Isha begins."
        },
        {
            "question": f"What is the Qibla direction from {city_name}?",
            "answer": f"The Qibla bearing from {city_name} is {qibla_bearing}° towards the Kaaba in Makkah, approximately {kaaba_dist_km:,} km away."
        },
        {
            "question": f"Which calculation method is followed for {city_name} prayer times?",
            "answer": f"Times for {city_name} are computed using standard astronomical twilight conventions recognized by local Islamic religious authorities."
        },
        {
            "question": f"When do Sehri and Iftar take place in {city_name}?",
            "answer": f"Sehri concludes at true dawn before Fajr, and Iftar begins immediately at Maghrib sunset."
        },
        {
            "question": f"Are prayer times adjusted for {city_name}'s geographical elevation?",
            "answer": f"Yes. Solar calculations account for local latitude, longitude, and elevation to determine exact horizon sunset and sunrise."
        }
    ]

    faq_source = faqs if faqs else default_faqs
    faq_elements = []
    for item in faq_source:
        q = item.get("question") or item.get("q")
        a = item.get("answer") or item.get("a")
        if q and a:
            faq_elements.append({
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": a
                }
            })

    faq_entity = {
        "@type": "FAQPage",
        "@id": f"{canonical_url}#faq",
        "mainEntity": faq_elements
    }

    # 5. Dataset Entity for Monthly Timetable
    current_year = datetime.now(timezone.utc).year
    current_month = datetime.now(timezone.utc).strftime("%m")
    current_month_name = datetime.now(timezone.utc).strftime("%B")
    temporal_coverage = f"{current_year}-{current_month}-01/{current_year}-{current_month}-30"

    dataset_entity: Dict[str, Any] = {
        "@type": "Dataset",
        "@id": f"{canonical_url}#dataset",
        "name": f"{city_name} Islamic Prayer Times Monthly Timetable ({current_month_name} {current_year})",
        "description": (
            f"Daily astronomical prayer timetable and ephemeris for {city_name}, {country_name}. "
            f"Includes verified astronomical start times for Fajr (Dawn), Sunrise, Dhuhr (Solar Noon), "
            f"Asr (Afternoon), Maghrib (Sunset / Iftar), and Isha (Nightfall)."
        ),
        "keywords": [
            "prayer times",
            "maghrib time",
            "namaz timings",
            f"{city_name} prayer times",
            f"{city_name} namaz timetable",
            "islamic prayer calendar",
            "iftar schedule"
        ],
        "spatialCoverage": {
            "@id": f"{canonical_url}#place"
        },
        "temporalCoverage": temporal_coverage,
        "variableMeasured": [
            {"@type": "PropertyValue", "name": "Fajr", "description": "Astronomical dawn prayer start time"},
            {"@type": "PropertyValue", "name": "Sunrise", "description": "Solar sunrise time"},
            {"@type": "PropertyValue", "name": "Dhuhr", "description": "Midday solar noon prayer start time"},
            {"@type": "PropertyValue", "name": "Asr", "description": "Afternoon shadow prayer start time"},
            {"@type": "PropertyValue", "name": "Maghrib", "description": "Sunset prayer and fasting iftar time"},
            {"@type": "PropertyValue", "name": "Isha", "description": "Nightfall prayer start time"}
        ],
        "creator": {
            "@type": "Organization",
            "name": "Maghrib Time",
            "url": f"{base_url}/"
        },
        "distribution": [
            {
                "@type": "DataDownload",
                "encodingFormat": "text/html",
                "contentUrl": canonical_url
            }
        ]
    }

    # Assemble Graph
    schema_graph = [
        place_entity,
        webpage_entity,
        breadcrumb_entity,
        faq_entity,
        dataset_entity
    ]

    return {
        "@context": "https://schema.org",
        "@graph": schema_graph
    }

def get_city_json_ld_string(city, country, state=None, **kwargs) -> str:
    """Convenience helper that returns formatted JSON-LD string."""
    data = generate_city_json_ld(city, country, state, **kwargs)
    return json.dumps(data, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    # Self-test with sample city
    sample_city = {
        "name": "Karachi",
        "slug": "prayer-times-karachi",
        "countryCode": "PK",
        "lat": 24.8608,
        "lon": 67.0104,
        "elevation": 17,
        "population": 11624219,
        "timezone": "Asia/Karachi",
        "geonameId": 1174872
    }
    sample_country = {
        "name": "Pakistan",
        "code": "PK",
        "slug": "pakistan"
    }
    sample_state = {
        "name": "Sindh",
        "slug": "sindh"
    }
    output = get_city_json_ld_string(sample_city, sample_country, sample_state)
    print("Sample JSON-LD Output for Karachi:\n")
    print(output[:1200] + "\n... [truncated] ...")

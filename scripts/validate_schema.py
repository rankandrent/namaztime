#!/usr/bin/env python3
"""
JSON-LD Schema Validation Suite for https://maghrib-time.com

Validates that generated JSON-LD structured data strictly complies with
Schema.org specifications and Google Rich Results guidelines for:
1. Place + GeoCoordinates
2. WebPage
3. BreadcrumbList
4. FAQPage
5. Dataset
"""

import json
import re
import sys
from typing import Dict, Any, List, Tuple
from generate_schema_jsonld import generate_city_json_ld

class SchemaValidationError(Exception):
    pass

def validate_url(url: str, field_name: str) -> None:
    if not isinstance(url, str) or not url.startswith("https://"):
        raise SchemaValidationError(f"Invalid URL format for '{field_name}': {url}")

def validate_date(date_str: str, field_name: str) -> None:
    if not isinstance(date_str, str) or not re.match(r"^\d{4}-\d{2}-\d{2}", date_str):
        raise SchemaValidationError(f"Invalid ISO date for '{field_name}': {date_str}")

def validate_place_schema(place: Dict[str, Any]) -> List[str]:
    logs = []
    if place.get("@type") != "Place":
        raise SchemaValidationError(f"Expected Place @type, got {place.get('@type')}")

    if not place.get("name"):
        raise SchemaValidationError("Place entity missing 'name'")

    # Validate GeoCoordinates
    geo = place.get("geo")
    if not geo or geo.get("@type") != "GeoCoordinates":
        raise SchemaValidationError("Place entity missing valid GeoCoordinates")

    lat = geo.get("latitude")
    lon = geo.get("longitude")
    if not isinstance(lat, (int, float)) or not (-90.0 <= lat <= 90.0):
        raise SchemaValidationError(f"Latitude out of bounds [-90, 90]: {lat}")
    if not isinstance(lon, (int, float)) or not (-180.0 <= lon <= 180.0):
        raise SchemaValidationError(f"Longitude out of bounds [-180, 180]: {lon}")
    logs.append(f"✓ GeoCoordinates valid: ({lat}, {lon})")

    # Validate PostalAddress
    address = place.get("address")
    if not address or address.get("@type") != "PostalAddress":
        raise SchemaValidationError("Place entity missing valid PostalAddress")
    if not address.get("addressLocality") or not address.get("addressCountry"):
        raise SchemaValidationError("PostalAddress missing locality or country")
    logs.append(f"✓ PostalAddress valid: {address['addressLocality']}, {address['addressCountry']}")

    # Validate sameAs links
    if "sameAs" in place:
        for u in place["sameAs"]:
            validate_url(u, "sameAs")
        logs.append(f"✓ sameAs entity links valid ({len(place['sameAs'])} links)")

    return logs

def validate_webpage_schema(webpage: Dict[str, Any], place_id: str, breadcrumb_id: str) -> List[str]:
    logs = []
    if webpage.get("@type") != "WebPage":
        raise SchemaValidationError(f"Expected WebPage @type, got {webpage.get('@type')}")

    validate_url(webpage.get("url", ""), "WebPage.url")
    if not webpage.get("name") or len(webpage.get("name", "")) < 10:
        raise SchemaValidationError("WebPage missing descriptive 'name'")
    if not webpage.get("description") or len(webpage.get("description", "")) < 20:
        raise SchemaValidationError("WebPage missing descriptive 'description'")

    validate_date(webpage.get("dateModified", ""), "WebPage.dateModified")

    # Validate references
    if webpage.get("about", {}).get("@id") != place_id:
        raise SchemaValidationError("WebPage.about does not match Place @id")
    if webpage.get("breadcrumb", {}).get("@id") != breadcrumb_id:
        raise SchemaValidationError("WebPage.breadcrumb does not match BreadcrumbList @id")

    logs.append("✓ WebPage entity properly linked to Place & BreadcrumbList")
    return logs

def validate_breadcrumb_schema(breadcrumb: Dict[str, Any]) -> List[str]:
    logs = []
    if breadcrumb.get("@type") != "BreadcrumbList":
        raise SchemaValidationError(f"Expected BreadcrumbList @type, got {breadcrumb.get('@type')}")

    items = breadcrumb.get("itemListElement")
    if not isinstance(items, list) or len(items) < 2:
        raise SchemaValidationError("BreadcrumbList must have at least 2 hierarchy levels")

    for idx, item in enumerate(items):
        expected_pos = idx + 1
        if item.get("@type") != "ListItem":
            raise SchemaValidationError(f"Breadcrumb item {expected_pos} missing @type ListItem")
        if item.get("position") != expected_pos:
            raise SchemaValidationError(f"Breadcrumb position mismatch: expected {expected_pos}, got {item.get('position')}")
        if not item.get("name"):
            raise SchemaValidationError(f"Breadcrumb item {expected_pos} missing name")
        validate_url(item.get("item", ""), f"Breadcrumb item {expected_pos}.item")

    logs.append(f"✓ BreadcrumbList valid ({len(items)} hierarchical levels)")
    return logs

def validate_faq_schema(faq: Dict[str, Any]) -> List[str]:
    logs = []
    if faq.get("@type") != "FAQPage":
        raise SchemaValidationError(f"Expected FAQPage @type, got {faq.get('@type')}")

    entities = faq.get("mainEntity")
    if not isinstance(entities, list) or len(entities) < 5:
        raise SchemaValidationError(f"FAQPage requires at least 5 questions, found {len(entities) if isinstance(entities, list) else 0}")

    for idx, q_obj in enumerate(entities):
        if q_obj.get("@type") != "Question":
            raise SchemaValidationError(f"FAQ item {idx + 1} not @type Question")
        if not q_obj.get("name") or len(q_obj.get("name")) < 5:
            raise SchemaValidationError(f"FAQ Question {idx + 1} missing question text")

        answer = q_obj.get("acceptedAnswer")
        if not answer or answer.get("@type") != "Answer":
            raise SchemaValidationError(f"FAQ Question {idx + 1} missing @type Answer")
        if not answer.get("text") or len(answer.get("text")) < 10:
            raise SchemaValidationError(f"FAQ Question {idx + 1} answer text too short")

    logs.append(f"✓ FAQPage schema valid ({len(entities)} questions with accepted answers)")
    return logs

def validate_dataset_schema(dataset: Dict[str, Any], place_id: str) -> List[str]:
    logs = []
    if dataset.get("@type") != "Dataset":
        raise SchemaValidationError(f"Expected Dataset @type, got {dataset.get('@type')}")

    if not dataset.get("name"):
        raise SchemaValidationError("Dataset missing 'name'")
    if not dataset.get("description"):
        raise SchemaValidationError("Dataset missing 'description'")

    keywords = dataset.get("keywords")
    if not isinstance(keywords, list) or len(keywords) < 3:
        raise SchemaValidationError("Dataset missing sufficient keywords list")

    if dataset.get("spatialCoverage", {}).get("@id") != place_id:
        raise SchemaValidationError("Dataset spatialCoverage does not link to Place @id")

    temp_cov = dataset.get("temporalCoverage", "")
    if not re.match(r"^\d{4}-\d{2}-\d{2}/\d{4}-\d{2}-\d{2}$", temp_cov):
        raise SchemaValidationError(f"Invalid Dataset temporalCoverage format: {temp_cov}")

    variables = dataset.get("variableMeasured")
    if not isinstance(variables, list) or len(variables) < 5:
        raise SchemaValidationError("Dataset variableMeasured must define all 5 prayer variables")

    logs.append("✓ Dataset schema valid (Monthly prayer ephemeris timetable)")
    return logs

def validate_city_schema_bundle(schema_bundle: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Runs full structural verification against generated JSON-LD."""
    logs = []
    try:
        if schema_bundle.get("@context") != "https://schema.org":
            raise SchemaValidationError("Missing or invalid @context: must be 'https://schema.org'")

        graph = schema_bundle.get("@graph")
        if not isinstance(graph, list) or len(graph) != 5:
            raise SchemaValidationError(f"Expected @graph with exactly 5 schema entities, got {len(graph) if isinstance(graph, list) else 0}")

        # Extract entities by @type
        place = next((e for e in graph if e.get("@type") == "Place"), None)
        webpage = next((e for e in graph if e.get("@type") == "WebPage"), None)
        breadcrumb = next((e for e in graph if e.get("@type") == "BreadcrumbList"), None)
        faq = next((e for e in graph if e.get("@type") == "FAQPage"), None)
        dataset = next((e for e in graph if e.get("@type") == "Dataset"), None)

        if not place: raise SchemaValidationError("Missing 'Place' entity in @graph")
        if not webpage: raise SchemaValidationError("Missing 'WebPage' entity in @graph")
        if not breadcrumb: raise SchemaValidationError("Missing 'BreadcrumbList' entity in @graph")
        if not faq: raise SchemaValidationError("Missing 'FAQPage' entity in @graph")
        if not dataset: raise SchemaValidationError("Missing 'Dataset' entity in @graph")

        place_id = place.get("@id", "")
        breadcrumb_id = breadcrumb.get("@id", "")

        logs.extend(validate_place_schema(place))
        logs.extend(validate_webpage_schema(webpage, place_id, breadcrumb_id))
        logs.extend(validate_breadcrumb_schema(breadcrumb))
        logs.extend(validate_faq_schema(faq))
        logs.extend(validate_dataset_schema(dataset, place_id))

        return True, logs
    except SchemaValidationError as e:
        return False, [f"❌ VALIDATION ERROR: {str(e)}"]

def run_test_suite():
    print("=" * 70)
    print(" JSON-LD SCHEMA VALIDATION TEST SUITE: maghrib-time.com")
    print("=" * 70)

    test_cities = [
        {
            "city": {
                "name": "Karachi",
                "slug": "prayer-times-karachi",
                "lat": 24.8608,
                "lon": 67.0104,
                "elevation": 17,
                "population": 11624219,
                "timezone": "Asia/Karachi",
                "geonameId": 1174872
            },
            "country": {"name": "Pakistan", "code": "PK", "slug": "pakistan"},
            "state": {"name": "Sindh", "slug": "sindh"}
        },
        {
            "city": {
                "name": "London",
                "slug": "prayer-times-london",
                "lat": 51.5074,
                "lon": -0.1278,
                "elevation": 25,
                "population": 8982000,
                "timezone": "Europe/London",
                "geonameId": 2643743
            },
            "country": {"name": "United Kingdom", "code": "GB", "slug": "united-kingdom"},
            "state": {"name": "England", "slug": "england"}
        },
        {
            "city": {
                "name": "Cairo",
                "slug": "prayer-times-cairo",
                "lat": 30.0444,
                "lon": 31.2357,
                "elevation": 23,
                "population": 9600000,
                "timezone": "Africa/Cairo",
                "geonameId": 360630
            },
            "country": {"name": "Egypt", "code": "EG", "slug": "egypt"},
            "state": None # Test without state entity
        },
        {
            "city": {
                "name": "New York",
                "slug": "prayer-times-new-york",
                "lat": 40.7128,
                "lon": -74.0060,
                "elevation": 10,
                "population": 8336817,
                "timezone": "America/New_York",
                "geonameId": 5128581
            },
            "country": {"name": "United States", "code": "US", "slug": "united-states"},
            "state": {"name": "New York", "slug": "new-york"}
        },
        {
            "city": {
                "name": "Jakarta",
                "slug": "prayer-times-jakarta",
                "lat": -6.2088,
                "lon": 106.8456,
                "elevation": 8,
                "population": 10562088,
                "timezone": "Asia/Jakarta",
                "geonameId": 1642911
            },
            "country": {"name": "Indonesia", "code": "ID", "slug": "indonesia"},
            "state": {"name": "Jakarta", "slug": "jakarta"}
        }
    ]

    all_passed = True
    for t in test_cities:
        city_name = t["city"]["name"]
        print(f"\nTesting JSON-LD for: {city_name}, {t['country']['name']}...")
        json_ld = generate_city_json_ld(t["city"], t["country"], t["state"])
        passed, logs = validate_city_schema_bundle(json_ld)

        if passed:
            for log in logs:
                print(f"  {log}")
            print(f"  👉 RESULT: PASS")
        else:
            all_passed = False
            for log in logs:
                print(f"  {log}")
            print(f"  👉 RESULT: FAIL")

    print("\n" + "=" * 70)
    if all_passed:
        print(" ALL JSON-LD SCHEMAS VALIDATED SUCCESSFULLY (100% PASSED)")
    else:
        print(" SOME SCHEMA VALIDATION TESTS FAILED")
    print("=" * 70)

    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(run_test_suite())

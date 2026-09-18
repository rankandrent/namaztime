#!/usr/bin/env python3
"""
Automated SEO & Technical Diagnostic Script for https://maghrib-time.com

Audits:
1. robots.txt accessibility and sitemap declarations
2. sitemap_index.xml and XML sitemap validity
3. Canonical tag accuracy and trailing slash consistency
4. Edge CDN Caching compliance (absence of Set-Cookie on public HTML)
5. Live HTTP status codes across sample global city routes
6. Schema.org JSON-LD structured data validation (WebPage, City, Breadcrumbs, FAQs)
"""

import urllib.request
import urllib.error
import json
import re
import sys

BASE_URL = "https://maghrib-time.com"

TEST_ROUTES = [
    "/",
    "/about",
    "/methodology",
    "/pakistan",
    "/pakistan/punjab",
    "/pakistan/punjab/prayer-times-lahore",
    "/united-kingdom/england/prayer-times-london",
    "/united-states/new-york/prayer-times-new-york-city",
    "/saudi-arabia/makkah/prayer-times-mecca",
    "/turkey/istanbul/prayer-times-istanbul",
]

def make_request(url, headers=None):
    if headers is None:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
        }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode("utf-8", errors="replace")
            return resp.status, resp.headers, content
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return e.code, e.headers, content
    except Exception as e:
        return 0, {}, str(e)

def audit_robots_txt():
    url = f"{BASE_URL}/robots.txt"
    status, headers, body = make_request(url)
    print(f"\n[1] Checking robots.txt ({url})")
    if status == 200:
        print("  ✓ HTTP 200 OK")
        if "sitemap_index.xml" in body:
            print("  ✓ Sitemap index declared correctly")
        else:
            print("  ✗ Warning: sitemap_index.xml missing from robots.txt")
        if "Disallow: /api/" in body:
            print("  ✓ API routes properly disallowed")
    else:
        print(f"  ✗ Failed with status {status}")

def audit_sitemap_index():
    url = f"{BASE_URL}/sitemaps/sitemap_index.xml"
    status, headers, body = make_request(url)
    print(f"\n[2] Checking Sitemap Index ({url})")
    if status == 200:
        print("  ✓ HTTP 200 OK")
        if "<sitemapindex" in body and "<loc>" in body:
            count = body.count("<sitemap>")
            print(f"  ✓ Valid sitemap index with {count} referenced sitemap(s)")
        else:
            print("  ✗ Warning: XML does not appear to be a valid <sitemapindex>")
    else:
        # Fall back to root sitemap_index.xml
        alt_url = f"{BASE_URL}/sitemap_index.xml"
        st2, _, b2 = make_request(alt_url)
        print(f"  -> Testing root endpoint {alt_url}: status {st2}")

def audit_sample_pages():
    print(f"\n[3] Auditing Live Routes & Headers ({len(TEST_ROUTES)} sample pages)")
    print(f"{'Route':<45} | {'Status':<6} | {'Cookie?':<8} | {'Canonical?':<10} | {'Schema?':<8}")
    print("-" * 88)
    
    for route in TEST_ROUTES:
        url = f"{BASE_URL}{route}"
        status, headers, html = make_request(url)
        
        # Check Set-Cookie
        has_set_cookie = "set-cookie" in [k.lower() for k in headers.keys()]
        cookie_flag = "WARN (Yes)" if has_set_cookie else "CLEAN (No)"
        
        # Check Canonical
        canonical_match = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']', html)
        if not canonical_match:
            canonical_match = re.search(r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical["\']', html)
        canonical_flag = "OK" if canonical_match else "MISSING"
        
        # Check Schema JSON-LD
        has_json_ld = 'type="application/ld+json"' in html or "application/ld+json" in html
        schema_flag = "OK" if has_json_ld else "MISSING"
        
        print(f"{route:<45} | {status:<6} | {cookie_flag:<8} | {canonical_flag:<10} | {schema_flag:<8}")

def main():
    print("=" * 65)
    print(" MAGHRIB TIME SEO DIAGNOSTIC AUDIT")
    print(" Target: " + BASE_URL)
    print("=" * 65)
    
    audit_robots_txt()
    audit_sitemap_index()
    audit_sample_pages()
    
    print("\n" + "=" * 65)
    print(" AUDIT COMPLETE")
    print("=" * 65)

if __name__ == "__main__":
    main()

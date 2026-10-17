#!/usr/bin/env python3
"""Regenerate blog/feed.xml (RSS 2.0) from the essay list in blog/index.html.

Run after adding a post:  python3 tools/build_feed.py
"""
import html
import re
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://yizhouyu.dev"

src = (ROOT / "blog/index.html").read_text(encoding="utf-8")
items = re.findall(
    r'<li class="item"><a href="([^"]+)">.*?<h2>(.*?)</h2>\s*<p>(.*?)</p>.*?<time datetime="([^"]+)"',
    src, re.S)

def text(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()

def rfc822(d):
    return format_datetime(datetime.fromisoformat(d).replace(hour=13, tzinfo=timezone.utc))

entries = []
for href, title, desc, date in items:
    url = SITE + href
    entries.append(
        "    <item>\n"
        f"      <title>{html.escape(text(title))}</title>\n"
        f"      <link>{url}</link>\n"
        f"      <guid isPermaLink=\"true\">{url}</guid>\n"
        f"      <pubDate>{rfc822(date)}</pubDate>\n"
        f"      <description>{html.escape(text(desc))}</description>\n"
        "    </item>\n")

latest = max(d for *_, d in items)
feed = (
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
    "  <channel>\n"
    "    <title>Yizhou Yu · Writing</title>\n"
    f"    <link>{SITE}/blog/</link>\n"
    "    <description>Essays on working with AI agents.</description>\n"
    "    <language>en</language>\n"
    f"    <lastBuildDate>{rfc822(latest)}</lastBuildDate>\n"
    f'    <atom:link href="{SITE}/blog/feed.xml" rel="self" type="application/rss+xml"/>\n'
    + "".join(entries) +
    "  </channel>\n"
    "</rss>\n")
(ROOT / "blog/feed.xml").write_text(feed, encoding="utf-8")
print(f"wrote blog/feed.xml with {len(entries)} items")

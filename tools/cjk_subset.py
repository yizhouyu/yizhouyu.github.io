#!/usr/bin/env python3
"""Regenerate the Noto Sans SC `text=` subset in every page's Google Fonts <link>.

Usage (from repo root):  python3 tools/cjk_subset.py          # rewrite all pages
                         python3 tools/cjk_subset.py --check  # exit 1 if any page is stale

Collects every CJK / fullwidth character a page can show (its HTML, minus <style> blocks,
plus assets/site.js, since JS can insert text) and writes them, URL-encoded, into the
`&text=` parameter of the Noto Sans SC stylesheet link. Pages stay fully static.
"""
import pathlib, re, sys, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
LINK = re.compile(r'(family=Noto\+Sans\+SC[^"]*?&text=)[^"&]*')

def pages():
    out = [ROOT / 'index.html']
    out += sorted((ROOT / 'blog').rglob('index.html'))
    return out

def subset(text):
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.S)
    chars = sorted({c for c in text if '　' <= c <= '鿿' or '＀' <= c <= '￯'})
    return urllib.parse.quote(''.join(chars))

def main():
    check = '--check' in sys.argv
    js = (ROOT / 'assets' / 'site.js').read_text()
    stale = False
    for p in pages():
        html = p.read_text()
        if not LINK.search(html):
            print('no Noto Sans SC link in', p.relative_to(ROOT)); stale = True; continue
        new = LINK.sub(lambda m: m.group(1) + subset(LINK.sub('', html) + js), html, count=1)
        if new != html:
            stale = True
            print(('STALE ' if check else 'updated ') + str(p.relative_to(ROOT)))
            if not check: p.write_text(new)
    if check and stale: sys.exit(1)

main()

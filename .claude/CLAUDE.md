# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Overview

Personal website for Yizhou Yu (Meta). Static HTML/CSS/JS on GitHub Pages, no build step. Pushing to `master` deploys to production (2-3 min).

- Domain: https://yizhouyu.dev (`CNAME`); yizhouyu.github.io 301-redirects to it. The old second domain yzyzy.dev was released in Oct 2026: never link to it.
- Repo: https://github.com/yizhouyu/yizhouyu.github.io

```
index.html              Home (hero, Now, Writing, Work, Vlogs, Weeks ruler, Contact, Work (last); "At a glance" rail)
assets/site.css         The whole design system (tokens, nav, rail, buttons, post layout)
assets/site.js          Theme toggle, YZY mark, proof counters, weeks ruler, GoatCounter view counts, post extras, Giscus (ruler milestones come from /weeks/api/milestones: flag an event with `home: true` in life-in-weeks-nextjs life-events.ts; the list in site.js is only the offline fallback)
blog/index.html         Essays list
blog/posts/<slug>/      index.html + images/ (cover.*, cover-thumb.* for list/home)
blog/BLOG_TEMPLATE.md   Post skeleton + checklist
data/                   profile.jpg (original), profile-1400.jpg (web copy used on the site)
tools/cjk_subset.py     Regenerates the Chinese font subsets
tools/verify_bodies.py  Checks post bodies are unchanged vs a git revision
404.html                Custom not-found page (GitHub Pages serves it for any missing path)
sitemap.xml, robots.txt Add each new post to sitemap.xml
blog/feed.xml           RSS feed, generated from blog/index.html by tools/build_feed.py (rerun after adding a post)
weeks/                  Served by a separate app; do not touch
```

**Cache-busting:** pages link `/assets/site.css?v=<hash>` and `/assets/site.js?v=<hash>` (GitHub Pages caches assets ~10 min). After editing either file, bump the hash in every page: `python3 -c "import hashlib;print(hashlib.md5(open('assets/site.css','rb').read()).hexdigest()[:8])"` (same for site.js), then replace the `?v=` value in index.html, blog/index.html, 404.html and every blog/posts/*/index.html (and the new-post template).

Pages use root-absolute paths (`/assets/site.css`, `/blog/posts/...`), so test with a local server from the repo root: `python3 -m http.server 8791 --bind 127.0.0.1`.

## Design System: "Bright Grid" (direction E)

Hairline-gridded editorial layout. Everything lives in `assets/site.css`; pages keep only page-specific CSS inline (home sections, blog list).

- **Tokens** (`:root`, dark overrides under `prefers-color-scheme` and `[data-theme="dark"]`): `--bg #fff / --bg-2 / --ink #0B0D12 / --ink-2 / --muted / --line / --accent #1E45FF (dark #6F8BFF) / --tint / --live`. Never hardcode colors; use tokens.
- **Type:** Archivo (variable, width 100-125) for everything; Noto Sans SC for Chinese. Display headings use class `d` (weight 900, wide, uppercase, tight leading). Small labels use `cap` (12px caps, muted).
- **Structure:** `.frame` > `.nav` (hairline cells) + `.page` (main + sticky `.rail` "At a glance") + `.foot`. Sections are `.sec` with numbered `.sec-top`. Chips `.chip`, buttons `.btn`/`.btn.primary`, inline links `.lnk`.
- **YZY mark:** `<a class="yzy"><span class="y1">Y</span><span class="z">Z</span><span class="y2">Y</span></a>`; the two Ys swap places (palindrome). Footer line: "YZY reads the same both ways."
- **Dark mode:** toggle in the nav (`[data-theme-toggle]`), stored in localStorage key `theme`. An inline snippet in `<head>` applies it before paint; `?theme=dark|light` overrides it (used for screenshots).
- **Copy rules:** no "Last updated" or colophon lines. Write "AI-generated content (AIGC)" on first mention.
- **Responsive:** breakpoints 1100 / 900 / 600px; no horizontal overflow at 375px.

## Link previews (required in `<head>` of every page)

Each page has a canonical link plus Open Graph and Twitter tags (`summary_large_image`, `@yizhou_yu`). Home and blog list use `/assets/og.jpg` (1200×630 card); each post uses its own `images/og.jpg`. Pages also carry JSON-LD structured data (home: Person + WebSite; blog list: Blog; posts: BlogPosting). The block is in `blog/BLOG_TEMPLATE.md`; keep the Person `sameAs` links in `index.html` in sync with the Elsewhere links.

## Analytics (required in `<head>` of every page)

Google tag `G-T39LJ72QFL`, Cloudflare beacon (token `8502e35b873b4becad641200564f6c41`), GoatCounter (`//gc.zgo.at/count.js`, `data-goatcounter="https://yizhouyu.goatcounter.com/count"`). Copy the block from an existing page verbatim. View counts come from `https://yizhouyu.goatcounter.com/counter/<path>.json` via `[data-gc-path]` elements (handled in `site.js`).

## Chinese fonts (CJK subsets)

Each page loads Noto Sans SC with `&text=<only the glyphs that page uses>` so it stays small and fully static. After editing any page or adding a post, run:

```bash
python3 tools/cjk_subset.py          # rewrites the text= parameter in every page
python3 tools/cjk_subset.py --check  # CI-style check, exit 1 if stale
```

A new page must contain `<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@500;700;900&display=swap&text=" rel="stylesheet">`; the script fills in `text=`. It scans `index.html` and every `blog/**/index.html`.

## Publishing a blog post

Content workflow: the user writes in Google Docs (or pastes content) and attaches images in chat.

1. Fetch the doc: `npx @googleworkspace/cli docs documents get --params '{"documentId": "DOC_ID"}' --format json` (ID is between `/d/` and `/edit`; creds in `~/.config/gws/client_secret.json`; re-auth with `npx @googleworkspace/cli auth login --scopes "https://www.googleapis.com/auth/documents,openid,https://www.googleapis.com/auth/userinfo.email"`).
2. Generate the body HTML with a script from the doc JSON. Do not retype content; preserve hyperlinks (`textStyle.link.url`) as `<a>`.
3. `mkdir blog/posts/<slug>/images`; save `cover.*` (about 1200 px wide) and a ~800 px `cover-thumb.*`, plus any inline images.
4. Copy `blog/posts/cultivation-ai/index.html` to the new slug and follow `blog/BLOG_TEMPLATE.md`: update title/description/tags/date/essay number/cover/"Filed", prev/next links, and replace only the contents of `<div class="post-content">`.
5. Add the entry to `blog/index.html` (newest first, renumber the `no` badges and the count), update the home "Writing" section/"3 essays" counts, and add the new path to the `paths` array in `site.js` (total reads counter). Update "Essay 0N of 0M" and prev/next on the neighbouring posts.
6. Add the post to `sitemap.xml`, run `python3 tools/build_feed.py` and `python3 tools/cjk_subset.py`, then preview locally and check light/dark at 1440 and 390 px.
7. Commit. Push only when the user asks (push deploys to production).

Reading time, view counts, the quote-style paragraphs (a paragraph that is only bold text, not ending in a colon) and Giscus comments are all injected by `site.js`; do not add them by hand. Giscus: repo `yizhouyu/blog-comments`, repo-id `R_kgDOQGKylA`, category `Announcements` (`DIC_kwDOQGKylM4Cw4bj`), mapping `pathname`, theme `preferred_color_scheme`. Moderate at https://github.com/yizhouyu/blog-comments/discussions.

`python3 tools/verify_bodies.py [rev]` confirms each post's body is byte-identical to a git revision (use when re-templating).

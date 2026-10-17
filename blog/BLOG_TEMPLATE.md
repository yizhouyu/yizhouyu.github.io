# Blog post template (Bright Grid)

Copy `blog/posts/cultivation-ai/index.html` to `blog/posts/<slug>/index.html` and edit the marked parts. Shared CSS/JS come from `/assets/site.css` and `/assets/site.js`; nothing else is needed. See `.claude/CLAUDE.md` for the full workflow.

## Skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- analytics block (GA, Cloudflare, GoatCounter): copy verbatim from an existing post -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>POST TITLE - Yizhou Yu</title>
  <meta name="description" content="ONE-SENTENCE DEK">
  <link rel="canonical" href="https://yizhouyu.dev/blog/posts/SLUG/">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Yizhou Yu">
  <meta property="og:title" content="POST TITLE">
  <meta property="og:description" content="ONE-SENTENCE DEK">
  <meta property="og:url" content="https://yizhouyu.dev/blog/posts/SLUG/">
  <meta property="og:image" content="https://yizhouyu.dev/blog/posts/SLUG/images/og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@yizhou_yu">
  <meta name="color-scheme" content="light dark">
  <!-- favicon + theme snippet: copy verbatim -->
  <!-- Archivo link + Noto Sans SC link ending in &text= (filled by tools/cjk_subset.py) -->
  <link rel="stylesheet" href="/assets/site.css?v=c0d77e25">
</head>
<body>
<div class="frame">
  <!-- header.nav: copy verbatim (Writing has aria-current="page") -->
  <div class="page" style="grid-template-columns:minmax(0,1fr)">
    <main class="main">
      <article data-tags="Tag1,Tag2">
        <header class="ph">
          <p class="crumbs"><a class="cap" href="/blog/">← Writing</a><span class="cap">/</span><span class="cap">Essay 04 of 04</span></p>
          <h1 class="d">POST TITLE (wrap Chinese in <span class="zh" lang="zh-Hans">…</span>)</h1>
          <p class="dek">ONE-SENTENCE DEK (same as meta description)</p>
        </header>
        <div class="facts">
          <div><span class="cap">Published</span><b><time datetime="YYYY-MM-DD">Mon D, YYYY</time></b></div>
          <div><span class="cap">Reading</span><b data-reading>N min</b></div>
          <div><span class="cap">Read by</span><b data-gc-path="/blog/posts/SLUG/" hidden></b><b class="gc-fallback">—</b></div>
          <div><span class="cap">Filed</span><b>Topic · Topic</b></div>
        </div>
        <figure class="cover"><img src="/blog/posts/SLUG/images/cover.jpg" alt="…"></figure>
        <div class="bodywrap">
          <div class="post-content">
            <!-- body: h2, p, ul/ol, h3, img, table, blockquote, code, hr. Only these are styled. -->
          </div>
          <footer class="after">
            <nav class="pn" aria-label="More writing">
              <a class="prev" href="/blog/posts/OLDER/" rel="prev"><span class="cap">← Older</span><h3>Older title</h3></a>
              <a class="next" href="/blog/posts/NEWER/" rel="next"><span class="cap">Newer →</span><h3>Newer title</h3></a>
            </nav>
            <div class="comments" data-giscus></div>
          </footer>
        </div>
      </article>
    </main>
  </div>
  <!-- footer.foot: copy verbatim -->
</div>
<script src="/assets/site.js?v=cb16c256"></script>
</body>
</html>
```

## Notes

- `site.js` fills in reading time, the live view count, the Giscus comments (at `[data-giscus]`) and the pull-quote style. The "N min" in the HTML is only a fallback.
- Use root-absolute paths for links and images.
- First `<h2>` is numbered 01 automatically.
- Omit the `prev` or `next` link at either end of the series.
- After editing: `python3 tools/cjk_subset.py`.
- Checklist: list entry in `blog/index.html` + home "Writing" + `paths` in `assets/site.js` + a `<url>` in `sitemap.xml`; cover, `cover-thumb` and a 1200×630 `og.jpg` (JPEG, for link previews); dark mode and 375 px checked.
- Embed a YouTube video with `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/VIDEO_ID" title="…" loading="lazy" allowfullscreen …></iframe></div>` plus a `<p class="video-cap">` with a "Watch on YouTube" link.

# Blog Post Template

Use this template when creating new blog posts to ensure consistent styling and functionality.

## Shared Resources

All blog posts need just **TWO files** - ONE CSS and ONE JavaScript:

### In `<head>`:
```html
<link rel="stylesheet" href="../shared-styles.css">
```

### Before `</body>`:
```html
<!-- Shared blog script - handles theme toggle, footer, and all UI elements -->
<script src="../shared-blog.js"></script>
```

### Footer placeholder (inside `<article>`):
```html
<!-- Footer will be injected here by shared-blog.js -->
<div id="blog-post-footer"></div>
```

**Note:** The theme toggle button is automatically created by `shared-blog.js` - no manual HTML needed!

## What's Included in Shared Files

### `shared-styles.css` (ALL blog post styling - 350+ lines)
- **Reset & base styles** (*, body, dark mode)
- **Container** (max-width, padding, animations)
- **Back link** (styling and hover effects)
- **Post header** (margins, borders)
- **Typography** (h1, h2, h3 - font sizes, colors, letter-spacing)
- **Post meta** (date, icons)
- **Post content** (paragraphs, lists, links, strong, tables, hr, images)
- **Theme toggle button** (fixed position, styling)
- **Post footer** (border, links, separators)
- **Responsive design** (mobile breakpoints for all elements)

### `shared-blog.js` (combines theme + footer + UI creation)
- **Theme toggle functionality** - Light/dark mode with localStorage persistence
- **Footer injection** - Auto-inserts footer HTML (Home · GitHub · LinkedIn)
- **Theme button creation** - Automatically creates and positions the theme toggle button
- **Smart initialization** - Applies saved theme preference on page load

## Updating Shared Components

To update styling or functionality for **all** blog posts:

1. **ALL CSS** (styling, layout, colors, typography, responsive): Edit `/blog/shared-styles.css`
2. **Footer HTML, theme toggle, UI elements**: Edit `/blog/shared-blog.js`

Changes will automatically apply to all posts using these shared files.

### What stays in individual HTML files?
- Analytics scripts (Google Analytics, Cloudflare)
- Page-specific metadata (title, description, favicon)
- Post content (the actual blog post HTML)
- Optional: Post-specific CSS overrides (in `<style>` tag if needed)

## Example Minimal Blog Post Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-T39LJ72QFL"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-T39LJ72QFL');
    </script>

    <!-- Cloudflare Web Analytics -->
    <script defer src='https://static.cloudflareinsights.com/beacon.min.js'
            data-cf-beacon='{"token": "8502e35b873b4becad641200564f6c41"}'></script>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Post Title - Yizhou Yu</title>
    <meta name="description" content="Your post description">
    <link rel="icon" href="data:image/svg+xml,...">

    <!-- REQUIRED: Shared styles -->
    <link rel="stylesheet" href="../shared-styles.css">

    <style>
        /* Your post-specific styles here */
    </style>
</head>
<body>
    <div class="container">
        <a href="../" class="back-link">
            <svg>...</svg>
            Back to Blog
        </a>

        <article>
            <header class="post-header">
                <h1>Your Post Title</h1>
                <div class="post-meta">
                    <svg>...</svg>
                    October 19, 2025
                </div>
            </header>

            <div class="post-content">
                <!-- Your content here -->
            </div>

            <!-- REQUIRED: Footer placeholder -->
            <div id="blog-post-footer"></div>
        </article>
    </div>

    <!-- REQUIRED: Shared blog script (creates theme toggle + footer automatically) -->
    <script src="../shared-blog.js"></script>
</body>
</html>
```

## Benefits

✅ **Single source of truth** - Update footer/theme once, applies everywhere
✅ **Consistency** - All posts have identical footer and theme behavior
✅ **Easy maintenance** - No need to update multiple files
✅ **Clean HTML** - Less repetitive code in each post

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Personal website for Yizhou Yu (Software Engineer at Meta). Static site built with vanilla HTML/CSS/JS, hosted on GitHub Pages.

**Live URLs:**
- Primary: https://yizhouyu.dev
- Secondary: https://yzyzy.dev (both domains serve same content)

**Repository:** https://github.com/yizhouyu/yizhouyu.github.io

## Site Architecture

This is a static HTML site with no build process. All pages are standalone HTML files with embedded CSS and JavaScript.

**Key sections:**
- `/index.html` - Main landing page with profile, experience, education, skills
- `/blog/` - Blog section with posts and search functionality
- `/weeks/` - "Life in Weeks" visualization
- `/data/` - Static assets (profile picture, images)

**Shared design system:**
- Consistent color palette (blue gradient: #3b82f6 to #1e40af)
- Dark mode toggle (synced via localStorage)
- Responsive design with mobile breakpoints
- All pages include Google Analytics (G-T39LJ72QFL) + Cloudflare Analytics

## Development Workflow

### Making Changes
1. Edit HTML/CSS/JS files directly (no build step)
2. Test locally by opening HTML files in browser
3. Commit changes with descriptive messages
4. Push to GitHub - changes go live automatically via GitHub Pages (2-3 min deploy time)

### Git Commands
```bash
git status                    # Check what changed
git add .                     # Stage all changes
git commit -m "message"       # Commit with message
git push                      # Deploy to GitHub Pages
```

**Commit convention:** Include Claude Code attribution in commits when changes are made via Claude Code.

## Blog System

### Architecture Decision
- **Chosen approach**: Self-hosted blog at `yizhouyu.dev/blog` (subdirectory)
- **Rejected alternatives**: Substack, subdomain hosting
- **Reasoning**:
  - Best SEO (subdirectory inherits main domain authority)
  - Full control and ownership
  - Free GitHub Pages hosting
  - No platform lock-in or fees
  - Direct integration with existing site

## Directory Structure
```
blog/
├── index.html              # Blog listing page with search
├── posts/                  # Individual blog posts
│   ├── test.html
│   └── [future-posts].html
└── images/                 # Post images (create as needed)
    └── [post-images].jpg
```

## Publishing Workflow

### User's Content Creation Process
1. Write post in Google Docs (any formatting)
2. Copy content to Claude Code chat
3. Attach any images directly in chat
4. Provide title and date (if not today)

### Claude's Publishing Process
1. Convert content to HTML matching site style
2. Save images to `/blog/images/` with descriptive names
3. Create post HTML at `/blog/posts/[slug].html`
4. Update `/blog/index.html` with new post card
5. Commit and push to GitHub
6. Live in ~2 minutes after GitHub Pages rebuild

### Post Metadata
- **Title**: User-provided
- **Date**: Auto-set to today unless specified
- **URL slug**: Auto-generated from title (e.g., "My Thoughts" → `my-thoughts.html`)
- **Timestamp**: Displayed in format "October 14, 2025"

### Image Handling
- **Option 1 (Recommended)**: Attach images in chat
- **Option 2**: Provide image URLs (for already-hosted images)
- **Option 3**: Reference local file paths
- Images saved to `/blog/images/` with naming: `YYYY-MM-DD-post-slug-description.jpg`

## Current Features
- ✅ Blog index page with post listing
- ✅ Individual post pages
- ✅ Real-time search by title
- ✅ Dark mode support
- ✅ Responsive design
- ✅ Timestamps on all posts
- ✅ Clean design matching main site
- ✅ Google Analytics + Cloudflare tracking

## Potential Future Enhancements
Consider adding if user requests:
- Cover images for posts (displayed in blog listing)
- Categories/tags system
- Reading time estimate
- Social share buttons
- Table of contents for long posts
- Code syntax highlighting
- RSS feed
- Comments system (via third-party like Disqus or utterances)

## Example Publishing Request
```
New post:
Title: "My thoughts on AI coding assistants"
Date: October 15, 2025

[post content pasted from Google Docs]

Images: [attached in chat]
```

### Technical Implementation
- All blog pages match main site design system (colors, dark mode, responsive)
- Search implemented with client-side JavaScript (filters on title)
- Theme preference syncs with main site via localStorage
- No database - posts are static HTML files
- Images stored in `/blog/images/` directory

### Git Workflow for Blog Posts
- Each post = one atomic commit (HTML + images + index update)
- Commit immediately after creating post
- Push immediately - auto-deploys to GitHub Pages

## Design System

When creating new pages or sections, maintain consistency:

**Colors:**
- Primary gradient: `linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)`
- Background light: `#f7fafc`
- Background dark: `#1a202c`
- Text light mode: `#2d3748`
- Text dark mode: `#e2e8f0`
- Accent: `#3b82f6`

**Typography:**
- Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif`
- Line height: `1.6`

**Interactive elements:**
- Buttons use gradient background with shadow
- Hover states: `translateY(-2px)` with increased shadow
- Border radius: `20px` (containers), `50px` (buttons), `12px` (inputs)
- Transitions: `0.3s ease`

**Dark mode:**
- Toggle button fixed at top-right
- Preference stored in localStorage key `theme`
- All pages check theme on load and sync

## Analytics Integration

All pages must include these tracking scripts in `<head>`:

```html
<!-- Google tag (gtag.js) -->
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
```

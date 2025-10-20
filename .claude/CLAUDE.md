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
├── index.html              # Blog listing page with search and statistics
├── shared-styles.css       # Shared CSS for all blog posts
├── shared-blog.js          # Shared JavaScript (theme, footer, stats, view counts)
├── goatcounter-setup.md    # Instructions for setting up GoatCounter
├── posts/                  # Individual blog posts
│   ├── [post-slug]/
│   │   ├── index.html
│   │   └── images/        # Post-specific images
└── images/                 # Shared blog images (if needed)
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
- ✅ Real-time search by title and tags
- ✅ Dark mode support (synced with main site)
- ✅ Responsive design
- ✅ Timestamps on all posts
- ✅ Clean design matching main site
- ✅ Google Analytics + Cloudflare tracking
- ✅ **Blog statistics system:**
  - Reading time calculation (auto-calculated per post)
  - Total posts count on blog index
  - Total reading time across all posts
  - View count tracking (via GoatCounter - needs setup)
- ✅ **Shared components:**
  - `shared-styles.css` - Consistent styling across all blog posts
  - `shared-blog.js` - Theme toggle, footer, tags, reading time, view counts

## Blog Statistics System

### Overview
The blog includes a comprehensive statistics system that displays useful metrics to readers while remaining privacy-conscious.

### Statistics Displayed

**On Individual Posts:**
1. **Published Date** - e.g., "October 19, 2025"
2. **Reading Time** - Auto-calculated from word count (200 words/min average)
3. **View Count** - Fetched from GoatCounter API (when configured)

**On Blog Index:**
1. **Total Posts** - Count of all published posts
2. **Total Reading Time** - Sum of all post reading times
3. **Total Views** - Aggregate views across all posts (when GoatCounter is configured)

### Implementation Details

**Reading Time Calculation:**
- Location: `blog/shared-blog.js` → `calculateReadingTime()`
- Method: Counts words in `.post-content`, divides by 200 words/min
- Display: Automatically appended to `.post-meta` on post pages
- Format: "X min read"

**View Count Tracking:**
- Service: GoatCounter (https://goatcounter.com)
- Privacy-friendly, no cookies, GDPR compliant
- Free for personal use
- Public API for fetching counts

### GoatCounter Setup Instructions

**Status:** Ready to activate (tracking code placeholder in place)

**Setup Steps:**
1. Create account at https://goatcounter.com/signup
2. Choose site code (e.g., "yizhouyu")
3. Get tracking script from dashboard
4. Update two locations:
   - `blog/shared-blog.js` → Replace `GOATCOUNTER_CODE = 'YOUR-CODE'`
   - Add tracking script to `<head>` tags in:
     - `blog/index.html`
     - All blog post HTML files (look for comment: "GoatCounter Analytics - ADD YOUR TRACKING CODE HERE")

**Files to Update:**
```javascript
// In blog/shared-blog.js
const GOATCOUNTER_CODE = 'yizhouyu'; // Replace 'YOUR-CODE' with actual code
```

```html
<!-- In blog/index.html and blog/posts/*/index.html -->
<script data-goatcounter="https://yizhouyu.goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
```

**Features Once Activated:**
- Real-time view counting
- View counts display on individual posts
- Total views on blog index
- Public dashboard at https://[your-code].goatcounter.com
- No backend needed - pure client-side integration

**Reference Documentation:**
See `blog/goatcounter-setup.md` for detailed setup instructions.

### Code Architecture

**Shared Components:**
- `blog/shared-styles.css` - All blog styling (posts, index, dark mode)
- `blog/shared-blog.js` - All JavaScript functionality:
  - Theme toggle (synced via localStorage)
  - Footer rendering
  - Tag rendering
  - Reading time calculation
  - View count fetching
  - Automatic initialization

**Usage in Blog Posts:**
```html
<!-- In <head> -->
<link rel="stylesheet" href="../../shared-styles.css">

<!-- Before </body> -->
<script src="../../shared-blog.js"></script>
```

### Why This Approach?

**Client-Side Only:**
- No backend required (works with GitHub Pages)
- No build process needed
- Instant updates on file change

**Privacy-Conscious:**
- GoatCounter: no cookies, no personal data tracking
- Google Analytics: kept for detailed analytics (private use)
- Cloudflare Analytics: lightweight, privacy-focused

**Reader Value:**
- Reading time helps readers decide if they have time to read
- View counts provide social proof
- Stats show blog is active and growing

## Potential Future Enhancements
Consider adding if user requests:
- Categories/tags filtering (tags already supported, just need filter UI)
- Social share buttons
- Table of contents for long posts
- Code syntax highlighting
- RSS feed
- Comments system (via utterances - GitHub-based, privacy-friendly)

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

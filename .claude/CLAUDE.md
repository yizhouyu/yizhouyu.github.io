# Blog Workflow Documentation

## Overview
This site has a blog section at `/blog` with self-hosted posts on the custom domain `yizhouyu.dev`.

## Architecture Decision
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

## Technical Notes
- All pages include Google Analytics (G-T39LJ72QFL) and Cloudflare Analytics
- Theme preference syncs via localStorage
- Static HTML (no build process needed)
- Deploys automatically via GitHub Pages
- Custom domain: yizhouyu.dev (already configured)

## Git Workflow
- Commit format: Descriptive message with Claude Code attribution
- Push immediately after commit
- Each post = one commit (includes HTML + images + index update)

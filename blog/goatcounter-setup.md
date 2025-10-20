# GoatCounter Setup Instructions

## Step 1: Create Account
1. Go to https://www.goatcounter.com/signup
2. Create a free account
3. Choose a site code (e.g., "yizhouyu")

## Step 2: Get Tracking Code
After signup, you'll receive a tracking code that looks like:
```html
<script data-goatcounter="https://[your-code].goatcounter.com/count"
        async src="//gc.zgo.at/count.js"></script>
```

## Step 3: Integration Steps
Once you have the tracking code:

1. Add the tracking script to both:
   - `blog/index.html` (before closing `</head>` tag)
   - Add to individual blog posts via `shared-blog.js`

2. The tracking script will automatically:
   - Count page views
   - Track unique visitors
   - Provide realtime analytics

## Step 4: Display View Counts
GoatCounter provides a simple API to fetch view counts:
- Public endpoint: `https://[your-code].goatcounter.com/counter/[path].json`
- No authentication required for public counts

## Features Already Implemented
✅ Reading time calculation on individual posts
✅ Total posts count on blog index
✅ Total reading time on blog index
✅ Placeholder for view counts (will be populated once GoatCounter is set up)

## What Needs to Be Added
⏳ GoatCounter tracking script in `<head>` tags
⏳ View count fetching logic in JavaScript
⏳ Display view counts on individual posts and blog index

## Testing
After adding the tracking code:
1. Visit a blog post
2. Wait 1-2 minutes for GoatCounter to register
3. Check your GoatCounter dashboard
4. Verify counts appear on your blog pages

// Shared blog functionality - includes theme toggle, footer, and auto-creates UI elements
// Usage: Just add <script src="../shared-blog.js"></script> before </body>

(function() {
    'use strict';

    // ===== THEME TOGGLE FUNCTIONALITY =====

    // Check for saved theme preference or default to light mode
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // Toggle theme function (globally available)
    window.toggleTheme = function() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');

        // Update icon
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.textContent = isDark ? '☀️' : '🌙';
        }

        // Save preference
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    };

    // ===== GISCUS COMMENTS HTML =====

    const giscusHTML = `
        <div class="giscus-comments">
            <script src="https://giscus.app/client.js"
                    data-repo="yizhouyu/blog-comments"
                    data-repo-id="R_kgDOQGAZLw"
                    data-category="Announcements"
                    data-category-id="DIC_kwDOQGAZL84Cw3xg"
                    data-mapping="pathname"
                    data-strict="0"
                    data-reactions-enabled="1"
                    data-emit-metadata="0"
                    data-input-position="bottom"
                    data-theme="preferred_color_scheme"
                    data-lang="en"
                    crossorigin="anonymous"
                    async>
            </script>
        </div>
    `;

    // ===== FOOTER HTML =====

    const footerHTML = `
        <footer class="post-footer">
            <div class="footer-links">
                <a href="/blog/" class="footer-link" aria-label="Back to Blog">Blog</a>
                <span class="footer-separator">·</span>
                <a href="/" class="footer-link" aria-label="Home">Home</a>
                <span class="footer-separator">·</span>
                <a href="https://github.com/yizhouyu" target="_blank" rel="noopener noreferrer" class="footer-link" aria-label="GitHub">
                    <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                    </svg>
                </a>
                <span class="footer-separator">·</span>
                <a href="https://linkedin.com/in/yizhouyu" target="_blank" rel="noopener noreferrer" class="footer-link" aria-label="LinkedIn">
                    <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                </a>
            </div>
        </footer>
    `;

    // ===== THEME TOGGLE BUTTON HTML =====

    const themeButtonHTML = `
        <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" aria-label="Toggle dark mode">
            <span id="themeIcon">${currentTheme === 'dark' ? '☀️' : '🌙'}</span>
        </button>
    `;

    // ===== TAG RENDERING =====

    function renderTags() {
        const articles = document.querySelectorAll('article[data-tags]');
        articles.forEach(article => {
            const tagsAttr = article.getAttribute('data-tags');
            if (tagsAttr) {
                const tagsContainer = article.querySelector('.post-tags');
                if (tagsContainer) {
                    const tags = tagsAttr.split(',').map(tag => tag.trim());
                    tagsContainer.innerHTML = tags.map(tag =>
                        `<span class="tag">${tag}</span>`
                    ).join('');
                }
            }
        });
    }

    // ===== READING TIME CALCULATION =====

    function calculateReadingTime() {
        const article = document.querySelector('article .post-content');
        if (!article) return 0;

        const text = article.textContent || article.innerText;
        const wordCount = text.trim().split(/\s+/).length;
        const wordsPerMinute = 200; // Average reading speed
        const minutes = Math.ceil(wordCount / wordsPerMinute);

        return minutes;
    }

    function displayReadingTime() {
        const postMeta = document.querySelector('.post-meta');
        if (!postMeta) return;

        const readingTime = calculateReadingTime();
        if (readingTime > 0) {
            // Check if reading time already exists
            if (!postMeta.querySelector('.reading-time')) {
                const readingTimeElement = document.createElement('span');
                readingTimeElement.className = 'reading-time';
                readingTimeElement.innerHTML = `<span class="footer-separator">·</span>${readingTime} min read`;
                postMeta.appendChild(readingTimeElement);
            }
        }
    }

    // Make calculateReadingTime available globally for blog index
    window.calculateReadingTime = calculateReadingTime;

    // ===== GOATCOUNTER VIEW COUNT =====

    // GoatCounter site code - dashboard at https://yizhouyu.goatcounter.com
    const GOATCOUNTER_CODE = 'yizhouyu';

    function displayViewCount() {
        // Skip if GoatCounter is not configured
        if (GOATCOUNTER_CODE === 'YOUR-CODE') {
            return;
        }

        const postMeta = document.querySelector('.post-meta');
        if (!postMeta) return;

        // Get current page path
        const path = window.location.pathname;

        // Fetch view count from GoatCounter API
        fetch(`https://${GOATCOUNTER_CODE}.goatcounter.com/counter${path}.json`)
            .then(response => response.json())
            .then(data => {
                const count = data.count || 0;

                // Check if view count already exists
                if (!postMeta.querySelector('.view-count')) {
                    const viewCountElement = document.createElement('span');
                    viewCountElement.className = 'view-count';
                    viewCountElement.innerHTML = `<span class="footer-separator">·</span>${count.toLocaleString()} views`;
                    postMeta.appendChild(viewCountElement);
                }
            })
            .catch(error => {
                console.log('Could not fetch view count:', error);
            });
    }

    // Make displayViewCount available globally
    window.displayViewCount = displayViewCount;

    // ===== INITIALIZE WHEN DOM IS READY =====

    function init() {
        // Insert Giscus comments (before footer)
        const footerContainer = document.getElementById('blog-post-footer');
        if (footerContainer) {
            // Add comments section before footer
            footerContainer.innerHTML = giscusHTML + footerHTML;
        }

        // Insert theme toggle button
        const body = document.body;
        if (body && !document.getElementById('themeToggle')) {
            body.insertAdjacentHTML('beforeend', themeButtonHTML);
        }

        // Render tags
        renderTags();

        // Display reading time
        displayReadingTime();

        // Display view count (if GoatCounter is configured)
        displayViewCount();
    }

    // Run initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

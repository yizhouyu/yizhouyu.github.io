// Shared theme toggle functionality for all blog pages
// Automatically included - no manual setup needed

(function() {
    // Check for saved theme preference or default to light mode
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.textContent = '☀️';
        }
    }

    // Make toggleTheme function globally available
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
})();

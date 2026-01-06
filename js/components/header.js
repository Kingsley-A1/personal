/**
 * REIGN - Shared Header Component
 * This file contains the shared header HTML that is injected into all pages
 * Use: Include this script and call HeaderComponent.render()
 */

const HeaderComponent = {
    /**
     * Render the header into a container
     * @param {string} containerId - ID of the container element
     * @param {Object} options - Configuration options
     */
    render(containerId = 'header-container', options = {}) {
        const {
            showBreadcrumb = true,
            pageTitle = '',
            pageIcon = 'ph-crown'
        } = options;

        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Header container not found:', containerId);
            return;
        }

        const isLoggedIn = Auth.isLoggedIn();
        const user = Auth.getUser();
        const basePath = window.location.pathname.includes('/app/') ? '../' : '';

        container.innerHTML = `
            <header class="header">
                <button class="mobile-menu-btn" onclick="UI.toggleSidebar()" title="Menu">
                    <i class="ph-bold ph-list"></i>
                </button>
                
                <a href="${basePath}index.html" class="header-brand">
                    <img src="${basePath}icons/icon-192.png" alt="REIGN" class="header-logo">
                    <h1 class="header-title">REIGN</h1>
                    <p class="tagline hidden-mobile">Rule Your Day</p>
                </a>

                <div class="header-actions">
                    <!-- Streak Badge (visible when learning streak > 0) -->
                    <div id="streak-badge" class="streak-badge hidden" onclick="Nav.goto('learning')" title="Learning Streak">
                        <i class="ph-fill ph-fire"></i>
                        <span id="streak-count">0</span>
                    </div>

                    <!-- Notifications (shown when logged in) -->
                    ${isLoggedIn ? `
                        <a href="${basePath}app/notifications.html" id="notifications-btn" class="icon-btn notification-btn hidden-mobile" title="Notifications">
                            <i class="ph-bold ph-bell"></i>
                            <span id="notification-badge" class="notification-dot hidden"></span>
                        </a>
                    ` : ''}

                    <!-- User Profile (shown when logged in) -->
                    ${isLoggedIn ? `
                        <div id="user-profile" class="user-profile">
                            <a href="${basePath}app/profile.html" class="user-avatar" title="Profile">
                                <span id="user-initials">${Auth.getInitials()}</span>
                            </a>
                            <span id="sync-status" class="sync-status" title="Sync Status"></span>
                        </div>
                    ` : ''}

                    <!-- Guest Prompt (shown when not logged in) -->
                    ${!isLoggedIn ? `
                        <a href="${basePath}auth.html" id="guest-prompt" class="guest-prompt">
                            <i class="ph-bold ph-sign-in"></i>
                            <span>Log In</span>
                        </a>
                    ` : ''}

                    <div class="header-time hidden-mobile">
                        <p class="date" id="current-date">Today</p>
                        <p class="time" id="current-time">00:00</p>
                    </div>

                    <div class="header-buttons hidden-mobile">
                        <button onclick="Storage.export()" class="icon-btn" title="Export Backup">
                            <i class="ph-bold ph-download-simple"></i>
                        </button>
                        <label class="icon-btn" title="Import Backup" style="cursor: pointer;">
                            <i class="ph-bold ph-upload-simple"></i>
                            <input type="file" accept=".json" style="display: none;" onchange="Storage.import(this)">
                        </label>
                        <button onclick="Storage.reset()" class="icon-btn danger" title="Reset All Data">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                </div>
            </header>
        `;

        // Update streak badge
        this.updateStreakBadge();

        // Apply role theme (King/Queen) after components render
        if (typeof UI !== 'undefined' && UI.initTheme) {
            UI.initTheme();
        }
    },

    /**
     * Toggle user dropdown menu
     */
    toggleUserMenu() {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('hidden');
        }
    },

    /**
     * Toggle theme between light and dark
     */
    toggleTheme() {
        const data = Storage.getData();
        const newTheme = data.settings?.theme === 'dark' ? 'light' : 'dark';
        data.settings = data.settings || {};
        data.settings.theme = newTheme;
        Storage.saveData(data);
        document.documentElement.setAttribute('data-theme', newTheme);
    },

    /**
     * Update the streak badge display
     */
    updateStreakBadge() {
        const data = Storage.getData();
        const streak = data.learning?.streak || 0;
        const badge = document.getElementById('streak-badge');
        const count = document.getElementById('streak-count');

        if (badge && count) {
            if (streak > 0) {
                badge.classList.remove('hidden');
                count.textContent = streak;
            } else {
                badge.classList.add('hidden');
            }
        }
    }
};

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('user-dropdown');
    const avatarBtn = document.getElementById('user-avatar-btn');
    if (dropdown && !dropdown.contains(e.target) && !avatarBtn?.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

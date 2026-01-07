/**
 * REIGN - Shared Sidebar Component
 * This file contains the shared sidebar navigation HTML
 * Use: Include this script and call SidebarComponent.render()
 */

const SidebarComponent = {
    /**
     * Navigation items configuration
     */
    navItems: [
        // Main Section
        { id: 'dashboard', label: 'The Throne', icon: 'ph-crown', href: 'index.html', section: null },
        { id: 'morning', label: 'Morning Protocol', icon: 'ph-sun-horizon', href: 'app/morning.html' },
        { id: 'evening', label: 'Evening Report', icon: 'ph-moon-stars', href: 'app/evening.html' },

        // Growth Section
        { id: 'divider-growth', type: 'divider', label: 'Growth' },
        { id: 'focus', label: 'Focus Chamber (Timer)', icon: 'ph-timer', href: 'app/focus.html' },
        { id: 'learning', label: 'Learning Forge', icon: 'ph-graduation-cap', href: 'app/learning.html' },
        { id: 'idea', label: "Today's Idea", icon: 'ph-lightbulb', href: 'app/idea.html' },
        { id: 'lessons', label: "Today's Lessons", icon: 'ph-book-open-text', href: 'app/lessons.html' },
        { id: 'analytics', label: 'My Progress', icon: 'ph-chart-line-up', href: 'app/analytics.html' },

        // Reflection Section
        { id: 'divider-reflection', type: 'divider', label: 'Reflection' },
        { id: 'dailygood', label: 'The Good in Today', icon: 'ph-heart', href: 'app/dailygood.html' },
        { id: 'archive', label: 'Journal Archive', icon: 'ph-book-bookmark', href: 'app/archive.html' },
        { id: 'relationships', label: 'My Relationships', icon: 'ph-heart-half', href: 'app/relationships.html' },

        // Planning Section
        { id: 'divider-planning', type: 'divider', label: 'Planning' },
        { id: 'goals', label: 'Personal Goals', icon: 'ph-target', href: 'app/goals.html' },
        { id: 'reviews', label: 'Weekly Review', icon: 'ph-calendar-check', href: 'app/reviews.html' },
        { id: 'events', label: 'Calendar & Events', icon: 'ph-calendar-dots', href: 'app/events.html' },
        { id: 'savings', label: 'Daily Savings', icon: 'ph-piggy-bank', href: 'app/savings.html', badge: 'Soon' },

        // System Section
        { id: 'divider-system', type: 'divider', label: '' },
        { id: 'profile', label: 'Profile', icon: 'ph-user-circle', href: 'app/profile.html' },
        { id: 'docs', label: 'Help & Docs', icon: 'ph-book-open', href: 'app/docs.html' },
        { id: 'about', label: 'About REIGN', icon: 'ph-info', href: 'app/about.html' },
        { id: 'support', label: 'Support', icon: 'ph-hand-heart', href: 'app/support.html' },
        { id: 'notifications', label: 'Notifications', icon: 'ph-bell', href: 'app/notifications.html' },
        { id: 'settings', label: 'Settings', icon: 'ph-gear-six', href: 'app/settings.html' }
    ],

    /**
     * Render the sidebar into a container
     * @param {string} containerId - ID of the container element
     */
    render(containerId = 'sidebar-container') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Sidebar container not found:', containerId);
            return;
        }

        const currentPage = Nav.getCurrentPage();
        const basePath = window.location.pathname.includes('/app/') ? '../' : '';
        const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';

        let navHTML = '';

        this.navItems.forEach(item => {
            if (item.type === 'divider') {
                navHTML += `
                    <div class="nav-divider"></div>
                    ${item.label ? `<p class="nav-section-label">${item.label}</p>` : ''}
                `;
            } else {
                const isActive = item.id === currentPage;
                const isDisabled = item.badge === 'Soon';
                const href = item.id === 'dashboard'
                    ? `${basePath}index.html`
                    : `${basePath}${item.href}`;

                navHTML += `
                    <a href="${isDisabled ? '#' : href}" class="nav-btn ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}" data-target="${item.id}" title="${item.label}" aria-label="${item.label}${isActive ? ' (current page)' : ''}${isDisabled ? ' - coming soon' : ''}">
                        <i class="ph-duotone ${item.icon}" aria-hidden="true"></i>
                        <span>${item.label}</span>
                        ${item.badge ? `<span class="nav-badge coming-soon" aria-label="Coming soon">${item.badge}</span>` : ''}
                    </a>
                `;
            }
        });

        container.innerHTML = `
            <!-- Sidebar Overlay (Mobile) -->
            <div class="sidebar-overlay" onclick="SidebarComponent.toggleMobile()"></div>

            <!-- Sidebar -->
            <aside class="sidebar ${isCollapsed ? 'collapsed' : ''}" id="app-sidebar">
                <!-- Toggle Button -->
                <button class="sidebar-toggle" onclick="SidebarComponent.toggleCollapse()" title="Toggle Sidebar" aria-label="Toggle sidebar navigation" aria-expanded="true">
                    <i class="ph-bold ph-caret-left" aria-hidden="true"></i>
                </button>
                
                <nav class="sidebar-nav">
                    ${navHTML}
                </nav>
                
                <!-- Sidebar Footer -->
                <div class="sidebar-footer">
                    <a href="${basePath}auth.html" class="sidebar-sync-btn" aria-label="Sync your data to the cloud">
                        <i class="ph-bold ph-cloud-arrow-up" aria-hidden="true"></i>
                        <span>Sync Your Data</span>
                    </a>
                </div>
            </aside>
        `;
    },

    /**
     * Toggle sidebar collapsed state on desktop
     */
    toggleCollapse() {
        const sidebar = document.getElementById('app-sidebar');
        if (!sidebar) return;

        const isCollapsed = sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebar-collapsed', isCollapsed);
    },

    /**
     * Toggle sidebar on mobile
     */
    toggleMobile() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
        if (overlay) {
            overlay.classList.toggle('active');
        }
    },

    /**
     * Update active state based on current page
     */
    updateActiveState() {
        const currentPage = Nav.getCurrentPage();
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const target = btn.dataset.target;
            btn.classList.toggle('active', target === currentPage);
        });
    }
};

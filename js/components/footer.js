/**
 * REIGN - Shared Footer Component
 * Mobile bottom navigation and desktop footer
 */

const FooterComponent = {
    /**
     * Quick action items for mobile bottom nav
     */
    quickActions: [
        { id: 'dashboard', label: 'Home', icon: 'ph-throne', href: 'index.html' },
        { id: 'morning', label: 'Dawn', icon: 'ph-sun', href: 'app/morning.html' },
        { id: 'evening', label: 'Dusk', icon: 'ph-moon', href: 'app/evening.html' },
        { id: 'archive', label: 'Logs', icon: 'ph-book-open', href: 'app/archive.html' },
        { id: 'learning', label: 'Learn', icon: 'ph-graduation-cap', href: 'app/learning.html' }
    ],

    /**
     * Render the mobile bottom navigation
     * @param {string} containerId - ID of the container element
     */
    render(containerId = 'footer-container') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const currentPage = Nav.getCurrentPage();
        const basePath = window.location.pathname.includes('/app/') ? '../' : '';

        let navHTML = '';

        this.quickActions.forEach(item => {
            if (item.type === 'action') {
                navHTML += `
                    <button class="bottom-nav-btn action-btn" onclick="${item.action}">
                        <div class="action-btn-inner">
                            <i class="ph-bold ${item.icon}"></i>
                        </div>
                    </button>
                `;
            } else {
                const isActive = item.id === currentPage;
                const href = item.id === 'dashboard'
                    ? `${basePath}index.html`
                    : `${basePath}${item.href}`;

                navHTML += `
                    <a href="${href}" class="bottom-nav-btn ${isActive ? 'active' : ''}">
                        <i class="ph-${isActive ? 'fill' : 'duotone'} ${item.icon}"></i>
                        <span>${item.label}</span>
                    </a>
                `;
            }
        });

        container.innerHTML = `
            <nav class="mobile-nav">
                ${navHTML}
            </nav>
        `;
    },

    /**
     * Open quick add modal
     */
    openQuickAdd() {
        const content = `
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="ph-duotone ph-plus-circle" style="color: var(--royal-gold);"></i>
                    Quick Add
                </h2>
                <button class="modal-close" onclick="UI.closeModal()">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="quick-add-grid">
                    <a href="${this.getBasePath()}app/morning.html" class="quick-add-item">
                        <i class="ph-duotone ph-sun-horizon" style="color: #f59e0b;"></i>
                        <span>Morning Tasks</span>
                    </a>
                    <a href="${this.getBasePath()}app/idea.html" class="quick-add-item">
                        <i class="ph-duotone ph-lightbulb" style="color: #8b5cf6;"></i>
                        <span>New Idea</span>
                    </a>
                    <a href="${this.getBasePath()}app/lessons.html" class="quick-add-item">
                        <i class="ph-duotone ph-book-open-text" style="color: #3b82f6;"></i>
                        <span>Daily Lesson</span>
                    </a>
                    <a href="${this.getBasePath()}app/dailygood.html" class="quick-add-item">
                        <i class="ph-duotone ph-heart" style="color: #ec4899;"></i>
                        <span>Good Thing</span>
                    </a>
                    <a href="${this.getBasePath()}app/relationships.html" class="quick-add-item">
                        <i class="ph-duotone ph-user-plus" style="color: #10b981;"></i>
                        <span>Add Person</span>
                    </a>
                    <a href="${this.getBasePath()}app/events.html" class="quick-add-item">
                        <i class="ph-duotone ph-calendar-plus" style="color: #06b6d4;"></i>
                        <span>New Event</span>
                    </a>
                </div>
            </div>
        `;
        UI.showModal(content);
    },

    /**
     * Get base path for links
     */
    getBasePath() {
        return window.location.pathname.includes('/app/') ? '../' : '';
    }
};

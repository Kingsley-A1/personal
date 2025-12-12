/**
 * King Daily - Router Module
 * Handles SPA navigation
 */

const Router = {
    currentView: 'dashboard',
    views: ['dashboard', 'morning', 'evening', 'archive', 'events', 'learning', 'notifications', 'settings'],

    /**
     * Navigate to a view
     * @param {string} view - View name
     * @param {Function} renderCallback - Function to call for rendering
     */
    navigate(view, renderCallback) {
        if (!this.views.includes(view)) {
            view = 'dashboard';
        }

        this.currentView = view;
        this.updateNavigation(view);
        this.animateTransition(renderCallback);
    },

    /**
     * Update navigation button states
     * @param {string} activeView - Currently active view
     */
    updateNavigation(activeView) {
        // Desktop nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const isActive = btn.dataset.target === activeView;
            btn.classList.toggle('active', isActive);
        });

        // Mobile nav buttons
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            const isActive = btn.dataset.target === activeView;
            btn.classList.toggle('active', isActive);
        });
    },

    /**
     * Animate view transition
     * @param {Function} renderCallback - Render function
     */
    animateTransition(renderCallback) {
        const container = document.getElementById('main-view');

        // Remove animation class
        container.classList.remove('fade-in');

        // Force reflow
        void container.offsetWidth;

        // Add animation class
        container.classList.add('fade-in');

        // Call render
        if (renderCallback) {
            renderCallback();
        }
    },

    /**
     * Get current view
     * @returns {string} Current view name
     */
    getCurrentView() {
        return this.currentView;
    }
};

// Make available globally
window.Router = Router;

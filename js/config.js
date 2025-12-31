/**
 * REIGN - Configuration
 * API endpoints and app settings
 */

const Config = {
    // API URL
    API_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3001/api'
        : '/api',

    // App version
    VERSION: '2.0.0',

    // Sync settings
    SYNC: {
        AUTO_SYNC: true,           // Auto-sync on data changes
        SYNC_DEBOUNCE: 5000,       // Wait 5 seconds before syncing
        OFFLINE_QUEUE: true        // Queue syncs when offline
    },

    // Storage keys
    STORAGE_KEYS: {
        TOKEN: 'reign_token',
        USER: 'reign_user',
        DATA: 'reignData',
        LAST_SYNC: 'reign_last_sync',
        PENDING_SYNC: 'reign_pending_sync'
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return !!localStorage.getItem(this.STORAGE_KEYS.TOKEN);
    },

    /**
     * Get current user
     */
    getUser() {
        const userStr = localStorage.getItem(this.STORAGE_KEYS.USER);
        return userStr ? JSON.parse(userStr) : null;
    },

    /**
     * Get auth token
     */
    getToken() {
        return localStorage.getItem(this.STORAGE_KEYS.TOKEN);
    },

    /**
     * Clear auth data (logout)
     */
    clearAuth() {
        localStorage.removeItem(this.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(this.STORAGE_KEYS.USER);
    }
};

// Make available globally
window.Config = Config;

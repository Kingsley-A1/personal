/**
 * King Daily - Configuration
 * API endpoints and app settings
 */

const Config = {
    // API URL (change for production)
    API_URL: 'http://localhost:3001/api',

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
        TOKEN: 'kingdaily_token',
        USER: 'kingdaily_user',
        DATA: 'kingDailyData',
        LAST_SYNC: 'kingdaily_last_sync',
        PENDING_SYNC: 'kingdaily_pending_sync'
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

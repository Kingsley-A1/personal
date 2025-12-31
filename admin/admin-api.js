/**
 * REIGN Admin - API Service Layer
 * ============================================
 * Centralized API communication for the Admin Dashboard.
 * Replaces mock data with real backend calls.
 * 
 * @module admin/admin-api
 */

const AdminAPI = {
    /**
     * Base API URL - Uses the same server as the main app
     * Adjust this if your API is hosted separately
     */
    BASE_URL: 'http://localhost:3001/api',

    /**
     * Cache for reducing redundant API calls
     * Each cache entry has: data, timestamp, ttl (ms)
     */
    _cache: {},
    _cacheTTL: 60000, // 1 minute default TTL

    // ============================================
    // AUTHENTICATION HELPERS
    // ============================================

    /**
     * Get authentication token from localStorage
     * @returns {string|null} JWT token or null
     */
    getToken() {
        return localStorage.getItem('reign_token');
    },

    /**
     * Get authenticated request headers
     * @returns {Object} Headers object with Authorization
     */
    getHeaders() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    },

    /**
     * Handle API errors consistently
     * @param {Response} response - Fetch response object
     * @throws {Error} With appropriate message
     */
    async handleError(response) {
        if (response.status === 401) {
            // Token expired or invalid - redirect to login
            console.error('Authentication expired');
            window.location.href = '../auth.html';
            throw new Error('Authentication required');
        }

        if (response.status === 403) {
            throw new Error('Admin access required');
        }

        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with status ${response.status}`);
    },

    /**
     * Make authenticated API request
     * @param {string} endpoint - API endpoint (without base URL)
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Response data
     */
    async request(endpoint, options = {}) {
        const url = `${this.BASE_URL}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        });

        if (!response.ok) {
            await this.handleError(response);
        }

        return response.json();
    },

    // ============================================
    // USERS API
    // ============================================

    /**
     * Get paginated list of users
     * @param {Object} params - Query parameters
     * @returns {Promise<Object>} { users, pagination }
     */
    async getUsers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/admin/users${queryString ? '?' + queryString : ''}`;
        return this.request(endpoint);
    },

    /**
     * Get detailed user information
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User details with activity
     */
    async getUser(userId) {
        return this.request(`/admin/users/${userId}`);
    },

    /**
     * Update user information
     * @param {string} userId - User ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated user
     */
    async updateUser(userId, updates) {
        return this.request(`/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    /**
     * Delete a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    async deleteUser(userId) {
        return this.request(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
    },

    /**
     * Suspend a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Updated user
     */
    async suspendUser(userId) {
        return this.request(`/admin/users/${userId}/suspend`, {
            method: 'POST'
        });
    },

    /**
     * Unsuspend (reactivate) a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Updated user
     */
    async unsuspendUser(userId) {
        return this.request(`/admin/users/${userId}/unsuspend`, {
            method: 'POST'
        });
    },

    /**
     * Promote a user to admin role
     * @param {string} userId - User ID
     * @param {string} role - 'admin' or 'superadmin'
     * @returns {Promise<Object>} Updated user
     */
    async promoteUser(userId, role = 'admin') {
        return this.request(`/admin/users/${userId}/promote`, {
            method: 'POST',
            body: JSON.stringify({ role })
        });
    },

    /**
     * Demote a user to regular user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Updated user
     */
    async demoteUser(userId) {
        return this.request(`/admin/users/${userId}/demote`, {
            method: 'POST'
        });
    },

    /**
     * Reset a user's password (V1 - no email required)
     * @param {string} userId - User ID
     * @param {string} newPassword - Optional new password (auto-generated if not provided)
     * @returns {Promise<Object>} Result with temporaryPassword if auto-generated
     */
    async resetUserPassword(userId, newPassword = null) {
        const body = newPassword ? { newPassword } : {};
        return this.request(`/admin/users/${userId}/reset-password`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    // ============================================
    // ANALYTICS API
    // ============================================

    /**
     * Get platform analytics
     * Uses cache to prevent excessive API calls
     * @param {boolean} forceRefresh - Bypass cache
     * @returns {Promise<Object>} Analytics data
     */
    async getAnalytics(forceRefresh = false) {
        const cacheKey = 'analytics';

        // Check cache
        if (!forceRefresh && this._cache[cacheKey]) {
            const cached = this._cache[cacheKey];
            if (Date.now() - cached.timestamp < this._cacheTTL) {
                return cached.data;
            }
        }

        const data = await this.request('/admin/analytics');

        // Update cache
        this._cache[cacheKey] = {
            data,
            timestamp: Date.now()
        };

        return data;
    },

    // ============================================
    // ANNOUNCEMENTS API
    // ============================================

    /**
     * Get all announcements
     * @returns {Promise<Object>} { announcements }
     */
    async getAnnouncements() {
        return this.request('/admin/announcements');
    },

    /**
     * Create a new announcement
     * @param {Object} announcement - { title, message, target }
     * @returns {Promise<Object>} Created announcement
     */
    async createAnnouncement(announcement) {
        return this.request('/admin/announce', {
            method: 'POST',
            body: JSON.stringify(announcement)
        });
    },

    /**
     * Update an announcement
     * @param {string} id - Announcement ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated announcement
     */
    async updateAnnouncement(id, updates) {
        return this.request(`/admin/announcements/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    /**
     * Delete an announcement
     * @param {string} id - Announcement ID
     * @returns {Promise<Object>} Deletion confirmation
     */
    async deleteAnnouncement(id) {
        return this.request(`/admin/announcements/${id}`, {
            method: 'DELETE'
        });
    },

    // ============================================
    // AUDIT LOG API
    // ============================================

    /**
     * Get audit logs with filtering
     * @param {Object} params - Query parameters { page, limit, userId, action, from, to }
     * @returns {Promise<Object>} { logs, availableActions, pagination }
     */
    async getAuditLogs(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/admin/audit${queryString ? '?' + queryString : ''}`;
        return this.request(endpoint);
    },

    // ============================================
    // HEALTH CHECK
    // ============================================

    /**
     * Check API health status
     * @returns {Promise<Object>} Health status including database connection
     */
    async getHealth() {
        return this.request('/health');
    },

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Clear all cached data
     */
    clearCache() {
        this._cache = {};
    },

    /**
     * Format user data for display consistency
     * @param {Object} user - Raw user object from API
     * @returns {Object} Formatted user object
     */
    formatUser(user) {
        return {
            ...user,
            initials: user.initials || this.getInitials(user.name),
            lastActive: this.formatTimeAgo(user.updatedAt),
            joinDate: this.formatDate(user.createdAt)
        };
    },

    /**
     * Generate initials from name
     * @param {string} name - Full name
     * @returns {string} Two-letter initials
     */
    getInitials(name) {
        if (!name) return '??';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    },

    /**
     * Format date for display
     * @param {string} dateStr - ISO date string
     * @returns {string} Formatted date
     */
    formatDate(dateStr) {
        if (!dateStr) return 'Unknown';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Format time ago for display
     * @param {string} dateStr - ISO date string
     * @returns {string} Human-readable time ago
     */
    formatTimeAgo(dateStr) {
        if (!dateStr) return 'Never';

        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return this.formatDate(dateStr);
    }
};

// Make available globally
window.AdminAPI = AdminAPI;

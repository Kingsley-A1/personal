/**
 * REIGN - Authentication Module
 * Handles user authentication and profile management
 */

const Auth = {
    /**
     * Login with email and password
     * @param {string} email 
     * @param {string} password 
     * @returns {Object} User data and token
     */
    async login(email, password) {
        const response = await fetch(`${Config.API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Save to localStorage
        localStorage.setItem(Config.STORAGE_KEYS.TOKEN, data.token);
        localStorage.setItem(Config.STORAGE_KEYS.USER, JSON.stringify(data.user));

        return data;
    },

    /**
     * Register new account
     * @param {string} name 
     * @param {string} email 
     * @param {string} password 
     * @returns {Object} User data and token
     */
    async register(name, email, password) {
        const response = await fetch(`${Config.API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        // Save to localStorage
        localStorage.setItem(Config.STORAGE_KEYS.TOKEN, data.token);
        localStorage.setItem(Config.STORAGE_KEYS.USER, JSON.stringify(data.user));

        return data;
    },

    /**
     * Logout user
     */
    logout() {
        Config.clearAuth();
        // Redirect to auth page
        window.location.href = 'auth.html';
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return Config.isLoggedIn();
    },

    /**
     * Get current user
     */
    getUser() {
        return Config.getUser();
    },

    /**
     * Get auth headers for API calls
     */
    getHeaders() {
        const token = Config.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    },

    /**
     * Update user profile
     * @param {Object} updates - Fields to update
     */
    async updateProfile(updates) {
        const response = await fetch(`${Config.API_URL}/auth/profile`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(updates)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Update failed');
        }

        // Update local storage
        localStorage.setItem(Config.STORAGE_KEYS.USER, JSON.stringify(data.user));

        return data.user;
    },

    /**
     * Upload avatar
     * @param {File} file - Image file
     */
    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);

        const token = Config.getToken();
        const response = await fetch(`${Config.API_URL}/auth/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Avatar upload failed');
        }

        // Update local storage
        localStorage.setItem(Config.STORAGE_KEYS.USER, JSON.stringify(data.user));

        return data.user;
    },

    /**
     * Remove avatar
     */
    async removeAvatar() {
        const response = await fetch(`${Config.API_URL}/auth/avatar`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to remove avatar');
        }

        localStorage.setItem(Config.STORAGE_KEYS.USER, JSON.stringify(data.user));
        return data.user;
    },

    /**
     * Verify token is still valid
     */
    async verifyToken() {
        if (!this.isLoggedIn()) return false;

        try {
            const response = await fetch(`${Config.API_URL}/auth/profile`, {
                headers: this.getHeaders()
            });

            if (!response.ok) {
                Config.clearAuth();
                return false;
            }

            const data = await response.json();
            localStorage.setItem(Config.STORAGE_KEYS.USER, JSON.stringify(data.user));
            return true;
        } catch (error) {
            // Network error - keep token, might be offline
            return true;
        }
    },

    /**
     * Check if session is still valid (not expired)
     * @returns {Promise<boolean>}
     */
    async isSessionValid() {
        // Check local expiry first
        const expiry = localStorage.getItem(Config.SESSION.EXPIRY_KEY);
        if (expiry && Date.now() >= parseInt(expiry)) {
            return false;
        }
        // If no expiry set, assume valid if logged in
        return this.isLoggedIn();
    },

    /**
     * Set current user in storage
     * @param {Object} user - User data
     */
    setUser(user) {
        localStorage.setItem(Config.STORAGE_KEYS.USER, JSON.stringify(user));
    },

    /**
     * Get user initials for avatar display
     * @returns {string} User initials (1-2 characters)
     */
    getInitials() {
        const user = this.getUser();
        if (user?.name) {
            return user.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        // Return role-based default
        const data = typeof Storage !== 'undefined' && Storage.getData ? Storage.getData() : {};
        const role = data.settings?.role || 'king';
        return role === 'queen' ? 'Q' : 'K';
    }
};

// Make available globally
window.Auth = Auth;

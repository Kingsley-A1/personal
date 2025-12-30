/**
 * REIGN - Core Module
 * Shared utilities, authentication, storage, and common functionality
 * This module is loaded on ALL pages for consistent behavior
 * @version 1.0.0
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    APP_NAME: 'REIGN',
    APP_VERSION: '1.0.0',
    API_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:3000/api'
        : 'https://reign-api.kingsley.app/api',
    STORAGE_KEY: 'reignData',
    AUTH_TOKEN_KEY: 'reign_auth_token',
    USER_KEY: 'reign_user',
    THEME_KEY: 'reign_theme',

    getAuthToken() {
        return localStorage.getItem(this.AUTH_TOKEN_KEY);
    },

    setAuthToken(token) {
        localStorage.setItem(this.AUTH_TOKEN_KEY, token);
    },

    clearAuth() {
        localStorage.removeItem(this.AUTH_TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    }
};

// ============================================
// STORAGE MODULE
// ============================================
const Storage = {
    /**
     * Get today's date key
     * @returns {string} YYYY-MM-DD format
     */
    getToday() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    },

    /**
     * Get all app data
     * @returns {Object} Complete app data
     */
    getData() {
        try {
            const data = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to parse storage data:', e);
        }
        return this.getDefaultData();
    },

    /**
     * Save app data
     * @param {Object} data - Data to save
     */
    saveData(data) {
        try {
            data.lastUpdated = new Date().toISOString();
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save data:', e);
            if (e.name === 'QuotaExceededError') {
                Utils.showToast('Storage full! Please clear some old data.', 'danger');
            }
            return false;
        }
    },

    /**
     * Get default data structure
     * @returns {Object} Empty data structure
     */
    getDefaultData() {
        return {
            logs: {},
            learning: { courses: [], streak: 0 },
            ideas: [],
            lessons: [],
            dailyGood: [],
            relationships: [],
            events: [],
            savings: { goals: [], transactions: [] },
            settings: {
                username: 'King',
                role: 'king',
                theme: 'dark',
                notifications: true,
                soundEnabled: false
            },
            lastUpdated: null
        };
    },

    /**
     * Get analytics summary
     * @param {Object} data - App data
     * @returns {Object} Analytics summary
     */
    getAnalytics(data) {
        const logs = data.logs || {};
        const totalDays = Object.keys(logs).length;
        const totalTasks = Object.values(logs).reduce((sum, log) => {
            return sum + (log.morning?.tasks?.length || 0);
        }, 0);
        const completedTasks = Object.values(logs).reduce((sum, log) => {
            return sum + (log.morning?.tasks?.filter(t => t.status === 'completed').length || 0);
        }, 0);

        return {
            totalDays,
            totalTasks,
            completedTasks,
            completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        };
    },

    /**
     * Get last 7 days of activity
     * @param {Object} data - App data
     * @returns {Array} Last 7 days summary
     */
    getLast7Days(data) {
        const days = [];
        const logs = data.logs || {};

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            const log = logs[dateKey];

            days.push({
                date: dateKey,
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                hasMorning: !!log?.morning,
                hasEvening: !!log?.evening,
                tasksCompleted: log?.morning?.tasks?.filter(t => t.status === 'completed').length || 0,
                totalTasks: log?.morning?.tasks?.length || 0
            });
        }

        return days;
    }
};

// ============================================
// UTILITIES MODULE
// ============================================
const Utils = {
    /**
     * Get appropriate greeting based on time
     * @returns {string} Greeting text
     */
    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    },

    /**
     * Get user's name from settings
     * @returns {string} Username
     */
    getUserName() {
        const data = Storage.getData();
        return data.settings?.username || 'King';
    },

    /**
     * Get random motivational quote
     * @returns {string} Quote text
     */
    getRandomQuote() {
        const quotes = [
            "A king is not born, he is made through discipline and purpose.",
            "Rule your morning, and you rule your day.",
            "Greatness is not in never falling, but in rising every time we fall.",
            "The crown weighs heavy on those who refuse to prepare.",
            "Today's choices are tomorrow's legacy.",
            "Discipline is the crown jewel of character.",
            "Every sunrise is a new decree waiting to be written.",
            "The throne belongs to those who show up daily.",
            "Small consistent actions build empires.",
            "Your kingdom is only as strong as your habits."
        ];
        return quotes[Math.floor(Math.random() * quotes.length)];
    },

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type: 'success', 'danger', 'gold', 'info'
     */
    showToast(message, type = 'success') {
        const colors = {
            success: 'linear-gradient(135deg, #10b981, #059669)',
            danger: 'linear-gradient(135deg, #ef4444, #dc2626)',
            gold: 'linear-gradient(135deg, #D4AF37, #B8860B)',
            info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
        };

        // Check if Toastify is available
        if (typeof Toastify !== 'undefined') {
            Toastify({
                text: message,
                duration: 3000,
                gravity: 'top',
                position: 'right',
                style: {
                    background: colors[type] || colors.success,
                    borderRadius: '12px',
                    fontFamily: 'var(--font-sans)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                }
            }).showToast();
        } else {
            // Fallback to console
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    },

    /**
     * Format date for display
     * @param {string} dateStr - ISO date string
     * @returns {string} Formatted date
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Format time ago
     * @param {string} dateStr - ISO date string
     * @returns {string} Relative time
     */
    formatTimeAgo(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    /**
     * Sanitize HTML to prevent XSS
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    sanitize(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Generate unique ID
     * @returns {string} Unique identifier
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // ==========================================
    // LOADING STATE HELPERS
    // ==========================================

    /**
     * Set button loading state
     * @param {HTMLElement|string} btn - Button element or selector
     * @param {boolean} loading - Whether to show loading state
     */
    setButtonLoading(btn, loading = true) {
        const el = typeof btn === 'string' ? document.querySelector(btn) : btn;
        if (!el) return;

        if (loading) {
            el.classList.add('loading');
            el.dataset.originalText = el.innerHTML;
            el.disabled = true;
        } else {
            el.classList.remove('loading');
            if (el.dataset.originalText) {
                el.innerHTML = el.dataset.originalText;
                delete el.dataset.originalText;
            }
            el.disabled = false;
        }
    },

    /**
     * Show skeleton loader in container
     * @param {HTMLElement|string} container - Container element or selector
     * @param {string} type - Type: 'card', 'list', 'stats', 'table'
     * @param {number} count - Number of skeleton items
     */
    showSkeleton(container, type = 'card', count = 3) {
        const el = typeof container === 'string' ? document.querySelector(container) : container;
        if (!el) return;

        let html = '';

        switch (type) {
            case 'card':
                for (let i = 0; i < count; i++) {
                    html += `
                        <div class="skeleton-card" style="position: relative;">
                            <div class="skeleton-icon" style="margin-bottom: 1rem;"></div>
                            <div class="skeleton-text title"></div>
                            <div class="skeleton-text medium"></div>
                            <div class="skeleton-text short"></div>
                        </div>
                    `;
                }
                break;

            case 'list':
                for (let i = 0; i < count; i++) {
                    html += `
                        <div class="skeleton-list-item">
                            <div class="skeleton-avatar"></div>
                            <div class="skeleton-content">
                                <div class="skeleton-text medium" style="margin-bottom: 0.5rem;"></div>
                                <div class="skeleton-text short"></div>
                            </div>
                        </div>
                    `;
                }
                break;

            case 'stats':
                for (let i = 0; i < count; i++) {
                    html += `
                        <div class="skeleton-stat">
                            <div class="skeleton-text"></div>
                            <div class="skeleton-text"></div>
                        </div>
                    `;
                }
                break;

            case 'table':
                for (let i = 0; i < count; i++) {
                    html += `
                        <div class="skeleton-table-row">
                            <div class="skeleton-text"></div>
                            <div class="skeleton-text"></div>
                            <div class="skeleton-text"></div>
                            <div class="skeleton-text short"></div>
                        </div>
                    `;
                }
                break;

            default:
                html = `
                    <div class="skeleton-card" style="position: relative;">
                        <div class="skeleton-text title"></div>
                        <div class="skeleton-text"></div>
                        <div class="skeleton-text medium"></div>
                    </div>
                `;
        }

        el.innerHTML = html;
    },

    /**
     * Show full page loading overlay
     * @param {string} message - Optional loading message
     */
    showPageLoading(message = 'Loading...') {
        // Remove existing if any
        this.hidePageLoading();

        const overlay = document.createElement('div');
        overlay.id = 'page-loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner"></div>
            <p class="loading-text">${this.sanitize(message)}</p>
        `;
        document.body.appendChild(overlay);
    },

    /**
     * Hide full page loading overlay
     */
    hidePageLoading() {
        const overlay = document.getElementById('page-loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    },

    /**
     * Add loading state to any element
     * @param {HTMLElement|string} element - Element or selector
     */
    addCardLoading(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (el) el.classList.add('card-loading');
    },

    /**
     * Remove loading state from element
     * @param {HTMLElement|string} element - Element or selector
     */
    removeCardLoading(element) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (el) el.classList.remove('card-loading');
    }
};

// ============================================
// AUTHENTICATION MODULE
// ============================================
const Auth = {
    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return !!CONFIG.getAuthToken();
    },

    /**
     * Get current user
     * @returns {Object|null}
     */
    getUser() {
        try {
            const user = localStorage.getItem(CONFIG.USER_KEY);
            return user ? JSON.parse(user) : null;
        } catch {
            return null;
        }
    },

    /**
     * Set current user
     * @param {Object} user - User data
     */
    setUser(user) {
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
    },

    /**
     * Logout user
     */
    logout() {
        CONFIG.clearAuth();
        Utils.showToast('Logged out successfully', 'info');
        window.location.href = '/index.html';
    },

    /**
     * Get user initials for avatar
     * @returns {string}
     */
    getInitials() {
        const user = this.getUser();
        if (user?.name) {
            return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return 'K';
    }
};

// ============================================
// NAVIGATION MODULE
// ============================================
const Nav = {
    /**
     * Navigate to a page
     * @param {string} page - Page name (without .html)
     */
    goto(page) {
        const basePath = window.location.pathname.includes('/pages/') ? '../' : '';
        const pagesPath = window.location.pathname.includes('/pages/') ? '' : 'pages/';

        // Handle special cases
        if (page === 'dashboard' || page === 'home') {
            window.location.href = basePath + 'index.html';
            return;
        }

        window.location.href = basePath + pagesPath + page + '.html';
    },

    /**
     * Get current page name
     * @returns {string}
     */
    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().replace('.html', '');
        return filename === 'index' ? 'dashboard' : filename;
    },

    /**
     * Check if on a specific page
     * @param {string} page - Page name
     * @returns {boolean}
     */
    isCurrentPage(page) {
        return this.getCurrentPage() === page;
    }
};

// ============================================
// UI COMPONENTS MODULE
// ============================================
const UI = {
    /**
     * Initialize page with common elements
     */
    init() {
        this.updateAuthUI();
        this.setActiveNav();
        this.initTheme();
    },

    /**
     * Update UI based on auth state
     */
    updateAuthUI() {
        const isLoggedIn = Auth.isLoggedIn();
        const user = Auth.getUser();

        // Update user avatar/button if exists
        const userBtn = document.getElementById('user-avatar-btn');
        if (userBtn) {
            if (isLoggedIn && user) {
                userBtn.innerHTML = `
                    <span class="user-initials">${Auth.getInitials()}</span>
                `;
                userBtn.title = user.name || user.email;
            }
        }

        // Show/hide guest prompt
        const guestPrompt = document.getElementById('guest-prompt');
        if (guestPrompt) {
            guestPrompt.style.display = isLoggedIn ? 'none' : 'flex';
        }

        // Show/hide user menu
        const userMenu = document.getElementById('user-menu');
        if (userMenu) {
            userMenu.style.display = isLoggedIn ? 'flex' : 'none';
        }
    },

    /**
     * Set active navigation state
     */
    setActiveNav() {
        const currentPage = Nav.getCurrentPage();
        document.querySelectorAll('.nav-btn, .nav-link').forEach(btn => {
            const target = btn.dataset.target || btn.getAttribute('href')?.replace('.html', '').replace('pages/', '');
            btn.classList.toggle('active', target === currentPage);
        });
    },

    /**
     * Initialize theme and role
     */
    initTheme() {
        const data = Storage.getData();
        const theme = data.settings?.theme || 'dark';
        const role = data.settings?.role || 'king';

        // Apply light/dark theme
        document.documentElement.setAttribute('data-theme', theme);

        // Apply role theme (queen gets special styling)
        if (role === 'queen') {
            document.body.classList.add('queen-theme');
            document.body.classList.remove('king-theme');
        } else {
            document.body.classList.add('king-theme');
            document.body.classList.remove('queen-theme');
        }
    },

    /**
     * Set user role (king/queen)
     * @param {string} role - 'king' or 'queen'
     */
    setRole(role) {
        const data = Storage.getData();
        if (!data.settings) data.settings = {};
        data.settings.role = role;
        Storage.saveData(data);
        this.initTheme();
        Utils.showToast(`Role set to ${role === 'queen' ? 'Queen 👸' : 'King 👑'}`, 'gold');
    },

    /**
     * Get current user role
     * @returns {string} 'king' or 'queen'
     */
    getRole() {
        const data = Storage.getData();
        return data.settings?.role || 'king';
    },

    /**
     * Toggle sidebar (mobile)
     */
    toggleSidebar() {
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
     * Show loading spinner
     * @param {HTMLElement} container - Container element
     */
    showLoading(container) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner">
                    <i class="ph-duotone ph-spinner-gap"></i>
                </div>
                <p>Loading...</p>
            </div>
        `;
    },

    /**
     * Show empty state
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Empty state options
     */
    showEmptyState(container, options = {}) {
        const { icon = 'ph-folder-open', title = 'Nothing Here Yet', message = '', action = null } = options;
        container.innerHTML = `
            <div class="empty-state glass-card">
                <i class="ph-duotone ${icon}"></i>
                <h3>${title}</h3>
                ${message ? `<p>${message}</p>` : ''}
                ${action ? `<button class="btn btn-primary" onclick="${action.onclick}">${action.label}</button>` : ''}
            </div>
        `;
    },

    /**
     * Create a modal
     * @param {string} content - Modal HTML content
     */
    showModal(content) {
        let modal = document.getElementById('modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-overlay" onclick="UI.closeModal()"></div>
                <div class="modal-container">
                    <div class="modal-content"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        modal.querySelector('.modal-content').innerHTML = content;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
};

// ============================================
// API MODULE
// ============================================
const API = {
    /**
     * Make authenticated API request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>}
     */
    async request(endpoint, options = {}) {
        const token = CONFIG.getAuthToken();

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers
            }
        };

        try {
            const response = await fetch(`${CONFIG.API_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    /**
     * GET request
     */
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    /**
     * POST request
     */
    post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
    },

    /**
     * PUT request
     */
    put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
    },

    /**
     * DELETE request
     */
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, Storage, Utils, Auth, Nav, UI, API };
}

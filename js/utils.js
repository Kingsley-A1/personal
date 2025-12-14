/**
 * King Daily - Utilities Module
 * Helper functions for common operations
 */

const Utils = {
    /**
     * Sanitize string to prevent XSS
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
     * Generate UUID
     * @returns {string} UUID string
     */
    generateId() {
        return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
            Math.floor(Math.random() * 16).toString(16)
        );
    },

    /**
     * Format time display
     * @returns {string} Formatted time
     */
    formatTime() {
        return new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Format date display
     * @param {Date|string} date - Date to format
     * @param {Object} options - Intl.DateTimeFormat options
     * @returns {string} Formatted date
     */
    formatDate(date, options = {}) {
        const d = typeof date === 'string' ? new Date(date) : date;
        const defaults = {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        };
        return d.toLocaleDateString(undefined, { ...defaults, ...options });
    },

    /**
     * Format date for display in cards
     * @param {string} dateStr - ISO date string
     * @returns {Object} { day, month }
     */
    formatDateParts(dateStr) {
        const d = new Date(dateStr);
        return {
            day: d.getDate(),
            month: d.toLocaleDateString(undefined, { month: 'short' })
        };
    },

    /**
     * Check if date is today
     * @param {string} dateStr - ISO date string
     * @returns {boolean}
     */
    isToday(dateStr) {
        const today = new Date().toISOString().split('T')[0];
        return dateStr === today;
    },

    /**
     * Check if date is in the past
     * @param {string} dateStr - ISO date string
     * @returns {boolean}
     */
    isPast(dateStr) {
        const today = new Date().setHours(0, 0, 0, 0);
        return new Date(dateStr) < today;
    },

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - 'gold', 'indigo', 'success', 'danger'
     */
    showToast(message, type = 'gold') {
        const colors = {
            gold: {
                background: 'linear-gradient(to right, #D4AF37, #C5A028)',
                color: '#0B0F19'
            },
            indigo: {
                background: '#4f46e5',
                color: '#fff'
            },
            success: {
                background: '#10b981',
                color: '#fff'
            },
            danger: {
                background: '#ef4444',
                color: '#fff'
            }
        };

        const style = colors[type] || colors.gold;

        Toastify({
            text: message,
            duration: 3000,
            gravity: 'top',
            position: 'center',
            style: {
                background: style.background,
                color: style.color,
                fontWeight: 'bold',
                borderRadius: '8px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                fontFamily: "'Manrope', sans-serif"
            }
        }).showToast();
    },

    /**
     * Update header time display
     */
    updateHeaderTime() {
        const timeEl = document.getElementById('current-time');
        const dateEl = document.getElementById('current-date');

        if (timeEl) {
            timeEl.textContent = this.formatTime();
        }
        if (dateEl) {
            dateEl.textContent = this.formatDate(new Date());
        }
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
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

    /**
     * Get priority label and class
     * @param {string} priority - 'high', 'medium', 'low'
     * @returns {Object} { label, class }
     */
    getPriorityInfo(priority) {
        const info = {
            high: { label: 'High', class: 'priority-high' },
            medium: { label: 'Medium', class: 'priority-medium' },
            low: { label: 'Low', class: 'priority-low' }
        };
        return info[priority] || info.medium;
    },

    /**
     * Get status label and class
     * @param {string} status - Task status
     * @returns {Object} { label, class }
     */
    getStatusInfo(status) {
        const info = {
            'pending': { label: 'Pending', class: 'status-pending' },
            'in-progress': { label: 'In Progress', class: 'status-in-progress' },
            'completed': { label: 'Completed', class: 'status-completed' },
            'deferred': { label: 'Deferred', class: 'status-deferred' }
        };
        return info[status] || info.pending;
    },

    /**
     * Get event border color class
     * @param {string} type - Event type
     * @returns {string} CSS class
     */
    getEventColor(type) {
        const colors = {
            'Meeting': 'border-blue',
            'Birthday': 'border-pink',
            'Deadline': 'border-red',
            'Social': 'border-indigo'
        };
        return colors[type] || 'border-gold';
    },

    /**
     * Category icons mapping
     */
    categoryIcons: {
        'Deep Work': 'ph-duotone ph-brain',
        'Strategy': 'ph-duotone ph-strategy',
        'Meeting': 'ph-duotone ph-users-three',
        'Learning': 'ph-duotone ph-books',
        'Health': 'ph-duotone ph-heartbeat',
        'Admin': 'ph-duotone ph-clipboard-text'
    },

    /**
     * Get icon for category
     * @param {string} category - Category name
     * @returns {string} Icon class
     */
    getCategoryIcon(category) {
        return this.categoryIcons[category] || 'ph-duotone ph-circle';
    },

    /**
     * Inspirational quotes
     */
    quotes: [
        "We suffer more often in imagination than in reality. – Seneca",
        "Waste no more time arguing about what a good man should be. Be one. – Marcus Aurelius",
        "Discipline is the bridge between goals and accomplishment. – Jim Rohn",
        "The key is not to prioritize what's on your schedule, but to schedule your priorities. – Stephen Covey",
        "He who has a why to live can bear almost any how. – Nietzsche",
        "The only way to do great work is to love what you do. – Steve Jobs",
        "Success is not final, failure is not fatal: it is the courage to continue that counts. – Churchill",
        "Your time is limited, don't waste it living someone else's life. – Steve Jobs"
    ],

    /**
     * Get random quote
     * @returns {string} Quote
     */
    getRandomQuote() {
        return this.quotes[Math.floor(Math.random() * this.quotes.length)];
    },

    /**
     * Get time-based greeting
     * @returns {string} Greeting based on current hour
     */
    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 5) return 'Midnight hour';
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        if (hour < 21) return 'Good evening';
        return 'Good night';
    },

    /**
     * Get user's first name or default
     * @returns {string} User's first name or 'Champion'
     */
    getUserName() {
        const user = Config.getUser();
        if (user && user.name) {
            return user.name.split(' ')[0];
        }
        // Check localStorage for guest name
        const settings = JSON.parse(localStorage.getItem('king-daily-settings') || '{}');
        if (settings.userName) {
            return settings.userName.split(' ')[0];
        }
        return 'Champion';
    }
};

// Make available globally
window.Utils = Utils;

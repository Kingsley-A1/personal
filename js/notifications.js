/**
 * REIGN - Notifications Module
 * Browser notification system for reminders and engagement
 */

const Notifications = {
    permission: null,
    morningTimeoutId: null,
    eveningTimeoutId: null,

    /**
     * Request notification permission
     * @returns {Promise<boolean>} Whether permission was granted
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('Notifications not supported in this browser');
            Utils.showToast('Notifications not supported in this browser', 'warning');
            return false;
        }

        if (Notification.permission === 'granted') {
            this.permission = 'granted';
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            if (permission === 'granted') {
                Utils.showToast('Notifications enabled!', 'success');
                return true;
            } else {
                Utils.showToast('Notification permission denied', 'warning');
                return false;
            }
        }

        Utils.showToast('Notifications are blocked. Please enable them in browser settings.', 'danger');
        return false;
    },

    /**
     * Show a notification
     * @param {string} title - Notification title
     * @param {Object} options - Notification options
     * @returns {Notification} Notification instance
     */
    show(title, options = {}) {
        if (Notification.permission !== 'granted') {
            return null;
        }

        const defaults = {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            ...options
        };

        const notification = new Notification(title, defaults);

        notification.onclick = () => {
            window.focus();
            if (options.url) {
                window.location.href = options.url;
            }
            notification.close();
        };

        return notification;
    },

    /**
     * Schedule morning protocol reminder
     */
    scheduleMorningReminder() {
        // Clear any existing timeout
        if (this.morningTimeoutId) {
            clearTimeout(this.morningTimeoutId);
        }

        const settings = this.getSettings();
        if (!settings.morningReminder) {
            return;
        }

        const now = new Date();
        const morningTime = new Date();
        morningTime.setHours(settings.morningHour || 8, 0, 0, 0);

        // If morning time has passed today, schedule for tomorrow
        if (now > morningTime) {
            morningTime.setDate(morningTime.getDate() + 1);
        }

        const timeUntil = morningTime - now;

        this.morningTimeoutId = setTimeout(() => {
            const today = Storage.getToday();
            const data = Storage.getData();

            // Only notify if morning protocol not completed
            if (!data.logs[today]?.morning) {
                this.show('Good Morning! Time to Plan Your Day', {
                    body: 'Set your tasks and goals for today.',
                    url: '/app/morning.html',
                    tag: 'morning-reminder',
                    icon: '/icons/icon-192x192.png'
                });
            }

            // Schedule for next day
            this.scheduleMorningReminder();
        }, timeUntil);

        console.log(`Morning reminder scheduled for ${morningTime.toLocaleString()}`);
    },

    /**
     * Schedule evening report reminder
     */
    scheduleEveningReminder() {
        // Clear any existing timeout
        if (this.eveningTimeoutId) {
            clearTimeout(this.eveningTimeoutId);
        }

        const settings = this.getSettings();
        if (!settings.eveningReminder) {
            return;
        }

        const now = new Date();
        const eveningTime = new Date();
        eveningTime.setHours(settings.eveningHour || 20, 0, 0, 0);

        // If evening time has passed today, schedule for tomorrow
        if (now > eveningTime) {
            eveningTime.setDate(eveningTime.getDate() + 1);
        }

        const timeUntil = eveningTime - now;

        this.eveningTimeoutId = setTimeout(() => {
            const today = Storage.getToday();
            const data = Storage.getData();

            // Only notify if evening report not completed
            if (!data.logs[today]?.evening) {
                this.show('Evening Reflection Time', {
                    body: 'How did your day go? Submit your evening report.',
                    url: '/app/evening.html',
                    tag: 'evening-reminder',
                    icon: '/icons/icon-192x192.png'
                });
            }

            // Schedule for next day
            this.scheduleEveningReminder();
        }, timeUntil);

        console.log(`Evening reminder scheduled for ${eveningTime.toLocaleString()}`);
    },

    /**
     * Get notification settings
     * @returns {Object} Notification settings
     */
    getSettings() {
        const settings = JSON.parse(localStorage.getItem('reign_notification_settings') || '{}');
        return {
            morningReminder: settings.morningReminder !== false, // Default: true
            eveningReminder: settings.eveningReminder !== false, // Default: true
            morningHour: settings.morningHour || 8,
            eveningHour: settings.eveningHour || 20,
            ...settings
        };
    },

    /**
     * Save notification settings
     * @param {Object} settings - Settings to save
     */
    saveSettings(settings) {
        localStorage.setItem('reign_notification_settings', JSON.stringify(settings));

        // Restart schedulers with new settings
        this.init();

        Utils.showToast('Notification settings saved', 'success');
    },

    /**
     * Cancel all scheduled notifications
     */
    cancelAll() {
        if (this.morningTimeoutId) {
            clearTimeout(this.morningTimeoutId);
            this.morningTimeoutId = null;
        }
        if (this.eveningTimeoutId) {
            clearTimeout(this.eveningTimeoutId);
            this.eveningTimeoutId = null;
        }
    },

    /**
     * Initialize notification system
     */
    async init() {
        // Cancel any existing schedulers
        this.cancelAll();

        const hasPermission = await this.requestPermission();

        if (hasPermission) {
            this.scheduleMorningReminder();
            this.scheduleEveningReminder();
            console.log('Notification system initialized ✓');
        }
    },

    /**
     * Test notification (for debugging)
     */
    test() {
        this.show('Test Notification', {
            body: 'This is a test notification from REIGN.',
            icon: '/icons/icon-192x192.png'
        });
    }
};

// Make available globally
window.Notifications = Notifications;

// Auto-initialize on page load if user has granted permission
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (Notification.permission === 'granted') {
            Notifications.init();
        }
    });
} else {
    if (Notification.permission === 'granted') {
        Notifications.init();
    }
}

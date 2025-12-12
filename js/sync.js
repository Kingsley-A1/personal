/**
 * King Daily - Cloud Sync Module
 * Syncs user data with Cloudflare R2 storage
 */

const Sync = {
    // Debounce timer
    _syncTimer: null,

    // Sync status
    _isSyncing: false,
    _lastSync: null,

    /**
     * Initialize sync module
     */
    init() {
        this._lastSync = localStorage.getItem(Config.STORAGE_KEYS.LAST_SYNC);

        // Listen for online/offline events
        window.addEventListener('online', () => this.processPendingSync());
        window.addEventListener('offline', () => this.updateSyncStatus('offline'));

        // Initial sync check
        if (Auth.isLoggedIn() && navigator.onLine) {
            this.checkForUpdates();
        }
    },

    /**
     * Upload data to cloud
     * @param {Object} data - App data to sync
     */
    async upload(data) {
        if (!Auth.isLoggedIn()) {
            console.log('Sync: Not logged in, skipping upload');
            return;
        }

        if (!navigator.onLine) {
            this.queueSync(data);
            return;
        }

        this._isSyncing = true;
        this.updateSyncStatus('syncing');

        try {
            const response = await fetch(`${Config.API_URL}/sync`, {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({
                    appData: data,
                    localTimestamp: new Date().toISOString()
                })
            });

            const result = await response.json();

            if (response.status === 409) {
                // Conflict - show resolution UI
                this.handleConflict(result.cloudData, data, result.cloudTimestamp);
                return;
            }

            if (!response.ok) {
                throw new Error(result.error || 'Sync failed');
            }

            this._lastSync = result.lastSync;
            localStorage.setItem(Config.STORAGE_KEYS.LAST_SYNC, result.lastSync);
            this.updateSyncStatus('synced');

            console.log('Sync: Data uploaded to cloud');

        } catch (error) {
            console.error('Sync error:', error);
            this.updateSyncStatus('error');
            this.queueSync(data);
        } finally {
            this._isSyncing = false;
        }
    },

    /**
     * Download data from cloud
     * @returns {Object|null} Cloud data or null
     */
    async download() {
        if (!Auth.isLoggedIn()) {
            return null;
        }

        this._isSyncing = true;
        this.updateSyncStatus('syncing');

        try {
            const response = await fetch(`${Config.API_URL}/sync`, {
                headers: Auth.getHeaders()
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Download failed');
            }

            if (result.data) {
                this._lastSync = result.lastSync;
                localStorage.setItem(Config.STORAGE_KEYS.LAST_SYNC, result.lastSync);
            }

            this.updateSyncStatus('synced');
            return result.data;

        } catch (error) {
            console.error('Sync download error:', error);
            this.updateSyncStatus('error');
            return null;
        } finally {
            this._isSyncing = false;
        }
    },

    /**
     * Check for cloud updates on startup
     */
    async checkForUpdates() {
        const cloudData = await this.download();

        if (cloudData) {
            const localData = JSON.parse(localStorage.getItem(Config.STORAGE_KEYS.DATA) || '{}');
            const localTime = new Date(localData.lastModified || 0).getTime();
            const cloudTime = new Date(this._lastSync).getTime();

            if (cloudTime > localTime) {
                // Cloud is newer - prompt user
                if (confirm('Cloud data is newer. Would you like to use the cloud version?')) {
                    localStorage.setItem(Config.STORAGE_KEYS.DATA, JSON.stringify(cloudData));
                    location.reload();
                }
            }
        }
    },

    /**
     * Auto-sync with debounce
     * @param {Object} data - Data to sync
     */
    autoSync(data) {
        if (!Config.SYNC.AUTO_SYNC || !Auth.isLoggedIn()) return;

        // Clear existing timer
        if (this._syncTimer) {
            clearTimeout(this._syncTimer);
        }

        // Set new timer
        this._syncTimer = setTimeout(() => {
            this.upload(data);
        }, Config.SYNC.SYNC_DEBOUNCE);
    },

    /**
     * Queue sync for when online
     * @param {Object} data - Data to sync
     */
    queueSync(data) {
        if (!Config.SYNC.OFFLINE_QUEUE) return;

        localStorage.setItem(Config.STORAGE_KEYS.PENDING_SYNC, JSON.stringify({
            data,
            timestamp: new Date().toISOString()
        }));

        console.log('Sync: Queued for later (offline)');
    },

    /**
     * Process pending sync when back online
     */
    async processPendingSync() {
        const pending = localStorage.getItem(Config.STORAGE_KEYS.PENDING_SYNC);

        if (pending) {
            const { data } = JSON.parse(pending);
            localStorage.removeItem(Config.STORAGE_KEYS.PENDING_SYNC);
            await this.upload(data);
        }
    },

    /**
     * Handle sync conflict
     * @param {Object} cloudData - Data from cloud
     * @param {Object} localData - Local data
     * @param {string} cloudTimestamp - Cloud timestamp
     */
    handleConflict(cloudData, localData, cloudTimestamp) {
        const modal = document.getElementById('modal');
        const modalContent = document.querySelector('.modal-content');

        modalContent.innerHTML = `
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="ph-duotone ph-warning" style="color: #f59e0b;"></i>
                    Sync Conflict
                </h2>
            </div>
            <div class="modal-body">
                <p style="color: #94a3b8; margin-bottom: 1.5rem;">
                    Your local data differs from the cloud. Which version would you like to keep?
                </p>
                <div style="display: flex; gap: 1rem;">
                    <button class="btn btn-outline" onclick="Sync.resolveConflict('cloud')" style="flex: 1;">
                        <i class="ph-bold ph-cloud"></i> Use Cloud
                    </button>
                    <button class="btn btn-primary" onclick="Sync.resolveConflict('local')" style="flex: 1;">
                        <i class="ph-bold ph-device-mobile"></i> Use Local
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('active');

        // Store conflict data for resolution
        this._conflictData = { cloudData, localData };
    },

    /**
     * Resolve sync conflict
     * @param {string} choice - 'cloud' or 'local'
     */
    async resolveConflict(choice) {
        if (choice === 'cloud') {
            localStorage.setItem(Config.STORAGE_KEYS.DATA, JSON.stringify(this._conflictData.cloudData));
            location.reload();
        } else {
            // Force upload local
            await fetch(`${Config.API_URL}/sync/force`, {
                method: 'POST',
                headers: Auth.getHeaders(),
                body: JSON.stringify({ appData: this._conflictData.localData })
            });
            app.closeModal();
            Utils.showToast('Local data synced to cloud', 'gold');
        }

        this._conflictData = null;
    },

    /**
     * Update sync status indicator
     * @param {string} status - 'synced', 'syncing', 'error', 'offline'
     */
    updateSyncStatus(status) {
        const indicator = document.getElementById('sync-status');
        if (!indicator) return;

        const icons = {
            synced: '<i class="ph-bold ph-cloud-check" style="color: var(--success);"></i>',
            syncing: '<i class="ph-bold ph-cloud-arrow-up" style="color: var(--indigo); animation: pulse 1s infinite;"></i>',
            error: '<i class="ph-bold ph-cloud-slash" style="color: var(--danger);"></i>',
            offline: '<i class="ph-bold ph-wifi-slash" style="color: #64748b;"></i>'
        };

        indicator.innerHTML = icons[status] || '';
        indicator.title = status.charAt(0).toUpperCase() + status.slice(1);
    },

    /**
     * Get last sync time
     */
    getLastSync() {
        return this._lastSync;
    },

    /**
     * Manual sync trigger
     */
    async manualSync() {
        const data = JSON.parse(localStorage.getItem(Config.STORAGE_KEYS.DATA) || '{}');
        await this.upload(data);
    }
};

// Make available globally
window.Sync = Sync;

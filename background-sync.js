/**
 * Background Sync Manager for GymNerd
 * Handles stealthy synchronization with Google Drive.
 */
const BackgroundSync = {
    _debounceTimer: null,
    _syncInProgress: false,
    _syncQueued: false,
    _permissionError: false,

    /**
     * Update sync status icon if present in DOM.
     */
    updateStatusUI() {
        const icon = document.getElementById('sync-status-icon');
        if (!icon) return;

        if (window.DEMO_MODE) {
            icon.style.display = 'none';
            return;
        }

        const hasChanges = localStorage.getItem('has_local_changes') === 'true';
        const inProgress = this._syncInProgress;
        const hasPermissionError = this._permissionError;

        // Base style: match topbar icons
        icon.style.display = 'inline-flex';
        icon.style.alignItems = 'center';
        icon.style.justifyContent = 'center';
        icon.style.padding = '6px';
        icon.style.opacity = '1';
        icon.style.cursor = 'pointer';
        
        // Reset special styles
        icon.style.fontVariationSettings = "'wght' 300";

        if (hasPermissionError) {
            icon.textContent = 'cloud_alert';
            icon.style.color = '#ef4444'; // Red
            icon.style.fontVariationSettings = "'wght' 300, 'FILL' 1";
        } else if (inProgress || hasChanges) {
            icon.textContent = 'cloud_upload';
            icon.style.color = 'var(--accent-color)';
        } else {
            icon.textContent = 'cloud_done';
            icon.style.color = 'var(--text-main-color)';
        }

        // Add click handler
        if (!icon.dataset.bound) {
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (this._permissionError) {
                    const msg = (typeof GN_I18N !== 'undefined') 
                        ? (GN_I18N.t('drive_permission_missing') || "Google Drive permission is missing. Your data is not being backed up. Fix now?") 
                        : "Google Drive permission is missing. Your data is not being backed up. Fix now?";
                    if (confirm(msg)) {
                        if (typeof window.handleAuth === 'function') window.handleAuth();
                    }
                    return;
                }

                const isSyncing = this._syncInProgress || localStorage.getItem('has_local_changes') === 'true';
                
                if (isSyncing) {
                    const msg = (typeof GN_I18N !== 'undefined') ? GN_I18N.t('syncing_in_background') : 'Sending data to Google Drive in the background automatically.';
                    alert(msg);
                } else {
                    const lastSync = localStorage.getItem('last_sync_time');
                    let timeStr = (typeof GN_I18N !== 'undefined') ? GN_I18N.t('never_synced') : 'Never';
                    
                    if (lastSync) {
                        try {
                            const date = new Date(lastSync);
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = date.getFullYear();
                            const time = date.toLocaleTimeString();
                            timeStr = `${day}/${month}/${year}, ${time}`;
                        } catch (e) {
                            timeStr = lastSync;
                        }
                    }
                    
                    const template = (typeof GN_I18N !== 'undefined') ? GN_I18N.t('last_sync_label') : 'Last sync: {t}';
                    alert(template.replace('{t}', timeStr));
                }
            });
            icon.dataset.bound = 'true';
        }
    },

    /**
     * Show permission alert once per session
     */
    _showPermissionAlert() {
        try {
            if (sessionStorage.getItem('gn_permission_alert_shown')) return;
            sessionStorage.setItem('gn_permission_alert_shown', '1');

            const msg = (typeof GN_I18N !== 'undefined') 
                ? (GN_I18N.t('drive_permission_missing') || "Google Drive permission is missing. Your data is not being backed up. Fix now?") 
                : "Google Drive permission is missing. Your data is not being backed up. Fix now?";
            
            if (confirm(msg)) {
                if (typeof window.handleAuth === 'function') window.handleAuth();
            }
        } catch(e) {}
    },

    /**
     * Initialize background sync.
     * Hooks into Dexie database changes.
     */
    init(db) {
        if (!db) {
            console.error('[BackgroundSync] Database instance required for initialization');
            return;
        }

        console.info('[BackgroundSync] Initializing background sync hooks');

        const tables = ['custom_exercises', 'custom_images', 'routines', 'history', 'weights', 'tokens', 'frozen_days', 'token_events'];
        
        tables.forEach(tableName => {
            if (db[tableName]) {
                db[tableName].hook('creating', () => this.trigger());
                db[tableName].hook('updating', () => this.trigger());
                db[tableName].hook('deleting', () => this.trigger());
            }
        });

        // Check if there are pending changes on startup
        if (localStorage.getItem('has_local_changes') === 'true') {
            console.info('[BackgroundSync] Pending changes detected on startup, triggering sync');
            this.trigger();
        }

        // Trigger sync on page hide/close (forced)
        window.addEventListener('pagehide', () => {
            if (localStorage.getItem('has_local_changes') === 'true' && !this._syncInProgress) {
                console.info('[BackgroundSync] App hiding with pending changes, attempting immediate sync');
                this.sync({ force: true });
            }
        });

        // Trigger deferred sync when app becomes visible again
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                if (localStorage.getItem('has_local_changes') === 'true' && !this._syncInProgress) {
                    console.info('[BackgroundSync] App visible, triggering deferred sync');
                    this.trigger();
                }
            }
        });

        this.updateStatusUI();

        if (window.__gn_permission_error) {
            this._permissionError = true;
            this.updateStatusUI();
            this._showPermissionAlert();
        }
    },

    /**
     * Trigger a sync operation with debouncing.
     */
    trigger() {
        localStorage.setItem('has_local_changes', 'true');
        this.updateStatusUI();
        
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
        }

        this._debounceTimer = setTimeout(() => {
            this.sync();
        }, 5000); // 5 seconds debounce
    },

    /**
     * Execute the sync operation.
     */
    async sync(options = {}) {
        // If app is hidden and sync is not forced, skip to save battery/bandwidth
        if (document.visibilityState === 'hidden' && !options.force) {
            console.debug('[BackgroundSync] Sync deferred: App is hidden');
            return;
        }

        if (this._syncInProgress) {
            console.debug('[BackgroundSync] Sync already in progress, queuing next run');
            this._syncQueued = true;
            return;
        }

        if (localStorage.getItem('has_local_changes') !== 'true') {
            console.debug('[BackgroundSync] Sync skipped: No local changes');
            this._syncQueued = false; // Nothing to sync, clear queue
            this.updateStatusUI();
            return;
        }

        if (window.DEMO_MODE) {
            console.debug('[BackgroundSync] Sync skipped: DEMO_MODE active');
            this.updateStatusUI();
            return;
        }

        const token = localStorage.getItem('google_token');
        if (!token || token === 'local-bypass') {
            console.debug('[BackgroundSync] Sync skipped: No Google token or local bypass');
            this.updateStatusUI();
            return;
        }

        this._syncInProgress = true;
        this._syncQueued = false;
        this.updateStatusUI();

        console.info('[BackgroundSync] Starting stealthy sync');
        
        try {
            const ok = await DriveStorage.sync(window.db, null, { silent: true });
            if (ok) {
                console.info('[BackgroundSync] Stealthy sync successful');
                // Only clear if no new changes were queued during this run
                if (!this._syncQueued) {
                    localStorage.setItem('has_local_changes', 'false');
                }
                this._permissionError = false;
            } else {
                console.warn('[BackgroundSync] Stealthy sync returned failure');
            }
        } catch (err) {
            console.error('[BackgroundSync] Stealthy sync failed with error:', err);
            if (err.message && err.message.includes("Insufficient Permission")) {
                this._permissionError = true;
                this._showPermissionAlert();
            }
        } finally {
            this._syncInProgress = false;
            this.updateStatusUI();
            if (this._syncQueued) {
                console.debug('[BackgroundSync] Running queued sync');
                this.sync();
            }
        }
    }
};

// Auto-init if db is available globally
if (window.db) {
    BackgroundSync.init(window.db);
} else {
    // Wait for db to be available
    const checkDb = setInterval(() => {
        if (window.db) {
            BackgroundSync.init(window.db);
            clearInterval(checkDb);
        }
    }, 500);
}

window.BackgroundSync = BackgroundSync;

/**
 * Background Sync Manager for GymNerd
 * Handles stealthy synchronization with Google Drive.
 */
const BackgroundSync = {
    _debounceTimer: null,
    _syncInProgress: false,
    _syncQueued: false,

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

        // Base style: match topbar icons
        icon.style.display = 'inline-flex';
        icon.style.alignItems = 'center';
        icon.style.justifyContent = 'center';
        icon.style.padding = '6px';
        icon.style.opacity = '1';
        icon.style.cursor = 'pointer';

        if (inProgress || hasChanges) {
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

        // Trigger sync on page hide/close
        window.addEventListener('pagehide', () => {
            if (localStorage.getItem('has_local_changes') === 'true' && !this._syncInProgress) {
                console.info('[BackgroundSync] App hiding with pending changes, attempting immediate sync');
                this.sync();
            }
        });

        this.updateStatusUI();
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
    async sync() {
        if (this._syncInProgress) {
            console.debug('[BackgroundSync] Sync already in progress, queuing next run');
            this._syncQueued = true;
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
                localStorage.setItem('has_local_changes', 'false');
            } else {
                console.warn('[BackgroundSync] Stealthy sync returned failure');
            }
        } catch (err) {
            console.error('[BackgroundSync] Stealthy sync failed with error:', err);
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

/**
 * Background Sync Manager for GymNerd
 * Handles stealthy synchronization with Google Drive.
 */
const BackgroundSync = {
    _debounceTimer: null,
    _syncInProgress: false,
    _syncQueued: false,

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
    },

    /**
     * Trigger a sync operation with debouncing.
     */
    trigger() {
        localStorage.setItem('has_local_changes', 'true');
        
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
            return;
        }

        const token = localStorage.getItem('google_token');
        if (!token || token === 'local-bypass') {
            console.debug('[BackgroundSync] Sync skipped: No Google token or local bypass');
            return;
        }

        this._syncInProgress = true;
        this._syncQueued = false;

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

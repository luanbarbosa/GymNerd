(async function() {
    console.log('auth.js initializing');
    // OAuth client identifier (safe to include in client-side code)
    const CLIENT_ID = "142998365114-p596rt046mijepo1cu9fhpdcboejqup2.apps.googleusercontent.com";
    // Include OpenID scopes so we can fetch user's profile (name + picture)
    const SCOPES = 'openid profile email https://www.googleapis.com/auth/drive.file';
    const REDIRECT_PATH = '/oauth2callback.html';

    // Internal: promise used to dedupe concurrent refresh attempts
    // Use `var` and prefer an existing window property so re-loading the
    // script (during development or accidental double-include) doesn't
    // throw a redeclare SyntaxError.
    var _refreshPromise = window._refreshPromise || null;

    // Non-UI logout: perform cleanup silently and redirect to login.
    window.logout = async () => {
        try {
            localStorage.removeItem('google_token');
            localStorage.removeItem('google_token_expires_at');
            try { localStorage.removeItem('google_refresh_token'); } catch(e){}
            try { localStorage.removeItem('google_user'); } catch(e){}
            try { localStorage.removeItem('needs_initial_download'); } catch(e){}
            try { localStorage.removeItem('last_sync_time'); } catch(e){}
            try { localStorage.removeItem('has_local_changes'); } catch(e){}
            try { sessionStorage.removeItem('oauth2_code'); } catch(e){}
            try { sessionStorage.removeItem('pkce_code_verifier'); } catch(e){}
            try {
                if (typeof Dexie !== 'undefined') {
                    try {
                        const _db = (typeof db !== 'undefined') ? db : new Dexie('GymAppDB');
                        if (_db) await _db.delete();
                    } catch(e) {
                        try { const _alt = new Dexie('GymAppDB'); await _alt.delete(); } catch(e2){}
                try { sessionStorage.removeItem('gn_signing_in'); localStorage.removeItem('gn_signing_in'); } catch(e){}
                    }
                }
            } catch(e){}
            try {
                document.cookie = 'google_token=; path=/; max-age=0;';
                document.cookie = 'google_token_expires_at=; path=/; max-age=0;';
                document.cookie = 'google_refresh_token=; path=/; max-age=0;';
            } catch(e){}
        } catch(e){}
        try { sessionStorage.removeItem('gn_signing_in'); localStorage.removeItem('gn_signing_in'); } catch(e){}
        try { window.__gn_signing_in = false; } catch(e){}
        try { if (window.hideLoading) window.hideLoading(); } catch(e){}
        try { window.location.href = 'index.html'; } catch(e) { location.reload(); }
    };

    // Full-screen loading indicator (creates an overlay element)
    window.showLoading = (message) => {
        try {
            // If the document body is not yet available (auth.js loaded in head),
            // defer creation until DOM is ready so we can safely append elements.
            if (!document.body) {
                try {
                    document.addEventListener('DOMContentLoaded', () => { try { window.showLoading(message); } catch(e){} }, { once: true });
                    return;
                } catch(e) {}
            }
            let el = document.getElementById('gn-global-loader');
            if (!el) {
                el = document.createElement('div');
                el.id = 'gn-global-loader';
                // Compute the page background variable and apply it directly to avoid
                // var() resolution issues in some browsers. Use a very large z-index
                // and explicit viewport sizing so the overlay fully covers everything.
                let bgColor = '#0f172a';
                try {
                    const docEl = document.documentElement;
                    const v = getComputedStyle(docEl).getPropertyValue('--bg');
                    if (v && v.trim()) bgColor = v.trim();
                } catch (e) {}
                el.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;background:' + bgColor + ';color:white;z-index:2147483647;padding:20px;opacity:1;pointer-events:auto;box-sizing:border-box;';
                el.innerHTML = `
                    <div style="max-width:520px;width:100%;text-align:center">
                        <div id="gn-global-loader-message" style="font-weight:800;font-size:1.1rem;margin-bottom:16px">Loading...</div>
                        <div style="display:flex;align-items:center;justify-content:center">
                            <div style="width:56px;height:56px;border-radius:50%;border:6px solid rgba(255,255,255,0.12);border-top-color:#3b82f6;animation:gn-spin 1s linear infinite"></div>
                        </div>
                    </div>
                `;
                const style = document.createElement('style');
                style.id = 'gn-global-loader-style';
                style.textContent = `@keyframes gn-spin { to { transform: rotate(360deg); } }`;
                document.head.appendChild(style);
                // Hide all existing body children while loader is visible so
                // nothing underneath can be seen (Chrome rendering issues).
                try {
                    if (!document.body.dataset.gnHidden) {
                        const children = Array.from(document.body.children);
                        for (const c of children) {
                            if (c.id === 'gn-global-loader') continue;
                            c.dataset.gnPrevDisplay = c.style.display || '';
                            c.style.display = 'none';
                        }
                        document.body.dataset.gnHidden = '1';
                    }
                } catch (e) {}
                document.body.appendChild(el);
            }
            const msgEl = document.getElementById('gn-global-loader-message');
            if (msgEl) msgEl.textContent = message || ((typeof GN_I18N !== 'undefined') ? GN_I18N.t('loading') : 'Loading...');
            el.style.display = 'flex';
        } catch (e) { try { console.log('[showLoading]', message); } catch(_){} }
    };

    // Log unhandled promise rejections to help diagnose silent failures
    // If a known external error occurs, attempt a token refresh so startup
    // doesn't get stuck (some external libs throw async errors).
    window.addEventListener('unhandledrejection', (ev) => {
        try {
            console.error('Unhandled promise rejection:', ev.reason);
            const msg = ev.reason && (ev.reason.message || ev.reason.error || ev.reason.toString());
            if (msg && typeof msg === 'string' && msg.includes('No checkout popup config found')) {
                // Try to trigger a refresh attempt shortly after this error
                setTimeout(() => {
                    try {
                        console.log('Detected external GSI error — attempting token refresh');
                        if (typeof ensureGoogleAccessToken === 'function') {
                            ensureGoogleAccessToken().then(ok => console.log('ensureGoogleAccessToken ->', ok)).catch(e=>console.error(e));
                        }
                    } catch(e) { console.error(e); }
                }, 50);
            }
        } catch(e){}
    });

    window.hideLoading = () => {
        try {
            const el = document.getElementById('gn-global-loader');
            if (el) el.style.display = 'none';
        } catch(e) { try { console.log('[hideLoading]'); } catch(_){} }
        try {
            if (document.body.dataset.gnHidden) {
                const children = Array.from(document.body.children);
                for (const c of children) {
                    if (c.id === 'gn-global-loader') continue;
                    try {
                        c.style.display = c.dataset.gnPrevDisplay || '';
                        delete c.dataset.gnPrevDisplay;
                    } catch(e) {}
                }
                delete document.body.dataset.gnHidden;
            }
        } catch(e) {}
    };

    // Non-UI clear of all app data (silent)
    window.clearAllAppData = async () => {
        try {
            if (localStorage.getItem('google_token')) {
                try { if (typeof DriveStorage !== 'undefined') await DriveStorage.deleteFile(); } catch(e) { console.warn('Could not delete Drive file:', e); }
            }
            if (typeof Dexie !== 'undefined') { try { const _db = new Dexie('GymAppDB'); await _db.delete(); } catch(e){} }
            try { localStorage.clear(); } catch(e){}
            try { location.reload(); } catch(e){}
        } catch (err) {
            console.error('Clear failed:', err);
        }
    };

    window.renderAuthStatus = (containerId) => {
        // Return lightweight auth state so UI can be rendered by the page.
        try {
            const token = localStorage.getItem('google_token');
            const expiresAt = localStorage.getItem('google_token_expires_at');
            const isExpired = expiresAt && Date.now() > parseInt(expiresAt);
            let user = null;
            try { const u = localStorage.getItem('google_user'); if (u) user = JSON.parse(u); } catch(e){}
            return {
                token,
                expiresAt,
                isExpired,
                user,
                isBypass: token === 'local-bypass'
            };
        } catch (e) { return null; }
    };

    // Provide a simple getter so UI code in HTML files can obtain the
    // current user without embedding markup inside this module.
    window.getGoogleUser = () => {
        try {
            const u = localStorage.getItem('google_user');
            return u ? JSON.parse(u) : null;
        } catch (e) { return null; }
    };

    // Show explicit UI when a refresh attempt fails but a refresh token existed.
    function renderRefreshError() {
        // Previously this function injected UI into the page. To keep
        // UI responsibility inside the app pages, dispatch an event with
        // useful text so the page can show its own modal.
        try { if (window.hideLoading) window.hideLoading(); } catch(e){}
        const detail = {
            title: (typeof GN_I18N !== 'undefined') ? GN_I18N.t('session_expired') : 'Session Expired',
            message: (typeof GN_I18N !== 'undefined') ? GN_I18N.t('failed_to_refresh_session') : 'Could not refresh your session automatically. Please sign in again.',
            retryText: (typeof GN_I18N !== 'undefined') ? GN_I18N.t('retry') : 'Retry',
            signInText: (typeof GN_I18N !== 'undefined') ? GN_I18N.t('sign_in_with_google') : 'Sign in with Google'
        };

        try { window.dispatchEvent(new CustomEvent('auth-refresh-error', { detail })); } catch(e) { console.warn('auth: failed to dispatch auth-refresh-error', e); }

        // Attempt a one-time automatic refresh similar to previous behavior
        try {
            const attempted = sessionStorage.getItem('auto_refresh_attempted');
            if (!attempted) {
                sessionStorage.setItem('auto_refresh_attempted', '1');
                (async () => {
                    try {
                        try { if (window.showLoading) window.showLoading((typeof GN_I18N !== 'undefined') ? GN_I18N.t('retrying') : 'Retrying...'); } catch(e){}
                        const ok = await refreshAccessToken();
                        try { if (window.hideLoading) window.hideLoading(); } catch(e){}
                        if (ok) location.reload();
                    } catch (e) {
                        try { if (window.hideLoading) window.hideLoading(); } catch(e){}
                    }
                })();
            }
        } catch(e){}
    }

    // Check if already authenticated
    // If token values were stored as cookies, copy them into localStorage
    // so the app can detect an existing session (useful for some hosts).
    try {
        const ct = (typeof document !== 'undefined' && document.cookie) ? document.cookie : '';
        const matchToken = ct.match(/(?:^|; )google_token=([^;]+)/);
        const matchExpires = ct.match(/(?:^|; )google_token_expires_at=([^;]+)/);
        if (matchToken && !localStorage.getItem('google_token')) {
            localStorage.setItem('google_token', decodeURIComponent(matchToken[1]));
        }
        if (matchExpires && !localStorage.getItem('google_token_expires_at')) {
            localStorage.setItem('google_token_expires_at', decodeURIComponent(matchExpires[1]));
        }

        // Do not auto-enable local bypass here; local mode should only set
        // a fake token when the user explicitly clicks "Enter App".
    } catch(e){}

    // No initial blocking "Checking session" loader — avoid showing
    // a persistent loading state on startup. Individual actions will show
    // loaders when necessary (refresh, sync, restore, etc.).
    let token = localStorage.getItem('google_token');
    let expiresAt = localStorage.getItem('google_token_expires_at');
    let validSession = false;

    try {
        const _needs = localStorage.getItem && localStorage.getItem('needs_initial_download');
    } catch(e) { }

    try {
        if (token && expiresAt) {
            if (Date.now() < parseInt(expiresAt)) {
                validSession = true;
            } else {
                // expired: try to refresh using refresh token if available.
                // If a refresh token exists but refresh fails, show an explicit
                // UI so user can retry or re-login.
                const hadRefresh = !!localStorage.getItem('google_refresh_token');
                try {
                    console.log('startup: token expired, attempting refresh');
                    const refreshed = await refreshAccessToken();
                    console.log('startup: refresh result', refreshed);
                    if (refreshed) {
                        validSession = true;
                        token = localStorage.getItem('google_token');
                        expiresAt = localStorage.getItem('google_token_expires_at');
                        // If running on the login page, navigate to the app home
                        try { if (window.location && (window.location.pathname === '/' || window.location.pathname.endsWith('index.html'))) { window.location.href = 'home.html'; } else { try { location.reload(); } catch(e){} } } catch(e) {}
                    } else {
                        if (hadRefresh) {
                            renderRefreshError();
                            return;
                        }
                        localStorage.removeItem('google_token');
                        localStorage.removeItem('google_token_expires_at');
                    }
                } catch (e) {
                    console.error('startup refresh error', e);
                    if (hadRefresh) {
                        renderRefreshError();
                        return;
                    }
                    localStorage.removeItem('google_token');
                    localStorage.removeItem('google_token_expires_at');
                }
            }
        }
    } catch (e) {
        console.error('Error during auth startup check', e);
    }

    // Load Google Identity Services script
    const loadScript = new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = resolve;
        document.head.appendChild(script);
    });

    // Helper: call `showApp()` after DOM is ready, and ensure loader is hidden.
    function callShowApp() {
        try {
            if (window.showApp) {
                window.showApp();
                try { if (window.hideLoading) window.hideLoading(); } catch(e){}
                return;
            }
            document.addEventListener('DOMContentLoaded', () => {
                try { if (window.showApp) window.showApp(); } catch(e){}
                try { if (window.hideLoading) window.hideLoading(); } catch(e){}
            }, { once: true });
        } catch(e){}
    }

    // Attempt automatic restore from Drive after login when flagged.
    // Waits for DriveStorage and DB to be available (up to a timeout) then runs restore.
    window.autoRestoreFromDrive = async (isAuto = true) => {
        console.info('[AutoRestore] requested', { isAuto });
        try {
            // Poll for DriveStorage and DB readiness
            const start = Date.now();
            while ((typeof DriveStorage === 'undefined' || (typeof ensureDbOpen === 'undefined' && typeof db === 'undefined')) && (Date.now() - start) < 10000) {
                await new Promise(r => setTimeout(r, 200));
            }

            if (typeof DriveStorage === 'undefined') {
                console.warn('[AutoRestore] DriveStorage not available, aborting auto-restore');
                try { localStorage.removeItem('needs_initial_download'); } catch(e){}
                return;
            }

            try { if (window.showLoading) window.showLoading((typeof GN_I18N !== 'undefined') ? GN_I18N.t('welcome_back_syncing') || 'Welcome back! Syncing your data...' : 'Welcome back! Syncing your data...'); } catch(e){}

            if (typeof ensureDbOpen === 'function') {
                try { await ensureDbOpen(); } catch(e){ console.warn('[AutoRestore] ensureDbOpen failed', e); }
            }

            console.info('[AutoRestore] calling DriveStorage.load');
            const data = await DriveStorage.load();
            console.info('[AutoRestore] DriveStorage.load returned', { hasData: !!data, keys: data ? Object.keys(data) : [] });

            if (!data) {
                try { localStorage.removeItem('needs_initial_download'); } catch(e){}
                try { if (window.hideLoading) window.hideLoading(); } catch(e){}
                if (isAuto && window.showApp) window.showApp();
                return;
            }

            // Apply into DB if available
            if (typeof db !== 'undefined') {
                try {
                    await db.transaction('rw', [db.catalog_exercises, db.catalog_images, db.custom_exercises, db.custom_images, db.routines, db.history, db.weights], async () => {
                        let sanitizedCatalogImages = null;
                        if (db.catalog_images) {
                            await db.catalog_images.clear();
                            if (data.catalog_images) {
                                let normalizedCatalogImages = data.catalog_images.map(img => ({
                                    ...img,
                                    data: img.data ? (img.data.startsWith('data:') ? img.data : `data:image/png;base64,${img.data}`) : img.data
                                }));
                                if (typeof db.sanitizeCatalogImages === 'function') normalizedCatalogImages = db.sanitizeCatalogImages(normalizedCatalogImages);
                                sanitizedCatalogImages = normalizedCatalogImages;
                                await db.catalog_images.bulkAdd(normalizedCatalogImages);
                            }
                        }

                        if (db.catalog_exercises) {
                            await db.catalog_exercises.clear();
                            if (data.catalog_exercises) {
                                let toWrite = data.catalog_exercises;
                                if (typeof db.sanitizeCatalogExercises === 'function') toWrite = db.sanitizeCatalogExercises(toWrite, sanitizedCatalogImages);
                                await db.catalog_exercises.bulkAdd(toWrite);
                            }
                        }

                        if (db.custom_images) {
                            await db.custom_images.clear();
                            if (data.custom_images) {
                                const normalizedCustomImages = data.custom_images.map(img => ({
                                    ...img,
                                    data: img.data ? (img.data.startsWith('data:') ? img.data : `data:image/png;base64,${img.data}`) : img.data
                                }));
                                await db.custom_images.bulkAdd(normalizedCustomImages);
                            }
                        }

                        if (db.custom_exercises) {
                            await db.custom_exercises.clear();
                            if (data.custom_exercises) await db.custom_exercises.bulkAdd(data.custom_exercises);
                        }

                        if (db.routines) {
                            await db.routines.clear();
                            if (data.routines) await db.routines.bulkAdd(data.routines);
                        }

                        if (db.history) {
                            await db.history.clear();
                            if (data.history) await db.history.bulkAdd(data.history);
                        }

                        // Weights table
                        if (db.weights) {
                            console.info('[AutoRestore] writing weights to DB', { count: Array.isArray(data.weights) ? data.weights.length : 0, sample: Array.isArray(data.weights) && data.weights.length ? data.weights[0] : null });
                            await db.weights.clear();
                            if (data.weights) await db.weights.bulkPut(data.weights);
                            let newCount = await db.weights.count();
                            if (newCount === 0 && Array.isArray(data.weights) && data.weights.length) {
                                console.warn('[AutoRestore] bulkPut wrote 0 items, falling back to per-item put()');
                                for (const w of data.weights) {
                                    try { await db.weights.put(w); } catch (e) { console.error('[AutoRestore] failed to put weight item', { item: w, error: e }); }
                                }
                                newCount = await db.weights.count();
                            }
                            console.info('[AutoRestore] weights write complete', { newCount });
                        }
                    });
                } catch (e) {
                    console.error('[AutoRestore] applying data to DB failed', e);
                }
            } else {
                console.warn('[AutoRestore] db not available; skipping DB write');
            }

            if (data.lastSync) try { localStorage.setItem('last_sync_time', data.lastSync.time || data.lastSync); } catch(e){}
            try { localStorage.setItem('has_local_changes', 'false'); } catch(e){}
            try { localStorage.removeItem('needs_initial_download'); } catch(e){}

            console.info('[AutoRestore] completed — reloading');
            try { if (window.hideLoading) window.hideLoading(); } catch(e){}
            try { location.reload(); } catch(e){}
        } catch (err) {
            console.error('[AutoRestore] failed', err);
            try { if (err && err.message === 'AUTH_EXPIRED') { renderRefreshError(); } } catch(e){}
            try { if (window.hideLoading) window.hideLoading(); } catch(e){}
        }
    };

    // Helper to read a cookie value by name
    function getCookie(name) {
        try {
            if (typeof document === 'undefined' || !document.cookie) return null;
            const matches = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
            return matches ? decodeURIComponent(matches[1]) : null;
        } catch (e) { return null; }
    }

    // PKCE helpers and token refresh
    function generateRandomString(length = 64) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => ('0' + b.toString(16)).slice(-2)).join('').slice(0, length);
    }

    async function sha256(buffer) {
        const enc = new TextEncoder();
        const data = enc.encode(buffer);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return new Uint8Array(hash);
    }

    function base64UrlEncode(bytes) {
        let str = btoa(String.fromCharCode(...bytes));
        return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }

    async function createCodeChallenge(verifier) {
        const hashed = await sha256(verifier);
        return base64UrlEncode(hashed);
    }

    async function exchangeCodeForTokens(code, code_verifier, redirect_uri) {
        // Always POST to the configured Cloud Function exchange endpoint.
        const exchangeUrl = 'https://us-central1-gymnerd-9cabd.cloudfunctions.net/exchangeTokenV2';

        const resp = await fetch(exchangeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, code_verifier, redirect_uri })
        });

        const ct = (resp.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('application/json')) {
            const text = await resp.text();
            throw new Error('non_json_response: ' + text.slice(0, 200));
        }

        const data = await resp.json();
        if (!resp.ok) throw new Error('exchange_failed: ' + JSON.stringify(data));
        return data;
    }

    async function refreshAccessToken() {
        const refresh_token = localStorage.getItem('google_refresh_token');
        if (!refresh_token) return false;
        console.log('refreshAccessToken: start');
        // If a refresh is already in progress, return the same promise so we
        // don't trigger multiple calls to the Cloud Function.
        if (_refreshPromise) return await _refreshPromise;

        try {
            if (window.showLoading) window.showLoading((typeof GN_I18N !== 'undefined') ? GN_I18N.t('refreshing_session') || 'Refreshing session...' : 'Refreshing session...');
        } catch(e){}

        _refreshPromise = (async () => {
            try {
                // Use server-side exchange so client_secret stays on the server.
                const exchangeUrl = 'https://us-central1-gymnerd-9cabd.cloudfunctions.net/exchangeTokenV2';
                const resp = await fetch(exchangeUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token })
                });

                const dataText = await resp.text();
                let data = {};
                try { data = JSON.parse(dataText); } catch(e) { data = { raw: dataText }; }

                if (resp.ok && data.access_token) {
                    console.log('refreshAccessToken: success');
                    localStorage.setItem('google_token', data.access_token);
                    localStorage.setItem('google_token_expires_at', Date.now() + (data.expires_in * 1000));
                    // Google may or may not return a new refresh_token. If it does, store it.
                    if (data.refresh_token) localStorage.setItem('google_refresh_token', data.refresh_token);
                                try {
                                    // Update stored user profile after refresh
                                    if (typeof window.fetchGoogleUserProfile === 'function') {
                                        await window.fetchGoogleUserProfile();
                                    }
                                } catch (e) { console.warn('profile fetch after refresh failed', e); }
                    // If we're on the login page, navigate to home so the app proceeds.
                    try {
                        if (window && window.location && (window.location.pathname === '/' || window.location.pathname.endsWith('index.html'))) {
                            try { window.location.href = 'home.html'; } catch(e) { /* ignore */ }
                        }
                    } catch (e) {}
                    return true;
                }

                console.warn('Refresh failed', { status: resp.status, data });
                // Remove stored refresh token to force a fresh login next.
                localStorage.removeItem('google_refresh_token');
                return false;
            } catch (e) {
                console.error('Refresh error', e);
                return false;
            } finally {
                // Clear promise so future refreshes can run again
                _refreshPromise = null;
            }
        })();

        try {
            return await _refreshPromise;
        } finally {
            try { if (window.hideLoading) window.hideLoading(); } catch(e){}
        }
    }

    // Ensure a valid access token is available. Attempts refresh if needed.
    window.ensureGoogleAccessToken = async () => {
        const token = localStorage.getItem('google_token');
        const expiresAt = localStorage.getItem('google_token_expires_at');

        if (token && expiresAt && Date.now() < parseInt(expiresAt) - 5000) {
            return true;
        }

        // Try refresh token
        const ok = await refreshAccessToken();
        if (ok) return true;

        // Cleanup stale tokens
        localStorage.removeItem('google_token');
        localStorage.removeItem('google_token_expires_at');
        return false;
    };

    // Fetch basic user profile (name, picture, email) and store in localStorage
    window.fetchGoogleUserProfile = async () => {
        try {
            const ok = await window.ensureGoogleAccessToken();
            if (!ok) return null;
            const token = localStorage.getItem('google_token');
            if (!token) return null;
            const resp = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
                headers: { Authorization: 'Bearer ' + token }
            });
            if (!resp.ok) return null;
            const data = await resp.json();
            try {
                localStorage.setItem('google_user', JSON.stringify(data));
                try { window.dispatchEvent(new CustomEvent('userchange', { detail: data })); } catch(e){}
            } catch(e){}
            return data;
        } catch (e) {
            console.warn('fetchGoogleUserProfile error', e);
            return null;
        }
    };

    // Local mock data helper removed — local "Enter App" mode disabled.
    window.createLocalMockData = async () => { return false; };

    

    window.handleAuth = async () => {
        // Start PKCE flow in a popup so we can receive a refresh token
        const code_verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(96)));
        const code_challenge = await createCodeChallenge(code_verifier);
        // Use the configured REDIRECT_PATH but include any base path
        // (e.g. GitHub Pages project sites like /GymNerd/) so the final
        // redirect URI exactly matches what is registered in Cloud Console.
        const basePath = window.location.pathname.replace(/\/[^\/]*$/, '/');
        const redirect_uri = window.location.origin + basePath + REDIRECT_PATH.replace(/^[\/]*/, '');
        try { console.log('OAuth redirect_uri:', redirect_uri); } catch(e){}

        // store verifier in session for later exchange
        sessionStorage.setItem('pkce_code_verifier', code_verifier);
        // mark that the app is currently performing an interactive sign-in
        try {
            localStorage.setItem('gn_signing_in', '1');
            sessionStorage.setItem('gn_signing_in', '1');
        } catch (e) {}
        try { window.__gn_signing_in = true; } catch(e){}

        const params = new URLSearchParams({
            client_id: CLIENT_ID,
            redirect_uri,
            response_type: 'code',
            scope: SCOPES,
            access_type: 'offline',
            prompt: 'consent',
            code_challenge: code_challenge,
            code_challenge_method: 'S256',
            include_granted_scopes: 'true'
        });

        const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();

        

        // Always use a full-window redirect for the OAuth flow. This avoids
        // popup-blocking issues on iOS and simplifies the flow: the callback
        // page will store the code and return to the app, where we resume the
        // PKCE exchange (see load-time handler earlier in this file).
        window.location.href = authUrl;
        return;
    };

    // If the app was opened via redirect (standalone / iOS home-screen), the
    // `oauth2callback.html` will store the code in sessionStorage. Detect that
    // case on load and continue the PKCE token exchange here.
    const storedCode = sessionStorage.getItem('oauth2_code') || localStorage.getItem('oauth2_code');
    if (storedCode) {
        try {
            // Use the same redirect URI used when initiating auth (include base path)
            const basePath = window.location.pathname.replace(/\/[^\/]*$/, '/');
            const redirect_uri = window.location.origin + basePath + REDIRECT_PATH.replace(/^[\/]*/, '');
            try { console.log('OAuth redirect_uri (exchange):', redirect_uri); } catch(e){}
            const verifier = sessionStorage.getItem('pkce_code_verifier');

            // Clean up stored code immediately
            sessionStorage.removeItem('oauth2_code');
            localStorage.removeItem('oauth2_code');

            // Ensure the signing-in flag is present (in case of redirect race)
            try { localStorage.setItem('gn_signing_in', '1'); sessionStorage.setItem('gn_signing_in', '1'); } catch(e){}
            try { window.__gn_signing_in = true; } catch(e){}

            // Show full-screen loading while exchanging the code
            try { if (window.showLoading) window.showLoading((typeof GN_I18N !== 'undefined') ? GN_I18N.t('finalizing_signin') || 'Finalizing sign-in...' : 'Finalizing sign-in...'); } catch(e){}

            // Exchange code for tokens
            const tokenData = await exchangeCodeForTokens(storedCode, verifier, redirect_uri);

            // If exchange succeeded and we have a token, navigate immediately
            // without hiding the global loader so the login UI doesn't flash.
            if (tokenData && tokenData.access_token) {
                localStorage.setItem('google_token', tokenData.access_token);
                localStorage.setItem('google_token_expires_at', Date.now() + (tokenData.expires_in * 1000));
                if (tokenData.refresh_token) localStorage.setItem('google_refresh_token', tokenData.refresh_token);
                try {
                    if (typeof window.fetchGoogleUserProfile === 'function') {
                        await window.fetchGoogleUserProfile();
                    }
                } catch(e) { console.warn('profile fetch after exchange failed', e); }
                localStorage.setItem('needs_initial_download', 'true');
                // Do not hide the loader here; the upcoming reload/navigation
                // will replace this page. Use replace to avoid keeping this
                // intermediate state in history.
                try { window.location.replace('home.html'); } catch(e) { location.reload(); }
                return;
            } else {
                try { console.error('Token exchange failed', tokenData); } catch(e){}
                try {
                    // Clear signing-in state and hide loader so the login UI can be shown
                    try { if (window.hideLoading) window.hideLoading(); } catch(e){}
                    try { sessionStorage.removeItem('gn_signing_in'); localStorage.removeItem('gn_signing_in'); } catch(e){}
                    try { window.__gn_signing_in = false; } catch(e){}

                    const detail = {
                        title: (typeof GN_I18N !== 'undefined') ? GN_I18N.t('signin_failed') || 'Sign-in Failed' : 'Sign-in Failed',
                        message: (typeof GN_I18N !== 'undefined') ? GN_I18N.t('failed_to_complete_signin') || 'Could not complete sign-in. Please try again.' : 'Could not complete sign-in. Please try again.',
                        retryText: (typeof GN_I18N !== 'undefined') ? GN_I18N.t('retry') || 'Retry' : 'Retry',
                        signInText: (typeof GN_I18N !== 'undefined') ? GN_I18N.t('sign_in_with_google') || 'Sign in with Google' : 'Sign in with Google'
                    };
                    try { window.dispatchEvent(new CustomEvent('auth-refresh-error', { detail })); } catch(e){}
                } catch(e){}
            }
        } catch (err) {
            try { if (window.hideLoading) window.hideLoading(); } catch(e){}
            try { sessionStorage.removeItem('gn_signing_in'); localStorage.removeItem('gn_signing_in'); } catch(e){}
            try { window.__gn_signing_in = false; } catch(e){}
            console.error('Exchange error', err);
            try {
                const detail = {
                    title: (typeof GN_I18N !== 'undefined') ? GN_I18N.t('signin_failed') || 'Sign-in Failed' : 'Sign-in Failed',
                    message: err && err.message ? err.message : ((typeof GN_I18N !== 'undefined') ? GN_I18N.t('failed_to_complete_signin') || 'Could not complete sign-in. Please try again.' : 'Could not complete sign-in. Please try again.'),
                    retryText: (typeof GN_I18N !== 'undefined') ? GN_I18N.t('retry') || 'Retry' : 'Retry',
                    signInText: (typeof GN_I18N !== 'undefined') ? GN_I18N.t('sign_in_with_google') || 'Sign in with Google' : 'Sign in with Google'
                };
                try { sessionStorage.removeItem('gn_signing_in'); localStorage.removeItem('gn_signing_in'); } catch(e){}
                try { window.__gn_signing_in = false; } catch(e){}
                try { window.dispatchEvent(new CustomEvent('auth-refresh-error', { detail })); } catch(e){}
            } catch(e){}
        }
    }

    if (!validSession) {
        // The login UI is provided by index.html; avoid creating DOM here.
        try { window.authNeedsLogin = true; } catch(e){}
    } else {
        if (window.location.protocol !== 'file:' && token !== 'local-bypass') {
            await loadScript;
        }

        // If we need to perform an initial download from Drive, don't reveal
        // the app home screen yet — run the auto-restore and keep showing
        // the global loader until it completes (or fails).
        try {
            const needsFlag = (localStorage.getItem && localStorage.getItem('needs_initial_download')) || null;
            if (needsFlag === 'true') {
                try {
                    if (typeof window.autoRestoreFromDrive === 'function') {
                        await window.autoRestoreFromDrive(true);
                        // autoRestoreFromDrive will reload when done; ensure we stop further startup
                        return;
                    }
                } catch(e) {}
            }
        } catch(e){}

        callShowApp();
    }

    function renderLogin() {
        // Login UI is provided by index.html; auth.js must not manipulate DOM for login.
        try { window.authNeedsLogin = true; } catch(e){}
    }
})();
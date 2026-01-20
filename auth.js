(async function() {
    console.log('auth.js initializing');
    let CLIENT_ID = "__GOOGLE_CLIENT_ID__";
    // Include OpenID scopes so we can fetch user's profile (name + picture)
    const SCOPES = 'openid profile email https://www.googleapis.com/auth/drive.file';
    const REDIRECT_PATH = '/oauth2callback.html';

    // Internal: promise used to dedupe concurrent refresh attempts
    // Use `var` and prefer an existing window property so re-loading the
    // script (during development or accidental double-include) doesn't
    // throw a redeclare SyntaxError.
    var _refreshPromise = window._refreshPromise || null;

    window.logout = () => {
        const msg = (typeof GN_I18N !== 'undefined') ? GN_I18N.t('confirm_logout') : 'Are you sure you want to logout?';
        if (!confirm(msg)) return;
        try {
            localStorage.removeItem('google_token');
            localStorage.removeItem('google_token_expires_at');
        } catch(e){}
        location.reload();
    };

    window.showLoading = (message = (typeof GN_I18N !== 'undefined' ? GN_I18N.t('syncing_with_drive') : "Syncing with Google Drive...")) => {
        let loader = document.getElementById('global-loader');
        const createAndAttach = () => {
            if (document.getElementById('global-loader')) return;
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.92); z-index: 2000000; display: flex; align-items: center; justify-content: center; flex-direction: column; color: white; font-family: sans-serif; backdrop-filter: blur(4px); pointer-events: all;";
            loader.innerHTML = `
                <div style="width: 40px; height: 40px; border: 4px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px;"></div>
                <div id="loader-message" style="font-weight: 600; font-size: 0.9rem;">${message}</div>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            `;
            if (document.body) {
                document.body.appendChild(loader);
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.appendChild(loader);
                }, { once: true });
            }
        };

        if (!loader) {
            createAndAttach();
        } else {
            const msgEl = document.getElementById('loader-message');
            if (msgEl) msgEl.innerText = message;
            loader.style.display = 'flex';
        }
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
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.display = 'none';
        }
        // If a refresh error was deferred while loading, show it now
        try {
            const deferred = sessionStorage.getItem('deferred_refresh_error');
            if (deferred) {
                sessionStorage.removeItem('deferred_refresh_error');
                try { renderRefreshError(); } catch(e){}
            }
        } catch(e){}
    };

    window.clearAllAppData = async () => {
        if (!confirm((typeof GN_I18N !== 'undefined') ? GN_I18N.t('danger_clear_confirm') : "DANGER: This will permanently delete all local data and your backup on Google Drive. Continue?")) return;

        try {
            // 1. Delete from Drive if logged in
            if (localStorage.getItem('google_token')) {
                try {
                    if (typeof DriveStorage !== 'undefined') {
                        await DriveStorage.deleteFile();
                    }
                } catch (e) {
                    console.warn("Could not delete Drive file:", e);
                }
            }

            // 2. Delete Local DB
            if (typeof Dexie !== 'undefined') {
                const db = new Dexie("GymAppDB");
                await db.delete();
            }

            // 3. Clear Local Storage
            localStorage.clear();

            alert((typeof GN_I18N !== 'undefined') ? GN_I18N.t('all_data_cleared') : "All data cleared successfully.");
            location.reload();
        } catch (err) {
            console.error("Clear failed:", err);
            alert((typeof GN_I18N !== 'undefined') ? GN_I18N.t('failed_to_clear_data') : "Failed to clear some data. Check console.");
        }
    };

    window.renderAuthStatus = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const token = localStorage.getItem('google_token');
        const expiresAt = localStorage.getItem('google_token_expires_at');
        const isLocal = window.location.protocol === 'file:';

        // If a valid token is present in cookies, treat the user as logged-in
        // and reveal the app immediately (copy into localStorage for runtime).
        try {
            const cookieToken = getCookie('google_token');
            const cookieExpires = getCookie('google_token_expires_at');
            if (cookieToken && cookieExpires && Date.now() < parseInt(cookieExpires)) {
                try {
                    localStorage.setItem('google_token', cookieToken);
                    localStorage.setItem('google_token_expires_at', cookieExpires);
                } catch(e){}
                callShowApp();
                return;
            }
        } catch(e){}
        const isExpired = expiresAt && Date.now() > parseInt(expiresAt);

        const isSettingsContainer = containerId === 'auth-status-container';

        if (token && !isExpired) {
            const isBypass = token === 'local-bypass';
            let user = null;
            try { const u = localStorage.getItem('google_user'); if (u) user = JSON.parse(u); } catch(e){}
            const userHTML = user ? `<div style="display:flex; align-items:center; gap:10px; margin-right:8px;"><img src="${user.picture || ''}" alt="avatar" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,0.04);"/><div style="min-width:0;"><div style="font-weight:700; color:#e2e8f0; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${user.name || ''}</div><div style="font-size:0.75rem; color:#94a3b8; margin-top:4px;"><span style=\"color: ${isBypass ? '#f59e0b' : '#10b981'};\">●</span> ${isBypass ? (typeof GN_I18N !== 'undefined' ? GN_I18N.t('local_mode') : 'Local Mode') : (typeof GN_I18N !== 'undefined' ? GN_I18N.t('connected_to_drive') : 'Connected to Drive')}</div></div></div>` : '';
            const wrapperStyle = isSettingsContainer
                ? 'display:flex; align-items:center; gap:8px; font-size:0.9rem; color:#94a3b8; padding: 8px 0; background: transparent; border-radius: 0; margin-bottom: 12px; border: none;'
                : 'display:flex; align-items:center; gap:8px; font-size:0.9rem; color:#94a3b8; padding:12px; background:#1e293b; border-radius:12px; margin-bottom:20px; border:1px solid #334155;';

            const settingsLink = isSettingsContainer ? '' : `<a href="settings.html" style="background: transparent; color: #94a3b8; border: 1px solid rgba(255,255,255,0.04); border-radius:8px; padding:6px 10px; cursor: pointer; font-weight: 600; font-size: 0.75rem; text-decoration: none;">${typeof GN_I18N !== 'undefined' ? GN_I18N.t('menu_settings') : 'Settings'}</a>`;

            container.innerHTML = `
                <div style="${wrapperStyle}">
                    ${userHTML}
                    <div style="flex:1"></div>
                    ${settingsLink}
                </div>
            `;
        } else {
            const wrapperStyle = isSettingsContainer
                ? 'display:flex; align-items:center; gap:8px; font-size:0.9rem; color:#94a3b8; padding:8px 0; background: transparent; border-radius:0; margin-bottom:12px; border:none;'
                : 'display:flex; align-items:center; gap:8px; font-size:0.9rem; color:#94a3b8; padding:12px; background:#1e293b; border-radius:12px; margin-bottom:20px; border:1px solid #334155;';

            const settingsLink = isSettingsContainer ? '' : `<a href="settings.html" style="background: transparent; color: #94a3b8; border: 1px solid rgba(255,255,255,0.04); border-radius:8px; padding:6px 10px; cursor: pointer; font-weight: 600; font-size: 0.75rem; text-decoration: none;">${typeof GN_I18N !== 'undefined' ? GN_I18N.t('menu_settings') : 'Settings'}</a>`;

            container.innerHTML = `
                <div style="${wrapperStyle}">
                    <span style="flex-grow:1; display:flex; align-items:center; gap:6px;"><span style="color:#f59e0b;">●</span> ${typeof GN_I18N !== 'undefined' ? (isLocal ? GN_I18N.t('local_mode') : GN_I18N.t('not_connected')) : (isLocal ? 'Local Mode' : 'Not Connected')}</span>
                    ${settingsLink}
                    <button onclick="handleAuth()" style="background: #3b82f6; color: white; border: none; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-weight: 600; font-size: 0.8rem;">${typeof GN_I18N !== 'undefined' ? GN_I18N.t('login') : 'Login'}</button>
                </div>
            `;
        }
        
    };

    // Render only the user's avatar + name and a Settings button (for the home page)
    window.renderUserInfo = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        const token = localStorage.getItem('google_token');
        const expiresAt = localStorage.getItem('google_token_expires_at');
        const isLocal = window.location.protocol === 'file:';
        let user = null;
        try { const u = localStorage.getItem('google_user'); if (u) user = JSON.parse(u); } catch(e){}

        const name = user ? (user.name || user.email || '') : '';
        const avatar = user ? (user.picture || '') : '';

        // Small compact UI: avatar | name | settings button
        container.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                ${avatar ? `<img src="${avatar}" alt="avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,0.04);"/>` : ''}
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:800; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</div>
                    <div style="font-size:0.75rem; color:#94a3b8;">${isLocal ? (typeof GN_I18N !== 'undefined' ? GN_I18N.t('local_mode') : 'Local Mode') : ''}</div>
                </div>
                <a href="settings.html" style="background: transparent; color: #94a3b8; border: 1px solid rgba(255,255,255,0.04); border-radius:8px; padding:6px 10px; cursor: pointer; font-weight: 600; font-size: 0.75rem; text-decoration: none;">${typeof GN_I18N !== 'undefined' ? GN_I18N.t('menu_settings') : 'Settings'}</a>
            </div>
        `;
    };

    // Show explicit UI when a refresh attempt fails but a refresh token existed.
    function renderRefreshError() {
        // Ensure any global loader is hidden so the error UI is interactive
        try { if (window.hideLoading) window.hideLoading(); } catch(e){}

        const blocker = document.createElement('div');
        blocker.id = 'refresh-error-blocker';
        blocker.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15,17,26,0.98); z-index: 1000000; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px; box-sizing: border-box; color: white; font-family: sans-serif;";

        const title = (typeof GN_I18N !== 'undefined') ? GN_I18N.t('session_expired') : 'Session Expired';
        const message = (typeof GN_I18N !== 'undefined') ? GN_I18N.t('failed_to_refresh_session') : 'Could not refresh your session automatically. Please sign in again.';
        const retryText = (typeof GN_I18N !== 'undefined') ? GN_I18N.t('retry') : 'Retry';
        const signInText = (typeof GN_I18N !== 'undefined') ? GN_I18N.t('sign_in_with_google') : 'Sign in with Google';

        blocker.innerHTML = `
            <div style="max-width:420px; width:100%;">
                <h2 style="margin-bottom:8px; font-size:1.6rem;">${title}</h2>
                <p style="color:#94a3b8; margin-bottom:20px;">${message}</p>
                <div style="display:flex; gap:10px;">
                    <button id="refresh-retry-btn" style="flex:1; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); background:#1e293b; color:white; font-weight:700;">${retryText}</button>
                    <button id="refresh-signin-btn" style="flex:1; padding:12px; border-radius:10px; border:none; background:#3b82f6; color:white; font-weight:700;">${signInText}</button>
                </div>
                <div style="margin-top:12px; color:#94a3b8; font-size:0.85rem;">" + ((typeof GN_I18N !== 'undefined') ? GN_I18N.t('you_can_also_clear_local_data') : 'You can also clear local data from the settings if you prefer.') + "</div>
            </div>
        `;

        // Hook buttons synchronously so they are immediately responsive
        const attachHandlers = () => {
            const retry = document.getElementById('refresh-retry-btn');
            const signin = document.getElementById('refresh-signin-btn');

            if (retry) retry.addEventListener('click', async () => {
                try {
                    showLoading((typeof GN_I18N !== 'undefined') ? GN_I18N.t('retrying') : 'Retrying...');
                    const ok = await refreshAccessToken();
                    hideLoading();
                    if (ok) {
                        location.reload();
                    } else {
                        alert((typeof GN_I18N !== 'undefined') ? GN_I18N.t('failed_to_refresh_session') : 'Refresh failed. Please sign in.');
                    }
                } catch (e) {
                    hideLoading();
                    alert((typeof GN_I18N !== 'undefined') ? GN_I18N.t('failed_to_refresh_session') : 'Refresh failed. Please sign in.');
                }
            });

            if (signin) signin.addEventListener('click', () => {
                try { document.body.removeChild(blocker); } catch(e){}
                handleAuth();
            });

            try { GN_I18N.applyTranslations(blocker); } catch(e){}
        };

        if (document.body) {
            document.body.appendChild(blocker);
            attachHandlers();
            // Attempt a one-time automatic refresh to ensure the function is invoked
            try {
                const attempted = sessionStorage.getItem('auto_refresh_attempted');
                if (!attempted) {
                    sessionStorage.setItem('auto_refresh_attempted', '1');
                    (async () => {
                        try {
                            showLoading((typeof GN_I18N !== 'undefined') ? GN_I18N.t('retrying') : 'Retrying...');
                            const ok = await refreshAccessToken();
                            hideLoading();
                            if (ok) location.reload();
                        } catch (e) {
                            hideLoading();
                        }
                    })();
                }
            } catch(e){}
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(blocker);
                attachHandlers();
                try {
                    const attempted = sessionStorage.getItem('auto_refresh_attempted');
                    if (!attempted) {
                        sessionStorage.setItem('auto_refresh_attempted', '1');
                        (async () => {
                            try {
                                showLoading((typeof GN_I18N !== 'undefined') ? GN_I18N.t('retrying') : 'Retrying...');
                                const ok = await refreshAccessToken();
                                hideLoading();
                                if (ok) location.reload();
                            } catch (e) {
                                hideLoading();
                            }
                        })();
                    }
                } catch(e){}
            });
        }
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
                        // Reload so the rest of the UI (rendered earlier) updates
                        // to reflect the newly refreshed credentials.
                        try { location.reload(); } catch(e) {}
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
            try { localStorage.setItem('google_user', JSON.stringify(data)); } catch(e){}
            return data;
        } catch (e) {
            console.warn('fetchGoogleUserProfile error', e);
            return null;
        }
    };

    // Create local mock data for offline / file:// development mode.
    // Seeds a mock `google_user` and, if Dexie is available, populates
    // the catalog tables from local `catalog/*.json` and adds sample routines/history.
    window.createLocalMockData = async () => {
        try {
            // Mock user
            const mockUser = {
                sub: 'local-12345',
                name: 'Local Tester',
                given_name: 'Local',
                family_name: 'Tester',
                picture: 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="100%" height="100%" fill="#2563eb"/><text x="50%" y="54%" font-size="56" fill="#fff" dominant-baseline="middle" text-anchor="middle">LT</text></svg>`),
                email: 'local@example.com',
                email_verified: true
            };
            try { localStorage.setItem('google_user', JSON.stringify(mockUser)); } catch(e){}
            try { localStorage.setItem('last_sync_time', new Date().toISOString()); } catch(e){}
            try { localStorage.setItem('has_local_changes', 'false'); } catch(e){}

            // If Dexie and db are available, seed catalog and a few sample items
            if (typeof Dexie !== 'undefined' && typeof db !== 'undefined') {
                try {
                    await ensureDbOpen();
                    const [exCount, imgCount] = await Promise.all([
                        db.catalog_exercises.count(),
                        db.catalog_images.count()
                    ]);

                    if (exCount === 0 || imgCount === 0) {
                        // Try to load local catalog files shipped with the project
                        const [exResp, imgResp] = await Promise.allSettled([
                            fetch('catalog/exercises.json'),
                            fetch('catalog/images.json')
                        ]);

                        let exercises = [];
                        let images = [];

                        if (exResp.status === 'fulfilled' && exResp.value.ok) {
                            try { exercises = await exResp.value.json(); } catch(e){}
                        }
                        if (imgResp.status === 'fulfilled' && imgResp.value.ok) {
                            try { images = await imgResp.value.json(); } catch(e){}
                        }

                        // Normalize images' data URIs
                        images = images.map(img => ({ ...img, data: img.data ? (img.data.startsWith('data:') ? img.data : `data:image/png;base64,${img.data}`) : img.data }));

                        // Write to DB (use negative ids for catalog)
                        const catalogExercises = exercises.map(ex => ({ ...ex, id: -Math.abs(ex.id || Date.now()) }));

                        await db.transaction('rw', db.catalog_exercises, db.catalog_images, async () => {
                            if (catalogExercises.length) {
                                await db.catalog_exercises.clear();
                                await db.catalog_exercises.bulkAdd(catalogExercises);
                            }
                            if (images.length) {
                                await db.catalog_images.clear();
                                await db.catalog_images.bulkAdd(images);
                            }
                        });
                    }

                    // If no routines exist, add a sample routine and history
                    const routinesCount = await db.routines.count();
                    if (routinesCount === 0) {
                        const sampleExercises = await db.catalog_exercises.limit(3).toArray();
                        const exIds = sampleExercises.map(e => e.id);
                        const routine = { name: 'Full Body (Local)', exerciseIds: exIds };
                        await db.routines.add(routine);
                    }

                    const historyCount = await db.history.count();
                    if (historyCount === 0) {
                        const today = new Date();
                        const sample = await db.catalog_exercises.limit(2).toArray();
                        const entries = sample.map((ex, i) => ({ exerciseId: ex.id, weight: 50 + i * 5, reps: 8 + i, date: new Date(today.getTime() - i * 86400000).toISOString().slice(0,10) }));
                        if (entries.length) await db.history.bulkAdd(entries);
                    }
                } catch (e) {
                    console.warn('Seeding local Dexie DB failed', e);
                }
            }

            return true;
        } catch (e) {
            console.warn('createLocalMockData error', e);
            return false;
        }
    };

    

    window.handleAuth = async () => {
        if (window.location.protocol === 'file:') {
            // Local mode: create a fake token stored in cookies and localStorage
            const token = 'local-bypass';
            const expires = Date.now() + 365 * 24 * 60 * 60 * 1000;
            try {
                // Set cookies (max-age 1 year) so cookie-based detection works
                document.cookie = 'google_token=' + encodeURIComponent(token) + '; path=/; max-age=' + (365*24*60*60) + ';';
                document.cookie = 'google_token_expires_at=' + encodeURIComponent(expires) + '; path=/; max-age=' + (365*24*60*60) + ';';
            } catch(e){}
            try {
                localStorage.setItem('google_token', token);
                localStorage.setItem('google_token_expires_at', expires);
            } catch(e){}
            try {
                if (typeof window.createLocalMockData === 'function') {
                    await window.createLocalMockData();
                }
            } catch(e) { console.warn('createLocalMockData failed', e); }
            try { callShowApp(); } catch(e){}
            return;
        }
        // Start PKCE flow in a popup so we can receive a refresh token
        const code_verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(96)));
        const code_challenge = await createCodeChallenge(code_verifier);
        // Force the hosted GitHub Pages project redirect path so it matches
        // the registered Authorized Redirect URI in Google Cloud Console.
        const redirect_uri = window.location.origin + '/GymNerd/oauth2callback.html';

        // store verifier in session for later exchange
        sessionStorage.setItem('pkce_code_verifier', code_verifier);

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
            // Use the same redirect URI used when initiating auth
            const redirect_uri = window.location.origin + '/GymNerd/oauth2callback.html';
            const verifier = sessionStorage.getItem('pkce_code_verifier');
            // Clean up stored code immediately
            sessionStorage.removeItem('oauth2_code');
            localStorage.removeItem('oauth2_code');

            // Exchange code for tokens
            const tokenData = await exchangeCodeForTokens(storedCode, verifier, redirect_uri);
            if (tokenData.access_token) {
                localStorage.setItem('google_token', tokenData.access_token);
                localStorage.setItem('google_token_expires_at', Date.now() + (tokenData.expires_in * 1000));
                if (tokenData.refresh_token) localStorage.setItem('google_refresh_token', tokenData.refresh_token);
                try {
                    if (typeof window.fetchGoogleUserProfile === 'function') {
                        await window.fetchGoogleUserProfile();
                    }
                } catch(e) { console.warn('profile fetch after exchange failed', e); }
                localStorage.setItem('needs_initial_download', 'true');
                location.reload();
            } else {
                console.error('Token exchange failed', tokenData);
            }
        } catch (err) {
            console.error('Exchange error', err);
        }
    }

    if (!validSession) {
        renderLogin();
    } else {
        if (window.location.protocol !== 'file:' && token !== 'local-bypass') {
            await loadScript;
        }
        callShowApp();
    }

    function renderLogin() {
        // Hide any loading indicator before showing login UI
        try { if (window.hideLoading) window.hideLoading(); } catch(e){}

        const isLocal = window.location.protocol === 'file:';
        // If an initial download is pending, show the blocking loader instead
        // of the login overlay so the user can't interact with the app.
        try {
            if (localStorage.getItem('needs_initial_download') === 'true') {
                if (window.showLoading) window.showLoading((typeof GN_I18N !== 'undefined') ? GN_I18N.t('welcome_back_syncing') || 'Welcome back! Syncing your data...' : 'Welcome back! Syncing your data...');
                return;
            }
        } catch(e){}
        const blocker = document.createElement('div');
        blocker.id = 'auth-blocker';
        blocker.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0f172a; z-index: 999999; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px; box-sizing: border-box; color: white; font-family: sans-serif;";
        blocker.innerHTML = `
            <div style="max-width: 420px; width: 100%;">
                <h1 style="font-size: 3.5rem; font-weight: 900; margin-bottom: 10px; font-style: italic; background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5));">GymNerd</h1>
                <p style="color: #94a3b8; margin-bottom: 18px; font-size: 1.05rem;">${isLocal ? (typeof GN_I18N !== 'undefined' ? GN_I18N.t('running_local_mode_msg') : 'Running in Local Mode.') : (typeof GN_I18N !== 'undefined' ? GN_I18N.t('sync_workout_msg') : 'Sync your workout data with Google Drive.')}</p>

                <div style="position:absolute; top:20px; right:20px; display:flex; align-items:center; gap:8px;">
                    <label for="gn-lang-select" style="color:#94a3b8; font-weight:600; font-size:0.9rem; margin:0;">${typeof GN_I18N !== 'undefined' ? GN_I18N.t('language') : 'Language'}</label>
                    <select id="gn-lang-select" style="padding:8px 10px; border-radius:10px; background: rgba(255,255,255,0.02); color: white; border:1px solid rgba(255,255,255,0.06); font-weight:700; cursor:pointer;">
                        <option value="en">🇬🇧 English</option>
                        <option value="pt">🇧🇷 Português</option>
                    </select>
                </div>

                <button onclick="handleAuth()" style="width: 100%; padding: 16px; background: #3b82f6; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: bold; font-size: 1.1rem; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);">
                    ${isLocal ? (typeof GN_I18N !== 'undefined' ? GN_I18N.t('enter_app') : 'Enter App') : (typeof GN_I18N !== 'undefined' ? GN_I18N.t('sign_in_with_google') : 'Sign in with Google')}
                </button>
            </div>
        `;

        // Attach language selector handlers and persist selection to localStorage
        const attachLangHandlers = () => {
            try {
                const sel = blocker.querySelector('#gn-lang-select');
                const key = 'gn_lang';
                const detectBrowser = () => {
                    try {
                        const nl = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
                        return nl.startsWith('pt') ? 'pt' : 'en';
                    } catch(e) { return 'en'; }
                };

                const initial = localStorage.getItem(key) || getCookie(key) || detectBrowser();
                if (sel) sel.value = initial;
                try { localStorage.setItem(key, initial); } catch(e){}

                if (sel) sel.addEventListener('change', (ev) => {
                    try { localStorage.setItem(key, ev.target.value); location.reload(); } catch(e){}
                });
            } catch(e) { console.warn('lang selector init failed', e); }
        };

        // Ensure we append to body even if script runs in head, and call handlers
        if (document.body) {
            document.body.appendChild(blocker);
            attachLangHandlers();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(blocker);
                attachLangHandlers();
            });
        }
    }
})();
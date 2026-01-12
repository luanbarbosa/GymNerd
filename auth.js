(async function() {
    let CLIENT_ID = "__GOOGLE_CLIENT_ID__";
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';
    const REDIRECT_PATH = '/oauth2callback.html';

    window.logout = () => {
        localStorage.removeItem('google_token');
        localStorage.removeItem('google_token_expires_at');
        location.reload();
    };

    window.showLoading = (message = "Syncing with Google Drive...") => {
        let loader = document.getElementById('global-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.8); z-index: 1000000; display: flex; align-items: center; justify-content: center; flex-direction: column; color: white; font-family: sans-serif; backdrop-filter: blur(4px);";
            loader.innerHTML = `
                <div style="width: 40px; height: 40px; border: 4px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px;"></div>
                <div id="loader-message" style="font-weight: 600; font-size: 0.9rem;">${message}</div>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            `;
            document.body.appendChild(loader);
        } else {
            document.getElementById('loader-message').innerText = message;
            loader.style.display = 'flex';
        }
    };

    window.hideLoading = () => {
        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'none';
    };

    window.clearAllAppData = async () => {
        if (!confirm("DANGER: This will permanently delete all local data and your backup on Google Drive. Continue?")) return;

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

            alert("All data cleared successfully.");
            location.reload();
        } catch (err) {
            console.error("Clear failed:", err);
            alert("Failed to clear some data. Check console.");
        }
    };

    window.renderAuthStatus = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const token = localStorage.getItem('google_token');
        const expiresAt = localStorage.getItem('google_token_expires_at');
        const isLocal = window.location.protocol === 'file:';
        const isExpired = expiresAt && Date.now() > parseInt(expiresAt);

        if (token && !isExpired) {
            const isBypass = token === 'local-bypass';
            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #94a3b8; padding: 12px; background: #1e293b; border-radius: 12px; margin-bottom: 20px; border: 1px solid #334155;">
                    <span style="flex-grow: 1; display: flex; align-items: center; gap: 6px;"><span style="color: ${isBypass ? '#f59e0b' : '#10b981'};">●</span> ${isBypass ? 'Local Mode' : 'Connected to Drive'}</span>
                    <button onclick="clearAllAppData()" style="background: transparent; color: #ef4444; border: 1px solid #ef4444; border-radius: 8px; padding: 6px 10px; cursor: pointer; font-weight: 600; font-size: 0.75rem;">Clear All</button>
                    <button onclick="logout()" style="background: #ef4444; color: white; border: none; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-weight: 600; font-size: 0.8rem; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1">Logout</button>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #94a3b8; padding: 12px; background: #1e293b; border-radius: 12px; margin-bottom: 20px; border: 1px solid #334155;">
                    <span style="flex-grow: 1; display: flex; align-items: center; gap: 6px;"><span style="color: #f59e0b;">●</span> ${isLocal ? 'Local Mode' : 'Not Connected'}</span>
                    <button onclick="clearAllAppData()" style="background: transparent; color: #ef4444; border: 1px solid #ef4444; border-radius: 8px; padding: 6px 10px; cursor: pointer; font-weight: 600; font-size: 0.75rem;">Clear Local</button>
                    <button onclick="handleAuth()" style="background: #3b82f6; color: white; border: none; border-radius: 8px; padding: 6px 12px; cursor: pointer; font-weight: 600; font-size: 0.8rem;">Login</button>
                </div>
            `;
        }
    };

    // Check if already authenticated
    const token = localStorage.getItem('google_token');
    const expiresAt = localStorage.getItem('google_token_expires_at');
    let validSession = false;

    if (token && expiresAt) {
        if (Date.now() < parseInt(expiresAt)) {
            validSession = true;
        } else {
            // expired: try to refresh using refresh token if available
            // cleanup will be done by ensureGoogleAccessToken if refresh fails
            localStorage.removeItem('google_token');
            localStorage.removeItem('google_token_expires_at');
        }
    }

    // Load Google Identity Services script
    const loadScript = new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = resolve;
        document.head.appendChild(script);
    });

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
        const body = new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            code_verifier,
            redirect_uri,
            grant_type: 'authorization_code'
        });

        const resp = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        });
        return resp.json();
    }

    async function refreshAccessToken() {
        const refresh_token = localStorage.getItem('google_refresh_token');
        if (!refresh_token) return false;

        try {
            const body = new URLSearchParams({
                client_id: CLIENT_ID,
                grant_type: 'refresh_token',
                refresh_token
            });

            const resp = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString()
            });

            const data = await resp.json();
            if (data.access_token) {
                localStorage.setItem('google_token', data.access_token);
                localStorage.setItem('google_token_expires_at', Date.now() + (data.expires_in * 1000));
                return true;
            } else {
                console.warn('Refresh failed', data);
                // If refresh fails, remove stored refresh token
                localStorage.removeItem('google_refresh_token');
                return false;
            }
        } catch (e) {
            console.error('Refresh error', e);
            return false;
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

    window.handleAuth = async () => {
        if (window.location.protocol === 'file:') {
            localStorage.setItem('google_token', 'local-bypass');
            localStorage.setItem('google_token_expires_at', Date.now() + 365 * 24 * 60 * 60 * 1000);
            location.reload();
            return;
        }
        // Start PKCE flow in a popup so we can receive a refresh token
        const code_verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(96)));
        const code_challenge = await createCodeChallenge(code_verifier);
        const redirect_uri = window.location.origin + REDIRECT_PATH;

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

        const popup = window.open(authUrl, 'oauth2', 'width=500,height=650');

        // Message listener to receive code from oauth2callback.html
        const handler = async (e) => {
            if (e.origin !== window.location.origin) return;
            const data = e.data || {};
            if (data.type === 'oauth2callback' && data.code) {
                try {
                    const verifier = sessionStorage.getItem('pkce_code_verifier');
                    const tokenData = await exchangeCodeForTokens(data.code, verifier, redirect_uri);
                    if (tokenData.access_token) {
                        localStorage.setItem('google_token', tokenData.access_token);
                        localStorage.setItem('google_token_expires_at', Date.now() + (tokenData.expires_in * 1000));
                        if (tokenData.refresh_token) {
                            localStorage.setItem('google_refresh_token', tokenData.refresh_token);
                        }
                        localStorage.setItem('needs_initial_download', 'true');
                        window.removeEventListener('message', handler);
                        location.reload();
                    } else {
                        console.error('Token exchange failed', tokenData);
                        alert('Authentication failed. See console for details.');
                    }
                } catch (err) {
                    console.error('Exchange error', err);
                    alert('Authentication failed. See console for details.');
                }
            }
        };

        window.addEventListener('message', handler);
    };

    if (!validSession) {
        renderLogin();
    } else if (window.location.protocol !== 'file:' && token !== 'local-bypass') {
        await loadScript;
    }

    function renderLogin() {
        const isLocal = window.location.protocol === 'file:';
        const blocker = document.createElement('div');
        blocker.id = 'auth-blocker';
        blocker.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0f172a; z-index: 999999; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px; box-sizing: border-box; color: white; font-family: sans-serif;";
        blocker.innerHTML = `
            <div style="max-width: 400px; width: 100%;">
                <h1 style="font-size: 3.5rem; font-weight: 900; margin-bottom: 10px; font-style: italic; background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5));">GymNerd</h1>
                <p style="color: #94a3b8; margin-bottom: 30px; font-size: 1.1rem;">${isLocal ? 'Running in Local Mode.' : 'Sync your workout data with Google Drive.'}</p>
                <button onclick="handleAuth()" style="width: 100%; padding: 16px; background: #3b82f6; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: bold; font-size: 1.1rem; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);">
                    ${isLocal ? 'Enter App' : 'Sign in with Google'}
                </button>
            </div>
        `;
        
        // Ensure we append to body even if script runs in head
        if (document.body) {
            document.body.appendChild(blocker);
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                document.body.appendChild(blocker);
            });
        }
    }
})();
/**
 * Utility to handle saving and loading application state to/from Google Drive.
 * Requires a valid Google Access Token stored in localStorage.
 */
const DriveStorage = {
    FOLDER_NAME: 'GymNerd',

    async _getHeaders() {
        // Ensure the token is valid; try refresh if needed.
        if (window.ensureGoogleAccessToken) {
            const ok = await window.ensureGoogleAccessToken();
            if (!ok) throw new Error("No Google token found. Please login.");
        }
        const token = localStorage.getItem('google_token');
        if (!token || token === 'local-bypass') throw new Error("No Google token found. Please login.");
        return {
            'Authorization': `Bearer ${token}`
        };
    },

    // Centralized fetch that retries once after a 401 by attempting
    // to refresh the access token. This avoids immediately clearing
    // credentials when the token has just expired.
    async _authFetch(url, options = {}) {
        const fetchOptions = { ...options };
        const skipLoader = Boolean(fetchOptions._skipLoader);
        const loadingMessageKey = fetchOptions._loadingMessageKey || 'syncing_with_drive';
        const loadingFallback = fetchOptions._loadingFallback || 'Syncing with Google Drive...';
        delete fetchOptions._skipLoader;
        delete fetchOptions._loadingMessageKey;
        delete fetchOptions._loadingFallback;

        try {
            try { if (!skipLoader && window.showLoading) window.showLoading((typeof GN_I18N !== 'undefined') ? GN_I18N.t(loadingMessageKey) : loadingFallback); } catch(e){}

            const headers = await this._getHeaders();
            fetchOptions.headers = { ...(fetchOptions.headers || {}), ...headers };

            let resp = await fetch(url, fetchOptions);

            if (resp.status === 401) {
                // received 401, attempting refresh
                // Try to refresh the token once
                try {
                    if (window.ensureGoogleAccessToken) {
                        const refreshed = await window.ensureGoogleAccessToken();
                        if (refreshed) {
                            // retry with refreshed headers
                            const retryHeaders = await this._getHeaders();
                            fetchOptions.headers = { ...(fetchOptions.headers || {}), ...retryHeaders };
                            resp = await fetch(url, fetchOptions);
                        } else {
                            // explicit expired flow
                            console.warn('[DriveStorage] refresh failed during _authFetch');
                            localStorage.removeItem('google_token');
                            localStorage.removeItem('google_token_expires_at');
                            throw new Error('AUTH_EXPIRED');
                        }
                    } else {
                        localStorage.removeItem('google_token');
                        localStorage.removeItem('google_token_expires_at');
                        throw new Error('AUTH_EXPIRED');
                    }
                } catch (e) {
                    localStorage.removeItem('google_token');
                    localStorage.removeItem('google_token_expires_at');
                    console.error('[DriveStorage] _authFetch refresh error', e);
                    throw new Error('AUTH_EXPIRED');
                }
            }

            return resp;
        } finally {
            try { if (!skipLoader && window.hideLoading) window.hideLoading(); } catch(e){}
        }
    },

    async _handleResponse(response) {
        if (response.status === 401) {
            localStorage.removeItem('google_token');
            throw new Error("AUTH_EXPIRED");
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[DriveStorage] API error response', { status: response.status, errorData });
            
            const message = errorData.error?.message || response.statusText;
            if (message.includes("Insufficient Permission") || message.includes("insufficient authentication scopes")) {
                throw new Error("Insufficient Permission");
            }
            throw new Error(`Drive API error: ${message}`);
        }
        return response.json();
    },

    async getFolderId(createIfMissing = true, options = {}) {
        const { skipLoader = false, silent = false, loadingMessageKey = 'syncing_with_drive', loadingFallback = 'Syncing with Google Drive...' } = options;
        const finalSkipLoader = skipLoader || silent;
        const q = `name='${this.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        const response = await this._authFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, {
            _skipLoader: finalSkipLoader,
            _loadingMessageKey: loadingMessageKey,
            _loadingFallback: loadingFallback
        });
        const data = await this._handleResponse(response);
        
        if (data.files && data.files.length > 0) return data.files[0].id;
        if (!createIfMissing) return null;

        const createResponse = await this._authFetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: this.FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }),
            _skipLoader: finalSkipLoader,
            _loadingMessageKey: loadingMessageKey,
            _loadingFallback: loadingFallback
        });
        const folder = await this._handleResponse(createResponse);
        return folder.id;
    },

    async findFileId(name, folderId, options = {}) {
        const { skipLoader = false, silent = false, loadingMessageKey = 'syncing_with_drive', loadingFallback = 'Syncing with Google Drive...' } = options;
        const finalSkipLoader = skipLoader || silent;
        const q = `name='${name}' and '${folderId}' in parents and trashed=false`;
        const response = await this._authFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, {
            _skipLoader: finalSkipLoader,
            _loadingMessageKey: loadingMessageKey,
            _loadingFallback: loadingFallback
        });
        const data = await this._handleResponse(response);
        return data.files && data.files.length > 0 ? data.files[0].id : null;
    },

    async load() {
        try {
            const folderId = await this.getFolderId(false, { loadingMessageKey: 'receiving_data_from_drive', loadingFallback: 'Receiving data from Google Drive...' });
            if (!folderId) {
                return null;
            }
            const response = await this._authFetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false`, {
                _loadingMessageKey: 'receiving_data_from_drive',
                _loadingFallback: 'Receiving data from Google Drive...'
            });
            const data = await this._handleResponse(response);
            
            if (!data.files || data.files.length === 0) return null;

            const result = {};
            for (const file of data.files) {
                const key = file.name.replace('.json', '');
                // loading file
                const contentResponse = await this._authFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
                    _loadingMessageKey: 'receiving_data_from_drive',
                    _loadingFallback: 'Receiving data from Google Drive...'
                });
                if (contentResponse.ok) {
                    result[key] = await contentResponse.json();
                }
            }
            return Object.keys(result).length > 0 ? result : null;
        } catch (error) {
            if (error.message === "AUTH_EXPIRED") throw error;
            console.error("Error loading from Drive:", error);
            return null;
        }
    },

    async getLastSyncTime() {
        try {
            const folderId = await this.getFolderId(false, { skipLoader: true });
            if (!folderId) return null;
            const fileId = await this.findFileId('lastSync.json', folderId, { skipLoader: true });
            if (!fileId) return null;
            const response = await this._authFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { _skipLoader: true });
            const data = await this._handleResponse(response);
            if (!data) return null;
            if (typeof data === 'string') {
                return { time: data, timezone: 'UTC' };
            }
            const normalized = { ...data };
            if (normalized.time) {
                if (!normalized.timezone) normalized.timezone = 'UTC';
                return normalized;
            }
            return null;
        } catch (error) {
            if (error.message === "AUTH_EXPIRED") throw error;
            console.error('[DriveStorage] failed to read lastSync metadata', error);
            return null;
        }
    },

    async _sha256(str) {
        const buf = new TextEncoder().encode(str);
        const hashBuf = await crypto.subtle.digest('SHA-256', buf);
        const arr = Array.from(new Uint8Array(hashBuf));
        return arr.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async save(data, options = {}) {
        const silent = !!options.silent;
        try {
            const folderId = await this.getFolderId(true, { 
                silent,
                loadingMessageKey: 'sending_data_to_drive', 
                loadingFallback: 'Sending data to Google Drive...' 
            });
            
            let uploadedAny = false;
            const entries = Object.entries(data);
            
            // Process tables first, lastSync last
            const sortedEntries = entries.sort(([a], [b]) => {
                if (a === 'lastSync') return 1;
                if (b === 'lastSync') return -1;
                return 0;
            });

            for (const [key, content] of sortedEntries) {
                const fileName = `${key}.json`;
                const contentStr = JSON.stringify(content);
                
                // Optimization: skip if content hasn't changed since last successful upload
                const contentHash = await this._sha256(contentStr);
                const lastHash = localStorage.getItem(`last_upload_hash_${key}`);
                
                // If it's lastSync, only upload if something else was uploaded in this session
                if (key === 'lastSync' && !uploadedAny && lastHash) {
                    if (silent) console.debug(`[DriveStorage] Skipping ${fileName}, no other changes in this sync.`);
                    continue;
                }

                if (lastHash === contentHash) {
                    if (silent) console.debug(`[DriveStorage] Skipping ${fileName}, no changes.`);
                    continue;
                }

                const fileId = await this.findFileId(fileName, folderId, { 
                    silent,
                    loadingMessageKey: 'sending_data_to_drive', 
                    loadingFallback: 'Sending data to Google Drive...' 
                });
                
                const metadata = { name: fileName };
                
                // Only include parents array when creating a new file (POST)
                if (!fileId) metadata.parents = [folderId];

                const boundary = 'foo_bar_baz';
                const delimiter = "\r\n--" + boundary + "\r\n";
                const close_delim = "\r\n--" + boundary + "--";

                const body = 
                    delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) +
                    delimiter + 'Content-Type: application/json\r\n\r\n' + contentStr +
                    close_delim;

                const url = `https://www.googleapis.com/upload/drive/v3/files${fileId ? '/' + fileId : ''}?uploadType=multipart`;
                
                const method = fileId ? 'PATCH' : 'POST';

                // uploading file
                if (silent) console.debug(`[DriveStorage] Uploading ${fileName}...`);
                const response = await this._authFetch(url, {
                    method,
                    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
                    body,
                    _skipLoader: silent,
                    _loadingMessageKey: 'sending_data_to_drive',
                    _loadingFallback: 'Sending data to Google Drive...'
                });

                await this._handleResponse(response);
                localStorage.setItem(`last_upload_hash_${key}`, contentHash);
                uploadedAny = true;
                if (silent) console.debug(`[DriveStorage] Uploaded ${fileName} successfully.`);
                // uploaded file
            }
        } catch (error) {
            console.error("Error saving to Drive:", error);
            throw error;
        }
    },

    async deleteFile() {
        try {
            if (window.showLoading) window.showLoading((typeof GN_I18N !== 'undefined') ? GN_I18N.t('deleting_backup_drive') : "Deleting backup from Google Drive...");
            const folderId = await this.getFolderId(false);
            if (!folderId) return;

            console.debug('[DriveStorage] deleteFile', { folderId });
            const response = await this._authFetch(
                `https://www.googleapis.com/drive/v3/files/${folderId}`,
                { method: 'DELETE' }
            );
            
            if (response.status === 401) {
                throw new Error("AUTH_EXPIRED");
            }
        } catch (error) {
            console.error("Error deleting from Drive:", error);
            throw error;
        } finally {
            if (window.hideLoading) window.hideLoading();
        }
    },

    async sync(db, tableNames = null, options = {}) {
        const token = localStorage.getItem('google_token');
        if (!token || token === 'local-bypass') {
            if (options.silent) console.info('[DriveStorage] Silent sync skipped: No Google token');
            return false;
        }

        const silent = !!options.silent;
        try {
            if (silent) {
                console.info('[DriveStorage] Silent sync start');
            } else {
                console.info('[DriveStorage] sync start');
                if (window.showLoading) window.showLoading((typeof GN_I18N !== 'undefined') ? GN_I18N.t('sending_data_to_drive') : 'Sending data to Google Drive...');
            }

            if (db && typeof db.ensureTokensInitialized === 'function') {
                await db.ensureTokensInitialized();
            }
            
            const data = {};
            // Catalog images and exercises are always synced from URL source and should not have destructive changes
            const tables = tableNames || ['custom_exercises', 'custom_images', 'routines', 'history', 'weights', 'tokens', 'frozen_days', 'token_events'];
            
            if (silent) console.debug('[DriveStorage] Preparing data for silent sync. Tables:', tables);
            for (const table of tables) {
                if (db[table]) {
                    data[table] = await db[table].toArray();
                }
            }
            
            data.lastSync = { time: new Date().toISOString(), timezone: 'UTC' };

            // When silent, we skip the loader in internal calls
            const originalSave = this.save;
            if (silent) {
                // Temporarily wrap _authFetch or pass options to save if save was modified
                // Looking at current save implementation, it uses _authFetch with its own loader options.
                // I need to modify save to accept silent option as well.
                await this.save(data, { silent: true });
            } else {
                await this.save(data);
            }

            localStorage.setItem('last_sync_time', data.lastSync.time);
            if (silent) console.info('[DriveStorage] Silent sync complete');
            return true;
        } catch (error) {
            console.error(silent ? "[DriveStorage] Silent sync failed:" : "Auto-sync failed:", error);
            const { showAlert = true } = options || {};
            if (!silent && showAlert) {
                if (error.message === "AUTH_EXPIRED") {
                    alert((typeof GN_I18N !== 'undefined') ? GN_I18N.t('google_session_expired') : "Your Google session expired. Please login again to keep syncing.");
                } else if (error.message === "Insufficient Permission") {
                    // Handled by background sync alert/icon
                } else {
                    alert((typeof GN_I18N !== 'undefined') ? (GN_I18N.t('auto_sync_failed_prefix') + error.message) : ("Auto-sync failed: " + error.message));
                }
            }
            throw error;
        } finally {
            if (!silent && window.hideLoading) window.hideLoading();
        }
    }
};

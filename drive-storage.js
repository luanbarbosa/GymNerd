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
        console.debug('[DriveStorage] _authFetch start', { url });
        try {
            try { if (window.showLoading) window.showLoading((typeof GN_I18N !== 'undefined') ? GN_I18N.t('syncing_with_drive') : 'Syncing with Google Drive...'); } catch(e){}

            const headers = await this._getHeaders();
            options.headers = { ...(options.headers || {}), ...headers };

            let resp = await fetch(url, options);
            console.debug('[DriveStorage] _authFetch first response', { url, status: resp.status });

            if (resp.status === 401) {
                console.debug('[DriveStorage] _authFetch received 401, attempting refresh');
                // Try to refresh the token once
                try {
                    if (window.ensureGoogleAccessToken) {
                        const refreshed = await window.ensureGoogleAccessToken();
                        if (refreshed) {
                            // retry with new token
                            const token = localStorage.getItem('google_token');
                            options.headers = { ...(options.headers || {}), 'Authorization': `Bearer ${token}` };
                            resp = await fetch(url, options);
                            console.debug('[DriveStorage] _authFetch retry response', { url, status: resp.status });
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
            try { if (window.hideLoading) window.hideLoading(); } catch(e){}
        }
    },

    async _handleResponse(response) {
        console.debug('[DriveStorage] _handleResponse', { status: response.status, url: response.url });
        if (response.status === 401) {
            localStorage.removeItem('google_token');
            throw new Error("AUTH_EXPIRED");
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[DriveStorage] API error response', { status: response.status, errorData });
            throw new Error(`Drive API error: ${errorData.error?.message || response.statusText}`);
        }
        return response.json();
    },

    async getFolderId(createIfMissing = true) {
        const headers = await this._getHeaders();
        const q = `name='${this.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        console.debug('[DriveStorage] getFolderId', { q });
        const response = await this._authFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`);
        const data = await this._handleResponse(response);
        
        if (data.files && data.files.length > 0) return data.files[0].id;
        if (!createIfMissing) return null;

        const createResponse = await this._authFetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: this.FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
        });
        const folder = await this._handleResponse(createResponse);
        return folder.id;
    },

    async findFileId(name, folderId) {
        const headers = await this._getHeaders();
        const q = `name='${name}' and '${folderId}' in parents and trashed=false`;
        console.debug('[DriveStorage] findFileId', { name, folderId });
        const response = await this._authFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`);
        const data = await this._handleResponse(response);
        return data.files && data.files.length > 0 ? data.files[0].id : null;
    },

    async load() {
        try {
            const folderId = await this.getFolderId(false);
            if (!folderId) return null;
            console.debug('[DriveStorage] load listing files for folder', { folderId });
            const response = await this._authFetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false`);
            const data = await this._handleResponse(response);
            
            if (!data.files || data.files.length === 0) return null;

            const result = {};
            for (const file of data.files) {
                const key = file.name.replace('.json', '');
                console.debug('[DriveStorage] loading file', { id: file.id, name: file.name, mappedKey: key });
                const contentResponse = await this._authFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
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

    async save(data) {
        try {
            const folderId = await this.getFolderId();
            console.debug('[DriveStorage] save start', { tables: Object.keys(data), folderId });
            
            for (const [key, content] of Object.entries(data)) {
                const fileName = `${key}.json`;
                const fileId = await this.findFileId(fileName, folderId);
                
                const metadata = { name: fileName };
                
                // Only include parents array when creating a new file (POST)
                if (!fileId) metadata.parents = [folderId];

                const boundary = 'foo_bar_baz';
                const delimiter = "\r\n--" + boundary + "\r\n";
                const close_delim = "\r\n--" + boundary + "--";

                const body = 
                    delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) +
                    delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(content) +
                    close_delim;

                const url = `https://www.googleapis.com/upload/drive/v3/files${fileId ? '/' + fileId : ''}?uploadType=multipart`;
                
                const method = fileId ? 'PATCH' : 'POST';

                console.debug('[DriveStorage] uploading', { fileName, fileId, url, method });
                const response = await this._authFetch(url, {
                    method,
                    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
                    body
                });

                await this._handleResponse(response);
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

    async sync(db, tableNames = null) {
        const token = localStorage.getItem('google_token');
        if (!token || token === 'local-bypass') return false;

        try {
            console.debug('[DriveStorage] sync start');
            if (window.showLoading) window.showLoading((typeof GN_I18N !== 'undefined') ? GN_I18N.t('syncing_with_drive') : 'Syncing with Google Drive...');
            
            const data = {};
            // Catalog images and exercises are always synced from URL source and should not have destructive changes
            const tables = tableNames || ['custom_exercises', 'custom_images', 'routines', 'logs', 'weights'];
            
            for (const table of tables) {
                if (db[table]) {
                    data[table] = await db[table].toArray();
                }
            }
            
            data.lastSync = { time: new Date().toISOString() };

            await this.save(data);
            localStorage.setItem('last_sync_time', data.lastSync.time);
            localStorage.setItem('has_local_changes', 'false');
            console.debug('[DriveStorage] sync complete', { lastSync: data.lastSync.time });
            return true;
        } catch (error) {
            console.error("Auto-sync failed:", error);
            if (error.message === "AUTH_EXPIRED") {
                alert((typeof GN_I18N !== 'undefined') ? GN_I18N.t('google_session_expired') : "Your Google session expired. Please login again to keep syncing.");
            } else {
                alert((typeof GN_I18N !== 'undefined') ? (GN_I18N.t('auto_sync_failed_prefix') + error.message) : ("Auto-sync failed: " + error.message));
            }
            return false;
        } finally {
            if (window.hideLoading) window.hideLoading();
        }
    }
};
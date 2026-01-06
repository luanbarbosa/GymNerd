/**
 * Utility to handle saving and loading application state to/from Google Drive.
 * Requires a valid Google Access Token stored in localStorage.
 */
const DriveStorage = {
    FOLDER_NAME: 'GymNerd',

    async _getHeaders() {
        const token = localStorage.getItem('google_token');
        if (!token || token === 'local-bypass') throw new Error("No Google token found. Please login.");
        return {
            'Authorization': `Bearer ${token}`
        };
    },

    async _handleResponse(response) {
        if (response.status === 401) {
            localStorage.removeItem('google_token');
            throw new Error("AUTH_EXPIRED");
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Drive API error: ${errorData.error?.message || response.statusText}`);
        }
        return response.json();
    },

    async getFolderId(createIfMissing = true) {
        const headers = await this._getHeaders();
        const q = `name='${this.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, { headers });
        const data = await this._handleResponse(response);
        
        if (data.files && data.files.length > 0) return data.files[0].id;
        if (!createIfMissing) return null;

        const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: this.FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
        });
        const folder = await this._handleResponse(createResponse);
        return folder.id;
    },

    async findFileId(name, folderId) {
        const headers = await this._getHeaders();
        const q = `name='${name}' and '${folderId}' in parents and trashed=false`;
        const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, { headers });
        const data = await this._handleResponse(response);
        return data.files && data.files.length > 0 ? data.files[0].id : null;
    },

    async load() {
        try {
            const folderId = await this.getFolderId(false);
            if (!folderId) return null;

            const headers = await this._getHeaders();
            const response = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false`, { headers });
            const data = await this._handleResponse(response);
            
            if (!data.files || data.files.length === 0) return null;

            const result = {};
            for (const file of data.files) {
                const key = file.name.replace('.json', '');
                const contentResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers });
                if (contentResponse.status === 401) {
                    localStorage.removeItem('google_token');
                    throw new Error("AUTH_EXPIRED");
                }
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
            const headers = await this._getHeaders();
            
            for (const [key, content] of Object.entries(data)) {
                const fileName = `${key}.json`;
                const fileId = await this.findFileId(fileName, folderId);
                
                const metadata = {
                    name: fileName
                };
                
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

                const response = await fetch(url, {
                    method,
                    headers: {
                        ...headers,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    },
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
            if (window.showLoading) window.showLoading("Deleting backup from Google Drive...");
            const folderId = await this.getFolderId(false);
            if (!folderId) return;

            const headers = await this._getHeaders();
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${folderId}`,
                { method: 'DELETE', headers }
            );
            
            if (response.status === 401) {
                localStorage.removeItem('google_token');
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
            if (window.showLoading) window.showLoading();
            
            const data = {};
            // Catalog images and exercises are always synced from URL source and should not have destructive changes
            const tables = tableNames || ['custom_exercises', 'custom_images', 'routines', 'logs'];
            
            for (const table of tables) {
                if (db[table]) {
                    data[table] = await db[table].toArray();
                }
            }
            
            data.lastSync = { time: new Date().toISOString() };

            await this.save(data);
            localStorage.setItem('last_sync_time', data.lastSync.time);
            localStorage.setItem('has_local_changes', 'false');
            return true;
        } catch (error) {
            console.error("Auto-sync failed:", error);
            if (error.message === "AUTH_EXPIRED") {
                alert("Your Google session expired. Please login again to keep syncing.");
            } else {
                alert("Auto-sync failed: " + error.message);
            }
            return false;
        } finally {
            if (window.hideLoading) window.hideLoading();
        }
    }
};
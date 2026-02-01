const defaultImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAQAAAAHUWYVAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAACYktHRAD/h4/MvwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oBARYyKUm+z04AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDEtMDFUMjI6NDg6NTIrMDA6MDD6pHBmAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTAxLTAxVDIyOjQ4OjQ1KzAwOjAwgvT2ygAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wMS0wMVQyMjo1MDo0MSswMDowMPP3bDIAAAOMSURBVHja7dw9axRRFMbxJ2oaN5sEVGwEC5EYrMTCT2BjkULIlxBstA2JIY0vjSh+CStbK7ESgqBgYqJGkqAYCGkVycaMzUT2bQbn5e45s/P/bbHLheycO8/e7J6bzUgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6mNCi1pTS1HXbVczZjXNaq+nnpY+akFN69MV2rS2e6Z+dNsxq2ovsaZNTVmfspAmUuKIFJnVlVbT5jCvksXUqfsMJNK89WkLZy2e4mOd7HtCrPQ7fkNP49EVs7qCO3orP9k17jEQaSwe3R9kKSMDnnj/oyaN17CuY0anAAkIxBkCcYZAnCEQZ04Ee+YR3dSsLmjUeooleN/2uKUNPdcLww/puZzW6wwduc8+JK2Df6VTZtXmMKrlTFsk1Qsk0puAv11KdzvjnlUVA4l0K0QpYXrQt7oqSXqpJf1sG3+XcFTvnfqVtrGGFnRdkrSsa0b1ZvY7fg2d6ZlgNVdIp7Px6K8QpYR5TWbdG/K+QgZYL32IMwTiDIE4UzyQSS1pvetbJHXR+S2VNS1qwrqky/pWQr9hHWTeentv25o2m4WkydQ46hhIpC2NFyml2K+suzo34FPn33ndsTv4evyqeKJGx3hdVki7hp7Fo6tm8/j3Vt7oGq9jICV9S6VYr1lWh+vlc1lZ8yhwVulDnCEQZwjEGV9/9bLe7XWAFeIMgThDIM4QiDME4gyBOEMgzvjqQxz1A1ZYIc4QiDME4kyx95CD+OcbHd/gza/ae1lHV3xoFXmSYitkI75/qLFSplRlTT2KH322KyLrpTKG7U+4/W+Gl+LIejGZOgRifLGaaW0RSEccl8xmERvXPa1qv/aB7GtF88VXh6f/D4nMPoTz/yFIQiDOEIgzYQI5iO8bhZ7Fq1I68iRhAhnmDt5FR55Vvg7+0KzeynXkWeXr4P+Y1VvBjjyrPB18lQJx0JFnlb2Dr0YgJXXkSTxdlfRQxwdazf/WxVVJ64xAnPEUCF8Ckq9AIAJxZ7CBVGuPK+ieVZLBBvIlvr9fgT2uph7Ejz5ZlxLOQupmxEHxA+SUvmc1Z33awmlqs3KBfK3Aai5gKiWS72ZV7abEcdH6lIXW1LxW+uxx/dANs5pmtNNnz+qD5oZ7dQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADo9Be2TLXR4YNOMwAAAABJRU5ErkJggg==";

const db = new Dexie("GymAppDB");
// Expose the Dexie instance on window for pages that check `window.db`
window.db = db;
db.version(11).stores({ 
    catalog_exercises: '++id, name, namePT, type, imageId',
    catalog_images: '++id',
    custom_exercises: '++id, name, namePT, type, imageId', 
    custom_images: '++id',
    routines: '++id, name, exerciseIds',
    history: '++id, exerciseId, weight, reps, date',
    weights: 'date, weight'
});

// Canonical list of available exercise types used across the app
const AVAILABLE_EXERCISE_TYPES = ['abs','arms','back','cardio','chest','legs','shoulder','other'];
// Expose on db and window for easy access
db.availableExerciseTypes = AVAILABLE_EXERCISE_TYPES;
window.AVAILABLE_EXERCISE_TYPES = AVAILABLE_EXERCISE_TYPES;

// Validate a catalog/custom exercise has required fields.
function isExerciseValid(ex, imagesMap = null) {
    if (!ex || typeof ex !== 'object') return false;
    // id must be present (0 allowed)
    if (ex.id === undefined || ex.id === null) return false;
    // name(s)
    if (!ex.name || typeof ex.name !== 'string' || ex.name.trim() === '') return false;
    if (!ex.namePT || typeof ex.namePT !== 'string' || ex.namePT.trim() === '') return false;
    // type must be one of the available types
    if (!ex.type || typeof ex.type !== 'string') return false;
    if (ex.type === 'undefined' || !AVAILABLE_EXERCISE_TYPES.includes(ex.type)) return false;
    // imageId must reference an image if imagesMap provided
    if (ex.imageId === undefined || ex.imageId === null) return false;
    if (imagesMap && !imagesMap.has(ex.imageId)) return false;
    return true;
}

/**
 * Filter and normalize a list of catalog exercises, removing any entries
 * missing required fields (id, name, namePT, type, imageId) or with invalid type.
 * images is optional and when provided is used to validate imageId references.
 */
function sanitizeCatalogExercises(exercises, images) {
    if (!Array.isArray(exercises)) return [];
    const imagesMap = new Map((images || []).map(i => [i && i.id, true]));
    const filtered = exercises.filter(ex => isExerciseValid(ex, imagesMap));
    const dropped = exercises.length - filtered.length;
    if (dropped > 0) console.warn(`[DB] sanitizeCatalogExercises: dropped ${dropped} invalid exercises`);
    return filtered;
}

// Expose helpers on the `db` object so other modules can use them.
db.isExerciseValid = isExerciseValid;
db.sanitizeCatalogExercises = sanitizeCatalogExercises;

// Validate a catalog image has required fields.
function isImageValid(img) {
    if (!img || typeof img !== 'object') return false;
    if (img.id === undefined || img.id === null) return false;
    // must have either embedded data or a URL
    const hasData = typeof img.data === 'string' && img.data.trim() !== '';
    const hasUrl = typeof img.url === 'string' && img.url.trim() !== '';
    return hasData || hasUrl;
}

function sanitizeCatalogImages(images) {
    if (!Array.isArray(images)) return [];
    const filtered = images.filter(isImageValid);
    const dropped = images.length - filtered.length;
    if (dropped > 0) console.warn(`[DB] sanitizeCatalogImages: dropped ${dropped} invalid images`);
    return filtered;
}

db.isImageValid = isImageValid;
db.sanitizeCatalogImages = sanitizeCatalogImages;

// Migration: remove exercises with invalid/undefined types or missing required fields
async function cleanInvalidExerciseTypes() {
    try {
        await ensureDbOpen();
        // catalog_exercises
        if (db.catalog_exercises) {
            const all = await db.catalog_exercises.toArray();
            const invalid = all.filter(e => !isExerciseValid(e));
            if (invalid.length) {
                const ids = invalid.map(i => i.id).filter(id => id !== undefined && id !== null);
                console.info(`[DB Migration] removing ${ids.length} invalid catalog_exercises`);
                try { await db.catalog_exercises.bulkDelete(ids); } catch(e){
                    for (const id of ids) { try { await db.catalog_exercises.delete(id); } catch(_){} }
                }
            }
        }

        // custom_exercises
        if (db.custom_exercises) {
            const all = await db.custom_exercises.toArray();
            const invalid = all.filter(e => !isExerciseValid(e));
            if (invalid.length) {
                const ids = invalid.map(i => i.id).filter(id => id !== undefined && id !== null);
                console.info(`[DB Migration] removing ${ids.length} invalid custom_exercises`);
                try { await db.custom_exercises.bulkDelete(ids); } catch(e){
                    for (const id of ids) { try { await db.custom_exercises.delete(id); } catch(_){} }
                }
            }
        }
    } catch (err) {
        console.error('[DB Migration] cleanInvalidExerciseTypes failed', err);
    }
}

async function ensureDbOpen() {
    if (!db.isOpen()) await db.open();
}

function calculateStreaks(dates) {
    if (!dates || dates.length === 0) return { current: 0, longest: 0, daysSince: 0 };
    
    const sortedDates = [...new Set(dates)].sort();
    const todayStr = new Date().toLocaleDateString('en-CA');
    const today = new Date(todayStr + 'T00:00:00');
    
    let longest = 0;
    let currentCount = 0;
    let prev = null;

    for (const dateStr of sortedDates) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const curr = new Date(y, m - 1, d);
        if (prev) {
            const diff = Math.round((curr - prev) / 86400000);
            if (diff === 1) {
                currentCount++;
            } else {
                longest = Math.max(longest, currentCount);
                currentCount = 1;
            }
        } else {
            currentCount = 1;
        }
        prev = curr;
    }
    longest = Math.max(longest, currentCount);

    let current = 0;
    let checkDate = new Date(today);
    const dateSet = new Set(sortedDates);
    
    if (!dateSet.has(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (dateSet.has(checkDate.toLocaleDateString('en-CA'))) {
        current++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    const lastWorkoutStr = sortedDates[sortedDates.length - 1];
    const lastWorkout = new Date(lastWorkoutStr + 'T00:00:00');
    const daysSince = Math.round((today - lastWorkout) / 86400000);

    return { current, longest, daysSince };
}

/**
 * Initializes the catalog tables with data from external JSON files
 * if the tables are currently empty.
 */
async function initializeCatalog() {
    try {
        await ensureDbOpen();
        const [exCount, imgCount] = await Promise.all([
            db.catalog_exercises.count(),
            db.catalog_images.count()
        ]);
        // Fetch remote catalog and only update local catalog tables when content changed
        const [exResp, imgResp] = await Promise.all([
            fetch('https://raw.githubusercontent.com/luanbarbosa/GymNerd/refs/heads/main/catalog/exercises.json'),
            fetch('https://raw.githubusercontent.com/luanbarbosa/GymNerd/refs/heads/main/catalog/images.json')
        ]);

        if (!exResp.ok || !imgResp.ok) return;

        const exercises = await exResp.json();
        const fetchedImages = await imgResp.json();

        // Normalize image data URIs
        const normalizedImages = fetchedImages.map(img => ({
            ...img,
            data: img.data ? (img.data.startsWith('data:') ? img.data : `data:image/png;base64,${img.data}`) : img.data
        }));

        // Sanitize images before using them and before writing to DB
        const images = sanitizeCatalogImages(normalizedImages);

        // Compute a hash of the fetched catalog (exercises + images) to detect changes.
        // For images that reference remote URLs (img.url), include a signature (ETag / Last-Modified / content hash)
        async function sha256HexFromArrayBuffer(buf) {
            const hashBuf = await crypto.subtle.digest('SHA-256', buf);
            const arr = Array.from(new Uint8Array(hashBuf));
            return arr.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        async function sha256Hex(str) {
            const enc = new TextEncoder().encode(str);
            return sha256HexFromArrayBuffer(enc.buffer);
        }

        async function getImageSignature(img) {
            // Prefer embedded data if present
            if (img.data) return img.data;
            if (!img.url) return JSON.stringify(img);

            try {
                // Try HEAD first to read ETag or Last-Modified without fetching full body
                const headResp = await fetch(img.url, { method: 'HEAD' });
                if (headResp && headResp.ok) {
                    const etag = headResp.headers.get('ETag');
                    const lm = headResp.headers.get('Last-Modified');
                    if (etag) return `url:${img.url}|etag:${etag}`;
                    if (lm) return `url:${img.url}|lm:${lm}`;
                }

                // Fallback to GET and hash the bytes
                const getResp = await fetch(img.url);
                if (!getResp.ok) return `url:${img.url}|status:${getResp.status}`;
                const ab = await getResp.arrayBuffer();
                const h = await sha256HexFromArrayBuffer(ab);
                return `url:${img.url}|hash:${h}`;
            } catch (e) {
                return `url:${img.url}|error:${e.message}`;
            }
        }

        const imageSignatures = await Promise.all(fetchedImages.map(getImageSignature));

        const combined = JSON.stringify({ exercises, images: imageSignatures });
        const newHash = await sha256Hex(combined);
        const storedHash = localStorage.getItem('catalog_hash');

        // If catalog tables exist and the remote content hasn't changed, skip updating
        if (exCount > 0 && imgCount > 0 && storedHash === newHash) return;

        // Sanitize fetched exercises and prepare with negative IDs to avoid clashing with user-created items
        const validExercises = sanitizeCatalogExercises(exercises, images);
        const catalogExercises = validExercises.map(ex => ({ ...ex, id: -ex.id }));

        await db.transaction('rw', db.catalog_exercises, db.catalog_images, async () => {
            // Replace catalog tables when remote changed or tables are empty
            await db.catalog_exercises.clear();
            await db.catalog_images.clear();
            if (catalogExercises.length > 0) await db.catalog_exercises.bulkAdd(catalogExercises);
            if (images.length > 0) await db.catalog_images.bulkAdd(images);
        });

        localStorage.setItem('catalog_hash', newHash);
        localStorage.setItem('catalog_last_update', new Date().toISOString());
        try {
            console.info(`Catalog updated from remote (hash: ${newHash}). ${catalogExercises.length} exercises, ${images.length} images written to DB.`);
        } catch (e) {
            // ignore logging errors in very old browsers
        }
    } catch (err) {
        console.error("Catalog initialization failed:", err);
    }
}

// Run migrations then initialize catalog on load
(async function runStartup() {
    try { await cleanInvalidExerciseTypes(); } catch (e) { console.error('Migration error', e); }
    try { await initializeCatalog(); } catch (e) { console.error('Catalog init error', e); }
})();
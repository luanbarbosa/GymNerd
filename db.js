const defaultImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAQAAAAHUWYVAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAACYktHRAD/h4/MvwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+oBARYyKUm+z04AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDEtMDFUMjI6NDg6NTIrMDA6MDD6pHBmAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTAxLTAxVDIyOjQ4OjQ1KzAwOjAwgvT2ygAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wMS0wMVQyMjo1MDo0MSswMDowMPP3bDIAAAOMSURBVHja7dw9axRRFMbxJ2oaN5sEVGwEC5EYrMTCT2BjkULIlxBstA2JIY0vjSh+CStbK7ESgqBgYqJGkqAYCGkVycaMzUT2bQbn5e45s/P/bbHLheycO8/e7J6bzUgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6mNCi1pTS1HXbVczZjXNaq+nnpY+akFN69MV2rS2e6Z+dNsxq2ovsaZNTVmfspAmUuKIFJnVlVbT5jCvksXUqfsMJNK89WkLZy2e4mOd7HtCrPQ7fkNP49EVs7qCO3orP9k17jEQaSwe3R9kKSMDnnj/oyaN17CuY0anAAkIxBkCcYZAnCEQZ04Ee+YR3dSsLmjUeooleN/2uKUNPdcLww/puZzW6wwduc8+JK2Df6VTZtXmMKrlTFsk1Qsk0puAv11KdzvjnlUVA4l0K0QpYXrQt7oqSXqpJf1sG3+XcFTvnfqVtrGGFnRdkrSsa0b1ZvY7fg2d6ZlgNVdIp7Px6K8QpYR5TWbdG/K+QgZYL32IMwTiDIE4UzyQSS1pvetbJHXR+S2VNS1qwrqky/pWQr9hHWTeentv25o2m4WkydQ46hhIpC2NFyml2K+suzo34FPn33ndsTv4evyqeKJGx3hdVki7hp7Fo6tm8/j3Vt7oGq9jICV9S6VYr1lWh+vlc1lZ8yhwVulDnCEQZwjEGV9/9bLe7XWAFeIMgThDIM4QiDME4gyBOEMgzvjqQxz1A1ZYIc4QiDME4kyx95CD+OcbHd/gza/ae1lHV3xoFXmSYitkI75/qLFSplRlTT2KH322KyLrpTKG7U+4/W+Gl+LIejGZOgRifLGaaW0RSEccl8xmERvXPa1qv/aB7GtF88VXh6f/D4nMPoTz/yFIQiDOEIgzYQI5iO8bhZ7Fq1I68iRhAhnmDt5FR55Vvg7+0KzeynXkWeXr4P+Y1VvBjjyrPB18lQJx0JFnlb2Dr0YgJXXkSTxdlfRQxwdazf/WxVVJ64xAnPEUCF8Ckq9AIAJxZ7CBVGuPK+ieVZLBBvIlvr9fgT2uph7Ejz5ZlxLOQupmxEHxA+SUvmc1Z33awmlqs3KBfK3Aai5gKiWS72ZV7abEcdH6lIXW1LxW+uxx/dANs5pmtNNnz+qD5oZ7dQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADo9Be2TLXR4YNOMwAAAABJRU5ErkJggg==";

const db = new Dexie("GymAppDB");
db.version(11).stores({ 
    catalog_exercises: '++id, name, namePT, type, imageId',
    catalog_images: '++id',
    custom_exercises: '++id, name, namePT, type, imageId', 
    custom_images: '++id',
    routines: '++id, name, exerciseIds',
    logs: '++id, exerciseId, weight, reps, date',
    weights: 'date, weight'
});

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
        
        // Only fetch if one of the tables is empty
        if (exCount > 0 && imgCount > 0) return;

        const [exResp, imgResp] = await Promise.all([
            fetch('https://raw.githubusercontent.com/luanbarbosa/GymNerd/refs/heads/main/catalog/exercises.json'),
            fetch('https://raw.githubusercontent.com/luanbarbosa/GymNerd/refs/heads/main/catalog/images.json')
        ]);
        
        if (!exResp.ok || !imgResp.ok) return;
        
        const exercises = await exResp.json();
        const fetchedImages = await imgResp.json();
        // Ensure image data are valid data URIs. Some sources provide raw base64 without the `data:` prefix.
        const images = fetchedImages.map(img => ({
            ...img,
            data: img.data ? (img.data.startsWith('data:') ? img.data : `data:image/png;base64,${img.data}`) : img.data
        }));
        
        // Negate IDs for catalog exercises to distinguish them from user-created ones
        const catalogExercises = exercises.map(ex => ({
            ...ex,
            id: -ex.id
        }));

        await db.transaction('rw', db.catalog_exercises, db.catalog_images, async () => {
            if (exCount === 0) await db.catalog_exercises.bulkAdd(catalogExercises);
            if (imgCount === 0) await db.catalog_images.bulkAdd(images);
        });
    } catch (err) {
        console.error("Catalog initialization failed:", err);
    }
}

// Run initialization on load
initializeCatalog();
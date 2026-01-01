const db = new Dexie("GymAppDB");
db.version(8).stores({ 
    exercises: '++id, name, namePT, type, imageId', 
    logs: '++id, exerciseId, weight, reps, date', 
    routines: '++id, name, exerciseIds', 
    images: '++id' 
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
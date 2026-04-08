(function (global) {
    'use strict';

    const COIN_MILESTONE_INTERVAL = 3;
    const COIN_EVENT_TYPE_STREAK_MILESTONE = 'streak_milestone';
    const COINS_WALLET_ID = 1;

    function isValidDateKey(dateKey) {
        return typeof dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
    }

    function dateKeyToDayNumber(dateKey) {
        if (!isValidDateKey(dateKey)) return null;
        const [year, month, day] = dateKey.split('-').map(Number);
        return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
    }

    function getSortedUniqueDateKeys(dateKeys) {
        return [...new Set((Array.isArray(dateKeys) ? dateKeys : []).filter(isValidDateKey))].sort();
    }

    function getStreakLengthEndingAt(dateKeys, targetDateKey) {
        if (!isValidDateKey(targetDateKey)) return 0;
        const dayNumbers = new Set(getSortedUniqueDateKeys(dateKeys).map(dateKeyToDayNumber).filter(Number.isFinite));
        let cursor = dateKeyToDayNumber(targetDateKey);
        if (!Number.isFinite(cursor) || !dayNumbers.has(cursor)) return 0;

        let streakLength = 0;
        while (dayNumbers.has(cursor)) {
            streakLength += 1;
            cursor -= 1;
        }
        return streakLength;
    }

    function getMilestoneForStreakLength(streakLength) {
        const normalized = Number.isFinite(Number(streakLength)) ? Math.max(0, Number(streakLength)) : 0;
        return Math.floor(normalized / COIN_MILESTONE_INTERVAL);
    }

    function isMilestoneBoundary(streakLength) {
        const normalized = Number.isFinite(Number(streakLength)) ? Math.max(0, Number(streakLength)) : 0;
        return normalized > 0 && (normalized % COIN_MILESTONE_INTERVAL) === 0;
    }

    function buildMilestoneEventId(dateKey, milestone) {
        return `${COIN_EVENT_TYPE_STREAK_MILESTONE}:${dateKey}:${milestone}`;
    }

    function evaluateCoinMilestone(dateKeys, dateKey) {
        const streakLength = getStreakLengthEndingAt(dateKeys, dateKey);
        const milestone = getMilestoneForStreakLength(streakLength);
        const wouldAward = milestone > 0 && isMilestoneBoundary(streakLength);
        return { streakLength, milestone, wouldAward };
    }

    async function getCoinMilestonePreview(db, dateKey) {
        if (!db || !isValidDateKey(dateKey) || !db.history) {
            return { ok: false, reason: 'invalid', wouldAward: false, awarded: 0, streakLength: 0, milestone: 0 };
        }

        if (typeof global.ensureDbOpen === 'function') {
            await global.ensureDbOpen();
        }

        const effectiveDates = db.getEffectiveWorkoutDates
            ? await db.getEffectiveWorkoutDates()
            : [...new Set((await db.history.toArray()).map(item => item && item.date).filter(isValidDateKey))].sort();

        const effectiveDateSet = new Set(getSortedUniqueDateKeys(effectiveDates));
        if (effectiveDateSet.has(dateKey)) {
            return { ok: true, wouldAward: false, awarded: 0, streakLength: 0, milestone: 0, reason: 'already_effective' };
        }

        const preview = evaluateCoinMilestone([...effectiveDateSet, dateKey], dateKey);
        return {
            ok: true,
            wouldAward: preview.wouldAward,
            awarded: preview.wouldAward ? 1 : 0,
            streakLength: preview.streakLength,
            milestone: preview.milestone
        };
    }

    async function maybeAwardCoinMilestone(db, dateKey) {
        if (!db || !isValidDateKey(dateKey) || !db.history || !db.coins || !db.coin_events) {
            return { ok: false, reason: 'invalid' };
        }

        if (typeof global.ensureDbOpen === 'function') {
            await global.ensureDbOpen();
        }
        if (typeof db.ensureCoinsInitialized === 'function') {
            await db.ensureCoinsInitialized();
        }

        const effectiveDates = db.getEffectiveWorkoutDates
            ? await db.getEffectiveWorkoutDates()
            : [...new Set((await db.history.toArray()).map(item => item && item.date).filter(isValidDateKey))].sort();

        const preview = evaluateCoinMilestone(effectiveDates, dateKey);
        const { streakLength, milestone, wouldAward } = preview;
        if (!wouldAward) {
            return { ok: true, awarded: 0, streakLength, milestone };
        }

        const eventId = buildMilestoneEventId(dateKey, milestone);
        return db.transaction('rw', [db.coins, db.coin_events], async () => {
            const existingEvent = await db.coin_events.get(eventId);
            if (existingEvent) {
                return { ok: true, awarded: 0, streakLength, milestone, reason: 'already_awarded' };
            }

            const now = new Date().toISOString();
            const defaultWallet = (typeof db.createDefaultCoinsRecord === 'function')
                ? db.createDefaultCoinsRecord(now)
                : { id: COINS_WALLET_ID, balance: 0, createdAt: now, updatedAt: now };
            const wallet = (await db.coins.get(COINS_WALLET_ID)) || defaultWallet;
            const balance = Math.max(0, Number(wallet.balance) || 0);
            const nextBalance = balance + 1;

            await db.coins.put({
                ...wallet,
                id: COINS_WALLET_ID,
                balance: nextBalance,
                createdAt: wallet.createdAt || now,
                updatedAt: now
            });

            const eventRecord = (typeof db.createCoinEventRecord === 'function')
                ? db.createCoinEventRecord({
                    id: eventId,
                    type: COIN_EVENT_TYPE_STREAK_MILESTONE,
                    date: dateKey,
                    milestone,
                    coinsDelta: 1
                }, now)
                : {
                    id: eventId,
                    type: COIN_EVENT_TYPE_STREAK_MILESTONE,
                    date: dateKey,
                    milestone,
                    coinsDelta: 1,
                    createdAt: now,
                    updatedAt: now
                };

            await db.coin_events.put(eventRecord);
            return { ok: true, awarded: 1, streakLength, milestone, balance: nextBalance };
        });
    }

    const api = {
        COIN_MILESTONE_INTERVAL,
        COIN_EVENT_TYPE_STREAK_MILESTONE,
        isValidDateKey,
        getSortedUniqueDateKeys,
        getStreakLengthEndingAt,
        getMilestoneForStreakLength,
        isMilestoneBoundary,
        buildMilestoneEventId,
        evaluateCoinMilestone,
        getCoinMilestonePreview,
        maybeAwardCoinMilestone
    };

    global.GNCoinsLogic = api;

    if (global.db) {
        global.db.maybeAwardCoinMilestone = function (dateKey) {
            return maybeAwardCoinMilestone(global.db, dateKey);
        };
    }
})(window);

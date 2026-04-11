(function (global) {
    'use strict';

    const TOKEN_MILESTONE_INTERVAL = 2;
    const TOKEN_EVENT_TYPE_STREAK_MILESTONE = 'streak_milestone';
    const TOKENS_WALLET_ID = 1;

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

    function toDayNumberSet(dateKeys) {
        return new Set(getSortedUniqueDateKeys(dateKeys).map(dateKeyToDayNumber).filter(Number.isFinite));
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
        return Math.floor(normalized / TOKEN_MILESTONE_INTERVAL);
    }

    function isMilestoneBoundary(streakLength) {
        const normalized = Number.isFinite(Number(streakLength)) ? Math.max(0, Number(streakLength)) : 0;
        return normalized > 0 && (normalized % TOKEN_MILESTONE_INTERVAL) === 0;
    }

    function buildMilestoneEventId(dateKey, milestone) {
        return `${TOKEN_EVENT_TYPE_STREAK_MILESTONE}:${dateKey}:${milestone}`;
    }

    function countWorkoutDaysInCurrentProtectedStreak(workoutDateKeys, effectiveDateKeys, targetDateKey) {
        if (!isValidDateKey(targetDateKey)) return 0;

        const workoutDays = toDayNumberSet(workoutDateKeys);
        const effectiveDays = toDayNumberSet(effectiveDateKeys);
        const targetDay = dateKeyToDayNumber(targetDateKey);
        if (!Number.isFinite(targetDay) || !workoutDays.has(targetDay) || !effectiveDays.has(targetDay)) return 0;

        let cursor = targetDay;
        while (effectiveDays.has(cursor - 1)) {
            cursor -= 1;
        }

        let workoutCount = 0;
        for (let day = cursor; day <= targetDay; day += 1) {
            if (workoutDays.has(day)) workoutCount += 1;
        }
        return workoutCount;
    }

    function evaluateTokenMilestone(workoutDateKeys, effectiveDateKeys, dateKey) {
        const streakLength = countWorkoutDaysInCurrentProtectedStreak(workoutDateKeys, effectiveDateKeys, dateKey);
        const milestone = getMilestoneForStreakLength(streakLength);
        const wouldAward = milestone > 0 && isMilestoneBoundary(streakLength);
        return { streakLength, milestone, wouldAward };
    }

    async function reconcileTokenMilestones(db) {
        if (!db || !db.history || !db.tokens || !db.token_events) {
            return { ok: false, reason: 'invalid', awarded: 0 };
        }

        if (typeof global.ensureDbOpen === 'function') {
            await global.ensureDbOpen();
        }
        if (typeof db.ensureTokensInitialized === 'function') {
            await db.ensureTokensInitialized();
        }

        const historyDates = getSortedUniqueDateKeys((await db.history.toArray()).map(item => item && item.date).filter(isValidDateKey));
        if (historyDates.length === 0) {
            return { ok: true, awarded: 0 };
        }

        const effectiveDates = db.getEffectiveWorkoutDates
            ? await db.getEffectiveWorkoutDates()
            : historyDates;

        return db.transaction('rw', [db.tokens, db.token_events], async () => {
            const existingEvents = new Set(
                (await db.token_events.toArray())
                    .map(event => event && event.id)
                    .filter(Boolean)
            );

            const now = new Date().toISOString();
            const defaultWallet = (typeof db.createDefaultTokensRecord === 'function')
                ? db.createDefaultTokensRecord(now)
                : { id: TOKENS_WALLET_ID, balance: 0, createdAt: now, updatedAt: now };
            const wallet = (await db.tokens.get(TOKENS_WALLET_ID)) || defaultWallet;
            let nextBalance = Math.max(0, Number(wallet.balance) || 0);
            let awarded = 0;

            for (const historyDate of historyDates) {
                const preview = evaluateTokenMilestone(historyDates, effectiveDates, historyDate);
                if (!preview.wouldAward) continue;

                const eventId = buildMilestoneEventId(historyDate, preview.milestone);
                if (existingEvents.has(eventId)) continue;

                const eventRecord = (typeof db.createTokenEventRecord === 'function')
                    ? db.createTokenEventRecord({
                        id: eventId,
                        type: TOKEN_EVENT_TYPE_STREAK_MILESTONE,
                        date: historyDate,
                        milestone: preview.milestone,
                        tokensDelta: 1
                    }, now)
                    : {
                        id: eventId,
                        type: TOKEN_EVENT_TYPE_STREAK_MILESTONE,
                        date: historyDate,
                        milestone: preview.milestone,
                        tokensDelta: 1,
                        createdAt: now,
                        updatedAt: now
                    };

                await db.token_events.put(eventRecord);
                existingEvents.add(eventId);
                nextBalance += 1;
                awarded += 1;
            }

            if (awarded > 0) {
                await db.tokens.put({
                    ...wallet,
                    id: TOKENS_WALLET_ID,
                    balance: nextBalance,
                    createdAt: wallet.createdAt || now,
                    updatedAt: now
                });
            }

            return { ok: true, awarded, balance: nextBalance };
        });
    }

    async function getTokenMilestonePreview(db, dateKey) {
        if (!db || !isValidDateKey(dateKey) || !db.history) {
            return { ok: false, reason: 'invalid', wouldAward: false, awarded: 0, streakLength: 0, milestone: 0 };
        }

        if (typeof global.ensureDbOpen === 'function') {
            await global.ensureDbOpen();
        }

        const historyDates = getSortedUniqueDateKeys((await db.history.toArray()).map(item => item && item.date).filter(isValidDateKey));
        const effectiveDates = db.getEffectiveWorkoutDates
            ? await db.getEffectiveWorkoutDates()
            : historyDates;

        const historyDateSet = new Set(historyDates);
        if (historyDateSet.has(dateKey)) {
            return { ok: true, wouldAward: false, awarded: 0, streakLength: 0, milestone: 0, reason: 'already_logged' };
        }

        const effectiveDateSet = new Set(getSortedUniqueDateKeys(effectiveDates));
        const preview = evaluateTokenMilestone(
            [...historyDateSet, dateKey],
            [...effectiveDateSet, dateKey],
            dateKey
        );
        return {
            ok: true,
            wouldAward: preview.wouldAward,
            awarded: preview.wouldAward ? 1 : 0,
            streakLength: preview.streakLength,
            milestone: preview.milestone
        };
    }

    async function maybeAwardTokenMilestone(db, dateKey) {
        if (!db || !isValidDateKey(dateKey) || !db.history || !db.tokens || !db.token_events) {
            return { ok: false, reason: 'invalid' };
        }

        if (typeof global.ensureDbOpen === 'function') {
            await global.ensureDbOpen();
        }
        if (typeof db.ensureTokensInitialized === 'function') {
            await db.ensureTokensInitialized();
        }

        const historyDates = getSortedUniqueDateKeys((await db.history.toArray()).map(item => item && item.date).filter(isValidDateKey));
        const effectiveDates = db.getEffectiveWorkoutDates
            ? await db.getEffectiveWorkoutDates()
            : historyDates;

        const preview = evaluateTokenMilestone(historyDates, effectiveDates, dateKey);
        const { streakLength, milestone, wouldAward } = preview;
        if (!wouldAward) {
            return { ok: true, awarded: 0, streakLength, milestone };
        }

        const eventId = buildMilestoneEventId(dateKey, milestone);
        return db.transaction('rw', [db.tokens, db.token_events], async () => {
            const existingEvent = await db.token_events.get(eventId);
            if (existingEvent) {
                return { ok: true, awarded: 0, streakLength, milestone, reason: 'already_awarded' };
            }

            const now = new Date().toISOString();
            const defaultWallet = (typeof db.createDefaultTokensRecord === 'function')
                ? db.createDefaultTokensRecord(now)
                : { id: TOKENS_WALLET_ID, balance: 0, createdAt: now, updatedAt: now };
            const wallet = (await db.tokens.get(TOKENS_WALLET_ID)) || defaultWallet;
            const balance = Math.max(0, Number(wallet.balance) || 0);
            const nextBalance = balance + 1;

            await db.tokens.put({
                ...wallet,
                id: TOKENS_WALLET_ID,
                balance: nextBalance,
                createdAt: wallet.createdAt || now,
                updatedAt: now
            });

            const eventRecord = (typeof db.createTokenEventRecord === 'function')
                ? db.createTokenEventRecord({
                    id: eventId,
                    type: TOKEN_EVENT_TYPE_STREAK_MILESTONE,
                    date: dateKey,
                    milestone,
                    tokensDelta: 1
                }, now)
                : {
                    id: eventId,
                    type: TOKEN_EVENT_TYPE_STREAK_MILESTONE,
                    date: dateKey,
                    milestone,
                    tokensDelta: 1,
                    createdAt: now,
                    updatedAt: now
                };

            await db.token_events.put(eventRecord);
            return { ok: true, awarded: 1, streakLength, milestone, balance: nextBalance };
        });
    }

    const api = {
        TOKEN_MILESTONE_INTERVAL,
        TOKEN_EVENT_TYPE_STREAK_MILESTONE,
        isValidDateKey,
        getSortedUniqueDateKeys,
        getStreakLengthEndingAt,
        getMilestoneForStreakLength,
        isMilestoneBoundary,
        buildMilestoneEventId,
        evaluateTokenMilestone,
        getTokenMilestonePreview,
        maybeAwardTokenMilestone,
        reconcileTokenMilestones
    };

    global.GNTokensLogic = api;

    if (global.db) {
        global.db.maybeAwardTokenMilestone = function (dateKey) {
            return maybeAwardTokenMilestone(global.db, dateKey);
        };
        global.db.reconcileTokenMilestones = function () {
            return reconcileTokenMilestones(global.db);
        };
    }
})(window);

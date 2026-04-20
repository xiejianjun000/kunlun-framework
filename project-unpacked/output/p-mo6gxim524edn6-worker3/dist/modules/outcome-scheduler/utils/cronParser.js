"use strict";
/**
 * Simple cron parser for basic cron expressions
 * Supports: * * * * * (minute hour day month weekday)
 * Only basic scheduling, does not handle complex cases
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cronParser = cronParser;
/**
 * Parse basic cron expression and return next run time
 */
function cronParser(expression) {
    const parts = expression.trim().split(/\s+/);
    if (parts.length < 5) {
        throw new Error(`Invalid cron expression: ${expression}, expected 5 parts`);
    }
    const [minutePart, hourPart, dayPart, monthPart, weekdayPart] = parts;
    return {
        next: () => {
            const now = new Date();
            const nextDate = new Date(now.getTime() + 60000); // Start checking from next minute
            // Try up to 1 year from now to find next match
            for (let i = 0; i < 365 * 24 * 60; i++) {
                if (matchCron(nextDate, minutePart, hourPart, dayPart, monthPart, weekdayPart)) {
                    // Set to start of the minute
                    nextDate.setSeconds(0);
                    nextDate.setMilliseconds(0);
                    return nextDate;
                }
                nextDate.setTime(nextDate.getTime() + 60000);
            }
            return null;
        }
    };
}
/**
 * Check if date matches cron
 */
function matchCron(date, minutePart, hourPart, dayPart, monthPart, weekdayPart) {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1; // months are 1-based in cron
    const weekday = date.getDay(); // 0 is Sunday
    if (!matchField(minutePart, minute))
        return false;
    if (!matchField(hourPart, hour))
        return false;
    if (!matchField(dayPart, day))
        return false;
    if (!matchField(monthPart, month))
        return false;
    if (!matchField(weekdayPart, weekday))
        return false;
    return true;
}
/**
 * Match a single field
 */
function matchField(pattern, value) {
    if (pattern === '*')
        return true;
    // Handle comma separated values
    if (pattern.includes(',')) {
        return pattern.split(',').some(p => matchField(p.trim(), value));
    }
    // Handle ranges
    if (pattern.includes('-')) {
        const [start, end] = pattern.split('-').map(Number);
        return value >= start && value <= end;
    }
    // Handle */step
    if (pattern.startsWith('*/')) {
        const step = parseInt(pattern.slice(2), 10);
        return value % step === 0;
    }
    // Exact match
    const exact = parseInt(pattern, 10);
    return !isNaN(exact) && value === exact;
}

/**
 * Simple cron parser for basic cron expressions
 * Supports: * * * * * (minute hour day month weekday)
 * Only basic scheduling, does not handle complex cases
 */
export interface CronSchedule {
    next(): Date | null;
}
/**
 * Parse basic cron expression and return next run time
 */
export declare function cronParser(expression: string): CronSchedule;

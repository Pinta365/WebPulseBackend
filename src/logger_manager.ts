import { ConsoleLogger } from "./loggers/console_logger.ts";
import { denokvLogger } from "./loggers/denokv_logger.ts";
import { mongodbLogger } from "./loggers/mongodb_logger.ts";

export interface LoggerData {
    type: string;
    payload: {
        [key: string]: string | number;
    };
}
// Logger interface to implement for building custom loggers.
export interface Logger {
    log(data: LoggerData): Promise<void> | void;
}

// A map to hold registered loggers
const loggers: Record<string, Logger> = {
    console: new ConsoleLogger(),
    denokv: new denokvLogger(),
    mongodb: new mongodbLogger(),
};

/**
 * Register a new logger.
 *
 * @param name - The name of the logger.
 * @param logger - The logger instance.
 */
export function registerLogger(name: string, logger: Logger): void {
    loggers[name] = logger;
}

/**
 * Logs the provided analytic data using the specified logger.
 *
 * @param data - The analytic data to be logged.
 * @param mode - The logger name. Defaults to console.
 */
export async function logData(
    data: LoggerData,
    mode = "console",
): Promise<void> {
    const logger = loggers[mode];
    if (logger) {
        await logger.log(data);
    } else {
        console.warn(`Logger named "${mode}" not found. Data not logged.`);
    }
}

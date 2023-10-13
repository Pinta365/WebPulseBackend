export enum LogLevel {
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4,
}

export const logLevel = Deno.env.get("DEBUG_LEVEL") ? Number(Deno.env.get("DEBUG_LEVEL")) : LogLevel.ERROR;

export function logError(...args: unknown[]) {
    if (LogLevel.ERROR <= logLevel) {
        console.error("ERROR:", ...args);
    }
}

export function logWarn(...args: unknown[]) {
    if (LogLevel.WARN <= logLevel) {
        console.warn("WARNING:", ...args);
    }
}

export function logInfo(...args: unknown[]) {
    if (LogLevel.INFO <= logLevel) {
        console.info("INFO:", ...args);
    }
}

export function logDebug(...args: unknown[]) {
    if (LogLevel.DEBUG <= logLevel) {
        console.log("DEBUG:", ...args);
    }
}

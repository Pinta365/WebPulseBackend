import { Logger, LoggerData } from "./logger.ts";

export class ConsoleLogger implements Logger {
    log(data: LoggerData): void {
        console.log("Received Data:", JSON.stringify(data, null, 2));
    }
}

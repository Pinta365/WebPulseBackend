import { decodeTime, ulid } from "@std/ulid";
import { UserAgent } from "@std/http";
//import { IP2Location } from "../deps.ts";
import { LocationData } from "./types.ts";

// Helper to extract IP from standard Fetch API Request headers
export function getIpFromRequest(req: Request): string | undefined {
    return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        undefined;
}

export async function getCountryFromIP(req: Request): Promise<LocationData | null> {
    const ip = getIpFromRequest(req);
    const abortSeconds = 5;

    if (ip) {
        const controller = new AbortController();
        const signal = controller.signal;

        setTimeout(() => controller.abort(), abortSeconds * 1000);

        try {
            const response = await fetch(`http://ip-api.com/json/${ip.trim()}`, { signal });

            if (response.ok) {
                const data = await response.json();

                if (data?.status === "success") {
                    const result: LocationData = {
                        countryShort: data.countryCode,
                        countryLong: data.country,
                    };
                    return result;
                }
            }

            return null;
        } catch (error: any) {
            if (error.name === "AbortError") {
                console.error(`Request was aborted after ${abortSeconds} seconds`);
            } else {
                console.error(error);
            }
            return null;
        }
    } else {
        return null;
    }
}

/*
let ip2location: IP2Location | null = null;

export function getLocationDatabase(): IP2Location {
    if (!ip2location) {
        ip2location = new IP2Location();
        ip2location.open("./bin/IP2LOCATION-LITE-DB1.IPV6.BIN");
        console.log(`Location DB loaded. version: ${ip2location.getDatabaseVersion()}`);
    }
    return ip2location;
}

export function getCountryFromIP(req: Request): LocationData | null {
    const ip = req.ip;
    if (ip) {
        try {
            const db = getLocationDatabase();
            const countryShort = db.getCountryShort(ip);
            const countryLong = db.getCountryLong(ip);

            if (countryLong === "-" || countryLong === "INVALID_IP_ADDRESS") {
                // unresolvable or invalid
                return null;
            }

            const result: LocationData = {
                debug: ip,
                countryShort,
                countryLong,
            };
            return result;
        } catch (error) {
            console.error(error);
            return null;
        }
    } else {
        return null;
    }
}
*/
export function genULID(seedTime: number = Date.now()): string {
    return ulid(seedTime);
}

export function extractTimeFromULID(id: string): number {
    return decodeTime(id);
}

export function getUserAgent(req: Request): UserAgent {
    const userAgent = new UserAgent(req.headers.get("user-agent") ?? "");
    return userAgent;
}

export function getOrigin(req: Request) {
    const origin = req.headers.get("Origin") || "";
    return origin;
}

export function minifyJS(input: string): string {
    // Remove single line comments
    let output = input.replace(/\/\/[^\n]*\n/g, "");

    // Remove multi-line comments
    output = output.replace(/\/\*[\s\S]*?\*\//g, "");

    // Remove whitespaces around punctuation (e.g., =, +, -, etc.)
    output = output.replace(/\s*([=+\-*/\{\};,])\s*/g, "$1");

    // Remove newline and whitespace
    output = output.replace(/\s+/g, " ");

    return output.trim();
}

export function minifyHTML(input: string): string {
    // Remove HTML comments
    let output = input.replace(/<!--[\s\S]*?-->/g, "");

    // Remove whitespaces between tags
    output = output.replace(/\s+</g, "<");
    output = output.replace(/>[\s\r\n]+</g, "><");

    // Remove unnecessary spaces within tags
    output = output.replace(/\s+/g, " ");

    return output.trim();
}

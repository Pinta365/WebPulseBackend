import { decodeTime, ulid, UserAgent } from "../deps.ts";

export function genULID(seedTime: number = Date.now()): string {
    return ulid(seedTime);
}

export function extractTimeFromULID(id: string): number {
    return decodeTime(id);
}

export function getUserAgent(req: Request) {
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

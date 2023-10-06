import { config } from "./config.ts";

export function isOriginAllowed(origin: string | null): boolean {
    if (!origin) return false;
    return config.allowedOrigins.includes(origin);
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

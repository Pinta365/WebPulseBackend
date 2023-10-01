import { config } from "../config.ts";

export function root() {
    return new Response(
        "This server is part of the WebTrace self-hosted analytics platform. https://github.com/Pinta365/WebTrace",
        {
            status: 200,
            headers: config.commonHeaders,
        },
    );
}

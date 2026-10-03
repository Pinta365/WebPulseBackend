/**
 * Tests for the bot classifier in `bot.ts`. The verdict gates every tracked
 * request, so both directions matter: a human mistaken for a bot disappears
 * from the dashboard, and a bot mistaken for a human pollutes it. The first
 * group below is all false-positive guards for real in-app and mobile browsers.
 *
 *   deno test src/bot_test.ts
 */
import { botName, classifyBot } from "./bot.ts";
import type { BotCategory } from "./types.ts";

function assert(cond: boolean, msg: string) {
    if (!cond) throw new Error(msg);
}

/** Fails with the actual value attached when a whole verdict does not match. */
function assertBot(ua: string, category: BotCategory, name: string) {
    const got = classifyBot(ua);
    assert(got.isBot === true, `expected a bot, got human for: ${ua}`);
    assert(got.category === category, `expected category ${category}, got ${got.category} for: ${ua}`);
    assert(got.name === name, `expected name "${name}", got "${got.name}" for: ${ua}`);
    assert(
        JSON.stringify(got.reasons) === JSON.stringify(["ua"]),
        `expected reasons ["ua"], got ${JSON.stringify(got.reasons)} for: ${ua}`,
    );
}

/** The exact shape of a human verdict: nothing set beyond `isBot` and `reasons`. */
function assertHuman(ua: string) {
    const got = classifyBot(ua);
    assert(got.isBot === false, `expected a human, got a bot for: ${ua}`);
    assert(got.name === undefined, `a human must have no name, got "${got.name}" for: ${ua}`);
    assert(got.category === undefined, `a human must have no category, got "${got.category}" for: ${ua}`);
    assert(got.reasons.length === 0, `a human must have no reasons, got ${JSON.stringify(got.reasons)} for: ${ua}`);
}

// ---------------------------------------------------------------------------
// Real-world browsers. Each of these has tripped a naive "bot" matcher before.
// ---------------------------------------------------------------------------
const CHROME =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const FIREFOX = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";
const SAFARI_IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
const SAMSUNG =
    "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36";
const EDGE =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.2210.91";
const FACEBOOK_INAPP =
    "Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 [FBAN/FB4A;FBAV/440.0.0.30.119;]";
const PINTEREST_INAPP =
    "Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.127 Mobile Safari/537.36 [Pinterest/Android]";
const SOGOU_MOBILE =
    "Mozilla/5.0 (Linux; U; Android 9; zh-cn; MI 8 Build/PKQ1.180729.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.80 Mobile Safari/537.36 SogouMobileBrowser/6.2.0";
const CUBOT =
    "Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

Deno.test("real browsers and in-app webviews are never bots", () => {
    for (
        const ua of [
            CHROME,
            FIREFOX,
            SAFARI_IPHONE,
            SAMSUNG,
            EDGE,
            FACEBOOK_INAPP,
            PINTEREST_INAPP,
            SOGOU_MOBILE,
            CUBOT,
        ]
    ) {
        assertHuman(ua);
    }
});

// ---------------------------------------------------------------------------
// Empty user agents. Real browsers always send one, so an absent UA is a bot.
// ---------------------------------------------------------------------------
const EMPTY = "";
const WHITESPACE = " \t\n ";

Deno.test("empty and whitespace-only user agents are unknown bots", () => {
    for (const ua of [EMPTY, WHITESPACE, " ", "   ", "\t", "\n"]) {
        assertBot(ua, "unknown", "Empty user agent");
    }
});

// ---------------------------------------------------------------------------
// Search engines.
// ---------------------------------------------------------------------------
const GOOGLEBOT_DESKTOP = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const GOOGLEBOT_SMARTPHONE =
    "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.96 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const BINGBOT = "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";
const BAIDUSPIDER = "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)";
const YANDEXBOT = "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)";
const APPLEBOT = "Mozilla/5.0 (compatible; Applebot/0.1; +http://www.apple.com/go/applebot)";
const SOGOU_SPIDER = "Sogou web spider/4.0";

Deno.test("search engine crawlers are filed as search", () => {
    assertBot(GOOGLEBOT_DESKTOP, "search", "Googlebot");
    assertBot(GOOGLEBOT_SMARTPHONE, "search", "Googlebot");
    assertBot(BINGBOT, "search", "bingbot");
    assertBot(BAIDUSPIDER, "search", "Baiduspider");
    assertBot(YANDEXBOT, "search", "YandexBot");
    assertBot(APPLEBOT, "search", "Applebot");
    assertBot(SOGOU_SPIDER, "search", "Sogou spider");
});

// ---------------------------------------------------------------------------
// AI crawlers. Applebot-Extended must not be filed under Applebot/search.
// ---------------------------------------------------------------------------
const GPTBOT = "Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)";
const CLAUDEBOT = "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)";
const PERPLEXITYBOT = "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)";
const META_EXTERNALAGENT = "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)";
const APPLEBOT_EXTENDED = "Mozilla/5.0 (compatible; Applebot-Extended/0.1; +http://www.apple.com/go/applebot)";

Deno.test("AI crawlers are filed as ai, never search", () => {
    assertBot(GPTBOT, "ai", "GPTBot");
    assertBot(CLAUDEBOT, "ai", "ClaudeBot");
    assertBot(PERPLEXITYBOT, "ai", "PerplexityBot");
    assertBot(META_EXTERNALAGENT, "ai", "meta-externalagent");
    // Applebot-Extended shares its prefix with the Applebot search crawler.
    assertBot(APPLEBOT_EXTENDED, "ai", "Applebot-Extended");
});

// ---------------------------------------------------------------------------
// Social preview and messaging bots.
// ---------------------------------------------------------------------------
const FACEBOOK_EXTERNALHIT = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
const TWITTERBOT = "Mozilla/5.0 (compatible; Twitterbot/1.0)";
const LINKEDINBOT = "Mozilla/5.0 (compatible; LinkedInBot/1.0; +http://www.linkedin.com)";

Deno.test("social crawlers are filed as social", () => {
    assertBot(FACEBOOK_EXTERNALHIT, "social", "facebookexternalhit");
    assertBot(TWITTERBOT, "social", "Twitterbot");
    assertBot(LINKEDINBOT, "social", "LinkedInBot");
});

// ---------------------------------------------------------------------------
// SEO audit tools.
// ---------------------------------------------------------------------------
const AHREFSBOT = "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)";
const SEMRUSHBOT = "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)";

Deno.test("SEO auditors are filed as seo", () => {
    assertBot(AHREFSBOT, "seo", "AhrefsBot");
    assertBot(SEMRUSHBOT, "seo", "SemrushBot");
});

// ---------------------------------------------------------------------------
// Monitoring and synthetic testing.
// ---------------------------------------------------------------------------
const UPTIMEROBOT = "Mozilla/5.0 (compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)";
const CHROME_LIGHTHOUSE =
    "Mozilla/5.0 (Linux; Android 7.0; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4590.2 Mobile Safari/537.36 Chrome-Lighthouse";

Deno.test("uptime and Lighthouse probes are filed as monitoring", () => {
    assertBot(UPTIMEROBOT, "monitoring", "UptimeRobot");
    assertBot(CHROME_LIGHTHOUSE, "monitoring", "Lighthouse");
});

// ---------------------------------------------------------------------------
// Headless browsers and HTTP client libraries.
// ---------------------------------------------------------------------------
const HEADLESS_CHROME =
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36";
const PYTHON_REQUESTS = "python-requests/2.31.0";
const CURL = "curl/8.4.0";
const AXIOS = "axios/1.6.2";

Deno.test("automation clients are filed as automation", () => {
    assertBot(HEADLESS_CHROME, "automation", "HeadlessChrome");
    assertBot(PYTHON_REQUESTS, "automation", "python-requests");
    assertBot(CURL, "automation", "curl");
    assertBot(AXIOS, "automation", "axios");
});

// ---------------------------------------------------------------------------
// Anything that declares itself a crawler but matches no known list.
// ---------------------------------------------------------------------------
const FOO_CRAWLER = "FooCrawler/1.0";

Deno.test("an unrecognised crawler is an unknown bot", () => {
    assertBot(FOO_CRAWLER, "unknown", "FooCrawler");
});

// ---------------------------------------------------------------------------
// botName, the display-name extractor used for the dashboard label.
// ---------------------------------------------------------------------------
Deno.test("botName extracts a readable name", () => {
    assert(botName(GOOGLEBOT_DESKTOP) === "Googlebot", "compatible token should be used");
    assert(botName(SOGOU_SPIDER) === "Sogou spider", "the 'web spider' form should be normalised");
    assert(botName(HEADLESS_CHROME) === "HeadlessChrome", "HeadlessChrome should keep its product token");
    assert(botName(PYTHON_REQUESTS) === "python-requests", "client libraries should fall back to their name");
    assert(botName(CURL) === "curl", "curl should be named");
    assert(botName(AXIOS) === "axios", "axios should be named");
    assert(botName(FOO_CRAWLER) === "FooCrawler", "a self-declared crawler token should be used");
});

// ---------------------------------------------------------------------------
// Every non-empty verdict the classifier emits carries the "ua" reason.
// ---------------------------------------------------------------------------
Deno.test("every bot reports the ua reason", () => {
    const bots = [
        EMPTY,
        WHITESPACE,
        GOOGLEBOT_DESKTOP,
        GOOGLEBOT_SMARTPHONE,
        BINGBOT,
        BAIDUSPIDER,
        YANDEXBOT,
        APPLEBOT,
        SOGOU_SPIDER,
        GPTBOT,
        CLAUDEBOT,
        PERPLEXITYBOT,
        META_EXTERNALAGENT,
        APPLEBOT_EXTENDED,
        FACEBOOK_EXTERNALHIT,
        TWITTERBOT,
        LINKEDINBOT,
        AHREFSBOT,
        SEMRUSHBOT,
        UPTIMEROBOT,
        CHROME_LIGHTHOUSE,
        HEADLESS_CHROME,
        PYTHON_REQUESTS,
        CURL,
        AXIOS,
        FOO_CRAWLER,
    ];
    for (const ua of bots) {
        const got = classifyBot(ua);
        assert(got.isBot === true, `expected a bot for: ${ua}`);
        assert(
            JSON.stringify(got.reasons) === JSON.stringify(["ua"]),
            `expected ["ua"], got ${JSON.stringify(got.reasons)} for: ${ua}`,
        );
    }
});

Deno.test("crawlers seen in production data get a category", () => {
    assertBot(
        "meta-webindexer/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
        "ai",
        "meta-webindexer",
    );
    assertBot(
        "Mozilla/5.0 (compatible; YandexRenderResourcesBot/1.0; +http://yandex.com/bots) AppleWebKit/537.36",
        "search",
        "YandexRenderResourcesBot",
    );
    assertBot("Mozilla/5.0 (compatible; YandexUserproxy; robot; +http://yandex.com/bots)", "search", "YandexUserproxy");
    assertBot("YisouSpider", "search", "YisouSpider");
});

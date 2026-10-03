/**
 * Bot classification from the raw request user agent.
 *
 * Runs on every tracked request regardless of `storeUserAgent`, so only the
 * verdict (never the UA itself) needs to be stored. The result is written to
 * the session as `session.bot`, which the dashboard filters on.
 */
import type { BotCategory, BotData } from "./types.ts";

/**
 * Generic markers of automated clients. `(?<!cu)` keeps the Cubot phone brand
 * ("Android 10; CUBOT X30") from matching `bot\b`.
 */
const AUTOMATED =
    /(?<!cu)bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|python-|python\/|curl\/|wget|go-http|java\/|axios|node-fetch|phantomjs|puppeteer|playwright|selenium/i;

/**
 * Known clients by category, checked in order. A match also counts as a bot,
 * which catches the ones that don't call themselves bot/crawler/spider. AI
 * comes before search so that e.g. Applebot-Extended is not filed as Applebot.
 */
const KNOWN: [RegExp, BotCategory][] = [
    [
        /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-User|Claude-SearchBot|Claude-Web|anthropic-ai|PerplexityBot|Perplexity-User|CCBot|Bytespider|meta-externalagent|meta-externalfetcher|meta-webindexer|Amazonbot|Applebot-Extended|cohere-ai|Diffbot|YouBot|Timpibot|ImagesiftBot|DuckAssistBot|MistralAI-User/i,
        "ai",
    ],
    [
        /facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|TelegramBot|WhatsApp\/|Pinterestbot|redditbot|SkypeUriPreview|Embedly|vkShare|Iframely/i,
        "social",
    ],
    [
        /AhrefsBot|AhrefsSiteAudit|SemrushBot|SiteAuditBot|MJ12bot|DotBot|rogerbot|Screaming Frog|serpstatbot|BLEXBot|DataForSeoBot|barkrowler|SeekportBot|SEOkicks|Seznam-?SEO/i,
        "seo",
    ],
    [
        /UptimeRobot|Pingdom|StatusCake|Site24x7|Better ?Uptime|Uptime-Kuma|Datadog|NewRelicPinger|Lighthouse|PageSpeed|GTmetrix|PTST\//i,
        "monitoring",
    ],
    [
        /Googlebot|Google-InspectionTool|GoogleOther|AdsBot-Google|Mediapartners-Google|Storebot-Google|bingbot|BingPreview|Baiduspider|Yandex\w*(?:Bot|Userproxy)|YisouSpider|DuckDuckBot|Sogou.{0,10}spider|Applebot|Slurp|Exabot|SeznamBot|Qwantify|Qwantbot|PetalBot|Yeti|coccocbot|MojeekBot|ia_archiver|archive\.org_bot/i,
        "search",
    ],
    [
        /headless|puppeteer|playwright|selenium|phantomjs|python|curl\/|wget|go-http|java\/|axios|node-fetch|aiohttp|okhttp|httpx|libwww-perl|scrapy/i,
        "automation",
    ],
];

/** Classifies a raw user agent string. An empty UA is treated as a bot; real browsers always send one. */
export function classifyBot(ua: string): BotData {
    if (!ua.trim()) return { isBot: true, name: "Empty user agent", category: "unknown", reasons: ["ua"] };

    const known = KNOWN.find(([re]) => re.test(ua));
    if (!known && !AUTOMATED.test(ua)) return { isBot: false, reasons: [] };

    let name = botName(ua);
    if (name === "Other automated" && known) name = ua.match(known[0])?.[0] ?? name;

    return { isBot: true, name, category: known?.[1] ?? "unknown", reasons: ["ua"] };
}

/** A display name for an automated user agent. */
export function botName(ua: string): string {
    // Well-behaved crawlers name themselves in a "compatible; Name/1.0" token.
    const compatible = ua.match(/compatible;\s*([A-Za-z][\w.-]*)/i)?.[1];
    if (compatible && !/^MSIE$/i.test(compatible)) return compatible;
    // "Sogou web spider/4.0" -> "Sogou spider"
    const webSpider = ua.match(/^(\w+) web spider/i)?.[1];
    if (webSpider) return `${webSpider} spider`;
    // Otherwise a product token that calls itself a bot/crawler/spider.
    const token = ua.match(/[A-Za-z][\w.-]*?(?:bot|crawler|spider)[\w-]*/i)?.[0];
    if (token && !/^cubot/i.test(token)) return token.replace(/[-_.]$/, "");
    if (/headless/i.test(ua)) return ua.match(/Headless\w+/i)?.[0] ?? "Headless browser";
    const lib = ua.match(
        /(python-requests|python-urllib|aiohttp|curl|wget|go-http-client|axios|node-fetch|java|lighthouse|pagespeed|puppeteer|playwright|selenium|phantomjs)/i,
    )?.[0];
    return lib ?? "Other automated";
}

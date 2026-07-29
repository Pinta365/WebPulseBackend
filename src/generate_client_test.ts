/**
 * Verifies the generated tracker reports the resolved clickable ancestor rather
 * than the innermost clicked node, in both captureAllClicks modes.
 *
 * The generated script is parsed and executed against a minimal fake DOM, so
 * this catches both syntax errors from the minifier and the wrong-target bug.
 *
 *   deno task test
 */
import { ObjectId } from "mongodb";
import { generateScript } from "./generate_client.ts";
import { minifyJS } from "./helpers.ts";
import type { Project } from "./types.ts";

function project(captureAllClicks: boolean): Project {
    return {
        _id: new ObjectId("6a69224c7304482a175b7716"),
        ownerId: "owner",
        name: "test",
        options: {
            storeUserAgent: true,
            storeLocation: true,
            storeUTM: false,
            pageLoads: { enabled: true },
            pageClicks: { enabled: true, captureAllClicks },
            pageScrolls: { enabled: false },
        },
    };
}

function assert(cond: boolean, msg: string) {
    if (!cond) throw new Error(msg);
}

// deno-lint-ignore no-explicit-any
type El = any;

/**
 * Minimal DOM good enough to be honest about the two things that broke here:
 *
 *  - `cursor` is an INHERITED css property, so a child of a pointer element
 *    reports pointer too. An earlier fake returned "auto" for everything, which
 *    let a broken implementation pass.
 *  - closest() searches self-then-ancestors, which is what the real fix uses.
 */
function el(
    tagName: string,
    props: { id?: string; href?: string; className?: string; role?: string; cursor?: string } = {},
    parent: El = null,
): El {
    const node: El = {
        tagName,
        nodeType: 1,
        id: props.id ?? "",
        href: props.href,
        classList: { value: props.className ?? "" },
        ownCursor: props.cursor,
        parentElement: parent,
        getAttribute: (name: string) => (name === "role" ? props.role ?? null : null),
    };

    // Closes over `node` rather than using `this`, so it behaves the same however
    // the caller invokes it.
    node.closest = (selector: string): El => {
        const wanted = selector.split(",").map((s) => s.trim().toLowerCase());
        let cur: El = node;
        while (cur) {
            const role = cur.getAttribute("role");
            if (wanted.includes(cur.tagName.toLowerCase())) return cur;
            if (role && wanted.includes(`[role=${role}]`)) return cur;
            cur = cur.parentElement;
        }
        return null;
    };

    return node;
}

/** Walks up for an inherited cursor value, as a browser would. */
function computedCursor(node: El): string {
    let cur: El = node;
    while (cur) {
        if (cur.ownCursor) return cur.ownCursor;
        cur = cur.parentElement;
    }
    return "auto";
}

/** A <span> inside an <a> — the case the traversal exists to handle. */
function fakeDom() {
    // Anchors are cursor:pointer in every browser, and the span inherits it.
    const anchor = el("A", {
        id: "buy-link",
        href: "https://example.com/buy",
        className: "btn primary",
        cursor: "pointer",
    });
    const span = el("SPAN", { className: "label" }, anchor);
    return { anchor, span };
}

/** Runs just the click handler out of the generated script against the fake DOM. */
// deno-lint-ignore no-explicit-any
function runClickHandler(script: string, clicked: any) {
    // Located by brace matching rather than an exact string, so this works on
    // both the raw output and the minified form served by get_client.ts.
    const at = script.indexOf('addEventListener("click"');
    assert(at >= 0, "could not find the click listener in the generated script");

    const open = script.indexOf("{", script.indexOf("=>", at) >= 0 ? at : script.indexOf("function", at));
    assert(open > at, "could not find the start of the click handler body");

    let depth = 0, end = -1;
    for (let i = open; i < script.length; i++) {
        if (script[i] === "{") depth++;
        else if (script[i] === "}") {
            depth--;
            if (depth === 0) {
                end = i;
                break;
            }
        }
    }
    assert(end > 0, "unbalanced braces in the click listener");
    const body = script.slice(open + 1, end);

    // deno-lint-ignore no-explicit-any
    let reported: any = null;
    // pageLoadId is a runtime variable in the generated script now, not a literal,
    // so it has to be supplied like the other closed-over values.
    const fn = new Function(
        "e",
        "reportBack",
        "sessionObj",
        "checkAndRenewSession",
        "projectId",
        "deviceId",
        "pageLoadId",
        "window",
        body,
    );
    fn(
        { target: clicked, clientX: 12, clientY: 34 },
        // deno-lint-ignore no-explicit-any
        (payload: any) => reported = payload,
        { id: "session" },
        // deno-lint-ignore no-explicit-any
        (s: any) => s,
        "project",
        "device",
        "pageload",
        {
            location: { href: "https://example.com/page" },
            getComputedStyle: (node: El) => ({ cursor: computedCursor(node) }),
        },
    );
    return reported;
}

Deno.test("clicking a span inside a link reports the link", () => {
    const script = generateScript(project(false)) as string;
    const { span, anchor } = fakeDom();
    const reported = runClickHandler(script, span);

    assert(!!reported, "the click should have been reported");
    assert(
        reported.targetTag === "A",
        `expected the resolved anchor (A), got ${reported.targetTag} — the traversal result was discarded`,
    );
    assert(reported.targetHref === anchor.href, `expected the link href, got ${reported.targetHref}`);
    assert(reported.targetId === "buy-link", `expected the anchor id, got ${reported.targetId}`);
    assert(reported.x === 12 && reported.y === 34, "click coordinates come from the event, not the target");
});

Deno.test("clicking the link itself still reports the link", () => {
    const script = generateScript(project(false)) as string;
    const { anchor } = fakeDom();
    const reported = runClickHandler(script, anchor);
    assert(reported.targetTag === "A", `expected A, got ${reported.targetTag}`);
    assert(reported.targetHref === anchor.href, "href should be reported");
});

Deno.test("captureAllClicks reports the clicked element as-is", () => {
    // No traversal in this mode: a span is a span.
    const script = generateScript(project(true)) as string;
    const { span } = fakeDom();
    const reported = runClickHandler(script, span);
    assert(reported.targetTag === "SPAN", `expected SPAN, got ${reported.targetTag}`);
    assert(reported.targetClass === "label", `expected the span's class, got ${reported.targetClass}`);
});

Deno.test("a non-clickable click is dropped when captureAllClicks is off", () => {
    const script = generateScript(project(false)) as string;
    const orphan = el("DIV", { id: "not-clickable" });
    const inner = el("SPAN", {}, orphan);
    assert(runClickHandler(script, inner) === null, "a click with no clickable ancestor should report nothing");
});

// The cases below are the ones a real browser got wrong before the inherited
// `cursor` was accounted for. A span inside a link inherits cursor:pointer, so a
// naive walk stops on the span and never reaches the anchor.
Deno.test("inherited cursor:pointer does not stop the walk short of a link", () => {
    const script = generateScript(project(false)) as string;

    const anchor = el("A", { id: "link-deep", href: "https://example.com/x", cursor: "pointer" });
    const span = el("SPAN", {}, anchor);
    const strong = el("STRONG", {}, span); // inherits pointer through two levels

    const reported = runClickHandler(script, strong);
    assert(reported?.targetTag === "A", `expected A through two nested levels, got ${reported?.targetTag}`);
    assert(reported?.targetId === "link-deep", `expected link-deep, got ${reported?.targetId}`);
});

Deno.test("a span inside a role=button element reports the element", () => {
    const script = generateScript(project(false)) as string;
    const div = el("DIV", { id: "role-btn", role: "button", cursor: "pointer" });
    const span = el("SPAN", {}, div);

    const reported = runClickHandler(script, span);
    assert(reported?.targetTag === "DIV", `expected DIV, got ${reported?.targetTag}`);
    assert(reported?.targetId === "role-btn", `expected role-btn, got ${reported?.targetId}`);
});

Deno.test("a span inside a cursor:pointer div reports the outermost pointer element", () => {
    const script = generateScript(project(false)) as string;
    // No semantic tag and no role, so this exercises the styling fallback. The
    // span inherits pointer, so stopping at the first match would report SPAN.
    const div = el("DIV", { id: "pointer-div", className: "fakebtn", cursor: "pointer" });
    const span = el("SPAN", {}, div);

    const reported = runClickHandler(script, span);
    assert(reported?.targetTag === "DIV", `expected DIV, got ${reported?.targetTag}`);
    assert(reported?.targetId === "pointer-div", `expected pointer-div, got ${reported?.targetId}`);
});

Deno.test("summary and label resolve without relying on styling", () => {
    const script = generateScript(project(false)) as string;

    // <summary> carries cursor:pointer by default, so it used to be recorded by
    // luck. <label> does not, so clicks inside one were dropped entirely.
    const summary = el("SUMMARY", { id: "disclosure", cursor: "pointer" });
    const inSummary = el("SPAN", {}, summary);
    const fromSummary = runClickHandler(script, inSummary);
    assert(fromSummary?.targetTag === "SUMMARY", `expected SUMMARY, got ${fromSummary?.targetTag}`);
    assert(fromSummary?.targetId === "disclosure", `expected disclosure, got ${fromSummary?.targetId}`);

    const label = el("LABEL", { id: "accept-terms" }); // no cursor styling at all
    const inLabel = el("SPAN", {}, label);
    const fromLabel = runClickHandler(script, inLabel);
    assert(fromLabel?.targetTag === "LABEL", `expected LABEL, got ${fromLabel?.targetTag}`);
    assert(fromLabel?.targetId === "accept-terms", `expected accept-terms, got ${fromLabel?.targetId}`);
});

Deno.test("a span inside a button reports the button", () => {
    const script = generateScript(project(false)) as string;
    // Buttons are cursor:default, which is why this case worked even before.
    const button = el("BUTTON", { id: "btn-span" });
    const span = el("SPAN", {}, button);

    const reported = runClickHandler(script, span);
    assert(reported?.targetTag === "BUTTON", `expected BUTTON, got ${reported?.targetTag}`);
    assert(reported?.targetId === "btn-span", `expected btn-span, got ${reported?.targetId}`);
});

Deno.test("the generated script parses, raw and minified", () => {
    for (const all of [true, false]) {
        const script = generateScript(project(all)) as string;
        new Function(script); // SyntaxError if the generated code is malformed
        assert(!script.includes("e.target.tagName"), "the click report should not read e.target directly");

        // get_client.ts serves the minified form, and minifyJS is aggressive
        // about whitespace, so the shipped script has to be checked too.
        const min = minifyJS(script);
        new Function(min);
        assert(!min.includes("e.target.tagName"), "minified script should not read e.target either");
    }
});

Deno.test("pageLoadId is generated in the browser, not baked into the script", () => {
    const script = generateScript(project(false)) as string;

    assert(
        /const pageLoadId\s*=\s*genId\(\)/.test(script),
        "pageLoadId should come from genId() at run time",
    );
    // A baked-in id looked like pageLoadId: "6a6a1dc76d4b950a122b7f8e".
    assert(
        !/pageLoadId\s*:\s*["'][0-9a-f]{24}["']/.test(script),
        "the script must not embed a literal pageLoadId",
    );
    // Every report should pass the variable through as shorthand.
    const shorthand = script.match(/pageLoadId,/g)?.length ?? 0;
    assert(shorthand >= 3, `expected several reports to use the shorthand, found ${shorthand}`);
});

Deno.test("the script is identical across requests, so caching it is safe", () => {
    // This is the property that was broken: the response carries no
    // Cache-Control, and the old script embedded a per-request pageLoadId, so a
    // cached copy replayed one id for every page view it served. With nothing
    // per-request left in the output, a cached copy is simply correct.
    for (const all of [true, false]) {
        const a = generateScript(project(all)) as string;
        const b = generateScript(project(all)) as string;
        assert(a === b, `two requests produced different scripts (captureAllClicks=${all})`);
    }
});

Deno.test("the clickable selector survives minification", () => {
    // minifyJS strips whitespace around commas without regard for string
    // literals, so it rewrites the selector itself. "a,button,..." is still a
    // valid selector list, but every part must still be there afterwards.
    const min = minifyJS(generateScript(project(false)) as string);
    const match = min.match(/closest\("([^"]+)"\)/);
    assert(!!match, "could not find the closest() selector in the minified script");

    const parts = match![1].split(",").map((s) => s.trim());
    for (const expected of ["a", "button", "input", "textarea", "select", "summary", "label", "[role=button]"]) {
        assert(parts.includes(expected), `selector lost "${expected}" during minification: ${match![1]}`);
    }
});

Deno.test("the minified script the client actually receives still resolves the ancestor", () => {
    const script = minifyJS(generateScript(project(false)) as string);
    const { span, anchor } = fakeDom();
    const reported = runClickHandler(script, span);
    assert(reported?.targetTag === "A", `expected A from the minified script, got ${reported?.targetTag}`);
    assert(reported?.targetHref === anchor.href, "minified script should report the link href");
});

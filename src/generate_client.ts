/**
 * Generate JavaScript that gets sent to the client.
 */
import type { Project } from "./types.ts";
import { config } from "./config.ts";

/**
 * Builds the tracker script for a project.
 */
export function generateScript(
    project: Project,
): string | false {
    if (!project) {
        return false;
    }
    const projectId = project._id?.toString();

    let utmBlock = "";
    if (project?.options?.storeUTM) {
        utmBlock = `
        function getUTMParams() {
            const params = new URLSearchParams(window.location.search);
            const utms = {};
            const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
            for (const [key, value] of params.entries()) {
                const lowerKey = key.toLowerCase();
                if (utmKeys.includes(lowerKey)) {
                    utms[lowerKey] = value;
                }
            }
            return utms;
        }
        try {
            const utmParams = getUTMParams();
            if (Object.keys(utmParams).length > 0) {
                sessionStorage.setItem('utm_params', JSON.stringify(utmParams));
            }
        } catch (e) {}
        `;
    }

    const startBlock = `
    /* genscript v3 */
        function initTracking(projectId, reportBackURL) {
${utmBlock}       

        function reportBack(data) {
            const url = reportBackURL;
            const payload = JSON.stringify(data);
            navigator.sendBeacon(url + "/track", payload);
        }

        let baseIncrement = Math.floor(Math.random() * 0xFFFFFF);

        function genId() {
            const timestamp = Math.floor(Date.now() / 1000).toString(16);
            const randomValue = Math.floor(Math.random() * 0x10000000000)
                .toString(16)
                .padStart(10, '0');
            baseIncrement = (baseIncrement + 1) % 0xFFFFFF;
            const counterStr = baseIncrement.toString(16).padStart(6, '0');
            return timestamp + randomValue + counterStr;
        }

        function checkAndRenewSession(sessionObj) {
            const currentTime = Date.now();
            if (!sessionObj || (currentTime - sessionObj.lastActivity) > 10 * 60 * 1000) {
                // Create a new session object
                sessionObj = {
                    id: genId(),
                    lastActivity: currentTime
                };
            } else {
                sessionObj.lastActivity = currentTime;
            }
            sessionStorage.setItem("sessionObj", JSON.stringify(sessionObj));
            return sessionObj;
        }

        const deviceId = localStorage.getItem("uniqueDeviceId") || genId();
        localStorage.setItem("uniqueDeviceId", deviceId);
        const pageLoadId = genId();

        let sessionObj = checkAndRenewSession(JSON.parse(sessionStorage.getItem("sessionObj")));
    `;
    const endBlock = "} initTracking('" + projectId + "', '" +
        config.trackerURL + "');";
    let optionalBlock = "";

    optionalBlock += `let prevVisibilityState = document.visibilityState;
        document.addEventListener("visibilitychange", function (e) {            
            if (document.visibilityState === "hidden" && prevVisibilityState !== "hidden") {
                reportBack({
                    type: "pageHide",
                    projectId,
                    deviceId,
                    sessionId: sessionObj.id,
                    pageLoadId,
                    title: document.title,
                    url: window.location.href
                });
              }
              prevVisibilityState = document.visibilityState;
              sessionObj = checkAndRenewSession(sessionObj);
        });
        `;

    if (project?.options?.pageLoads.enabled) {
        if (project?.options?.storeUTM) {
            optionalBlock += `const utmParams = getUTMParams();\n`;
            optionalBlock += `reportBack({
                type: "pageLoad",
                projectId,
                deviceId,
                sessionId: sessionObj.id,
                pageLoadId,
                referrer: document.referrer,
                title: document.title,
                url: window.location.href,
                ...(Object.keys(utmParams).length > 0 ? { utm: utmParams } : {})
            });`;
        } else {
            optionalBlock += `reportBack({
                type: "pageLoad",
                projectId,
                deviceId,
                sessionId: sessionObj.id,
                pageLoadId,
                referrer: document.referrer,
                title: document.title,
                url: window.location.href
            });`;
        }
    } else {
        if (project?.options?.storeUTM) {
            optionalBlock += `const utmParams = getUTMParams();\n`;
            optionalBlock += `reportBack({
                type: "pageInit",
                projectId,
                deviceId,
                sessionId: sessionObj.id,
                pageLoadId,
                referrer: document.referrer,
                ...(Object.keys(utmParams).length > 0 ? { utm: utmParams } : {})
            });`;
        } else {
            optionalBlock += `reportBack({
                type: "pageInit",
                projectId,
                deviceId,
                sessionId: sessionObj.id,
                pageLoadId,
                referrer: document.referrer
            });`;
        }
    }

    if (project?.options?.pageClicks.enabled) {
        optionalBlock += `document.addEventListener("click", function (e) {
            sessionObj = checkAndRenewSession(sessionObj);`;

        if (project?.options?.pageClicks.captureAllClicks === false) {
            optionalBlock += `
                    let target = e.target.closest
                        ? e.target.closest("a, button, input, textarea, select, summary, label, [role=button]")
                        : null;

                    if (!target) {
                        let el = e.target;
                        while (el && el.nodeType === 1 && window.getComputedStyle(el).cursor === "pointer") {
                            target = el;
                            el = el.parentElement;
                        }
                    }

                    if (!target) return;  // Not a clickable element
                `;
        } else {
            optionalBlock += `
                    const target = e.target;
                `;
        }

        optionalBlock += `
            reportBack({
                type: "pageClick",
                projectId,
                pageLoadId,
                deviceId,
                sessionId: sessionObj.id,
                url: window.location.href,
                targetTag: target.tagName,
                targetId: target.id,
                targetHref: target.href,
                targetClass: target.classList.value,
                x: e.clientX,
                y: e.clientY
            });
        });`;
    }

    if (project?.options?.pageScrolls.enabled) {
        optionalBlock += `
        const trackedPercentages = [25, 50, 75, 100];
        const alreadyTracked = [];
    
        function throttle(func, delay) {
            let lastCall = 0;
            return function (...args) {
                const now = new Date().getTime();
                if (now - lastCall < delay) return;
                lastCall = now;
                return func(...args);
            };
        }
    
        document.addEventListener(
            "scroll",
            throttle(function () {
                sessionObj = checkAndRenewSession(sessionObj);
                const pageHeight = document.documentElement.scrollHeight - window.innerHeight;
                const scrollPosition = window.scrollY;
                const scrollPercentage = (scrollPosition / pageHeight) * 100;
    
                for (const percent of trackedPercentages) {
                    if (scrollPercentage >= percent && !alreadyTracked.includes(percent)) {    
                        reportBack({
                            type: "pageScroll",
                            projectId,
                            pageLoadId,
                            deviceId,
                            sessionId: sessionObj.id,
                            url: window.location.href,
                            depth: percent
                        });
                        alreadyTracked.push(percent);
                    }
                }
            }, 200),
            { passive: true },
        );`;
    }

    return startBlock + optionalBlock + endBlock;
}

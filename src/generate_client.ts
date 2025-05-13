/**
 * Generate JavaScript that gets sent to the client.
 */
import type { Project } from "./types.ts";
import { config } from "./config.ts";

export function generateScript(
    project: Project,
    pageLoadId: string,
): string | false {
    if (!project) {
        return false;
    }
    const projectId = project._id?.toString();

    const startBlock = `
    /* genscript v2 */
    function initTracking(projectId, reportBackURL) {
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
                    pageLoadId: "${pageLoadId}",
                    title: document.title,
                    url: window.location.href
                });
              }
              prevVisibilityState = document.visibilityState;
              sessionObj = checkAndRenewSession(sessionObj);
        });
        `;

    if (project?.options?.pageLoads.enabled) {
        optionalBlock += `reportBack({
            type: "pageLoad",
            projectId,
            deviceId,
            sessionId: sessionObj.id,
            pageLoadId: "${pageLoadId}",
            referrer: document.referrer,
            title: document.title,
            url: window.location.href
        });`;
    } else {
        optionalBlock += `reportBack({
            type: "pageInit",
            projectId,
            deviceId,
            sessionId: sessionObj.id,
            pageLoadId: "${pageLoadId}",
            referrer: document.referrer,
        });`;
    }

    if (project?.options?.pageClicks.enabled) {
        optionalBlock += `document.addEventListener("click", function (e) {
            sessionObj = checkAndRenewSession(sessionObj);`;

        if (project?.options?.pageClicks.captureAllClicks === false) {
            optionalBlock += `
                    const classicClickableTags = ["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"];
                    let target = e.target;
                
                    // Traverse up the DOM tree to find a clickable element
                    while (target) {
                        if (classicClickableTags.includes(target.tagName.toUpperCase())) break;
                        if (target.getAttribute("role") === "button") break;
                        
                        const computedStyle = window.getComputedStyle(target);
                        if (computedStyle.cursor === "pointer") break;
                
                        target = target.parentElement;
                    }
                
                    if (!target) return;  // Not a clickable element
                `;
        }

        optionalBlock += `
            reportBack({
                type: "pageClick",
                projectId,
                pageLoadId: "${pageLoadId}",
                deviceId,
                sessionId: sessionObj.id,
                url: window.location.href,
                targetTag: e.target.tagName,
                targetId: e.target.id,
                targetHref: e.target.href,
                targetClass: e.target.classList.value,
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
                            pageLoadId: "${pageLoadId}",
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

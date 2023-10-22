/**
 * Generate JavaScript that gets sent to the client.
 */
import { Project } from "./db.ts";
import { config } from "./config.ts";

export function generateScript(project: Project, pageLoadId: string, origin: string): string | false {
    
    if (!project) {
        return false;
    }

    const startBlock = `
    /* genscript v2 */
    function initTracking(projectId, reportBackURL) {
        function reportBack(data) {
            const url = reportBackURL;
            const payload = JSON.stringify(data);
            navigator.sendBeacon(url + "/track", payload);
        }
        
        function generateUUID() {
            if (self.crypto && typeof self.crypto.randomUUID === "function") {
                return self.crypto.randomUUID();
            }

            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
                return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
            });
        }

        function checkAndRenewSession(sessionObj) {
            const currentTime = Date.now();
            if (!sessionObj || (currentTime - sessionObj.lastActivity) > 10 * 60 * 1000) {
                // Create a new session object
                sessionObj = {
                    uuid: generateUUID(),
                    lastActivity: currentTime
                };
            } else {
                sessionObj.lastActivity = currentTime;
            }
            sessionStorage.setItem("sessionObj", JSON.stringify(sessionObj));
            return sessionObj;
        }

        const pageLoadDate = Date.now();

        const deviceId = localStorage.getItem("deviceId") || generateUUID();
        localStorage.setItem("deviceId", deviceId);

        let sessionObj = checkAndRenewSession(JSON.parse(sessionStorage.getItem("sessionObj")));
    `;
    const endBlock = "} initTracking('" + project.id + "', '" +
        config.trackerURL + "');";
    let optionalBlock = "";

    if (project?.options?.pageLoads.enabled) {
        optionalBlock += `reportBack({
            type: "pageLoad",
            projectId,
            pageLoadId: "${pageLoadId}",
            deviceId,
            sessionId: sessionObj.uuid,
            referrer: document.referrer,
            title: document.title,
            url: window.location.href,
            timestamp: pageLoadDate,
            firstEventAt: pageLoadDate,
            lastEventAt: pageLoadDate,
        });`;
    }

    if (project?.options?.pageClicks.enabled) {
        optionalBlock += `document.addEventListener("click", function (e) {
            sessionObj = checkAndRenewSession(sessionObj);
            reportBack({
                type: "pageClick",
                projectId,
                pageLoadId: "${pageLoadId}",
                deviceId,
                sessionId: sessionObj.uuid,
                url: window.location.href,
                targetTag: e.target.tagName,
                targetId: e.target.id,
                targetHref: e.target.href,
                targetClass: e.target.classList.value,
                x: e.clientX,
                y: e.clientY,
                timestamp: Date.now(),
            });
        }, { passive: true });`;
    }

    if (project?.options?.pageScrolls.enabled) {
        optionalBlock += `sessionObj = checkAndRenewSession(sessionObj);
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
                            sessionId: sessionObj.uuid,
                            url: window.location.href,
                            depth: percent,
                            timestamp: Date.now(),
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

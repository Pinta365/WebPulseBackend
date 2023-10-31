/**
 * Generate JavaScript that gets sent to the client.
 */
import { Project } from "./db.ts";
import { config } from "./config.ts";

export function generateScript(
    project: Project,
    pageLoadId: string,
): string | false {
    if (!project) {
        return false;
    }
    project.id = project._id?.toString()!;

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
    const endBlock = "} initTracking('" + project.id + "', '" +
        config.trackerURL + "');";
    let optionalBlock = "";
    
    optionalBlock += `reportBack({
        type: "pageInit",
        projectId,
        deviceId,
        sessionId: sessionObj.id,
        pageLoadId: "${pageLoadId}"
    });`;

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
              sessionObj = checkAndRenewSession(sessionObj);
              prevVisibilityState = document.visibilityState;
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
    }


    if (project?.options?.pageClicks.enabled) {
        optionalBlock += `document.addEventListener("click", function (e) {
            sessionObj = checkAndRenewSession(sessionObj);
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
        optionalBlock += `;
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

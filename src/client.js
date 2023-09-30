export function initTracking(realmId, projectId, reportBackURL) {
    // Handle sending the events back to the backend.
    function reportBack(data) {
        const url = reportBackURL;
        const payload = JSON.stringify(data);
        navigator.sendBeacon(`${url}/track`, payload);
    }

    // Pollyfill fallback for crypto.randomUUID()
    function generateUUID() {
        if (self.crypto && typeof self.crypto.randomUUID === "function") {
            return self.crypto.randomUUID();
        }

        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
            return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
        });
    }

    // Get or generate device and session ids
    const deviceId = localStorage.getItem("deviceId") || generateUUID();
    localStorage.setItem("deviceId", deviceId);

    const sessionId = sessionStorage.getItem("sessionId") || generateUUID();
    sessionStorage.setItem("sessionId", sessionId);

    // Report a page load/initialize.
    reportBack({
        type: "pageLoad",
        payload: {
            type: "pageLoad",
            realmId,
            projectId,
            deviceId,
            sessionId,
            referrer: document.referrer,
            title: document.title,
            url: window.location.href,
            timestamp: Date.now(),
        },
    });

    // listen and report on page clicks.
    document.addEventListener("click", function (e) {
        const payload = {
            type: "pageClick",
            realmId,
            projectId,
            deviceId,
            sessionId,
            url: window.location.href,
            targetTag: e.target.tagName,
            targetId: event.target.id,
            targetHref: event.target.href,
            x: e.clientX,
            y: e.clientY,
            timestamp: Date.now(),
        };

        reportBack({ type: "pageClick", payload });
    }, { passive: true });

    // listen and report on page scrolls.
    // Reports the percentage splits once per page load.
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
                    const payload = {
                        type: "pageScroll",
                        realmId,
                        projectId,
                        deviceId,
                        sessionId,
                        url: window.location.href,
                        depth: percent,
                        timestamp: Date.now(),
                    };

                    reportBack({ type: "pageScroll", payload });
                    alreadyTracked.push(percent);
                }
            }
        }, 200),
        { passive: true },
    );
}

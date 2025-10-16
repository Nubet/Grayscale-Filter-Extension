const GRAYSCALE_CLASS = "grayscale-filter-active";

const STYLE_ID = "grayscale-filter-style";

let lastUrl = window.location.href;

let lastApplyTime = 0;

let mutationObserver = null;

let settingsCache = null;

let lastSettingsTime = 0;

function setupLightweightDetection() {
    window.addEventListener("popstate", throttledApplyFilter);
    window.addEventListener("pushstate", throttledApplyFilter);
    window.addEventListener("replacestate", throttledApplyFilter);
    if (history.pushState && !history.pushState.grayscalePatched) {
        const originalPushState = history.pushState;
        history.pushState = function() {
            originalPushState.apply(this, arguments);
            window.dispatchEvent(new Event("pushstate"));
        };
        history.pushState.grayscalePatched = true;
    }
    if (history.replaceState && !history.replaceState.grayscalePatched) {
        const originalReplaceState = history.replaceState;
        history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            window.dispatchEvent(new Event("replacestate"));
        };
        history.replaceState.grayscalePatched = true;
    }
    setTimeout(setupLightMutationObserver, 1e3);
    chrome.storage.onChanged.addListener(changes => {
        if (changes.enabled || changes.intensity || changes.excludeList || changes.advancedTracking) {
            throttledApplyFilter();
        }
    });
    window.addEventListener("focus", checkUrlChange);
}

function setupLightMutationObserver() {
    if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
    }
    mutationObserver = new MutationObserver(mutations => {
        if (!document.hidden && hasSignificantMutations(mutations)) {
            checkUrlChange();
        }
    });
    mutationObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && mutationObserver) {
            mutationObserver.disconnect();
            mutationObserver = null;
        } else if (!document.hidden && !mutationObserver) {
            setupLightMutationObserver();
        }
    });
}

function hasSignificantMutations(mutations) {
    return mutations.some(m => m.addedNodes.length > 10 || (m.target.nodeName === "BODY" || m.target.nodeName === "HTML"));
}

function checkUrlChange() {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        throttledApplyFilter();
    }
}

function throttledApplyFilter() {
    const now = Date.now();
    if (now - lastApplyTime > 500) {
        lastApplyTime = now;
        applyFilterIfNeeded();
    }
}

async function applyFilterIfNeeded() {
    try {
        const settings = await getSettings();
        const currentUrl = window.location.href;
        const shouldApply = settings.enabled && !isUrlExcluded(currentUrl, settings.excludeList);
        const isActive = document.documentElement.classList.contains(GRAYSCALE_CLASS);
        if (shouldApply && !isActive) {
            applyFilter(settings.intensity);
        } else if (!shouldApply && isActive) {
            removeFilter();
        } else if (shouldApply && isActive) {
            updateIntensityIfNeeded(settings.intensity);
        }
    } catch (e) {
        console.error("Grayscale Filter error:", e);
    }
}

function updateIntensityIfNeeded(intensity) {
    const filterValue = intensity / 100;
    const styleElement = document.getElementById(STYLE_ID);
    if (!styleElement) {
        applyFilter(intensity);
        return;
    }
    if (!styleElement.textContent.includes(`grayscale(${filterValue})`)) {
        styleElement.textContent = `\n        html.${GRAYSCALE_CLASS} {\n          filter: grayscale(${filterValue}) !important;\n          -webkit-filter: grayscale(${filterValue}) !important;\n        }`;
    }
}

function applyFilter(intensity) {
    if (!document.documentElement.classList.contains(GRAYSCALE_CLASS)) {
        document.documentElement.classList.add(GRAYSCALE_CLASS);
    }
    const filterValue = intensity / 100;
    let styleElement = document.getElementById(STYLE_ID);
    if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = STYLE_ID;
        document.head.appendChild(styleElement);
    }
    styleElement.textContent = `\n    html.${GRAYSCALE_CLASS} {\n      filter: grayscale(${filterValue}) !important;\n      -webkit-filter: grayscale(${filterValue}) !important;\n    }`;
}

function removeFilter() {
    document.documentElement.classList.remove(GRAYSCALE_CLASS);
    const styleElement = document.getElementById(STYLE_ID);
    if (styleElement) {
        styleElement.remove();
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "refreshFilter") {
        applyFilterIfNeeded().then(() => sendResponse({
            success: true
        }));
        return true;
    }
});

async function getSettings() {
    const now = Date.now();
    if (settingsCache && now - lastSettingsTime < 5e3) {
        return settingsCache;
    }
    try {
        const storage = chrome.storage.sync || chrome.storage.local;
        const DEFAULTS = {
            enabled: true,
            intensity: 100,
            excludeList: [],
            advancedTracking: false
        };
        const data = await storage.get(DEFAULTS);
        settingsCache = {
            enabled: data.enabled ?? DEFAULTS.enabled,
            intensity: data.intensity ?? DEFAULTS.intensity,
            excludeList: data.excludeList ?? DEFAULTS.excludeList,
            advancedTracking: data.advancedTracking ?? DEFAULTS.advancedTracking
        };
        lastSettingsTime = now;
        return settingsCache;
    } catch (e) {
        console.error("Error getting settings:", e);
        return {
            enabled: true,
            intensity: 100,
            excludeList: [],
            advancedTracking: false
        };
    }
}

function isUrlExcluded(url, excludeList) {
    if (!url || !excludeList || excludeList.length === 0) {
        return false;
    }
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        for (const pattern of excludeList) {
            if (!pattern.includes("/") && !pattern.includes("*")) {
                if (hostname === pattern.toLowerCase() || hostname.endsWith("." + pattern.toLowerCase())) {
                    return true;
                }
                continue;
            }
            if (matchSimplePattern(pattern, urlObj)) {
                return true;
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function matchSimplePattern(pattern, urlObj) {
    if (!pattern || pattern.trim() === "") {
        return false;
    }
    pattern = pattern.trim();
    const hostname = urlObj.hostname.toLowerCase();
    if (pattern.startsWith("*.")) {
        const domain = pattern.slice(2).toLowerCase();
        return hostname === domain || hostname.endsWith("." + domain);
    }
    if (!pattern.includes("/")) {
        return hostname === pattern.toLowerCase() || hostname.endsWith("." + pattern.toLowerCase());
    }
    if (pattern.includes("*")) {
        const parts = pattern.replace(/\*/g, "").split("://");
        const domainPart = parts.length > 1 ? parts[1].split("/")[0] : parts[0].split("/")[0];
        return hostname.includes(domainPart.toLowerCase());
    }
    return false;
}

(async function init() {
    await applyFilterIfNeeded();
    setupLightweightDetection();
})();
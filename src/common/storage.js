const STORAGE_KEYS = {
    ENABLED: "enabled",
    INTENSITY: "intensity",
    EXCLUDE_LIST: "excludeList",
    ADVANCED_TRACKING: "advancedTracking"
};

const DEFAULTS = {
    enabled: true,
    intensity: 100,
    excludeList: [],
    advancedTracking: false
};

function getStorageArea() {
    return chrome.storage.sync || chrome.storage.local;
}

export async function getSettings() {
    const storage = getStorageArea();
    const data = await storage.get(DEFAULTS);
    return {
        enabled: data.enabled ?? DEFAULTS.enabled,
        intensity: data.intensity ?? DEFAULTS.intensity,
        excludeList: data.excludeList ?? DEFAULTS.excludeList,
        advancedTracking: data.advancedTracking ?? DEFAULTS.advancedTracking
    };
}

export async function getSetting(key) {
    const storage = getStorageArea();
    const result = await storage.get({
        [key]: DEFAULTS[key]
    });
    return result[key];
}

export async function saveSettings(settings) {
    const storage = getStorageArea();
    await storage.set(settings);
}

export function isUrlExcluded(url, excludeList) {
    if (!url || !excludeList || excludeList.length === 0) {
        return false;
    }
    try {
        const urlObj = new URL(url);
        return excludeList.some(pattern => matchPattern(pattern, urlObj));
    } catch (e) {
        console.warn("Invalid URL:", url, e);
        return false;
    }
}

function matchPattern(pattern, urlObj) {
    if (!pattern || pattern.trim() === "") {
        return false;
    }
    pattern = pattern.trim();
    if (!pattern.includes("/") && !pattern.includes("*")) {
        return urlObj.hostname === pattern || urlObj.hostname.endsWith("." + pattern);
    }
    if (pattern.startsWith("*.")) {
        const domain = pattern.slice(2);
        return urlObj.hostname === domain || urlObj.hostname.endsWith("." + domain);
    }
    if (!pattern.includes("/")) {
        return urlObj.hostname === pattern || urlObj.hostname.endsWith("." + pattern);
    }
    const regexPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    const regex = new RegExp("^" + regexPattern + "$");
    return regex.test(urlObj.href) || regex.test(urlObj.hostname);
}

export function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch (e) {
        return null;
    }
}

export async function exportSettings() {
    const settings = await getSettings();
    return JSON.stringify(settings, null, 2);
}

export async function importSettings(jsonString) {
    try {
        const settings = JSON.parse(jsonString);
        if (typeof settings !== "object" || settings === null) {
            throw new Error("Invalid settings format");
        }
        const validSettings = {
            enabled: settings.enabled ?? DEFAULTS.enabled,
            intensity: Math.max(0, Math.min(100, settings.intensity ?? DEFAULTS.intensity)),
            excludeList: Array.isArray(settings.excludeList) ? settings.excludeList : DEFAULTS.excludeList,
            advancedTracking: settings.advancedTracking ?? DEFAULTS.advancedTracking
        };
        await saveSettings(validSettings);
        return validSettings;
    } catch (e) {
        throw new Error("Failed to import settings: " + e.message);
    }
}

export async function initializeDefaults() {
    const storage = getStorageArea();
    const existing = await storage.get(Object.keys(DEFAULTS));
    const toSet = {};
    for (const [key, value] of Object.entries(DEFAULTS)) {
        if (existing[key] === undefined) {
            toSet[key] = value;
        }
    }
    if (Object.keys(toSet).length > 0) {
        await storage.set(toSet);
    }
}
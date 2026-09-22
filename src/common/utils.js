export const STORAGE_DEFAULTS = {
    enabled: true,
    intensity: 100,
    excludeList: [],
    advancedSpaTracking: true,
};

export function getStorage() {
    return browser.storage.sync || browser.storage.local;
}

export async function getSettings() {
    const storage = getStorage();
    const result = await storage.get(STORAGE_DEFAULTS);
    return {
        enabled: typeof result.enabled === 'boolean' ? result.enabled : STORAGE_DEFAULTS.enabled,
        intensity: normalizeIntensity(result.intensity),
        excludeList: normalizeExcludeList(result.excludeList),
        advancedSpaTracking: typeof result.advancedSpaTracking === 'boolean'
            ? result.advancedSpaTracking
            : STORAGE_DEFAULTS.advancedSpaTracking,
    };
}

function normalizeIntensity(value) {
    const intensity = Number(value);
    return Number.isFinite(intensity) ? Math.min(100, Math.max(0, intensity)) : STORAGE_DEFAULTS.intensity;
}

function normalizeExcludeList(value) {
    return Array.isArray(value)
        ? value.filter((pattern) => typeof pattern === 'string').map((pattern) => pattern.trim()).filter(Boolean)
        : [];
}

export async function saveSettings(settings) {
    const storage = getStorage();
    await storage.set(settings);
}

export function matchPatternToDomain(pattern, domain) {
    if (!pattern || !domain) return false;
    pattern = pattern.trim();

    if (!pattern.includes('/') && !pattern.includes('*')) {
        return domain === pattern || domain.endsWith('.' + pattern);
    }

    if (pattern.startsWith('*.')) {
        const wildcardDomain = pattern.slice(2);
        return domain === wildcardDomain || domain.endsWith('.' + wildcardDomain);
    }

    return false;
}

export function findMatchingPatternForDomain(domain, excludeList) {
    if (!Array.isArray(excludeList)) return null;
    return excludeList.find((p) => matchPatternToDomain(p, domain)) || null;
}

export function extractDomain(url) {
    try {
        return new URL(url).hostname;
    } catch (e) {
        return null;
    }
}

export function isSupportedPageUrl(url) {
    try {
        const protocol = new URL(url).protocol;
        return protocol === 'http:' || protocol === 'https:' || protocol === 'file:';
    } catch (e) {
        return false;
    }
}

export function isUrlExcluded(url, excludeList) {
    if (!url || !Array.isArray(excludeList) || excludeList.length === 0) {
        return false;
    }

    const domain = extractDomain(url);
    if (!domain) return false;

    return excludeList.some((pattern) => matchPatternToDomain(pattern, domain));
}

export async function refreshActiveTabs() {
    try {
        const tabs = await browser.tabs.query({ active: true });
        for (const tab of tabs) {
            if (tab.id && tab.url && !tab.url.startsWith('about:')) {
                try {
                    await browser.tabs.sendMessage(tab.id, { action: 'refreshFilter' });
                } catch (e) {
                    console.log('Could not refresh active tab:', tab.id, e.message);
                }
            }
        }
    } catch (e) {
        console.warn('refreshActiveTabs failed:', e);
    }
}

export async function saveSettingsAndRefresh(settings) {
    try {
        await saveSettings(settings);
        await refreshActiveTabs();
        return true;
    } catch (e) {
        console.error('Error saving settings:', e);
        return false;
    }
}

export async function toggleSiteExclusion(domain) {
    const settings = await getSettings();
    const match = findMatchingPatternForDomain(domain, settings.excludeList);

    if (match) {
        settings.excludeList = settings.excludeList.filter((p) => p !== match);
    } else {
        if (!settings.excludeList.includes(domain)) {
            settings.excludeList.push(domain);
        }
    }

    const saved = await saveSettingsAndRefresh(settings);
    if (!saved) throw new Error('Could not save site exclusion');
    return !match;
}


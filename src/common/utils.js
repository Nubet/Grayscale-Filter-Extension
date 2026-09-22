export const STORAGE_DEFAULTS = {
    enabled: true,
    intensity: 100,
    excludeList: [],
    advancedSpaTracking: true,
};

const EXCLUDE_PATTERN = /^(\*\.)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;

export function getStorage() {
    return browser.storage.sync || browser.storage.local;
}

export async function getSettings() {
    const storage = getStorage();
    const result = await storage.get(STORAGE_DEFAULTS);
    return normalizeSettings(result);
}

export function normalizeSettings(settings) {
    const source = settings && typeof settings === 'object' ? settings : {};

    return {
        enabled: typeof source.enabled === 'boolean' ? source.enabled : STORAGE_DEFAULTS.enabled,
        intensity: normalizeIntensity(source.intensity),
        excludeList: normalizeExcludeList(source.excludeList),
        advancedSpaTracking: typeof source.advancedSpaTracking === 'boolean'
            ? source.advancedSpaTracking
            : STORAGE_DEFAULTS.advancedSpaTracking,
    };
}

export function validateSettings(settings) {
    return Boolean(
        settings &&
        typeof settings.enabled === 'boolean' &&
        typeof settings.intensity === 'number' &&
        Number.isFinite(settings.intensity) &&
        settings.intensity >= 0 &&
        settings.intensity <= 100 &&
        Array.isArray(settings.excludeList) &&
        settings.excludeList.every(isValidExcludePattern) &&
        (settings.advancedSpaTracking === undefined || typeof settings.advancedSpaTracking === 'boolean')
    );
}

export function isValidExcludePattern(pattern) {
    return typeof pattern === 'string' && EXCLUDE_PATTERN.test(pattern.trim());
}

function normalizeIntensity(value) {
    return typeof value === 'number' && Number.isFinite(value)
        ? Math.min(100, Math.max(0, value))
        : STORAGE_DEFAULTS.intensity;
}

function normalizeExcludeList(value) {
    return Array.isArray(value)
        ? [...new Set(value
            .filter((pattern) => isValidExcludePattern(pattern))
            .map((pattern) => pattern.trim().toLowerCase()))]
        : [];
}

export async function saveSettings(settings) {
    const storage = getStorage();
    await storage.set(normalizeSettings(settings));
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


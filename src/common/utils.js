const STORAGE_DEFAULTS = {
    enabled: true,
    intensity: 100,
    excludeList: [],
    advancedSpaTracking: true,
};

function getStorage() {
    return browser.storage.sync || browser.storage.local;
}

async function getSettings() {
    const storage = getStorage();
    const result = await storage.get(STORAGE_DEFAULTS);
    return {
        enabled: result.enabled,
        intensity: result.intensity,
        excludeList: Array.isArray(result.excludeList) ? result.excludeList : [],
        advancedSpaTracking: result.advancedSpaTracking,
    };
}

async function saveSettings(settings) {
    const storage = getStorage();
    await storage.set(settings);
}

function matchPatternToDomain(pattern, domain) {
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

function findMatchingPatternForDomain(domain, excludeList) {
    if (!Array.isArray(excludeList)) return null;
    return excludeList.find((p) => matchPatternToDomain(p, domain)) || null;
}

function extractDomain(url) {
    try {
        return new URL(url).hostname;
    } catch (e) {
        return null;
    }
}

function isUrlExcluded(url, excludeList) {
    if (!url || !Array.isArray(excludeList) || excludeList.length === 0) {
        return false;
    }

    const domain = extractDomain(url);
    if (!domain) return false;

    return excludeList.some((pattern) => matchPatternToDomain(pattern, domain));
}

async function refreshActiveTabs() {
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

async function saveSettingsAndRefresh(settings) {
    try {
        await saveSettings(settings);
        await refreshActiveTabs();
        return true;
    } catch (e) {
        console.error('Error saving settings:', e);
        return false;
    }
}

async function toggleSiteExclusion(domain) {
    const settings = await getSettings();
    const match = findMatchingPatternForDomain(domain, settings.excludeList);

    if (match) {
        settings.excludeList = settings.excludeList.filter((p) => p !== match);
    } else {
        if (!settings.excludeList.includes(domain)) {
            settings.excludeList.push(domain);
        }
    }

    await saveSettingsAndRefresh(settings);
    return !match;
}

window.STORAGE_DEFAULTS = STORAGE_DEFAULTS;
window.getStorage = getStorage;
window.getSettings = getSettings;
window.saveSettings = saveSettings;
window.matchPatternToDomain = matchPatternToDomain;
window.findMatchingPatternForDomain = findMatchingPatternForDomain;
window.extractDomain = extractDomain;
window.isUrlExcluded = isUrlExcluded;
window.refreshActiveTabs = refreshActiveTabs;
window.saveSettingsAndRefresh = saveSettingsAndRefresh;
window.toggleSiteExclusion = toggleSiteExclusion;

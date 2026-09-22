import {
    STORAGE_DEFAULTS,
    extractDomain,
    saveSettings,
    toggleSiteExclusion,
} from '../common/utils.js';

const CONTEXT_MENU_ID = 'toggle-grayscale-site';

browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        await saveSettings(STORAGE_DEFAULTS);
        console.log('Grayscale Filter installed with defaults');
    }
    await setupContextMenu();
});

async function setupContextMenu() {
    await browser.contextMenus.removeAll();
    browser.contextMenus.create({
        id: CONTEXT_MENU_ID,
        title: 'Toggle grayscale for this site',
        contexts: ['page', 'frame'],
    });
}

browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === CONTEXT_MENU_ID && tab?.url) {
        await handleSiteExclusion(tab.url, tab.id);
    }
});

async function handleSiteExclusion(url, tabId) {
    const domain = extractDomain(url);
    if (!domain) {
        throw new Error('Invalid URL');
    }

    const isNowExcluded = await toggleSiteExclusion(domain);

    if (tabId) {
        try {
            await browser.tabs.sendMessage(tabId, { action: 'refreshFilter' });
        } catch (e) {
            console.log('Could not refresh tab:', tabId, e.message);
        }
    }

    return { isExcluded: isNowExcluded };
}

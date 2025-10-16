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

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handlers = {
        getSettings: () => getSettings(),
        saveSettings: () => saveSettings(message.settings),
        refreshActiveTabs: () => refreshActiveTabs(),
        toggleSiteExclusion: () => handleSiteExclusion(message.url, message.tabId),
    };

    if (handlers[message.action]) {
        handlers[message.action]()
            .then(sendResponse)
            .catch((error) => sendResponse({ error: error.message }));
        return true; // Keep channel open for async response
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

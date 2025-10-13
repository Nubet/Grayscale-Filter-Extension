import { initializeDefaults, getSettings, saveSettings, extractDomain } from "../common/storage.js";

const CONTEXT_MENU_ID = "toggle-grayscale-site";

chrome.runtime.onInstalled.addListener(async details => {
    if (details.reason === "install") {
        await initializeDefaults();
        console.log("Grayscale Filter installed with defaults");
    }
    await setupContextMenu();
});

async function setupContextMenu() {
    await chrome.contextMenus.removeAll();
    const settings = await getSettings();
    chrome.contextMenus.create({
        id: CONTEXT_MENU_ID,
        title: "Toggle grayscale for this site",
        contexts: [ "page", "frame" ]
    });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === CONTEXT_MENU_ID && tab?.url) {
        await toggleSiteExclusion(tab.url, tab.id);
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "toggleSiteExclusion") {
        handleToggleSiteExclusion(message.url, message.tabId).then(sendResponse).catch(error => sendResponse({
            error: error.message
        }));
        return true;
    }
    if (message.action === "getSettings") {
        getSettings().then(sendResponse).catch(error => sendResponse({
            error: error.message
        }));
        return true;
    }
});

async function toggleSiteExclusion(url, tabId) {
    const domain = extractDomain(url);
    if (!domain) {
        throw new Error("Invalid URL");
    }
    const settings = await getSettings();
    const excludeList = settings.excludeList || [];
    const index = excludeList.indexOf(domain);
    let action;
    if (index === -1) {
        excludeList.push(domain);
        action = "excluded";
    } else {
        excludeList.splice(index, 1);
        action = "included";
    }
    await saveSettings({
        excludeList: excludeList
    });
    if (tabId) {
        await chrome.tabs.reload(tabId);
    }
    return {
        action: action,
        domain: domain
    };
}

async function handleToggleSiteExclusion(url, tabId) {
    return await toggleSiteExclusion(url, tabId);
}

if (typeof chrome.storage.onChanged.addEventListener === "function") {
    chrome.storage.onChanged.addEventListener("change", event => {
        const changes = event.changes || {};
        if (changes.excludeList) {
            console.log("Exclude list updated:", changes.excludeList.newValue);
        }
    });
} else {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (changes.excludeList) {
            console.log("Exclude list updated:", changes.excludeList.newValue);
        }
    });
}

console.log("Grayscale Filter background service worker loaded");
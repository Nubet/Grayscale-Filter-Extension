const GRAYSCALE_CLASS = 'grayscale-filter-active';
let domMutationObserver = null;

(function init() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyFilterIfNeeded);
    } else {
        applyFilterIfNeeded();
    }

    browser.storage.onChanged.addListener(() => applyFilterIfNeeded());

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        handleMessage(message, sendResponse);
        return true;
    });
})();

async function handleMessage(message, sendResponse) {
    try {
        if (message.action === 'refreshFilter') {
            await applyFilterIfNeeded();
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: 'Unknown action' });
        }
    } catch (e) {
        console.error('Error processing message:', e);
        sendResponse({ success: false, error: e.message });
    }
}

async function applyFilterIfNeeded() {
    try {
        if (!document?.documentElement) {
            console.warn('Document not ready yet');
            return;
        }

        const data = await getSettings();
        const currentUrl = window.location.href;

        const isExcluded = isUrlExcluded(currentUrl, data.excludeList);
        const shouldApply = data.enabled && !isExcluded;

        if (shouldApply) {
            applyFilter(data.intensity);
            if (data.advancedSpaTracking) {
                setupAdvancedTracking();
            } else {
                disableAdvancedTracking();
            }
        } else {
            removeFilter();
            disableAdvancedTracking();
        }
    } catch (e) {
        console.error('Grayscale Filter error:', e);
    }
}

function applyFilter(intensity) {
    if (!document.documentElement) return;

    document.documentElement.classList.add(GRAYSCALE_CLASS);
    document.documentElement.style.setProperty('--grayscale-intensity', (intensity / 100).toString());
}

function removeFilter() {
    if (!document.documentElement) return;
    document.documentElement.classList.remove(GRAYSCALE_CLASS);
    document.documentElement.style.removeProperty('--grayscale-intensity');
}

function setupAdvancedTracking() {
    if (domMutationObserver) return;

    domMutationObserver = new MutationObserver(() => {
        applyFilterIfNeeded();
    });

    domMutationObserver.observe(document, {
        childList: true,
        subtree: true,
        attributes: false,
    });
}

function disableAdvancedTracking() {
    if (domMutationObserver) {
        domMutationObserver.disconnect();
        domMutationObserver = null;
    }
}

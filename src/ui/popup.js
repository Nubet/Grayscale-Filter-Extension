// Popup UI logic
let currentTab = null;
let currentSettings = null;

// Initialize popup
(async function init() {
    try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        currentTab = tab;

        // Load settings using shared utility
        currentSettings = await getSettings();

        updateUI();
        setupEventListeners();
        updateColorGridPreview(currentSettings.intensity);
    } catch (e) {
        console.error('Popup init error:', e);
        showNotification('Error initializing popup', 'error');
    }
})();

function setupEventListeners() {
    setupEnableToggle();
    setupIntensitySlider();
    setupSiteToggle();
    setupManageButton();
}

function setupEnableToggle() {
    const enableToggle = document.getElementById('enableToggle');
    enableToggle.addEventListener('change', async () => {
        currentSettings.enabled = enableToggle.checked;
        await saveSettingsAndRefresh(currentSettings);
    });
}

function setupIntensitySlider() {
    const slider = document.getElementById('intensitySlider');
    const value = document.getElementById('intensityValue');

    slider.addEventListener('input', () => {
        value.textContent = slider.value;
    });

    slider.addEventListener('change', async () => {
        currentSettings.intensity = parseInt(slider.value, 10);
        updateColorGridPreview(currentSettings.intensity);
        await saveSettingsAndRefresh(currentSettings);
    });
}

function setupSiteToggle() {
    const toggleSiteBtn = document.getElementById('toggleSiteBtn');
    if (!toggleSiteBtn) return;

    toggleSiteBtn.addEventListener('click', async () => {
        await toggleCurrentSiteExclusion();
    });
}

async function toggleCurrentSiteExclusion() {
    if (!currentTab?.url) {
        showNotification('No valid URL found', 'error');
        return;
    }

    const domain = extractDomain(currentTab.url);
    if (!domain) {
        showNotification('Invalid domain', 'error');
        return;
    }

    const toggleSiteBtn = document.getElementById('toggleSiteBtn');
    toggleSiteBtn.disabled = true;

    try {
        const isNowExcluded = await toggleSiteExclusion(domain);
        currentSettings = await getSettings();

        showNotification(
            isNowExcluded ? 'Site added to exclusion list' : 'Site removed from exclusion list',
            'success'
        );

        updateCurrentSiteDisplay();
    } catch (e) {
        console.error('Error toggling site:', e);
        showNotification('Error updating site exclusion', 'error');
    } finally {
        toggleSiteBtn.disabled = false;
    }
}

function setupManageButton() {
    document.getElementById('manageBtn').addEventListener('click', () => {
        browser.runtime.openOptionsPage();
    });
}

function updateUI() {
    document.getElementById('enableToggle').checked = !!currentSettings.enabled;

    const intensitySlider = document.getElementById('intensitySlider');
    const intensityValue = document.getElementById('intensityValue');
    intensitySlider.value = currentSettings.intensity;
    intensityValue.textContent = currentSettings.intensity;

    updateCurrentSiteDisplay();
}

function updateCurrentSiteDisplay() {
    const currentSiteEl = document.getElementById('currentSite');
    const toggleSiteBtn = document.getElementById('toggleSiteBtn');

    const domain = extractDomain(currentTab?.url);

    if (domain) {
        currentSiteEl.textContent = domain;
        const matched = findMatchingPatternForDomain(domain, currentSettings.excludeList);
        toggleSiteBtn.textContent = matched ? 'Include this site' : 'Exclude this site';
        toggleSiteBtn.disabled = false;
    } else {
        currentSiteEl.textContent = currentTab?.url ? 'Invalid URL' : 'No active tab';
        toggleSiteBtn.disabled = true;
    }
}

function updateColorGridPreview(intensity) {
    const colorGrid = document.getElementById('colorGrid');
    if (!colorGrid) return;

    const filterValue = intensity / 100;
    const colorCells = colorGrid.querySelectorAll('.color-cell');

    colorCells.forEach((cell) => {
        cell.classList.toggle('grayscale-preview', intensity > 0);
        if (intensity > 0) {
            cell.style.setProperty('--preview-intensity', filterValue);
        } else {
            cell.style.removeProperty('--preview-intensity');
        }
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

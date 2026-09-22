import {
    extractDomain,
    findMatchingPatternForDomain,
    getSettings,
    isChromeWebStoreUrl,
    isSupportedPageUrl,
    saveSettingsAndRefresh,
    toggleSiteExclusion,
} from '../common/utils.js';
import { localizeDocument, t } from '../common/i18n.js';

let currentTab = null;
let currentSettings = null;

(async function init() {
    try {
        localizeDocument();
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        currentTab = tab;

        currentSettings = await getSettings();

        updateUI();
        setupEventListeners();
        updateColorGridPreview(currentSettings.intensity);
    } catch (e) {
        console.error('Popup init error:', e);
        showNotification(t('errorInitializing'), 'error');
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
        const previousSettings = { ...currentSettings };
        currentSettings.enabled = enableToggle.checked;
        await persistSettings(previousSettings);
    });
}

function setupIntensitySlider() {
    const slider = document.getElementById('intensitySlider');
    const value = document.getElementById('intensityValue');

    slider.addEventListener('input', () => {
        value.textContent = slider.value;
    });

    slider.addEventListener('change', async () => {
        const previousSettings = { ...currentSettings };
        currentSettings.intensity = parseInt(slider.value, 10);
        updateColorGridPreview(currentSettings.intensity);
        await persistSettings(previousSettings);
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
        showNotification(t('invalidUrl'), 'error');
        return;
    }

    const domain = extractDomain(currentTab.url);
    if (!domain) {
        showNotification(t('invalidUrl'), 'error');
        return;
    }

    const toggleSiteBtn = document.getElementById('toggleSiteBtn');
    toggleSiteBtn.disabled = true;

    try {
        const isNowExcluded = await toggleSiteExclusion(domain);
        currentSettings = await getSettings();

        showNotification(
            isNowExcluded ? t('siteAdded') : t('siteRemoved'),
            'success'
        );

        updateCurrentSiteDisplay();
    } catch (e) {
        console.error('Error toggling site:', e);
        showNotification(t('saveError'), 'error');
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

    updateColorGridPreview(currentSettings.intensity);
    updateCurrentSiteDisplay();
}

function updateCurrentSiteDisplay() {
    const currentSiteEl = document.getElementById('currentSite');
    const currentSiteStatus = document.getElementById('currentSiteStatus');
    const toggleSiteBtn = document.getElementById('toggleSiteBtn');

    const domain = extractDomain(currentTab?.url);
    const isChromeWebStore = isChromeWebStoreUrl(currentTab?.url);

    if (domain && isSupportedPageUrl(currentTab?.url) && !isChromeWebStore) {
        currentSiteEl.textContent = domain;
        currentSiteStatus.textContent = '';
        currentSiteStatus.hidden = true;
        const matched = findMatchingPatternForDomain(domain, currentSettings.excludeList);
        toggleSiteBtn.textContent = matched ? t('includeSite') : t('excludeSite');
        toggleSiteBtn.disabled = false;
    } else {
        currentSiteEl.textContent = isChromeWebStore
            ? domain
            : currentTab?.url ? t('invalidUrl') : t('noActiveTab');
        currentSiteStatus.textContent = isChromeWebStore
            ? t('unavailableOnChromeWebStore')
            : t('unavailableOnPage');
        currentSiteStatus.hidden = false;
        toggleSiteBtn.disabled = true;
    }
}

async function persistSettings(previousSettings) {
    setPopupBusy(true);
    showNotification(t('saving'), 'saving');

    try {
        const saved = await saveSettingsAndRefresh(currentSettings);
        if (!saved) throw new Error('Settings were not saved');
        showNotification(t('saved'), 'success');
    } catch (error) {
        currentSettings = previousSettings;
        updateUI();
        showNotification(t('saveError'), 'error');
        console.error('Popup save error:', error);
    } finally {
        setPopupBusy(false);
        updateCurrentSiteDisplay();
    }
}

function setPopupBusy(isBusy) {
    document.body.classList.toggle('is-saving', isBusy);
    document.querySelectorAll('[data-setting-control]').forEach((control) => {
        control.disabled = isBusy;
    });
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
    notification.setAttribute('role', type === 'error' ? 'alert' : 'status');
    notification.textContent = message;

    const existingNotification = document.querySelector('.notification');
    if (existingNotification) existingNotification.remove();

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

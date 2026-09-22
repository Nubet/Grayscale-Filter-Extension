import {
    getSettings,
    isValidExcludePattern,
    normalizeSettings,
    saveSettingsAndRefresh,
    validateSettings,
} from '../common/utils.js';
import { localizeDocument, t } from '../common/i18n.js';

let currentSettings = null;
let excludeFilter = '';
let isSaving = false;

(async function init() {
    try {
        localizeDocument();
        currentSettings = await getSettings();
        applySettingsToUi(currentSettings);
        bindAllListeners();
        renderExcludeList(currentSettings);
        document.getElementById('versionValue').textContent = browser.runtime.getManifest().version;
    } catch (error) {
        console.error('Options init error:', error);
        showFeedback(t('errorInitializing'), 'error');
    }
})();

function bindAllListeners() {
    bindToggleListener({
        elementId: 'enableToggle',
        applyToSettings: (settings, value) => { settings.enabled = value; },
        successMessage: 'settingsSaved',
    });

    bindToggleListener({
        elementId: 'advancedTrackingToggle',
        applyToSettings: (settings, value) => { settings.advancedSpaTracking = value; },
        successMessage: 'settingsSaved',
    });

    bindIntensitySliderListeners();
    bindExcludeFormListener();
    bindImportExportListeners();
    bindSearchListener();
}

function bindToggleListener({ elementId, applyToSettings, successMessage }) {
    const toggle = getElementById(elementId);
    if (!toggle) return;

    toggle.addEventListener('change', async () => {
        const previousSettings = cloneSettings(currentSettings);
        applyToSettings(currentSettings, toggle.checked);
        await persistSettings(previousSettings, successMessage);
    });
}

function bindIntensitySliderListeners() {
    const slider = getElementById('intensitySlider');
    const value = getElementById('intensityValue');
    if (!slider || !value) return;

    slider.addEventListener('input', () => {
        value.textContent = `${slider.value}%`;
    });

    slider.addEventListener('change', async () => {
        const previousSettings = cloneSettings(currentSettings);
        currentSettings.intensity = parseInt(slider.value, 10);
        await persistSettings(previousSettings, 'settingsSaved');
    });
}

function bindExcludeFormListener() {
    const form = getElementById('addExcludeForm');
    const input = getElementById('excludeInput');
    if (!form || !input) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const pattern = normalizePatternInput(input.value);
        const validationError = validateExcludePattern(pattern);
        if (validationError) {
            showFeedback(validationError, 'error');
            return;
        }

        if (currentSettings.excludeList.some((item) => item.toLowerCase() === pattern)) {
            showFeedback(t('alreadyExcluded'), 'error');
            return;
        }

        const previousSettings = cloneSettings(currentSettings);
        currentSettings.excludeList.push(pattern);

        const saved = await persistSettings(previousSettings, 'siteAdded');
        if (saved) clearInput(input);
    });
}

function bindImportExportListeners() {
    getElementById('exportBtn')?.addEventListener('click', exportSettings);
    getElementById('importBtn')?.addEventListener('click', importSettings);
}

function bindSearchListener() {
    getElementById('excludeSearch')?.addEventListener('input', (event) => {
        excludeFilter = event.target.value.trim().toLowerCase();
        renderExcludeList(currentSettings);
    });
}

async function persistSettings(previousSettings, successMessage) {
    setOptionsBusy(true);
    showFeedback(t('saving'), 'saving');

    try {
        const saved = await saveSettingsAndRefresh(currentSettings);
        if (!saved) throw new Error('Settings were not saved');
        showFeedback(t(successMessage), 'success');
    } catch (error) {
        currentSettings = previousSettings;
        applySettingsToUi(currentSettings);
        renderExcludeList(currentSettings);
        showFeedback(t('saveError'), 'error');
        console.error('Settings save error:', error);
        return false;
    } finally {
        setOptionsBusy(false);
        renderExcludeList(currentSettings);
    }

    return true;
}

function setOptionsBusy(busy) {
    isSaving = busy;
    document.body.classList.toggle('is-saving', busy);
    document.querySelectorAll('[data-setting-control], [data-data-control]').forEach((control) => {
        control.disabled = busy;
    });
}

async function exportSettings() {
    try {
        const settings = await getSettings();
        const dataBlob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        downloadBlob(dataBlob, 'grayscale-filter-settings.json');
        showFeedback(t('exportSuccess'), 'success');
    } catch (error) {
        console.error('Export error:', error);
        showFeedback(t('saveError'), 'error');
    }
}

function importSettings() {
    const fileInput = createJsonFileInput();

    fileInput.addEventListener('change', async (event) => {
        const file = getFirstSelectedFile(event);
        if (!file) return;

        try {
            const imported = JSON.parse(await file.text());
            if (!validateSettings(imported)) throw new Error(t('importError'));
            const previousSettings = cloneSettings(currentSettings);
            currentSettings = normalizeSettings(imported);
            const saved = await persistSettings(previousSettings, 'importSuccess');
            if (saved) applySettingsToUi(currentSettings);
        } catch (error) {
            console.error('Import error:', error);
            showFeedback(error.message || t('importError'), 'error');
        }
    });

    fileInput.click();
}

function applySettingsToUi(settings) {
    if (!settings) return;

    setCheckboxChecked('enableToggle', settings.enabled);
    setCheckboxChecked('advancedTrackingToggle', settings.advancedSpaTracking);

    const slider = getElementById('intensitySlider');
    const value = getElementById('intensityValue');
    if (slider && value) {
        slider.value = settings.intensity;
        value.textContent = `${settings.intensity}%`;
    }
}

function renderExcludeList(settings) {
    const tbody = getElementById('excludeTableBody');
    const count = getElementById('excludeCount');
    if (!tbody || !settings) return;

    const visiblePatterns = settings.excludeList.filter((pattern) => pattern.toLowerCase().includes(excludeFilter));
    tbody.replaceChildren();
    if (count) count.textContent = `${visiblePatterns.length} / ${settings.excludeList.length}`;

    if (visiblePatterns.length === 0) {
        renderEmptyExcludeState(tbody, settings.excludeList.length ? t('noMatchingSites') : t('noExcludedSites'));
        return;
    }

    visiblePatterns.forEach((pattern) => {
        const row = tbody.insertRow();
        const patternCell = row.insertCell();
        patternCell.textContent = pattern;
        patternCell.className = 'pattern-cell';

        const actionCell = row.insertCell();
        actionCell.className = 'action-cell';
        actionCell.appendChild(createRemoveButton(pattern));
    });
}

function renderEmptyExcludeState(tbody, message) {
    const row = tbody.insertRow();
    row.className = 'empty-row';
    const cell = row.insertCell();
    cell.colSpan = 2;
    cell.textContent = message;
}

function createRemoveButton(pattern) {
    const removeBtn = document.createElement('button');
    removeBtn.textContent = t('remove');
    removeBtn.className = 'btn-link';
    removeBtn.type = 'button';
    removeBtn.disabled = isSaving;
    removeBtn.addEventListener('click', async () => {
        const previousSettings = cloneSettings(currentSettings);
        currentSettings.excludeList = currentSettings.excludeList.filter((item) => item !== pattern);

        await persistSettings(previousSettings, 'siteRemoved');
    });
    return removeBtn;
}

function showFeedback(message, type = 'info') {
    const feedback = getElementById('feedback');
    if (!feedback) return;

    feedback.className = `feedback ${type}`;
    feedback.textContent = message;
    feedback.hidden = false;
    feedback.style.display = 'flex';
    feedback.setAttribute('role', type === 'error' ? 'alert' : 'status');
    feedback.style.opacity = '1';

    clearTimeout(showFeedback.timeout);
    showFeedback.timeout = setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => {
            feedback.hidden = true;
            feedback.style.display = 'none';
        }, 300);
    }, 3000);
}

function normalizePatternInput(rawValue) {
    return (rawValue ?? '').trim().toLowerCase();
}

function validateExcludePattern(pattern) {
    if (!isValidExcludePattern(pattern)) {
        return t('invalidPattern');
    }
    return null;
}

function cloneSettings(settings) {
    return {
        ...settings,
        excludeList: [...settings.excludeList],
    };
}

function getElementById(elementId) {
    return document.getElementById(elementId);
}

function setCheckboxChecked(elementId, isChecked) {
    const checkbox = getElementById(elementId);
    if (checkbox) checkbox.checked = isChecked;
}

function clearInput(input) {
    input.value = '';
}

function createJsonFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    return input;
}

function getFirstSelectedFile(event) {
    return event?.target?.files?.[0] ?? null;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

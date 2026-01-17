let currentSettings = null;

(async function init() {
    try {
        currentSettings = await getSettings();
        applySettingsToUi(currentSettings);
        bindAllListeners();
        renderExcludeList(currentSettings);
    } catch (error) {
        console.error('Options init error:', error);
        showFeedback('Error initializing settings', 'error');
    }
})();

function bindAllListeners() {
    bindToggleListener({
        elementId: 'enableToggle',
        getNextValue: (checkbox) => checkbox.checked,
        applyToSettings: (settings, nextValue) => { settings.enabled = nextValue; },
        successMessage: 'Settings saved',
    });

    bindToggleListener({
        elementId: 'advancedTrackingToggle',
        getNextValue: (checkbox) => checkbox.checked,
        applyToSettings: (settings, nextValue) => { settings.advancedSpaTracking = nextValue; },
        successMessage: 'SPA Tracking updated',
    });

    bindIntensitySliderListeners();
    bindExcludeFormListener();
    bindImportExportListeners();
}

function bindToggleListener({ elementId, getNextValue, applyToSettings, successMessage }) {
    const toggle = getElementById(elementId);
    if (!toggle) return;

    toggle.addEventListener('change', async () => {
        const nextValue = getNextValue(toggle);
        applyToSettings(currentSettings, nextValue);

        await saveSettingsAndRefreshUi();
        showFeedback(successMessage, 'success');
    });
}

function bindIntensitySliderListeners() {
    const slider = getElementById('intensitySlider');
    const value = getElementById('intensityValue');
    if (!slider || !value) return;

    slider.addEventListener('input', () => {
        value.textContent = slider.value + '%';
    });

    slider.addEventListener('change', async () => {
        currentSettings.intensity = parseInt(slider.value, 10);
        await saveSettingsAndRefreshUi();
        showFeedback('Intensity updated', 'success');
    });
}

function bindExcludeFormListener() {
    const form = getElementById('addExcludeForm');
    const input = getElementById('excludeInput');
    if (!form || !input) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const pattern = normalizePatternInput(input.value);
        if (!pattern) return;

        const validationError = validateExcludePattern(pattern);
        if (validationError) {
            showFeedback(validationError, 'error');
            return;
        }

        const existsError = validateNotAlreadyExcluded(currentSettings, pattern);
        if (existsError) {
            showFeedback(existsError, 'error');
            return;
        }

        addPatternToExclusions(currentSettings, pattern);
        await saveSettingsAndRefreshUi();

        clearInput(input);
        renderExcludeList(currentSettings);
        showFeedback('Site added to exclusion list', 'success');
    });
}

function bindImportExportListeners() {
    const exportBtn = getElementById('exportBtn');
    const importBtn = getElementById('importBtn');

    if (exportBtn) exportBtn.addEventListener('click', exportSettings);
    if (importBtn) importBtn.addEventListener('click', importSettings);
}

async function saveSettingsAndRefreshUi() {
    await saveSettingsAndRefresh(currentSettings);
}

async function exportSettings() {
    try {
        const settings = await getSettings();
        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        downloadBlob(dataBlob, 'grayscale-filter-settings.json');

        showFeedback('Settings exported successfully', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showFeedback('Failed to export settings', 'error');
    }
}

function importSettings() {
    const fileInput = createJsonFileInput();

    fileInput.addEventListener('change', async (event) => {
        const file = getFirstSelectedFile(event);
        if (!file) return;

        try {
            const text = await file.text();
            const imported = JSON.parse(text);

            validateImportedSettings(imported);

            currentSettings = normalizeImportedSettings(imported);

            await saveSettingsAndRefreshUi();
            applySettingsToUi(currentSettings);
            renderExcludeList(currentSettings);
            showFeedback('Settings imported successfully', 'success');
        } catch (error) {
            console.error('Import error:', error);
            showFeedback('Failed to import settings: ' + error.message, 'error');
        }
    });

    fileInput.click();
}

function applySettingsToUi(settings) {
    if (!settings) return;

    setCheckboxChecked('enableToggle', !!settings.enabled);
    setCheckboxChecked('advancedTrackingToggle', !!settings.advancedSpaTracking);

    const slider = getElementById('intensitySlider');
    const value = getElementById('intensityValue');
    if (slider && value) {
        slider.value = settings.intensity;
        value.textContent = settings.intensity + '%';
    }
}

function renderExcludeList(settings) {
    const tbody = getElementById('excludeTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!settings.excludeList || settings.excludeList.length === 0) {
        renderEmptyExcludeState(tbody);
        return;
    }

    settings.excludeList.forEach((pattern) => {
        const row = tbody.insertRow();

        const patternCell = row.insertCell();
        patternCell.textContent = pattern;
        patternCell.style.fontFamily = 'monospace';

        const actionCell = row.insertCell();
        actionCell.appendChild(createRemoveButton(pattern));
    });
}

function renderEmptyExcludeState(tbody) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 2;
    cell.textContent = 'No excluded sites';
    cell.style.textAlign = 'center';
    cell.style.color = 'hsl(var(--muted-foreground))';
    cell.style.fontStyle = 'italic';
    cell.style.padding = '1.5rem';
}

function createRemoveButton(pattern) {
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'btn-link';
    removeBtn.style.color = 'hsl(var(--destructive))';
    removeBtn.addEventListener('click', async () => {
        await removeSiteFromExclusions(pattern);
    });
    return removeBtn;
}

async function removeSiteFromExclusions(pattern) {
    try {
        currentSettings.excludeList = currentSettings.excludeList.filter(p => p !== pattern);
        await saveSettingsAndRefreshUi();
        renderExcludeList(currentSettings);
        showFeedback('Site removed from exclusion list', 'success');
    } catch (error) {
        console.error('Error removing site:', error);
        showFeedback('Failed to remove site', 'error');
    }
}

function showFeedback(message, type = 'info') {
    const feedback = getElementById('feedback');
    if (!feedback) return;

    feedback.className = `feedback ${type}`;
    feedback.textContent = message;
    feedback.style.display = 'block';
    feedback.style.opacity = '1';

    setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => {
            feedback.style.display = 'none';
        }, 300);
    }, 3000);
}

function getElementById(elementId) {
    return document.getElementById(elementId);
}

function setCheckboxChecked(elementId, isChecked) {
    const checkbox = getElementById(elementId);
    if (checkbox) checkbox.checked = isChecked;
}

function normalizePatternInput(rawValue) {
    return (rawValue ?? '').trim();
}

function validateExcludePattern(pattern) {
    if (pattern.includes('/') && !pattern.startsWith('*.')) {
        return 'Invalid pattern. Use domain format like "example.com" or "*.example.com"';
    }
    return null;
}

function validateNotAlreadyExcluded(settings, pattern) {
    if (settings.excludeList.includes(pattern)) {
        return 'This site is already in the exclusion list';
    }
    return null;
}

function addPatternToExclusions(settings, pattern) {
    settings.excludeList.push(pattern);
}

function clearInput(input) {
    input.value = '';
}

function createJsonFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    return input;
}

function getFirstSelectedFile(event) {
    return event?.target?.files?.[0] ?? null;
}

function validateImportedSettings(imported) {
    const isValid =
        typeof imported.enabled === 'boolean' &&
        typeof imported.intensity === 'number' &&
        Array.isArray(imported.excludeList);

    if (!isValid) throw new Error('Invalid settings format');
}

function normalizeImportedSettings(imported) {
    return {
        enabled: imported.enabled,
        intensity: imported.intensity,
        excludeList: imported.excludeList,
        advancedSpaTracking: imported.advancedSpaTracking ?? true,
    };
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

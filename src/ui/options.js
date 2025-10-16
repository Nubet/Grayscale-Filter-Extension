let currentSettings = null;

(async function init() {
    try {
        currentSettings = await getSettings();

        updateUI();
        setupEventListeners();
    } catch (e) {
        console.error('Options init error:', e);
        showFeedback('Error loading settings: ' + e.message, true);
    }
})();

function updateUI() {
    document.getElementById('enableToggle').checked = currentSettings.enabled;
    document.getElementById('advancedTrackingToggle').checked = currentSettings.advancedSpaTracking || false;

    const intensitySlider = document.getElementById('intensitySlider');
    const intensityValue = document.getElementById('intensityValue');
    intensitySlider.value = currentSettings.intensity;
    intensityValue.textContent = currentSettings.intensity;

    updateExcludeTable();
}

function updateExcludeTable() {
    const tbody = document.getElementById('excludeTableBody');
    tbody.innerHTML = '';

    if (!currentSettings.excludeList?.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="2">No excluded sites</td></tr>';
        return;
    }

    currentSettings.excludeList.forEach((pattern, index) => {
        const row = document.createElement('tr');

        const patternCell = document.createElement('td');
        patternCell.textContent = pattern;
        patternCell.className = 'pattern-cell';

        const actionCell = document.createElement('td');
        actionCell.className = 'action-cell';

        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.className = 'btn btn-small btn-danger';
        removeBtn.addEventListener('click', () => removeExclude(index));

        actionCell.appendChild(removeBtn);
        row.appendChild(patternCell);
        row.appendChild(actionCell);
        tbody.appendChild(row);
    });
}

function setupEventListeners() {
    setupToggle('enableToggle', 'enabled', (checked) => `Filter ${checked ? 'enabled' : 'disabled'}`);

    setupToggle(
        'advancedTrackingToggle',
        'advancedSpaTracking',
        (checked) => `Advanced SPA tracking ${checked ? 'enabled' : 'disabled'}`
    );

    setupIntensitySlider();
    setupExcludeForm();
    setupImportExport();
}

function setupToggle(selector, settingKey, messageFunc) {
    const toggle = document.getElementById(selector);
    toggle.addEventListener('change', async () => {
        try {
            currentSettings[settingKey] = toggle.checked;
            await saveSettingsAndRefresh(currentSettings);
            showFeedback(messageFunc(toggle.checked));
        } catch (e) {
            console.error(`Error toggling ${settingKey}:`, e);
            showFeedback(`Error: ${e.message}`, true);
        }
    });
}

function setupIntensitySlider() {
    const slider = document.getElementById('intensitySlider');
    const value = document.getElementById('intensityValue');

    slider.addEventListener('input', () => {
        value.textContent = slider.value;
    });

    slider.addEventListener('change', async () => {
        try {
            currentSettings.intensity = parseInt(slider.value, 10);
            await saveSettingsAndRefresh(currentSettings);
            showFeedback(`Intensity set to ${slider.value}%`);
        } catch (e) {
            console.error('Error updating intensity:', e);
            showFeedback('Error updating intensity: ' + e.message, true);
        }
    });
}

function setupExcludeForm() {
    const addForm = document.getElementById('addExcludeForm');
    addForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('excludeInput');
        const pattern = input.value.trim();

        if (!pattern) return;

        try {
            if (!currentSettings.excludeList) {
                currentSettings.excludeList = [];
            }

            if (currentSettings.excludeList.includes(pattern)) {
                showFeedback('This pattern is already excluded', true);
                return;
            }

            currentSettings.excludeList.push(pattern);
            await saveSettingsAndRefresh(currentSettings);

            input.value = '';
            updateExcludeTable();
            showFeedback('Site added to exclude list');
        } catch (e) {
            console.error('Error adding exclude pattern:', e);
            showFeedback('Error adding pattern: ' + e.message, true);
        }
    });
}

function setupImportExport() {
    const exportBtn = document.getElementById('exportBtn');
    exportBtn?.addEventListener('click', () => {
        const data = JSON.stringify(currentSettings, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'grayscale-filter-settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    const importBtn = document.getElementById('importBtn');
    importBtn?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';

        input.onchange = async (e) => {
            try {
                const file = e.target.files[0];
                const text = await file.text();
                const settings = JSON.parse(text);

                await saveSettingsAndRefresh(settings);
                currentSettings = settings;
                updateUI();
                showFeedback('Settings imported successfully');
            } catch (e) {
                console.error('Error importing settings:', e);
                showFeedback('Error importing settings: ' + e.message, true);
            }
        };

        input.click();
    });
}

async function removeExclude(index) {
    try {
        currentSettings.excludeList.splice(index, 1);
        await saveSettingsAndRefresh(currentSettings);
        updateExcludeTable();
        showFeedback('Site removed from exclude list');
    } catch (e) {
        console.error('Error removing exclude pattern:', e);
        showFeedback('Error removing pattern: ' + e.message, true);
    }
}

function showFeedback(message, isError = false) {
    const feedback = document.getElementById('feedback');
    if (!feedback) return;

    feedback.textContent = message;
    feedback.className = isError ? 'error' : 'success';
    feedback.style.opacity = '1';

    setTimeout(() => {
        feedback.style.opacity = '0';
    }, 3000);
}

import { getSettings, saveSettings, exportSettings, importSettings } from "../common/storage.js";

let currentSettings = null;

(async function init() {
    try {
        currentSettings = await getSettings();
        updateUI();
        setupEventListeners();
    } catch (e) {
        console.error("Options init error:", e);
        showFeedback("Error loading settings: " + e.message, true);
    }
})();

function updateUI() {
    document.getElementById("enableToggle").checked = currentSettings.enabled;
    document.getElementById("advancedTrackingToggle").checked = currentSettings.advancedTracking;
    const intensitySlider = document.getElementById("intensitySlider");
    const intensityValue = document.getElementById("intensityValue");
    intensitySlider.value = currentSettings.intensity;
    intensityValue.textContent = currentSettings.intensity;
    updateExcludeTable();
}

function updateExcludeTable() {
    const tbody = document.getElementById("excludeTableBody");
    tbody.innerHTML = "";
    if (!currentSettings.excludeList || currentSettings.excludeList.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="2">No excluded sites</td></tr>';
        return;
    }
    currentSettings.excludeList.forEach((pattern, index) => {
        const row = document.createElement("tr");
        const patternCell = document.createElement("td");
        patternCell.textContent = pattern;
        patternCell.className = "pattern-cell";
        const actionCell = document.createElement("td");
        actionCell.className = "action-cell";
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.className = "btn btn-small btn-danger";
        removeBtn.addEventListener("click", () => removePattern(index));
        actionCell.appendChild(removeBtn);
        row.appendChild(patternCell);
        row.appendChild(actionCell);
        tbody.appendChild(row);
    });
}

function setupEventListeners() {
    document.getElementById("enableToggle").addEventListener("change", async e => {
        currentSettings.enabled = e.target.checked;
        await saveSettings({
            enabled: currentSettings.enabled
        });
        showFeedback(currentSettings.enabled ? "Filter enabled" : "Filter disabled");
    });
    document.getElementById("advancedTrackingToggle").addEventListener("change", async e => {
        currentSettings.advancedTracking = e.target.checked;
        await saveSettings({
            advancedTracking: currentSettings.advancedTracking
        });
        showFeedback(currentSettings.advancedTracking ? "Advanced tracking enabled" : "Advanced tracking disabled");
    });
    const intensitySlider = document.getElementById("intensitySlider");
    const intensityValue = document.getElementById("intensityValue");
    intensitySlider.addEventListener("input", e => {
        intensityValue.textContent = e.target.value;
    });
    intensitySlider.addEventListener("change", async e => {
        currentSettings.intensity = parseInt(e.target.value);
        await saveSettings({
            intensity: currentSettings.intensity
        });
        showFeedback(`Intensity set to ${currentSettings.intensity}%`);
    });
    document.getElementById("addPatternBtn").addEventListener("click", addPattern);
    document.getElementById("newPatternInput").addEventListener("keypress", e => {
        if (e.key === "Enter") {
            addPattern();
        }
    });
    document.getElementById("exportBtn").addEventListener("click", handleExport);
    document.getElementById("importBtn").addEventListener("click", () => {
        document.getElementById("importFileInput").click();
    });
    document.getElementById("importFileInput").addEventListener("change", handleImport);
}

async function addPattern() {
    const input = document.getElementById("newPatternInput");
    const pattern = input.value.trim();
    if (!pattern) {
        showFeedback("Please enter a pattern", true);
        return;
    }
    if (currentSettings.excludeList.includes(pattern)) {
        showFeedback("Pattern already exists", true);
        return;
    }
    currentSettings.excludeList.push(pattern);
    await saveSettings({
        excludeList: currentSettings.excludeList
    });
    input.value = "";
    updateExcludeTable();
    showFeedback(`Added: ${pattern}`);
}

async function removePattern(index) {
    const pattern = currentSettings.excludeList[index];
    currentSettings.excludeList.splice(index, 1);
    await saveSettings({
        excludeList: currentSettings.excludeList
    });
    updateExcludeTable();
    showFeedback(`Removed: ${pattern}`);
}

async function handleExport() {
    try {
        const jsonString = await exportSettings();
        const blob = new Blob([ jsonString ], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `grayscale-filter-settings-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showFeedback("Settings exported successfully");
    } catch (e) {
        console.error("Export error:", e);
        showFeedback("Export failed: " + e.message, true);
    }
}

async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const text = await file.text();
        currentSettings = await importSettings(text);
        updateUI();
        showFeedback("Settings imported successfully");
        e.target.value = "";
    } catch (e) {
        console.error("Import error:", e);
        showFeedback("Import failed: " + e.message, true);
    }
}

function showFeedback(message, isError = false) {
    const feedback = document.getElementById("feedback");
    feedback.textContent = message;
    feedback.className = isError ? "feedback error" : "feedback success";
    feedback.style.display = "block";
    setTimeout(() => {
        feedback.style.display = "none";
    }, 3e3);
}

chrome.storage.onChanged.addListener(async (changes, areaName) => {
    currentSettings = await getSettings();
    updateUI();
});
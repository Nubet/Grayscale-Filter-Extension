import { getSettings, saveSettings, extractDomain, isUrlExcluded } from "../common/storage.js";

let currentTab = null;

let currentSettings = null;

(async function init() {
    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });
        currentTab = tab;
        currentSettings = await getSettings();
        updateUI();
        setupEventListeners();
        updateColorGridPreview(currentSettings.intensity);
    } catch (e) {
        console.error("Popup init error:", e);
    }
})();

function updateUI() {
    const enableToggle = document.getElementById("enableToggle");
    enableToggle.checked = currentSettings.enabled;
    const intensitySlider = document.getElementById("intensitySlider");
    const intensityValue = document.getElementById("intensityValue");
    intensitySlider.value = currentSettings.intensity;
    intensityValue.textContent = currentSettings.intensity;
    const currentSiteEl = document.getElementById("currentSite");
    const toggleSiteBtn = document.getElementById("toggleSiteBtn");
    if (currentTab?.url) {
        const domain = extractDomain(currentTab.url);
        if (domain) {
            currentSiteEl.textContent = domain;
            const isExcluded = isUrlExcluded(currentTab.url, currentSettings.excludeList);
            toggleSiteBtn.textContent = isExcluded ? "Include this site" : "Exclude this site";
            toggleSiteBtn.disabled = false;
        } else {
            currentSiteEl.textContent = "Not a valid website";
            toggleSiteBtn.disabled = true;
        }
    } else {
        currentSiteEl.textContent = "No active tab";
        toggleSiteBtn.disabled = true;
    }
}

function updateColorGridPreview(intensity) {
    const colorGrid = document.getElementById("colorGrid");
    if (!colorGrid) return;
    const filterValue = intensity / 100;
    const colorCells = colorGrid.querySelectorAll(".color-cell");
    colorCells.forEach(cell => {
        cell.classList.remove("grayscale-preview");
        if (intensity > 0) {
            cell.classList.add("grayscale-preview");
            cell.style.setProperty("--preview-intensity", filterValue);
        } else {
            cell.style.removeProperty("--preview-intensity");
        }
    });
    console.log(`Color preview updated with intensity: ${intensity}% (${filterValue})`);
}

function setupEventListeners() {
    document.getElementById("enableToggle").addEventListener("change", async e => {
        currentSettings.enabled = e.target.checked;
        await saveSettings({
            enabled: currentSettings.enabled
        });
        showFeedback(currentSettings.enabled ? "Filter enabled" : "Filter disabled");
    });
    const intensitySlider = document.getElementById("intensitySlider");
    const intensityValue = document.getElementById("intensityValue");
    intensitySlider.addEventListener("input", e => {
        const value = parseInt(e.target.value);
        intensityValue.textContent = value;
        updateColorGridPreview(value);
    });
    intensitySlider.addEventListener("change", async e => {
        currentSettings.intensity = parseInt(e.target.value);
        await saveSettings({
            intensity: currentSettings.intensity
        });
        showFeedback(`Intensity set to ${currentSettings.intensity}%`);
    });
    document.getElementById("toggleSiteBtn").addEventListener("click", async () => {
        await toggleCurrentSite();
    });
    document.getElementById("openOptionsBtn").addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
    });
    setupColorCellClicks();
}

async function toggleCurrentSite() {
    if (!currentTab?.url) return;
    const domain = extractDomain(currentTab.url);
    if (!domain) return;
    try {
        const isExcluded = isUrlExcluded(currentTab.url, currentSettings.excludeList);
        if (isExcluded) {
            currentSettings.excludeList = currentSettings.excludeList.filter(pattern => pattern !== domain);
            showFeedback(`Included ${domain}`);
        } else {
            currentSettings.excludeList.push(domain);
            showFeedback(`Excluded ${domain}`);
        }
        await saveSettings({
            excludeList: currentSettings.excludeList
        });
        await chrome.tabs.reload(currentTab.id);
        updateUI();
    } catch (e) {
        console.error("Toggle site error:", e);
        showFeedback("Error: " + e.message, true);
    }
}

function showFeedback(message, isError = false) {
    let feedback = document.getElementById("feedback");
    if (!feedback) {
        feedback = document.createElement("div");
        feedback.id = "feedback";
        feedback.className = "feedback";
        document.querySelector(".popup-container").appendChild(feedback);
    }
    feedback.textContent = message;
    feedback.className = isError ? "feedback error" : "feedback success";
    feedback.style.display = "block";
    setTimeout(() => {
        feedback.style.display = "none";
    }, 2e3);
}

function setupColorCellClicks() {
    const colorCells = document.querySelectorAll(".color-cell");
    colorCells.forEach(cell => {
        cell.addEventListener("click", () => {
            const color = cell.getAttribute("data-color");
            document.querySelectorAll(".color-cell.active").forEach(c => c.classList.remove("active"));
            cell.classList.add("active");
            showFeedback(`Color: ${color}`);
        });
    });
}

if (typeof chrome.storage.onChanged.addEventListener === "function") {
    chrome.storage.onChanged.addEventListener("change", async event => {
        currentSettings = await getSettings();
        updateUI();
    });
} else {
    chrome.storage.onChanged.addListener(async (changes, areaName) => {
        currentSettings = await getSettings();
        updateUI();
    });
}
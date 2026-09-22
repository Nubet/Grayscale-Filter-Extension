const FALLBACK_MESSAGES = {
    appName: 'Grayscale Filter',
    enableFilter: 'Enable Filter',
    intensity: 'Intensity',
    currentWebsite: 'Current Website',
    excludeSite: 'Exclude this site',
    includeSite: 'Include this site',
    unavailableOnPage: 'This page does not allow extensions to run.',
    openSettings: 'Open Settings',
    settings: 'Settings',
    settingsDescription: 'Manage how the grayscale filter behaves globally and on specific sites.',
    general: 'General',
    globalEnable: 'Global Enable',
    globalEnableDescription: 'Turn the extension on or off everywhere.',
    spaTracking: 'SPA Tracking',
    spaTrackingDescription: 'Better support for dynamic sites (React, etc.)',
    globalIntensity: 'Global Intensity',
    exclusions: 'Exclusions',
    exclusionsDescription: 'Prevent the filter from running on specific domains.',
    domainPattern: 'Domain Pattern',
    addSite: 'Add Site',
    excludePlaceholder: 'e.g. youtube.com or *.google.com',
    searchExclusions: 'Search exclusions',
    noExcludedSites: 'No excluded sites yet.',
    noMatchingSites: 'No matching sites.',
    remove: 'Remove',
    dataManagement: 'Data Management',
    dataManagementDescription: 'Backup your configuration or restore from a file.',
    exportJson: 'Export JSON',
    importJson: 'Import JSON',
    version: 'Version',
    reportIssue: 'Report an issue',
    openSourceBy: 'Open source project by',
    saving: 'Saving changes…',
    saved: 'Saved',
    errorInitializing: 'Could not load settings.',
    saveError: 'Could not save changes. Your previous settings were restored.',
    invalidUrl: 'This page has no supported URL.',
    noActiveTab: 'No active tab',
    invalidPattern: 'Use a domain like "example.com" or "*.example.com".',
    alreadyExcluded: 'This site is already excluded.',
    siteAdded: 'Site added to exclusions.',
    siteRemoved: 'Site removed from exclusions.',
    settingsReset: 'Settings reset to defaults.',
    settingsSaved: 'Settings saved.',
    importSuccess: 'Settings imported successfully.',
    exportSuccess: 'Settings exported successfully.',
    importError: 'Could not import settings.',
};

export function t(key, substitutions) {
    const localized = browser.i18n?.getMessage(key, substitutions);
    return localized || FALLBACK_MESSAGES[key] || key;
}

export function localizeDocument(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((element) => {
        const message = t(element.dataset.i18n);
        const attribute = element.dataset.i18nAttr;

        if (attribute) {
            element.setAttribute(attribute, message);
        } else {
            element.textContent = message;
        }
    });
}

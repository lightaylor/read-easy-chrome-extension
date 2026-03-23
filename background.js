const DEFAULT_SETTINGS = { bold: false, spacing: 0, lineHeight: 1.5, fontSize: 16 };

async function applyToTab(tabId) {
    const store = await chrome.storage.local.get(['global-enabled', 'global-settings']);
    if (!store['global-enabled']) return;
    const settings = store['global-settings'] ?? DEFAULT_SETTINGS;
    try {
        await chrome.tabs.sendMessage(tabId, { type: 'APPLY_ALL', settings });
    } catch {
        // Tab doesn't have content script (e.g. chrome:// pages)
    }
}

// Apply settings when switching to an existing tab
chrome.tabs.onActivated.addListener(({ tabId }) => applyToTab(tabId));

// Apply settings when a tab finishes loading (handles navigation within a tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') applyToTab(tabId);
});

const ENABLED_KEY = 'global-enabled';
const SETTINGS_KEY = 'global-settings';
const DEFAULT_SETTINGS = { bold: false, spacing: 0, lineHeight: 1.5, fontSize: 100 };

async function getActiveTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        return tab ?? null;
    } catch {
        return null;
    }
}

async function sendMessage(tabId, message) {
    try {
        await chrome.tabs.sendMessage(tabId, message);
    } catch {
        try {
            await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
            await chrome.tabs.sendMessage(tabId, message);
        } catch {
            // Page does not support content scripts (e.g. chrome:// pages)
        }
    }
}

async function updateBadge(enabled) {
    try {
        await chrome.action.setBadgeText({ text: enabled ? 'ON' : '' });
        await chrome.action.setBadgeBackgroundColor({ color: '#000' });
    } catch {
        // Badge update not available in this context
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const masterToggle = document.getElementById('masterToggle');
    const toggleLabel = masterToggle?.querySelector('.label');
    const boldCheck = document.getElementById('boldCheck');
    const spacingInput = document.getElementById('spacingInput');
    const lineHeightInput = document.getElementById('lineHeightInput');
    const fontSizeInput = document.getElementById('fontSizeInput');

    if (!masterToggle || !toggleLabel || !boldCheck || !spacingInput || !lineHeightInput || !fontSizeInput) {
        console.error('ReadEase: Required elements not found. Please reload the extension.');
        return;
    }

    function setToggleUI(enabled) {
        masterToggle.classList.toggle('active', enabled);
        toggleLabel.textContent = enabled ? 'ON' : 'OFF';
    }

    function getSettings() {
        return {
            bold: boldCheck.checked,
            spacing: Number(spacingInput.value) || 0,
            lineHeight: Number(lineHeightInput.value) || 1.5,
            fontSize: Number(fontSizeInput.value) || 100,
        };
    }

    // Load saved state when popup opens
    (async () => {
        const store = await chrome.storage.local.get([ENABLED_KEY, SETTINGS_KEY]);
        const enabled = !!store[ENABLED_KEY];
        const settings = store[SETTINGS_KEY] ?? DEFAULT_SETTINGS;

        setToggleUI(enabled);
        await updateBadge(enabled);
        boldCheck.checked = settings.bold;
        spacingInput.value = settings.spacing;
        lineHeightInput.value = settings.lineHeight;
        fontSizeInput.value = settings.fontSize ?? 100;
    })();

    // Master ON/OFF toggle
    masterToggle.addEventListener('click', async () => {
        const store = await chrome.storage.local.get(ENABLED_KEY);
        const enabled = !store[ENABLED_KEY];
        const settings = getSettings();

        setToggleUI(enabled);
        await chrome.storage.local.set({ [ENABLED_KEY]: enabled, [SETTINGS_KEY]: settings });
        await updateBadge(enabled);

        const tab = await getActiveTab();
        if (!tab?.id) return;

        if (enabled) {
            await sendMessage(tab.id, { type: 'APPLY_ALL', settings });
        } else {
            await sendMessage(tab.id, { type: 'REVERT_ALL' });
        }
    });

    // Apply changes immediately when ON
    async function applyIfEnabled() {
        const store = await chrome.storage.local.get(ENABLED_KEY);
        const enabled = !!store[ENABLED_KEY];
        const settings = getSettings();

        await chrome.storage.local.set({ [SETTINGS_KEY]: settings });

        if (enabled) {
            const tab = await getActiveTab();
            if (!tab?.id) return;
            await sendMessage(tab.id, { type: 'APPLY_ALL', settings });
        }
    }

    boldCheck.addEventListener('change', applyIfEnabled);
    spacingInput.addEventListener('input', applyIfEnabled);
    lineHeightInput.addEventListener('input', applyIfEnabled);
    fontSizeInput.addEventListener('input', applyIfEnabled);
});

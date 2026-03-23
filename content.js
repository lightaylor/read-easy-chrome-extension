const MARK = "data-bfl";

function injectBflStyle(root = document) {
    if (root.getElementById('bfl-style')) return;
    const style = document.createElement('style');
    style.id = 'bfl-style';
    style.textContent = `[${MARK}]{ font-weight: 700 !important; }`;
    document.documentElement.appendChild(style);
}

function applyBoldFirstLetters(root = document.body) {
    injectBflStyle(document);

    const SKIP = new Set(["SCRIPT","STYLE","NOSCRIPT","CODE","PRE","TEXTAREA","INPUT"]);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node){
            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            const p = node.parentElement;
            if (!p || SKIP.has(p.tagName)) return NodeFilter.FILTER_REJECT;
            if (p.closest(`[${MARK}]`)) return NodeFilter.FILTER_REJECT;
            // Skip text nodes that follow a bold marker (already processed remainder)
            const prev = node.previousSibling;
            if (prev?.nodeType === Node.ELEMENT_NODE && prev.hasAttribute(MARK)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
        const html = node.nodeValue.replace(
            /([\p{L}\p{N}])([\p{L}\p{N}_-]*)/gu,
            (_, first, rest) => `<span ${MARK}>${first}</span>${rest}`
        );
        if (html === node.nodeValue) return;
        const span = document.createElement("span");
        span.innerHTML = html;
        node.replaceWith(...span.childNodes);
    });
}

function revertBoldFirstLetters(root = document.body) {
    root.querySelectorAll(`[${MARK}]`).forEach(el => {
        const text = document.createTextNode(el.textContent || "");
        el.replaceWith(text);
    });
    root.normalize();
}

function applySpacing(value) {
    let style = document.getElementById('bfl-spacing-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'bfl-spacing-style';
        document.documentElement.appendChild(style);
    }
    style.textContent = `body * { letter-spacing: ${value}px !important; }`;
}

function revertSpacing() {
    const style = document.getElementById('bfl-spacing-style');
    if (style) style.remove();
}

function applyLineHeight(value) {
    let style = document.getElementById('bfl-line-height-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'bfl-line-height-style';
        document.documentElement.appendChild(style);
    }
    style.textContent = `body * { line-height: ${value} !important; }`;
}

function revertLineHeight() {
    const style = document.getElementById('bfl-line-height-style');
    if (style) style.remove();
}

function applyFontSize(value) {
    let style = document.getElementById('bfl-font-size-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'bfl-font-size-style';
        document.documentElement.appendChild(style);
    }
    style.textContent = `body { zoom: ${value / 100} !important; }`;
}

function revertFontSize() {
    const style = document.getElementById('bfl-font-size-style');
    if (style) style.remove();
}

// Auto-apply global settings on page load
chrome.storage.local.get(['global-enabled', 'global-settings'], (store) => {
    if (!store['global-enabled']) return;
    const settings = store['global-settings'] ?? { bold: false, spacing: 0, lineHeight: 1.5, fontSize: 16 };
    applyAll(settings);
});

function applyAll(settings) {
    const { bold, spacing, lineHeight, fontSize } = settings;
    // Only run bold processing if not already applied
    if (bold) {
        if (!document.body.querySelector(`[${MARK}]`)) applyBoldFirstLetters();
    } else {
        revertBoldFirstLetters();
    }
    if (spacing !== 0) applySpacing(spacing); else revertSpacing();
    if (lineHeight !== 1.5) applyLineHeight(lineHeight); else revertLineHeight();
    if (fontSize !== 100) applyFontSize(fontSize); else revertFontSize();
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "APPLY_ALL") applyAll(msg.settings);
    if (msg?.type === "REVERT_ALL") {
        revertBoldFirstLetters();
        revertSpacing();
        revertLineHeight();
        revertFontSize();
    }
});

if (typeof module !== 'undefined') {
    module.exports = { applyBoldFirstLetters, revertBoldFirstLetters };
}

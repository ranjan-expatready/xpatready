// The extension's service worker (F2d): the toolbar button opens the side panel. Nothing else runs here: no network,
// no storage, no listener for web pages (no externally_connectable).
chrome.runtime.onInstalled.addListener(() => { void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }); });

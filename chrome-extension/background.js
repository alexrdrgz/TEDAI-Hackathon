// Background service worker for TEDAI Chrome Extension
console.log('TEDAI AI Agent background script loaded');

chrome.runtime.onInstalled.addListener((details) => {
  console.log('TEDAI AI Agent installed:', details.reason);
});

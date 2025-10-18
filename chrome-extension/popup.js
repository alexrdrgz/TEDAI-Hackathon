function openPage() {
    chrome.tabs.create({ url: chrome.runtime.getURL('page.html') });
}

// Add event listener when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('openPageBtn').addEventListener('click', openPage);
});

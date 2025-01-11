chrome.action.onClicked.addListener((tab) => {
    // Inject content-script into the active tab
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-script.js']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error(`Error injecting script: ${chrome.runtime.lastError.message}`);
      } else {
        console.log('Content script successfully injected.');
      }
    });
  });
  
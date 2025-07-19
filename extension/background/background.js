// Background service worker for the extension
let panelConnections = {};

// Listen for connections from DevTools panels
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'formik-debug-panel') {
    const tabId = port.sender.tab.id;
    panelConnections[tabId] = port;
    
    port.onDisconnect.addListener(() => {
      delete panelConnections[tabId];
    });
    
    console.log('Panel connected for tab:', tabId);
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FORMIK_DEBUG_VALIDATION' && sender.tab) {
    const tabId = sender.tab.id;
    const panelPort = panelConnections[tabId];
    
    if (panelPort) {
      // Forward validation data to the panel
      panelPort.postMessage({
        type: 'VALIDATION_DATA',
        data: message.data
      });
    }
  }
});
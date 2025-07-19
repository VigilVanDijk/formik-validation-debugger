// Inject our validation debugger library into the page
function injectScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('dist/index.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Also inject a bridge script to communicate with the page
function injectBridge() {
  const script = document.createElement('script');
  script.textContent = 
    (function() {
      // Global store for validation data
      window.__FORMIK_DEBUG_DATA__ = {
        validations: [],
        subscribers: []
      };
      
      // API for pages to register validation data
      window.__FORMIK_DEBUG__ = {
        registerValidation: function(id, schema, values, result) {
          const validation = {
            id,
            schema,
            values,
            result,
            timestamp: Date.now()
          };
          
          window.__FORMIK_DEBUG_DATA__.validations.push(validation);
          
          // Notify subscribers
          window.__FORMIK_DEBUG_DATA__.subscribers.forEach(callback => {
            try {
              callback(validation);
            } catch (e) {
              console.error('Error in debug subscriber:', e);
            }
          });
          
          // Send to DevTools
          window.postMessage({
            type: 'FORMIK_DEBUG_VALIDATION',
            data: validation
          }, '*');
        },
        
        subscribe: function(callback) {
          window.__FORMIK_DEBUG_DATA__.subscribers.push(callback);
          
          // Send existing data
          window.__FORMIK_DEBUG_DATA__.validations.forEach(validation => {
            callback(validation);
          });
        },
        
        getValidations: function() {
          return window.__FORMIK_DEBUG_DATA__.validations;
        }
      };
    })();
  (document.head || document.documentElement).appendChild(script);
}

// Listen for messages from the page
window.addEventListener('message', function(event) {
  if (event.source !== window) return;
  
  if (event.data.type === 'FORMIK_DEBUG_VALIDATION') {
    // Forward to DevTools panel
    chrome.runtime.sendMessage({
      type: 'FORMIK_DEBUG_VALIDATION',
      data: event.data.data
    });
  }
});

// Inject scripts when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectScript();
    injectBridge();
  });
} else {
  injectScript();
  injectBridge();
}
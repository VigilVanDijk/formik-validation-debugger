// Create the Formik Validation panel
chrome.devtools.panels.create(
  'Formik Debug',
  'icons/icon16.png', // Panel icon
  'panel/panel.html', // Panel HTML file
  (panel) => {
    console.log('Formik Validation Debugger panel created');
    
    // Panel event listeners
    panel.onShown.addListener((panelWindow) => {
      console.log('Panel shown');
      panelWindow.panelShown();
    });
    
    panel.onHidden.addListener(() => {
      console.log('Panel hidden');
    });
  }
);
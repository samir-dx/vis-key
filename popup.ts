document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggleVisualizer') as HTMLInputElement;

  chrome.storage.local.get(['isVisualizerActive'], (result) => {
    toggle.checked = result.isVisualizerActive || false;
  });

  toggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ isVisualizerActive: (e.target as HTMLInputElement).checked });
  });
});
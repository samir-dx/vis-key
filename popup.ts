document.addEventListener('DOMContentLoaded', () => {
  const toggleVis = document.getElementById('toggleVisualizer') as HTMLInputElement | null;
  const toggleHide = document.getElementById('toggleAutoHide') as HTMLInputElement | null;
  const modeRadios = document.querySelectorAll<HTMLInputElement>('input[name="mode"]');

  if (!toggleVis || !toggleHide) return;

  // Load initial state
  chrome.storage.local.get(['isVisualizerActive', 'displayMode', 'autoHide'], (result: { [key: string]: any }) => {
    toggleVis.checked = result.isVisualizerActive || false;
    toggleHide.checked = result.autoHide !== false; // Default to true if undefined
    
    const mode: string = result.displayMode || 'single';
    const activeRadio = document.querySelector<HTMLInputElement>(`input[value="${mode}"]`);
    if (activeRadio) activeRadio.checked = true;
  });

  // Listen for changes
  toggleVis.addEventListener('change', (e: Event) => {
    chrome.storage.local.set({ isVisualizerActive: (e.target as HTMLInputElement).checked });
  });

  toggleHide.addEventListener('change', (e: Event) => {
    chrome.storage.local.set({ autoHide: (e.target as HTMLInputElement).checked });
  });

  modeRadios.forEach((radio: HTMLInputElement) => {
    radio.addEventListener('change', (e: Event) => {
      chrome.storage.local.set({ displayMode: (e.target as HTMLInputElement).value });
    });
  });
});
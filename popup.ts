document.addEventListener('DOMContentLoaded', () => {
  const toggleVis = document.getElementById('toggleVisualizer') as HTMLInputElement | null;
  const toggleHide = document.getElementById('toggleAutoHide') as HTMLInputElement | null;
  const modeRadios = document.querySelectorAll<HTMLInputElement>('input[name="mode"]');
  const themeRadios = document.querySelectorAll<HTMLInputElement>('input[name="theme"]');

  if (!toggleVis || !toggleHide) return;

  chrome.storage.local.get(['isVisualizerActive', 'displayMode', 'autoHide', 'theme'], (result: { [key: string]: any }) => {
    toggleVis.checked = result.isVisualizerActive || false;
    toggleHide.checked = result.autoHide !== false; 
    
    const mode: string = result.displayMode || 'single';
    const activeModeRadio = document.querySelector<HTMLInputElement>(`input[name="mode"][value="${mode}"]`);
    if (activeModeRadio) activeModeRadio.checked = true;

    const theme: string = result.theme || 'mechanical';
    const activeThemeRadio = document.querySelector<HTMLInputElement>(`input[name="theme"][value="${theme}"]`);
    if (activeThemeRadio) activeThemeRadio.checked = true;
  });

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

  themeRadios.forEach((radio: HTMLInputElement) => {
    radio.addEventListener('change', (e: Event) => {
      chrome.storage.local.set({ theme: (e.target as HTMLInputElement).value });
    });
  });
});
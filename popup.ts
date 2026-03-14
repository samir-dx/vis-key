document.addEventListener('DOMContentLoaded', () => {
  const toggleVis = document.getElementById('toggleVisualizer') as HTMLInputElement | null;
  const toggleHide = document.getElementById('toggleAutoHide') as HTMLInputElement | null;
  const themeRadios = document.querySelectorAll<HTMLInputElement>('input[name="theme"]');
  const previewContainer = document.getElementById('previewContainer');
  const openSettings = document.getElementById('openSettings');

  if (!toggleVis || !toggleHide || !previewContainer || !openSettings) return;

  // Render the live preview based on theme
  const renderPreview = (theme: string) => {
    if (theme === 'terminal') {
      previewContainer.innerHTML = `<div class="preview-terminal">⌘ + K</div>`;
    } else {
      previewContainer.innerHTML = `
        <div class="preview-mechanical">
          <div class="kv-key-base"><div class="kv-key-top kv-key-held">⌘</div></div>
          <div class="kv-key-base"><div class="kv-key-top">K</div></div>
        </div>
      `;
    }
  };

  // Open Options Page
  openSettings.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Load Initial State
  chrome.storage.local.get(['isVisualizerActive', 'autoHide', 'theme'], (result: { [key: string]: any }) => {
    toggleVis.checked = result.isVisualizerActive || false;
    toggleHide.checked = result.autoHide !== false; 
    
    const theme: string = result.theme || 'mechanical';
    const activeThemeRadio = document.querySelector<HTMLInputElement>(`input[name="theme"][value="${theme}"]`);
    if (activeThemeRadio) activeThemeRadio.checked = true;
    
    renderPreview(theme);
  });

  // Event Listeners
  toggleVis.addEventListener('change', (e: Event) => {
    chrome.storage.local.set({ isVisualizerActive: (e.target as HTMLInputElement).checked });
  });

  toggleHide.addEventListener('change', (e: Event) => {
    chrome.storage.local.set({ autoHide: (e.target as HTMLInputElement).checked });
  });

  themeRadios.forEach((radio: HTMLInputElement) => {
    radio.addEventListener('change', (e: Event) => {
      const selectedTheme = (e.target as HTMLInputElement).value;
      chrome.storage.local.set({ theme: selectedTheme });
      renderPreview(selectedTheme);
    });
  });
});
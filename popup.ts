document.addEventListener('DOMContentLoaded', () => {
  const toggleVis = document.getElementById('toggleVisualizer') as HTMLInputElement | null;
  const toggleHide = document.getElementById('toggleAutoHide') as HTMLInputElement | null;
  const themeRadios = document.querySelectorAll<HTMLInputElement>('input[name="theme"]');
  const previewContainer = document.getElementById('previewContainer');
  const openSettings = document.getElementById('openSettings');
  const toggleDarkMode = document.getElementById('toggleDarkMode');
  const themeIcon = document.getElementById('themeIcon');

  if (!toggleVis || !toggleHide || !previewContainer || !openSettings || !toggleDarkMode || !themeIcon) return;

  // Icons for Dark Mode Toggle
  const iconMoon = `<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>`;
  const iconSun = `<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>`;

  // Apply UI Dark Mode
  const applyPopupTheme = (isDark: boolean) => {
    if (isDark) {
      document.body.classList.add('dark');
      themeIcon.innerHTML = iconSun;
    } else {
      document.body.classList.remove('dark');
      themeIcon.innerHTML = iconMoon;
    }
  };

  // Render the live preview based on active Appearance setting
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

  // Set CSS Variables for the Preview block specifically
  const applyPreviewColors = (res: any) => {
    const root = document.documentElement;
    if (res.termBg) root.style.setProperty('--term-bg', res.termBg);
    if (res.termText) root.style.setProperty('--term-text', res.termText);
    if (res.mechBg) root.style.setProperty('--mech-bg', res.mechBg);
    if (res.mechText) root.style.setProperty('--mech-text', res.mechText);
    if (res.mechShadow) root.style.setProperty('--mech-shadow', res.mechShadow);
    if (res.mechBorder) root.style.setProperty('--mech-border', res.mechBorder);
  };

  // Actions
  openSettings.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  toggleDarkMode.addEventListener('click', () => {
    const isCurrentlyDark = document.body.classList.contains('dark');
    const newTheme = !isCurrentlyDark;
    applyPopupTheme(newTheme);
    chrome.storage.local.set({ popupDarkMode: newTheme });
  });

  // Load Initial State
  chrome.storage.local.get(null, (res: { [key: string]: any }) => {
    toggleVis.checked = res.isVisualizerActive || false;
    toggleHide.checked = res.autoHide !== false; 
    
    const theme: string = res.theme || 'mechanical';
    const activeThemeRadio = document.querySelector<HTMLInputElement>(`input[name="theme"][value="${theme}"]`);
    if (activeThemeRadio) activeThemeRadio.checked = true;
    
    applyPopupTheme(res.popupDarkMode === true); // Default to light if undefined
    applyPreviewColors(res);
    renderPreview(theme);
  });

  // State Listeners
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
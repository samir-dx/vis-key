document.addEventListener('DOMContentLoaded', () => {
  const modeRadios = document.querySelectorAll<HTMLInputElement>('input[name="mode"]');

  // Load state (defaults to single)
  chrome.storage.local.get(['displayMode'], (result: { [key: string]: any }) => {
    const mode: string = result.displayMode || 'single';
    const activeRadio = document.querySelector<HTMLInputElement>(`input[value="${mode}"]`);
    if (activeRadio) activeRadio.checked = true;
  });

  // Save state
  modeRadios.forEach((radio: HTMLInputElement) => {
    radio.addEventListener('change', (e: Event) => {
      chrome.storage.local.set({ displayMode: (e.target as HTMLInputElement).value });
    });
  });
});
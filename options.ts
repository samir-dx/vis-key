const getDarkerHex = (hex: string, factor: number = 0.65): string => {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = Math.max(0, Math.floor(parseInt(hex.substring(0, 2), 16) * factor));
  const g = Math.max(0, Math.floor(parseInt(hex.substring(2, 4), 16) * factor));
  const b = Math.max(0, Math.floor(parseInt(hex.substring(4, 6), 16) * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const termPresets = [
  { name: 'Matrix', bg: '#000000', text: '#00ff00' },
  { name: 'Dracula', bg: '#282a36', text: '#ff79c6' },
  { name: 'CyberPunk', bg: '#090422', text: '#00ffff' },
  { name: 'Monokai', bg: '#272822', text: '#ff1d70' }
];

const mechPresets = [
  // Added EXPLICIT overrides for the Classic OG shadow and border
  { name: 'Classic', bg: '#ffffff', text: '#000000', shadow: '#111111', border: '#111111' }, 
  { name: 'Carbon', bg: '#2b2b2b', text: '#f2f2f2', shadow:'#fff', border: '#fff' },
  { name: 'Matrix', bg: '#00ff00', text: '#000000' },
  { name: 'Dracula', bg: '#ff79c6', text: '#282a36' },
  { name: 'CyberPunk', bg: '#00ffff', text: '#090422' },
  { name: 'Monokai', bg: '#ff1d70', text: '#272822' },
  { name: 'Vapor', bg: '#ff71ce', text: '#05ffa1' },
  { name: 'Matcha', bg: '#e1eac2', text: '#4a5240' },
  { name: 'Midnight', bg: '#7aa2f7', text: '#1a1b26' }
];

document.addEventListener('DOMContentLoaded', () => {
  const toggleVis = document.getElementById('toggleVisualizer') as HTMLInputElement;
  const toggleHide = document.getElementById('toggleAutoHide') as HTMLInputElement;
  const modeRadios = document.querySelectorAll<HTMLInputElement>('input[name="mode"]');
  const themeRadios = document.querySelectorAll<HTMLInputElement>('input[name="theme"]');
  
  const panelTerm = document.getElementById('panelTerminal') as HTMLDivElement;
  const panelMech = document.getElementById('panelMechanical') as HTMLDivElement;
  
  const termBg = document.getElementById('termBgColor') as HTMLInputElement;
  const termText = document.getElementById('termTextColor') as HTMLInputElement;
  const mechBg = document.getElementById('mechBgColor') as HTMLInputElement;
  const mechText = document.getElementById('mechTextColor') as HTMLInputElement;

  const updateLivePreview = (customShadow?: string, customBorder?: string) => {
    const root = document.documentElement;
    root.style.setProperty('--term-bg', termBg.value);
    root.style.setProperty('--term-text', termText.value);
    root.style.setProperty('--mech-bg', mechBg.value);
    root.style.setProperty('--mech-text', mechText.value);
    root.style.setProperty('--mech-shadow', customShadow || getDarkerHex(mechBg.value));
    
    // Auto-calculate border as a slightly darker variant if not explicitly provided
    root.style.setProperty('--mech-border', customBorder || getDarkerHex(mechBg.value, 0.8));
  };

  const saveColors = (customShadow?: string, customBorder?: string) => {
    const finalShadow = customShadow || getDarkerHex(mechBg.value);
    const finalBorder = customBorder || getDarkerHex(mechBg.value, 0.8);
    
    updateLivePreview(finalShadow, finalBorder); 
    chrome.storage.local.set({
      termBg: termBg.value,
      termText: termText.value,
      mechBg: mechBg.value,
      mechText: mechText.value,
      mechShadow: finalShadow,
      mechBorder: finalBorder
    });
  };

  const renderPresets = (containerId: string, presets: any[], isTerm: boolean) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    presets.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.innerHTML = `<div class="preset-dot">
      <div class="preset-dot-inner" style="background:${p.bg}"></div>
      <div class="preset-dot-inner" style="background:${p.text}"></div>
      </div> ${p.name}`;
      btn.onclick = () => {
        if (isTerm) {
          termBg.value = p.bg; termText.value = p.text;
          saveColors();
        } else {
          mechBg.value = p.bg; mechText.value = p.text;
          saveColors(p.shadow, p.border); // Pass custom overrides here!
        }
      };
      container.appendChild(btn);
    });
  };

  renderPresets('termPresets', termPresets, true);
  renderPresets('mechPresets', mechPresets, false);

  chrome.storage.local.get(null, (res) => {
    toggleVis.checked = res.isVisualizerActive || false;
    toggleHide.checked = res.autoHide !== false;
    
    const mode = res.displayMode || 'single';
    (document.querySelector(`input[name="mode"][value="${mode}"]`) as HTMLInputElement).checked = true;

    const theme = res.theme || 'mechanical';
    (document.querySelector(`input[name="theme"][value="${theme}"]`) as HTMLInputElement).checked = true;
    updatePanels(theme);

    termBg.value = res.termBg || '#000000';
    termText.value = res.termText || '#00ff00';
    mechBg.value = res.mechBg || '#ffffff';
    mechText.value = res.mechText || '#000000';
    
    // Load preview with saved overrides
    updateLivePreview(res.mechShadow, res.mechBorder);
  });

  const updatePanels = (theme: string) => {
    panelTerm.classList.toggle('active', theme === 'terminal');
    panelMech.classList.toggle('active', theme === 'mechanical');
  };

  toggleVis.addEventListener('change', e => chrome.storage.local.set({ isVisualizerActive: (e.target as HTMLInputElement).checked }));
  toggleHide.addEventListener('change', e => chrome.storage.local.set({ autoHide: (e.target as HTMLInputElement).checked }));
  modeRadios.forEach(r => r.addEventListener('change', e => chrome.storage.local.set({ displayMode: (e.target as HTMLInputElement).value })));
  themeRadios.forEach(r => r.addEventListener('change', e => {
    const t = (e.target as HTMLInputElement).value;
    chrome.storage.local.set({ theme: t });
    updatePanels(t);
  }));

  [termBg, termText, mechBg, mechText].forEach(input => {
    input.addEventListener('input', () => saveColors()); 
  });
});
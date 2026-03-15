interface DragState {
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
}

type DisplayMode = 'single' | 'burst';
type Theme = 'terminal' | 'mechanical';

class KeystrokeHUD {
    private isActive: boolean;
    private displayMode: DisplayMode;
    private theme: Theme;
    private autoHide: boolean;
    private displayElement: HTMLDivElement | null;
    private styleElement: HTMLStyleElement | null;
    private timeoutId: number | null;
    private dragState: DragState;
    private terminalBurstBuffer: string[]; 

    constructor() {
        this.isActive = false;
        this.displayMode = 'single';
        this.theme = 'mechanical';
        this.autoHide = true;
        this.displayElement = null;
        this.styleElement = null;
        this.timeoutId = null;
        this.terminalBurstBuffer = [];
        
        this.dragState = { isDragging: false, offsetX: 0, offsetY: 0 };

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }

    public init(): void {
        chrome.storage.local.get(null, (result: { [key: string]: any }) => {
            this.displayMode = result.displayMode || 'single';
            this.theme = result.theme || 'mechanical';
            this.autoHide = result.autoHide !== false; 
            if (result.isVisualizerActive) {
                this.mount();
            }
            this.updateCSSVariables(result);
        });

        chrome.storage.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.displayMode) {
                this.displayMode = changes.displayMode.newValue as DisplayMode;
                this.clearDisplay();
            }
            if (changes.theme) {
                this.theme = changes.theme.newValue as Theme;
                if (this.displayElement) {
                    this.displayElement.className = `kv-theme-${this.theme}`;
                    this.clearDisplay();
                }
            }
            if (changes.autoHide) {
                this.autoHide = changes.autoHide.newValue;
                if (this.autoHide && this.displayElement && this.displayElement.classList.contains('kv-visible')) {
                    this.startHideTimeout();
                } else if (!this.autoHide && this.timeoutId !== null) {
                    window.clearTimeout(this.timeoutId);
                    this.timeoutId = null;
                }
            }
            if (changes.isVisualizerActive) {
                if (changes.isVisualizerActive.newValue) {
                    this.mount();
                } else {
                    this.unmount();
                }
            }
            
            // Update live colors if they change in the options page
            if (changes.termBg || changes.termText || changes.mechBg || changes.mechText || changes.mechShadow || changes.mechBorder) {
                chrome.storage.local.get(null, (res) => this.updateCSSVariables(res));
            }
        });
    }

    private updateCSSVariables(res: { [key: string]: any }): void {
        if (!this.displayElement) return;
        
        const hex = (res.termBg || '#000000').replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;
        const termBgRgba = `rgba(${r}, ${g}, ${b}, 0.85)`;

        this.displayElement.style.setProperty('--term-bg', termBgRgba);
        this.displayElement.style.setProperty('--term-text', res.termText || '#00ff00');
        
        this.displayElement.style.setProperty('--mech-bg', res.mechBg || '#ffffff');
        this.displayElement.style.setProperty('--mech-text', res.mechText || '#000000');
        this.displayElement.style.setProperty('--mech-shadow', res.mechShadow || '#111111');
        this.displayElement.style.setProperty('--mech-border', res.mechBorder || '#111111');
    }

    private clearDisplay(): void {
        if (this.displayElement) this.displayElement.innerHTML = '';
        this.terminalBurstBuffer = [];
    }

    private mount(): void {
        if (this.isActive) return;
        this.isActive = true;

        this.styleElement = document.createElement('style');
        this.styleElement.id = 'kv-styles';
        this.styleElement.textContent = `
            #kv-display {
                position: fixed;
                bottom: 50px;
                left: 50px;
                z-index: 2147483647;
                cursor: grab;
                user-select: none;
                pointer-events: auto;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s ease-out, visibility 0.2s ease-out;
                box-sizing: border-box;

                /* Default Fallback Variables */
                --term-bg: rgba(0, 0, 0, 0.85);
                --term-text: #00ff00;
                --mech-bg: #ffffff;
                --mech-text: #000000;
                --mech-shadow: #111111;
                --mech-border: #111111;
            }
            #kv-display.kv-visible { opacity: 1; visibility: visible; }
            #kv-display:active { cursor: grabbing; }

            /* =========================================
               THEME: TERMINAL
               ========================================= */
            #kv-display.kv-theme-terminal {
                padding: 12px 20px;
                background: var(--term-bg);
                color: var(--term-text);
                border: 1px solid rgba(255,255,255,0.1);
                font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
                font-size: 19px;
                font-weight: bold;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                min-width: 100px;
                text-align: center;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
            }
            .kv-theme-terminal.kv-animate { animation: kv-blink-term 0.12s ease-out; }
            @keyframes kv-blink-term {
                0% { transform: scale(0.95); opacity: 0.7; }
                100% { transform: scale(1); opacity: 1; }
            }

            /* =========================================
               THEME: MECHANICAL
               ========================================= */
            #kv-display.kv-theme-mechanical {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 16px;
                box-shadow: rgba(0, 0, 0, 0.1) 0px 4px 30px;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 16px 8px 10px;
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
            }
            .kv-combo-group { display: flex; gap: 6px; }
            
            .kv-key-base { 
                position: relative; 
                background-color: var(--mech-shadow); 
                border-radius: 16px; 
                box-shadow: 0 4px 0 rgba(0,0,0,0.8), 0 6px 12px rgba(0,0,0,0.5); 
                height: 52px; 
            }
            
            /* Uses the custom border, background, and text color */
            .kv-key-top { 
                position: relative; 
                bottom: 8px; 
                background-color: var(--mech-bg); 
                color: var(--mech-text); 
                border: 1.5px solid var(--mech-border); 
                border-radius: 12px; 
                height: 100%; 
                padding: 0 18px; 
                font-family: 'JetBrains Mono', 'SF Mono', monospace; 
                font-size: 24px; 
                font-weight: 800; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                min-width: 28px; 
                box-sizing: border-box; 
                transition: filter 0.1s;
            }
            
            .kv-key-top.kv-space { min-width: 120px; }
            
            /* REPLACED background swap with brightness filter */
            .kv-key-held { 
                bottom: 0px !important; 
                filter: brightness(0.85); 
                transition: bottom 0.05s, filter 0.05s; 
            }
            
            .kv-key-tap { animation: mechanical-press 0.12s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
            
            @keyframes mechanical-press {
                0% { bottom: 8px; filter: brightness(1); }
                40% { bottom: 0px; filter: brightness(0.85); }
                100% { bottom: 8px; filter: brightness(1); }
            }
        `;
        document.head.appendChild(this.styleElement);

        this.displayElement = document.createElement('div');
        this.displayElement.id = 'kv-display';
        this.displayElement.className = `kv-theme-${this.theme}`;
        document.body.appendChild(this.displayElement);

        // Fetch colors immediately upon mount
        chrome.storage.local.get(null, (res) => this.updateCSSVariables(res));

        window.addEventListener('keydown', this.handleKeyDown, true);
        this.displayElement.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    }

    private unmount(): void {
        if (!this.isActive) return;
        this.isActive = false;

        window.removeEventListener('keydown', this.handleKeyDown, true);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);

        if (this.displayElement) this.displayElement.remove();
        if (this.styleElement) this.styleElement.remove();
        
        this.displayElement = null;
        this.styleElement = null;
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    private startHideTimeout(): void {
        if (this.timeoutId !== null) window.clearTimeout(this.timeoutId);
        
        this.timeoutId = window.setTimeout(() => {
            if (this.displayElement) {
                this.displayElement.classList.remove('kv-visible');
                setTimeout(() => {
                    if (this.displayElement && !this.displayElement.classList.contains('kv-visible')) {
                        this.clearDisplay(); 
                    }
                }, 200);
            }
        }, 1000);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.displayElement) return;

        let keyText: string[] = [];
        if (e.metaKey) keyText.push('⌘');
        if (e.ctrlKey) keyText.push('Ctrl');
        if (e.altKey) keyText.push('⌥');
        if (e.shiftKey) keyText.push('⇧');

        let mainKey: string = e.key;
        if (mainKey === 'Dead' || e.keyCode === 229) {
            mainKey = e.code.replace(/^(Key|Digit)/, '');
        }

        const isStandardSpace = mainKey === ' ';
        mainKey = isStandardSpace ? '␣' : mainKey.toUpperCase();

        if (!['META', 'CONTROL', 'ALT', 'SHIFT'].includes(mainKey)) {
            keyText.push(mainKey);
        }

        if (this.theme === 'terminal') {
            const shortcutStr = keyText.join(' + ');

            if (this.displayMode === 'single') {
                this.displayElement.innerText = shortcutStr;
            } else {
                if (e.key === 'Backspace') {
                    this.terminalBurstBuffer.pop();
                } else {
                    const isSingleChar = keyText.length === 1 && e.key.length === 1 && !isStandardSpace;
                    if (isSingleChar) {
                        this.terminalBurstBuffer.push(e.key);
                    } else if (isStandardSpace) {
                        this.terminalBurstBuffer.push(' ');
                    } else {
                        this.terminalBurstBuffer.push(` [${shortcutStr}] `);
                    }
                }
                this.displayElement.innerText = this.terminalBurstBuffer.join('') || '...';
            }

            this.displayElement.classList.remove('kv-animate');
            void this.displayElement.offsetWidth; 
            this.displayElement.classList.add('kv-animate');

        } else if (this.theme === 'mechanical') {
            const renderBlock = (keys: string[]) => {
                return keys.map((k, index) => {
                    const isLast = index === keys.length - 1;
                    const actionClass = isLast ? 'kv-key-tap' : 'kv-key-held';
                    const spaceClass = k === '␣' ? 'kv-space' : '';
                    return `
                        <div class="kv-key-base">
                            <div class="kv-key-top ${actionClass} ${spaceClass}">${k}</div>
                        </div>
                    `;
                }).join('');
            };

            const comboDiv = document.createElement('div');
            comboDiv.className = 'kv-combo-group';
            comboDiv.innerHTML = renderBlock(keyText);

            if (this.displayMode === 'single') {
                this.displayElement.innerHTML = '';
                this.displayElement.appendChild(comboDiv);
            } else {
                if (e.key === 'Backspace') {
                    if (this.displayElement.lastChild) {
                        this.displayElement.lastChild.remove();
                    }
                } else {
                    this.displayElement.appendChild(comboDiv);
                }
            }
        }

        this.displayElement.classList.add('kv-visible');

        if (this.timeoutId !== null) {
            window.clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        if (this.autoHide) {
            this.startHideTimeout();
        }
    }

    private handleMouseDown(e: MouseEvent): void {
        if (!this.displayElement) return;
        this.dragState.isDragging = true;
        const rect = this.displayElement.getBoundingClientRect();
        this.dragState.offsetX = e.clientX - rect.left;
        this.dragState.offsetY = e.clientY - rect.top;
    }

    private handleMouseMove(e: MouseEvent): void {
        if (!this.dragState.isDragging || !this.displayElement) return;
        this.displayElement.style.left = `${e.clientX - this.dragState.offsetX}px`;
        this.displayElement.style.top = `${e.clientY - this.dragState.offsetY}px`;
        this.displayElement.style.bottom = 'auto'; 
        this.displayElement.style.right = 'auto';
    }

    private handleMouseUp(): void {
        this.dragState.isDragging = false;
    }
}

const visualizer = new KeystrokeHUD();
visualizer.init();
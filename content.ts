interface DragState {
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
}

type DisplayMode = 'single' | 'burst';

class KeystrokeHUD {
    private isActive: boolean;
    private displayMode: DisplayMode;
    private autoHide: boolean;
    private displayElement: HTMLDivElement | null;
    private styleElement: HTMLStyleElement | null;
    private timeoutId: number | null;
    private dragState: DragState;

    constructor() {
        this.isActive = false;
        this.displayMode = 'single';
        this.autoHide = true;
        this.displayElement = null;
        this.styleElement = null;
        this.timeoutId = null;
        
        this.dragState = { isDragging: false, offsetX: 0, offsetY: 0 };

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }

    public init(): void {
        chrome.storage.local.get(['isVisualizerActive', 'displayMode', 'autoHide'], (result: { [key: string]: any }) => {
            this.displayMode = result.displayMode || 'single';
            this.autoHide = result.autoHide !== false; // default true
            if (result.isVisualizerActive) {
                this.mount();
            }
        });

        chrome.storage.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }) => {
            if (changes.displayMode) {
                this.displayMode = changes.displayMode.newValue as DisplayMode;
                if (this.displayElement) this.displayElement.innerHTML = ''; 
            }
            if (changes.autoHide) {
                this.autoHide = changes.autoHide.newValue;
                if (this.autoHide && this.displayElement && this.displayElement.classList.contains('kv-visible')) {
                    // If turned on while keys are showing, trigger the fade out
                    this.startHideTimeout();
                } else if (!this.autoHide && this.timeoutId !== null) {
                    // If turned off, cancel any pending fade out
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
        });
    }

    private mount(): void {
        if (this.isActive) return;
        this.isActive = true;

        this.styleElement = document.createElement('style');
        this.styleElement.id = 'kv-styles';
        this.styleElement.textContent = `
            /* The Glass Container */
            #kv-display {
                position: fixed;
                bottom: 50px;
                left: 50px;
                inset: 193px auto auto 425px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 16px;
                box-shadow: rgba(0, 0, 0, 0.1) 0px 4px 30px;
                backdrop-filter: blur(5px);
                border: 1px solid rgba(255, 255, 255, 0.3);
                padding: 16px 8px 10px;
                border-radius: 12px;
                z-index: 2147483647;
                cursor: grab;
                user-select: none;
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                pointer-events: auto;
                
                /* Auto-hide states */
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s ease-out, visibility 0.2s ease-out;
            }
            #kv-display.kv-visible {
                opacity: 1;
                visibility: visible;
            }
            #kv-display:active { cursor: grabbing; }

            /* Grouping for Shortcuts (e.g. ⌘ + C) */
            .kv-combo-group {
                display: flex;
                gap: 6px;
            }

            /* --- The 3D Mechanical Key Architecture --- */
            .kv-key-base {
                position: relative;
                background-color: #111; 
                border-radius: 16px;
                box-shadow: 0 4px 0 #000, 0 6px 12px rgba(0,0,0,0.5); 
                height: 52px;
            }

            .kv-key-top {
                position: relative;
                bottom: 8px; 
                background-color: #ffffff;
                color: #000;
                border: 1.5px solid #111;
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
                
                animation: mechanical-press 0.12s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            .kv-key-top.kv-space {
                min-width: 120px;
            }

            @keyframes mechanical-press {
                0% { bottom: 8px; }
                40% { bottom: 0px; background-color: #e4e4e7; } 
                100% { bottom: 8px; background-color: #ffffff; } 
            }
        `;
        document.head.appendChild(this.styleElement);

        this.displayElement = document.createElement('div');
        this.displayElement.id = 'kv-display';
        document.body.appendChild(this.displayElement);

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
                // Wait for opacity transition before clearing DOM
                setTimeout(() => {
                    if (this.displayElement && !this.displayElement.classList.contains('kv-visible')) {
                        this.displayElement.innerHTML = ''; 
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

        mainKey = mainKey === ' ' ? '␣' : mainKey.toUpperCase();

        if (!['META', 'CONTROL', 'ALT', 'SHIFT'].includes(mainKey)) {
            keyText.push(mainKey);
        }

        const renderBlock = (keys: string[]) => {
            return keys.map(k => `
                <div class="kv-key-base">
                    <div class="kv-key-top ${k === '␣' ? 'kv-space' : ''}">${k}</div>
                </div>
            `).join('');
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

        this.displayElement.classList.add('kv-visible');

        if (this.timeoutId !== null) {
            window.clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        // Only trigger the hide countdown if autoHide is enabled
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
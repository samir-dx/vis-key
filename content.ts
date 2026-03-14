interface DragState {
    isDragging: boolean;
    offsetX: number;
    offsetY: number;
}

class KeystrokeHUD {
    private isActive: boolean;
    private displayElement: HTMLDivElement | null;
    private styleElement: HTMLStyleElement | null;
    private timeoutId: number | null; // Using number for browser setTimeout
    private dragState: DragState;

    constructor() {
        this.isActive = false;
        this.displayElement = null;
        this.styleElement = null;
        this.timeoutId = null;
        
        this.dragState = { isDragging: false, offsetX: 0, offsetY: 0 };

        // Bind methods to preserve 'this' context for event listeners
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }

    public init(): void {
        // Check initial state
        chrome.storage.local.get(['isVisualizerActive'], (result: { [key: string]: any }) => {
            if (result.isVisualizerActive) {
                this.mount();
            }
        });

        // Listen for toggle changes from the popup
        chrome.storage.onChanged.addListener((changes: { [key: string]: chrome.storage.StorageChange }) => {
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

        // 1. Inject Styles
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'kv-styles';
        this.styleElement.textContent = `
            #kv-display {
                position: fixed;
                bottom: 50px;
                left: 50px;
                padding: 12px 20px;
                background: rgba(0, 0, 0, 0.85);
                color: #00ff00; 
                border: 1px solid #444;
                font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
                font-size: 19px;
                font-weight: bold;
                border-radius: 8px;
                z-index: 2147483647; /* Max z-index */
                cursor: grab;
                user-select: none;
                box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                min-width: 100px;
                text-align: center;
                pointer-events: auto;
            }
            #kv-display:active { cursor: grabbing; }
            .kv-animate { animation: kv-blink 0.12s ease-out; }
            @keyframes kv-blink {
                0% { background: rgba(30, 30, 30, 0.9); transform: scale(0.95); color: #06402B; } 
                100% { background: rgba(0, 0, 0, 0.85); transform: scale(1); color: #00ff00; } 
            }
        `;
        document.head.appendChild(this.styleElement);

        // 2. Inject DOM
        this.displayElement = document.createElement('div');
        this.displayElement.id = 'kv-display';
        this.displayElement.innerText = 'Ready...';
        document.body.appendChild(this.displayElement);

        // 3. Attach Listeners
        window.addEventListener('keydown', this.handleKeyDown, true);
        this.displayElement.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    }

    private unmount(): void {
        if (!this.isActive) return;
        this.isActive = false;

        // Clean up Listeners
        window.removeEventListener('keydown', this.handleKeyDown, true);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);

        // Clean up DOM
        if (this.displayElement) this.displayElement.remove();
        if (this.styleElement) this.styleElement.remove();
        
        this.displayElement = null;
        this.styleElement = null;
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    private handleKeyDown(e: KeyboardEvent): void {
        if (!this.displayElement) return;

        let keyText: string[] = [];
        if (e.metaKey) keyText.push('⌘');
        if (e.ctrlKey) keyText.push('Ctrl');
        if (e.altKey) keyText.push('⌥');
        if (e.shiftKey && e.key !== 'Shift') keyText.push('⇧');

        // Robust key parsing to handle macOS "Dead" keys gracefully
        let mainKey: string = e.key;
        if (mainKey === 'Dead' || e.keyCode === 229) {
            mainKey = e.code.replace(/^(Key|Digit)/, '');
        }

        mainKey = mainKey === ' ' ? 'SPACE' : mainKey.toUpperCase();

        if (!['META', 'CONTROL', 'ALT', 'SHIFT'].includes(mainKey)) {
            keyText.push(mainKey);
        }

        this.displayElement.innerText = keyText.join(' + ');

        // Animation logic
        this.displayElement.classList.remove('kv-animate');
        void this.displayElement.offsetWidth; // Force reflow
        this.displayElement.classList.add('kv-animate');

        // Inactivity reset
        if (this.timeoutId !== null) clearTimeout(this.timeoutId);
        this.timeoutId = window.setTimeout(() => {
            if (this.displayElement) {
                this.displayElement.innerText = '...';
                this.displayElement.classList.remove('kv-animate');
            }
        }, 1800);
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
        this.displayElement.style.bottom = 'auto'; // Prevent CSS conflicts
        this.displayElement.style.right = 'auto';
    }

    private handleMouseUp(): void {
        this.dragState.isDragging = false;
    }
}

// Instantiate and initialize the HUD
const visualizer = new KeystrokeHUD();
visualizer.init();
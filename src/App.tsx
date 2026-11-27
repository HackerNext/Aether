@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html,
  body {
    background-color: #07090D;
    color: #F1F5F9;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    margin: 0;
    padding: 0;
    height: auto;
    min-height: 100%;
    overflow: visible;
    -webkit-overflow-scrolling: touch;
    -webkit-tap-highlight-color: transparent;
  }

  #root {
    min-height: 100%;
    overflow-x: clip;
  }
}

.tabular-mono {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
  font-variant-numeric: tabular-nums;
}

.aether-card {
  background: rgba(14, 19, 28, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.075);
  box-shadow: 0 10px 32px -12px rgba(0, 0, 0, 0.72);
}

.aether-glass-elevated {
  background: rgba(17, 23, 35, 0.94);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.safe-top {
  padding-top: max(env(safe-area-inset-top), 14px);
}

.safe-bottom {
  padding-bottom: max(env(safe-area-inset-bottom), 14px);
}

::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
}

@keyframes pageEnter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-page {
  animation: pageEnter 180ms ease-out;
}

@keyframes pulseRing {
  0% { transform: scale(0.95); opacity: 0.75; }
  70% { transform: scale(1.45); opacity: 0; }
  100% { transform: scale(1.45); opacity: 0; }
}

.animate-pulse-ring {
  animation: pulseRing 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
  

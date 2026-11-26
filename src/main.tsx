import { Buffer } from 'buffer';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Polyfill Buffer for browser use (required by music-metadata-browser)
window.Buffer = Buffer;
window.process = { env: {} } as any;

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  declare props: { children: React.ReactNode };
  declare state: { hasError: boolean; errorMessage: string };
  declare setState: (nextState: Partial<{ hasError: boolean; errorMessage: string }>) => void;

  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unknown rendering error',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[SOLID AUDIO] Uncaught UI error:', error, info);
  }

  handleResetAndReload = () => {
    try {
      localStorage.removeItem('v2_solidSelectedCategoryFilter');
      localStorage.removeItem('v2_solidCascadeColWidths');
      localStorage.removeItem('v2_solidCascadeHeight');
      localStorage.removeItem('v2_solidCascadeFrostLevel');
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#0B0C0D] text-[#E1E4EA] font-mono flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-[#363d47] bg-[#121417] p-5 flex flex-col gap-3">
            <div className="text-xs tracking-widest uppercase font-bold text-[#ff5555]">
              SYSTEM RENDER RECOVERY
            </div>
            <div className="text-[11px] text-[#a0a8b5] leading-relaxed break-words">
              表示処理中にエラーを検出したため、暗転を防止してリカバリーモードへ移行しました。
            </div>
            <div className="text-[10px] border border-[#2a3038] bg-[#0B0C0D] p-2 text-[#8892a0] break-all">
              {this.state.errorMessage}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="flex-1 py-1.5 px-3 border border-[#363d47] bg-[#1a1e24] text-[10px] tracking-wider uppercase cursor-pointer hover:opacity-85"
              >
                RETRY RENDER
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="flex-1 py-1.5 px-3 border border-[#5da0ea] bg-[#1d2738] text-[#5da0ea] text-[10px] tracking-wider uppercase cursor-pointer hover:opacity-85"
              >
                RESET UI & RELOAD
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

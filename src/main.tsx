import { Buffer } from 'buffer';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Polyfill Buffer for browser use (required by music-metadata-browser)
window.Buffer = Buffer;
window.process = { env: {} } as any;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

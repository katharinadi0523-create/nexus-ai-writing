import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { IterationModeProvider } from './contexts/IterationModeContext';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <IterationModeProvider>
      <App />
    </IterationModeProvider>
  </React.StrictMode>
);

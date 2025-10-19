import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Safely get the root element with explicit null check
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('❌ FATAL: Root element #root not found in the document');
  throw new Error(
    'Failed to mount React app: root element not found. ' +
    'Ensure index.html contains a <div id="root"></div> element.'
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import StatsPage from './pages/StatsPage';
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
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/stats" element={<StatsPage />} />
      </Routes>
    </Router>
  </React.StrictMode>
);


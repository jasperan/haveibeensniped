
import React from 'react';
import ReactDOM from 'react-dom/client';
import './src/index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: white; background: #1e1b4b; min-height: 100vh;">
      <h1>Error Loading Application</h1>
      <p></p>
      <p>Check the browser console for more details.</p>
    </div>
  `;
  // Set the message as text rather than interpolating it into HTML.
  const messageElement = rootElement.querySelector('p');
  if (messageElement) {
    messageElement.textContent = error instanceof Error ? error.message : 'Unknown error';
  }
}
import './src/scout.css';

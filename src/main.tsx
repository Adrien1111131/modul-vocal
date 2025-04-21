import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

// Utilisation de la création du root avec le non-null assertion operator
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
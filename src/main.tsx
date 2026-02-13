import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global error handlers — prevent silent white screen on chunk/network failures
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global] Unhandled promise rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  console.error('[Global] Uncaught error:', event.error || event.message);
});

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for offline caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// v10: register service worker for offline shell + asset caching.
// Production-only — we don't want SW caching interfering with vite-dev HMR.
// Intentionally bare; the SW (`/sw.js`) defines its own caching strategy.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      // Don't break the app if SW registration fails (private mode,
      // disabled flag, etc.) — log to the dev console only.
      // eslint-disable-next-line no-console
      console.warn('[unigo] SW registration failed:', err);
    });
  });
}

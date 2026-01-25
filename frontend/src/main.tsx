import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found. Make sure index.html has a div with id='root'");
  }
  
  const root = createRoot(rootElement);
  root.render(<App />);
} catch (error) {
  console.error("Failed to render app:", error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : '';
  
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #f3f4f6;">
      <div style="text-align: center; padding: 2rem; max-width: 600px;">
        <h1 style="color: #dc2626; margin-bottom: 1rem; font-size: 1.5rem; font-weight: bold;">Failed to load application</h1>
        <p style="color: #6b7280; margin-bottom: 0.5rem; font-size: 1rem;">${errorMessage}</p>
        ${errorStack ? `<pre style="text-align: left; background: #1f2937; color: #f3f4f6; padding: 1rem; border-radius: 0.375rem; overflow-x: auto; font-size: 0.75rem; margin: 1rem 0;">${errorStack}</pre>` : ''}
        <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; background: #2563eb; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 1rem;">
          Reload Page
        </button>
      </div>
    </div>
  `;
}

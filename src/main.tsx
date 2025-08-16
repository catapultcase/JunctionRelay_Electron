// renderer/src/main.tsx (or index.tsx if that's your file name)
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Use the existing types from electron-env.d.ts
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Safe demo listener (optional)
window.ipcRenderer?.on("main-process-message", (_event, message) => {
  console.log(message);
});
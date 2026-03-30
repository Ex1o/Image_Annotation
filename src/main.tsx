import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/axios-setup.ts"; // Setup axios interceptors

createRoot(document.getElementById("root")!).render(<App />);

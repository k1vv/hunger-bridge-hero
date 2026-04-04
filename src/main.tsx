import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Load AI matching verification utilities (available as window.aiMatching)
import "./lib/ai/verify";

createRoot(document.getElementById("root")!).render(<App />);

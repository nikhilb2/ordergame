import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { captureLogKey } from "./games/daily/attemptLog";

captureLogKey();
// Opening the link in a tab already on the site changes only the hash, with no page load.
window.addEventListener("hashchange", () => {
  if (captureLogKey()) window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);

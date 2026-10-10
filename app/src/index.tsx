import { render } from "@solidjs/web";
import App from "./App";
import "./index.css";
import { initLocale } from "./lib/i18n";
import { initTheme } from "./lib/theme";

initTheme();
initLocale();

const root = document.getElementById("root");
if (!root) {
  throw new Error("missing #root");
}

render(() => <App />, root);

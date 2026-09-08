import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { hashFromLocation } from "./lib/serialize";
import { usePlannerStore } from "./store/usePlannerStore";
import "./index.css";

function applyHashPlan() {
  const doc = hashFromLocation();
  if (doc) {
    usePlannerStore.getState().hydrateFromDocument(doc);
  }
}

if (usePlannerStore.persist.hasHydrated()) {
  applyHashPlan();
} else {
  const unsub = usePlannerStore.persist.onFinishHydration(() => {
    applyHashPlan();
    unsub();
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

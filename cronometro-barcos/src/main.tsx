import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import AuthGate from "./components/AuthGate";
import RoomGate from "./components/RoomGate";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthGate>
      <RoomGate>
        <App />
      </RoomGate>
    </AuthGate>
  </StrictMode>
);

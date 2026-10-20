import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";

import "./index.css";
import "./App.css";
import "./dashboard-layout.css";
import "./light-theme.css";
import "./student-resources-dark.css";
import "./student-dark-theme.css";
import "./sidebar-palette.css";
import "./landing-palette.css";
import "./landing-sample.css";
import "./responsive.css";
import "./appearance.css";
import "./components/auth/AuthPalette.css";
import "./navigation-glass.css";
import "./student-overview-glass.css";
import "./student-overview-organized.css";
import "./management-overview.css";
import "./admin-overview-operations.css";
import "./dashboard-motion.css";
import "./pages/Auth/Allocations.css";
import { initializeAppearance } from "./utils/appearance";

initializeAppearance();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { startSessionWatch } from "./services/session";

import "./assets/style/global.css";

startSessionWatch();

ReactDOM.createRoot(
    document.getElementById("root")
).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ProPage from "./ProPage";

const root = ReactDOM.createRoot(document.getElementById("root"));
const page = window.location.pathname === "/pro" ? <ProPage /> : <App />;

root.render(
  <React.StrictMode>
    {page}
  </React.StrictMode>
);

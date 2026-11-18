import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { TrainingCheckPage } from "./features/simulation/components/TrainingCheckPage"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {new URLSearchParams(window.location.search).get("view") === "training-check" ? <TrainingCheckPage /> : <App />}
  </React.StrictMode>,
)

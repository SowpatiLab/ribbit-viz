import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import GenomeTracker from './GenomeTracker.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GenomeTracker/>
  </StrictMode>,
)

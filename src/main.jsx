import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import TargetCursor from './TargetCursor.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <TargetCursor spinDuration={2} hideDefaultCursor={true} />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initNativeAuth } from './utils/nativeAuth'
import { initNativeUi } from './utils/initNativeUi'

initNativeAuth()
initNativeUi()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

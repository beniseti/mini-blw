import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ToastProvider } from './components/ui/Toast'
import { AppStoreProvider } from './store/AppStore'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStoreProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AppStoreProvider>
  </StrictMode>,
)

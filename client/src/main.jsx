import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './contexts/ThemeContext'
import { FeaturesProvider } from './contexts/FeaturesContext'
import './i18n' // Initialize internationalization
import './styles/theme.css' // Import styling variables
import './styles/global.css' // Import global reset
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FeaturesProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </FeaturesProvider>
  </StrictMode>,
)

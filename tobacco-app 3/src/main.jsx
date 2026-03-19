import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.jsx'
import './index.css'

const KEYBOARD_HEIGHT_THRESHOLD = 120
const MAX_ANDROID_SAFE_TOP = 48

const applyNativeSafeInsetTop = () => {
  if (typeof window === 'undefined') return

  const isNative = typeof Capacitor?.isNativePlatform === 'function' && Capacitor.isNativePlatform()
  if (!isNative) {
    document.documentElement.style.setProperty('--native-safe-top', '0px')
    return
  }

  const platform = typeof Capacitor?.getPlatform === 'function' ? Capacitor.getPlatform() : ''
  const viewportHeight = window.visualViewport?.height || window.innerHeight || 0
  const screenHeight = window.screen?.height || viewportHeight
  const inferredInset = Math.max(0, Math.round(screenHeight - viewportHeight))
  const keyboardLikelyOpen = inferredInset > KEYBOARD_HEIGHT_THRESHOLD

  document.documentElement.classList.toggle('keyboard-open', keyboardLikelyOpen)

  if (keyboardLikelyOpen) {
    return
  }

  const minimumInset = platform === 'android' ? 24 : 0
  const maximumInset = platform === 'android' ? MAX_ANDROID_SAFE_TOP : 80
  const inset = Math.min(maximumInset, Math.max(minimumInset, inferredInset))
  document.documentElement.style.setProperty('--native-safe-top', `${inset}px`)
}

applyNativeSafeInsetTop()
window.addEventListener('resize', applyNativeSafeInsetTop)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

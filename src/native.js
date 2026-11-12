// 안드로이드 앱(Capacitor)에서만 하는 일. 웹에서는 아무것도 하지 않습니다.
import { Capacitor } from '@capacitor/core'

let dialog = null // 열려 있는 "앱을 종료할까요?" 창
const PRESSES = 3 // 첫 화면에서 뒤로가기를 이만큼 연달아 누르면 종료할지 물어봅니다
const WINDOW_MS = 1500 // "연달아"로 치는 간격
let presses = 0
let lastPress = 0

// 뒤로 갈 화면이 없을 때 "앱을 종료할까요?"를 묻고, 예를 누르면 앱을 닫습니다
function askExit(App) {
  if (dialog) return
  dialog = document.createElement('div')
  dialog.className = 'exit-dialog'
  dialog.innerHTML = `
    <div class="exit-dialog-box" role="alertdialog" aria-modal="true" aria-labelledby="exit-dialog-title">
      <p id="exit-dialog-title">앱을 종료할까요?</p>
      <div class="exit-dialog-actions">
        <button type="button" data-answer="no">아니오</button>
        <button type="button" class="primary" data-answer="yes">예</button>
      </div>
    </div>`
  dialog.addEventListener('click', (e) => {
    const answer = e.target.closest('button')?.dataset.answer
    if (answer === 'yes') App.exitApp()
    else if (answer === 'no' || e.target === dialog) closeExitDialog() // 바깥(어두운 곳)을 눌러도 닫힘
  })
  document.body.appendChild(dialog)
  dialog.querySelector('[data-answer="yes"]').focus()
}

export async function setupNative() {
  if (!Capacitor.isNativePlatform()) return
  document.documentElement.classList.add('is-app')
  const { App } = await import('@capacitor/app')
  // 안드로이드 뒤로가기: 이전 화면이 있으면 뒤로.
  // 더 갈 곳이 없으면 1.5초 안에 3번 연달아 눌렀을 때 종료할지 물어봅니다 (1·2번째는 아무 반응 없음)
  // (HashRouter 라서 첫 화면은 주소의 # 뒤가 비어 있거나 "#/" 입니다)
  App.addListener('backButton', ({ canGoBack }) => {
    if (dialog) return closeExitDialog() // 묻는 창이 떠 있을 때 뒤로가기 = 아니오
    const atHome = ['', '#', '#/'].includes(window.location.hash)
    if (canGoBack && !atHome) {
      presses = 0
      return window.history.back()
    }
    const now = Date.now()
    presses = now - lastPress <= WINDOW_MS ? presses + 1 : 1
    lastPress = now
    if (presses < PRESSES) return // 1·2번째는 아무것도 하지 않습니다
    presses = 0
    askExit(App)
  })
}

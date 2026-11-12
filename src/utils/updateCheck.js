// 새 버전 확인: 앱(또는 탭)을 오래 켜 둔 채 사이트가 새로 배포되면, 예전 코드가 계속 돌면서
// 바뀐 보안 규칙과 맞지 않아 저장이 거부될 수 있습니다. 화면으로 돌아올 때마다 서버의 index.html 이
// 가리키는 파일 이름(빌드마다 바뀜)을 지금 것과 비교하고, 다르면 새로 불러옵니다.
// 입력 중인 글이 있으면 날아가지 않도록 새로고침하지 않습니다.
const currentScript = () => document.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute('src')

export async function isOutdated() {
  const mine = currentScript()
  if (!mine) return false // 개발 서버
  try {
    const html = await (await fetch('/', { cache: 'no-store' })).text()
    const latest = html.match(/<script[^>]+type="module"[^>]+src="([^"]*\/assets\/[^"]+)"/)?.[1]
    return Boolean(latest && latest !== mine)
  } catch {
    return false // 인터넷이 끊겼을 때 등
  }
}

const isTyping = () => [...document.querySelectorAll('textarea, input[type="text"], input:not([type])')].some((el) => el.value.trim())

let checking = false
async function checkAndReload() {
  if (checking || document.visibilityState !== 'visible') return
  checking = true
  try {
    if ((await isOutdated()) && !isTyping()) location.reload()
  } finally {
    checking = false
  }
}

export function setupUpdateCheck() {
  if (!import.meta.env.PROD) return
  document.addEventListener('visibilitychange', checkAndReload)
  setInterval(checkAndReload, 30 * 60 * 1000) // 켜 둔 채로 오래 있어도 30분마다
}

// 저장이 권한 문제로 거부됐을 때의 안내 (예전 코드가 돌고 있을 가능성이 커서 새로고침을 권합니다)
export function friendlySaveError(e) {
  const denied = e?.code === 'permission-denied' || /insufficient permissions/i.test(e?.message ?? '')
  if (!denied) return e?.message ?? String(e)
  return '앱이 새 버전으로 바뀌었을 수 있어요. 앱을 완전히 껐다 켠 뒤(웹은 새로고침) 다시 시도해 주세요.'
}

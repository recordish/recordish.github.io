// Recordish 서비스 워커
// - 화면(HTML): 항상 서버에 최신인지 확인하고 받습니다(브라우저 저장본 10분 캐시를 건너뜀).
//   그래서 배포하면 다음에 열 때 바로 바뀝니다. 인터넷이 끊기면 오프라인 안내 화면을 보여줍니다
// - 빌드된 파일(/assets/*): 이름에 버전이 들어 있어 바뀌지 않으므로 한 번 받으면 저장해 두고 씁니다
// - 그 외(Firebase 등 다른 주소): 건드리지 않습니다
const CACHE = 'recordish-v2'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' }).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
  }
})

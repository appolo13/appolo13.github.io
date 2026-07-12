// KTR 리스크 계산기 서비스워커
// 문서(index)는 네트워크 우선 → 온라인이면 항상 최신. 오프라인이면 캐시.
// 아이콘 등 정적 자산은 캐시 우선.
const CACHE = 'ktr-risk-v11';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.endsWith('gold-api.com')) return;                 // 가격 API: SW 관여 X
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  const isDoc = e.request.mode === 'navigate' ||
                url.pathname.endsWith('/') || url.pathname.endsWith('index.html');

  if (isDoc) {
    // 네트워크 우선 (최신 반영), 실패 시 캐시
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html')))
    );
  } else {
    // 정적 자산: 캐시 우선
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        if (res.ok) { const c = res.clone(); caches.open(CACHE).then(cc => cc.put(e.request, c)); }
        return res;
      }))
    );
  }
});

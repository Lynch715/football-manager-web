/* 足球经理 · Service Worker
   策略：网络优先 + 超时回落。联网正常时拿最新版本；网络慢或半死不活（挂 VPN、弱信号）时
   最多等 NET_TIMEOUT 就直接吃缓存开局，网络请求继续在后台跑完并更新缓存，下次打开就是新版。
   以前是纯网络优先、不设超时：fetch 既不成功也不失败时会一直转，主屏图标点开是白屏转好几分钟。*/
const VERSION = "fmweb-v34";
const NET_TIMEOUT = 2500;   // ms
/* 存档桶：游戏把存档也放在 Cache Storage 里做冗余，清理资源缓存时绝不能连它一起删 */
const SAVE_CACHE = "fmweb-saves";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== SAVE_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith(handle(e, req));
});

async function handle(e, req) {
  // 网络这一路无论用不用得上都要跑完，顺手把新版本写进缓存
  const net = fetch(req).then(res => {
    const copy = res.clone();
    caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
    return res;
  });
  net.catch(() => {});                  // 超时后没人接这个 promise，先挂个空 handler
  e.waitUntil(net.catch(() => {}));     // 已经拿缓存应付过去了，也别把 SW 提前杀掉

  const cached = await caches.match(req);
  if (!cached) {
    // 缓存里没有，只能等网络；网络也挂了就退回首页（SPA 单文件，首页就是全部）
    try { return await net; }
    catch (err) { return (await caches.match("./index.html")) || Response.error(); }
  }
  // 有缓存：网络和计时器赛跑，超时就先用缓存把人放进游戏
  let timer;
  try {
    return await Promise.race([
      net,
      new Promise((_, rej) => { timer = setTimeout(() => rej(new Error("net-timeout")), NET_TIMEOUT); })
    ]);
  } catch (err) {
    return cached;
  } finally {
    clearTimeout(timer);
  }
}

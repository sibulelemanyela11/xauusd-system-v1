const CACHE="gold-signal-shell-v1";
const SHELL=["/","/index.html","/style.css","/app.js","/pwa.js","/manifest.webmanifest","/icon.svg"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 const url=new URL(event.request.url);
 if(url.origin!==location.origin||url.pathname.startsWith("/api/"))return;
 if(event.request.method!=="GET")return;
 event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match("/index.html"))));
});

/* SC Lions d'Eugies — service worker : notifications + page hors ligne. */
const CACHE = "lions-v4"; // change this number to wipe old copies kept by phones and browsers
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/icon-192.png", "/crest.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// Pages always come from the network (fresh club data); offline → friendly page.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const titre = data.title || "SC Lions d'Eugies";
  // Red dot on the app icon until the message is read in the app (Courrier).
  try { if (self.navigator && self.navigator.setAppBadge) self.navigator.setAppBadge(); } catch (e) {}
  // Kitty gain while the app is open: the app shows « +20 € » with its « ting ».
  const cag = /^cag-/.test(data.tag || "") && data.montant > 0;
  const prevenir = cag
    ? self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => wins.forEach((w) => w.postMessage({ type: "cagnotte", montant: data.montant, libelle: data.libelle || "" })))
    : Promise.resolve();
  event.waitUntil(prevenir.then(() =>
    self.registration.showNotification(titre, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-maskable-192.png",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/", title: titre, body: data.body || "", tag: data.tag || "" },
      lang: "fr",
      vibrate: cag ? [60, 40, 60, 40, 200] : undefined,
    })),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // The app opens straight on a window with this message (details + the right link).
  const d = event.notification.data || {};
  const tag = d.tag || "";
  const type = /^msg-/.test(tag) ? "message" : /^(ins|dec|taches)/.test(tag) ? "relance" : "notification";
  // A light page made for this (/notif): it appears at once, the details come in behind.
  const p = new URLSearchParams({ titre: d.title || event.notification.title || "", texte: d.body || "", lien: d.url || "/", type });
  const url = new URL("/notif?" + p.toString(), self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith(self.location.origin) && "focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

# Go-Live Checkliste (Montags-Quiz / Admin in Production)

## 1) main pushen (falls noch nicht geschehen)

```bash
git checkout main
git push origin main
```

Falls der Merge von `feature/sales-swipe-challenge` noch nicht auf `main` ist, zuerst mergen, dann pushen.

## 2) Vercel – Production Redeploy

- Im **Vercel Dashboard** → dein Projekt → **Deployments**
- **Redeploy** des letzten Production-Deployments auslösen („Redeploy“ ohne Code-Änderung), **oder**
- Ein neuer Push auf `main` triggert automatisch einen neuen Production-Deploy

Stelle sicher, dass **Production Branch** in Vercel auf `main` steht (Settings → Git).

## 3) PWA / Service Worker – Cache

Die App ist eine PWA mit Service Worker (Workbox). Nach einem Redeploy kann der Browser noch alte Assets aus dem Cache liefern.

### Desktop (Chrome/Edge/Firefox)

- **Hard Reload:** `Ctrl+Shift+R` (Windows/Linux) bzw. `Cmd+Shift+R` (macOS), **oder**
- DevTools (F12) → Application → Storage → **Clear site data** (oder nur „Unregister“ beim Service Worker), dann Seite neu laden

### iPhone (Safari)

- **Option A:** Safari → Einstellungen → Datenschutz → Website-Daten → Website-Daten verwalten → deine App-Domain suchen → **Löschen**
- **Option B:** App zum Home-Bildschirm hinzugefügt (PWA): App schließen (aus dem App-Umschalter entfernen), Safari-Cache leeren (siehe oben), PWA erneut öffnen
- **Option C:** Private Tab nutzen und Seite neu aufrufen (kein alter SW)

### Allgemein

- Ein zweiter Besuch nach dem Redeploy lädt oft bereits den neuen Service Worker (Update-Check). Wenn der Link dann erscheint, war es Cache.

---

**Kurz:** main pushen → Vercel redeployt (oder manuell Redeploy) → ggf. Hard Reload / Cache leeren auf Geräten, auf denen die neuen Links fehlen.

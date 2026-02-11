# iPhone Testing (PWA)

## Warum `localhost` per AirDrop nicht geht

- `localhost` zeigt immer auf das **eigene** Geraet.
- Auf dem iPhone bedeutet `http://localhost:5173` also: iPhone selbst, nicht dein Mac.
- Daher kann ein per AirDrop geteilter `localhost`-Link die Mac-Dev-App nicht direkt oeffnen.

## Testweg A: Lokales WLAN (Mac-IP)

1. Dev-Server im `app`-Ordner mit Host-Freigabe starten:

   ```bash
   npm run dev -- --host 0.0.0.0 --port 5173
   ```

2. Mac-IP im gleichen WLAN ermitteln (z. B. `192.168.178.42`).
3. Auf dem iPhone in Safari oeffnen:

   ```text
   http://192.168.178.42:5173
   ```

4. In der App (nur in dev sichtbar) `Show QR` nutzen und die aktuelle URL scannen/teilen.

## Testweg B: Vercel Preview/Prod (HTTPS)

1. Preview deploy:

   ```bash
   npx vercel
   ```

2. Production deploy (optional):

   ```bash
   npx vercel --prod
   ```

3. URL als QR-Code erzeugen, z. B.:

   ```text
   https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=<DEPLOY_URL>
   ```

4. URL auf dem iPhone in Safari oeffnen und fuer PWA testen (Share -> Zum Home-Bildschirm).

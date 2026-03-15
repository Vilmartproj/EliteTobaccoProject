# Mobile Deployment Guide (Android) – Elite Tobacco

This project is configured with **Capacitor** to package the existing React app as a mobile app.

## 1) One-time setup

Run in project root (`tobacco-app 3`):

```bash
npm install
```

Mobile tooling is already configured in `package.json` scripts and Android project exists in `android/`.

## 2) Configure mobile API endpoint

`src/api.js` uses `VITE_API_BASE`.

Use `.env.mobile`:

```dotenv
VITE_APP_ENV=mobile
VITE_API_BASE=https://www.vilmart.in/api
```

## 3) Build and sync Android assets

```bash
npm run android:build
```

This runs:
- `npm run build:mobile`
- `npm run cap:sync`

## 4) Open Android Studio project

```bash
npm run cap:open
```

Then in Android Studio:
- Wait for Gradle sync
- Select emulator/device
- Run app

## 5) QA validation checklist

- Login works for Admin and Buyer
- API calls hit `https://www.vilmart.in/api`
- Save bag flow works (FCV/NON-FCV)
- QR validation and generation works
- App survives close/reopen

## 6) Create release build (AAB)

In Android Studio:
- Build → Generate Signed Bundle / APK
- Select **Android App Bundle (AAB)**
- Use release keystore
- Build release bundle

Upload AAB in Google Play Console:
- Internal testing track first
- Add testers
- Validate before production rollout

## 7) Updating app after web changes

Every time frontend changes:

```bash
npm run android:build
npm run cap:open
```

Then rebuild signed AAB from Android Studio.

## 8) Backend deployment dependency

Mobile app depends on backend uptime.
Ensure:
- PM2 process is online
- Nginx reverse proxy healthy
- SSL valid
- `/api/login` reachable publicly

Quick server check:

```bash
curl -i https://www.vilmart.in/api/stats
```

---

If iOS deployment is needed next, add Capacitor iOS on a Mac and follow equivalent Xcode signing/release flow.

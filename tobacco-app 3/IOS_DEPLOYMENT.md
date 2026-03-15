# iOS Deployment Guide – Elite Tobacco

Prerequisites (Mac only):
- macOS with Xcode (latest recommended)
- CocoaPods installed (`sudo gem install cocoapods` or `brew install cocoapods`)
- Apple Developer account + App Store Connect access
- `.env.mobile` configured (VITE_API_BASE)

Quick setup (run in project root `tobacco-app 3`):

1. Install iOS runtime:

```bash
npm install @capacitor/ios@^8.2.0
```

2. Add iOS platform (if not already added):

```bash
npx cap add ios
```

3. Build web assets and sync to iOS:

```bash
npm run ios:build
# or
npm run build:mobile
npx cap sync ios
```

4. Open Xcode:

```bash
npx cap open ios
```

- In Xcode: select the `App` target → Signing & Capabilities → set your Team and a unique Bundle Identifier.
- Add Info.plist permissions:
  - `NSCameraUsageDescription` — "Used to scan QR codes"
  - `NSPhotoLibraryAddUsageDescription` — if you write images

5. Native scanner plugin notes:
- The project includes `@capacitor-mlkit/barcode-scanning` for Android; check plugin docs for iOS setup and Pod requirements.
- If you prefer, use a community Capacitor barcode scanner plugin that documents iOS steps.

6. Run & test:
- Select a real device or simulator in Xcode and Run (⌘R).
- Test Buyer login and QR scanner flows.

7. Archive & upload to App Store / TestFlight:
- In Xcode: Product → Archive (choose Generic iOS Device first).
- Use Organizer to validate and upload the archive to App Store Connect.

Notes and CI tips:
- iOS build and archive require macOS; use macOS runners on CI (GitHub Actions, Bitrise, Codemagic).
- Keep `dist/` and `.vite` out of git; build before syncing native platforms.
- Use `cap:sync:ios` and `cap:open:ios` scripts added to `package.json`.

If you want, I can also:
- Add a sample GitHub Actions workflow for building iOS (archive + upload to TestFlight), or
- Run `npx cap add ios` here (not possible without macOS) — I can provide the exact commands to run on your Mac.

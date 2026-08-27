# Android (TWA) build — worker app

This folder holds the Trusted Web Activity configuration that wraps
`https://worker.thekaamready.in` into the Play Store app `in.thekaamready.worker`.

The Android project itself is **not** committed — it is regenerated from
`twa-manifest.json` on every build by [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).

## Building

Run the **Build Android AAB (target API 36)** workflow from the Actions tab.
It produces `app-release-bundle.aab` as a downloadable artifact.

Two repository secrets must exist:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | base64 of `SIGNING_KEY_worker/signing.keystore` (the Play **upload** key) |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password — same value is used as the key password |

The keystore is never committed: this repository is public.

## Digital Asset Links

Android only drops the browser URL bar when
`https://worker.thekaamready.in/.well-known/assetlinks.json` lists the
certificate that actually signed the installed app. With Play App Signing that
is Google's **app signing key**, not your upload key, so the file must be
updated with the fingerprint from Play Console after the first upload.

## Bumping the version

`versionCode` and `versionName` are workflow inputs — set them when you click
**Run workflow**. `versionCode` must be strictly higher than anything already
uploaded to Play.

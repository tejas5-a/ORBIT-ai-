# Packaging plan

Do not package ORBIT yet.

Milestone 9 is the packaging milestone. It starts only after the shell has been launched with the candidate runtime on the Windows 7 32-bit laptop. That launch has not happened.

## Candidate, if a later test succeeds

- Runtime: NW.js 0.72.0
- File: `nwjs-v0.72.0-win-ia32.zip`
- URL: https://dl.nwjs.io/v0.72.0/nwjs-v0.72.0-win-ia32.zip
- Engine: Chromium 109.0.5414.87, bundled Node 19.3.0
- Do not use NW.js 0.73.0 or newer on Windows 7. See `../COMPATIBILITY.md`.

Use the normal build for a trial run. Use the SDK build only when DevTools are needed. The SDK zip is larger.

Download the zip on a machine that can store about 110 MB compressed, and more once it is unpacked. Copy the unpacked runtime to the laptop. Do not ask the laptop to install a separate Node.js.

## Manifest, draft only

When a test build is justified, a separate manifest can point NW.js at `index.html`. Do not copy this over the repository `package.json` until that test exists. The repository file has no `"main"` field on purpose.

```json
{
  "name": "ORBIT",
  "main": "index.html",
  "version": "0.1.0",
  "window": {
    "title": "ORBIT",
    "width": 1280,
    "height": 760,
    "min_width": 960,
    "min_height": 640,
    "position": "center"
  },
  "nodejs": false
}
```

`"nodejs": false` matches this milestone: the page does not call Node. A later filesystem or process milestone will need Node enabled inside NW.js, and that change should be made in the desktop adapter, not by pretending the browser already has it.

Chromium flags such as `--disable-gpu` are not listed here. They are untested on the target GPU. Add one only to work around a failure you can reproduce.

## Suggested first launch, after the zip is on the laptop

1. Unpack `nwjs-v0.72.0-win-ia32.zip`.
2. Copy the ORBIT folder next to it, without `node_modules` or secret files.
3. From a command prompt in the NW.js folder, run `nw.exe` with the ORBIT folder path, or follow the NW.js 0.72 document for loading an unpacked app.
4. Confirm the window opens, the seven sections switch, and the status line does **not** claim disk or model access.
5. Watch memory in Task Manager. If the 32-bit process climbs toward its address-space limit, stop and record that before adding CodeMirror or more windows.
6. Record the exact NW.js, Chromium, and Windows build strings. Only then can the candidate be called selected.

## Still out of scope

- An installer
- Code signing
- Auto-update
- A hosted copy of the shell
- Shipping API keys inside the package

If the 0.72.0 ia32 binary fails to open on the laptop, stop. Do not “fix” that by moving to a newer NW.js. Newer releases drop Windows 7.

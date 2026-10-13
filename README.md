# ORBIT

Multiple AI Brains. One Coding Universe.

ORBIT is a lightweight AI coding workspace. This repository is **Milestone 1**: the application shell. It is not a Windows package, and it has not been tested on the target computer.

Target computer, still unverified: Windows 7 32-bit, 4 GB RAM.

## What works in this build

| Area | Status |
| --- | --- |
| Navigation across all seven sections | Working |
| Light, dark, and system theme | Working, stored in this browser profile |
| Comfortable and compact density | Working |
| Optional display name | Working |
| Project index: create, open, rename, remove | Working as a **catalog only**. No folder is created or read |
| Activity history | Working, local only |
| Export, view, and import of shell data | Working. Secret-named fields are discarded on import |
| Reset local shell data | Working. Does not delete disk files |
| Keyboard shortcuts | Working. See Shortcuts in the status bar |
| AI Workspace send | Refuses. No request is sent and no reply is invented |
| Agent “Create plan” and “Cancel run” | Refuse or report that nothing was running |
| File refresh, create, rename, delete, save | Call the filesystem adapter, which refuses |
| Provider list | Working as documentation. No connection test |
| API key entry | Not present, on purpose |

## What does not work yet

- Live calls to OpenAI, Anthropic, Gemini, OpenRouter, or a custom endpoint
- Streaming, stop-in-flight, and copy of a model response
- Reading or writing a real project folder
- CodeMirror, syntax highlighting, search, or replace
- Multi-model orchestration. Roles are not collaborating
- Applying approved file changes
- A terminal. No command is executed
- A Windows desktop package

If a control cannot do the real operation, it says so. A refusal is not a simulated success.

## Run the shell

No install step. Node.js is not required to open the interface.

1. Keep this folder together. `index.html` loads `styles/` and `scripts/` by relative path.
2. Open `index.html` in Chrome, Edge, or another Chromium-class browser.
3. Internet Explorer on Windows 7 cannot run this shell. The desktop target, once tested, is NW.js 0.72.0’s Chromium 109, not IE.

`file://` is enough for this milestone because the page uses classic scripts, not ES modules, and it does not fetch other HTML files. If a browser blocks local script loading, serve the folder instead:

```text
python3 -m http.server 8080 --bind 0.0.0.0
```

Then open `http://127.0.0.1:8080/`. Do not put this folder on a public host once a later milestone adds credentials. This milestone has no key fields.

Optional checks, on a development machine only:

```text
node tests/run-tests.js
```

The Windows 7 laptop does not need Node.js installed for that. Do not install a current Node.js on Windows 7 unless that exact installer has been verified. It has not.

## Export the project

Copy the whole `ORBIT` directory, or the zip made beside it: `ORBIT-0.1.0-milestone-1.zip`.

Include:

- `index.html`
- `styles/`
- `scripts/`
- `services/`
- `assets/`
- `tests/`
- `desktop/`
- `README.md`, `COMPATIBILITY.md`, `package.json`, `.gitignore`

Do not add `.env`, `secrets.json`, or API keys before you copy it. This build does not create those files. `.gitignore` already ignores the usual secret names.

`package.json` is project metadata. It is **not** an NW.js manifest. There is no `"main"` field, so dropping this folder onto a current `nw.exe` is not a supported package.

## Layout

```text
ORBIT/
  index.html
  package.json
  README.md
  COMPATIBILITY.md
  styles/main.css
  scripts/          UI: shell, navigation, and section screens
  services/         Provider registry, filesystem refusal, orchestration contract, local store
  assets/mark.svg
  tests/run-tests.js
  desktop/PACKAGING.md
```

Separate HTML files under `pages/` are not used. Loading fragments with `fetch` fails on some `file://` origins. Each section is a script that draws into the shell. That keeps Milestone 1 openable by double-click.

UI, provider logic, and filesystem logic are separate. `scripts/` never embeds an API key. `services/filesystem-adapter.js` cannot read a disk. `services/path-guard.js` is a containment check for a later desktop adapter. A path that passes the check is not permission to read a file, and nothing in this build grants that permission.

## Security

- No real API key is hardcoded.
- Model Settings has no key input.
- Shell export has no key field. Import drops fields named like `apiKey`, `token`, `secret`, `password`, or `credentials`.
- `localStorage` is not encryption. On a shared PC, anyone who can open this profile can read the catalog and display name.
- Do not host this frontend publicly with secrets in a later build. Provider calls and secret handling belong in a desktop-side component, and even that does not make an unpatched Windows 7 system safe.
- Windows 7 has been out of support since 14 January 2020. Chromium 109 has had no browser security updates since early 2023. See `COMPATIBILITY.md`.

## Desktop runtime

A candidate has been identified and **not** selected: NW.js **0.72.0**, Windows **ia32**, Chromium **109.0.5414.87**, bundled Node **19.3.0**.

NW.js 0.73.0 and newer do not launch on Windows 7. This application has not been packaged and has not been run on the target laptop. Do not treat compatibility as promised.

Details and sources: `COMPATIBILITY.md`. Packaging steps that must wait: `desktop/PACKAGING.md`.

## Language level

The interface is written for Chromium 109. It does not use CSS nesting, `color-mix()`, or `Array.prototype.toSorted`. Web fonts are not loaded. The type stack is Segoe UI, then Helvetica Neue, then Arial, so Windows 7 does not need a font download.

## Next milestone

Milestone 2 is partly started: the dashboard, responsive layout, and application preferences are already in this shell. What remains for a real Milestone 2/3 boundary is provider configuration **without** putting secrets in a public page, then real adapters that report real errors.

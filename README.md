# Itz Workable -- Launcher
A launcher app for all https://github.com/WorkableProjects repos!

Sign in, and every public WorkableProjects repo with a live link shows up as a tile — one grab-and-go page instead of a pile of bookmarks.

## How links are chosen
For each public repo (forks and archived repos hidden), in order:
1. An override in `config.js` → `links`
2. The repo's **Website** (homepage) field on GitHub
3. Its GitHub Pages site, if Pages is on
4. Otherwise the repo page on GitHub

No link (listed under "Not launched yet"): **Blood Drive 26**, and this **Launcher** until `launcherLaunched: true` is set in `config.js`.

## Themes
Auto, Light, Dark, Cyan, Pink — from the Itz Workable design system. Auto follows the time of day:

| Time | Theme |
|---|---|
| 6:00–12:00 | Light (black on white) |
| 12:00–17:00 | Cyan (pink mark on cyan) |
| 17:00–20:00 | Pink (cyan mark on pink) |
| 20:00–6:00 | Dark (white on black) |

## Sign-in
Sign-in is local to the device: a name for the greeting, plus an optional fine-grained GitHub token (no scopes) for when the 60-requests/hour anonymous limit is hit. Nothing leaves the browser except the call to the GitHub API.

## Run / deploy
Static files, no build. Locally: `python3 -m http.server` and open http://localhost:8000.
Deploy: enable GitHub Pages → Source: **GitHub Actions**; `.github/workflows/pages.yml` publishes on every push to `main`.

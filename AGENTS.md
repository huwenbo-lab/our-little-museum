# AGENTS.md — Instructions for Claude Code / Coding Agents

Before changing this repository, read **`PROJECT_HANDOFF.md`**, **`README.md`**, **`content.js`** and the relevant implementation files. The user has already made specific product decisions; do not overwrite them with generic AI website defaults.

## Mission
Build and maintain a long-lived, emotionally specific, mobile-friendly birthday-surprise website: **Our Little Museum**. It is a personal interactive museum, not a generic couple photo album. The owner will provide real narratives and photos later; **never invent their relationship events or imply sample text is real**.

## Fixed decisions
- Visual language: **light cream / blush peony pink / pale champagne gold**, elegant, warm, airy, and artistic. The recipient likes peonies. Dark blue/black first design was rejected.
- Interaction: 2D immersive museum experience with tasteful room transitions, not a heavy 3D avatar game.
- Rooms: `intro` → `foyer` → `timeline` → `places` → `letter`. Three content galleries after the foyer.
- **Do not recreate the deleted “私人珍藏 / private collection” gallery** unless the owner explicitly changes their mind.
- `places` is currently an **artistic memory star-map**, not a geographic map. Do not mislabel it as geolocated mapping.
- Prefer refining and testing the existing working prototype over replacing it. Keep it easy for a nontechnical user to add future memories.

## Current architecture
Plain static HTML/CSS/JS. No bundler, package manager, React, server, or database.
- `index.html`: shell and loading order.
- `app.js`: views, route switching, modals, gallery, letter, sound controls.
- `content.js`: editable data source `window.MUSEUM_CONTENT`, currently `demoMode: true`; includes six example events, three example places, a placeholder letter.
- `styles.css`, `light-theme.css`, `peony-theme.css`: base and layered visual rules; the peony overrides load last.
- `assets/`: original SVG demo illustrations.
- `PROJECT_HANDOFF.md`: context, scope, status, next steps.

Start locally: `python3 -m http.server 8000`, then open `http://localhost:8000/`.

## Privacy and content safety — critical
The repository is **currently PUBLIC**. Do **not** commit private couple photographs, real private letters, sensitive chats, contact details, addresses, credentials, or nonpublic data to this repo without the owner explicitly approving a privacy/deployment design. A hidden URL is not authentication, and a client-side password box is not protection. Git history can retain deleted materials. Keep placeholders until the owner provides and authorizes actual content. Never push real sample/private content simply to demonstrate a feature.

## Working method
1. Inspect the live code and test existing interactions before editing.
2. Work in this standalone repository; do not put the project back inside an academic repository or create serial downloadable ZIPs.
3. Preserve the data/content separation; add new memories through content records and clear photo paths, not duplicated hard-coded HTML.
4. Optimize mobile layout first; ensure desktop still looks intentional. Test 360–430px layouts and wider desktop; prevent overflow; respect reduced-motion preference and keyboard access.
5. Keep demo entries labelled as demos. Do not call the website “launched” unless the Pages URL is verified to respond successfully.
6. Avoid introducing external dependencies, paid services, autoplay music, copyright-infringing music, or complex architecture without an explicit reason.
7. Prefer small, reviewable commits. For major redesigns, summarize why the change is needed before implementing.
8. After changes, test entrance → foyer → timeline photo navigation → places → letter open/close → back navigation; test missing photos and long text; verify no console errors.

## Immediate priorities
- Verify UI and navigation across phone/desktop, repair any actual defects.
- Polish light peony visuals without losing the museum narrative.
- Prepare a safe user-friendly workflow to populate real memories when provided.
- Check actual GitHub Pages status and work with owner to enable hosting; do not claim it is already live.
- Before adding private data, agree on a genuinely appropriate access-control strategy.

## Definition of done for the final gift
A beautiful, navigable, tested, responsive experience with genuine user-supplied stories and photographs, a personally written final letter, and an accessible URL or other intentional delivery route **with privacy implications clearly understood**. Until such content is provided and deployment verified, status remains **DEMO / in progress**.

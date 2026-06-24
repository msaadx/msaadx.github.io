# Muhammad Saad Hasan — Portfolio

A handcrafted, single-page portfolio website. **"Heritage Navy"** — a Ralph
Lauren-inspired design system: deep navy canvas, ivory sections, brass-gold
accents, and elegant serif display type.

Built with **vanilla HTML, CSS and JavaScript** — no build step, no
dependencies — so it deploys anywhere static, including GitHub Pages.

## Sections
Hero (animated neural-network canvas) · capability marquee · animated stats ·
About · Expertise · Experience timeline · Featured Work (Thalamus, Aletheia,
TrashCam) · Research (5 papers) · Projects (filterable) · Skills · Honors ·
Contact · Footer.

## Features
- Fully responsive (desktop → mobile) with an elegant slide-in mobile menu
- Scroll-reveal animations, animated counters, hero particle network, text rotator
- Project category filtering
- Working contact form (opens the visitor's email client — no backend needed)
- **Download CV** button → opens a print-optimised view (use *Save as PDF*)
- Respects `prefers-reduced-motion`; graceful no-JS fallback
- SEO + Open Graph meta tags, SVG favicon

## Run locally
Just open `index.html` in a browser, or serve it:

```bash
# Python
python -m http.server 8000
# then visit http://localhost:8000

# or Node
npx serve .
```

## Deploy to GitHub Pages

### Option A — user site (`msaadx.github.io`)
1. Create a repo named **`msaadx.github.io`**.
2. Push these files to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Portfolio site"
   git branch -M main
   git remote add origin https://github.com/msaadx/msaadx.github.io.git
   git push -u origin main
   ```
3. Your site goes live at **https://msaadx.github.io**.

### Option B — project site
Push to any repo, then in **Settings → Pages** set the source to
`main` / root. The site will be at `https://msaadx.github.io/<repo-name>/`.

> A `.nojekyll` file is included so GitHub Pages serves the `assets/` and
> `js/` folders untouched.

## Customising
- **Profile photo** — replace `assets/img/profile-github.jpg`.
- **Real CV PDF** — to link a file instead of the print view, drop your PDF in
  `assets/` and point the `#downloadCv` button at it (see `js/main.js`).
- **Colours / fonts** — all design tokens live at the top of `css/styles.css`
  under `:root`.
- **Content** — everything is plain HTML in `index.html`.

## Structure
```
index.html
css/styles.css
js/main.js
assets/img/        profile photo, favicon, product/brand assets
.nojekyll
```

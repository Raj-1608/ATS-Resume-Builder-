# ATS Resume & Portfolio Builder

A single-page React app that builds two things from one form: an **ATS-friendly resume** (plain, single-column, parser-safe) and a **visual portfolio page**, live side by side as you type — with multiple templates for each, dark/light mode, an ATS-scan simulation with a readiness checklist, and a real PDF download for the resume.

**[Click Here to Open Live Simulation]** (https://ats-resume-builder-mja1-ten.vercel.app/)

## Features

- **Step-by-step form** — personal details, experience, education, skills, and portfolio projects
- **Live preview** — resume and portfolio update as you type, no save button needed
- **6 resume templates** — Classic, Modern, Minimal, Executive, Harvard, and Tech/Jake (all single-column and ATS-safe; only typography changes)
- **6 portfolio templates** — Hero Dark, Card Grid, Editorial, Mono, Case Study, and Index
- **ATS scan simulation** — shows how a parser would extract your fields, plus a live readiness checklist and score
- **Dark / light mode**
- **Real PDF export** — "Download resume as PDF" generates an actual `.pdf` with selectable text (via [jsPDF](https://github.com/parallax/jsPDF), loaded from a CDN at runtime) — no print dialog required
- **Print-to-PDF fallback** — for the portfolio page, or if you want to control paper size manually

## Getting started

Requires [Node.js](https://nodejs.org/) 18+.

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

### Build for production

```bash
npm run build
npm run preview   # optional: preview the production build locally
```

The build output goes to `dist/`.

## Deploying

This is a static site once built, so it can be hosted anywhere that serves static files — GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.

**GitHub Pages (quick option):**

1. `npm run build`
2. Push the contents of `dist/` to a `gh-pages` branch (or use a GitHub Action such as [`peaceiris/actions-gh-pages`](https://github.com/peaceiris/actions-gh-pages))
3. Enable Pages for that branch in your repo settings

If you deploy under a subpath (e.g. `username.github.io/repo-name`), set `base: "/repo-name/"` in `vite.config.js`.

## Notes

- The Google Fonts used for headings/mono type and the jsPDF library for PDF export are both loaded from CDNs at runtime, so an internet connection is needed for those two things to work. Everything else runs fully client-side.
- There's no backend and no data storage — all form data lives in memory and resets on page refresh. Feel free to wire up `localStorage` or a backend if you want persistence; it was intentionally left out of this version.
- All PDF-relevant styling decisions (fonts, structure, headings) are chosen to stay parseable by applicant tracking systems — no tables, columns, icons, or text boxes in the resume output, regardless of template.

## Tech stack

- [React 18](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [lucide-react](https://lucide.dev/) for icons
- [jsPDF](https://github.com/parallax/jsPDF) (CDN, loaded on demand) for PDF generation
- Plain CSS (no Tailwind/CSS framework dependency)

## License

MIT — see [LICENSE](./LICENSE).

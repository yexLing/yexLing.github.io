# yexLing.github.io

My personal homepage — tech blog, current focus / news, and videos.
Built with [Astro](https://astro.build) and deployed to GitHub Pages.

🔗 Live at **https://yexling.com**

## Develop locally

```bash
npm install      # first time only
npm run dev      # start dev server at http://localhost:4321
npm run build    # production build into dist/
npm run preview  # preview the production build
```

> Requires Node 20+.

## Add content

| To add… | Edit… |
| --- | --- |
| **Blog post** | new `.md` file in `src/content/blog/` (see existing ones for the frontmatter format) |
| **News / focus update** | new `.md` file in `src/content/news/` |
| **Video** | add an entry to `src/data/videos.ts` (YouTube video id or Bilibili BV id) |
| **About page** | `src/pages/about.astro` |
| **Social links** | `src/pages/index.astro` and `src/pages/about.astro` |

## Deploy

Every push to `main` triggers the GitHub Actions workflow in
`.github/workflows/deploy.yml`, which builds the site and publishes it to
GitHub Pages.

**One-time setup on GitHub:** Repo → **Settings → Pages → Build and deployment →
Source: GitHub Actions**.

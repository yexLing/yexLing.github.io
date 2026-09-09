# .trash

Hidden bin for blog/news drafts that aren't ready to publish.

Anything here is **outside `src/`**, so Astro never builds it and it never
appears on the live site — but it's still tracked in git, so nothing is lost
and you can restore it later.

Mirror the original content layout (`blog/en/`, `blog/zh/`, `news/...`) so a
restore is just a `git mv` back into `src/content/`.

To restore an article:

```bash
git mv .trash/blog/en/<slug>.md src/content/blog/en/<slug>.md
git mv .trash/blog/zh/<slug>.md src/content/blog/zh/<slug>.md
```

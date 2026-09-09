// ──────────────────────────────────────────────────
// i18n: translation dictionary + helpers
// ──────────────────────────────────────────────────

export const defaultLocale = 'en';
export const locales = ['en', 'zh'] as const;
export type Locale = (typeof locales)[number];

// ── Display label for the language switcher (shows the *other* locale) ──
export function labelOf(locale: Locale): string {
  return locale === 'zh' ? '中文' : 'English';
}

// ── Plain-text translation ──
// Falls back to English, then to the key itself.
export function t(locale: Locale, key: string): string {
  const entry = (ui as Record<string, Record<string, string>>)[key];
  if (!entry) return key;
  return entry[locale] ?? entry.en ?? key;
}

// ── HTML translation (for keys contain inline markup) ──
// Replaces {placeholder} tokens with values from `vars`, then returns a
// raw HTML string for `set:html={...}`.
export function tHtml(
  locale: Locale,
  key: string,
  vars?: Record<string, string>,
): string {
  let s = t(locale, key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, v);
    }
  }
  return s;
}

// ── Locale-aware date formatting ──
const dateFmt: Record<Locale, Intl.DateTimeFormatOptions> = {
  en: { year: 'numeric', month: 'short', day: 'numeric' },
  zh: { year: 'numeric', month: 'long', day: 'numeric' },
};
export function formatDate(locale: Locale, date: Date): string {
  const l = locale === 'zh' ? 'zh-CN' : 'en-US';
  return date.toLocaleDateString(l, dateFmt[locale] ?? dateFmt.en);
}

// ── Compute the equivalent URL in the other locale ──
// Strips the /zh prefix (if present) or prepends it (if switching to zh).
export function translatedPath(
  currentLocale: Locale,
  targetLocale: Locale,
  pathname: string,
): string {
  // Normalise: ensure trailing slash for root-like paths so relative
  // resolution is predictable.
  if (!pathname.endsWith('/')) pathname += '/';

  let clean = pathname;
  for (const l of locales) {
    const prefix = `/${l}`;
    if (pathname === `${prefix}/` || pathname.startsWith(`${prefix}/`)) {
      clean = pathname.slice(prefix.length); // → "/…"
      break;
    }
  }

  if (targetLocale === defaultLocale) return clean;  // no prefix for en
  return `/${targetLocale}${clean}`;
}

// ═══════════════════════════════════════════════════
//  Translation dictionary
// ═══════════════════════════════════════════════════

const ui = {
  // Brand name — English uses "Yex Ling", Chinese uses 凌一而㬢
  'site.brand': {
    en: 'Yex Ling',
    zh: '凌一而㬢',
  },
  'site.title': {
    en: 'Home',
    zh: '首页',
  },
  'site.description': {
    en: 'Personal homepage — tech blog, products, notes, and videos.',
    zh: '个人主页 — 技术博客、产品、随笔与视频。',
  },

  // ── Nav ──
  'nav.home':    { en: 'Home',    zh: '首页' },
  'nav.blog':    { en: 'Blog',    zh: '博客' },
  'nav.products': { en: 'Products', zh: '产品' },
  'nav.videos':  { en: 'Videos',  zh: '视频' },
  'nav.news':    { en: 'Notes',   zh: '随笔' },
  'nav.about':   { en: 'About',   zh: '关于' },

  // ── Home hero ──
  'hero.tagline': {
    en: '<span class="name">Yex Ling</span> — writing, building, and the AI frontier.',
    zh: '凌一而㬢 — 凌云而上总能看到一㬢晨光。',
  },
  'hero.lede': {
    en: 'Engineer & builder. I write about technology, build small products, and track what\'s moving in AI. Pull up a chair.',
    zh: '工程师 & 建造者。写技术文章，做一些小产品，也记录 AI 前沿里正在变化的事。来，坐下聊聊。',
  },

  // ── Sections ──
  'section.latestPosts':  { en: 'Latest posts',       zh: '最新文章' },
  'section.allPosts':     { en: 'All posts →',         zh: '全部文章 →' },
  'section.products':     { en: 'Products',            zh: '产品' },
  'section.allProducts':  { en: 'All products →',      zh: '全部产品 →' },
  'section.focusingOn':   { en: 'Recent notes',        zh: '近期随笔' },
  'section.allUpdates':   { en: 'All notes →',         zh: '全部随笔 →' },
  'section.videos':       { en: 'Videos',              zh: '视频' },
  'section.allVideos':    { en: 'All videos →',        zh: '全部视频 →' },
  'section.source':       { en: 'Source ↗',            zh: '来源 ↗' },
  'section.backNews':     { en: '← Back to all notes', zh: '← 返回随笔列表' },
  'section.backBlog':     { en: '← Back to all posts', zh: '← 返回文章列表' },
  'section.backProducts': { en: '← Back to products',  zh: '← 返回产品列表' },

  // ── About page ──
  'about.title':        { en: 'About',              zh: '关于本站' },
  'about.description':  { en: 'About this site.',   zh: '关于本站。' },
  'about.lede': {
    en: 'This is where I collect my writing and updates.',
    zh: '这里汇集了我的文章与动态。',
  },
  'about.intro': {
    en: 'Welcome. This site brings together my <a href="{blog}">blog</a>, <a href="{products}">products</a>, and <a href="{news}">recent notes</a>.',
    zh: '欢迎。本站收录了我的<a href="{blog}">博客</a>、<a href="{products}">产品</a>和<a href="{news}">近期随笔</a>。',
  },
  'about.chat': {
    en: 'Want to chat? I\'m happy to talk about anything on this site — reach me at <a href="mailto:xuluthebest@gmail.com">xuluthebest@gmail.com</a>.',
    zh: '想聊聊？欢迎就本站的任何内容与我交流：<a href="mailto:xuluthebest@gmail.com">xuluthebest@gmail.com</a>。',
  },

  // ── Blog page ──
  'blog.title': {
    en: 'Blog',
    zh: '博客',
  },
  'blog.description': {
    en: 'Notes on technology, engineering, and things I\'m learning.',
    zh: '技术、工程与学习笔记。',
  },
  'blog.empty': {
    en: 'No posts yet — add markdown files in <code>src/content/blog/</code>.',
    zh: '暂无文章 — 在 <code>src/content/blog/</code> 中添加 markdown 文件。',
  },

  // ── Products page ──
  'products.title': {
    en: 'Products',
    zh: '产品',
  },
  'products.description': {
    en: 'tools and products I build.',
    zh: '我做的一些小工具和产品。',
  },

  // ── Notes page ──
  'news.title': {
    en: 'Notes',
    zh: '随笔',
  },
  'news.description': {
    en: 'Short notes on what I\'m reading, building, and exploring lately.',
    zh: '一些关于阅读、建造和探索的简短记录。',
  },
  'news.empty': {
    en: 'No notes yet — add markdown files in <code>src/content/news/</code>.',
    zh: '暂无随笔 — 在 <code>src/content/news/</code> 中添加 markdown 文件。',
  },

  // ── Videos page ──
  'videos.title': {
    en: 'Videos',
    zh: '视频',
  },
  'videos.description': {
    en: 'My videos from YouTube and Bilibili.',
    zh: '我在 YouTube 和 Bilibili 上发布的视频。',
  },

  // ── Footer ──
  'footer.builtWith': {
    en: 'Built with',
    zh: '使用',
  },
  'footer.hostedOn': {
    en: 'Hosted on GitHub Pages',
    zh: '托管于 GitHub Pages',
  },

  // ── Meta defaults ──
  'meta.defaultTitle': {
    en: 'Yex Ling',
    zh: '凌一而㬢',
  },
  'meta.defaultDescription': {
    en: 'Personal homepage — tech blog, products, notes, and videos.',
    zh: '个人主页 — 技术博客、产品、随笔与视频。',
  },
};

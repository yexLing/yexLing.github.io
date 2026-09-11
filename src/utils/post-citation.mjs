const texEscapes = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  '&': '\\&',
  '%': '\\%',
  '$': '\\$',
  '#': '\\#',
  '_': '\\_',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
};

export function postCitation({ title, pubDate, slug, locale, pathname, site }) {
  const url = new URL(pathname, site);
  url.search = '';
  url.hash = '';
  if (!url.pathname.endsWith('/')) url.pathname += '/';

  const year = pubDate.getUTCFullYear();
  const month = pubDate.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const date = pubDate.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric', month: 'short', timeZone: 'UTC',
  });
  const key = `yexling${year}${slug.replace(/[^a-zA-Z0-9]/g, '')}`;
  const safeTitle = title.replace(/[\\{}&%$#_~^]/g, (character) => texEscapes[character]);
  const text = `Yex Ling. “${title}”. ${url.hostname} (${date}). ${url.href}`;
  // Preserve the author's chosen name as one literal BibTeX name.
  const bibtex = `@article{${key},
  title = {${safeTitle}},
  author = {{Yex Ling}},
  journal = {${url.hostname}},
  year = {${year}},
  month = {${month}},
  url = {${url.href}}
}`;

  return { url: url.href, journal: url.hostname, date, text, bibtex };
}

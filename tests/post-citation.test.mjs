import assert from 'node:assert/strict';
import test from 'node:test';
import { postCitation } from '../src/utils/post-citation.mjs';

const post = {
  title: '为什么机器人还只是一个遥控大玩具',
  pubDate: new Date('2026-08-16'),
  slug: 'zh/action-bottleneck',
  locale: 'zh',
  pathname: '/zh/blog/action-bottleneck/',
  site: new URL('https://yexling.com'),
};

test('Chinese citations preserve the title, chosen author name and public locale URL', () => {
  const citation = postCitation(post);
  assert.equal(citation.url, 'https://yexling.com/zh/blog/action-bottleneck/');
  assert.equal(citation.text, `Yex Ling. “${post.title}”. yexling.com (2026年8月). ${citation.url}`);
  assert.match(citation.bibtex, /author = \{\{Yex Ling\}\}/);
  assert.match(citation.bibtex, /year = \{2026\}/);
  assert.match(citation.bibtex, /month = \{August\}/);
  assert.ok(citation.bibtex.includes(`title = {${post.title}}`));
});

test('translations get different citation keys, titles and URLs', () => {
  const citation = postCitation({ ...post, title: 'The Action Bottleneck', locale: 'en', slug: 'en/action-bottleneck', pathname: '/blog/action-bottleneck/' });
  assert.equal(citation.text, 'Yex Ling. “The Action Bottleneck”. yexling.com (Aug 2026). https://yexling.com/blog/action-bottleneck/');
  assert.notEqual(citation.bibtex.split('\n')[0], postCitation(post).bibtex.split('\n')[0]);
});

test('citation URLs remove preview parameters and fragments and keep a trailing slash', () => {
  const citation = postCitation({ ...post, pathname: '/zh/blog/action-bottleneck?preview=1#citation' });
  assert.equal(citation.url, 'https://yexling.com/zh/blog/action-bottleneck/');
  assert.doesNotMatch(citation.bibtex, /preview=|#citation|localhost|127\.0\.0\.1/);
});

test('publication months use UTC even at a month boundary', () => {
  const citation = postCitation({ ...post, pubDate: new Date('2026-09-01T00:00:00Z') });
  assert.match(citation.bibtex, /month = \{September\}/);
  assert.equal(citation.date, '2026年9月');
});

test('BibTeX escapes special title characters while preserving readable citation text', () => {
  const title = 'VLA & 90%: {A_B} #1 $2 \\ ~ ^';
  const citation = postCitation({ ...post, title });
  assert.ok(citation.text.includes(title));
  assert.ok(citation.bibtex.includes('VLA \\& 90\\%: \\{A\\_B\\} \\#1 \\$2 \\textbackslash{} \\textasciitilde{} \\textasciicircum{}'));
});

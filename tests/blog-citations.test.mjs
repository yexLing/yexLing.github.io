import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { parse } from '@astrojs/compiler';

const source = await readFile(new URL('../src/pages/blog/[...slug].astro', import.meta.url), 'utf8');
const { ast } = await parse(source);
const script = ast.children.find((node) => node.type === 'element' && node.name === 'script');
const code = script.children.map((node) => node.value).join('');

function control(properties = {}) {
  const listeners = new Map();
  return {
    hidden: false,
    textContent: '',
    addEventListener: (type, handler) => listeners.set(type, handler),
    fire: (type, event = {}) => listeners.get(type)?.(event),
    removeAttribute(name) { delete this[name]; },
    ...properties,
  };
}

function setup(sources) {
  const references = new Map(sources.map((urls, i) => {
    const links = urls.map((href) => ({ href, protocol: new URL(href).protocol }));
    const id = `ref-${i + 1}`;
    return [id, {
      innerHTML: id,
      textContent: `Source ${i + 1}`,
      links,
      querySelector: () => links[0] ?? null,
    }];
  }));
  let bodyLinks = [];
  const body = {
    set innerHTML(id) { bodyLinks = references.get(id).links.map((link) => ({ ...link })); },
    querySelectorAll: () => bodyLinks,
  };
  const view = control();
  const open = control({ hidden: true });
  const copy = control({ dataset: { label: 'Copy', copied: 'Copied' }, textContent: 'copy icon' });
  const copyLabel = control();
  const close = control();
  const back = control();
  const controls = new Map([
    ['.ref-popup-body', body],
    ['.ref-popup-view', view],
    ['.ref-popup-open', open],
    ['.ref-popup-copy', copy],
    ['.ref-popup-copy-label', copyLabel],
    ['.ref-popup-close', close],
  ]);
  const popup = {
    hidden: true,
    style: {},
    offsetHeight: 180,
    querySelector: (selector) => controls.get(selector),
  };
  const refsDetails = { querySelector: () => references.values().next().value };
  const citations = [...references.keys()].map((id) => control({
    getAttribute: () => `#${id}`,
    getBoundingClientRect: () => ({ left: 80, top: 190, bottom: 210 }),
  }));
  const prose = { querySelectorAll: (selector) => selector === 'details' ? [refsDetails] : citations };
  const document = {
    querySelector: (selector) => selector === '.prose' ? prose : null,
    querySelectorAll: () => [],
    getElementById: (id) => id === 'ref-popup' ? popup : id === 'back-to-reading' ? back : references.get(id),
    addEventListener() {},
  };
  const copied = [];
  runInNewContext(code, {
    document,
    window: { innerWidth: 390, innerHeight: 844, isSecureContext: true },
    navigator: { clipboard: { writeText: async (text) => { copied.push(text); } } },
  });
  return {
    open, popup, copy, copyLabel, copied,
    bodyLinks: () => bodyLinks,
    show(index) {
      let prevented = false;
      citations[index].fire('click', { preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
    },
  };
}

test('a citation with a web source exposes the open-link shortcut', () => {
  const state = setup([['https://example.org/paper']]);
  state.show(0);
  assert.equal(state.popup.hidden, false);
  assert.equal(state.open.hidden, false);
  assert.equal(state.open.href, 'https://example.org/paper');
  assert.equal(state.bodyLinks()[0].target, '_blank');
  assert.equal(state.bodyLinks()[0].rel, 'noopener noreferrer');
});

test('multiple sources use the first link and retain new-tab access to all links', () => {
  const state = setup([['https://example.org/paper', 'https://example.org/project']]);
  state.show(0);
  assert.equal(state.open.href, 'https://example.org/paper');
  assert.deepEqual(state.bodyLinks().map((link) => link.href), ['https://example.org/paper', 'https://example.org/project']);
  for (const link of state.bodyLinks()) {
    assert.equal(link.target, '_blank');
    assert.equal(link.rel, 'noopener noreferrer');
  }
});

test('switching to a citation without links hides the shortcut and clears its old URL', () => {
  const state = setup([['https://example.org/paper'], [], ['http://example.org/next']]);
  state.show(0);
  state.show(1);
  assert.equal(state.open.hidden, true);
  assert.equal(state.open.href, undefined);
  state.show(2);
  assert.equal(state.open.hidden, false);
  assert.equal(state.open.href, 'http://example.org/next');
});

test('non-web protocols cannot become the open-link destination', () => {
  const state = setup([
    ['javascript:alert(1)', 'mailto:editor@example.org', 'https://example.org/paper'],
    ['data:text/plain,not-a-web-source'],
  ]);
  state.show(0);
  assert.equal(state.open.href, 'https://example.org/paper');
  state.show(1);
  assert.equal(state.open.hidden, true);
  assert.equal(state.open.href, undefined);
});

test('copy feedback changes only the label and resets for the next citation', async () => {
  const state = setup([['https://example.org/paper'], []]);
  state.show(0);
  assert.equal(state.copyLabel.textContent, 'Copy');
  await state.copy.fire('click');
  assert.deepEqual(state.copied, ['Source 1 — https://example.org/paper']);
  assert.equal(state.copyLabel.textContent, 'Copied');
  assert.equal(state.copy.textContent, 'copy icon');
  state.show(1);
  assert.equal(state.copyLabel.textContent, 'Copy');
});

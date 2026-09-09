import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { parse } from '@astrojs/compiler';

const source = await readFile(new URL('../src/pages/blog/[...slug].astro', import.meta.url), 'utf8');
const { ast } = await parse(source);
const script = ast.children.find((node) => node.type === 'element' && node.name === 'script');
const code = script.children.map((node) => node.value).join('');

function setup({ linkTop = 500, linkBottom = 522, sidebarHeight = 520 } = {}) {
  let notify;
  const observed = [];
  const classes = new Set();
  const heading = { id: 'references' };
  const sidebar = {
    scrollTop: 100,
    clientTop: 1,
    clientHeight: sidebarHeight,
    getBoundingClientRect: () => ({ top: 79 }),
  };
  const rejectViewportScroll = () => assert.fail('Scrollspy must only scroll the sidebar');
  const link = {
    getAttribute: () => '#references',
    getBoundingClientRect: () => ({ top: linkTop, bottom: linkBottom }),
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
    },
    scrollIntoView: rejectViewportScroll,
  };
  const document = {
    querySelector: (selector) => selector === '.toc' ? sidebar : null,
    querySelectorAll: (selector) => selector === '.toc a' ? [link] : [],
    getElementById: (id) => id === 'references' ? heading : null,
  };

  runInNewContext(code, {
    document,
    window: {
      scrollTo: rejectViewportScroll,
      scrollBy: rejectViewportScroll,
      visualViewport: { scale: 2, offsetTop: 100, height: 360 },
    },
    IntersectionObserver: class {
      constructor(callback) { notify = callback; }
      observe(target) { observed.push(target); }
    },
  });

  return {
    sidebar,
    classes,
    observed,
    heading,
    notify: (isIntersecting = true) => notify([{ target: heading, isIntersecting }]),
  };
}

test('highlighting References never scrolls a viewport to reveal its sidebar link', () => {
  const state = setup();
  assert.deepEqual(state.observed, [state.heading]);
  state.notify();
  assert.equal(state.classes.has('active'), true);
  assert.equal(state.sidebar.scrollTop, 100);
});

test('a link below the sidebar scrolls only the sidebar by the missing distance', () => {
  const state = setup({ linkTop: 638, linkBottom: 660 });
  state.notify();
  assert.equal(state.sidebar.scrollTop, 160);
});

test('a link above the sidebar scrolls only the sidebar by the missing distance', () => {
  const state = setup({ linkTop: 20, linkBottom: 42 });
  state.notify();
  assert.equal(state.sidebar.scrollTop, 40);
});

test('a hidden desktop sidebar does not scroll on the mobile layout', () => {
  const state = setup({ sidebarHeight: 0 });
  state.notify();
  assert.equal(state.sidebar.scrollTop, 100);
});

test('a heading leaving the observed region does not cause a scroll', () => {
  const state = setup({ linkTop: 638, linkBottom: 660 });
  state.notify(false);
  assert.equal(state.classes.has('active'), false);
  assert.equal(state.sidebar.scrollTop, 100);
});

import test from 'node:test';
import assert from 'node:assert/strict';
const saved = new Map();
const events = new Map();
globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
globalThis.document = { documentElement: { dataset: {} } };
globalThis.window = { addEventListener: (name, handler) => events.set(name, handler) };
const appearance = await import('./appearance.js');
test('invalid stored preferences fall back to supported values', () => {
  assert.deepEqual(appearance.normalizeAppearance({ theme: 'bad', accent: 'red', reduceMotion: 'true' }), appearance.defaults);
});
test('preferences apply immediately, persist, notify, and reset', () => {
  appearance.initializeAppearance();
  let notifications = 0;
  const unsubscribe = appearance.subscribeAppearance(() => notifications++);
  appearance.updateAppearance({ theme: 'system', accent: 'violet', textSize: 'large', density: 'compact', reduceMotion: true });
  assert.equal(JSON.parse(saved.get('srmsAppearance')).theme, 'system');
  assert.equal(document.documentElement.dataset.accent, 'violet');
  assert.equal(document.documentElement.dataset.textSize, 'large');
  assert.equal(document.documentElement.dataset.density, 'compact');
  assert.equal(document.documentElement.dataset.reduceMotion, 'true');
  assert.equal(notifications, 1);
  appearance.updateAppearance(appearance.defaults);
  assert.deepEqual(appearance.getAppearance(), appearance.defaults);
  unsubscribe();
});
test('changes from other tabs update preferences and clearing storage resets them', () => {
  saved.set('srmsAppearance', JSON.stringify({ accent: 'rose', theme: 'dark' }));
  events.get('storage')({ key: 'srmsAppearance' });
  assert.equal(appearance.getAppearance().theme, 'dark');
  assert.equal(document.documentElement.dataset.accent, 'rose');
  saved.clear();
  events.get('storage')({ key: null });
  assert.deepEqual(appearance.getAppearance(), appearance.defaults);
});
test('blocked storage keeps controls functional and reports unsaved preferences', () => {
  localStorage.setItem = () => { throw new Error('Blocked'); };
  appearance.updateAppearance({ theme: 'dark' });
  assert.equal(appearance.getAppearance().theme, 'dark');
  assert.equal(appearance.isAppearanceSaved(), false);
});

test('every color mode and accent is supported and applied to the page', () => {
  for (const mode of appearance.colorModes) {
    appearance.updateAppearance({ theme: mode.id });
    assert.equal(appearance.getAppearance().theme, mode.id);
    assert.equal(document.documentElement.dataset.theme, mode.id);
  }
  for (const accent of appearance.accentColors) {
    appearance.updateAppearance({ accent });
    assert.equal(document.documentElement.dataset.accent, accent);
  }
});
test('custom modes resolve the correct base theme and system follows device mode', () => {
  for (const theme of ['light', 'warm', 'ocean']) assert.equal(appearance.isDarkColorMode(theme, true), false);
  for (const theme of ['dark', 'midnight']) assert.equal(appearance.isDarkColorMode(theme), true);
  assert.equal(appearance.isDarkColorMode('system', true), true);
  assert.equal(appearance.isDarkColorMode('system', false), false);
});

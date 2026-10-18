import { JSDOM } from 'jsdom';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../backend/dist/models.js';
import { tokenFor } from '../backend/dist/security.js';
const route = process.argv[2] || '/dashboard';
const width = Number(process.argv[3] || 1440);
const url = `http://127.0.0.1:4200${route}`;
const dom = new JSDOM('<!doctype html><html><head><base href="/"></head><body><app-root></app-root></body></html>', { url, pretendToBeVisual: true });
for (const key of ['window','document','navigator','location','history','localStorage','XMLHttpRequest','Node','Element','HTMLElement','Event','MouseEvent','MutationObserver','getComputedStyle']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: key === 'getComputedStyle' ? dom.window.getComputedStyle.bind(dom.window) : dom.window[key] });
}
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
Object.defineProperty(dom.window, 'innerWidth', { configurable: true, value: width });
globalThis.innerWidth = width;
const nativeFetch = globalThis.fetch;
let breakdownRequests = 0;
let totalBreakdownRequests = 0;
let dashboardResponses = 0;
let scheduleRecalculations = 0;
globalThis.fetch = async (input, init) => {
  const target = new URL(input, url);
  if (process.argv.includes('--slow') && target.pathname === '/api/dashboard') await new Promise(resolve => setTimeout(resolve, 1200));
  if (process.argv.includes('--error') && target.pathname === '/api/dashboard') return new Response(JSON.stringify({ error: 'Simulated outage' }), { status: 503, headers: { 'content-type': 'application/json' } });
  if (target.pathname.endsWith('/breakdown')) totalBreakdownRequests++;
  if (process.argv.includes('--generate-retry') && target.pathname.endsWith('/breakdown') && breakdownRequests++ === 0) return new Response(JSON.stringify({ error: 'Simulated AI outage' }), { status: 503, headers: { 'content-type': 'application/json' } });
  if (process.argv.includes('--generate-slow') && target.pathname.endsWith('/breakdown')) await new Promise(resolve => setTimeout(resolve, 1200));
  const result = await nativeFetch(target, init);
  if (target.pathname === '/api/dashboard') dashboardResponses++;
  if (target.pathname === '/api/schedule/recalculate') scheduleRecalculations++;
  return result;
};
dotenv.config({ path: '.env', quiet: true });
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/herflow');
const qaOnboarding = route === '/onboarding';
const demo = qaOnboarding
  ? await User.create({ email: `qa-onboarding-${Date.now()}@herflow.local`, passwordHash: 'test-only', name: 'QA', timezone: 'Africa/Lagos', role: 'student', onboarded: false })
  : await User.findOne({ email: 'demo@herflow.local' });
if (!demo) throw new Error('Test user is missing');
globalThis.localStorage.setItem('herflow_token', tokenFor(demo.id, demo.tokenVersion));
await mongoose.disconnect();
const filename = resolve('frontend/dist/frontend/browser/main.js');
await import(pathToFileURL(filename).href);
const waitFor = async (test, timeout = 10000) => {
  const start = Date.now();
  while (!test()) {
    if (Date.now() - start > timeout) throw new Error(`Timed out on ${route} at ${width}px: ${dom.window.document.querySelector('.energy')?.textContent} slider=${dom.window.document.querySelector('.capacity-label input')?.value} button=${dom.window.document.querySelector('.energy .btn.primary')?.disabled} ${dom.window.document.body.textContent?.slice(-200)}`);
    await new Promise(resolve => setTimeout(resolve, 30));
  }
};
const document = dom.window.document;
if (route === '/dashboard') {
  if (process.argv.includes('--error')) {
    await waitFor(() => document.querySelector('.empty')?.textContent?.includes('Could not load your dashboard'));
    assert.ok(document.querySelector('.empty button'));
    assert.equal(document.querySelector('.skeleton'), null);
  } else {
    await waitFor(() => document.querySelector('.welcome')?.textContent?.includes('planned blocks'));
    assert.match(document.body.textContent, /Good .*Maya/);
    assert.equal(document.querySelector('.skeleton'), null);
    if (process.argv.includes('--mutate')) {
      document.querySelectorAll('.mode-row button')[1].click();
      await waitFor(() => document.querySelector('.capacity-label strong')?.textContent === '40%');
      document.querySelector('.energy .btn.primary').click();
      await waitFor(() => dashboardResponses >= 2 && document.querySelector('.capacity-label strong')?.textContent === '40%' && !document.querySelector('.energy .btn.primary')?.disabled);
      assert.equal(document.querySelector('.skeleton'), null);
      document.querySelectorAll('.mode-row button')[0].click();
      await waitFor(() => document.querySelector('.capacity-label strong')?.textContent === '100%');
      document.querySelector('.energy .btn.primary').click();
      await waitFor(() => dashboardResponses >= 3 && document.querySelector('.capacity-label strong')?.textContent === '100%' && !document.querySelector('.energy .btn.primary')?.disabled);
    }
  }
} else if (route === '/projects') {
  await waitFor(() => document.querySelectorAll('.project-item').length > 0);
  assert.equal(document.body.textContent.includes('Loading projects'), false);
  document.querySelector('.project-item').click();
  await waitFor(() => document.querySelector('.project-detail h2'));
  await waitFor(() => document.querySelector('.task-heading'));
  if (process.argv.includes('--mutate')) {
    await waitFor(() => document.querySelector('.task-line input[type="checkbox"]'));
    const checkbox = document.querySelector('.task-line input[type="checkbox"]');
    assert.ok(checkbox, 'Demo project needs an approved task');
    const original = checkbox.checked;
    const originalStatus = document.querySelector('.task-line small')?.textContent;
    checkbox.checked = !original;
    checkbox.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await waitFor(() => document.querySelector('.task-line small')?.textContent !== originalStatus && document.querySelector('.task-line input[type="checkbox"]')?.checked === !original);
    const restored = document.querySelector('.task-line input[type="checkbox"]');
    restored.checked = original;
    restored.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await waitFor(() => document.querySelector('.task-line small')?.textContent === originalStatus && document.querySelector('.task-line input[type="checkbox"]')?.checked === original);
    const title = `QA Reactivity ${Date.now()}`;
    document.querySelector('.page-heading .btn.primary').click();
    await waitFor(() => document.querySelector('.modal input[name="title"]'));
    const titleInput = document.querySelector('.modal input[name="title"]');
    titleInput.value = title;
    titleInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    document.querySelector('.modal .btn.primary').click();
    await waitFor(() => [...document.querySelectorAll('.project-item')].some(item => item.textContent.includes(title)));
    await waitFor(() => document.querySelector('.project-detail h2')?.textContent === title);
    assert.match(document.querySelector('.project-detail h2')?.textContent || '', /QA Reactivity/);
    globalThis.confirm = dom.window.confirm = () => true;
    document.querySelector('.detail-top .danger').click();
    await waitFor(() => ![...document.querySelectorAll('.project-item')].some(item => item.textContent.includes(title)));
  }
  if (process.argv.includes('--generate') || process.argv.includes('--generate-retry') || process.argv.includes('--generate-slow')) {
    document.querySelector('.detail-actions .btn.primary').click();
    if (process.argv.includes('--generate-slow')) await waitFor(() => document.querySelector('.button-spinner'));
    await waitFor(() => document.querySelector('.suggestion') || document.querySelector('.error')?.textContent, 50000);
    if (process.argv.includes('--generate-retry')) {
      assert.match(document.querySelector('.error')?.textContent || '', /Simulated AI outage/);
      assert.equal(document.querySelector('.button-spinner'), null);
      assert.equal(document.querySelector('.detail-actions .btn.primary').disabled, false);
      document.querySelector('.detail-actions .btn.primary').click();
      await waitFor(() => document.querySelector('.suggestion'), 50000);
    }
    assert.ok(document.querySelector('.suggestion'), document.querySelector('.error')?.textContent || 'No suggestion');
    assert.match(document.querySelector('.suggestion').textContent, /Suggested breakdown \(\d+ tasks\)/);
    assert.equal(document.querySelector('.button-spinner'), null);
    assert.equal(totalBreakdownRequests, process.argv.includes('--generate-retry') ? 2 : 1);
  }
} else if (route === '/calendar') {
  await waitFor(() => document.querySelector('.days-grid') && !document.body.textContent.includes('Loading calendar'));
  assert.ok(document.querySelectorAll('.event').length > 0);
  assert.equal(document.querySelector('.error'), null);
  if (process.argv.includes('--recalculate')) {
    document.querySelector('.page-heading .btn.primary').click();
    await waitFor(() => scheduleRecalculations === 1 && document.querySelector('.notice')?.textContent?.trim());
    assert.ok(document.querySelectorAll('.event').length > 0);
  }
} else if (route === '/analytics') {
  await waitFor(() => document.querySelector('.insight'));
  assert.match(document.body.textContent, /Tasks completed/);
} else if (route === '/settings') {
  await waitFor(() => document.querySelector('input[name="name"]')?.value === 'Maya');
  assert.equal(document.body.textContent.includes('Loading settings'), false);
  if (process.argv.includes('--availability')) {
    const authorization = `Bearer ${localStorage.getItem('herflow_token')}`;
    const previousResponse = await nativeFetch('http://127.0.0.1:4200/api/preferences', { headers: { authorization } });
    const previous = (await previousResponse.json()).data;
    const firstDay = document.querySelector('.days input');
    const changed = Number(previous.availability[0]) === 2 ? 3 : 2;
    firstDay.value = String(changed);
    firstDay.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    firstDay.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    [...document.querySelectorAll('button')].find(button => button.textContent.includes('Save availability')).click();
    await waitFor(() => document.querySelector('.notice')?.textContent?.includes('schedule updated'));
    const saved = await nativeFetch('http://127.0.0.1:4200/api/preferences', { headers: { authorization } });
    assert.equal((await saved.json()).data.availability[0], changed);
    document.querySelector('a[href="/calendar"]').click();
    await waitFor(() => document.querySelector('.days-grid') && !document.body.textContent.includes('Loading calendar'));
    const { _id, user, createdAt, updatedAt, ...body } = previous;
    const restored = await nativeFetch('http://127.0.0.1:4200/api/preferences', { method: 'PUT', headers: { authorization, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(restored.status, 200);
  }
  if (process.argv.includes('--cycle')) {
    const consent = [...document.querySelectorAll('label.check')].find(label => label.textContent.includes('I consent')).querySelector('input');
    consent.checked = true;
    consent.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    await waitFor(() => document.querySelector('input[type="date"]'));
    await waitFor(() => document.querySelector('.notice')?.textContent?.includes('Profile saved'));
    const date = new Date().toISOString().slice(0, 10);
    const dateInput = document.querySelector('input[type="date"]');
    dateInput.value = date;
    dateInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    dateInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    const saveCycle = [...document.querySelectorAll('button')].find(button => button.textContent.includes('Save private preferences'));
    saveCycle.click();
    await waitFor(() => document.querySelector('.notice')?.textContent?.includes('Private preferences saved'));
    const stored = await nativeFetch('http://127.0.0.1:4200/api/cycle', { headers: { authorization: `Bearer ${localStorage.getItem('herflow_token')}` } });
    assert.equal(stored.status, 200);
    assert.equal((await stored.json()).data.lastPeriodDate, date);
    document.querySelector('a[href="/calendar"]').click();
    await waitFor(() => document.querySelector('.days-grid') && !document.body.textContent.includes('Loading calendar'));
    assert.ok(document.querySelectorAll('.event').length > 0);
  }
} else if (route === '/onboarding') {
  const next = () => document.querySelector('.wizard-actions .btn.primary').click();
  await waitFor(() => document.body.textContent.includes('MISSION 1 OF 4'));
  const name = document.querySelector('input[name="name"]');
  name.value = 'QA Mission';
  name.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  next();
  await waitFor(() => document.body.textContent.includes('MISSION 2 OF 4'));
  next();
  await waitFor(() => document.body.textContent.includes('MISSION 3 OF 4'));
  next();
  await waitFor(() => document.body.textContent.includes('MISSION 4 OF 4'));
  const consent = document.querySelector('input[name="consent"]');
  consent.checked = true;
  consent.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await waitFor(() => document.querySelector('input[name="periodDate"]'));
  const date = new Date().toISOString().slice(0, 10);
  const period = document.querySelector('input[name="periodDate"]');
  period.value = date;
  period.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  period.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  next();
  await waitFor(() => document.querySelector('.welcome') || document.querySelector('.wizard .error')?.textContent, 12000);
  assert.ok(document.querySelector('.welcome'), document.querySelector('.wizard .error')?.textContent || 'Onboarding did not complete');
  const stored = await nativeFetch('http://127.0.0.1:4200/api/cycle', { headers: { authorization: `Bearer ${localStorage.getItem('herflow_token')}` } });
  assert.equal((await stored.json()).data.lastPeriodDate, date);
  const deleted = await nativeFetch('http://127.0.0.1:4200/api/me', { method: 'DELETE', headers: { authorization: `Bearer ${localStorage.getItem('herflow_token')}` } });
  assert.equal(deleted.status, 200);
}
console.log(`PASS ${route} ${width}px without input interaction`);


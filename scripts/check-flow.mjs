import assert from 'node:assert/strict';

const base = 'http://127.0.0.1:3000/api';
let token = '';
async function api(path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(result)}`);
  return result.data;
}
const days = n => new Date(Date.now() + n * 86400000).toISOString();
const today = new Date().toISOString().slice(0, 10);
const email = `qa-${Date.now()}@herflow.local`;
const password = 'FlowTestPassword123!';
try {
  const registered = await api('/auth/register', 'POST', { name: 'Flow Test', email, password });
  token = registered.token;
  assert.ok(token);
  await api('/onboarding', 'POST', { name: 'Flow Test', timezone: 'Africa/Lagos', role: 'both', privacyConsent: false, preferences: { availability: [4,4,4,4,4,4,4], breakMinutes: 15 } });
  const projects = [];
  for (const [i, title] of ['Portfolio', 'Presentation', 'Workshop'].entries()) {
    const project = await api('/projects', 'POST', { title, description: `Complete ${title.toLowerCase()} and review it`, category: 'Work', deadline: days(3 + i * 2), priority: 5 - i, complexity: 3, estimatedMinutes: 240 });
    projects.push(project);
    const suggestion = await api(`/projects/${project._id}/breakdown`, 'POST');
    assert.ok(['fallback-no-key', 'fallback-error', 'gemini', 'cache'].includes(suggestion.source));
    await api(`/projects/${project._id}/approve-breakdown`, 'POST', { milestones: suggestion.milestones });
  }
  const before = await api('/schedule/recalculate', 'POST');
  assert.ok(before.slots.length > 0);
  const plannedToday = before.slots.filter(s => s.start.slice(0, 10) === today).reduce((sum, s) => sum + (Date.parse(s.end) - Date.parse(s.start)) / 60000, 0);
  const check = await api(`/checkins/${today}`, 'PUT', { capacity: 20, mode: 'low' });
  const lowToday = check.plan.slots.filter(s => s.start.slice(0, 10) === today).reduce((sum, s) => sum + (Date.parse(s.end) - Date.parse(s.start)) / 60000, 0);
  assert.ok(lowToday <= plannedToday, `20% workload ${lowToday} exceeds original ${plannedToday}`);
  const tasks = (await api('/tasks?limit=100')).items;
  assert.ok(tasks.length >= 12);
  await api(`/tasks/${tasks[0]._id}`, 'PATCH', { status: 'done' });
  const missed = await api(`/tasks/${tasks[1]._id}`, 'PATCH', { status: 'missed' });
  assert.ok(Array.isArray(missed.plan.slots));
  await api(`/projects/${projects[0]._id}`, 'PATCH', { deadline: days(9) });
  const relogin = await api('/auth/login', 'POST', { email, password });
  token = relogin.token;
  assert.equal((await api('/projects')).items.length, 3);
  assert.equal((await api('/tasks?limit=100')).items.length, tasks.length);
  assert.equal((await api('/checkins')).length, 1);
  assert.ok((await api('/schedule')).length > 0);
  console.log(JSON.stringify({ result: 'passed', projects: 3, tasks: tasks.length, plannedToday, lowToday, fallback: true, persistence: true }));
} finally {
  if (token) await api('/me', 'DELETE').catch(() => {});
}

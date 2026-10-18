const base = 'http://127.0.0.1:3000/api';
const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@herflow.local', password: 'DemoPassword123!' }) });
if (!login.ok) throw new Error(`Demo login failed: ${login.status}`);
const token = (await login.json()).data.token;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const created = await fetch(`${base}/projects`, { method: 'POST', headers, body: JSON.stringify({ title: 'QA breakdown timing', description: 'Prepare a short presentation with outline, draft slides, and review.', category: 'Test', deadline: new Date(Date.now() + 7 * 86400000).toISOString(), priority: 3, complexity: 2, estimatedMinutes: 180 }) });
if (!created.ok) throw new Error(`Project create failed: ${created.status}`);
const project = (await created.json()).data;
try {
  const start = Date.now();
  const response = await fetch(`${base}/projects/${project._id}/breakdown`, { method: 'POST', headers, signal: AbortSignal.timeout(45000) });
  const result = await response.json();
  if (!response.ok) throw new Error(`Breakdown failed: ${response.status}`);
  console.log(JSON.stringify({ source: result.data.source, milestones: result.data.milestones?.length, elapsedSeconds: Math.round((Date.now() - start) / 1000) }));
} finally {
  await fetch(`${base}/projects/${project._id}`, { method: 'DELETE', headers });
}

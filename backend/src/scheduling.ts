import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { DailyCheckIn, Project, Schedule, Task, UserPreferences, User, Notification, CyclePreferences } from './models.js';
import { decrypt } from './security.js';

type Item = { id: string; title: string; minutes: number; deadline: string; priority: number; difficulty: number; dependencies: string[] };
type Slot = { task: string; title: string; start: string; end: string; reason: string };
type Input = { tasks: Item[]; days: { date: string; start?: string; capacity: number; availableMinutes: number; locked: { start: string; end: string }[] }[] };
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
export function phaseFor(date: string, cycle: { lastPeriodDate?: Date | null; typicalCycleDays?: number; periodDuration?: number } | null): { phase: CyclePhase | null; day: number; estimated: boolean } {
  if (!cycle?.lastPeriodDate) return { phase: null, day: 0, estimated: false };
  const cycleDays = Math.min(45, Math.max(20, cycle.typicalCycleDays || 28));
  const periodDays = Math.min(cycleDays, Math.max(2, cycle.periodDuration || 5));
  const start = new Date(cycle.lastPeriodDate);
  const dayIndex = Math.floor((Date.parse(`${date}T00:00:00Z`) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86400000);
  if (dayIndex < 0) return { phase: null, day: 0, estimated: false };
  const day = (dayIndex % cycleDays) + 1;
  let phase: CyclePhase;
  if (day <= periodDays) phase = 'menstrual';
  else if (day <= Math.floor(periodDays + (cycleDays - periodDays) * 0.4)) phase = 'follicular';
  else if (day <= Math.floor(periodDays + (cycleDays - periodDays) * 0.62)) phase = 'ovulatory';
  else phase = 'luteal';
  return { phase, day, estimated: true };
}
export function deterministic(input: Input): { slots: Slot[]; warnings: string[] } {
  const slots: Slot[] = [], warnings: string[] = [];
  const placed = new Set<string>();
  const pending = [...input.tasks];
  while (pending.length) {
    const eligible = pending.filter(task => task.dependencies.every(id => placed.has(id) || !input.tasks.some(t => t.id === id)));
    if (!eligible.length) { warnings.push('Some tasks have circular or unscheduled dependencies. Review task order.'); break; }
    eligible.sort((a, b) => a.deadline.localeCompare(b.deadline) || b.priority - a.priority);
    const task = eligible[0];
    pending.splice(pending.indexOf(task), 1);
    let remaining = task.minutes;
    for (const day of input.days) {
      if (remaining <= 0) break;
      if (day.date > task.deadline.slice(0, 10)) break;
      if (day.capacity <= 30 && task.difficulty >= 4) continue;
      while (remaining >= 15) {
        const own = slots.filter(s => s.start.slice(0, 10) === day.date);
        const used = own.reduce((n, s) => n + (Date.parse(s.end) - Date.parse(s.start)) / 60000, 0);
        const lockedMinutes = day.locked.reduce((n, s) => n + Math.max(0, (Date.parse(s.end) - Date.parse(s.start)) / 60000), 0);
        const allowance = Math.max(0, Math.floor(day.availableMinutes * day.capacity / 100) - lockedMinutes - used);
        const chunk = Math.min(remaining, allowance, 120);
        if (chunk < 15) break;
        let cursor = Math.max(Date.parse(day.start || `${day.date}T09:00:00.000Z`), ...own.map(s => Date.parse(s.end)));
        for (const locked of day.locked) if (cursor < Date.parse(locked.end) && cursor + chunk * 60000 > Date.parse(locked.start)) cursor = Date.parse(locked.end);
        slots.push({ task: task.id, title: task.title, start: new Date(cursor).toISOString(), end: new Date(cursor + chunk * 60000).toISOString(), reason: day.capacity < 50 ? 'Placed around your reported capacity' : 'Placed before deadline' });
        remaining -= chunk;
      }
    }
    if (remaining > 0) warnings.push(`${task.title}: ${remaining} minutes could not fit before the deadline. Extend the deadline or add availability.`);
    else placed.add(task.id);
  }
  return { slots, warnings };
}
async function python(input: Input): Promise<{ slots: Slot[]; warnings: string[] } | null> {
  const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scheduler/solve.py');
  return new Promise(resolve => {
    let child;
    try { child = spawn(process.env.SCHEDULER_PYTHON || 'python', [script], { stdio: ['pipe', 'pipe', 'ignore'] }); }
    catch { resolve(null); return; }
    let output = ''; const timer = setTimeout(() => child.kill(), 8000);
    child.on('error', () => { clearTimeout(timer); resolve(null); });
    child.stdin.on('error', () => resolve(null));
    child.stdout.on('data', chunk => { output += chunk; if (output.length > 500000) child.kill(); });
    child.on('close', code => { clearTimeout(timer); try { resolve(code === 0 ? JSON.parse(output) : null); } catch { resolve(null); } });
    child.stdin.end(JSON.stringify(input));
  });
}
const replanQueues = new Map<string, Promise<unknown>>();
export async function replan<T = Awaited<ReturnType<typeof executeReplan>>>(userId: string, reason = 'change'): Promise<T> {
  const previous = replanQueues.get(userId) || Promise.resolve();
  const next: Promise<T> = previous.catch(() => undefined).then(() => executeReplan(userId, reason) as Promise<T>).catch(async error => {
    if (replanCopy[reason]) await Notification.create({ user: userId, title: 'Calendar update failed', body: 'Your calendar could not be recalculated. Your previous schedule is still available; please try again.', type: 'error', metadata: { reason } }).catch(() => undefined);
    throw error;
  });
  replanQueues.set(userId, next.catch(() => undefined));
  return next;
}
const replanCopy: Record<string, string> = {
  cycle: 'Your cycle information has been updated. Your upcoming tasks have been reorganized around your preferred energy levels while protecting your deadlines.',
  energy: "Your energy level has been updated. We've lightened today's workload and redistributed your remaining tasks while keeping your deadlines in mind.",
  'project-add': 'Your new project has been added! Your calendar has been reorganized to balance all your upcoming deadlines.',
  'project-edit': "Your project has been updated. We've adjusted your upcoming tasks to reflect the change.",
  'project-delete': 'Your project has been removed. The remaining tasks across your calendar have been rebalanced.',
  deadline: "Your project deadline has been updated. We've adjusted your upcoming tasks to reflect your new priorities.",
  'task-missed': 'No worries! Your unfinished task has been reconsidered in your schedule. Check your updated plan.',
  'task-complete': 'Your task is complete. Any affected upcoming tasks have been rebalanced.',
  'task-delete': 'Your task has been removed. The rest of your plan has been rebalanced.',
  availability: "Your available hours have changed. We've redistributed your remaining tasks to match.",
  commitment: "Your commitments have changed. We've moved your remaining tasks around them.",
  cycle_preferences: 'Your cycle workload preferences have been updated. Future days now follow the capacities you chose.',
  manual: 'Your calendar has been recalculated.'
};
export async function notifyReplan(userId: string, reason: string, plan: Awaited<ReturnType<typeof executeReplan>>) {
  const copy = replanCopy[reason];
  if (!copy) return null;
  const changes = plan.comparison.moved.length;
  const unchanged = changes ? '' : ' No tasks moved, so your calendar remains unchanged.';
  const infeasible = plan.warnings.length ? ` ${plan.warnings.length} scheduling issue${plan.warnings.length === 1 ? ' needs' : 's need'} your attention.` : '';
  return Notification.create({ user: userId, title: 'Your calendar has been updated', body: `${copy}${unchanged}${infeasible}`, type: plan.warnings.length ? 'warning' : 'replan', comparison: plan.comparison, metadata: { reason, moved: changes, warnings: plan.warnings } });
}
async function executeReplan(userId: string, reason = 'change') {
  const today = new Date().toISOString().slice(0, 10);
  const [tasks, projects, prefs, checkins, old, locked, user, cycleDoc] = await Promise.all([
    Task.find({ user: userId, approved: true, status: { $in: ['todo', 'missed'] } }).lean(), Project.find({ user: userId }).lean(), UserPreferences.findOne({ user: userId }).lean(), DailyCheckIn.find({ user: userId, date: { $gte: today } }).lean(), Schedule.find({ user: userId, kind: 'task', locked: false, start: { $gte: new Date(`${today}T00:00:00Z`) } }).lean(), Schedule.find({ user: userId, locked: true, start: { $gte: new Date(`${today}T00:00:00Z`) } }).lean(), User.findById(userId).select('timezone').lean(), CyclePreferences.findOne({ user: userId }).lean()
  ]);
  let cycle: any = null;
  if (cycleDoc) { try { const decrypted = decrypt(cycleDoc.encrypted); cycle = { ...decrypted, lastPeriodDate: cycleDoc.lastPeriodDate, typicalCycleDays: cycleDoc.typicalCycleDays, periodDuration: cycleDoc.periodDuration, isRegular: cycleDoc.isRegular, notApplicable: cycleDoc.notApplicable }; } catch { cycle = null; } }
  const byProject = new Map(projects.map(p => [String(p._id), p]));
  const checks = new Map(checkins.map(c => [c.date, c]));
  const starts = [...(prefs?.workHours || []), ...(prefs?.studyHours || [])].map(value => /^\s*(\d{1,2}):(\d{2})/.exec(value)).filter(Boolean).map(match => Number(match![1]) * 60 + Number(match![2]));
  const startMinutes = starts.length ? Math.min(...starts) : 9 * 60;
  const zone = user?.timezone || 'UTC';
  const localStart = (date: string) => { try { const noon = new Date(`${date}T12:00:00Z`); const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(noon); const raw = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT'; const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(raw); const offset = match ? (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] || 0)) : 0; const [year, month, day] = date.split('-').map(Number); return new Date(Date.UTC(year, month - 1, day, Math.floor(startMinutes / 60), startMinutes % 60) - offset * 60000).toISOString(); } catch { return `${date}T09:00:00.000Z`; } };
  const phaseCapacity: Record<string, number> = {};
  if (cycle && !cycle.notApplicable && cycle.lastPeriodDate) for (const key of ['menstrual', 'follicular', 'ovulatory', 'luteal']) if (typeof cycle.workloadPreferences?.[key] === 'number') phaseCapacity[key] = cycle.workloadPreferences[key];
  const days = Array.from({ length: 28 }, (_, i) => { const d = new Date(`${today}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i); const date = d.toISOString().slice(0, 10); const reported = checks.get(date)?.capacity; const lowDay = prefs?.lowCapacityDays?.includes(d.getUTCDay()); const info = phaseFor(date, cycle); const phaseCap = info.phase ? phaseCapacity[info.phase] : undefined; let capacity: number; if (typeof reported === 'number') capacity = reported; else if (lowDay) capacity = 50; else if (typeof phaseCap === 'number') capacity = phaseCap; else capacity = 100; return { date, start: localStart(date), capacity, availableMinutes: Math.max(0, (prefs?.availability?.[d.getUTCDay()] ?? 4) * 60 - (prefs?.breakMinutes ?? 15)), locked: locked.filter(x => x.start.toISOString().slice(0, 10) === date).map(x => ({ start: x.start.toISOString(), end: x.end.toISOString() })) }; });
  const input: Input = { tasks: tasks.map(t => ({ id: String(t._id), title: t.title, minutes: t.estimatedMinutes, deadline: (t.deadline || byProject.get(String(t.project))?.deadline || new Date(Date.now() + 7 * 86400000)).toISOString(), priority: byProject.get(String(t.project))?.priority || 3, difficulty: t.difficulty, dependencies: t.dependencies.map(String) })), days };
  const result = await python(input) || deterministic(input);
  const previous = new Map(old.map(s => [String(s.task), s.start.toISOString()]));
  const taskProjects = new Map(tasks.map(task => [String(task._id), task.project]));
  if (result.slots.length) await Schedule.insertMany(result.slots.map(s => ({ user: userId, task: s.task, project: taskProjects.get(s.task), title: s.title, start: s.start, end: s.end, reason: s.reason })));
  await Schedule.deleteMany({ _id: { $in: old.map(s => s._id) }, user: userId });
  for (const project of projects) if (project.deadline > new Date() && project.deadline < new Date(Date.now() + 48 * 3600000)) await Notification.findOneAndUpdate({ user: userId, project: project._id }, { $set: { title: `Deadline approaching: ${project.title}`, body: 'Check your remaining tasks and adjust the plan if needed.', dueAt: project.deadline }, $setOnInsert: { read: false } }, { upsert: true });
  const moved = result.slots.filter(s => previous.has(s.task) && previous.get(s.task) !== s.start).map(s => ({ task: s.task, from: previous.get(s.task), to: s.start, reason: s.reason }));
  const removed = old.filter(s => !result.slots.some(n => String(n.task) === String(s.task))).map(s => ({ task: String(s.task), title: s.title, from: s.start.toISOString(), to: null as string | null }));
  const added = result.slots.filter(s => !previous.has(s.task)).map(s => ({ task: s.task, title: s.title, from: null as string | null, to: s.start }));
  const comparison = { moved: [...moved.map(m => ({ ...m, title: result.slots.find(s => s.task === m.task)?.title || 'Task' })), ...removed, ...added], warnings: result.warnings, plannedMinutes: result.slots.reduce((n, s) => n + (Date.parse(s.end) - Date.parse(s.start)) / 60000, 0) };
  const plan = { ...result, moved, removed, added, comparison, reason };
  await notifyReplan(userId, reason, plan as never).catch(() => undefined);
  return plan;
}

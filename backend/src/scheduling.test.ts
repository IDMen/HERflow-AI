import { describe, it, expect } from 'vitest';
import { deterministic } from './scheduling.js';
import { decrypt, encrypt } from './security.js';
import { fallback } from './ai.js';

const day = (date: string, capacity = 100, availableMinutes = 240, locked: { start: string; end: string }[] = []) => ({ date, capacity, availableMinutes, locked });
const task = (id: string, minutes: number, deadline = '2026-10-20', dependencies: string[] = [], difficulty = 3) => ({ id, title: id, minutes, deadline, priority: 3, dependencies, difficulty });
describe('deterministic scheduler', () => {
  it('moves work from a 20% day to another day', () => { const normal = deterministic({ tasks: [task('a', 180)], days: [day('2026-10-18'), day('2026-10-19')] }); const low = deterministic({ tasks: [task('a', 180)], days: [day('2026-10-18', 20), day('2026-10-19')] }); expect(normal.slots.filter(s => s.start.startsWith('2026-10-18')).length).toBeGreaterThan(low.slots.filter(s => s.start.startsWith('2026-10-18')).length); expect(low.slots.some(s => s.start.startsWith('2026-10-19'))).toBe(true); });
  it('respects locks and warns about impossible deadlines', () => { const result = deterministic({ tasks: [task('a', 240, '2026-10-18')], days: [day('2026-10-18', 100, 240, [{ start: '2026-10-18T09:00:00Z', end: '2026-10-18T11:00:00Z' }])] }); expect(result.warnings[0]).toContain('could not fit'); expect(result.slots[0].start).toBe('2026-10-18T11:00:00.000Z'); });
  it('schedules dependencies before dependent tasks', () => { const result = deterministic({ tasks: [task('child', 60, '2026-10-19', ['parent']), task('parent', 60, '2026-10-19')], days: [day('2026-10-18'), day('2026-10-19')] }); expect(result.slots[0].task).toBe('parent'); expect(result.slots.some(s => s.task === 'child')).toBe(true); });
  it('keeps hard tasks off a rest day', () => { const result = deterministic({ tasks: [task('hard', 60, '2026-10-19', [], 5)], days: [day('2026-10-18', 20), day('2026-10-19')] }); expect(result.slots[0].start).toContain('2026-10-19'); });
});
describe('privacy and fallback', () => {
  it('encrypts cycle values before storage', () => { process.env.SENSITIVE_DATA_KEY = '1'.repeat(64); const value = { symptoms: ['cramps'] }; const stored = encrypt(value); expect(stored).not.toContain('cramps'); expect(decrypt(stored)).toEqual(value); });
  it('produces reviewable tasks without Gemini', () => { const value = fallback('Thesis', 240); expect(value.milestones.length).toBeGreaterThan(0); expect(value.milestones.flatMap(m => m.tasks).length).toBe(4); });
});

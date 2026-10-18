"""Bounded day-allocation solver. Reads one JSON input and emits one JSON result."""
import json
import sys
from datetime import datetime, timedelta, timezone


def solve(data):
    try:
        from ortools.sat.python import cp_model
    except ImportError:
        return None
    tasks, days = data['tasks'], data['days']
    if not tasks:
        return {'slots': [], 'warnings': []}
    model = cp_model.CpModel()
    slots = {}
    for ti, task in enumerate(tasks):
        for di, day in enumerate(days):
            if day['date'] <= task['deadline'][:10] and not (day['capacity'] <= 30 and task['difficulty'] >= 4):
                slots[ti, di] = model.NewIntVar(0, max(0, task['minutes'] // 15), f'x_{ti}_{di}')
    for di, day in enumerate(days):
        locked_minutes = sum(max(0, int((datetime.fromisoformat(lock['end'].replace('Z', '+00:00')) - datetime.fromisoformat(lock['start'].replace('Z', '+00:00'))).total_seconds() // 60)) for lock in day['locked'])
        budget = max(0, int((day['availableMinutes'] * day['capacity'] / 100 - locked_minutes) // 15))
        model.Add(sum(v for (ti, dj), v in slots.items() if dj == di) <= budget)
    for ti, task in enumerate(tasks):
        model.Add(sum(v for (tj, _), v in slots.items() if tj == ti) <= task['minutes'] // 15)
    ids = {task['id']: ti for ti, task in enumerate(tasks)}
    for ti, task in enumerate(tasks):
        for dependency in task['dependencies']:
            if dependency in ids:
                parent = ids[dependency]
                child_active = model.NewBoolVar(f'active_{ti}_{parent}')
                child_total = sum(v for (tj, _), v in slots.items() if tj == ti)
                model.Add(child_total >= 1).OnlyEnforceIf(child_active)
                model.Add(child_total == 0).OnlyEnforceIf(child_active.Not())
                model.Add(sum(v for (tj, _), v in slots.items() if tj == parent) == tasks[parent]['minutes'] // 15).OnlyEnforceIf(child_active)
                for di in range(len(days)):
                    if (ti, di) in slots:
                        model.Add(sum(v for (tj, dj), v in slots.items() if tj == ti and dj <= di) <= sum(v for (tj, dj), v in slots.items() if tj == parent and dj < di) * 100)
    model.Maximize(sum(v * (100 + task['priority'] * 10 - di - (20 if days[di]['capacity'] < 50 and task['difficulty'] > 3 else 0)) for (ti, di), v in slots.items() for task in [tasks[ti]]))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 3
    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None
    output, warnings = [], []
    for di, day in enumerate(days):
        cursor = datetime.fromisoformat(day.get('start', day['date'] + 'T09:00:00+00:00').replace('Z', '+00:00'))
        for ti, task in enumerate(tasks):
            count = solver.Value(slots[ti, di]) if (ti, di) in slots else 0
            if count:
                duration = timedelta(minutes=count * 15)
                for lock in day['locked']:
                    start = datetime.fromisoformat(lock['start'].replace('Z', '+00:00'))
                    end = datetime.fromisoformat(lock['end'].replace('Z', '+00:00'))
                    if cursor < end and cursor + duration > start:
                        cursor = end
                output.append({'task': task['id'], 'title': task['title'], 'start': cursor.isoformat().replace('+00:00', 'Z'), 'end': (cursor + duration).isoformat().replace('+00:00', 'Z'), 'reason': 'Optimized for deadline and reported capacity'})
                cursor += duration
    for ti, task in enumerate(tasks):
        assigned = sum(solver.Value(v) * 15 for (tj, _), v in slots.items() if tj == ti)
        if assigned < task['minutes']:
            warnings.append(f"{task['title']}: {task['minutes'] - assigned} minutes could not fit before the deadline. Extend the deadline or add availability.")
    return {'slots': output, 'warnings': warnings}


if __name__ == '__main__':
    data = json.load(sys.stdin)
    result = solve(data)
    if result is None:
        sys.exit(2)
    print(json.dumps(result))

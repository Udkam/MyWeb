"""Read-only-world navigation for real-input browser checks; no engine imports or writes."""
import heapq
import json
import math

def state(p): return json.loads(p.evaluate('window.render_game_to_text()'))
def advance(p, ms): p.evaluate('(ms)=>window.advanceTime(ms)', ms)

def waypoint_to(s, goal):
    """Reach a live enemy through ordinary floor; walls can safely block idle foes."""
    start = (s['player']['x'], s['player']['y'])
    bottom = s['height'] - (150 if s['height'] > s['width'] else 28)
    def free(point, radius=15):
        x, y = point
        return (28 + radius <= x <= s['width'] - 28 - radius and 66 + radius <= y <= bottom - radius
            and not any(math.hypot(x - max(o['x'], min(o['x'] + o['w'], x)), y - max(o['y'], min(o['y'] + o['h'], y))) < radius for o in s['obstacles']))
    def clear(a, b, radius=15):
        count = max(1, math.ceil(math.dist(a, b) / 6))
        return all(free((a[0] + (b[0] - a[0]) * i / count, a[1] + (b[1] - a[1]) * i / count), radius) for i in range(count + 1))
    if not free(start):
        candidates = [(start[0] + math.cos(i * math.tau / 16) * r, start[1] + math.sin(i * math.tau / 16) * r) for r in [20, 40] for i in range(16)]
        candidates = [p for p in candidates if free(p) and clear(start, p, s['player']['r'])]
        if candidates:
            return min(candidates, key=lambda p: math.dist(p, goal))
    if clear(start, goal, s['player']['r']):
        return goal
    size = 24
    def point(node): return (node[0] * size, node[1] * size)
    def nearest(position):
        key = (round(position[0] / size), round(position[1] / size))
        options = [(key[0] + dx, key[1] + dy) for dx in range(-5, 6) for dy in range(-5, 6)]
        options = [n for n in options if free(point(n)) and clear(position, point(n), s['player']['r'])]
        return min(options, key=lambda n: math.dist(point(n), position)) if options else None
    first, last = nearest(start), nearest(goal)
    if first is None or last is None:
        raise AssertionError('No collision-safe death-test route to a live enemy')
    queue, costs, parents = [(0, first)], {first: 0}, {}
    while queue:
        _, node = heapq.heappop(queue)
        if node == last:
            break
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
            nxt = (node[0] + dx, node[1] + dy)
            if not free(point(nxt)) or not clear(point(node), point(nxt)):
                continue
            cost = costs[node] + math.hypot(dx, dy)
            if cost < costs.get(nxt, math.inf):
                costs[nxt] = cost; parents[nxt] = node
                heapq.heappush(queue, (cost + math.dist(nxt, last), nxt))
    if last not in costs:
        raise AssertionError('Death-test enemy is disconnected from the player')
    route = [last]
    while route[-1] != first:
        route.append(parents[route[-1]])
    route.reverse()
    visible = point(first)
    for node in route[1:]:
        if clear(start, point(node), s['player']['r']):
            visible = point(node)
        else:
            break
    return visible

def die_from_real_damage(p):
    """No attacks or world edits: walk to enemies and accept actual combat damage."""
    initial = state(p); held = set(); hits = []; prior_hp = initial['player']['hp']
    try:
        for _ in range(300):
            s = state(p)
            if s['phase'] == 'dead':
                break
            if s['phase'] != 'combat' or not s['enemies']:
                raise AssertionError('No live combat enemies available for death-screen check')
            player = (s['player']['x'], s['player']['y'])
            enemy = min(s['enemies'], key=lambda e: math.dist(player, (e['x'], e['y'])))
            target = (enemy['x'], enemy['y'])
            waypoint = waypoint_to(s, target)
            dx, dy = waypoint[0] - player[0], waypoint[1] - player[1]
            keys = ({'d'} if dx > 5 else {'a'} if dx < -5 else set()) | ({'s'} if dy > 5 else {'w'} if dy < -5 else set())
            for key in held - keys: p.keyboard.up(key)
            for key in keys - held: p.keyboard.down(key)
            held = keys; advance(p, 100)
            now = state(p)
            if now['player']['hp'] < prior_hp:
                hits.append({'time': now['time'], 'hp': now['player']['hp']}); prior_hp = now['player']['hp']
    finally:
        for key in held: p.keyboard.up(key)
    return {'seed': initial['seed'], 'layout': initial['layout'], 'initial_damage': initial['stats']['damageTaken'], 'hits': hits}


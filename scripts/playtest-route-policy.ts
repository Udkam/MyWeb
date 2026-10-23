import assert from 'node:assert/strict';
import { createModel, step, snapshot, getContextAction, type Model, type Input } from '../src/game/model';

export type RouteOrder = 'remoteFirst' | 'cannonFirst' | 'hugAudit';

/** Read-only decision policy: every change in these two routes comes from a normal input tick. */
export function naturalRoute(order: RouteOrder, onTick?: (input: Partial<Input>, view: ReturnType<typeof snapshot>) => void): Model {
  const model = createModel();
  const tick = (input: Partial<Input> = {}) => {
    step(model, input);
    assert.ok(model.hero.hp > 0, `route died at tick ${model.tick}`);
    onTick?.(structuredClone(input), snapshot(model));
  };
  const until = (condition: () => boolean, limit = 500, input: () => Partial<Input> = () => ({})) => {
    for (let i = 0; i < limit && !condition() && model.encounter.status !== 'complete'; i += 1) tick(input());
    assert.ok(condition() || model.encounter.status === 'complete', `route stalled at ${model.tick}: ${JSON.stringify(snapshot(model))}`);
  };
  const rightTo = (goal: number) => until(() => model.hero.x >= goal, 500, () => {
    const hero = model.hero; const sword = model.enemies[0]!;
    const near = sword.hp > 0 && sword.x > hero.x && sword.x - hero.x < (order !== 'cannonFirst' ? 65 : 90);
    return { move: 1,
      jumpPressed: hero.grounded && ((hero.x >= 125 && hero.x <= 160) || (hero.x >= 398 && hero.x <= 431)
        || (near && (order !== 'cannonFirst' || hero.y < 255))),
      dodgePressed: order === 'cannonFirst' && hero.grounded && hero.y === 255 && near && model.time >= hero.dodgeCooldownUntil };
  });
  const reloadPursuit = () => {
    until(() => model.enemies[1]!.action === 'reload' && Math.abs(model.enemies[1]!.x - model.hero.x) <= 48
      && !['hurt', 'hurtRecover'].includes(model.hero.action), 300, () => {
      const gap = model.enemies[1]!.x - model.hero.x;
      return { move: Math.abs(gap) > 43 ? Math.sign(gap) : 0 };
    });
    tick({ attackPressed: true }); until(() => Boolean(model.hero.opportunity), 40);
    until(() => Boolean(model.hero.attack?.cancelOpen), 30); tick({ attackPressed: true });
    until(() => model.enemies[1]!.hp <= 0, 100);
  };
  const swordParry = () => {
    until(() => Math.abs(model.enemies[0]!.x - model.hero.x) >= 42
      && Math.abs(model.enemies[0]!.x - model.hero.x) <= 50, 180, () => {
      const gap = model.enemies[0]!.x - model.hero.x;
      return { move: Math.abs(gap) < 42 ? -Math.sign(gap) : Math.abs(gap) > 50 ? Math.sign(gap) : 0 };
    });
    tick({ move: Math.sign(model.enemies[0]!.x - model.hero.x) });
    until(() => model.enemies[0]!.action === 'windup' && model.enemies[0]!.actionTime >= 400, 180);
    tick({ guardPressed: true, guardHeld: true });
    until(() => model.hero.opportunity?.source === 'parry', 12, () => ({ guardHeld: true }));
  };
  if (order !== 'cannonFirst') {
    rightTo(450); until(() => model.hero.grounded && model.hero.y === 207, 100); reloadPursuit();
    until(() => model.hero.x <= 390, 200, () => ({ move: -1,
      jumpPressed: model.hero.grounded && model.hero.x - model.enemies[0]!.x < 85 }));
    until(() => model.hero.grounded && model.hero.y === 255, 100); tick({ move: 1 });
    if (order === 'hugAudit') return model;
    for (let i = 0; i < 2 && model.enemies[0]!.hp > 0; i += 1) {
      swordParry(); tick({ attackPressed: true }); until(() => !model.hero.attack, 50);
    }
  } else {
    rightTo(350); until(() => model.hero.grounded && model.hero.y === 255, 100); swordParry();
    assert.equal(getContextAction(model).kind, 'shove', 'floor-level palm must physically reach before pressing E');
    tick({ interactPressed: true, contextIntent: getContextAction(model) });
    for (let i = 0; i < 30; i += 1) tick();
    rightTo(450); until(() => model.hero.grounded && model.hero.y === 207, 120);
    until(() => model.enemies[1]!.x - model.hero.x <= 48 && !['hurt', 'hurtRecover'].includes(model.hero.action),
      180, () => ({ move: 1 }));
    tick({ move: 1, dodgePressed: true }); for (let i = 0; i < 20; i += 1) tick({ move: 1 });
    rightTo(605); until(() => model.hero.grounded, 60);
    for (let shot = 0; shot < 2 && model.enemies[0]!.hp > 0; shot += 1) {
      until(() => model.cannon.action === 'idle', 150);
      tick({ interactPressed: true, contextIntent: getContextAction(model) }); tick();
      until(() => model.enemies[0]!.hp <= 0 || model.cannon.action === 'recovery', 50);
      for (let i = 0; i < 35; i += 1) tick();
    }
    until(() => model.hero.x <= 535, 180, () => ({ move: -1, jumpPressed: model.hero.grounded && model.hero.x >= 548 }));
    until(() => model.hero.grounded && model.hero.y === 207, 100); reloadPursuit();
  }
  rightTo(606); until(() => model.encounter.status === 'complete', 100, () => ({ move: 1 }));
  return model;
}

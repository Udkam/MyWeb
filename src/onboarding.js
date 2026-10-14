/** Presentation-only progress. The caller decides when a first-run guide exists.
 * No input commands, storage access, timers, or writes to the supplied world.
 */
const STEPS = Object.freeze(['move', 'shoot', 'dash']);
const MOVE_DISTANCE = 60;
const finite = value => typeof value === 'number' && Number.isFinite(value);

function sample(state) {
  return {
    seed: state?.seed, room: state?.room, phase: state?.phase,
    width: state?.width, height: state?.height, time: state?.time,
    x: state?.player?.x, y: state?.player?.y,
    shots: state?.stats?.shots, dashTime: state?.player?.dashTime,
    dashCooldown: state?.player?.dashCooldown,
  };
}

export function createOnboarding(state) {
  let previous = sample(state);
  const seed = previous.seed;
  const achieved = [false, false, false];
  let distance = 0, dismissed = false, visible = previous.phase === 'combat';
  let roomComplete = Number.isInteger(previous.room) && previous.room >= 2;

  function status() {
    const complete = roomComplete || achieved.every(Boolean);
    const first = achieved.indexOf(false);
    const index = complete ? 2 : Math.max(0, first);
    return {
      stepId: complete || dismissed ? null : STEPS[index],
      index, complete, dismissed,
      progress: complete ? 1 : index === 0 ? Math.min(1, distance / MOVE_DISTANCE) : 0,
      visible: visible && !complete && !dismissed,
    };
  }

  function observe(world, { paused = false } = {}) {
    const current = sample(world);
    const sameRun = current.seed === seed;
    const active = sameRun && current.phase === 'combat' && !paused && world?.ui?.paused !== true;
    visible = active;
    if (sameRun && Number.isInteger(current.room) && current.room >= 2) roomComplete = true;
    const advancing = finite(current.time) && finite(previous.time) && current.time > previous.time;
    if (active && previous.seed === seed && previous.phase === 'combat' && advancing && !dismissed && !roomComplete) {
      // A resize repositions the world; it is not a movement input. Reanchor below.
      const sameSize = current.width === previous.width && current.height === previous.height;
      if (sameSize && [current.x, current.y, previous.x, previous.y].every(finite)) {
        distance += Math.hypot(current.x - previous.x, current.y - previous.y);
        if (distance >= MOVE_DISTANCE) achieved[0] = true;
      }
      if (finite(current.shots) && finite(previous.shots) && current.shots > previous.shots) achieved[1] = true;
      const cooldownStarted = finite(current.dashCooldown) && finite(previous.dashCooldown) && current.dashCooldown > previous.dashCooldown + .001;
      const dashStarted = finite(current.dashTime) && finite(previous.dashTime) && current.dashTime > previous.dashTime + .001;
      if (cooldownStarted || dashStarted) achieved[2] = true;
    }
    previous = current;
    return status();
  }

  return {
    observe, status,
    dismiss() { dismissed = true; visible = false; return status(); },
  };
}

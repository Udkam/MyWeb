import { FIXED_MS } from './model';

export interface FixedClockState {
  accumulator: number;
}

/** Discard a partial tick when starting, pausing, resuming, refocusing or restarting. */
export function resetFixedClock(state: FixedClockState): void {
  state.accumulator = 0;
}

/** The host calls this only while playing; tick still advances exactly 1/60 second. */
export function advanceFixedClock(state: FixedClockState, deltaMs: number, tick: () => void): number {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 0;
  state.accumulator += Math.min(deltaMs, 100);
  let steps = 0;
  while (state.accumulator + 0.0001 >= FIXED_MS) {
    state.accumulator -= FIXED_MS;
    tick();
    steps += 1;
  }
  // The comparison epsilon can leave a negative rounding residue, never a real debt.
  if (state.accumulator < 0) state.accumulator = 0;
  return steps;
}

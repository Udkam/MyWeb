/** Pointer/keyboard inputs are separate from simulation; all positions are world coordinates. */
export function createInput(canvas, getState, onCommand) {
  const keys = new Set();
  let mouseDown = false, aim = null, dash = false, nova = false;
  let move = { x: 0, y: 0 }, shoot = { x: 0, y: 0 }, active = false;
  const sticks = [];
  const blockedTarget = (target) => target instanceof Element && !!target.closest('input,dialog,select,textarea');
  function clear() {
    keys.clear(); mouseDown = false; dash = false; nova = false;
    move = { x: 0, y: 0 }; shoot = { x: 0, y: 0 };
    for (const s of sticks) {
      if (s.pointer !== null && s.node.hasPointerCapture(s.pointer)) s.node.releasePointerCapture(s.pointer);
      s.pointer = null; s.knob.style.transform = ''; s.node.classList.remove('active');
    }
  }
  function pointerAim(e) {
    const state = getState(); if (!state) return;
    const box = canvas.getBoundingClientRect();
    aim = { x: (e.clientX - box.left) / box.width * state.width, y: (e.clientY - box.top) / box.height * state.height };
  }
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') pointerAim(e); });
  canvas.addEventListener('pointerdown', (e) => {
    if (!active || e.pointerType !== 'mouse') return;
    pointerAim(e); canvas.focus({ preventScroll: true });
    if (e.button === 0) mouseDown = true;
    if (e.button === 2) dash = true;
    e.preventDefault();
  });
  window.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse' && e.button === 0) mouseDown = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || blockedTarget(e.target)) return;
    const key = e.code;
    if (['Space', 'Enter'].includes(key) && e.target instanceof Element && e.target.closest('button,a')) return;
    if (['Space', 'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'Escape'].includes(key)) e.preventDefault();
    if (e.repeat) return;
    if (key === 'Escape' || key === 'KeyP') { onCommand('pause'); return; }
    if (key === 'KeyF') { onCommand('fullscreen'); return; }
    if (key === 'KeyM') { onCommand('audio'); return; }
    if (/^Digit[123]$/.test(key)) { onCommand('choice', Number(key.slice(-1)) - 1); return; }
    if (key === 'Enter') { onCommand('enter'); return; }
    if (!active) return;
    keys.add(key);
    if (key === 'Space' || key === 'ShiftLeft' || key === 'ShiftRight') dash = true;
    if (key === 'KeyE') nova = true;
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', clear);
  canvas.addEventListener('pointercancel', clear);
  for (const [id, kind] of [['move-stick', 'move'], ['aim-stick', 'aim']]) {
    const node = document.getElementById(id), knob = node.querySelector('i');
    const s = { node, knob, pointer: null }; sticks.push(s);
    function set(e) {
      const b = node.getBoundingClientRect(), radius = b.width * .36;
      let x = (e.clientX - b.left - b.width / 2) / radius, y = (e.clientY - b.top - b.height / 2) / radius;
      const length = Math.hypot(x, y); if (length > 1) { x /= length; y /= length; }
      if (length < .1) { x = 0; y = 0; }
      knob.style.transform = `translate(${x * radius}px,${y * radius}px)`;
      if (kind === 'move') move = { x, y }; else shoot = { x, y };
    }
    node.addEventListener('pointerdown', (e) => {
      if (!active || s.pointer !== null) return;
      e.preventDefault(); s.pointer = e.pointerId; node.setPointerCapture(e.pointerId); node.classList.add('active'); set(e);
    });
    node.addEventListener('pointermove', (e) => { if (e.pointerId === s.pointer) { e.preventDefault(); set(e); } });
    const end = (e) => { if (e.pointerId !== s.pointer) return; s.pointer = null; knob.style.transform = ''; node.classList.remove('active'); if (kind === 'move') move = { x: 0, y: 0 }; else shoot = { x: 0, y: 0 }; };
    node.addEventListener('pointerup', end); node.addEventListener('pointercancel', end); node.addEventListener('lostpointercapture', end);
  }
  for (const [id, action] of [['dash', 'dash'], ['nova', 'nova']]) document.getElementById(id).addEventListener('pointerdown', (e) => {
    if (!active) return; e.preventDefault(); if (action === 'dash') dash = true; else nova = true;
  });
  for (const [id, action] of [['dash', 'dash'], ['nova', 'nova']]) document.getElementById(id).addEventListener('click', (e) => {
    if (!active || e.detail !== 0) return;
    if (action === 'dash') dash = true; else nova = true;
  });
  return {
    setActive(value) { active = value; clear(); }, clear,
    read() {
      const state = getState(), p = state?.player || { x: 0, y: 0, angle: 0 };
      let moveX = move.x + Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
      let moveY = move.y + Number(keys.has('KeyS')) - Number(keys.has('KeyW'));
      const length = Math.hypot(moveX, moveY); if (length > 1) { moveX /= length; moveY /= length; }
      let ax = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')) + shoot.x;
      let ay = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp')) + shoot.y;
      const aiming = Math.hypot(ax, ay) > .1;
      const target = aiming ? { x: p.x + ax * 500, y: p.y + ay * 500 } : aim || { x: p.x + Math.cos(p.angle) * 300, y: p.y + Math.sin(p.angle) * 300 };
      const result = { moveX, moveY, aimX: target.x, aimY: target.y, fire: mouseDown || aiming, dash, nova };
      dash = false; nova = false; return result;
    },
    status() { return { active, keys: [...keys], mouseDown, move: { ...move }, aimStick: { ...shoot } }; },
  };
}

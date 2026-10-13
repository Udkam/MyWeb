# Two bounded browser reference checks

Recorded 2026-10-14 (Asia/Shanghai). These are short direct interaction checks, not completed playthroughs, balance reviews, or evidence of every author claim. Both games already belong to the 532-page ledger; these checks add **zero** to that count.

Method: an isolated Python Playwright Chromium session opened the public author pages, observed screenshots, then sent real keyboard/mouse input. No game-state injection, hidden state inspection, or production-game bypass was used. CUA reported no available browser, so the independently launched browser was used. There were no pageerror events during the bounded checks. The browser was closed afterward.

## Bad Juju

Source: [Bad Juju by Sean Noonan](https://sean-noonan.itch.io/bad-juju).

- Opened the author page, pressed **Run game**, observed the title screen, then pressed Enter to enter the room.
- The room contained the player on the left, multiple enemies on the right, and obstacles that divided the floor. W/D input visibly moved the player toward the enemies.
- A short movement/shooting attempt ended on **PRESS R TO RETRY**. Pressing R removed that prompt and restored the initial player/enemy arrangement. This directly verifies a death/retry loop.
- Mouse firing was attempted before and after retry. The still images do not establish a projectile hit, enemy kill, reload benefit, Juju collection, or slowdown behavior; none of these is claimed as directly verified.
- No room clear or upgrade chooser was reached.

Evidence: [bad-juju-author.png](../../.qa/research-playtests/bad-juju-author.png), [bad-juju-combat-release.png](../../.qa/research-playtests/bad-juju-combat-release.png), [bad-juju-loaded.png](../../.qa/research-playtests/bad-juju-loaded.png), [bad-juju-release-reload.png](../../.qa/research-playtests/bad-juju-release-reload.png), [bad-juju-restarted-firing.png](../../.qa/research-playtests/bad-juju-restarted-firing.png), [bad-juju-room.png](../../.qa/research-playtests/bad-juju-room.png), [bad-juju-start.png](../../.qa/research-playtests/bad-juju-start.png).

Design-relevant observation: retry was immediately available from the loss state and returned directly to the action. The brief failed attempt does not establish difficulty or fairness.

## Fair Squares

Source: [Fair Squares by kindanice](https://kindanice.itch.io/fair-squares).

- The actual embedded game loaded into a tutorial room with a blue player, two pale targets, keyboard/mouse instructions, three health boxes and ammunition ×10.
- Real movement and aimed mouse input changed the player's position. The later image showed target destruction effects and ammunition ×2; subsequent shooting reduced ammunition to ×0.
- A **fight!** portal appeared after the target interactions. Moving toward its center produced a purple transition screen.
- The next observed image showed the initial tutorial arrangement again with health/ammunition reset. The intervening state was not observed closely enough to establish whether this was a death/restart or another transition. The report therefore does not classify it as a completed wave, confirmed death, or bug.
- No upgrade chooser or confirmed full combat-wave completion was seen. The author-page claim that enemy upgrades accompany player upgrades remains page-read evidence only.

Evidence: [fair-squares-after-shots.png](../../.qa/research-playtests/fair-squares-after-shots.png), [fair-squares-author.png](../../.qa/research-playtests/fair-squares-author.png), [fair-squares-combat.png](../../.qa/research-playtests/fair-squares-combat.png), [fair-squares-enter-fight.png](../../.qa/research-playtests/fair-squares-enter-fight.png), [fair-squares-live-wave.png](../../.qa/research-playtests/fair-squares-live-wave.png), [fair-squares-menu.png](../../.qa/research-playtests/fair-squares-menu.png), [fair-squares-pickups.png](../../.qa/research-playtests/fair-squares-pickups.png), [fair-squares-wave.png](../../.qa/research-playtests/fair-squares-wave.png).

Design-relevant observation: the target exercise exposed movement, firing and ammunition before the fight portal. It did not establish the readability or quality of the later upgrade system.

## Limits

The sessions were deliberately bounded. They support immediate input, visible target/death feedback, and one confirmed retry sequence. They do not support claims about complete runs, later bosses, build depth, persistence, mobile support, or long-term enjoyment. The screenshots are retained outside the published runtime and are not reused as game assets.

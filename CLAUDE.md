@AGENTS.md

# Agentic Football — project context for Claude

Read this whole file before touching code. It is the handoff from the session that built this
repo from scratch — it captures *why* things are shaped the way they are, not just what's there,
so you don't accidentally undo a deliberate decision while "fixing" or "simplifying" something.

## What this is

A browser game: a user configures two squads of 5 AI agents each (Goalkeeper, Defender,
Midfielder, Forward-Left, Forward-Right), then watches them play a football match against each
other on an animated pitch. It was built for FlexiLoans (prasad.alai@flexiloans.com) as a
standalone, self-contained product — no AWS account, no LLM API key, no backend, runs entirely
client-side.

**Origin / inspiration** — two sources, both external to this repo:
1. https://strandsagents.com/blog/inside-agentic-football-cup/ — AWS/Strands' "Agentic Football
   Cup" workshop concept: 5v5 matches where each player is an independent Strands agent deciding
   one structured command per tick from a shared game-state snapshot, no explicit orchestrator
   (coordination emerges from every agent seeing the same world).
2. `agentic-football-sample-agents/` inside the sibling repo at
   `/Users/prasad.alai/Desktop/sample-ai-possibilities` (a sparse checkout, branch
   `ai-team-flexiloans`) — the *actual* implementation this pattern is based on. It vendors 5
   AWS Bedrock AgentCore agents per team (GK/DEF/MID/FWD1/FWD2), a shared Python harness
   (`lib/agent_base.py`, `lib/state.py`, `lib/parsing.py`, `lib/fallback.py`), and
   `AGENT_PROTOCOL.md`, which is the authoritative spec for pitch geometry, roles, the command
   set, and the 3-layer error-handling model (LLM → rule-based fallback → last-resort). **That
   repo has no game engine, no physics, and no UI of its own** — it's purely the agent-side
   client code for a match engine that lives outside it. This project is a from-scratch
   reimplementation of a full playable game in that same shape, not a fork of anything.

Read `agentic-football-sample-agents/AGENT_PROTOCOL.md` in the sibling repo if you need to check
whether something here is a faithful mirror of the real protocol or a deliberate simplification.

## Decisions already made (don't relitigate without a reason)

These were explicit choices, confirmed with the user via AskUserQuestion before building:

- **Config-driven agents, not real LLM calls.** Each agent's "brain" (`lib/engine/decide.ts`) is
  a deterministic decision function parameterized by 5 personality sliders (aggression, pass
  directness, work rate, shot boldness, discipline), directly analogous to the real repo's
  `lib/fallback.py` rule-based layer. This was chosen over calling Claude/Bedrock per tick per
  agent (10 agents × 1 tick/sec) because it needs no backend, no API key, no per-match cost, and
  no latency jitter in the live animation. If asked to add a real-LLM mode later, build it as an
  *additional* toggle alongside this engine (see Backlog), don't replace the deterministic path —
  it's the free, instant, always-available default.
- **New standalone repo, not part of `sample-ai-possibilities`.** This is
  `/Users/prasad.alai/Desktop/flexiloans-agentic-football`, its own git repo (2 commits so far:
  create-next-app's initial commit, then the full game). It has NOT been pushed to GitHub or any
  remote — that was a deliberate "local only for now" choice. Don't push anywhere without the
  user explicitly asking.
- **Next.js (App Router) + TypeScript + Tailwind v4 + Zustand.** Chosen over a plain Vite SPA for
  routing simplicity (`/`, `/build`, `/play`, `/match`) and because Tailwind v4 + `next/font` made
  the visual polish easier. Zustand for state: `lib/store/teamStore.ts` is `persist`-backed
  (localStorage) for saved squads; `lib/store/matchSetupStore.ts` is in-memory only, just a
  hand-off of the two chosen `TeamConfig`s from `/play` to `/match`.
- **Live match rendering is a react-three-fiber 3D scene, not the SVG pitch.** `components/Pitch.tsx`
  (2D SVG) is now only used for the static, non-ticking preview on the landing page (`app/page.tsx`);
  the actual `/match` view renders `components/three/Pitch3D.tsx` instead — see the `lib/three/` and
  `components/three/` rows in the architecture map below. This was purely a rendering-layer swap:
  `lib/engine/*` (the sim itself) is untouched except for three small additive metadata fields on
  `BallInFlight` (`power`, `passType`, `distributeMethod`) that the old renderer never needed but the
  3D arc/height calc does — none of it feeds back into gameplay resolution. If asked to touch the
  match engine, you generally don't need to touch the 3D layer, and vice versa.

## Architecture map

```
lib/engine/
  types.ts       Pitch geometry constants, Role/Side/Command/PlayerState/MatchState types.
                 Mirrors AGENT_PROTOCOL.md: 110x70m pitch, x:[-55,55] goal-to-goal, y:[-35,35].
  pitch.ts        Geometry helpers: goal positions (HOME defends x=-55, AWAY mirrored — this
                 mirroring rule is called "the most expensive mistake in the competition" in the
                 real protocol doc, so double-check it if agents start running the wrong way),
                 default formation slots per role, corner-aim → pitch-coordinate mapping.
  presets.ts      Tactical presets (Balanced/Aggressive/Defensive/Possession/Counter) → default
                 AgentPersonality values, with small per-role nudges (GK never shoots, forwards
                 lean slightly bolder).
  decide.ts       THE AGENT BRAIN. decide(player, config, matchState) -> Command. GKs get their
                 own dedicated `decideGoalkeeper()`, called first and short-circuiting everything
                 below for role==="GK" — they used to fall through the generic outfield ladder,
                 which let them "MARK" an opponent or chase a loose ball anywhere on the pitch
                 (dragging them out of goal) and left them standing still until a shot had nearly
                 arrived. The dedicated version holds the angle between the ball and goal
                 ("narrowing the angle" — off the line when the danger is distant, tucked in as it
                 nears), actively tracks an in-flight SHOT aimed at its own goal instead of waiting
                 for it to land, and only rushes a loose ball inside its own box. Don't route GK
                 back through the outfield priority ladder below without preserving this.
                 Outfield priority ladder: has ball → (shoot-if-in-range-and-unpressured / pass-if-
                 pressured-or-cautious / dribble) ; else own team has ball → make a run/hold shape
                 by role ; else opponent has ball → press/intercept/slide-tackle if close, else
                 mark the most dangerous opponent, else hold default slot ; else ball is loose →
                 nearest own player chases it. This is called for ALL 10 players every tick, same
                 as the real protocol. The shoot branch requires `!underPressure` (a marked player
                 looks for a pass instead of forcing a contested shot) — don't drop that condition
                 or matches
                 revert to the old shoot-on-sight, high-scoring behavior. Also: `bestPassTarget`
                 is almost never null (any outfield teammate counts), so don't gate it ahead of the
                 dribble-forward fallback the way an earlier revision of this file briefly did —
                 that silently made dribbling unreachable and shooting nearly impossible.
  match.ts        initMatch()/tickMatch() — the tick loop. Order per tick: consume a deferred
                 kickoff if one is pending → advance any ball already in flight (resolve on
                 arrival) → decide() for all 10 players → move everyone per their command →
                 resolve the ball owner's PASS/SHOOT/GK_DISTRIBUTE into a new ball-flight →
                 loose-ball pickup check → tackle-attempt resolution → half-time/full-time checks.
                 `tickMatch` MUTATES the MatchState object in place (including `state.players` and
                 an in-flight `state.ball.flight`, which are the SAME objects tick over tick, never
                 replaced) and returns just the new MatchEvents — see the React integration note
                 below, this is deliberate, not an oversight. **This in-place mutation is exactly
                 why `lib/three/interpolate.ts` snapshots plain numbers instead of holding onto a
                 raw MatchState reference** — an earlier revision aliased "previous tick" state to
                 the live mutating objects, which made 3D players render as static/stepped instead
                 of smoothly moving. `pendingKickoff` on MatchState defers the post-goal reset by
                 one tick (set in `resolveShot`'s GOAL branch instead of calling `kickoff()`
                 immediately) so the ball is seen resting in the net during the goal celebration
                 rather than teleporting to the center circle in the same frame the GOAL event
                 fires — the loose-ball pickup check is also guarded against `pendingKickoff` so
                 nobody scoops up the "dead" ball in the net before kickoff actually happens.
  commentary.ts   Event-kind → templated commentary line, picked with the seeded RNG.
  rng.ts          mulberry32 seeded PRNG — same seed always plays out identically. Every
                 `Math.random()` call in the engine should go through this instead, for replay
                 determinism.
  factory.ts      createAgent/createDefaultTeam/createHouseTeam (the built-in AI opponent for
                 solo play, id "house-xi").

lib/store/
  teamStore.ts        Persisted (localStorage) CRUD store for saved squads.
  matchSetupStore.ts  In-memory hand-off: { home, away, totalTicks, theme } from /play to /match.

lib/three/
  theme.ts        useThemeColors(theme) — resolves the CSS-custom-property palette (globals.css)
                 into real color strings via a throwaway probe DOM node, since three.js materials
                 can't read CSS vars directly. Keeps the 3D scene's colors driven by the same
                 [data-theme] source of truth instead of a hand-duplicated palette.
  interpolate.ts  RenderRefs + interpolatedPlayerPos/interpolatedBall — the engine ticks in
                 discrete ~650ms/speed steps but the render loop runs at 60fps, so every visual
                 component lerps between the previous and latest MatchState snapshot by elapsed
                 wall-clock time instead of teleporting. This is purely cosmetic; it never writes
                 back into MatchState.
  arc.ts          flightHeight(flight, progress) — cosmetic parabolic height for the ball during
                 a BallInFlight, shaped by kind/power/passType/distributeMethod. Also render-only.
  textures.ts     CanvasTexture builders: the grass+markings+FL crest (baked once per theme, sized
                 exactly to PITCH extents so it lines up with player world coordinates), goal net,
                 ball pentagon pattern, crowd noise, role-tag sprites, a soft glow/particle dot.

components/three/
  Pitch3D.tsx     Top-level scene, dynamically imported with `ssr: false` from app/match/page.tsx
                 (three.js needs a real DOM/WebGL context). Owns camera-view state, the
                 prev/latest MatchState refs interpolation feeds off, and detects SHOT/GOAL/TACKLE
                 transitions to spawn Burst particle effects and the goal-cam auto-cut.
  Field.tsx, Goal.tsx, Stadium.tsx   Ground + markings, goal frame/net (with a brief net-ripple on
                 a conceded goal), and the environment shell (lights, fog, floodlights, crowd
                 stands) respectively.
  Player.tsx      One humanoid per PlayerState: procedural capsule/sphere rig with a running/idle
                 leg-swing animation driven by interpolated velocity, plus the stamina ring and
                 possession glow carried over from the old SVG version.
  Ball.tsx        Textured sphere following the interpolated position + arc height, with rolling
                 spin, a drei `<Trail>` motion streak, and an additive speed-glow sprite.
  CameraRig.tsx / CameraSwitcher.tsx   Five views — Broadcast/Sideline/Behind Goal/Tactical/Free
                 (OrbitControls) — damped-follow on the ball, with a brief camera-shake on
                 shots/goals and an automatic cut to Behind Goal for ~2.6s when a goal fires.
  effects/Burst.tsx   Short-lived particle puff (kicks/tackles/goals), spawned and unmounted by
                 Pitch3D via a timer; no gameplay coupling.

  IMPORTANT — every meshStandardMaterial needs an explicit `metalness`. Its three.js default is
  0.5, and without an environment map a mid-metalness surface reads as near-black under simple
  lights; this bit us once already (the whole pitch rendered solid black until every material got
  `metalness={0}`). Also: the `stadium-night` theme's grass/crowd hex values are deliberately very
  dark for the flat 2D SVG version, so the 3D lighting rig compensates with much higher
  directional/point-light intensities than you'd expect from "night" — don't dim those back down
  to match the CSS values literally, or the pitch goes dark again.

components/
  Pitch.tsx          The SVG field renderer (mowed-stripe grass, markings, goals, players, ball,
                     FL crest) — now only used for the landing page's static preview, NOT the live
                     match view (see the 3D rendering decision above). Still fully theme-aware via
                     the same CSS custom properties.
  ScoreHUD.tsx        Team badges, score, clock/half, speed (1x/2x/4x) + pause + exit controls.
  CommentaryFeed.tsx  Auto-scrolling event log with an icon per event kind.
  ThemePicker.tsx     3-card picker for the stadium designs (see below).
  AgentEditor.tsx     One role's config card: name, preset buttons, the 5 personality sliders.
                     Picking a slider manually flips the agent's preset to "custom".
  GoalFlash.tsx       DOM overlay banner ("GOAL!" + commentary line, team-colored) that flashes
                     over the pitch container on a GOAL event; independent of the 2D/3D renderer
                     underneath since it's just an absolutely-positioned sibling div.

app/
  page.tsx    Landing page — hero copy + a live (non-ticking) Pitch preview using two House XI
             instances, feature cards.
  build/page.tsx  Squad list (sidebar) + active squad editor (name/code/crest/kit color + 5
                 AgentEditor cards, one per role via lib/engine/types.ROLES).
  play/page.tsx   Choose your squad + opponent (saved squads ∪ House XI) + ThemePicker + match
                 length, then stash a MatchSetup in matchSetupStore and router.push("/match").
  match/page.tsx  Reads the pending MatchSetup, runs initMatch() once, then ticks on a
                 setInterval (650ms / speed), dynamically loading Pitch3D (ssr:false). See the
                 React-integration note just below — this file has scoped ESLint rule overrides
                 that are intentional. Also owns the fullscreen toggle (Fullscreen API on the
                 whole content div — ScoreHUD + Pitch3D + CommentaryFeed together, "cinema mode",
                 not just the canvas) via a `contentRef` + `fullscreenchange` listener; the button
                 itself lives in ScoreHUD (`isFullscreen`/`onToggleFullscreen` props).
```

### The `app/match/page.tsx` ESLint overrides — do not "fix" these away

`eslint.config.mjs` has a `files: ["app/match/page.tsx"]` override turning off
`react-hooks/refs`, `react-hooks/set-state-in-effect` and `react-hooks/immutability`. This is
because the match engine is an intentionally *external, mutable* system (a tick-based simulation,
the same category as a game loop or a canvas/WebGL integration) held in a `useRef`, with only a
plain-object snapshot (`matchState`, a `useState`) driving the actual render output. The
React-Compiler-flavored rules in newer `eslint-config-next` assume all render-affecting state is
React-owned and don't have an escape hatch for "sync an external system's snapshot into state
every tick," which is a legitimate, common pattern here. If you refactor this file, keep that
separation (ref = engine, state = render snapshot) rather than trying to make `tickMatch` pure —
making the whole engine immutable/pure would mean deep-cloning 10 players + events every ~150ms
at 4x speed for no real benefit.

The same override (plus `react-hooks/purity`) is extended to `components/three/**` and
`lib/three/**` for the same underlying reason: the 3D scene is a react-three-fiber render loop
(`useFrame`) doing wall-clock interpolation (`performance.now()`) and cosmetic particle randomness
(`Math.random()`), none of which is React-owned render state either.

## Simplifications vs. the real protocol (deliberate, not bugs)

- Real protocol: 1 tick/sec, 5-second-per-agent deadline, human free-text "team talk" hints
  the agents may or may not act on. Here: a full "90 minute" match is compressed into a
  configurable number of ticks (90/180/270 for Quick/Standard/Full), one tick per interval,
  interval sped up by the 1x/2x/4x control. No free-text human hints yet (see Backlog).
- Real protocol's command set includes `RESET`/`CLEAR_OVERRIDE`/`SET_STANCE` as sideline/tactical
  commands. `SET_STANCE` exists in `types.ts` for protocol fidelity but `decide()` doesn't
  currently emit it — stance is fixed at kickoff instead of dynamically toggled. `RESET` and
  `CLEAR_OVERRIDE` aren't used at all yet.
- Set pieces (throw-ins, corners, goal kicks) are not modeled distinctly — any dead/loose ball
  is picked up by whichever player (either team) is nearest when it settles. A shot that goes
  off target or is saved is just handed to the defending keeper, not played out as a real goal
  kick. This is a real gap if someone wants proper restart sequences.
- Shot/save probabilities in `resolveShot()` (`lib/engine/match.ts`) have been tuned FOUR times now
  — each time, re-run a multi-match sampled smoketest (see below) rather than eyeballing 1-2
  matches, since per-match variance is high. History, in order: ~25-goal matches → ~13-9-ish →
  `onTargetChance=0.2+power*0.08`/`saveChance=0.93-keeperDist*0.02-power*0.06` landed ~3.4 combined
  goals/match at ~17% conversion — **but that tuning assumed a passively-positioned keeper**. Once
  `decideGoalkeeper()` (see decide.ts row above) made the keeper actively track shots, the same
  constants collapsed scoring to ~1.4 goals/match (half the sampled matches finished 0-0) because
  `keeperDist` is now almost always small. Current values —
  `onTargetChance=0.28+power*0.1` / `saveChance=0.72-keeperDist*0.02-power*0.2` — land back around
  ~3.2 combined goals/match at ~12% conversion with a competent keeper. **If you touch keeper
  positioning again, re-tune these together** — they're coupled, not independent knobs. Also:
  `decide()`'s shoot branch requires `!underPressure` now (see the decide.ts row above) — that's
  load-bearing for the "more passing before a shot" feel, not just the raw probabilities.
- A shot's flight now takes ~3-4 ticks to resolve (`flightProgressStep` returns 0.32 for `"SHOT"`,
  not an instant 1) specifically so the 3D renderer has time to show the ball actually traveling
  toward the goal before a GOAL/SAVE/MISS event fires — previously the entire kick-to-outcome
  sequence collapsed into a single tick transition, so the ball visually never appeared to reach
  the goalpost even when the shot was genuinely on target.
- A won tackle (`SLIDE_TACKLE`/`INTERCEPT`/`PRESS_BALL` succeeding against a carrier, in the
  "Tackle attempts" section of `tickMatch`) spills the ball loose between the two players instead
  of snapping possession straight to the tackler — a real 50-50 duel ends in a scramble that
  either side (or a third player) can win on a following tick via the ordinary loose-ball pickup
  check, not an instant swap. `components/three/Player.tsx` reads a `sliding` flag (derived from
  `lastCommand.type === "SLIDE_TACKLE"`, threaded through `lib/three/interpolate.ts`'s snapshot)
  to show a forward-lunging, ground-hugging pose instead of the normal run cycle; a goalkeeper
  sprinting to close down a shot gets the same pose treatment (`role==="GK" && sprinting`) as a
  stand-in dive animation.

## Testing approach

No `chromium-cli` / bundled browser tool is available in this environment, and `npx playwright
install` fails here (`UNABLE_TO_GET_ISSUER_CERT_LOCALLY` fetching from cdn.playwright.dev — a
sandbox TLS/network restriction, not a real absence of Chromium). The workaround that *does* work,
used to actually visually verify the 3D match view: `npm install playwright-core` in a scratch
directory (npm registry access is fine; only that one CDN download fails), then drive it with
`chromium.launch({ channel: "chrome", args: ["--no-sandbox", "--use-gl=swiftshader",
"--enable-webgl", "--ignore-gpu-blocklist"] })` pointed at the system's already-installed
`/Applications/Google Chrome.app` instead of downloading a fresh Chromium. That gets you real
screenshots (`page.screenshot()`) and `page.on("console"/"pageerror")` — actually look at them
before claiming a visual change works; this is exactly how the black-pitch/metalness bug and the
ball-trail-vs-halfway-line false alarm below were caught and fixed. If that route ever stops
working, fall back to structural-only verification and say so explicitly rather than claiming a
visual result you didn't see.

`next.config.ts` sets `allowedDevOrigins: ["[::1]"]` — this machine also runs a separate NestJS
project's server on port 3000 bound to IPv4, so `http://localhost:3000` is ambiguous (resolves to
whichever process wins the IPv4/IPv6 race) while `http://[::1]:3000` reliably reaches THIS
project's dev server. Without `allowedDevOrigins`, Next blocks that origin's HMR/dev-resource
requests by default, which is worth knowing about if interactions (button clicks, etc.) mysteriously
stop registering when testing via `[::1]`. Separately: Next 16 only allows one `next dev` per
project directory regardless of port — if you try to start a second instance, it detects the
existing one and exits immediately (test against the existing instance instead, or stop it first
if nothing else needs it). Something on this machine also appears to auto-respawn a dev server for
this project moments after one is killed (observed repeatedly this session, cause unconfirmed —
possibly an IDE-integrated task) — don't be surprised if a "stopped" server is back within seconds.

Otherwise, the fuller verification pattern:

1. `npx tsc --noEmit -p tsconfig.json` — must be clean.
2. `npx eslint .` — must be clean (respecting the scoped override above).
3. `npm run build` — must succeed (this also runs TypeScript).
4. Route smoke test: `npm run dev -- -p <port>` in the background, then `curl` each route and
   grep for an expected marker (e.g. "FLEXILOANS" on `/`, "No match queued" on `/match` with no
   pending setup), plus check the dev server's log for thrown errors. Kill the dev server
   afterward (`pkill -f "next dev -p <port>"`).
5. Engine correctness (this is the one that actually exercises game logic): write a throwaway
   script at `lib/engine/__smoketest.ts` (relative imports, not the `@/` alias, so it runs
   directly) that calls `initMatch()` then `tickMatch()` in a loop for a full match, checks for
   `NaN` coordinates, checks all positions stay within pitch bounds (±55/±35, small overshoot
   tolerance), asserts `state.finished` at the end, and prints the final score + last few events.
   Run it with `npx tsx lib/engine/__smoketest.ts`. **Delete the file when done** — it's scratch,
   not part of the repo.

One visual false-alarm worth knowing about: a straight line on the flat ground plane (the
halfway line baked into the grass texture, or the ball's drei `<Trail>` streak) reads as
strongly *diagonal* in any angled perspective camera view (Sideline/Broadcast/Behind
Goal/Free) — that's correct 3D foreshortening, not a bug. Only trust "is this a stray
artifact" calls made from the Tactical (near-top-down) view, where a genuinely broken line
would still look wrong.

## Conventions

- No comments unless they explain a non-obvious *why* (a workaround, a quirk inherited from the
  real protocol, a subtle invariant). Don't add comments describing what code obviously does.
- Every interactive component is `"use client"`. Server components are only used where there's no
  interactivity (there currently are none besides the root layout).
- Tailwind utility classes for layout/spacing; theme-dependent colors go through the CSS custom
  properties defined in `app/globals.css` under `[data-theme="..."]`, read via inline
  `style={{ background: "var(--hud-bg)" }}` etc., never hardcoded per-theme class names.
- Commit messages so far end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` —
  that was this session's attribution instruction, not necessarily a persistent repo rule; check
  what the current session's own instructions say before assuming it still applies.

## Backlog / ideas not yet built

- ~~Push this repo to GitHub~~ — done, pushed to `github.com/fl-prasad-alai/flexiloans-agentic-football`
  (public) at the user's explicit request.
- A real-LLM "authentic mode" toggle per the original ask: call Claude per tick for one or both
  teams instead of (or blended with) the deterministic engine, closer to the actual AgentCore
  system. Needs a backend/API route since browser-side API keys aren't safe.
- Human "team talk" free-text hints mid-match (from the blog post's description of the real
  workshop), fed into `decide()` as extra context.
- Proper set-piece handling (throw-ins, corners, goal kicks) instead of nearest-player-picks-it-up.
- `SET_STANCE`/`RESET`/`CLEAR_OVERRIDE` actually wired into `decide()`'s logic.
- Persisting match history / a post-match stats breakdown (shots, passes completed, possession %).
- Sound effects, a proper crowd-noise/ambience layer per theme.
- Automated tests (there is currently no test suite — only the ad-hoc smoke-test pattern above).
- 3D polish ideas not yet done: jersey numbers/names as decals, a real environment map so
  goal-post/ball metalness could go above 0 without looking black, distinct SAVE/MISS/BLOCK
  camera beats (only GOAL currently triggers the behind-goal auto-cut), crowd LOD/instancing if
  perf ever becomes a concern with more decoration.

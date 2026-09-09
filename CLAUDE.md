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
  decide.ts       THE AGENT BRAIN. decide(player, config, matchState) -> Command. Priority ladder:
                 has ball → (GK distributes / shoot-if-in-range / pass-if-pressured-or-cautious /
                 dribble) ; else own team has ball → make a run/hold shape by role ; else opponent
                 has ball → press/intercept/slide-tackle if close, else mark the most dangerous
                 opponent, else hold default slot ; else ball is loose → nearest own player chases
                 it. This is called for ALL 10 players every tick, same as the real protocol.
  match.ts        initMatch()/tickMatch() — the tick loop. Order per tick: advance any ball
                 already in flight (resolve on arrival) → decide() for all 10 players → move
                 everyone per their command → resolve the ball owner's PASS/SHOOT/GK_DISTRIBUTE
                 into a new ball-flight → loose-ball pickup check → tackle-attempt resolution →
                 half-time/full-time checks. `tickMatch` MUTATES the MatchState object in place
                 and returns just the new MatchEvents — see the React integration note below,
                 this is deliberate, not an oversight.
  commentary.ts   Event-kind → templated commentary line, picked with the seeded RNG.
  rng.ts          mulberry32 seeded PRNG — same seed always plays out identically. Every
                 `Math.random()` call in the engine should go through this instead, for replay
                 determinism.
  factory.ts      createAgent/createDefaultTeam/createHouseTeam (the built-in AI opponent for
                 solo play, id "house-xi").

lib/store/
  teamStore.ts        Persisted (localStorage) CRUD store for saved squads.
  matchSetupStore.ts  In-memory hand-off: { home, away, totalTicks, theme } from /play to /match.

components/
  Pitch.tsx          The SVG field renderer — mowed-stripe grass, pitch markings, goals with net
                     pattern, players (role-labeled circles with a stamina ring + possession
                     glow), the ball, AND the FL crest mowed into the center circle with
                     "FLEXILOANS" lettered below it. All theme-aware via CSS custom properties
                     (--grass-a/-b, --grass-line, --grass-logo, etc.) read with inline style={{}}
                     since SVG presentation attributes can't reference CSS vars directly.
  ScoreHUD.tsx        Team badges, score, clock/half, speed (1x/2x/4x) + pause + exit controls.
  CommentaryFeed.tsx  Auto-scrolling event log with an icon per event kind.
  ThemePicker.tsx     3-card picker for the stadium designs (see below).
  AgentEditor.tsx     One role's config card: name, preset buttons, the 5 personality sliders.
                     Picking a slider manually flips the agent's preset to "custom".

app/
  page.tsx    Landing page — hero copy + a live (non-ticking) Pitch preview using two House XI
             instances, feature cards.
  build/page.tsx  Squad list (sidebar) + active squad editor (name/code/crest/kit color + 5
                 AgentEditor cards, one per role via lib/engine/types.ROLES).
  play/page.tsx   Choose your squad + opponent (saved squads ∪ House XI) + ThemePicker + match
                 length, then stash a MatchSetup in matchSetupStore and router.push("/match").
  match/page.tsx  Reads the pending MatchSetup, runs initMatch() once, then ticks on a
                 setInterval (650ms / speed). See the React-integration note just below — this
                 file has scoped ESLint rule overrides that are intentional.
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
- Shot/save probabilities in `resolveShot()` (`lib/engine/match.ts`) were tuned once already —
  an initial version produced ~25-goal matches (see Testing below), tuned down to a more
  5-a-side-plausible ~13-9-ish range. Still fairly high-scoring; further tuning is a matter of
  taste, not correctness — see `onTargetChance`/`saveChance` in `resolveShot`.

## Testing approach (no browser tool was available when this was built)

There is currently no browser-automation tool in this environment, so the UI has only been
verified structurally, not visually. If you have real browser/screenshot tooling available in
your session, use it — actually look at `/`, `/build`, `/play`, `/match` before claiming a UI
change works. Otherwise, the verification pattern used so far:

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

- Push this repo to GitHub (explicitly deferred — ask before doing it).
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

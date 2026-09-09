# Agentic Football

Build five AI agents — goalkeeper, defender, midfielder and two forwards — tune how each one
plays, then send them out to compete live against another squad on a fully animated pitch with
the FlexiLoans crest mowed into the center circle.

Inspired by [AWS/Strands' Agentic Football Cup](https://strandsagents.com/blog/inside-agentic-football-cup/)
and the `agentic-football-sample-agents` protocol (5 agents per team — GK/DEF/MID/FWD1/FWD2 —
each independently deciding a command every tick from a snapshot of the game state, with a
rule-based fallback layer). This project reimplements that same shape as a self-contained,
config-driven browser game: no AWS account, no LLM API key, no backend required.

## How it works

- **Build a squad** (`/build`) — create a team, then configure its 5 agents. Each agent has a
  role-appropriate default plus five tunable personality dials: aggression, pass directness,
  work rate, shot boldness and discipline. Pick a tactical preset (Balanced, Aggressive,
  Defensive, Possession, Counter-Attack) or hand-tune every slider.
- **Set up a match** (`/play`) — choose your squad, an opponent (another saved squad or the
  built-in "House XI"), a stadium design, and a match length.
- **Kick off** (`/match`) — the engine ticks once per interval, calling a config-driven decision
  function for all 10 players (mirroring the real protocol's per-tick, per-agent invocation),
  resolving movement, passes, tackles, shots and goals, and rendering it live with a commentary
  feed.

## Architecture

```
lib/engine/
  types.ts       Pitch geometry, roles, commands, match/player/ball state (mirrors AGENT_PROTOCOL.md)
  pitch.ts        Field geometry helpers (110x70m pitch, goal positions, default formation slots)
  presets.ts      Tactical presets → personality defaults
  factory.ts      Team/agent creation helpers, default "House XI" opponent
  decide.ts       The "agent brain" — turns (player, personality, match state) into one Command
  match.ts        initMatch()/tickMatch() — the tick loop: decide → move → resolve passes/shots/tackles
  commentary.ts   Event → commentary line templates
  rng.ts          Seeded PRNG so a given seed always plays out the same way

lib/store/        Zustand stores: saved squads (persisted to localStorage), pending match handoff
components/       Pitch (SVG field + FL crest + players + ball), HUD, commentary feed, team/theme pickers
app/               Next.js App Router pages: landing, /build, /play, /match
```

The decision function in `decide.ts` is a direct, config-driven analogue of the real system's
rule-based fallback layer (`lib/fallback.py` in the sample-agents repo): possession → shoot/pass
under pressure → mark/press when defending → chase a loose ball, all parameterized by the agent's
personality sliders instead of hardcoded constants.

## Stadium designs

Three visual themes, switchable per match from `/play`:

1. **Stadium Night** — floodlit night match, neon HUD, broadcast drama.
2. **Broadcast Day** — bright sunny derby, crisp TV-graphics styling.
3. **Minimal Turf** — clean flat-design pitch built to match the FlexiLoans brand.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000, build a squad at `/build`, then head to `/play` to kick off.

## Scripts

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run lint` — ESLint

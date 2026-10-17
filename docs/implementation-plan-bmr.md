# BOTC Generator — Implementation Plan (v2: Bad Moon Rising)
*Adds Bad Moon Rising alongside Trouble Brewing. Builds on `research-bmr.md` and the v1 plan in `implementation-plan.md`. Oct 17, 2026.*

> **Status:** proposed, not started. The decisions marked **[decide]** in §9 need an answer before milestone 2.

---

## 1. Goal

A **script switcher** (Trouble Brewing | Bad Moon Rising). Everything the app does for TB works for BMR:
- In/Auto/Out per character
- feasibility messages
- bag, bluffs and first-night prep
- reminders and night order
- Re-roll, Re-pick, the Storyteller dropdowns
- Copy as text

TB behaviour stays exactly as it is today.

**Out of scope:** custom scripts / Script Tool JSON import, Sects & Violets, Fabled, jinxes, seating. The refactor in §3 makes custom scripts and S&V cheap later, but they aren't part of this work.

---

## 2. What's TB-specific in the code today

All in `index.html` between `/*CORE-START*/` and `/*CORE-END*/`:

| Hard-coded today | Where | BMR needs |
|---|---|---|
| One `ROLES` array | data | A roster per script |
| Imp always included (`prefOf` forces it, UI disables its buttons) | `prefOf`, picker | Pick 1 of 4 Demons, with In/Out |
| Baron logic: `states = [false, true]`, `±2` arithmetic, Baron-specific messages | `analyze`, `generate`, `checkSetup`, `message`, distribution bar | Godfather `−1 or +1`, generic modifiers |
| Drunk decoy (`decoy`, `decoyPool`, `bagOf`) | `generate`, `setDecoy` | Stays, but as a TB character handler. Lunatic gets its own. |
| `INFO_KEYS`, `pickOne` for FT / Washerwoman / Librarian / Investigator | first-night picks | Grandmother; Godfather info; Lunatic bluffs |
| `SYS_FIRST` night entries, ordinals 10…100 | night order | Lunatic step between Minion and Demon info; official ordinals |
| `seatNotes` for Chef/Empath | format | Tea Lady |
| `"imp"` literal in `bagOf`, `inPlay`, `checkSetup`, UI | many | `setup.demon` |

---

## 3. Architecture: scripts as data + character handlers

Keep the single-file, no-build approach. Inside the core:

```js
const ROLES = { /* every character from both scripts, keyed by id */ };
const SCRIPTS = {
  tb:  { id: "tb",  name: "Trouble Brewing", roles: ["washerwoman", …, "imp"],
         travellers: ["Scapegoat", "Gunslinger", "Beggar", "Bureaucrat", "Thief"] },
  bmr: { id: "bmr", name: "Bad Moon Rising", roles: ["grandmother", …, "po"],
         travellers: ["Apprentice", "Matron", "Judge", "Bishop", "Voudon"] }
};
```

**Role data** follows the official `roles.json` field names, so a later Script Tool import is a small step:
- `id`, `name`, `team`, `ability`, `reminders`
- `firstNight` / `otherNight`: official ordinals from `nightsheet.json`
- `firstNightReminder` / `otherNightReminder`: our short notes, as today

Two generator-specific fields:

```js
godfather: { …, modifier: { outsider: [-1, +1] } }   // Baron: { outsider: [+2] }
lunatic:   { …, handler: "lunatic" }                 // drunk: { handler: "drunk" }
```

**Character handlers** are small objects keyed by id. They replace the inline special cases, and each hook is optional:

| Hook | Used by | Purpose |
|---|---|---|
| `feasible(ctx)` | drunk | Extra constraint: a spare non-excluded Townsfolk exists |
| `bag(setup)` | drunk, lunatic | Adjust the bag (decoy Townsfolk; Lunatic's fake Demon token) |
| `prep(setup, rng)` | fortuneteller, washerwoman, librarian, investigator, grandmother, godfather, lunatic | First-night prep items (what `info` is today) |
| `override` | drunk (`setDecoy`), fortuneteller (`setRedHerring`), lunatic (`setLunaticDemon`), grandmother (`setGrandchild`) | Storyteller dropdowns after generating |
| `seat` | chef, empath, tealady | "Depends on seating" notes |
| `wakesAs(setup)` | drunk (wakes as decoy), lunatic (wakes as a Demon at ordinal 21/34) | Night-order labels |

`setDecoy` and `setRedHerring` keep their exported names and signatures, so the existing tests keep working.

---

## 4. Generic feasibility and generation

The Baron-specific two-state check becomes a small **enumeration** that works for any script. It's cheap: at most C(4,3)=4 Minion sets × 2 Godfather directions × 4 Demons.

```
analyze(cfg):
  script = SCRIPTS[cfg.script]; base = DIST[real]
  demons = non-excluded Demons honouring includes
    → errors if 2+ included or none available
  for each Minion set M (size base.mn, honouring In/Out):
    for each combination of M's modifier choices (Godfather: −1, +1):
      tf, os = base adjusted; skip if os < 0 or tf < 0
      run the count checks from today (tfOver/tfShort/osOver/osShort)
        + handler.feasible hooks (Drunk spare Townsfolk)
      record { M, choice, errs }
  feasible = records without errors
```

- **Generation:** pick a Minion set uniformly from the *feasible Minion sets*, then a modifier choice uniformly from that set's feasible choices, then Outsiders, Townsfolk and a Demon as today. With everything on Auto, every Minion set is feasible, so frequencies match TB v1 (the fairness test keeps guarding this).
- **Auto-add:** if every feasible record contains a modifier Minion on Auto, it's forced. This is what `forcedBaron` does today, renamed `forced: { id, choice }`. The UI flag becomes "Added automatically so your choices fit (+1 Outsider)".
- **Messages:**
  - Keep today's TB wording by mapping the generic error codes to the same strings. The tests assert some of them (`/Allow the Baron/`, `/already fill every Minion slot/`, `/Drunk needs/`).
  - Generalise the "Baron would make room, but…" branch to "a *modifier Minion* would make room" naming the Baron or Godfather.
  - New codes: `demonOver` ("You included 2 Demons; only one can be in play"), `demonNone` ("Every Demon is excluded").
- **Oracle in tests:** generalise the brute-force oracle the same way (Minion sets × modifier choices × Outsider sets × Demon). Being independent of `analyze`, it keeps the property test meaningful.

---

## 5. BMR-specific behaviour

**Godfather**
- Summary line: "Godfather −1 Outsider" / "+1 Outsider", like the Baron.
- Distribution bar: when the Godfather is In or forced, show the direction; when it's on Auto, "A random Godfather adds or removes 1 Outsider".
- First-night prep: "Godfather: show Lunatic, Tinker" / "No Outsiders in play to show".

**Lunatic** (handler `lunatic`)
- `setup.lunaticAs` defaults to the real Demon.
- Bag: if `lunaticAs === demon`, the bag is unchanged and gets the note "Lunatic and Demon tokens both go in; swap them in the Grimoire after the draw". Otherwise the Lunatic token is replaced by the `lunaticAs` Demon token ("Dashed: the Lunatic's fake Demon").
- First-night prep, at 7+ players:
  - "Lunatic: show THESE ARE YOUR MINIONS, point to any N players"
  - "Lunatic's bluffs: X, Y, Z" (Re-pick)
- First-night prep, always: "Demon: show YOU ARE + *Demon*, then THIS PLAYER IS + Lunatic"
- Override `setLunaticDemon(setup, id)`: a dropdown of the four Demons ("Thinks: Po"). The pool respects exclusions only if §9 Q3 says so.
- Night order: "Lunatic (as Po)" at ordinals 21 and 34.
- `checkSetup`: the bag must contain `lunaticAs`. If it differs from the Demon, the bag holds two distinct Demon tokens and no Lunatic token. Otherwise it holds both the Lunatic and the Demon token.

**Grandmother**
- Prep: "Grandchild: the *Fool* player. Show the Fool token."
- Pool: good in-play characters except the Grandmother.
- Re-pick + dropdown via `setGrandchild` (same UI component as Red Herring).

**Demon**
- `setup.demon` is chosen; the Demon tiles get working In/Auto/Out buttons, and the "Always in play" flag only shows when a script has one Demon.
- The bluff logic is unchanged.

**Seat notes:** Tea Lady.

**Travellers:** the Travellers block lists the script's own recommended Travellers.

---

## 6. UI changes

- **Script switcher**: a two-option segmented control in the header (reuse the `.seg3` style) that sets `state.script`.
- **Per-script choices:** storage moves to `{ script, players, prefs: { tb: {…}, bmr: {…} } }`. Migrate the existing `botc-tb-generator-v1` key on load, so current users keep their TB choices.
- Switching scripts re-renders the picker and regenerates. The player count is shared.
- Picker teams render from `SCRIPTS[script].roles`. Demons get a normal In/Auto/Out control.
- Title, eyebrow, `<title>` and Copy-as-text header read "Bad Moon Rising" when it's selected. Rename the page to "Clocktower Setup Generator" (README too).
- Result panel: the generic prep list already supports `ctl` dropdowns + Re-pick, so the new items reuse it.

---

## 7. Testing

`tests/test-generator.js` becomes script-parametrised:

1. **Property run per script:** the current 5–20 × 5000 random configs loop, checking `analyze` against the oracle, `generate` + `checkSetup`, and `toText`. That's about 2× today's runtime (~a few seconds).
2. **TB regression guard:** before the refactor, record generator output for ~200 seeded configs into a fixture. After the refactor, assert identical output, which proves TB didn't change. Delete the fixture after M1 lands, or keep it as a golden test.
3. **BMR targeted cases** (from `research-bmr.md` §6):
   - Godfather forced +1 at 5/7/10/13
   - Godfather forced −1 with all Outsiders Out
   - auto-added Godfather
   - Godfather Out error message
   - 2 Demons In / all Demons Out errors
   - Lunatic bag in both modes
   - `setLunaticDemon` across all Demons
   - Grandchild always good, never the Grandmother
   - Lunatic prep absent at 5–6
4. **Fairness:** existing TB check, plus BMR Demon frequency (each ~25%) and Godfather direction split when both fit (~50/50).
5. **Browser smoke check** with Playwright (as done for the Drunk/Red Herring change):
   - switch scripts, generate, change the Lunatic's Demon
   - no console errors
   - phone-width layout

---

## 8. Milestones

Each milestone keeps `npm test` green and is one reviewable commit or PR.

| # | Milestone | Done when |
|---|---|---|
| M0 | **Golden fixture**: capture current TB outputs for seeded configs | Fixture committed; test compares against it |
| M1 | **Refactor TB to the data + handler model**: `SCRIPTS`, `setup.demon`, official ordinals, modifiers, handlers, enumeration-based `analyze` | Golden fixture identical; all existing tests pass; UI unchanged |
| M2 | **BMR data + rules**: roster, Godfather modifier, Demon choice, Lunatic bag, Grandmother/Godfather/Lunatic prep, Tea Lady, oracle generalised | BMR property run + targeted tests pass |
| M3 | **UI**: script switcher, per-script storage + migration, Demon tiles, Godfather bar/flags, Lunatic + Grandchild dropdowns, Traveller list, copy text | Playwright smoke check clean on desktop + phone |
| M4 | **Docs**: README (scripts, new controls), update both plans' status, rename the page | Merged; Pages deploy green |

M1 carries most of the risk (it touches every TB path); the golden fixture is what makes it safe. M2 and M3 are mostly additive.

---

## 9. Decisions needed

1. **Godfather direction**: random among the directions that fit (recommended, matches "Storyteller's discretion" and the auto-Baron behaviour), or a user setting on the Godfather tile (+1 / −1 / Either)? A setting is easy to add later on top of the random default.
2. **Lunatic's Demon default**: the same Demon as the real one (recommended; it's the standard bag swap), or random among the four?
3. **Exclusions for fake tokens**: should the Lunatic's fake Demon respect Demon exclusions, as the Drunk's decoy respects Townsfolk exclusions? Recommended: yes, for consistency ("Out" means the token never comes out of the box).
4. **Lunatic's bluffs**: independent random good characters, in play allowed (recommended, per the wiki), or copy the real Demon's bluffs?
5. **Page name**: rename to "Clocktower Setup Generator" and keep the URL (recommended), or keep "Trouble Brewing Generator"?

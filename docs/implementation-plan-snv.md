# BOTC Generator — Implementation Plan (v3: Sects & Violets)
*Adds Sects & Violets as a third script. Builds on `research-snv.md` and the v2 plan in `implementation-plan-bmr.md`. Oct 17, 2026.*

> **Status:** proposed, not started. The decisions in §9 need an answer before milestone 1.

---

## 1. Goal

Add **Sects & Violets** to the script switcher, with everything the other two scripts have:
- In/Auto/Out per character, feasibility messages
- bag, bluffs, first-night prep, reminders, night order
- Re-roll, Re-pick, Storyteller dropdowns, Copy as text

Trouble Brewing and Bad Moon Rising output must stay **identical**.

**Out of scope:** custom scripts / Script Tool import, Fabled, jinxes across scripts, seating.

---

## 2. What the current code can't express

Bad Moon Rising made the core data-driven, but it baked in one assumption that S&V breaks:

| Today (`index.html` core) | Where | S&V needs |
|---|---|---|
| One Outsider-changing character per script, and it's a **Minion** (`S.mod`, asserted at load) | data setup, `analyze`, `message`, `generate`, `checkSetup`, UI bar/flags | **Two** modifiers, both **Demons** (Fang Gu +1, Vigormortis −1) |
| `analyze` enumerates `[without mod, with mod] × mod's shifts` | `analyze` | Enumerate **Demon × modifier-Minion presence × shifts** |
| `generate` picks Minions → shift → Outsiders → Townsfolk → **Demon last** | `generate` | When the Demon changes counts, it has to be chosen **before** the Outsiders |
| A shift that would leave negative Outsiders is *not an option* (right for the Godfather) | `analyze` | Vigormortis **clamps** at 0: at base 0 it changes nothing |
| `setup.modifier = { id, shift }`: one modifier | setup, text, UI | Still one per game in every base script; keep the shape |
| Night-1 picks: FT, WW/Lib/Inv, Lunatic, Godfather, Grandmother | `infoSources`/`pickOne`/`checkSetup`/`infoLine` | + Evil Twin (Good Twin) |
| `seatNotes`: Chef, Empath, Tea Lady | format | + Clockmaker, No Dashii |
| `reminders` only | data | + `remindersGlobal` (Philosopher's "Is The Philosopher") |

---

## 3. Data changes

- **Roster:** the 25 S&V characters in `ROLES`, using official ability text and night-sheet ordinals (`research-snv.md` §2), with short `firstNote`/`otherNote` in our style. Add `SCRIPTS.snv` with its roles and Travellers (Barista, Harlot, Butcher, Bone Collector, Deviant).
- **Modifiers:** keep `modifier: [shifts]` and add an optional `clamp: true`:
  ```js
  baron:       { …, modifier: [2] }
  godfather:   { …, modifier: [-1, 1] }            // −1 not allowed at 0 Outsiders
  fanggu:      { …, modifier: [1] }
  vigormortis: { …, modifier: [-1], clamp: true }   // at 0 Outsiders: no change
  ```
  `effectiveShift(d, OS, clamp)` returns `clamp ? Math.max(d, -OS) : d`, or "not allowed" when the result is negative and there's no clamp.
- Replace `S.mod` with `S.mods = { minion: [...], demon: [...] }`. The load-time assertion becomes "at most one modifier **Minion** per script". A script can have any number of modifier Demons, since only one Demon is ever in play.
- `remindersGlobal` on the Philosopher; `reminderList` appends it.

---

## 4. Feasibility and generation

**`analyze`**: enumerate a small product. At most 4 Demons × 2 (modifier Minion in/out) × 2 shifts = 16 states, each checked with today's count checks:

```
for demon D in non-excluded Demons (honouring a Demon In):
  dShift = D.modifier ? effectiveShift(D.modifier[0], OS, D.clamp) : 0
  for b in [mod Minion out, in] (honouring In/Out, as today):
    for m in (b ? mod Minion's allowed shifts : [0]):
      tf, os = TF − dShift − m, OS + dShift + m;  skip if os < 0
      errs = check(b, tf, os)        // today's tfOver/tfShort/osOver/osShort/Drunk/mn checks
      record { demon: D, mod: b, shift: dShift + m, parts, errs }
```

No base script has both a modifier Minion and a modifier Demon, so the combined case is never exercised. The product handles it anyway for custom scripts later.

**Forcing**:
- `forcedMod` (Minion) as today.
- New `forcedDemons`: the set of Demons that appear in any feasible state. When the user left Demons on Auto and this set is smaller than the non-excluded Demons, the result flags the chosen Demon "added so your choices fit". The Demon tiles flag "Only this Demon fits" when exactly one remains.

**Messages**: today's codes, worded per modifier character:
- When no state fits and a modifier Demon on Auto would fix the Outsider/Townsfolk count but is blocked: "The Fang Gu (+1 Outsider) would make room, but it's excluded" or "but you included the Vortox".
- When a modifier Demon is **In** and that causes the problem: "With the Vigormortis (−1 Outsider), 6 players have 0 Outsider slots, but you included 1. Remove the Outsider or the Vigormortis."
- Keep every existing TB/BMR string byte-for-byte (the golden check covers error text too).

**`generate`**, with the RNG order kept so TB/BMR output doesn't change:
1. **If the script has modifier Demons** (S&V only): pick the Demon first, uniformly among the Demons with at least one feasible state.
2. Minions → modifier-Minion shift → Outsiders → Townsfolk, as today, using the counts for the chosen Demon.
3. **Otherwise** (TB, BMR): the Demon is picked after Townsfolk, exactly where it is today.
4. Drunk decoy, Lunatic, bluffs, first-night picks: unchanged.

Fairness: with everything on Auto, every S&V Demon has a feasible state, so each is ~25%. With constraints, the Demon is uniform among the Demons that fit, rather than weighted by how many setups each allows (see §9 Q2).

**`checkSetup`**:
- Expected counts come from `s.modifier` (now possibly a Demon). The modifier must be the in-play Demon or Minion, with a legal (clamped) shift.
- Evil Twin check: the Good Twin is a good player in play.

---

## 5. S&V-specific output

| Item | When | Output |
|---|---|---|
| Summary line | Fang Gu / Vigormortis | "· Fang Gu +1 Outsider" / "· Vigormortis −1 Outsider", or "· Vigormortis (no Outsiders to remove)" when clamped to 0. |
| Good Twin | Evil Twin in play | "Good Twin: the *Juggler* player. Show them the Evil Twin token; show the Evil Twin the Juggler token." Dropdown + Re-pick via a new `setTwin` (same component as Grandchild). |
| Vortox | Vortox in play | Prep note: "Every Townsfolk's information must be false." |
| Fang Gu | Fang Gu in play | Prep note: "Keep a spare Fang Gu token for when an Outsider is killed." |
| Pit-Hag | Pit-Hag in play | Prep note: "Keep the not-in-play tokens (including Demons) to hand." |
| Seat notes | Clockmaker, No Dashii | "Depends on seating" rows. |
| Reminders | Philosopher | "Is The Philosopher" in the reminder list. |
| Travellers | 16+ players | "Recommended: Barista, Harlot, Butcher, Bone Collector, Deviant." |

Prep notes without a pick (Vortox, Fang Gu, Pit-Hag) reuse the `seatNotes`-style rows. Rename that function to `notes` with a `kind` field, so the UI can label "Depends on seating" vs "Reminder".

---

## 6. UI

- **Script switcher:** a third button. "Trouble Brewing / Bad Moon Rising / Sects & Violets" won't fit one row at phone width, so below ~480px the buttons show **TB / BMR / S&V** (full name in `aria-label` and `title`). Storage already keys choices per script (`prefs.snv`).
- **Distribution bar / legend:**
  - Demon on Auto with modifier Demons in the script: "A random Fang Gu adds 1 Outsider; a Vigormortis removes 1".
  - Demon In or forced: show its shift and adjust the bar, as for the Baron.
- **Demon tiles:** flag "Added automatically so your choices fit" when one Demon is forced, and "Can't fit your choices" on Auto Demons that no feasible state uses (greyed, still clickable).
- **Budgets:** the "with Baron/Godfather" suffix becomes "with Fang Gu" / "with Vigormortis" when the Demon is decided.
- **Result:**
  - the Demon card shows "This game: +1 Outsider" like the Minion modifiers
  - the Good Twin row gets a dropdown + Re-pick
  - the new reminder rows render like the seat notes

---

## 7. Testing

1. **Golden checks first (M0):**
   - Extend `tests/golden.js` to record **Bad Moon Rising** too (400 seeded configs, same hashed format) *before* touching the core.
   - Both TB and BMR must stay identical through every milestone. This specifically guards the RNG-order rule in §4.
2. **Oracle:** the brute-force check in `test-generator.js` already enumerates Demon × Minion sets × shifts × Outsider sets. Extend it so the Demon's own `modifier`/`clamp` feeds the shift. It stays independent of `analyze`.
3. **Property run:** add `"snv"` to the script loop (5–20 players × 5000 configs). That's +~20s, so `npm test` would take about 65s. Acceptable, or drop to 3000 configs per count for all scripts (see §9 Q4).
4. **Targeted S&V cases** (from `research-snv.md` §5):
   - Vigormortis at 5/7/10/13 (no change) and at 6/15
   - Fang Gu at 5/15
   - forced Fang Gu at 8 with 2 Outsiders In, and the error when it's Out
   - forced Vigormortis with all Outsiders Out at 6/8, and the error when it's Out
   - Vigormortis In + Outsider In at 7
   - Fang Gu In + all Outsiders Out
   - Good Twin always good and in play; `setTwin` accepts/refuses correctly
   - Vortox / Fang Gu / Pit-Hag prep notes present only when in play
   - Philosopher global reminder listed
5. **Fairness:** S&V Demons ~25% each with everything on Auto. With the Fang Gu excluded at 8 players and 2 Outsiders In, there's no valid Demon (error). With 1 Outsider In at 7 players, only the Fang Gu fits (100%).
6. **Browser smoke check** (Playwright):
   - switch to S&V, generate, force a Demon via Outsider choices, change the Good Twin
   - phone width shows TB / BMR / S&V with no horizontal scroll
   - no console errors

---

## 8. Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | **BMR golden fixture** added next to the TB one | `npm test` checks both |
| M1 | **Core generalisation**: `S.mods`, Demon modifiers + clamp, Demon-first generation only for scripts with modifier Demons, `forcedDemons`, messages | All existing tests + both golden checks pass, with no S&V yet |
| M2 | **S&V data + rules**: roster, Evil Twin pick + `setTwin`, notes, global reminders, oracle + targeted tests | S&V property run, targeted and fairness tests pass |
| M3 | **UI**: third switcher button (short labels on phones), Demon flags, bar/legend, Good Twin dropdown | Playwright check clean on desktop + phone |
| M4 | **Docs**: README, plan status | Merged; Pages deploy green |

M1 carries the risk (it touches the counts logic every script uses); the two golden fixtures are what make it safe.

---

## 9. Decisions needed

1. **Good Twin:** random good player with a dropdown + Re-pick (recommended, matches Red Herring/Grandchild), or always ask the Storyteller to choose?
2. **Demon fairness under constraints:** pick uniformly among the Demons that fit (recommended: predictable, "Auto means any that fit"), or weight each Demon by how many setups it allows?
3. **Extra prep notes** for Vortox / Fang Gu / Pit-Hag: include them (recommended), or keep prep to things the generator actually picks?
4. **Test runtime:** accept ~65s for `npm test`, or trim the property run to 3000 configs per player count per script (~40s, still ~130k setups per script)? Recommended: trim.
5. **Phone switcher labels:** TB / BMR / S&V abbreviations (recommended), or a dropdown instead of buttons?

# BOTC Generator — Implementation Plan (v1)
*Trouble Brewing role generator for the Storyteller. Builds on `research/botc-trouble-brewing-research.md`. Oct 16, 2026.*

> **Status (Oct 16, 2026): v1 built.** Source: `app/tb-generator.html`. Tests: `app/test-generator.js` (run `node test-generator.js tb-generator.html`). Published as the "Trouble Brewing Generator" artifact.
>
> **Decisions confirmed:** official player-count rule (above 15 = Travellers); no seating, names or pass-the-device; Red Herring and Washerwoman/Librarian/Investigator info picked by character; Baron auto-added whenever it's the only way your choices fit (Outsiders or the Drunk's decoy); excluded characters may be bluffs; the Drunk's decoy respects exclusions.

---

## 1. Goal

A single-page app the **Storyteller alone** uses to generate which Trouble Brewing characters go in a game. Pick a player count, optionally pin characters you want ("always include Baron") or ban ones you don't, press **Generate**, and get a legal setup ready to drop into the Grimoire.

**In scope (v1)**
- Player count 5–15, plus 16–20 shown as "15 + N Travellers".
- Per-character **Include / Auto / Exclude** controls.
- A legal setup that honours every include and exclude, or a clear message explaining why that's impossible.
- Setup modifiers handled automatically: Baron (+2 Outsiders), Drunk (fake Townsfolk in the bag).
- Storyteller extras: Demon bluffs, which tokens go in the bag, reminder tokens to pull, night order for this setup.
- Re-roll keeps your choices; copy the result as text.

**Out of scope (v1)**
- Player names, seating, pass-the-device reveal.
- Seat-dependent info: the Chef's number and the Empath's readings. The tool reminds the Storyteller these exist but can't compute them without seating.

**Character-referenced info (in scope).** Some first-night prep points at a *player*, but that player is identified by the token they hold, so it needs no seating:
- **Fortune Teller Red Herring**: one good character in play, e.g. "Red Herring: the Monk player". Can be the Fortune Teller themself, the Drunk's player, or an Outsider.
- **Washerwoman / Librarian / Investigator pairs**: the true character plus a "wrong" character, e.g. "Show the Chef player and the Saint player; reveal Chef". Librarian shows "0" when no Outsiders are in play.
- Other scripts, Fabled, choosing specific Travellers.

---

## 2. Delivery: one self-contained HTML file

- **Plain HTML + CSS + vanilla JS** in one file. No framework, no build step, no network calls (Google Fonts optional, with fallbacks).
- Runs identically as a **Claude artifact**, opened from disk, or hosted anywhere static.
- Remembers the last player count and Include/Exclude choices in `localStorage` (wrapped in try/catch; the app works fine without it).
- The source file is saved to this project so later chats can extend it.

Inside the file, the script is split into clearly marked sections so the logic stays testable:

| Section | Contents | Pure? |
|---|---|---|
| `DATA` | The 22 TB characters, the distribution table, the night order | yes |
| `RNG` | `crypto.getRandomValues`-based random int + Fisher–Yates shuffle; injectable for tests | yes |
| `GENERATOR` | `generate(config, rng) → { ok, setup } \| { ok:false, errors }` | yes |
| `VALIDATE` | `checkSetup(setup, config)`, an independent invariant check | yes |
| `FORMAT` | Turn a setup into display data and plain text for copying | yes |
| `UI` | Rendering, events, state, storage | no |

---

## 3. Data model

```js
// One entry per character (22 total)
{
  id: "baron", name: "Baron", team: "minion",          // townsfolk | outsider | minion | demon
  ability: "There are extra Outsiders in play. [+2 Outsiders]",
  firstNight: null, otherNight: null,                  // night order positions, null = doesn't wake
  firstNightNote: "...", otherNightNote: "...",        // short Storyteller prompt
  reminders: [],                                       // reminder token names
  setup: { outsiders: +2, townsfolk: -2 }              // only Baron has this
}

const DISTRIBUTION = { 5:[3,0,1,1], 6:[3,1,1,1], 7:[5,0,1,1], 8:[5,1,1,1], 9:[5,2,1,1],
                       10:[7,0,2,1], 11:[7,1,2,1], 12:[7,2,2,1],
                       13:[9,0,3,1], 14:[9,1,3,1], 15:[9,2,3,1] };  // TF, OS, MN, DM

// Config the UI passes to the generator
{ players: 8, pref: { baron: "include", saint: "exclude", ... } }   // missing = "auto"
```

Night order uses the official TB sheet from the research doc. Minion Info and Demon Info are system steps that only apply at 7+ players.

---

## 4. The character picker (Include / Auto / Exclude)

Each character tile cycles through three states with one control (segmented toggle on desktop, tap-to-cycle on phone):

| State | Meaning | Visual |
|---|---|---|
| **Auto** (default) | May or may not appear | Neutral |
| **Include** | Always in the setup | Filled, pin icon |
| **Exclude** | Never in the setup | Struck through, dimmed |

Rules shown inline, as you choose:
- **Imp** is always included and can't be excluded (it's the only Demon).
- A live **budget bar** per team shows "Minions: 2 included / 1 slot" and turns red when over.
- If an Include can only fit by adding the Baron (e.g. 3 Outsiders included at 8 players), the Baron tile shows "Needed for your Outsiders" and is pulled in automatically, unless you excluded it, in which case you get the conflict message instead.
- Including the **Drunk** notes that one Townsfolk token in the bag will be a decoy.

**"Reset choices"** returns everything to Auto.

---

## 5. Generation algorithm (with includes)

```
generate({ players, pref }, rng):
  real = min(players, 15); travellers = players - real
  [TF, OS, MN, DM] = DISTRIBUTION[real]
  inc(team) = included characters on that team
  pool(team) = characters on that team not excluded and not included

  1. Decide the Baron
     - Included → in.  Excluded → out.
     - Auto → in only if needed to fit included Outsiders
       (inc(outsider) > OS and inc(outsider) <= OS+2); otherwise
       it competes for a Minion slot like any other Minion (step 2).
  2. Minions: start with inc(minion) (+ Baron if forced), fill to MN from pool(minion).
     If the Baron ended up in: TF -= 2, OS += 2.
  3. Outsiders: inc(outsider), fill to OS from pool(outsider).
  4. Townsfolk: inc(townsfolk), fill to TF from pool(townsfolk).
  5. Demon: Imp.
  6. Drunk: if in play, pick its fake Townsfolk from Townsfolk that are
     not in play and not excluded. The bag gets the fake instead of the Drunk.
  7. Demon bluffs (7+ players only): 3 good characters not in play and not
     the Drunk's fake. Prefer 2 Townsfolk + 1 Outsider; fall back to 3 Townsfolk
     if no Outsider is left. Excluded characters are allowed as bluffs
     (they're not in play).
  7b. First-night picks, by character:
     - Red Herring (Fortune Teller in play): random good in-play character,
       FT included; the Drunk is listed as "Drunk (as <fake>)".
     - Washerwoman: a random in-play Townsfolk (not the Washerwoman) + a random
       other in-play character as "wrong". Same pattern for the Librarian
       (Outsider, or "0" if none; sees "Drunk", not the fake) and the
       Investigator (Minion).
     - The Storyteller can re-pick any of these without re-rolling the setup.
  8. Build outputs: in-play list, bag list, bluffs, reminder tokens,
     first-night and other-night order filtered to in-play characters
     (the Drunk sits in its fake's slot, labelled "Drunk as <fake>").
  9. Run checkSetup(); any failure is a bug and is shown as an error.
```

Fill steps shuffle the pool with `rng` and take the first k, so every eligible character is equally likely. A Minion slot left on Auto can still roll the Baron randomly, which then shifts two Townsfolk slots to Outsiders; that is normal TB behaviour.

**Conflict checks, run before generating** (each produces one plain message that names the fix):

| Conflict | Example message |
|---|---|
| Too many included on a team | "You included 2 Minions, but 8 players have 1 Minion slot. Raise the player count to 10+ or remove one." |
| Outsiders don't fit, Baron excluded | "You included 3 Outsiders; 8 players have 1 slot. Include the Baron (+2 Outsiders) or remove some." |
| Outsiders don't fit even with Baron | "4 Outsiders need at least 3 base slots + Baron; not possible at 7 players." |
| Too many excluded | "Only 4 Townsfolk are left after exclusions; this setup needs 5." |
| Drunk has no decoy | "The Drunk needs a not-in-play Townsfolk to pose as, but every remaining Townsfolk is in play or excluded." |
| Baron included, not enough Townsfolk | "With the Baron, 5 players have 1 Townsfolk slot, but you included 2 Townsfolk." |

The Generate button disables while a conflict exists, with the message right beside it.

---

## 6. Output panel

Shown after **Generate**, in this order:

1. **Summary line**: `8 players · 5 Townsfolk · 1 Outsider · 1 Minion · 1 Demon` (+ "Baron: +2 Outsiders applied" when relevant, + "3 Travellers" for 18 players).
2. **Characters in play**, grouped by team with ability text. Included characters carry a pin. The Drunk reads "Drunk — thinks they are the Monk".
3. **Put in the bag**: the exact tokens to shuffle (Drunk replaced by its fake). This is the list the Storyteller actually handles.
4. **Demon bluffs**: 3 tokens, or "None at 5–6 players".
5. **Reminder tokens to pull**: e.g. Fortune Teller: Red Herring; Drunk: Is the Drunk.
6. **First-night prep**: only the items this setup needs, filled in: "Red Herring: the Saint player", "Place 'Is the Drunk' on the Monk player", "Washerwoman: point to the Chef player and the Imp player, show Chef", "Chef: count evil pairs at the table (seat-dependent)". Each picked item has a small re-pick button.
7. **Night order**: first night and other nights, filtered, each with a one-line prompt.

Actions: **Re-roll** (same choices), **Copy as text** (plain-text block for notes or Discord), **Edit choices** (scroll back to picker).

---

## 7. Layout

- **Desktop**: two columns. Left: player count + character picker. Right: sticky result panel.
- **Phone**: one column. Controls on top, sticky **Generate** button at the bottom, result below.
- Player count: stepper (−/+) plus a 5–20 slider, with the distribution bar from the research page under it.
- Team colours follow the game: blue for good, red for evil. Works in light and dark.
- Opens in a working state: 8 players, one setup already generated, so the first view shows what the tool does.

---

## 8. Testing

Because `generate` and `checkSetup` are pure, test them headlessly with Node before building the UI:

- **Property run**: for every player count 5–20, 5,000 random configs with random Include/Exclude sets. Every result is either a valid setup that passes `checkSetup`, or a conflict whose message matches a pre-check.
- **`checkSetup` invariants**: token count = regular players; exactly one Demon; per-team counts match the distribution after the Baron; no duplicates; every Include present; no Exclude in play; Drunk's fake not in play and not excluded; bluffs are good, not in play, not the fake; no bluffs at 5–6; Red Herring is a good in-play character; each info pair names two different in-play characters, with the true one of the right type and not the info character itself.
- **Targeted cases**: Baron included at 5 and 15 (Drunk forced in at 15); 3 Outsiders included at 8 pulls in the Baron; Baron excluded with too many Outsiders errors; Drunk included with all spare Townsfolk excluded errors; 18 players → 3 Travellers.
- **Fairness sanity check**: over 50,000 Auto rolls at 10 players, each Townsfolk appears with roughly equal frequency (within a few percent).
- **UI check**: one rendered look at desktop and phone, light and dark, before publishing.

---

## 9. Build milestones

| # | Milestone | Done when |
|---|---|---|
| 1 | Data + generator + validator | Node tests in §8 pass |
| 2 | Picker UI with live conflict checks | Include/Exclude works, budgets and messages update as you click |
| 3 | Output panel | All seven output blocks render; copy-as-text works |
| 4 | Polish + persistence | Phone layout, both themes, remembered choices |
| 5 | Ship | Published as an artifact; HTML saved to the project |

---

## 10. Decisions (confirmed — see status note at top)

1. **Auto-add the Baron** when included Outsiders need it (proposed: yes, with a visible note).
2. **Excluded characters as bluffs**: allowed (proposed), since they're not in play.
3. **Drunk's decoy** respects Excludes (proposed: yes).
4. **Travellers** shown only as a count, no Traveller picking (proposed for v1).
5. **Presets**: add the three official 8-player setups as one-click starting points? (proposed: later, v1.1)

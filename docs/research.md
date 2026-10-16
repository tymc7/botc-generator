# Blood on the Clocktower — Trouble Brewing Research
*Reference for building the in-browser Storyteller setup generator. Compiled Oct 16, 2026.*

---

## 1. What the generator needs to do (scope v1)

Input: a player count (and optionally names/seating). Output: a legal, randomized Trouble Brewing (TB) setup the Storyteller can run — which characters are in play, what goes in the bag, the Storyteller-only secrets (Drunk, Red Herring, Demon bluffs, first-night info), and a night order filtered to the characters in play.

---

## 2. Game fundamentals (what the generator must respect)

**Teams & character types**
| Type | Alignment | Role in game |
|---|---|---|
| Townsfolk | Good | Abilities that help good |
| Outsider | Good | Abilities that hinder good |
| Minion | Evil | Support the Demon, disrupt good |
| Demon | Evil | Kills at night; good wins if it dies |

**Win conditions**
- Good wins when the Demon dies.
- Evil wins when only two players are left alive.
- Character-specific: Saint (good loses if Saint executed), Mayor (good wins at 3 alive with no execution).

**Day / night loop**
- Night: Storyteller wakes characters in a fixed **night order** (see §5). First night differs from other nights.
- Day: open discussion, private chats, then nominations. Each player may nominate once per day and be nominated once per day.
- Execution threshold: the most-voted player is executed only if votes ≥ 50% of *living* players; ties mean no execution. Max one execution per day in TB.
- Dead players keep talking and keep their team, lose their ability, can no longer nominate, and get **one** remaining vote for the rest of the game.

**Information distortion (core TB mechanic)**
- *Drunk / poisoned* players have no ability, but the Storyteller pretends they do and may give them false info.
- *Registering*: the Recluse may register as evil/Minion/Demon; the Spy may register as good/Townsfolk/Outsider. The Storyteller decides each time.

**Player-count rules**
- TB supports 5–15 "real" players. Above 15, extra players must be **Travellers** (up to ~20 total).
- **5–6 players ("Teensyville")**: the Demon and Minion do **not** learn each other and the Demon gets **no bluffs**. (7+ players: Minions and Demon learn each other on night 1.)

---

## 3. Setup distribution (base counts before modifiers)

| Players | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Townsfolk | 3 | 3 | 5 | 5 | 5 | 7 | 7 | 7 | 9 | 9 | 9 |
| Outsiders | 0 | 1 | 0 | 1 | 2 | 0 | 1 | 2 | 0 | 1 | 2 |
| Minions | 1 | 1 | 1 | 1 | 1 | 2 | 2 | 2 | 3 | 3 | 3 |
| Demon | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |

Pattern useful for code: `minions = 1 + floor((n-7)/3)` for n ≥ 7 (else 1); `outsiders = (n-7) mod 3` for n ≥ 7; 5→0, 6→1; townsfolk = n − outsiders − minions − 1.

16–20 players: use the 15-player distribution, extras are Travellers.

**Setup modifiers ("orange flower" characters)** — applied once, during setup, never reverted:
- **Baron** `[+2 Outsiders]` — swap two Townsfolk for two Outsiders. Added Outsiders always replace Townsfolk, never other types.
- **Drunk** — does not change counts; it occupies an Outsider slot, but a **Townsfolk token goes in the bag instead** of the Drunk token (see §4).
- After modifiers, total character tokens always equals player count.

---

## 4. Trouble Brewing roster (22 characters)

Legend: **N1** = wakes first night · **N*** = wakes other nights · **Setup** = alters setup · Reminders = Grimoire reminder tokens.

### Townsfolk (13)
| Character | Ability | N1 | N* | Reminders | ST notes |
|---|---|---|---|---|---|
| Washerwoman | You start knowing that 1 of 2 players is a particular Townsfolk. | ✓ | | Townsfolk, Wrong | Mark one Townsfolk + one other player; show both players and the Townsfolk's token. Spy can register as a Townsfolk here. |
| Librarian | You start knowing that 1 of 2 players is a particular Outsider. (Or that zero are in play.) | ✓ | | Outsider, Wrong | Learns true character (sees "Drunk", not the Drunk's fake Townsfolk). If 0 Outsiders, show "0". |
| Investigator | You start knowing that 1 of 2 players is a particular Minion. | ✓ | | Minion, Wrong | Recluse can register as a Minion here. |
| Chef | You start knowing how many pairs of evil players there are. | ✓ | | — | Count adjacent evil pairs around the circle (3 in a row = 2 pairs). Needs seating. |
| Empath | Each night, you learn how many of your 2 alive neighbors are evil. | ✓ | ✓ | — | Skips dead neighbours to nearest living player. Acts after the Demon. |
| Fortune Teller | Each night, choose 2 players: you learn if either is a Demon. There is a good player that registers as a Demon to you. | ✓ | ✓ | Red Herring | Red Herring = any **good** player, fixed for the game, may be the FT themself (often advised in small games). |
| Undertaker | Each night*, you learn which character died by execution today. | | ✓ | Executed | Sees true character (Drunk shows as Drunk). |
| Monk | Each night*, choose a player (not yourself): they are safe from the Demon tonight. | | ✓ | Safe | |
| Ravenkeeper | If you die at night, you are woken to choose a player: you learn their character. | | ✓ (if died) | — | |
| Virgin | The 1st time you are nominated, if the nominator is a Townsfolk, they are executed immediately. | | | No Ability | Drunk nominator does not trigger (Drunk is an Outsider). Spy may register as Townsfolk. |
| Slayer | Once per game, during the day, publicly choose a player: if they are the Demon, they die. | | | No Ability | Recluse may register as Demon. |
| Soldier | You are safe from the Demon. | | | — | |
| Mayor | If only 3 players live & no execution occurs, your team wins. If you die at night, another player might die instead. | | | — | ST may redirect a night kill. |

### Outsiders (4)
| Character | Ability | N1 | N* | Reminders | ST notes |
|---|---|---|---|---|---|
| Butler | Each night, choose a player (not yourself): tomorrow, you may only vote if they are voting too. | ✓ | ✓ | Master | |
| Drunk | You do not know you are the Drunk. You think you are a Townsfolk character, but you are not. | (as fake TF) | (as fake TF) | Is the Drunk | **Setup**: Drunk token never goes in the bag; a not-in-play Townsfolk token goes in instead. Player wakes/acts as that Townsfolk; ST is encouraged to give false info. |
| Recluse | You might register as evil & as a Minion or Demon, even if dead. | | | — | |
| Saint | If you die by execution, your team loses. | | | — | |

### Minions (4)
| Character | Ability | N1 | N* | Reminders | ST notes |
|---|---|---|---|---|---|
| Poisoner | Each night, choose a player: they are poisoned tonight and tomorrow day. | ✓ | ✓ | Poisoned | Acts first each night. |
| Spy | Each night, you see the Grimoire. You might register as good & as a Townsfolk or Outsider, even if dead. | ✓ | ✓ | — | Acts last. |
| Scarlet Woman | If there are 5 or more players alive & the Demon dies, you become the Demon. (Travellers don't count.) | | ✓ (if became Demon) | Is the Demon | |
| Baron | There are extra Outsiders in play. **[+2 Outsiders]** | | | — | **Setup** modifier. |

### Demon (1)
| Character | Ability | N1 | N* | Reminders | ST notes |
|---|---|---|---|---|---|
| Imp | Each night*, choose a player: they die. If you kill yourself this way, a Minion becomes the Imp. | (Demon info only) | ✓ | Dead | Starpass: ST picks an alive Minion to become the Imp. |

### Recommended Travellers for TB (16+ players)
Scapegoat, Gunslinger, Beggar, Bureaucrat, Thief. Travellers choose their character; alignment is set by the Storyteller.

---

## 5. Night order (TB official night sheet)

> ⚠️ Taken from the printed TB night sheet as commonly reproduced; re-verify against botc.app / the official script tool before shipping.

**First night**
1. Dusk
2. Minion Info *(7+ players)* — wake Minions, show them the Demon.
3. Demon Info *(7+ players)* — show the Demon its Minions + 3 not-in-play good characters (bluffs).
4. Poisoner
5. Washerwoman
6. Librarian
7. Investigator
8. Chef
9. Empath
10. Fortune Teller
11. Butler
12. Spy
13. Dawn

**Other nights**
1. Dusk
2. Poisoner
3. Monk
4. Scarlet Woman *(only if she became the Demon today)*
5. Imp
6. Ravenkeeper *(only if killed tonight)*
7. Empath
8. Fortune Teller
9. Undertaker *(only if someone was executed today)*
10. Butler
11. Spy
12. Dawn

The Drunk wakes at its **fake** Townsfolk's slot.

---

## 6. Storyteller setup procedure (official)

1. Choose characters by type per the distribution table (secretly).
2. Apply setup modifiers (Baron, Drunk). Token count = player count.
3. Add reminder tokens for chosen characters.
4. Shuffle tokens into the bag; each player draws one in secret.
5. Collect tokens into the Grimoire matching seat order.
6. First-night prep: place Drunk's "Is the Drunk", FT Red Herring, Washerwoman/Librarian/Investigator pairs, pick Demon bluffs.

**Official example 8-player setups** (5 TF / 1 OS / 1 MN / 1 DM):
- *Beginner, info-heavy*: Chef, Empath, Fortune Teller, Undertaker, Virgin, Drunk (thinks Investigator), Scarlet Woman, Imp.
- *Quieter*: Empath, Fortune Teller, Ravenkeeper, Slayer, Mayor, Saint, Poisoner, Imp.
- *Advanced*: Washerwoman, Fortune Teller, Undertaker, Slayer, Virgin, Recluse, Spy, Imp.

These make good "preset" options in the generator.

---

## 7. Generator algorithm (proposed)

```
input: n (5..20), names?, seed?, locks?, excludes?, options
1. real = min(n, 15); travellers = n - real
2. dist = DISTRIBUTION[real]                      // TF, OS, MN, DM
3. demon = Imp
4. minions = sample(MINIONS - excludes, dist.MN, includeLocked)
5. if Baron in minions: dist.TF -= 2; dist.OS += 2
6. outsiders = sample(OUTSIDERS - excludes, dist.OS)
7. townsfolk = sample(TOWNSFOLK - excludes, dist.TF)
8. if Drunk in outsiders:
       drunkFake = sample(TOWNSFOLK - townsfolk, 1)   // must be NOT in play
       bag = townsfolk + drunkFake + (outsiders - Drunk) + minions + demon
   else bag = townsfolk + outsiders + minions + demon
9. seats = shuffle(bag) mapped to players (optional)
10. ST secrets:
    - redHerring  (if Fortune Teller in play): random good player (optionally FT self)
    - demonBluffs (if real >= 7): 3 good characters NOT in play and NOT drunkFake,
                  default mix 2 Townsfolk + 1 Outsider
    - washerwoman / librarian / investigator pairs, chef number (needs seats)
11. nightOrder = filter(FIRST_NIGHT / OTHER_NIGHTS, inPlay ∪ {drunkFake})
12. validate()
```

**Invariants to validate**
- Total tokens = real player count; exactly 1 Demon.
- Counts per type match distribution after modifiers.
- No duplicate characters.
- Drunk's fake Townsfolk is not otherwise in play.
- Demon bluffs never include an in-play character or the Drunk's fake.
- Red Herring is good.
- No Minion/Demon info or bluffs at 5–6 players.

**Edge cases**
- **15 players + Baron** → 7 TF / 4 OS: all four Outsiders, so the Drunk is forced in.
- **Baron at 5 players** → 1 TF, 2 OS — legal but swingy; consider a warning.
- **13–15 players + Drunk** → 10 Townsfolk tokens used (9 + fake), leaving 3 TF for bluffs; bluff pool still fine.
- **Librarian with 0 Outsiders** → info is "0".
- **Locks/excludes** can make a setup impossible (e.g., excluding too many Townsfolk) → surface an error.

---

## 8. Data model (suggested)

Mirror the community `roles.json` shape (bra1n/townsquare, MIT) so we can import/export the official Script Tool JSON:

```json
{
  "id": "fortuneteller",
  "name": "Fortune Teller",
  "edition": "tb",
  "team": "townsfolk",
  "ability": "Each night, choose 2 players: you learn if either is a Demon. There is a good player that registers as a Demon to you.",
  "firstNight": 10,
  "otherNight": 8,
  "firstNightReminder": "The Fortune Teller points to two players. Give the head signal (nod yes, shake no) for whether one of those players is the Demon.",
  "otherNightReminder": "Same as first night.",
  "reminders": ["Red herring"],
  "setup": false
}
```

**Script Tool JSON** (official app & community tools): an array of character IDs, optionally led by a `{"id": "_meta", "name": "...", "author": "..."}` object. Supporting it lets users later load custom scripts.

---

## 9. Existing tools to learn from
- **botc.app** — official online Clocktower app; supports script JSON with `_meta` and extra character behaviours (e.g., bag-disabled / bag-duplicate flags).
- **Script Tool** — official script builder; exports JSON.
- **bra1n/townsquare (clocktower.online)** — unofficial virtual grimoire; MIT-licensed `roles.json` with night order and reminder text (no longer actively maintained).
- **Pocket Grimoire** — mobile grimoire; shows distribution table and per-player token selection.

**IP note**: Blood on the Clocktower, character names, ability text and art are © Steven Medway / The Pandemonium Institute. Fine for a personal/fan tool; avoid bundling official art (link to wiki icons or use our own iconography).

---

## 10. Open product questions
1. **Reveal flow** — Storyteller-only list, or a pass-the-device "draw from the bag" reveal for players?
2. **Seating** — enter names in seat order? Needed for Chef / Empath / pair suggestions.
3. **Auto first-night info** — should the tool pre-compute Washerwoman/Librarian/Investigator/Chef info, or leave it to the ST?
4. **Balance controls** — pure random, or weights / "beginner / chaotic / advanced" presets?
5. **Travellers** — support 16–20 now, or cap at 15 for v1?
6. **Persistence** — save/share setups (URL seed or JSON export)?

---

## Sources
- [Trouble Brewing — BotC Wiki](https://wiki.bloodontheclocktower.com/Trouble_Brewing)
- [Setup — BotC Wiki](https://wiki.bloodontheclocktower.com/Setup)
- [Rules Explanation — BotC Wiki](https://wiki.bloodontheclocktower.com/Rules_Explanation)
- [Teensyville — BotC Wiki](https://wiki.bloodontheclocktower.com/Teensyville)
- Character pages: [Washerwoman](https://wiki.bloodontheclocktower.com/Washerwoman), [Librarian](https://wiki.bloodontheclocktower.com/Librarian), [Investigator](https://wiki.bloodontheclocktower.com/Investigator), [Chef](https://wiki.bloodontheclocktower.com/Chef), [Empath](https://wiki.bloodontheclocktower.com/Empath), [Fortune Teller](https://wiki.bloodontheclocktower.com/Fortune_Teller), [Undertaker](https://wiki.bloodontheclocktower.com/Undertaker), [Ravenkeeper](https://wiki.bloodontheclocktower.com/Ravenkeeper), [Butler](https://wiki.bloodontheclocktower.com/Butler), [Drunk](https://wiki.bloodontheclocktower.com/Drunk), [Spy](https://wiki.bloodontheclocktower.com/Spy), [Baron](https://wiki.bloodontheclocktower.com/Baron), [Imp](https://wiki.bloodontheclocktower.com/Imp)
- [Pocket Grimoire (distribution table)](https://grimoire.diogotc.com/)
- [Blood on the Clocktower — Wikipedia](https://en.wikipedia.org/wiki/Blood_on_the_Clocktower)
- [botc-release (official app script JSON docs)](https://github.com/ThePandemoniumInstitute/botc-release)
- [townsquare fork (roles.json format)](https://github.com/eddgabriel/townsquare)

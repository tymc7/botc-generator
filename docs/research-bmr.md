# Blood on the Clocktower — Bad Moon Rising Research
*Reference for extending the setup generator to the second base script. Compiled Oct 17, 2026. Companion to `research.md` (Trouble Brewing).*

---

## 1. The script in one paragraph

Bad Moon Rising (BMR) is the second of the three base scripts, rated **Intermediate**. The wiki calls it "a death extravaganza": Demons can kill several players a night, Minions kill too, and many Townsfolk keep people alive (Innkeeper, Tea Lady, Fool, Sailor, Pacifist, Devil's Advocate) or bring them back (Professor, Shabaloth). Good wins by reading *how* each player died, not just who. Information is scarcer than in Trouble Brewing. Only the Grandmother and Godfather get fixed first-night info, and the Chambermaid's counts are live.

Everything in `research.md` §2–3 (teams, win conditions, the 5–15 distribution table, Travellers above 15, Teensyville rules) applies unchanged. What changes for the generator:

| | Trouble Brewing | Bad Moon Rising |
|---|---|---|
| Demons | 1 (Imp, always in play) | **4: pick one** (Zombuul, Pukka, Shabaloth, Po) |
| Setup modifiers | Baron `[+2 Outsiders]`, Drunk (decoy Townsfolk in the bag) | Godfather `[−1 or +1 Outsider]`, Lunatic (thinks they're the Demon) |
| Fixed first-night info for the generator | Red Herring, Washerwoman/Librarian/Investigator pairs | Grandchild, Godfather's Outsider list, Lunatic's fake Minions + bluffs |
| Jinxes inside the script | none | none |

---

## 2. Roster (25 characters)

Ability text is the official current wording from `ThePandemoniumInstitute/botc-release` `resources/data/roles.json`. **N1** / **N*** give the character's position in the official night sheet (`nightsheet.json`, global ordinals shared by every script; lower acts earlier). "—" means the character doesn't wake.

### Townsfolk (13)
| Character | Ability | N1 | N* | Reminders | Storyteller / generator notes |
|---|---|---|---|---|---|
| Grandmother | You start knowing a good player & their character. If the Demon kills them, you die too. | 58 | 72 | Grandchild, Dead | **Generator picks the Grandchild:** a good Townsfolk or Outsider in play, not the Grandmother. The wiki summary says "Townsfolk or Outsider"; the Lunatic and Goon are good Outsiders, so they're eligible and shown as their true character. |
| Sailor | Each night, choose an alive player: either you or they are drunk until dusk. You can't die. | 25 | 12 | Drunk | |
| Chambermaid | Each night, choose 2 alive players (not yourself): you learn how many woke tonight due to their ability. | 75 | 94 | — | Wakes on night 1 too. Acts last. |
| Exorcist | Each night\*, choose a player (different to last night): the Demon, if chosen, learns who you are then doesn't wake tonight. | — | 35 | Chosen | |
| Innkeeper | Each night\*, choose 2 players: they can't die tonight, but 1 is drunk until dusk. | — | 18 | Safe, Safe, Drunk | |
| Gambler | Each night\*, choose a player & guess their character: if you guess wrong, you die. | — | 20 | Dead | |
| Gossip | Each day, you may make a public statement. Tonight, if it was true, a player dies. | — | 57 | Dead | |
| Courtier | Once per game, at night, choose a character: they are drunk for 3 nights & 3 days. | 34 | 17 | Drunk 3, Drunk 2, Drunk 1, No Ability | |
| Professor | Once per game, at night\*, choose a dead player: if they are a Townsfolk, they are resurrected. | — | 64 | Alive, No Ability | |
| Minstrel | When a Minion dies by execution, all other players (except Travellers) are drunk until dusk tomorrow. | — | — | Everyone Is Drunk | |
| Tea Lady | If both your alive neighbors are good, they can't die. | — | — | Cannot Die ×2 | Seat-dependent: a "Depends on seating" note, like Chef/Empath. |
| Pacifist | Executed good players might not die. | — | — | — | |
| Fool | The 1st time you die, you don't. | — | — | No Ability | |

### Outsiders (4)
| Character | Ability | N1 | N* | Reminders | Notes |
|---|---|---|---|---|---|
| Goon | Each night, the 1st player to choose you with their ability is drunk until dusk. You become their alignment. | — | — | Drunk | |
| Lunatic | You think you are a Demon, but you are not. The Demon knows who you are & who you choose at night. | 21 | 34 | Chosen ×3 | **Setup character.** See §3.2. |
| Tinker | You might die at any time. | — | 70 | Dead | |
| Moonchild | When you learn that you died, publicly choose 1 alive player. Tonight, if it was a good player, they die. | — | 71 | Dead | |

### Minions (4)
| Character | Ability | N1 | N* | Reminders | Notes |
|---|---|---|---|---|---|
| Godfather | You start knowing which Outsiders are in play. If 1 died today, choose a player tonight: they die. **[−1 or +1 Outsider]** | 37 | 56 | Died Today, Dead | **Setup modifier.** See §3.1. N1: show the tokens of every Outsider in play. |
| Devil's Advocate | Each night, choose a living player (different to last night): if executed tomorrow, they don't die. | 39 | 25 | Survives Execution | |
| Assassin | Once per game, at night\*, choose a player: they die, even if for some reason they could not. | — | 55 | Dead, No Ability | |
| Mastermind | If the Demon dies by execution (ending the game), play for 1 more day. If a player is then executed, their team loses. | — | — | — | |

### Demons (4)
| Character | Ability | N1 | N* | Reminders | Notes |
|---|---|---|---|---|---|
| Zombuul | Each night\*, if no-one died today, choose a player: they die. The 1st time you die, you live but register as dead. | — | 40 | Died Today, Dead | |
| Pukka | Each night, choose a player: they are poisoned. The previously poisoned player dies then becomes healthy. | 46 | 41 | Poisoned ×2, Dead | The only BMR Demon that acts on night 1. |
| Shabaloth | Each night\*, choose 2 players: they die. A dead player you chose last night might be regurgitated. | — | 42 | Dead ×2, Alive | |
| Po | Each night\*, you may choose a player: they die. If your last choice was no-one, choose 3 players tonight. | — | 43 | Dead ×3, 3 Attacks | |

### Travellers (BMR edition, 16+ players)
Apprentice, Matron, Judge, Bishop, Voudon. They choose their character and the Storyteller sets alignment, as in TB. The Apprentice acts on night 1 (ordinal 8). These are display-only, like the TB Traveller list.

---

## 3. Setup rules the generator must model

### 3.1 Godfather `[−1 or +1 Outsider]`
- Official How to Run: "either remove one Townsfolk and add one Outsider or remove one Outsider and add one Townsfolk", **at the Storyteller's discretion**.
- If the base distribution has **0 Outsiders** (5, 7, 10, 13 players), −1 is impossible, so it must be **+1**.
- −1 can leave **0 Outsiders** (6, 8, 11, 14 players). The Godfather's first-night info is then "no Outsiders in play". The official text just shows "all in-play Outsiders", so the tool should say "show nothing / no Outsiders".
- Like the Baron, the change is applied once at setup. In BMR it's the only count modifier, so the reachable totals are base ±1.
- Generator implication: the Godfather's choice is a **second axis of randomness**. When only one direction fits the user's In/Out choices, it's forced (the same idea as the auto-added Baron). When the user's Outsider choices need exactly ±1, a Godfather on Auto may be **auto-added** to make them fit.

### 3.2 Lunatic
- **Bag (default):** both the **Lunatic token and the Demon token** go in the bag. After the draw, the Storyteller **swaps** them in the Grimoire. The player who drew the Demon token is the Lunatic (and believes they're the Demon). The player who drew the Lunatic token is the real Demon and is told so on night 1. Token count is unchanged, so `bag == inPlay`, unlike the Drunk.
- **Variant:** the Lunatic can think they're a **different Demon**. Put two Demon tokens in the bag (the real Demon plus the Lunatic's fake one). In the Grimoire, replace the fake Demon token with the Lunatic token. Wiki examples: a Lunatic-as-Shabaloth, a Lunatic-as-Zombuul. This is the BMR counterpart of the Drunk's decoy, and the obvious Storyteller override.
- **Night 1 (7+ players):** at ordinal 21, between Minion info and Demon info:
  - Wake the Lunatic. Show THESE ARE YOUR MINIONS and point to **any** players, as many as there are Minions in play.
  - Show THESE CHARACTERS ARE NOT IN PLAY and **3 good character tokens**. These **may be in play**, and real Lunatics often get in-play bluffs.
  - Then wake the real Demon. Show YOU ARE + the Demon token, then THIS PLAYER IS + the Lunatic token, and point to the Lunatic.
- **Other nights (ordinal 34, before every Demon):** the Lunatic "attacks" and gets a Chosen reminder. Then the real Demon is shown the Lunatic and their targets.
- **5–6 players:** the official night text gates only the fake Minions and bluffs behind "7 or more players". The real Demon still learns who the Lunatic is (that's the Lunatic's ability). ⚠️ Not stated explicitly anywhere; re-check before shipping.
- The Grandmother can have the Lunatic as Grandchild and sees "Lunatic". The Godfather sees "Lunatic" among the Outsiders.

### 3.3 Demon choice
- Exactly one Demon from four. The In/Auto/Out controls now apply to Demons too: **including two Demons is an error**, and **excluding all four is an error**.
- No BMR Demon changes the counts. (Later scripts do: Fang Gu `[+1 Outsider]`, Vigormortis `[−1 Outsider]`. That's a reason to model modifiers generically.)

### 3.4 Demon bluffs
- Unchanged from TB: at 7+ players, 3 good characters **not in play**. Default mix: 2 Townsfolk + 1 Outsider.
- New: the **Lunatic's** fake bluffs are a separate list (3 good characters, in play allowed).

---

## 4. Night order (official, BMR characters only)

**First night:** Dusk → (Apprentice 8) → Minion info 19 → **Lunatic 21** → Demon info 23 → Sailor 25 → Courtier 34 → Godfather 37 → Devil's Advocate 39 → Pukka 46 → Grandmother 58 → Chambermaid 75 → Dawn.

**Other nights:** Dusk → Sailor 12 → Courtier 17 → Innkeeper 18 → Gambler 20 → Devil's Advocate 25 → **Lunatic 34** → Exorcist 35 → Zombuul 40 → Pukka 41 → Shabaloth 42 → Po 43 → Assassin 55 → Godfather 56 → Gossip 57 → Professor 64 → Tinker 70 → Moonchild 71 → Grandmother 72 → Chambermaid 94 → Dawn.

The same file gives these ordinals for Trouble Brewing: Minion info 19, Demon info 23, Poisoner 32, Washerwoman 51 … Spy 71 on night 1. That's the **same relative order** the app already uses, so switching both scripts to the official ordinals changes nothing for TB.

Conditional wake-ups worth noting in the UI, as TB notes Ravenkeeper/Undertaker:
- Godfather (only if an Outsider died today)
- Zombuul (only if no one died today)
- Gossip (only if the statement was true)
- Tinker / Moonchild (only if due to die / kill)
- Grandmother (only if the Grandchild was killed by the Demon)

---

## 5. Things the generator can pre-compute (first-night prep)

| Item | When | What to output |
|---|---|---|
| Grandchild | Grandmother in play | "Grandchild: the *Professor* player. Show them the Professor token." Pick from good in-play characters except the Grandmother. Offer Re-pick + a dropdown (same pattern as Red Herring). |
| Godfather's Outsiders | Godfather in play | "Show: Lunatic, Tinker" or "No Outsiders in play". Deterministic. |
| Godfather direction | Godfather in play | "+1 Outsider" / "−1 Outsider" in the summary line, like "Baron +2 Outsiders". |
| Lunatic's Demon | Lunatic in play | "Thinks they are the *Po*". Default is the real Demon; dropdown of non-excluded Demons. Changes the bag (§3.2). |
| Lunatic's fake Minions | Lunatic in play, 7+ | "Point to any *N* players." No seating, so just the count. |
| Lunatic's bluffs | Lunatic in play, 7+ | 3 good characters, in play allowed. Re-pick. |
| Real Demon learns the Lunatic | Lunatic in play | "Show THIS PLAYER IS + Lunatic, point to the Lunatic." |
| Demon bluffs | 7+ | Unchanged. |
| Seat notes | Tea Lady in play | "Protects alive good neighbours. Depends on seating." |

Nothing else in BMR needs Storyteller info before the game: the Sailor, Courtier, Devil's Advocate and Pukka make **player choices** on night 1.

---

## 6. Edge cases to test

- **5 players + Godfather:** base 3/0/1 → must be +1 → 2 TF / 1 OS.
- **8 players, Godfather In, all Outsiders Out:** base OS 1 → must be −1 → 6 TF / 0 OS. Godfather info: "no Outsiders".
- **8 players, Godfather In, 2 Outsiders In:** must be +1.
- **8 players, 2 Outsiders In, Godfather Auto:** the Godfather is auto-added at +1. With the Godfather Out it's an error, and the message should suggest allowing the Godfather.
- **9 players, 4 Outsiders In:** base 2, max 3 with the Godfather → error.
- **15 players + Godfather +1:** 8 TF / 3 OS. With −1: 10 TF / 1 OS.
- **Two Demons In** → error. **All four Demons Out** → error.
- **Lunatic + Lunatic-as-different-Demon:** the bag has two Demon tokens and no Lunatic token. The fake Demon must be non-excluded? *Decision needed* (TB's Drunk decoy respects exclusions).
- **Lunatic at 5–6 players:** no fake Minions / bluffs, but the Demon still learns of the Lunatic.
- **Grandmother with no other good player in play:** impossible (there are always 3+ Townsfolk at 5 players), but the code should still handle an empty pool.

---

## Sources
- [Bad Moon Rising — BotC Wiki](https://wiki.bloodontheclocktower.com/Bad_Moon_Rising)
- [Lunatic — BotC Wiki](https://wiki.bloodontheclocktower.com/Lunatic), [Godfather — BotC Wiki](https://wiki.bloodontheclocktower.com/Godfather), [Grandmother — BotC Wiki](https://wiki.bloodontheclocktower.com/Grandmother), [Teensyville — BotC Wiki](https://wiki.bloodontheclocktower.com/Teensyville)
- Official data: [`botc-release` roles.json](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/resources/data/roles.json), [`nightsheet.json`](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/resources/data/nightsheet.json), [`jinxes.json`](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/resources/data/jinxes.json)
- Community cross-checks: [bra1n/townsquare roles.json](https://github.com/bra1n/townsquare/blob/develop/src/roles.json) (older wording and night order), [BotC tools night order](https://botc.beta.twitarr.com/script.html?page=night&id=181), [BotC Script Viewer](https://botc-script-viewer.sthom.kiwi/base3/bmr/), [The Nose Who Knows printable sheet](http://bignose.whitetree.org/projects/botc/diy/reference/bad-moon-rising.pdf)

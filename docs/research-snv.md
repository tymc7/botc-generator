# Blood on the Clocktower — Sects & Violets Research
*Reference for extending the setup generator to the third base script. Compiled Oct 17, 2026. Companions: `research.md` (Trouble Brewing), `research-bmr.md` (Bad Moon Rising).*

---

## 1. The script in one paragraph

Sects & Violets (S&V) is the third base script. The wiki rates it **Intermediate**, "the craziest of the three". It introduces **madness** (the Cerenovus, Mutant), and characters and alignments **change mid-game** (Snake Charmer, Pit-Hag, Barber, Fang Gu, Philosopher). Good gets plenty of information, but its meaning depends on **which Demon is in play**: under a Vortox every Townsfolk's info is false. Evil has strong killing and disruption Minions (Witch, Cerenovus, Pit-Hag) and the Evil Twin's win condition.

Rules from `research.md` §2–3 (teams, the 5–15 distribution, Travellers above 15, Teensyville) apply unchanged. What changes for the generator:

| | Trouble Brewing | Bad Moon Rising | Sects & Violets |
|---|---|---|---|
| Count modifiers | Baron `[+2 Outsiders]` (Minion) | Godfather `[−1 or +1 Outsider]` (Minion) | **Fang Gu `[+1 Outsider]`, Vigormortis `[−1 Outsider]` (Demons)** |
| Bag tricks | Drunk (decoy Townsfolk) | Lunatic (fake Demon) | none |
| Generator-picked night-1 info | Red Herring, Washerwoman/Librarian/Investigator | Grandchild, Godfather's Outsiders, Lunatic | **Good Twin** (Evil Twin) |
| Seat-dependent notes | Chef, Empath | Tea Lady | **Clockmaker, No Dashii** |
| Jinxes inside the script | none | none | none (checked against official `jinxes.json`) |

The big change for the code is that **the Demon now changes the counts**, and **two different characters in the script modify them**. The current core supports exactly one Outsider-changing *Minion* per script; §3.1 explains what has to change.

---

## 2. Roster (25 characters)

Ability text is the official current wording from `ThePandemoniumInstitute/botc-release` `resources/data/roles.json`. **N1** / **N*** give the character's position in the official `nightsheet.json` (global ordinals; lower acts earlier). "—" means the character doesn't wake.

### Townsfolk (13)
| Character | Ability | N1 | N* | Reminders | Storyteller / generator notes |
|---|---|---|---|---|---|
| Clockmaker | You start knowing how many steps from the Demon to its nearest Minion. | 59 | — | — | **Seat-dependent:** "Depends on seating" note, like the Chef. |
| Dreamer | Each night, choose a player (not yourself or Travellers): you learn 1 good & 1 evil character, 1 of which is correct. | 60 | 78 | — | Player choice. |
| Snake Charmer | Each night, choose an alive player: a chosen Demon swaps characters & alignments with you & is then poisoned. | 36 | 22 | Poisoned | Can swap with the Demon on night 1. |
| Mathematician | Each night, you learn how many players' abilities worked abnormally (since dawn) due to another character's ability. | 76 | 95 | Abnormal ×5 | Acts last. |
| Flowergirl | Each night\*, you learn if a Demon voted today. | — | 79 | Demon Voted, Demon Not Voted | |
| Town Crier | Each night\*, you learn if a Minion nominated today. | — | 80 | Minions Not Nominated, Minion Nominated | |
| Oracle | Each night\*, you learn how many dead players are evil. | — | 81 | — | |
| Savant | Each day, you may visit the Storyteller to learn 2 things in private: 1 is true & 1 is false. | — | — | — | Day ability. |
| Seamstress | Once per game, at night, choose 2 players (not yourself): you learn if they are the same alignment. | 61 | 82 | No Ability | |
| Philosopher | Once per game, at night, choose a good character: gain that ability. If this character is in play, they are drunk. | 13 | 10 | Drunk; global: Is The Philosopher | Acts very early. Has a **global** reminder ("Is The Philosopher"), a new data field for us. |
| Artist | Once per game, during the day, privately ask the Storyteller any yes/no question. | — | — | No Ability | |
| Juggler | On your 1st day, publicly guess up to 5 players' characters. That night, you learn how many you got correct. | — | 83 | Correct ×5 | |
| Sage | If the Demon kills you, you learn that it is 1 of 2 players. | — | 62 | — | |

### Outsiders (4)
| Character | Ability | N1 | N* | Reminders | Notes |
|---|---|---|---|---|---|
| Mutant | If you are "mad" about being an Outsider, you might be executed. | — | — | — | |
| Sweetheart | When you die, 1 player is drunk from now on. | — | 60 | Drunk | |
| Barber | If you died today or tonight, the Demon may choose 2 players (not another Demon) to swap characters. | — | 59 | Haircuts Tonight | |
| Klutz | When you learn that you died, publicly choose 1 alive player: if they are evil, your team loses. | — | — | — | |

### Minions (4)
| Character | Ability | N1 | N* | Reminders | Notes |
|---|---|---|---|---|---|
| Evil Twin | You & an opposing player know each other. If the good player is executed, evil wins. Good can't win if you both live. | 40 | — | Twin | **Generator picks the Good Twin** (§3.2). |
| Witch | Each night, choose a player: if they nominate tomorrow, they die. If just 3 players live, you lose this ability. | 41 | 26 | Cursed | |
| Cerenovus | Each night, choose a player & a good character: they are "mad" they are this character tomorrow, or might be executed. | 42 | 27 | Mad | |
| Pit-Hag | Each night\*, choose a player & a character they become (if not in play). If a Demon is made, deaths tonight are arbitrary. | — | 28 | — | Needs spare tokens of not-in-play characters (§3.4). |

### Demons (4)
| Character | Ability | N1 | N* | Reminders | Notes |
|---|---|---|---|---|---|
| Fang Gu | Each night\*, choose a player: they die. The 1st Outsider this kills becomes an evil Fang Gu & you die instead. **[+1 Outsider]** | — | 44 | Dead, Once | **Setup modifier.** Keep a spare Fang Gu token for the jump. |
| Vigormortis | Each night\*, choose a player: they die. Minions you kill keep their ability & poison 1 Townsfolk neighbor. **[−1 Outsider]** | — | 48 | Dead, Has Ability ×3, Poisoned ×3 | **Setup modifier**, clamped at 0 (§3.1). |
| No Dashii | Each night\*, choose a player: they die. Your 2 Townsfolk neighbors are poisoned. | — | 45 | Dead, Poisoned ×2 | **Seat-dependent:** the poisoned neighbours are the nearest Townsfolk each way. |
| Vortox | Each night\*, choose a player: they die. Townsfolk abilities yield false info. Each day, if no-one is executed, evil wins. | — | 46 | Dead | All Townsfolk info must be false; worth a prep reminder. |

No S&V Demon acts on night 1.

### Travellers (S&V edition, 16+ players)
Barista, Harlot, Butcher, Bone Collector, Deviant. Display only, as for the other scripts.

---

## 3. Setup rules the generator must model

### 3.1 Demon count modifiers
- **Fang Gu `[+1 Outsider]`:** remove one Townsfolk token and add one Outsider token before the bag.
- **Vigormortis `[−1 Outsider]`:** remove one Outsider token and add one Townsfolk token. Wiki: *"If there are no Outsider tokens to remove, do not add a Townsfolk token."* So at 5, 7, 10 and 13 players (base 0 Outsiders) the Vigormortis changes nothing.
  - This differs from the Godfather, where "−1" isn't an option at 0 Outsiders and the Godfather must go +1. The data needs a way to say "clamp at zero" rather than "not allowed".
- Both are **fixed** shifts (no Storyteller choice). So the Demon choice decides the counts.
- **Consequences for the generator:**
  - Feasibility now depends on the **Demon**, and S&V has **two** modifier characters. The current `S.mod` (one modifier per script, asserted at load) and the "Minion decides the counts" flow in `analyze`/`generate` must generalise.
  - A Demon on Auto can be **forced**, the same idea as the auto-added Baron/Godfather:
    - 2 Outsiders In at 8 players → only a Fang Gu fits.
    - All Outsiders Out at 6 or 8 players → only a Vigormortis fits.
    - 4 Townsfolk In at 6 players → only a Vigormortis fits.
  - Error messages need Demon wording: "The Fang Gu (+1 Outsider) would make room, but you excluded it", "With the Vigormortis, 6 players have 0 Outsider slots".

### 3.2 Evil Twin
- During setup the Storyteller *"choose[s] a Good Twin by marking any good character with the TWIN reminder"*. Avoid Travellers.
- Night 1 (ordinal 40): wake both twins. Show the Good Twin the Evil Twin token and point to the Evil Twin. Show the Evil Twin the Good Twin's character token and point to the Good Twin.
- Works at every player count; it's the Minion's own ability, not Minion info.
- Generator: pick a random good player in play, with a dropdown + Re-pick (same pattern as Grandchild and Red Herring).

### 3.3 Things that need no setup but deserve a prep note
- **Vortox in play:** "Every Townsfolk's info must be false." This is the single most important thing to remember with the Vortox.
- **No Dashii:** "Poisons its nearest Townsfolk neighbour on each side. Depends on seating."
- **Clockmaker:** "Count steps from the Demon to the nearest Minion. Depends on seating."
- **Fang Gu:** "Keep a spare Fang Gu token for when an Outsider is killed."
- **Pit-Hag:** "Keep the not-in-play tokens to hand (including Demons): the Pit-Hag can create any of them."
- **Philosopher:** the global "Is The Philosopher" reminder goes in the reminder list.

### 3.4 Demon bluffs
Unchanged: 3 good characters not in play at 7+ players, default 2 Townsfolk + 1 Outsider. With a Vigormortis, Outsiders are scarcer, so an Outsider bluff is more believable. No rule change needed.

---

## 4. Night order (official, S&V characters only)

**First night:** Dusk → (Barista 9) → Philosopher 13 → Minion info 19 → Demon info 23 → Snake Charmer 36 → Evil Twin 40 → Witch 41 → Cerenovus 42 → Clockmaker 59 → Dreamer 60 → Seamstress 61 → Mathematician 76 → Dawn.

**Other nights:** Dusk → (Barista 5, Harlot 8, Bone Collector 9) → Philosopher 10 → Snake Charmer 22 → Witch 26 → Cerenovus 27 → Pit-Hag 28 → Fang Gu 44 → No Dashii 45 → Vortox 46 → Vigormortis 48 → Barber 59 → Sweetheart 60 → Sage 62 → Dreamer 78 → Flowergirl 79 → Town Crier 80 → Oracle 81 → Seamstress 82 → Juggler 83 → Mathematician 95 → Dawn.

These use the same ordinal scale the app already stores for Trouble Brewing and Bad Moon Rising. Conditional wake-ups to label: Barber (only if they died), Sweetheart (only if they died), Sage (only if the Demon killed them), Juggler (only after their first day), Philosopher/Seamstress (once per game).

---

## 5. Edge cases to test

- **5 players + Vigormortis:** base 3/0/1 → no change → 3 TF / 0 OS.
- **6 players + Vigormortis:** 4 TF / 0 OS. With an Outsider In → error.
- **5 players + Fang Gu:** 2 TF / 1 OS.
- **15 players:** Fang Gu → 8 TF / 3 OS; Vigormortis → 10 TF / 1 OS.
- **8 players, 2 Outsiders In, Demons Auto:** the Fang Gu is forced and flagged "added so your choices fit". With the Fang Gu Out → error suggesting allowing it.
- **6 or 8 players, all Outsiders Out, Demons Auto:** the Vigormortis is forced. With the Vigormortis Out → error.
- **Fang Gu In + all Outsiders Out:** error at every player count.
- **7 players, Vigormortis In, 1 Outsider In:** error. Base is 0 Outsiders and the Vigormortis clamps at 0, so there's no slot. A Fang Gu would fit, but only one Demon can be in play, so the message should say to remove the Vigormortis or the Outsider.
- **Two Demons In / all Demons Out:** errors (existing).
- **Evil Twin:** the twin is always a good player in play, never the Evil Twin.
- **Fairness:** with everything on Auto, each Demon about 25%.

---

## Sources
- [Sects & Violets — BotC Wiki](https://wiki.bloodontheclocktower.com/Sects_%26_Violets)
- [Vigormortis — BotC Wiki](https://wiki.bloodontheclocktower.com/Vigormortis), [Fang Gu — BotC Wiki](https://wiki.bloodontheclocktower.com/Fang_Gu), [Evil Twin — BotC Wiki](https://wiki.bloodontheclocktower.com/Evil_Twin)
- Official data: [`botc-release` roles.json](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/resources/data/roles.json), [`nightsheet.json`](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/resources/data/nightsheet.json), [`jinxes.json`](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/resources/data/jinxes.json)

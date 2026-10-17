# Custom script and Experimental characters
*Research and design notes for the Custom tab. Compiled Oct 17, 2026. Companions: `research.md`, `research-bmr.md`, `research-snv.md`.*

---

## 1. What "Experimental" means

The official site lists **Experimental characters**: characters that "do not yet have a home script". They're meant for Storytellers to try in their own custom scripts, and some may later move into a released edition.

The wiki's Experimental page matches the official app data exactly (`ThePandemoniumInstitute/botc-release`, `resources/data/roles.json`, edition `carousel`). The app takes ability text, reminders and night-sheet notes from that file and night order from `nightsheet.json`.

| Type | Count | Characters |
|---|---|---|
| Townsfolk | 30 | Acrobat, Alchemist, Alsaahir, Amnesiac, Atheist, Balloonist, Banshee, Bounty Hunter, Cannibal, Choirboy, Cult Leader, Engineer, Farmer, Fisherman, General, High Priestess, Huntsman, King, Knight, Lycanthrope, Magician, Nightwatchman, Noble, Pixie, Poppy Grower, Preacher, Princess, Shugenja, Steward, Village Idiot |
| Outsiders | 11 | Damsel, Golem, Hatter, Heretic, Hermit, Ogre, Plague Doctor, Politician, Puzzlemaster, Snitch, Zealot |
| Minions | 15 | Boffin, Boomdandy, Fearmonger, Goblin, Harpy, Marionette, Mezepheles, Organ Grinder, Psychopath, Summoner, Vizier, Widow, Wizard, Wraith, Xaan |
| Demons | 10 | Al-Hadikhia, Kazali, Legion, Leviathan, Lil' Monsta, Lleech, Lord of Typhon, Ojo, Riot, Yaggababble |
| Travellers | 3 | Cacklejack, Gangster, Gnome (not generated: Travellers are chosen by players) |
| Fabled | 2 | Deus ex Fiasco, Ferryman (not generated) |

That's **66** characters the generator can put in play. With the 72 from Trouble Brewing, Bad Moon Rising and Sects & Violets, Custom has **138**.

---

## 2. Setup rules (from each character's wiki page)

Fourteen experimental characters change setup. Their rules, as the generator models them:

| Character | Official rule | Generator |
|---|---|---|
| Atheist | *[No evil characters]*: remove all evil tokens, add good ones | All Minion and Demon slots become Townsfolk. No bluffs, no Minion/Demon info. |
| Summoner | *[No Demon]*: "remove the Demon and add a Townsfolk"; gets 3 bluffs; makes a Demon on night 3 | +1 Townsfolk, no Demon. The Summoner gets 3 bluffs at any player count. |
| Lil' Monsta | *[+1 Minion]*: "remove Lil' Monsta and add a Minion"; skip Minion and Demon info; no bluffs | +1 Minion; Lil' Monsta token kept out of the bag (no player); no bluffs or evil info. |
| Kazali | *[You choose which players are which Minions. −? to +? Outsiders]*: no Minion tokens; the Kazali picks Minions on night 1 | Minion slots become Townsfolk. Note: the Kazali picks *N* Minions on night 1; Outsider changes left to the Storyteller. |
| Lord of Typhon | *[Evil characters are in a line. You are in the middle. +1 Minion. −? to +? Outsiders]* | +1 Minion, −1 Townsfolk; seating note; Outsider changes left to the Storyteller. |
| Legion | *[Most players are Legion]*: "roughly seven Legion and three good" at 10 players | Legion count = the normal good count; good players = the normal evil count. Legion tokens repeat in the bag; no Minions. |
| Xaan | *[X Outsiders]*: any number, "usually 1 to 4"; overrides other Outsider changes | X Outsiders, X random among 1–4 that fit (anything else only if nothing usual fits). Other modifiers don't apply. |
| Marionette | Thinks they're good: "remove the Marionette token and add any Townsfolk token"; sits next to the Demon | Like the Drunk: a spare non-excluded Townsfolk token goes in the bag, with a dropdown. Seating note. |
| Balloonist | *[+0 or +1 Outsider]* | Shift picked at random among the ones that fit. |
| Hermit | *[−0 or −1 Outsider]* | Same. |
| Huntsman | *[+the Damsel]*: "remove a Townsfolk and add the Damsel" | The Damsel is in play: +1 Outsider, or +0 when the Damsel already holds an Outsider slot. |
| Choirboy | *[+the King]*: "remove a Townsfolk and add the King" | The King is in play (no count change). |
| Bounty Hunter | *[1 Townsfolk is evil]*: turn one Townsfolk token upside down; mark a KNOW player | Picks the evil Townsfolk and the evil player the Bounty Hunter learns (Re-pick). |
| Village Idiot | *[+0 to +2 Village Idiots; 1 extra drunk]*: extras replace Townsfolk | Generated with +0 (always legal); a note says you may add up to 2 more. |

### Design decisions
- **These 14 are "pin to use".** They're never picked on Auto, so random Custom setups are always ordinary games. Pinning one In applies its rule.
- **At most one setup-reshaping character** (Atheist, Summoner, Lil' Monsta, Kazali, Legion, Lord of Typhon, Xaan) per game. Nothing defines how two of them combine.
- **Conflicts are errors with a fix:**
  - Atheist + any evil pin
  - Summoner + a Demon
  - Kazali/Legion + a Minion
  - Marionette or Lunatic with no Demon player
  - Choirboy/Huntsman with the King/Damsel ruled Out
  - Atheist + Bounty Hunter
- **Several Outsider modifiers can stack in Custom** (e.g. Baron + Godfather, Baron + Vigormortis). Minion and Townsfolk/Outsider shifts apply first, then the Demon's. The Vigormortis only removes an Outsider that's there, so Baron + Vigormortis at 5 players = 0 + 2 − 1 = 1 Outsider.
- **Pin-only characters are never Demon bluffs** (or Lunatic bluffs). Claiming one would imply a different setup.

---

## 3. Jinxes

The official `jinxes.json` has **131** jinxes among these 138 characters. Only 7 involve two base-script characters (e.g. Mathematician & Lunatic), and none fall within a single base script. The result panel and Copy-as-text list the jinxes for the characters in play, including the Drunk's and Marionette's Townsfolk.

---

## 4. Testing

- A brute-force oracle for Custom: every Demon × every Minion set × Baron/Godfather shifts, then the Demon's clamped shift, then counts. It checks `analyze` on configs without pinned setup characters, with and without Experimental.
- Property runs: Custom 5–20 players × 300 configs; Custom + Experimental × 100 configs with setup characters pinned at random. Every generated setup goes through `checkCustom`.
- Targeted tests for each setup character, each conflict error, stacking modifiers, the Marionette dropdown, the Bounty Hunter pick, jinxes, and Demon fairness.

## Sources
- [Experimental — BotC Wiki](https://wiki.bloodontheclocktower.com/Experimental)
- Character pages: [Atheist](https://wiki.bloodontheclocktower.com/Atheist), [Summoner](https://wiki.bloodontheclocktower.com/Summoner), [Lil' Monsta](https://wiki.bloodontheclocktower.com/Lil%27_Monsta), [Kazali](https://wiki.bloodontheclocktower.com/Kazali), [Lord of Typhon](https://wiki.bloodontheclocktower.com/Lord_of_Typhon), [Legion](https://wiki.bloodontheclocktower.com/Legion), [Xaan](https://wiki.bloodontheclocktower.com/Xaan), [Marionette](https://wiki.bloodontheclocktower.com/Marionette), [Huntsman](https://wiki.bloodontheclocktower.com/Huntsman), [Choirboy](https://wiki.bloodontheclocktower.com/Choirboy), [Village Idiot](https://wiki.bloodontheclocktower.com/Village_Idiot), [Bounty Hunter](https://wiki.bloodontheclocktower.com/Bounty_Hunter)
- Official data: [`botc-release` roles.json](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/resources/data/roles.json), [`nightsheet.json`](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/resources/data/nightsheet.json), [`jinxes.json`](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/resources/data/jinxes.json)

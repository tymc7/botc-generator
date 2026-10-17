# Clocktower Setup Generator

A Storyteller tool for *Blood on the Clocktower*. Pick a script (**Trouble Brewing** or **Bad Moon Rising**) and a player count, pin characters in or rule them out, and generate a legal setup.

**Live site:** https://tymc7.github.io/botc-generator/

## What it does

- **Player count:** 5–15 players, plus up to 5 Travellers (16–20), following the official setup table.
- **Choose characters:** mark each one **In** (always appears), **Auto** (may appear) or **Out** (never appears). If your choices can't fit, Generate is disabled and a message explains the fix.
- **Scripts:** switch between Trouble Brewing and Bad Moon Rising at the top. Your choices are kept separately for each script.
- **Setup rules:** the Baron (+2 Outsiders), the Drunk (a decoy Townsfolk goes in the bag), the Godfather (−1 or +1 Outsider, picked at random among the options that fit) and the Lunatic (thinks they're the Demon) are handled automatically. The Baron or Godfather is added for you when it's the only way your choices fit. In Bad Moon Rising the Demon is one of four, and Demons can be pinned In or ruled Out too.
- **Each setup lists:** characters in play, the exact tokens for the bag, Demon bluffs, first-night prep (Red Herring, Washerwoman/Librarian/Investigator info; the Grandchild, the Godfather's Outsiders, the Lunatic's fake Minions and bluffs), reminder tokens, and the night order (official night-sheet order).
- **Storyteller overrides:** after generating, choose which Townsfolk the Drunk thinks they are (from the spare, non-excluded Townsfolk), which good player is the Fortune Teller's Red Herring, which Demon the Lunatic thinks they are (non-excluded Demons; the default is the real Demon) and who the Grandmother's Grandchild is. The bag, bluffs, first-night info and night order update to match.
- **Re-roll** keeps your choices. **Copy as text** gives you the setup for your notes.

Everything runs in the browser in a single `index.html`, with no build step and no server. Your choices are remembered in your browser.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```sh
npm start        # python3 -m http.server 8000, then visit http://localhost:8000
```

## Tests

The generator logic in `index.html` (between `/*CORE-START*/` and `/*CORE-END*/`) is pure JavaScript and is tested headlessly in Node:

```sh
npm test
```

The suite runs about 170,000 random setups per script across every player count and checks each one against the rules. It also compares the generator against a brute-force search of which choices are possible, checks targeted edge cases, and checks that characters left on Auto come up equally often. `tests/golden.js` checks that Trouble Brewing output for fixed seeds hasn't changed (`node tests/golden.js --write` re-records it after a deliberate change).

## Deployment

Pushing to `main` runs the tests and, if they pass, deploys `index.html` to GitHub Pages via `.github/workflows/pages.yml`.

One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.

## Project layout

```
index.html                    the app (data, generator, validator and UI)
tests/test-generator.js       headless generator tests
tests/golden.js               Trouble Brewing golden-output check
docs/research.md              Trouble Brewing rules research
docs/implementation-plan.md   design and decisions
docs/research-bmr.md          Bad Moon Rising rules research
docs/implementation-plan-bmr.md  plan for adding Bad Moon Rising
.github/workflows/pages.yml   test + deploy to GitHub Pages
```

## Credits

Unofficial fan tool. *Blood on the Clocktower*, its characters and ability text are © Steven Medway and The Pandemonium Institute.

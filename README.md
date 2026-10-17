# Trouble Brewing Generator

A Storyteller tool for *Blood on the Clocktower*. Pick a player count, pin characters in or rule them out, and generate a legal **Trouble Brewing** setup.

**Live site:** https://tymc7.github.io/botc-generator/

## What it does

- **Player count:** 5–15 players, plus up to 5 Travellers (16–20), following the official setup table.
- **Choose characters:** mark each one **In** (always appears), **Auto** (may appear) or **Out** (never appears). If your choices can't fit, Generate is disabled and a message explains the fix.
- **Setup rules:** the Baron (+2 Outsiders) and the Drunk (a decoy Townsfolk goes in the bag) are handled automatically. The Baron is added for you when it's the only way your choices fit.
- **Each setup lists:** characters in play, the exact tokens for the bag, Demon bluffs, first-night prep (Red Herring, Washerwoman/Librarian/Investigator info), reminder tokens, and the night order.
- **Storyteller overrides:** after generating, choose which Townsfolk the Drunk thinks they are (from the spare, non-excluded Townsfolk) and which good player is the Fortune Teller's Red Herring. The bag, bluffs, first-night info and night order update to match.
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

The suite runs about 170,000 random setups across every player count and checks each one against the rules. It also compares the generator against a brute-force search of which choices are possible, checks targeted edge cases, and checks that characters left on Auto come up equally often.

## Deployment

Pushing to `main` runs the tests and, if they pass, deploys `index.html` to GitHub Pages via `.github/workflows/pages.yml`.

One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.

## Project layout

```
index.html                    the app (data, generator, validator and UI)
tests/test-generator.js       headless generator tests
docs/research.md              Trouble Brewing rules research
docs/implementation-plan.md   design and decisions
docs/research-bmr.md          Bad Moon Rising rules research
docs/implementation-plan-bmr.md  plan for adding Bad Moon Rising
.github/workflows/pages.yml   test + deploy to GitHub Pages
```

## Credits

Unofficial fan tool. *Blood on the Clocktower*, its characters and ability text are © Steven Medway and The Pandemonium Institute.

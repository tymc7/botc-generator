// Headless tests for the generator core in index.html
// Usage: node tests/test-generator.js [path/to/index.html]
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2] || require("path").join(__dirname, "..", "index.html"), "utf8");
const core = html.slice(html.indexOf("/*CORE-START*/"), html.indexOf("/*CORE-END*/"));
const ctx = { crypto: require("crypto").webcrypto, console };
vm.createContext(ctx); vm.runInContext(core, ctx);
const B = ctx.BOTC;

let fails = 0;
const fail = (m, extra) => { fails++; if (fails <= 15) console.log("FAIL:", m, extra ? JSON.stringify(extra) : ""); };
const ids = (t, script = "tb") => B.rolesOf(script).filter(r => r.team === t).map(r => r.id);
const combos = (arr, k) => k === 0 ? [[]] : arr.length < k ? [] : [...combos(arr.slice(1), k - 1).map(c => [arr[0], ...c]), ...combos(arr.slice(1), k)];

// Exact feasibility oracle by enumeration: Demon × Minion sets × Outsider shifts × Outsider sets
function oracle(cfg) {
  const script = cfg.script || "tb";
  const real = Math.min(cfg.players, 15), [TF, OS, MN] = B.DIST[real];
  const p = id => B.prefOf(cfg, id);
  const okSet = (set, team) => ids(team, script).every(id => p(id) !== "include" || set.includes(id)) && set.every(id => p(id) !== "exclude");
  const nonExTF = ids("townsfolk", script).filter(id => p(id) !== "exclude").length;
  const incTF = ids("townsfolk", script).filter(id => p(id) === "include").length;
  for (const [dm] of combos(ids("demon", script), 1)) {
    if (!okSet([dm], "demon")) continue;
    // a Demon's own Outsider change (Fang Gu +1; Vigormortis −1, but never below 0 Outsiders)
    const D = B.BY_ID[dm], dd = D.modifier ? (D.clamp ? Math.max(D.modifier[0], -OS) : D.modifier[0]) : 0;
    for (const mn of combos(ids("minion", script), MN)) {
      if (!okSet(mn, "minion")) continue;
      const mod = mn.find(id => B.BY_ID[id].modifier);
      for (const d of mod ? B.BY_ID[mod].modifier : [0]) {
        const tf = TF - d - dd, os = OS + d + dd;
        if (tf < 0 || OS + dd + d < 0 || incTF > tf || nonExTF < tf) continue;
        for (const o of combos(ids("outsider", script), os)) {
          if (!okSet(o, "outsider")) continue;
          if (o.includes("drunk") && nonExTF < tf + 1) continue;
          return true;
        }
      }
    }
  }
  return false;
}

const rng = B.seededRng(12345);
function randomPref(density, script = "tb") {
  const pref = {};
  for (const r of B.rolesOf(script)) { const x = rng(100); if (x < density) pref[r.id] = "include"; else if (x < density * 2) pref[r.id] = "exclude"; }
  return pref;
}

// 1. Property run: every player count, many random configs
for (const script of ["tb", "bmr", "snv"]) {
let gens = 0, feasibleCount = 0;
for (let n = 5; n <= 20; n++) {
  for (let i = 0; i < 3000; i++) {
    const density = [0, 5, 10, 20, 35][i % 5];
    const cfg = { script, players: n, pref: randomPref(density, script) };
    const a = B.analyze(cfg), o = oracle(cfg);
    if (a.ok !== o) fail("analyze vs oracle", { cfg, a: a.ok, o, errors: a.errors });
    if (!a.ok && !a.errors.length) fail("no message", cfg);
    if (a.ok) {
      feasibleCount++;
      for (let k = 0; k < 3; k++) {
        const r = B.generate(cfg, rng); gens++;
        if (!r.ok) { fail("generate failed", { cfg, errors: r.errors }); break; }
        const extra = B.checkSetup(r.setup, cfg);
        if (extra.length) fail("checkSetup", extra);
        const t = B.toText(r.setup); if (!t.includes("PUT IN THE BAG")) fail("text");
      }
    }
  }
}
console.log(`property run (${script}): ${gens} generations, ${feasibleCount} feasible configs`);
}

// 2. Targeted cases
const g = cfg => B.generate(cfg, rng);
function expect(name, cond) { if (!cond) fail(name); else console.log("ok  ", name); }
{ let all = true; for (let i = 0; i < 200; i++) { const r = g({ players: 15, pref: { baron: "include" } }); all = all && r.ok && r.setup.inPlay.includes("drunk") && r.setup.outsiders.length === 4 && r.setup.townsfolk.length === 7; } expect("15 + Baron forces Drunk, 7 TF / 4 OS", all); }
{ const r = g({ players: 5, pref: { baron: "include" } }); expect("5 + Baron: 1 TF / 2 OS, no bluffs", r.ok && r.setup.townsfolk.length === 1 && r.setup.outsiders.length === 2 && r.setup.bluffs.length === 0); }
{ let all = true; for (let i = 0; i < 100; i++) { const r = g({ players: 8, pref: { saint: "include", recluse: "include", butler: "include" } }); all = all && r.ok && r.setup.modifier && r.setup.modifier.id === "baron" && r.setup.autoModifier; } expect("3 Outsiders at 8 auto-adds Baron", all); }
{ const a = B.analyze({ players: 8, pref: { saint: "include", recluse: "include", butler: "include", baron: "exclude" } }); expect("Baron excluded + 3 Outsiders at 8 errors", !a.ok && /Allow the Baron/.test(a.errors[0])); console.log("     →", a.errors[0]); }
{ const a = B.analyze({ players: 7, pref: { saint: "include", recluse: "include", butler: "include" } }); expect("3 Outsiders at 7 → Baron fits (0+2 < 3)? should error", !a.ok); console.log("     →", a.errors.join(" | ")); }
{ const a = B.analyze({ players: 8, pref: { poisoner: "include", spy: "include" } }); expect("2 Minions at 8 errors with fix", !a.ok && /10 or more/.test(a.errors[0])); console.log("     →", a.errors[0]); }
{ const a = B.analyze({ players: 8, pref: { poisoner: "include", saint: "include", recluse: "include" } }); expect("Outsiders need Baron but Minion slot taken", !a.ok && /already fill every Minion slot/.test(a.errors[0])); console.log("     →", a.errors[0]); }
{ const pref = { drunk: "include" }; ids("townsfolk").slice(0, 8).forEach(id => pref[id] = "exclude"); const r = g({ players: 8, pref }); expect("Drunk with no spare decoy auto-adds Baron to make room", r.ok && r.setup.modifier && r.setup.decoy); }
{ const pref = { drunk: "include", baron: "exclude" }; ids("townsfolk").slice(0, 8).forEach(id => pref[id] = "exclude"); const a = B.analyze({ players: 8, pref }); expect("Drunk with no spare decoy errors", !a.ok && /Drunk needs/.test(a.errors.join(" "))); console.log("     →", a.errors.join(" | ")); }
{ const r = g({ players: 18, pref: {} }); expect("18 players → 15 + 3 Travellers", r.ok && r.setup.real === 15 && r.setup.travellers === 3 && r.setup.inPlay.length === 15); }
{ let all = true; for (let i = 0; i < 300; i++) { const r = g({ players: 10, pref: { baron: "include" } }); all = all && r.ok && r.setup.inPlay.includes("baron"); } expect("Baron included always present", all); }
{ let all = true; for (let i = 0; i < 300; i++) { const r = g({ players: 7, pref: { librarian: "include" } }); const l = r.setup.info.find(x => x.key === "librarian"); all = all && (r.setup.outsiders.length ? !l.zero : l.zero); } expect("Librarian shows 0 iff no Outsiders", all); }
{ let all = true; for (let i = 0; i < 300; i++) { const r = g({ players: 9, pref: { drunk: "include", fortuneteller: "include" } }); const s = r.setup; all = all && s.decoy && s.bag.includes(s.decoy) && !s.bag.includes("drunk") && !s.bluffs.includes(s.decoy) && (!(B.BY_ID[s.decoy].first || B.BY_ID[s.decoy].other) || s.firstNight.concat(s.otherNights).some(x => x.drunk)) && !s.firstNight.concat(s.otherNights).some(x => x.id === "drunk"); } expect("Drunk decoy in bag, not a bluff, wakes in night order", all); }
{ let rhFT = 0, rhOther = 0; for (let i = 0; i < 2000; i++) { const r = g({ players: 8, pref: { fortuneteller: "include" } }); const rh = r.setup.info.find(x => x.key === "fortuneteller").redHerring; if (rh === "fortuneteller") rhFT++; else rhOther++; } expect("Red Herring can be the Fortune Teller", rhFT > 0 && rhOther > 0); }
{ const r = g({ players: 8, pref: { fortuneteller: "include" } }); const s2 = B.repick(r.setup, "fortuneteller", rng); expect("Re-pick keeps characters", JSON.stringify(s2.inPlay) === JSON.stringify(r.setup.inPlay) && B.checkSetup(s2, { players: 8, pref: { fortuneteller: "include" } }).length === 0); }
{
  // Storyteller sets the Drunk's character: every option in the pool gives a valid setup
  let all = true, tried = 0, swappedBluff = false, newInfo = false;
  for (let n = 5; n <= 15 && all; n++) for (let i = 0; i < 60 && all; i++) {
    const cfg = { players: n, pref: Object.assign(randomPref(10), { drunk: "include" }) };
    if (!B.analyze(cfg).ok) continue;
    const r = g(cfg); if (!r.ok) continue;
    for (const id of r.setup.decoyPool) {
      const s = B.setDecoy(r.setup, id, rng); tried++;
      if (r.setup.bluffs.includes(id)) swappedBluff = true;
      if (s.info.length !== r.setup.info.length) newInfo = true;
      all = all && s.decoy === id && B.checkSetup(s, cfg).length === 0 && JSON.stringify(s.inPlay) === JSON.stringify(r.setup.inPlay)
        && s.info.filter(x => x.drunk).every(x => x.key === id) && s.firstNight.concat(s.otherNights).filter(x => x.drunk).every(x => x.id === id);
      if (!all) fail("setDecoy", { cfg, id, problems: B.checkSetup(s, cfg) });
    }
  }
  expect(`Set the Drunk's character (${tried} swaps, bluff swapped: ${swappedBluff}, info changed: ${newInfo})`, all && tried > 0 && swappedBluff && newInfo);
  const r = g({ players: 8, pref: { drunk: "include", chef: "exclude" } });
  expect("setDecoy ignores in-play or excluded Townsfolk", B.setDecoy(r.setup, r.setup.townsfolk[0], rng) === r.setup && B.setDecoy(r.setup, "chef", rng) === r.setup);
  const plain = g({ players: 8, pref: { drunk: "exclude" } });
  expect("setDecoy does nothing without a Drunk", B.setDecoy(plain.setup, "chef", rng) === plain.setup);
}
{
  // Storyteller sets the Red Herring: any good player in play, never evil
  const cfg = { players: 12, pref: { fortuneteller: "include" } };
  const r = g(cfg);
  const good = r.setup.inPlay.filter(id => B.GOOD(B.BY_ID[id].team));
  const all = good.every(id => { const s = B.setRedHerring(r.setup, id); return s.info.find(x => x.key === "fortuneteller").redHerring === id && B.checkSetup(s, cfg).length === 0; });
  expect("Set the Red Herring to any good player", all);
  expect("Red Herring can't be evil", r.setup.minions.concat("imp").every(id => B.setRedHerring(r.setup, id) === r.setup));
  const noFT = g({ players: 8, pref: { fortuneteller: "exclude" } });
  expect("setRedHerring does nothing without a Fortune Teller", B.setRedHerring(noFT.setup, noFT.setup.townsfolk[0]) === noFT.setup);
}

// 2b. Bad Moon Rising
{
  const bmr = (players, pref) => g({ script: "bmr", players, pref: pref || {} });
  const gf = { godfather: "include" };
  for (const n of [5, 7, 10, 13]) { let all = true; for (let i = 0; i < 50; i++) { const r = bmr(n, gf); all = all && r.ok && r.setup.modifier.shift === 1; } expect(`Godfather at ${n} (no base Outsiders) is always +1`, all); }
  { const pref = { godfather: "include" }; ids("outsider", "bmr").forEach(id => pref[id] = "exclude"); let all = true; for (let i = 0; i < 50; i++) { const r = bmr(8, pref); all = all && r.ok && r.setup.modifier.shift === -1 && r.setup.outsiders.length === 0 && r.setup.townsfolk.length === 6; } expect("Godfather with every Outsider Out is −1 (6 TF / 0 OS)", all); }
  { const r = bmr(8, { godfather: "include", goon: "include", tinker: "include" }); expect("Godfather + 2 Outsiders at 8 is +1", r.ok && r.setup.modifier.shift === 1 && r.setup.outsiders.length === 2); }
  { let all = true; for (let i = 0; i < 50; i++) { const r = bmr(8, { goon: "include", tinker: "include" }); all = all && r.ok && r.setup.modifier && r.setup.autoModifier && r.setup.modifier.shift === 1; } expect("2 Outsiders at 8 auto-adds the Godfather", all); }
  { const a = B.analyze({ script: "bmr", players: 8, pref: { goon: "include", tinker: "include", godfather: "exclude" } }); expect("Godfather Out + 2 Outsiders at 8 suggests the Godfather", !a.ok && /Allow the Godfather \(−1 or \+1 Outsider\)/.test(a.errors[0])); console.log("     →", a.errors[0]); }
  { const pref = { godfather: "exclude" }; ids("townsfolk", "bmr").slice(0, 6).forEach(id => pref[id] = "include"); const a = B.analyze({ script: "bmr", players: 8, pref }); expect("Godfather Out + 6 Townsfolk at 8 suggests the Godfather", !a.ok && /Allow the Godfather/.test(a.errors[0])); console.log("     →", a.errors[0]); }
  { const a = B.analyze({ script: "bmr", players: 9, pref: { goon: "include", tinker: "include", lunatic: "include", moonchild: "include" } }); expect("4 Outsiders at 9 errors (max 3 with the Godfather)", !a.ok && /even with the Godfather/.test(a.errors[0])); console.log("     →", a.errors[0]); }
  { const a = B.analyze({ script: "bmr", players: 8, pref: { po: "include", pukka: "include" } }); expect("Two Demons In errors", !a.ok && /2 Demons/.test(a.errors[0])); console.log("     →", a.errors[0]); }
  { const pref = {}; ids("demon", "bmr").forEach(id => pref[id] = "exclude"); const a = B.analyze({ script: "bmr", players: 8, pref }); expect("Every Demon Out errors", !a.ok && /Every Demon/.test(a.errors[0])); }
  { let all = true; for (let i = 0; i < 100; i++) { const r = bmr(9, { shabaloth: "include" }); all = all && r.ok && r.setup.demon === "shabaloth" && !r.setup.inPlay.includes("imp"); } expect("Demon In is always the Demon", all); }
  { let all = true; for (let i = 0; i < 100; i++) { const s = bmr(10, { lunatic: "include" }).setup; all = all && s.lunaticAs === s.demon && s.bag.includes("lunatic") && s.bag.includes(s.demon) && s.info.find(x => x.key === "lunatic").bluffs.length === 3; } expect("Lunatic defaults to the real Demon: Lunatic + Demon tokens in the bag, 3 bluffs", all); }
  {
    const cfg = { script: "bmr", players: 10, pref: { lunatic: "include", po: "exclude" } };
    let all = true, tried = 0;
    for (let i = 0; i < 50; i++) {
      const r = g(cfg);
      for (const id of ids("demon", "bmr")) {
        const s = B.setLunaticDemon(r.setup, id); tried++;
        const changed = id !== r.setup.demon && id !== "po";
        all = all && (id === "po" ? s === r.setup : true) && B.checkSetup(s, cfg).length === 0
          && (changed ? s.lunaticAs === id && !s.bag.includes("lunatic") && s.bag.includes(id) && s.bag.includes(s.demon) && s.firstNight.some(x => x.label === `Lunatic (as ${B.BY_ID[id].name})`) : true);
      }
    }
    expect(`Set the Lunatic's Demon (${tried} tries; excluded Demons refused)`, all);
  }
  { let all = true; for (let i = 0; i < 50; i++) { const s = bmr(6, { lunatic: "include" }).setup; const l = s.info.find(x => x.key === "lunatic"); all = all && l.bluffs.length === 0 && s.bluffs.length === 0 && s.firstNight.some(x => x.id === "lunatic"); } expect("Lunatic at 6: no fake Minions or bluffs, still wakes", all); }
  {
    const cfg = { script: "bmr", players: 12, pref: { grandmother: "include" } };
    let all = true;
    for (let i = 0; i < 200; i++) { const s = g(cfg).setup; const gc = s.info.find(x => x.key === "grandmother").grandchild; all = all && gc !== "grandmother" && B.GOOD(B.BY_ID[gc].team) && s.inPlay.includes(gc); }
    expect("Grandchild is always another good player in play", all);
    const s = g(cfg).setup, good = s.inPlay.filter(id => B.GOOD(B.BY_ID[id].team) && id !== "grandmother");
    expect("Set the Grandchild to any other good player", good.every(id => { const t = B.setGrandchild(s, id); return t.info.find(x => x.key === "grandmother").grandchild === id && B.checkSetup(t, cfg).length === 0; }));
    expect("Grandchild can't be evil or the Grandmother", s.minions.concat(s.demon, "grandmother").every(id => B.setGrandchild(s, id) === s));
  }
  { const s = bmr(11, { godfather: "include" }).setup; const gi = s.info.find(x => x.key === "godfather"); expect("Godfather learns exactly the Outsiders in play", gi.outsiders.join() === s.outsiders.join() && B.toText(s).includes("Godfather")); }
  { const s = bmr(9, { tealady: "include" }).setup; expect("Tea Lady gets a seating note", B.seatNotes(s).some(n => n.who === "Tea Lady")); }
  { const s = bmr(9).setup; expect("BMR bluffs and text use BMR characters", s.bluffs.every(b => B.SCRIPTS.bmr.roles.includes(b)) && B.toText(s).startsWith("Bad Moon Rising")); }
}

// 2c. Sects & Violets
{
  const snv = (players, pref) => g({ script: "snv", players, pref: pref || {} });
  const allOut = (pref, team) => { ids(team, "snv").forEach(id => pref[id] = "exclude"); return pref; };
  for (const n of [5, 7, 10, 13]) { const s = snv(n, { vigormortis: "include" }).setup; expect(`Vigormortis at ${n} (no Outsiders to remove) changes nothing`, s.modifier.shift === 0 && s.outsiders.length === 0 && s.townsfolk.length === B.DIST[n][0] && /no Outsiders to remove/.test(B.toText(s))); }
  { const s = snv(6, { vigormortis: "include" }).setup; expect("Vigormortis at 6: 4 TF / 0 OS", s.modifier.shift === -1 && s.townsfolk.length === 4 && s.outsiders.length === 0); }
  { const s = snv(15, { vigormortis: "include" }).setup; expect("Vigormortis at 15: 10 TF / 1 OS", s.townsfolk.length === 10 && s.outsiders.length === 1); }
  { const s = snv(5, { fanggu: "include" }).setup; expect("Fang Gu at 5: 2 TF / 1 OS", s.modifier.id === "fanggu" && s.townsfolk.length === 2 && s.outsiders.length === 1); }
  { const s = snv(15, { fanggu: "include" }).setup; expect("Fang Gu at 15: 8 TF / 3 OS", s.townsfolk.length === 8 && s.outsiders.length === 3); }
  { let all = true; for (let i = 0; i < 50; i++) { const r = snv(8, { mutant: "include", klutz: "include" }); all = all && r.ok && r.setup.demon === "fanggu" && r.setup.autoDemon && r.setup.autoModifier; } expect("2 Outsiders at 8 forces the Fang Gu", all); }
  { const a = B.analyze({ script: "snv", players: 8, pref: { mutant: "include", klutz: "include", fanggu: "exclude" } }); expect("…and with the Fang Gu Out it says to allow it", !a.ok && /only fit with the Fang Gu \(\+1 Outsider\), which you excluded/.test(a.errors[0])); console.log("     →", a.errors[0]); }
  for (const n of [6, 8]) { let all = true; for (let i = 0; i < 50; i++) { const r = snv(n, allOut({}, "outsider")); all = all && r.ok && r.setup.demon === "vigormortis" && r.setup.outsiders.length === 0; } expect(`All Outsiders Out at ${n} forces the Vigormortis`, all); }
  { const a = B.analyze({ script: "snv", players: 8, pref: allOut({ vigormortis: "exclude" }, "outsider") }); expect("…and with the Vigormortis Out it says to allow it", !a.ok && /Vigormortis \(−1 Outsider\), which you excluded/.test(a.errors[0])); console.log("     →", a.errors[0]); }
  { const pref = {}; ids("townsfolk", "snv").slice(0, 4).forEach(id => pref[id] = "include"); const r = snv(6, pref); expect("4 Townsfolk In at 6 forces the Vigormortis", r.ok && r.setup.demon === "vigormortis"); }
  { const a = B.analyze({ script: "snv", players: 7, pref: { vigormortis: "include", mutant: "include" } }); expect("Vigormortis In + 1 Outsider at 7 errors, pointing to the Fang Gu", !a.ok && /With the Vigormortis.*Fang Gu/.test(a.errors[0])); console.log("     →", a.errors[0]); }
  { const a = B.analyze({ script: "snv", players: 7, pref: { vortox: "include", mutant: "include", klutz: "include" } }); expect("Nothing fits with any Demon: plain Outsider message", !a.ok && /2 Outsiders, but 7 players have 0 Outsider slots/.test(a.errors[0])); console.log("     →", a.errors[0]); }
  { const a = B.analyze({ script: "snv", players: 9, pref: allOut({ fanggu: "include" }, "outsider") }); expect("Fang Gu In + all Outsiders Out names the Fang Gu", !a.ok && /with the Fang Gu \(\+1 Outsider\) this setup needs 3/.test(a.errors[0])); console.log("     →", a.errors[0]); }
  { let ok = true; for (let n = 5; n <= 15; n++) { const a = B.analyze({ script: "snv", players: n, pref: allOut({ fanggu: "include" }, "outsider") }); ok = ok && !a.ok; } expect("Fang Gu In + all Outsiders Out errors at every count", ok); }
  {
    const cfg = { script: "snv", players: 11, pref: { eviltwin: "include" } };
    let all = true;
    for (let i = 0; i < 200; i++) { const s = g(cfg).setup; const t = s.info.find(x => x.key === "eviltwin").twin; all = all && B.GOOD(B.BY_ID[t].team) && s.inPlay.includes(t); }
    expect("Good Twin is always a good player in play", all);
    const s = g(cfg).setup, good = s.inPlay.filter(id => B.GOOD(B.BY_ID[id].team));
    expect("Set the Good Twin to any good player", good.every(id => { const t = B.setTwin(s, id); return t.info.find(x => x.key === "eviltwin").twin === id && B.checkSetup(t, cfg).length === 0; }));
    expect("Good Twin can't be evil", s.minions.concat(s.demon).every(id => B.setTwin(s, id) === s));
    const r6 = snv(6, { eviltwin: "include" }).setup; expect("Evil Twin picks a twin at 6 players too", !!r6.info.find(x => x.key === "eviltwin").twin);
  }
  {
    const has = (s, who) => B.prepNotes(s).some(n => n.who === who);
    const v = snv(9, { vortox: "include", pithag: "include" }).setup, f = snv(9, { fanggu: "include", pithag: "exclude" }).setup;
    expect("Vortox / Pit-Hag / Fang Gu notes only when in play", has(v, "Vortox") && has(v, "Pit-Hag") && !has(v, "Fang Gu") && has(f, "Fang Gu") && !has(f, "Vortox") && !has(f, "Pit-Hag"));
    const c = snv(9, { clockmaker: "include", nodashii: "include" }).setup;
    expect("Clockmaker and No Dashii get seating notes", ["Clockmaker", "No Dashii"].every(w => B.seatNotes(c).some(n => n.who === w)));
    const ph = snv(9, { philosopher: "include" }).setup;
    expect("Philosopher lists the global Is The Philosopher reminder", ph.reminders.find(r => r.id === "philosopher").tokens.includes("Is The Philosopher"));
  }
}

// 2d. Custom (every character) and Experimental
// Oracle for Custom without pinned setup-changing characters: Demon × Minion sets × Outsider shifts, then counts.
// Setup-changing experimental characters count as Out unless pinned; a Demon's shift applies after the Minions'.
function oracleCustom(cfg) {
  const script = cfg.experimental ? "customx" : "custom";
  const real = Math.min(cfg.players, 15), [TF, OS, MN] = B.DIST[real];
  const p = id => { const v = B.prefOf(cfg, id); return B.BY_ID[id].pinOnly && v !== "include" ? "exclude" : v; };
  const lists = {};
  for (const t of ["townsfolk", "outsider", "minion", "demon"]) { const all = ids(t, script); lists[t] = { all, inc: all.filter(id => p(id) === "include"), non: all.filter(id => p(id) !== "exclude") }; }
  const team = t => lists[t].all, inc = t => lists[t].inc, non = t => lists[t].non;
  if (inc("demon").length > 1) return false;
  const okSet = (set, t) => inc(t).every(id => set.includes(id)) && set.every(id => p(id) !== "exclude");
  const minionSets = combos(team("minion"), MN).filter(mn => okSet(mn, "minion"));
  for (const dm of non("demon")) {
    if (inc("demon").length && !inc("demon").includes(dm)) continue;
    for (const mn of minionSets) {
      const mods = mn.filter(id => B.BY_ID[id].modifier);
      const shiftSets = mods.reduce((acc, id) => acc.flatMap(a => B.BY_ID[id].modifier.map(d => a + d)), [0]);
      for (const ms of shiftSets) {
        const others = OS + ms, D = B.BY_ID[dm];
        const os = others + (D.modifier ? (D.clamp ? Math.max(D.modifier[0], -others) : D.modifier[0]) : 0), tf = TF + OS - os;
        if (os < 0 || tf < 0) continue;
        if (inc("townsfolk").length > tf || non("townsfolk").length < tf) continue;
        const drunkOk = non("townsfolk").length >= tf + 1;
        const usable = non("outsider").filter(id => id !== "drunk" || drunkOk);
        if (inc("outsider").includes("drunk") && !drunkOk) continue;
        if (inc("outsider").length > os || usable.length < os) continue;
        return true;
      }
    }
  }
  return false;
}
for (const exp of [false, true]) {
  let gens = 0, feasibleCount = 0, oracled = 0;
  for (let n = 5; n <= 20; n++) {
    for (let i = 0; i < (exp ? 100 : 300); i++) {
      const density = [0, 3, 6, 12][i % 4];
      const pref = randomPref(density, exp ? "customx" : "custom");
      // setup-changing characters: pinned now and then (Out/Auto both mean "not used")
      if (exp) for (const id of B.PIN_ONLY) { delete pref[id]; if (rng(100) < 2) pref[id] = "include"; }
      const cfg = { script: "custom", experimental: exp, players: n, pref };
      const a = B.analyze(cfg);
      if (!B.PIN_ONLY.some(id => pref[id] === "include") && (!exp || i % 3 === 0)) { oracled++; const o = oracleCustom(cfg); if (a.ok !== o) fail("custom analyze vs oracle", { cfg, a: a.ok, o, errors: a.errors }); }
      if (!a.ok && !a.errors.length) fail("custom: no message", cfg);
      if (a.ok) {
        feasibleCount++;
        for (let k = 0; k < 2; k++) {
          const r = B.generate(cfg, rng); gens++;
          if (!r.ok) { fail("custom generate failed", { cfg, errors: r.errors }); break; }
          if (!exp || true) { const extra = B.checkSetup(r.setup, cfg); if (extra.length) fail("custom checkSetup", extra); }
          if (!B.toText(r.setup).includes("PUT IN THE BAG")) fail("custom text");
        }
      }
    }
  }
  console.log(`property run (custom${exp ? " + experimental" : ""}): ${gens} generations, ${feasibleCount} feasible configs, ${oracled} checked against the oracle`);
}
{
  const cust = (players, pref, experimental = true) => g({ script: "custom", experimental, players, pref: pref || {} });
  expect("Custom lists every base character (72); Experimental adds 66", B.SCRIPTS.custom.roles.length === 72 && B.SCRIPTS.customx.roles.length === 138 && new Set(B.SCRIPTS.customx.roles).size === 138);
  { let none = true; for (let i = 0; i < 300; i++) { const s = cust(5 + (i % 11)).setup; none = none && ![...s.inPlay, s.demon].some(id => B.PIN_ONLY.includes(id)); } expect("Setup-changing experimental characters never appear unless pinned", none); }
  { const s = cust(9, { atheist: "include" }, false).setup; expect("Experimental off: experimental pins are ignored", !s.inPlay.includes("atheist") && s.inPlay.every(id => B.SCRIPTS.custom.roles.includes(id))); }
  { let all = true; for (let i = 0; i < 100; i++) { const s = cust(12, { baron: "include", godfather: "include", fanggu: "exclude", vigormortis: "exclude" }, false).setup; const sh = s.modifiers.reduce((t, m) => t + m.shift, 0); all = all && [1, 3].includes(sh) && s.outsiders.length === 2 + sh && s.townsfolk.length === 7 - sh; } expect("Baron + Godfather together: +1 or +3 Outsiders", all); }
  { const s = cust(5, { baron: "include", vigormortis: "include" }, false).setup; expect("Baron then Vigormortis at 5: 0 + 2 − 1 = 1 Outsider, 2 Townsfolk", s.outsiders.length === 1 && s.townsfolk.length === 2); }
  {
    const [TF, OS, MN] = B.DIST[11];
    const at = cust(11, { atheist: "include" }).setup;
    expect("Atheist: no evil characters, no bluffs, no Minion/Demon info", at.minions.length === 0 && !at.demon && at.townsfolk.length === TF + MN + 1 && at.bluffs.length === 0 && !at.firstNight.some(r => r.sys) && at.bag.every(id => B.GOOD(B.BY_ID[id].team)));
    const su = cust(6, { summoner: "include" }).setup;
    expect("Summoner: no Demon, +1 Townsfolk, 3 bluffs even at 6 players", !su.demon && su.townsfolk.length === B.DIST[6][0] + 1 && su.bluffs.length === 3 && /SUMMONER'S BLUFFS/.test(B.toText(su)));
    const lm = cust(11, { lilmonsta: "include" }).setup;
    expect("Lil' Monsta: +1 Minion, no Demon player or token in the bag, no bluffs", lm.minions.length === MN + 1 && lm.demon === "lilmonsta" && !lm.bag.includes("lilmonsta") && lm.bluffs.length === 0 && lm.firstNight.some(r => r.id === "lilmonsta") && !lm.firstNight.some(r => r.sys));
    const kz = cust(11, { kazali: "include" }).setup;
    expect("Kazali: no Minions in the bag, Townsfolk instead", kz.minions.length === 0 && kz.townsfolk.length === TF + MN && kz.demon === "kazali" && B.prepNotes(kz).some(n => n.who === "Kazali"));
    const lt = cust(11, { lordoftyphon: "include", baron: "exclude", godfather: "exclude" }).setup;
    expect("Lord of Typhon: +1 Minion, −1 Townsfolk, seating note", lt.minions.length === MN + 1 && lt.townsfolk.length === TF - 1 && B.seatNotes(lt).some(n => n.who === "Lord of Typhon"));
    const lg = cust(10, { legion: "include" }).setup;
    expect("Legion: 7 Legion + 3 good at 10 players", lg.legion === 7 && lg.bag.filter(id => id === "legion").length === 7 && lg.townsfolk.length + lg.outsiders.length === 3 && lg.minions.length === 0);
    let xs = new Set(); for (let i = 0; i < 100; i++) { const xa = cust(11, { xaan: "include" }).setup; xs.add(xa.xaanX); if (xa.outsiders.length !== xa.xaanX) xs.add("bad"); }
    expect(`Xaan: X Outsiders, usually 1–4 (saw ${[...xs].sort().join(",")})`, [...xs].every(x => [1, 2, 3, 4].includes(x)) && xs.size > 1);
  }
  const err = (pref, re, players = 9) => { const a = B.analyze({ script: "custom", experimental: true, players, pref }); const ok = !a.ok && re.test(a.errors.join(" ")); if (ok) console.log("     →", a.errors[0]); return ok; };
  expect("Two shapers → error", err({ atheist: "include", xaan: "include" }, /reshape the whole setup/));
  expect("Atheist + Imp → error", err({ atheist: "include", imp: "include" }, /no evil characters\. Remove the Imp/));
  expect("Summoner + Imp → error", err({ summoner: "include", imp: "include" }, /no Demon starts in play/));
  expect("Kazali + Poisoner → error", err({ kazali: "include", poisoner: "include" }, /no Minion tokens go in the bag/));
  expect("Marionette + Lil' Monsta → error", err({ marionette: "include", lilmonsta: "include" }, /needs a Demon player/));
  expect("Choirboy with the King Out → error", err({ choirboy: "include", king: "exclude" }, /brings the King into play/));
  { let all = true; for (let i = 0; i < 50; i++) { const s = cust(9, { choirboy: "include" }).setup; all = all && s.townsfolk.includes("king"); } expect("Choirboy brings in the King", all); }
  { let sh = new Set(), all = true; for (let i = 0; i < 100; i++) { const s = cust(9, { huntsman: "include" }).setup; const m = s.modifiers.find(x => x.id === "huntsman"); sh.add(m.shift); all = all && s.outsiders.includes("damsel"); } expect("Huntsman brings in the Damsel (+0 or +1 Outsider)", all && sh.has(0) && sh.has(1)); }
  { let b = new Set(), h = new Set(); for (let i = 0; i < 100; i++) { b.add(cust(9, { balloonist: "include" }).setup.modifiers.find(x => x.id === "balloonist").shift); h.add(cust(9, { hermit: "include" }).setup.modifiers.find(x => x.id === "hermit").shift); } expect("Balloonist +0/+1 and Hermit −0/−1", b.has(0) && b.has(1) && h.has(0) && h.has(-1)); }
  {
    const cfg = { script: "custom", experimental: true, players: 12, pref: { marionette: "include", drunk: "include" } };
    let all = true;
    for (let i = 0; i < 100; i++) { const s = g(cfg).setup; all = all && s.marionetteAs && s.decoy && s.marionetteAs !== s.decoy && s.bag.includes(s.marionetteAs) && !s.bag.includes("marionette") && s.firstNight.concat(s.otherNights).every(r => r.id !== s.marionetteAs || /Marionette/.test(r.label)); }
    expect("Marionette: its own spare Townsfolk in the bag, never the Drunk's", all);
    const s = g(cfg).setup, other = s.marionettePool.find(id => id !== s.marionetteAs && id !== s.decoy);
    const t = B.setMarionette(s, other, rng);
    expect("Set the Marionette's Townsfolk; the Drunk's is refused", t.marionetteAs === other && B.checkSetup(t, cfg).length === 0 && B.setMarionette(s, s.decoy, rng) === s);
  }
  { let all = true; for (let i = 0; i < 100; i++) { const s = cust(10, { bountyhunter: "include" }).setup; const b = s.info.find(x => x.key === "bountyhunter"); all = all && s.townsfolk.includes(b.evilTownsfolk) && b.evilTownsfolk !== "bountyhunter" && (s.minions.includes(b.knows) || s.demon === b.knows || b.knows === b.evilTownsfolk); } expect("Bounty Hunter: an evil Townsfolk, and knows an evil player", all); }
  { const s = cust(10, { mathematician: "include", lunatic: "include" }, false).setup; expect("Jinxes listed for characters in play", s.jinxes.some(j => j.a === "mathematician" && j.b === "lunatic") && /JINXES/.test(B.toText(s))); }
  { const s = g({ script: "tb", players: 10, pref: {} }).setup; expect("Base scripts never list jinxes", !s.jinxes && !/JINXES/.test(B.toText(s))); }
  {
    const df = {}; const N = 9000;
    for (let i = 0; i < N; i++) { const s = cust(9, {}, false).setup; df[s.demon] = (df[s.demon] || 0) + 1; }
    const dv = Object.values(df);
    console.log("Custom Demon freq:", Object.entries(df).map(([k, v]) => `${k}:${(v / N * 100).toFixed(1)}%`).join(" "));
    expect("Custom Demons equally likely (within 15%)", dv.length === 9 && (Math.max(...dv) - Math.min(...dv)) / Math.max(...dv) < 0.15);
  }
}

// 3. Fairness: Townsfolk frequency at 10 players, all Auto
{
  const freq = {}; const N = 50000;
  for (let i = 0; i < N; i++) { const r = g({ players: 10, pref: {} }); r.setup.townsfolk.forEach(id => freq[id] = (freq[id] || 0) + 1); }
  const vals = Object.values(freq), min = Math.min(...vals), max = Math.max(...vals);
  console.log("TF freq at 10 players:", Object.entries(freq).map(([k, v]) => `${k}:${(v / N * 100).toFixed(1)}%`).join(" "));
  expect("Townsfolk fairness within 5%", (max - min) / max < 0.05);
  const bf = {}; for (let i = 0; i < 20000; i++) { const r = g({ players: 10, pref: {} }); r.setup.minions.forEach(id => bf[id] = (bf[id] || 0) + 1); }
  console.log("Minion freq at 10 players:", Object.entries(bf).map(([k, v]) => `${k}:${(v / 20000 * 100).toFixed(1)}%`).join(" "));
}
{
  const df = {}, sh = {}; const N = 20000;
  for (let i = 0; i < N; i++) { const s = g({ script: "bmr", players: 8, pref: {} }).setup; df[s.demon] = (df[s.demon] || 0) + 1; if (s.modifier) sh[s.modifier.shift] = (sh[s.modifier.shift] || 0) + 1; }
  console.log("BMR Demon freq:", Object.entries(df).map(([k, v]) => `${k}:${(v / N * 100).toFixed(1)}%`).join(" "), "· Godfather shift:", JSON.stringify(sh));
  const dv = Object.values(df);
  expect("BMR Demons equally likely (within 10%)", dv.length === 4 && (Math.max(...dv) - Math.min(...dv)) / Math.max(...dv) < 0.1);
  expect("Godfather direction ~50/50 when both fit", sh[1] && sh[-1] && Math.abs(sh[1] - sh[-1]) / (sh[1] + sh[-1]) < 0.06);
}
{
  const df = {}; const N = 20000;
  for (let i = 0; i < N; i++) { const s = g({ script: "snv", players: 8, pref: {} }).setup; df[s.demon] = (df[s.demon] || 0) + 1; }
  console.log("S&V Demon freq:", Object.entries(df).map(([k, v]) => `${k}:${(v / N * 100).toFixed(1)}%`).join(" "));
  const dv = Object.values(df);
  expect("S&V Demons equally likely (within 10%)", dv.length === 4 && (Math.max(...dv) - Math.min(...dv)) / Math.max(...dv) < 0.1);
  let only = true; for (let i = 0; i < 300; i++) only = only && g({ script: "snv", players: 7, pref: { mutant: "include" } }).setup.demon === "fanggu";
  expect("1 Outsider In at 7: only the Fang Gu fits", only);
}

console.log(fails ? `\n${fails} FAILURES` : "\nALL TESTS PASSED");
process.exit(fails ? 1 : 0);

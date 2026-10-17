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
  if (!combos(ids("demon", script), 1).some(d => okSet(d, "demon"))) return false;
  const nonExTF = ids("townsfolk", script).filter(id => p(id) !== "exclude").length;
  const incTF = ids("townsfolk", script).filter(id => p(id) === "include").length;
  for (const mn of combos(ids("minion", script), MN)) {
    if (!okSet(mn, "minion")) continue;
    const mod = mn.find(id => B.BY_ID[id].modifier);
    for (const d of mod ? B.BY_ID[mod].modifier : [0]) {
      const tf = TF - d, os = OS + d;
      if (tf < 0 || os < 0 || incTF > tf || nonExTF < tf) continue;
      for (const o of combos(ids("outsider", script), os)) {
        if (!okSet(o, "outsider")) continue;
        if (o.includes("drunk") && nonExTF < tf + 1) continue;
        return true;
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
for (const script of ["tb", "bmr"]) {
let gens = 0, feasibleCount = 0;
for (let n = 5; n <= 20; n++) {
  for (let i = 0; i < 5000; i++) {
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

console.log(fails ? `\n${fails} FAILURES` : "\nALL TESTS PASSED");
process.exit(fails ? 1 : 0);

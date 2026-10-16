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
const ids = t => B.ROLES.filter(r => r.team === t).map(r => r.id);
const combos = (arr, k) => k === 0 ? [[]] : arr.length < k ? [] : [...combos(arr.slice(1), k - 1).map(c => [arr[0], ...c]), ...combos(arr.slice(1), k)];

// Exact feasibility oracle by enumeration
function oracle(cfg) {
  const real = Math.min(cfg.players, 15), [TF, OS, MN] = B.DIST[real];
  const p = id => B.prefOf(cfg, id);
  const okSet = (set, team) => ids(team).every(id => p(id) !== "include" || set.includes(id)) && set.every(id => p(id) !== "exclude");
  const nonExTF = ids("townsfolk").filter(id => p(id) !== "exclude").length;
  const incTF = ids("townsfolk").filter(id => p(id) === "include").length;
  for (const mn of combos(ids("minion"), MN)) {
    if (!okSet(mn, "minion")) continue;
    const b = mn.includes("baron"), tf = TF - (b ? 2 : 0), os = OS + (b ? 2 : 0);
    if (tf < 0 || incTF > tf || nonExTF < tf) continue;
    for (const o of combos(ids("outsider"), os)) {
      if (!okSet(o, "outsider")) continue;
      if (o.includes("drunk") && nonExTF < tf + 1) continue;
      return true;
    }
  }
  return false;
}

const rng = B.seededRng(12345);
function randomPref(density) {
  const pref = {};
  for (const r of B.ROLES) { const x = rng(100); if (x < density) pref[r.id] = "include"; else if (x < density * 2) pref[r.id] = "exclude"; }
  return pref;
}

// 1. Property run: every player count, many random configs
let gens = 0, feasibleCount = 0;
for (let n = 5; n <= 20; n++) {
  for (let i = 0; i < 5000; i++) {
    const density = [0, 5, 10, 20, 35][i % 5];
    const cfg = { players: n, pref: randomPref(density) };
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
console.log(`property run: ${gens} generations, ${feasibleCount} feasible configs`);

// 2. Targeted cases
const g = cfg => B.generate(cfg, rng);
function expect(name, cond) { if (!cond) fail(name); else console.log("ok  ", name); }
{ let all = true; for (let i = 0; i < 200; i++) { const r = g({ players: 15, pref: { baron: "include" } }); all = all && r.ok && r.setup.inPlay.includes("drunk") && r.setup.outsiders.length === 4 && r.setup.townsfolk.length === 7; } expect("15 + Baron forces Drunk, 7 TF / 4 OS", all); }
{ const r = g({ players: 5, pref: { baron: "include" } }); expect("5 + Baron: 1 TF / 2 OS, no bluffs", r.ok && r.setup.townsfolk.length === 1 && r.setup.outsiders.length === 2 && r.setup.bluffs.length === 0); }
{ let all = true; for (let i = 0; i < 100; i++) { const r = g({ players: 8, pref: { saint: "include", recluse: "include", butler: "include" } }); all = all && r.ok && r.setup.baron && r.setup.autoBaron; } expect("3 Outsiders at 8 auto-adds Baron", all); }
{ const a = B.analyze({ players: 8, pref: { saint: "include", recluse: "include", butler: "include", baron: "exclude" } }); expect("Baron excluded + 3 Outsiders at 8 errors", !a.ok && /Allow the Baron/.test(a.errors[0])); console.log("     →", a.errors[0]); }
{ const a = B.analyze({ players: 7, pref: { saint: "include", recluse: "include", butler: "include" } }); expect("3 Outsiders at 7 → Baron fits (0+2 < 3)? should error", !a.ok); console.log("     →", a.errors.join(" | ")); }
{ const a = B.analyze({ players: 8, pref: { poisoner: "include", spy: "include" } }); expect("2 Minions at 8 errors with fix", !a.ok && /10 or more/.test(a.errors[0])); console.log("     →", a.errors[0]); }
{ const a = B.analyze({ players: 8, pref: { poisoner: "include", saint: "include", recluse: "include" } }); expect("Outsiders need Baron but Minion slot taken", !a.ok && /already fill every Minion slot/.test(a.errors[0])); console.log("     →", a.errors[0]); }
{ const pref = { drunk: "include" }; ids("townsfolk").slice(0, 8).forEach(id => pref[id] = "exclude"); const r = g({ players: 8, pref }); expect("Drunk with no spare decoy auto-adds Baron to make room", r.ok && r.setup.baron && r.setup.decoy); }
{ const pref = { drunk: "include", baron: "exclude" }; ids("townsfolk").slice(0, 8).forEach(id => pref[id] = "exclude"); const a = B.analyze({ players: 8, pref }); expect("Drunk with no spare decoy errors", !a.ok && /Drunk needs/.test(a.errors.join(" "))); console.log("     →", a.errors.join(" | ")); }
{ const r = g({ players: 18, pref: {} }); expect("18 players → 15 + 3 Travellers", r.ok && r.setup.real === 15 && r.setup.travellers === 3 && r.setup.inPlay.length === 15); }
{ let all = true; for (let i = 0; i < 300; i++) { const r = g({ players: 10, pref: { baron: "include" } }); all = all && r.ok && r.setup.inPlay.includes("baron"); } expect("Baron included always present", all); }
{ let all = true; for (let i = 0; i < 300; i++) { const r = g({ players: 7, pref: { librarian: "include" } }); const l = r.setup.info.find(x => x.key === "librarian"); all = all && (r.setup.outsiders.length ? !l.zero : l.zero); } expect("Librarian shows 0 iff no Outsiders", all); }
{ let all = true; for (let i = 0; i < 300; i++) { const r = g({ players: 9, pref: { drunk: "include", fortuneteller: "include" } }); const s = r.setup; all = all && s.decoy && s.bag.includes(s.decoy) && !s.bag.includes("drunk") && !s.bluffs.includes(s.decoy) && (!(B.BY_ID[s.decoy].first || B.BY_ID[s.decoy].other) || s.firstNight.concat(s.otherNights).some(x => x.drunk)) && !s.firstNight.concat(s.otherNights).some(x => x.id === "drunk"); } expect("Drunk decoy in bag, not a bluff, wakes in night order", all); }
{ let rhFT = 0, rhOther = 0; for (let i = 0; i < 2000; i++) { const r = g({ players: 8, pref: { fortuneteller: "include" } }); const rh = r.setup.info.find(x => x.key === "fortuneteller").redHerring; if (rh === "fortuneteller") rhFT++; else rhOther++; } expect("Red Herring can be the Fortune Teller", rhFT > 0 && rhOther > 0); }
{ const r = g({ players: 8, pref: { fortuneteller: "include" } }); const s2 = B.repick(r.setup, "fortuneteller", rng); expect("Re-pick keeps characters", JSON.stringify(s2.inPlay) === JSON.stringify(r.setup.inPlay) && B.checkSetup(s2, { players: 8, pref: { fortuneteller: "include" } }).length === 0); }

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

console.log(fails ? `\n${fails} FAILURES` : "\nALL TESTS PASSED");
process.exit(fails ? 1 : 0);

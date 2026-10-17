// Golden check: Trouble Brewing and Bad Moon Rising output for fixed seeds must not change.
// Usage: node tests/golden.js [--write]
const fs = require("fs"), path = require("path"), vm = require("vm");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const core = html.slice(html.indexOf("/*CORE-START*/"), html.indexOf("/*CORE-END*/"));
const ctx = { crypto: require("crypto").webcrypto, console };
vm.createContext(ctx); vm.runInContext(core, ctx);
const B = ctx.BOTC;
const hash = x => require("crypto").createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 16);

const view = s => ({ inPlay: s.inPlay, bag: s.bag, bluffs: s.bluffs, decoy: s.decoy, decoyPool: s.decoyPool, info: s.info, counts: s.counts,
  reminders: s.reminders, firstNight: s.firstNight.map(r => r.label), otherNights: s.otherNights.map(r => r.label), text: B.toText(s) });
const bmrView = s => Object.assign(view(s), { demon: s.demon, modifier: s.modifier, autoModifier: s.autoModifier, lunaticAs: s.lunaticAs, lunaticPool: s.lunaticPool });

const SETS = {
  // the TB ids and config shape (no script field) are what the original fixture was recorded with
  tb: { file: "tb-golden.json", seed: 777, view, script: undefined,
    ids: ["washerwoman","librarian","investigator","chef","empath","fortuneteller","undertaker","monk","ravenkeeper","virgin","slayer","soldier","mayor","butler","drunk","recluse","saint","poisoner","spy","scarletwoman","baron"] },
  bmr: { file: "bmr-golden.json", seed: 888, view: bmrView, script: "bmr",
    ids: ["grandmother","sailor","chambermaid","exorcist","innkeeper","gambler","gossip","courtier","professor","minstrel","tealady","pacifist","fool","goon","lunatic","tinker","moonchild","godfather","devilsadvocate","assassin","mastermind","zombuul","pukka","shabaloth","po"] }
};

function cases(set) {
  const r = B.seededRng(set.seed), out = [];
  for (let i = 0; i < 400; i++) {
    const pref = {}, density = [0, 5, 10, 20][i % 4];
    for (const id of set.ids) { const x = r(100); if (x < density) pref[id] = "include"; else if (x < density * 2) pref[id] = "exclude"; }
    out.push({ players: 5 + (i % 16), pref, seed: 1000 + i });
  }
  return out;
}

let failed = false;
for (const [name, set] of Object.entries(SETS)) {
  const FILE = path.join(__dirname, "fixtures", set.file);
  const results = cases(set).map(c => {
    const cfg = set.script ? { script: set.script, players: c.players, pref: c.pref } : { players: c.players, pref: c.pref };
    const g = B.generate(cfg, B.seededRng(c.seed));
    return { cfg, ok: g.ok, errors: g.ok ? undefined : g.errors, setup: g.ok ? set.view(g.setup) : undefined };
  });
  if (process.argv.includes("--write")) { fs.writeFileSync(FILE, JSON.stringify(results.map(hash), null, 0)); console.log(`wrote ${name}:`, results.length, "cases,", results.filter(x => x.ok).length, "ok"); continue; }
  const want = JSON.parse(fs.readFileSync(FILE, "utf8"));
  let bad = 0;
  results.forEach((r, i) => { if (hash(r) !== want[i]) { bad++; if (bad <= 3) console.log(`GOLDEN DIFF ${name} case`, i, "now:", JSON.stringify(r).slice(0, 600)); } });
  console.log(bad ? `golden: ${bad} of ${want.length} ${name.toUpperCase()} cases differ` : `golden: ${want.length} ${name.toUpperCase()} cases identical`);
  if (bad) failed = true;
}
process.exit(failed ? 1 : 0);

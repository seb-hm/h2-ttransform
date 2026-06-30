// parity_check.mjs — the trust anchor for the JS engine (ES module).
// Asserts engine.js reproduces the Python reference (data/parity_reference.json)
// to the cent, for the base case and the central + pess/opt band series.
//
// Run:  node parity_check.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildModel, computeBaseCase, computeSeries, computeBands,
} from "./js/engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const params = JSON.parse(readFileSync(join(here, "data/params.json"), "utf-8"));
const ref = JSON.parse(readFileSync(join(here, "data/parity_reference.json"), "utf-8"));

const TOL = 1e-6;
let worst = 0, fails = 0;
const log = [];

function check(label, got, exp) {
  const d = Math.abs(got - exp);
  if (d > worst) worst = d;
  if (d > TOL) {
    fails++;
    log.push(`  FAIL ${label}: js ${got.toFixed(6)} vs py ${exp.toFixed(6)} (Δ ${d.toExponential(2)})`);
  }
}

const model = buildModel(params);

const bc = computeBaseCase(model);
for (const sc of ["S1", "S2", "S3", "S4", "S5"]) {
  check(`base ${sc} lcoh`, bc[sc].lcoh, ref.base_case[sc].lcoh);
  check(`base ${sc} lcoh_incl_cbam`, bc[sc].lcoh_incl_cbam, ref.base_case[sc].lcoh_incl_cbam);
  check(`base ${sc} total_co2`, bc[sc].total_co2, ref.base_case[sc].total_co2);
}

const years = ref.series.years;
const s = computeSeries(model, {}, years);
for (const key of ["S1", "PEM_PPA", "S5"]) {
  for (let i = 0; i < years.length; i++) check(`series ${key} ${years[i]}`, s[key][i], ref.series[key][i]);
}

const bands = computeBands(model, {}, years);
for (const key of ["S5_pess", "S5_opt", "PEM_pess", "PEM_opt"]) {
  for (let i = 0; i < years.length; i++) check(`band ${key} ${years[i]}`, bands[key][i], ref.series[key][i]);
}

const total = 5 * 3 + 3 * years.length + 4 * years.length;
if (fails === 0) {
  console.log(`PARITY PASS — ${total} checks, worst |Δ| ${worst.toExponential(2)}`);
  process.exit(0);
} else {
  console.log(log.join("\n"));
  console.log(`PARITY FAIL — ${fails}/${total} checks off, worst |Δ| ${worst.toExponential(2)}`);
  process.exit(1);
}

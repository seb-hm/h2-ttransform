// engine.js — JS port of the Python TEA engine (engine.py + trajectories.py).
// Single source of truth remains the Excel workbook; this reproduces its logic
// so the static terminal can sweep parameters without a backend. Verified to
// the cent against Python via parity_check.mjs (data/parity_reference.json).
//
// ES module: clean scope, no globals. Imported by index.html and parity_check.mjs.

const H2_LHV_KWH_PER_KG = 33.33;
const SCENARIOS = ["S1", "S2", "S3", "S4", "S5"];

// ---- model assembly (parsed params.json -> convenient maps) ----------------
export function buildModel(params) {
  const P = { ...params.scalars };
  const cpi = Object.fromEntries(params.tables.cpi);
  const carbon = Object.fromEntries(params.tables.carbon_nom_eur);
  const phase = Object.fromEntries(params.tables.cbam_phase_factor);
  const ngKwhPerMMBtu = P.SMR_NGprice_MMBtu / P.SMR_NGprice;
  return { P, cpi, carbon, phase, defaults: params.trajectory_defaults, ngKwhPerMMBtu };
}

const lc = (v) => String(v).trim().toLowerCase();

// ---- lever resolution: defaults come from the snapshot ---------------------
export function resolveLevers(model, levers = {}) {
  const { P, defaults } = model;
  const pick = (v, d) => (v === undefined || v === null ? d : v);
  return {
    soec_decline: pick(levers.soec_decline, defaults.soec_decline),
    pem_decline: pick(levers.pem_decline, defaults.pem_decline),
    ppa_decline: pick(levers.ppa_decline, defaults.ppa_decline),
    grid_re_end: pick(levers.grid_re_end, defaults.grid_re_end),
    grid_re_end_year: defaults.grid_re_end_year,
    carbon_mult: pick(levers.carbon_mult, 1.0),
    phase_on: pick(levers.phase_on, lc(P.CBAM_phase_sel) !== "off"),
    wh_on: pick(levers.wh_on, lc(P.WH_sel) === "on"),
    wacc: pick(levers.wacc, P.WACC),
    ng_mmbtu: pick(levers.ng_mmbtu, P.SMR_NGprice_MMBtu),
    ppa_lcoe: pick(levers.ppa_lcoe, P.LCOE_PPA),
    base_year: P.RefYear | 0,
  };
}

// Apply scalar (non-year) lever overrides to a copy of P.
function basePForLevers(model, L) {
  const P = { ...model.P };
  P.WACC = L.wacc;
  P.SMR_NGprice = L.ng_mmbtu / model.ngKwhPerMMBtu;
  P.LCOE_PPA = L.ppa_lcoe;
  P.WH_sel = L.wh_on ? "On" : "Off";
  P.CBAM_phase_sel = L.phase_on ? "On" : "Off";
  return P;
}

function crf(wacc, n) {
  return (wacc * (1 + wacc) ** n) / ((1 + wacc) ** n - 1);
}

// ---- trajectory helpers (mirror trajectories.py) ---------------------------
function carbonRealUsd(model, L, year) {
  const ys = Object.keys(model.carbon).map(Number).sort((a, b) => a - b);
  const y = Math.min(Math.max(year, ys[0]), ys[ys.length - 1]);
  const nomEur = model.carbon[y];
  const deflate = model.cpi[L.base_year] / model.cpi[year];
  return nomEur * model.P.FX_EURUSD * deflate * L.carbon_mult;
}

function cbamFactor(model, year) {
  if (year < 2026) return 1.0;
  if (year >= 2034) return 0.0;
  return model.phase[year] ?? 0.0;
}

function benchmarkProtected(model, year) {
  const bench =
    model.P.NH3_bench_base * (1 - model.P.NH3_bench_rate) ** Math.max(0, year - 2025);
  return bench * cbamFactor(model, year);
}

export function cbamPerKg(model, L, embodiedTco2PerTnh3, year) {
  const carbon = carbonRealUsd(model, L, year);
  let perT;
  if (!L.phase_on) {
    perT = embodiedTco2PerTnh3 * carbon;
  } else if (year < 2026) {
    perT = 0.0;
  } else {
    const excess = Math.max(0.0, embodiedTco2PerTnh3 - benchmarkProtected(model, year));
    perT = excess * carbon;
  }
  return perT / model.P.H2_per_NH3;
}

// Year-scaled parameter copy (mirror Trajectories.scaled_params).
function scaledParams(model, P, L, year) {
  const Py = { ...P };
  const k = Math.max(0, year - L.base_year);
  const sf = (1 - L.soec_decline) ** k;
  const pf = (1 - L.pem_decline) ** k;
  const ppaf = (1 - L.ppa_decline) ** k;
  Py.SOEC_TASC_USD = P.SOEC_TASC_USD * sf;
  Py.SOEC_stack_cost = P.SOEC_stack_cost * sf;
  Py.PEM_TASC_USD = P.PEM_TASC_USD * pf;
  Py.PEM_stack_cost = P.PEM_stack_cost * pf;
  Py.LCOE_PPA = P.LCOE_PPA * ppaf;
  let re;
  const start = P.GridRE_sel;
  if (year <= L.base_year) re = start;
  else if (year >= L.grid_re_end_year) re = L.grid_re_end;
  else {
    const frac = (year - L.base_year) / (L.grid_re_end_year - L.base_year);
    re = start + (L.grid_re_end - start) * frac;
  }
  Py.LCOE_blended = (1 - re) * P.LCOE_NonRE + re * P.LCOE_RE_weighted;
  Py.EF_blended = (1 - re) * P.EF_grid_current;
  return Py;
}

// ---- core compute (mirror engine.compute) ----------------------------------
export function compute(model, P) {
  const wacc = P.WACC, n = P.Lifetime;
  const cap = P.H2_capacity_MW, CF = P.CF_plant, oph = P.OpHours;
  const cr = crf(wacc, n);
  const refyear = P.RefYear | 0;
  const cpiRef = model.cpi[refyear];

  const ppaPrice = (P.LCOE_PPA * cpiRef) / model.cpi[P.LCOE_PPA_year | 0];
  const elecPrice = {
    S1: P.LCOE_NonRE, S2: P.LCOE_NonRE, S3: P.LCOE_NonRE,
    S4: P.LCOE_blended, S5: ppaPrice,
  };
  const kwh = {
    S1: P.SMR_aux_kWhkg, S2: P.PEM_kWhkg, S3: P.SOEC_kWhkg_active,
    S4: P.SOEC_kWhkg_active, S5: P.SOEC_kWhkg_active,
  };
  const ef = {
    S1: P.EF_grid_current, S2: P.EF_grid_current, S3: P.EF_grid_current,
    S4: P.EF_blended, S5: 0.0,
  };

  const h2Soec = (cap * 1000 * CF * oph) / P.SOEC_kWhkg_active;
  const h2Pem = (cap * 1000 * CF * oph) / P.PEM_kWhkg;
  const annual = { S1: h2Soec, S2: h2Pem, S3: h2Soec, S4: h2Soec, S5: h2Soec };

  const tasc = {
    S1: P.SMR_TASC_USD, S2: P.PEM_TASC_USD, S3: P.SOEC_TASC_USD,
    S4: P.SOEC_TASC_USD, S5: P.SOEC_TASC_USD,
  };
  const plantCapS1 = (annual.S1 * H2_LHV_KWH_PER_KG) / (CF * oph) / 1000;
  const plantCap = { S1: plantCapS1, S2: cap, S3: cap, S4: cap, S5: cap };
  const whOn = lc(P.WH_sel) === "on";

  const out = {};
  for (const sc of SCENARIOS) {
    const a = annual[sc];
    const techCapex = (tasc[sc] * plantCap[sc] * 1000) / 1e6;
    const whCapex = whOn && (sc === "S3" || sc === "S4" || sc === "S5") ? P.WH_CAPEX_MUSD : 0.0;
    const capexAnnuity = ((techCapex + whCapex) * cr * 1e6) / a;

    let fixedOm;
    if (sc === "S1") fixedOm = (P.SMR_FOM * plantCap[sc] * 1000) / a;
    else if (sc === "S2") fixedOm = (P.PEM_FOM_pct * P.PEM_TASC_USD * cap * 1000) / a;
    else fixedOm = (P.SOEC_FOM * cap * 1000) / a;

    const varOm = sc === "S1" ? P.SMR_VOM : sc === "S2" ? P.PEM_VOM : P.SOEC_VOM;
    const electricity = kwh[sc] * elecPrice[sc];

    let stackRepl;
    if (sc === "S1") stackRepl = 0.0;
    else if (sc === "S2")
      stackRepl = ((oph * CF) / P.PEM_stack_h) * P.PEM_stack_cost * cap * 1000 / a;
    else stackRepl = ((oph * CF) / P.SOEC_stack_h) * P.SOEC_stack_cost * cap * 1000 / a;

    const feedstock = sc === "S1" ? P.SMR_NGcons * P.SMR_NGprice : 0.0;
    const lcoh = capexAnnuity + fixedOm + varOm + electricity + stackRepl + feedstock;

    const direct = sc === "S1" ? P.SMR_EF : 0.0;
    const scope2 = kwh[sc] * ef[sc];
    const totalCo2 = direct + scope2;

    const embodied = (totalCo2 * P.H2_per_NH3) / 1000;
    let cbamT;
    if (lc(P.CBAM_phase_sel) === "off") cbamT = embodied * P.Carbon_USD;
    else if (refyear < 2026) cbamT = 0.0;
    else cbamT = Math.max(0.0, embodied - P.Benchmark_protected_year) * P.Carbon_USD;
    const cbamCost = cbamT / P.H2_per_NH3;

    out[sc] = {
      annual_h2: a, capex_annuity: capexAnnuity, fixed_om: fixedOm, var_om: varOm,
      electricity, stack_repl: stackRepl, feedstock, lcoh,
      total_co2: totalCo2, cbam_cost: cbamCost, lcoh_incl_cbam: lcoh + cbamCost,
    };
  }
  return out;
}

export function computeBaseCase(model, levers = {}) {
  const L = resolveLevers(model, levers);
  return compute(model, basePForLevers(model, L));
}

// ---- the three time-series the terminal plots (mirror crossover_v3) --------
export function computeSeries(model, levers = {}, years) {
  const L = resolveLevers(model, levers);
  const P0 = basePForLevers(model, L);
  const yrs = years || range(model.P.RefYear | 0, 2040);
  const h2 = model.P.H2_per_NH3;
  const soecKwh = model.P.SOEC_kWhkg_active;
  const pemKwh = model.P.PEM_kWhkg;
  const out = { years: yrs, S1: [], PEM_PPA: [], S5: [] };
  for (const y of yrs) {
    const res = compute(model, scaledParams(model, P0, L, y));
    out.S1.push(res.S1.lcoh + cbamPerKg(model, L, (res.S1.total_co2 * h2) / 1000, y));
    out.S5.push(res.S5.lcoh + cbamPerKg(model, L, (res.S5.total_co2 * h2) / 1000, y));
    const ppaKwh = res.S5.electricity / soecKwh;
    out.PEM_PPA.push(res.S2.lcoh - res.S2.electricity + pemKwh * ppaKwh);
  }
  return out;
}

// ---- learning bands (pess/opt) around S5 and PEM (mirror crossover_v6) -----
export function computeBands(model, levers = {}, years) {
  const d = model.defaults;
  const [ppaP, ppaO] = d.ppa_decline_range;
  const [soecP, soecO] = d.soec_decline_range;
  const [pemP, pemO] = d.pem_decline_range;
  const s5Pess = computeSeries(model, { ...levers, soec_decline: soecP, ppa_decline: ppaP }, years).S5;
  const s5Opt = computeSeries(model, { ...levers, soec_decline: soecO, ppa_decline: ppaO }, years).S5;
  const pemPess = computeSeries(model, { ...levers, pem_decline: pemP, ppa_decline: ppaP }, years).PEM_PPA;
  const pemOpt = computeSeries(model, { ...levers, pem_decline: pemO, ppa_decline: ppaO }, years).PEM_PPA;
  return { S5_pess: s5Pess, S5_opt: s5Opt, PEM_pess: pemPess, PEM_opt: pemOpt };
}

// crossover year of SOEC (S5) vs grey (S1), or null if they never cross.
export function crossoverYear(series) {
  for (let i = 0; i < series.years.length; i++) {
    if (series.S5[i] <= series.S1[i]) return series.years[i];
  }
  return null;
}

function range(a, b) {
  const r = [];
  for (let y = a; y <= b; y++) r.push(y);
  return r;
}

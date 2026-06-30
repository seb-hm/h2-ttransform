// ui.js — terminal UI (controls, chart, readouts). Classic external script.
// Depends on globals set by engine.js (window.TEA) and data/params.js (TEA_PARAMS).
// Boot is dependency-polled (see _boot) so script load order never matters.

let buildModel, computeSeries, computeBands, crossoverYear;

const COL = { S1: "#444444", PEM: "#e08214", S5: "#1b7837" };
const $ = (id) => document.getElementById(id);

let model, chart, controls = {}, defaults = {};

// slider definitions; def() pulls from the snapshot params
const SLIDERS = [
  { key: "ng_mmbtu", label: "Natural gas price", unit: "USD/MMBtu", min: 2, max: 15, step: 0.1,
    def: (p) => p.scalars.SMR_NGprice_MMBtu, fmt: (v) => v.toFixed(1),
    hint: "SMR feedstock. Snapshot is current subsidised price." },
  { key: "ppa_lcoe", label: "PPA electricity (start)", unit: "USD/kWh", min: 0.03, max: 0.12, step: 0.001,
    def: (p) => p.scalars.LCOE_PPA, fmt: (v) => v.toFixed(3),
    hint: "Dedicated renewable PPA price in the base year." },
  { key: "ppa_decline", label: "PPA cost decline", unit: "%/yr", min: 0, max: 7, step: 0.5,
    def: (p) => p.trajectory_defaults.ppa_decline * 100, fmt: (v) => v.toFixed(1), scale: 0.01,
    hint: "Real annual decline of the PPA price." },
  { key: "soec_decline", label: "SOEC learning", unit: "%/yr", min: 0, max: 12, step: 0.5,
    def: (p) => p.trajectory_defaults.soec_decline * 100, fmt: (v) => v.toFixed(1), scale: 0.01,
    hint: "Real CAPEX + stack cost decline (SOEC)." },
  { key: "pem_decline", label: "PEM learning", unit: "%/yr", min: 0, max: 7, step: 0.5,
    def: (p) => p.trajectory_defaults.pem_decline * 100, fmt: (v) => v.toFixed(1), scale: 0.01,
    hint: "Real CAPEX + stack cost decline (PEM)." },
  { key: "wacc", label: "WACC", unit: "%", min: 4, max: 14, step: 0.5,
    def: (p) => p.scalars.WACC * 100, fmt: (v) => v.toFixed(1), scale: 0.01,
    hint: "Weighted average cost of capital." },
  { key: "carbon_mult", label: "Carbon price ×", unit: "", min: 0.5, max: 2.5, step: 0.1,
    def: () => 1.0, fmt: (v) => v.toFixed(1) + "×",
    hint: "Scales the whole EU carbon-price path." },
];

const TOGGLES = [
  { key: "phase_on", label: "CBAM free-allowance phase-in", def: (p) => String(p.scalars.CBAM_phase_sel).toLowerCase() !== "off",
    hintOn: "phased to 2034", hintOff: "full enforcement now" },
  { key: "wh_on", label: "Waste-heat integration (SOEC)", def: (p) => String(p.scalars.WH_sel).toLowerCase() === "on" },
];

function leversFromControls() {
  const L = {};
  for (const s of SLIDERS) {
    const raw = parseFloat(controls[s.key].value);
    L[s.key] = s.scale ? raw * s.scale : raw;
  }
  for (const t of TOGGLES) L[t.key] = controls[t.key].checked;
  return L;
}

function buildControls(params) {
  const sBox = $("sliders");
  for (const s of SLIDERS) {
    const def = s.def(params);
    defaults[s.key] = def;
    const wrap = document.createElement("div");
    wrap.className = "ctrl";
    wrap.innerHTML = `
      <div class="row"><label>${s.label}</label><span class="val" id="val-${s.key}"></span></div>
      <input type="range" id="ctl-${s.key}" min="${s.min}" max="${s.max}" step="${s.step}">
      <div class="hint">${s.hint}</div>`;
    sBox.appendChild(wrap);
    const inp = wrap.querySelector("input");
    inp.value = def;            // def() already returns display units (e.g. 6 for 6%/yr)
    controls[s.key] = inp;
    inp.addEventListener("input", () => { updateLabels(); render(); });
  }
  const tBox = $("toggles");
  for (const t of TOGGLES) {
    const def = t.def(params);
    defaults[t.key] = def;
    const wrap = document.createElement("div");
    wrap.className = "toggle";
    wrap.innerHTML = `<span>${t.label}</span>
      <label class="switch"><input type="checkbox" id="ctl-${t.key}"><span class="slider"></span></label>`;
    tBox.appendChild(wrap);
    const inp = wrap.querySelector("input");
    inp.checked = def;
    controls[t.key] = inp;
    inp.addEventListener("change", render);
  }
}

function updateLabels() {
  for (const s of SLIDERS) {
    const raw = parseFloat(controls[s.key].value);
    $("val-" + s.key).textContent = s.fmt(raw) + (s.unit && !s.fmt(raw).includes("×") ? " " + s.unit : "");
  }
}

function band(years, lower, delta, color, stack) {
  return [
    { name: stack + "-base", type: "line", stack, data: lower, symbol: "none",
      lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 }, silent: true, z: 1,
      tooltip: { show: false }, legendHoverLink: false },
    { name: stack + "-fill", type: "line", stack, data: delta, symbol: "none",
      lineStyle: { opacity: 0 }, areaStyle: { color, opacity: 0.16 }, silent: true, z: 1,
      tooltip: { show: false }, legendHoverLink: false },
  ];
}

function render() {
  const L = leversFromControls();
  const s = computeSeries(model, L);
  const b = computeBands(model, L);
  const years = s.years.map(String);

  const s5Lower = b.S5_opt;
  const s5Delta = b.S5_pess.map((v, i) => v - b.S5_opt[i]);
  const pemLower = b.PEM_opt;
  const pemDelta = b.PEM_pess.map((v, i) => v - b.PEM_opt[i]);

  const xYear = crossoverYear(s);
  const cross = xYear ? [{ name: "parity", xAxis: String(xYear), yAxis: s.S5[s.years.indexOf(xYear)] }] : [];

  chart.setOption({
    textStyle: { fontFamily: "DM Sans, sans-serif", color: "#1b1f2a" },
    grid: { left: 64, right: 24, top: 54, bottom: 48 },
    title: {
      text: "Grey SMR vs. electrolysis based H₂ production in Trinidad",
      left: "center", top: 8,
      textStyle: { fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: "#1b1f2a" },
    },
    tooltip: {
      trigger: "axis",
      valueFormatter: (v) => (v == null ? "" : v.toFixed(2) + " USD/kg"),
      textStyle: { fontFamily: "DM Sans, sans-serif", fontSize: 12 },
    },
    legend: {
      data: ["Grey SMR", "PEM + RE PPA", "SOEC + RE PPA"], top: 30, right: 24, left: "auto",
      orient: "vertical", icon: "roundRect", textStyle: { fontSize: 12 },
    },
    xAxis: {
      type: "category", data: years, boundaryGap: false,
      axisLine: { lineStyle: { color: "#c7ccd6" } }, axisTick: { show: false },
      axisLabel: { fontFamily: "Georgia, serif", fontSize: 12, color: "#3a3f4b" },
      name: "Year", nameLocation: "middle", nameGap: 30,
      nameTextStyle: { fontFamily: "Georgia, serif", fontSize: 13 },
    },
    yAxis: {
      type: "value", name: "LCOH incl. CBAM (USD/kg H₂, real 2026)", nameLocation: "middle", nameGap: 44,
      nameTextStyle: { fontFamily: "Georgia, serif", fontSize: 13 },
      axisLabel: { fontFamily: "Georgia, serif", fontSize: 12, color: "#3a3f4b" },
      splitLine: { lineStyle: { color: "#eaedf2" } },
    },
    series: [
      ...band(years, s5Lower, s5Delta, COL.S5, "soecband"),
      ...band(years, pemLower, pemDelta, COL.PEM, "pemband"),
      { name: "Grey SMR", type: "line", data: s.S1, symbol: "none", z: 5,
        lineStyle: { color: COL.S1, width: 3, type: "dashed" }, itemStyle: { color: COL.S1 },
        markLine: {
          symbol: "none", silent: true,
          lineStyle: { color: "#9aa0ab", type: "dotted", width: 1.4 },
          label: { formatter: "full CBAM (2034)", fontFamily: "Georgia, serif", fontSize: 12, color: "#3a3f4b" },
          data: [{ xAxis: "2034" }],
        },
      },
      { name: "PEM + RE PPA", type: "line", data: s.PEM_PPA, symbol: "none", z: 5,
        lineStyle: { color: COL.PEM, width: 2.6 }, itemStyle: { color: COL.PEM } },
      { name: "SOEC + RE PPA", type: "line", data: s.S5, symbol: "none", z: 6,
        lineStyle: { color: COL.S5, width: 3 }, itemStyle: { color: COL.S5 },
        markPoint: cross.length ? {
          symbol: "circle", symbolSize: 11,
          itemStyle: { color: "#fff", borderColor: COL.S5, borderWidth: 2.5 },
          label: { show: true, position: "top", formatter: "parity " + xYear,
            fontFamily: "DM Sans", fontSize: 11, fontWeight: 700, color: COL.S5 },
          data: cross,
        } : { data: [] },
      },
    ],
  }, true);

  updateReadouts(s);
}

function updateReadouts(s) {
  const n = s.years.length - 1;
  const gap2026 = s.S5[0] - s.S1[0];
  const gap2040 = s.S5[n] - s.S1[n];
  const closed = gap2026 !== 0 ? (1 - gap2040 / gap2026) * 100 : 0;
  const xYear = crossoverYear(s);
  const metrics = [
    { k: "Crossover", v: xYear ? xYear : "none", u: xYear ? "SOEC = grey" : "within horizon" },
    { k: "SOEC 2040", v: s.S5[n].toFixed(2), u: "USD/kg" },
    { k: "Grey 2040", v: s.S1[n].toFixed(2), u: "USD/kg" },
    { k: "Gap 2040", v: gap2040.toFixed(2), u: "USD/kg (SOEC−grey)" },
    { k: "Gap closed", v: closed.toFixed(0) + "%", u: "2026 → 2040" },
  ];
  $("readouts").innerHTML = metrics.map((m) =>
    `<div class="metric"><div class="k">${m.k}</div><div class="v">${m.v}</div><div class="u">${m.u}</div></div>`
  ).join("");
}

function resetAll() {
  for (const s of SLIDERS) controls[s.key].value = defaults[s.key];
  for (const t of TOGGLES) controls[t.key].checked = defaults[t.key];
  updateLabels(); render();
}

function main() {
  ({ buildModel, computeSeries, computeBands, crossoverYear } = window.TEA);
  const params = window.TEA_PARAMS;
  if (!params) {
    document.querySelector(".app").innerHTML =
      `<div class="err">Could not find <code>data/params.js</code>. Re-run
       <code>python -m python_model.export_terminal</code> to generate it.</div>`;
    return;
  }
  model = buildModel(params);
  $("ng-tag").textContent = "snapshot " + params.meta.exported;
  buildControls(params);
  chart = echarts.init($("chart"));
  window.addEventListener("resize", () => chart.resize());
  updateLabels();
  render();
  $("reset").addEventListener("click", resetAll);
}

// Boot only once all dependencies are present (engine.js, params.js, echarts)
// and the DOM is ready — robust to any script load order or async timing.
function _depsReady() {
  return window.TEA && window.TEA_PARAMS && window.echarts &&
         document.getElementById("sliders");
}
function _boot(tries) {
  tries = tries || 0;
  if (!_depsReady()) {
    if (tries > 200) { window.__appError = "dependencies never loaded"; return; }
    return void setTimeout(() => _boot(tries + 1), 50);
  }
  try { main(); }
  catch (e) { window.__appError = e.message + " | " + (e.stack || ""); }
}
window.__boot = _boot;
_boot();

window.TEA_PARAMS = {
  "meta": {
    "exported": "2026-06-30",
    "refyear": 2026,
    "ng_price_mmbtu": 3.6,
    "years": [
      2026,
      2040
    ],
    "note": "Snapshot of the Excel TEA model. Decoupled: re-run export_terminal.py to refresh."
  },
  "scalars": {
    "Benchmark_protected_year": 1.52615775,
    "Carbon_anchor": 75.4,
    "Carbon_CAGR": 0.04781708493133907,
    "Carbon_endpoint": 145,
    "Carbon_EUR": 75.4,
    "Carbon_USD": 81.43200000000002,
    "CBAM_factor_year": 0.975,
    "CBAM_phase_sel": "On",
    "CF_plant": 0.85,
    "CPI_last_actual": 2025,
    "CPI_proj_rate": 0.025,
    "CPI_ref": 329.94749999999993,
    "CRF": 0.09367877905196811,
    "EF_blended": 0.5152000000000001,
    "EF_grid_current": 0.56,
    "Elec_baseline_sel": "Tariff",
    "FX_EURUSD": 1.08,
    "GridRE_sel": 0.08,
    "H2_capacity_MW": 100,
    "H2_per_NH3": 180,
    "HX_cost_kW": 150,
    "LCOE_blended": 0.04077705387312719,
    "LCOE_NG": 0.07580021332458155,
    "LCOE_NonRE": 0.036,
    "LCOE_OffWind": 0.1577689671660822,
    "LCOE_OnWind": 0.07327156645029038,
    "LCOE_OppGas": 0.1346175030599755,
    "LCOE_PPA": 0.05,
    "LCOE_PPA_year": 2026,
    "LCOE_RE_weighted": 0.09571317341408989,
    "LCOE_Solar": 0.09571317341408989,
    "LCOE_Tidal": 0.1577689671660822,
    "Lifetime": 25,
    "NH3_bench_base": 1.57,
    "NH3_bench_rate": 0.003,
    "NH3_exports_EU": 800000,
    "NH3_price": 450,
    "NH3_prod": 4500000,
    "OpHours": 8760,
    "PEM_BEC": 1055,
    "PEM_FOM_pct": 0.05,
    "PEM_kWhkg": 55.5,
    "PEM_stack_cost": 262.16205037059507,
    "PEM_stack_h": 40000,
    "PEM_TASC_USD": 2383.2913670054095,
    "PEM_VOM": 0.024,
    "Pipe_cost_m": 500,
    "RE_OffWind_share": 0,
    "RE_OnWind_share": 0,
    "RE_share": 0.08,
    "RE_Solar_share": 1,
    "RE_Tidal_share": 0,
    "RefYear": 2026,
    "SMR_aux_kWhkg": 0.131,
    "SMR_BEC": 218.5690098374838,
    "SMR_EF": 9,
    "SMR_eff": 0.7,
    "SMR_FOM": 27.796913787200037,
    "SMR_NGcons": 47.614285714285714,
    "SMR_NGprice": 0.012283754734363805,
    "SMR_NGprice_MMBtu": 3.6,
    "SMR_TASC_USD": 508.89809404106705,
    "SMR_VOM": 0.04963732153875284,
    "SOEC_FOM": 22.292151881720425,
    "SOEC_kWhkg_active": 41.28,
    "SOEC_kWhkg_noWH": 50.25,
    "SOEC_kWhkg_WH": 41.28,
    "SOEC_stack_cost": 207.613321385902,
    "SOEC_stack_h": 18400,
    "SOEC_TASC_ref": 922,
    "SOEC_TASC_USD": 3831.1490674340516,
    "SOEC_VOM": 0.06175839307048983,
    "Tariff_TTEC": 0.036,
    "WACC": 0.08,
    "WH_CAPEX_MUSD": 1.525,
    "WH_dist_m": 50,
    "WH_duty_MW": 10,
    "WH_sel": "On"
  },
  "tables": {
    "cpi": [
      [
        2010,
        218.1
      ],
      [
        2011,
        224.9
      ],
      [
        2012,
        229.6
      ],
      [
        2013,
        233.0
      ],
      [
        2014,
        236.7
      ],
      [
        2015,
        237.0
      ],
      [
        2016,
        240.0
      ],
      [
        2017,
        245.1
      ],
      [
        2018,
        251.1
      ],
      [
        2019,
        255.7
      ],
      [
        2020,
        258.8
      ],
      [
        2021,
        271.0
      ],
      [
        2022,
        292.7
      ],
      [
        2023,
        304.7
      ],
      [
        2024,
        313.7
      ],
      [
        2025,
        321.9
      ],
      [
        2026,
        329.94749999999993
      ],
      [
        2027,
        338.19618749999995
      ],
      [
        2028,
        346.65109218749996
      ],
      [
        2029,
        355.3173694921874
      ],
      [
        2030,
        364.2003037294921
      ],
      [
        2031,
        373.3053113227293
      ],
      [
        2032,
        382.6379441057976
      ],
      [
        2033,
        392.2038927084425
      ],
      [
        2034,
        402.00899002615347
      ],
      [
        2035,
        412.0592147768073
      ],
      [
        2036,
        422.3606951462275
      ],
      [
        2037,
        432.91971252488315
      ],
      [
        2038,
        443.7427053380052
      ],
      [
        2039,
        454.8362729714553
      ],
      [
        2040,
        466.20717979574175
      ]
    ],
    "carbon_nom_eur": [
      [
        2026,
        75.4
      ],
      [
        2027,
        79.00540820382297
      ],
      [
        2028,
        82.78321651794029
      ],
      [
        2029,
        86.74166861306807
      ],
      [
        2030,
        90.8894023482252
      ],
      [
        2031,
        95.23546861966894
      ],
      [
        2032,
        99.78935111113152
      ],
      [
        2033,
        104.56098698845572
      ],
      [
        2034,
        109.56078858378734
      ],
      [
        2035,
        114.79966611664278
      ],
      [
        2036,
        120.28905150143164
      ],
      [
        2037,
        126.04092329338584
      ],
      [
        2038,
        132.06783282733005
      ],
      [
        2039,
        138.38293160633236
      ],
      [
        2040,
        145.00000000000006
      ]
    ],
    "cbam_phase_factor": [
      [
        2026,
        0.975
      ],
      [
        2027,
        0.95
      ],
      [
        2028,
        0.9
      ],
      [
        2029,
        0.775
      ],
      [
        2030,
        0.515
      ],
      [
        2031,
        0.39
      ],
      [
        2032,
        0.265
      ],
      [
        2033,
        0.14
      ]
    ]
  },
  "scenario_labels": {
    "S1": "Grey SMR",
    "S2": "PEM + fossil grid",
    "S3": "SOEC + fossil grid",
    "S4": "SOEC + greening grid",
    "S5": "SOEC + RE PPA"
  },
  "trajectory_defaults": {
    "ppa_decline": 0.04,
    "soec_decline": 0.06,
    "pem_decline": 0.03,
    "ppa_decline_range": [
      0.03,
      0.05
    ],
    "soec_decline_range": [
      0.04,
      0.08
    ],
    "pem_decline_range": [
      0.02,
      0.04
    ],
    "grid_re_end": 0.5,
    "grid_re_end_year": 2040
  }
};

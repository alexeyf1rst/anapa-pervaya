/* Первая линия — движок калькулятора «объект против вклада».
   Формулы: research/07-voronka.md §5.6. Помесячная модель, три сценария.
   Работает в браузере (window.PLCalc) и в Node (module.exports) — для тестов. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PLCalc = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SCEN = ["min", "base", "max"];

  /* выбор профиля: формат × стадия × цель (07 §5.4) */
  function pickProfile(a, C) {
    var f = a.format, st = a.stage, g = a.goal;
    if (f === "apart") return st === "pit" ? ["apart_offplan", "apart_ready"] : ["apart_ready", "apart_offplan"];
    if (f === "flat") {
      if (st === "pit") return ["kotlovan", "flat_long"];
      return g === "growth" || g === "inflation" ? ["flat_long", "flat_daily"] : ["flat_daily", "flat_long"];
    }
    if (f === "land") return ["land", "kotlovan"];
    // «не знаю, подберите» — с учётом бюджета
    var th = (C && C.thresholds) || {};
    if (a.price < th.flatMinPrice) return ["land", "kotlovan"];
    if (a.price < th.apartMinPrice) {
      if (g === "growth" || st === "pit") return ["kotlovan", "flat_long"];
      return g === "inflation" ? ["flat_long", "flat_daily"] : ["flat_daily", "flat_long"];
    }
    if (g === "growth") return ["kotlovan", "apart_offplan"];
    if (st === "pit") return g === "self" ? ["kotlovan", "flat_daily"] : ["apart_offplan", "kotlovan"];
    return g === "self" ? ["flat_daily", "flat_long"] : ["apart_ready", "flat_daily"];
  }

  function annuity(L, i, n) { return i === 0 ? L / n : (L * i) / (1 - Math.pow(1 + i, -n)); }

  /* один сценарий: помесячный ряд капитала «объект» и «вклад» */
  function runScenario(C, p, s, input) {
    var fmt = C.formats[p];
    var P = input.price;
    var Th = C.horizonYears[input.horizon];
    var r = C.deposit.rate[input.horizon];
    var rm = Math.pow(1 + r, 1 / 12) - 1;
    var months = 12 * Math.max(5, Th);
    var Tc = 12 * (fmt.buildYears + (s === "min" ? fmt.delayYearsBad : 0));

    // доходность с учётом собственного проживания (только посуточная + цель «для себя»)
    var y = fmt.yield[s];
    var ownUseLoss = 0;
    if (p === "flat_daily" && input.goal === "self" && input.weeks > 0) {
      var loss = (input.weeks * 7 * fmt.adrSeason[s] * fmt.occupancySeason[s] * (1 - fmt.ukFee[s] - fmt.platformFee)) / fmt.referencePrice;
      ownUseLoss = loss * P;
      y = Math.max(0, y - loss);
    }

    var gB = fmt.growthBuild ? fmt.growthBuild[s] : 0;
    var gR = fmt.growthReady[s];
    var mB = Math.pow(1 + gB, 1 / 12), mR = Math.pow(1 + gR, 1 / 12);

    // схема оплаты
    var pay = input.pay, CF0 = P, L = 0, A = 0, iM = 0, B = 0, instI = 0, instN = 0, markup = 0;
    if (pay === "mortgage") {
      var dp = C.mortgage.downPayment[fmt.kind];
      CF0 = P * dp; L = P - CF0; iM = C.mortgage.rate[s] / 12;
      A = annuity(L, iM, C.mortgage.termYears * 12); B = L;
    } else if (pay === "installment") {
      var ins = C.installment;
      CF0 = P * ins.downPayment; markup = ins.markup; instN = ins.months;
      instI = (P * (1 - ins.downPayment) * (1 + markup)) / ins.months;
    }

    var V = P, pocket = 0, D = CF0, depYearInterest = 0;
    var propTaxM = (P * fmt.cadastralRatio * fmt.propertyTax) / 12;
    var W = [CF0], Dep = [CF0], Nfirst = null, Rfirst = null;
    var taxFree = C.deposit.taxFreePerYear;

    for (var k = 1; k <= months; k++) {
      V *= k <= Tc ? mB : mR;
      var R = k > Tc ? (P * y) / 12 : 0;
      var tax = R * fmt.incomeTax + (k > Tc || fmt.propertyTaxAlways ? propTaxM : 0);
      var N = R - tax;
      if (k === Tc + 1) { Nfirst = N; Rfirst = R; }

      var payM = 0;
      if (pay === "mortgage") { B = B * (1 + iM) - A; if (B < 0) B = 0; payM = A; }
      var Ik = pay === "installment" && k <= instN ? instI : 0;
      var U = pay === "installment" ? instI * Math.max(0, instN - k) : 0;

      pocket = pocket * (1 + rm) + N - payM - Ik;

      var net = V * (1 - fmt.sellCost);
      var saleTax = k < 12 * C.sale.minHoldingYears ? Math.max(0, net - P * (1 + markup)) * C.sale.taxRate : 0;
      W.push(net - saleTax - (pay === "mortgage" ? B : 0) - U + pocket);

      var di = D * rm;
      D += di; depYearInterest += di;
      if (k % 12 === 0) {
        D -= Math.max(0, depYearInterest - taxFree) * C.deposit.taxRate;
        depYearInterest = 0;
      }
      Dep.push(D);
    }

    var hasRent = fmt.yield[s] > 0 && p !== "kotlovan" && p !== "land";
    var incMonth = Nfirst || 0;
    var res = {
      profile: p, scenario: s, CF0: CF0, Tc: Tc, rate: r, Th: Th,
      W: W, Dep: Dep,
      incMonth: hasRent ? incMonth : null,
      incYear: hasRent ? incMonth * 12 : null,
      yieldPct: hasRent ? (incMonth * 12) / P : null,
      payback: hasRent && incMonth > 0 ? P / (incMonth * 12) + Tc / 12 : null,
      landTaxMonth: p === "land" ? -propTaxM : null,
      mortgagePay: A, rentMonth: Rfirst ? Rfirst - Rfirst * fmt.incomeTax : 0,
      ownUseLoss: ownUseLoss,
      capH: W[12 * Th], depH: Dep[12 * Th],
      cap3: W[36], dep3: Dep[36], cap5: W[60], dep5: Dep[60]
    };
    res.equiv = pay === "cash" ? Math.pow(res.capH / P, 1 / Th) - 1 : null;
    return res;
  }

  function calculate(C, input) {
    var profiles = pickProfile(input, C);
    var p = profiles[0], alt = profiles[1];
    var out = { profile: p, alt: alt, fmt: C.formats[p], input: input, sc: {} };
    SCEN.forEach(function (s) { out.sc[s] = runScenario(C, p, s, input); });

    var b = out.sc.base, bad = out.sc.min;
    var diff = b.capH - b.depH;
    var band = C.thresholds.verdictBand * b.CF0;
    out.verdict = diff > band ? "win" : diff < -band ? "lose" : "even";
    out.diff = diff;
    out.badDiff = bad.capH - bad.depH;
    // если ставка вклада не снизится: весь срок по ставке «1–3 года» (для «до 1 года» — по своей)
    var flatKey = input.horizon === "lt1" ? "lt1" : "y1_3";
    if (flatKey !== input.horizon) {
      var C2 = JSON.parse(JSON.stringify(C));
      Object.keys(C2.deposit.rate).forEach(function (k) { C2.deposit.rate[k] = C.deposit.rate[flatKey]; });
      var b2 = runScenario(C2, p, "base", input);
      out.flatRate = { rate: C.deposit.rate[flatKey], diff: b2.capH - b2.depH };
    }

    // альтернатива (базовый сценарий, полная оплата для сопоставимости)
    var altIn = Object.assign({}, input, { pay: "cash" });
    var a = runScenario(C, alt, "base", altIn);
    out.altRes = { profile: alt, label: C.formats[alt].short, equiv5: Math.pow(a.cap5 / input.price, 1 / 5) - 1, cap5: a.cap5 };

    // предупреждения (07 §5.6 п.15)
    var w = [], fmt = C.formats[p];
    if (fmt.buildYears > 0 && input.horizon === "lt1") w.push({ k: "build", n: fmt.buildYears });
    if (input.pay === "mortgage" && (b.incMonth || 0) < b.mortgagePay) w.push({ k: "mortgage", gap: b.mortgagePay - Math.max(0, b.incMonth || 0) });
    if (fmt.kind === "apart" && input.price < C.thresholds.apartMinPrice) w.push({ k: "apartMin" });
    if (fmt.kind === "flat" && input.price < C.thresholds.flatMinPrice) w.push({ k: "flatMin" });
    if (p === "land" && (input.horizon === "lt1" || input.horizon === "y1_3")) w.push({ k: "land" });
    if (input.goal === "self" && p === "flat_daily" && input.weeks > 0) w.push({ k: "weeks", n: input.weeks, loss: b.ownUseLoss });
    if (fmt.kind === "flat" && input.pay === "mortgage") w.push({ k: "family" });
    out.warnings = w;
    return out;
  }

  return { calculate: calculate, pickProfile: pickProfile, runScenario: runScenario };
});

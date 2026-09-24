/* ==========================================================================
   НАСТРОЙКИ САЙТА И КАЛЬКУЛЯТОРА — меняются без программиста.
   Правьте только значения. Доли пишутся десятичной дробью: 0.08 = 8%.
   min / base / max = ПЛОХОЙ / БАЗОВЫЙ / ХОРОШИЙ сценарий для инвестора
   (поэтому у комиссии УК и ставки ипотеки min больше, чем max).
   Источники — рядом с цифрами и в research/07-voronka.md §5.5.
   Данные рынка на 23.09.2026. Пересматривать после заседаний ЦБ.
   ========================================================================== */

window.SITE_CONFIG = {
  /* ---------- контакты ---------- */
  phone: "+7 (991) 779-39-15",
  phoneHref: "tel:+79917793915",
  telegram: "https://t.me/the_firstline",
  telegramHandle: "@the_firstline",
  vk: "https://vk.com/first_line_anapa",
  whatsapp: "https://wa.me/79917793915", // пусто = кнопка скрыта
  max: "",      // [ЗАПОЛНИТЬ] ссылка на MAX — пусто = кнопка скрыта
  founders: "https://t.me/the_firstline", // [ЗАПОЛНИТЬ] отдельный контакт основателей

  /* ---------- заявки ---------- */
  // send.php пересылает заявку в Telegram-чат и CRM (токены — в send.php на сервере)
  formEndpoint: "send.php",
  thankYouPage: "spasibo.html",

  /* ---------- аналитика ---------- */
  metrikaId: null, // [ЗАПОЛНИТЬ] номер счётчика Яндекс Метрики, например 98765432

  /* ---------- поведение ---------- */
  exitPopup: { enabled: true, minSeconds: 20, mobileIdleSec: 60 },
  dataDate: "23.09.2026",

  /* ---------- подзаголовок первого экрана по utm_content / utm_campaign ---------- */
  heroByUtm: {
    apart: "Апарт-отели под управлением: считаем 12 месяцев, а не лето. Комиссия УК, налоги, межсезонье — и сколько в итоге остаётся вам. Каждый номер сравниваем с вкладом на ту же сумму.",
    kotlovan: "Котлован в Анапе: считаем рост цены до сдачи, расходы на выход и что будет, если сдачу перенесут на год. И сравниваем с вкладом за тот же срок.",
    sebe: "Своё у моря, которое сдаётся, пока вас нет. Считаем, сколько стоят ваши недели у моря и сколько квартира заработает за год, — и сравниваем с вкладом.",
    zemlya: "Земля у моря: проверяем назначение, зоны ограничений и сети до задатка. И считаем, сколько участок реально может вырасти в цене."
  }
};

window.CALC_CONFIG = {
  version: "2026-09-23",
  dataDate: "23.09.2026",
  disclaimer: "Это прогноз на открытых рыночных данных на 23.09.2026, а не гарантия доходности, не публичная оферта и не индивидуальная инвестиционная рекомендация. Фактический доход зависит от объекта, управляющей компании, сезона и налогового режима.",

  /* бюджет = стоимость объекта, ₽ */
  budget: { min: 3000000, max: 50000000, default: 10000000, stepSmall: 500000, stepLarge: 1000000, stepSwitchAt: 20000000, maxLabel: "50+ млн" },

  /* горизонт, лет */
  horizonYears: { lt1: 1, y1_3: 3, y3_5: 5, gt5: 7 },

  deposit: {
    // ставка вклада на весь расчёт в зависимости от горизонта
    rate: {
      lt1: 0.13,    // средняя макс. ставка топ-10 банков 13,005% — ЦБ, II декада 09.2026
      y1_3: 0.1164, // вклады свыше 1 года 11,64% — Интерфакс/ЦБ, 09.2026
      y3_5: 0.10,   // оценка: средняя за период с учётом снижения ставки
      gt5: 0.09     // оценка
    },
    taxRate: 0.13,
    taxFreePerYear: 140000 // 1 млн × макс. ключевая ставка года (14%) — [ПРОВЕРИТЬ]
  },

  inflation: { min: 0.07, base: 0.065, max: 0.06 }, // прогноз ЦБ на 2026: 6–7%

  mortgage: {
    rate: { min: 0.194, base: 0.1873, max: 0.159 }, // СПРОСИ.ДОМ.РФ, 16.09.2026
    termYears: 20,
    downPayment: { flat: 0.2, apart: 0.3, land: 0.5 }, // оценка
    family: { rate: 0.06, limit: 6000000 }             // только жильё
  },

  installment: { downPayment: 0.3, months: 12, markup: 0.0 }, // ориентир; уточнять по объекту

  sale: { taxRate: 0.13, minHoldingYears: 5 }, // НК РФ ст. 217.1 — [ПРОВЕРИТЬ], в части случаев 3 года

  ownUse: { defaultWeeks: 4, maxWeeks: 12 },

  thresholds: { verdictBand: 0.05, apartMinPrice: 11000000, flatMinPrice: 4900000 },

  /* ---------- профили расчёта ---------- */
  formats: {
    apart_ready: {
      label: "Апарт-отель под управлением, готовый", short: "Апарт-номер, готовый", kind: "apart",
      yield: { min: 0.06, base: 0.08, max: 0.10 },           // после УК и расходов, до налогов
      growthBuild: null,
      growthReady: { min: 0.0, base: 0.03, max: 0.05 },       // оценка
      buildYears: 0, delayYearsBad: 0,
      occupancySeason: { min: 0.60, base: 0.75, max: 0.85 },  // справочно, уже в доходности
      occupancyOff: { min: 0.20, base: 0.25, max: 0.30 },
      ukFee: { min: 0.30, base: 0.25, max: 0.15 },
      incomeTax: 0.13, propertyTax: 0.01, cadastralRatio: 0.7, sellCost: 0.03
    },
    apart_offplan: {
      label: "Апарт-отель на этапе строительства", short: "Апарт-номер на стройке", kind: "apart",
      yield: { min: 0.06, base: 0.08, max: 0.10 },
      growthBuild: { min: 0.03, base: 0.08, max: 0.12 },
      growthReady: { min: 0.0, base: 0.03, max: 0.05 },
      buildYears: 2, delayYearsBad: 1,
      occupancySeason: { min: 0.60, base: 0.75, max: 0.85 },
      occupancyOff: { min: 0.20, base: 0.25, max: 0.30 },
      ukFee: { min: 0.30, base: 0.25, max: 0.15 },
      incomeTax: 0.13, propertyTax: 0.01, cadastralRatio: 0.7, sellCost: 0.04
    },
    flat_daily: {
      label: "Квартира под посуточную аренду с управляющим", short: "Квартира посуточно", kind: "flat",
      yield: { min: 0.015, base: 0.03, max: 0.055 }, // наш расчёт по формуле из 01 на эталонном лоте 7 млн
      growthBuild: null,
      growthReady: { min: 0.0, base: 0.03, max: 0.05 },
      buildYears: 0, delayYearsBad: 0,
      adrSeason: { min: 3500, base: 4000, max: 4400 },
      adrOff: { min: 2000, base: 2500, max: 3000 },
      nightsSeason: 122, nightsOff: 243,
      occupancySeason: { min: 0.60, base: 0.75, max: 0.85 },
      occupancyOff: { min: 0.20, base: 0.25, max: 0.30 },
      ukFee: { min: 0.30, base: 0.25, max: 0.15 },
      platformFee: 0.10, utilitiesYear: 96000, wearReserve: 0.05, referencePrice: 7000000,
      incomeTax: 0.04, propertyTax: 0.001, cadastralRatio: 0.7, sellCost: 0.03
    },
    flat_long: {
      label: "Квартира под долгосрочную аренду", short: "Квартира в долгосрочную аренду", kind: "flat",
      yield: { min: 0.02, base: 0.04, max: 0.05 },
      growthBuild: null,
      growthReady: { min: 0.0, base: 0.03, max: 0.05 },
      buildYears: 0, delayYearsBad: 0,
      incomeTax: 0.04, propertyTax: 0.001, cadastralRatio: 0.7, sellCost: 0.03
    },
    kotlovan: {
      label: "Квартира на котловане под перепродажу", short: "Котлован под перепродажу", kind: "flat",
      yield: { min: 0.02, base: 0.04, max: 0.05 }, // после сдачи — как долгосрочная аренда
      growthBuild: { min: 0.03, base: 0.08, max: 0.12 },
      growthReady: { min: 0.0, base: 0.03, max: 0.05 },
      buildYears: 2, delayYearsBad: 1,
      incomeTax: 0.04, propertyTax: 0.001, cadastralRatio: 0.7, sellCost: 0.04
    },
    land: {
      label: "Земельный участок под рост стоимости", short: "Земля", kind: "land",
      yield: { min: 0, base: 0, max: 0 },
      growthBuild: null,
      growthReady: { min: 0.0, base: 0.03, max: 0.05 },
      buildYears: 0, delayYearsBad: 0,
      incomeTax: 0, propertyTax: 0.003, cadastralRatio: 0.7, propertyTaxAlways: true, sellCost: 0.05
    }
  },

  /* ---------- источники для «Как посчитано» ---------- */
  sources: {
    apartYield: [["BARNES, 08.2025", "https://barn-estate.ru/media/blog/top-napravleniy-gde-razvivayut-kurortnuyu-nedvizhimost-rossii/"], ["Известия, 05.2026", "https://iz.ru/2093772/iana-shturma/burnye-apartamenty-investory-teriaiut-interes-k-kvartiram"], ["Эксперт ЮГ (MACON)", "https://expertsouth.ru/articles/servisnye-apartamenty-na-yuge-dokhod-vysok-no-riski-tozhe/"]],
    flatLongYield: [["РБК Недвижимость, 06.2026", "https://realty.rbc.ru/news/6a39e0769a79478e356935c5"]],
    adr: [["Авито через u-f.ru, 09.2026", "https://u-f.ru/news/economics/u19761/2026/09/18/425388"], ["АиФ-Юг, 07.2026", "https://kuban.aif.ru/society/s-nachala-2026-goda-v-anape-na-12-podorozhala-posutochnaya-arenda-zhilya"]],
    occupancy: [["АиФ-Юг, 09.2026", "https://kuban.aif.ru/society/sochi-pusteet-anapa-v-tope-itogi-letnego-sezona-na-kurortah-kubani"], ["Hotel.Report", "https://ru.hotel.report/development/servisnye-apartamenty-illyuzii-u-morya-ili-iskusstvo-teryat-dengi-s-izyashhestvom"]],
    ukFee: [["Morein, 03.2026", "https://morein.pro/guides/upravlyayushchaya-kompaniya"]],
    growthBuild: [["Мир квартир, 08.2026", "https://www.mirkvartir.ru/journal/analytics/2026/08/24/novostrojki-na/"], ["bnMAP", "https://krasnodarmedia.su/news/2504111/"], ["РБК / Дом.РФ", "https://realty.rbc.ru/news/669779309a794776b832eef3"]],
    landGrowth: [["ДГ-Юг / «Этажи», 09.2026", "https://www.dg-yug.ru/news/20253644.html"]],
    deposit: [["ЦБ РФ", "https://www.cbr.ru/statistics/avgprocstav/"], ["Интерфакс", "https://www.interfax.ru/business/1117741"]],
    mortgage: [["СПРОСИ.ДОМ.РФ, 16.09.2026", "https://xn--h1alcedd.xn--d1aqf.xn--p1ai/news/obzor-stavok-po-ipoteke-v-bankakh-na-16-sentyabrya-2026-goda/"]],
    npd: [["ФНС", "https://npd.nalog.ru/"]],
    inflation: [["ЦБ РФ", "https://www.cbr.ru/press/keypr/"]]
  }
};

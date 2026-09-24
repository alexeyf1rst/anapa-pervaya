/* Первая линия — логика сайта: квиз-калькулятор, формы, попапы, аналитика */
(function () {
  "use strict";

  var SITE = window.SITE_CONFIG || {};
  var CALC = window.CALC_CONFIG || {};
  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || location.protocol === "file:";

  doc.documentElement.classList.remove("no-js");

  /* ------------------------------------------------------------------
     Хранилище (без падений в приватном режиме)
  ------------------------------------------------------------------ */
  var store = {
    get: function (k, s) { try { return JSON.parse((s ? sessionStorage : localStorage).getItem(k)); } catch (e) { return null; } },
    set: function (k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ------------------------------------------------------------------
     Яндекс Метрика и цели (список целей — research/10-proverka.md)
  ------------------------------------------------------------------ */
  if (SITE.metrikaId) {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, doc, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    window.ym(SITE.metrikaId, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  }
  function goal(name, params) {
    try { if (SITE.metrikaId && window.ym) window.ym(SITE.metrikaId, "reachGoal", name, params || {}); } catch (e) {}
    if (isLocal && window.console) console.info("[goal]", name, params || "");
  }
  window.plGoal = goal;
  function clientId() {
    var id = "";
    try { if (SITE.metrikaId && window.ym) window.ym(SITE.metrikaId, "getClientID", function (c) { id = c; }); } catch (e) {}
    return id;
  }
  doc.addEventListener("click", function (e) {
    var el = e.target.closest("[data-goal]");
    if (el) goal(el.getAttribute("data-goal"));
    var a = e.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href");
    if (h.indexOf("tel:") === 0) goal("click_phone");
    else if (h.indexOf("t.me") > -1) goal("click_telegram");
    else if (h.indexOf("wa.me") > -1) goal("click_whatsapp");
    else if (h.indexOf("vk.com") > -1) goal("click_vk");
  });

  /* ------------------------------------------------------------------
     UTM-метки: сохраняем первое касание и передаём в каждую заявку
  ------------------------------------------------------------------ */
  var params = new URLSearchParams(location.search);
  (function () {
    var keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "yclid", "gclid"];
    var found = {};
    keys.forEach(function (k) { if (params.get(k)) found[k] = params.get(k); });
    if (Object.keys(found).length) {
      found.landing = location.href; found.referrer = doc.referrer || ""; found.ts = new Date().toISOString();
      store.set("pl_utm", found);
    } else if (!store.get("pl_utm")) {
      store.set("pl_utm", { referrer: doc.referrer || "", landing: location.href, ts: new Date().toISOString() });
    }
  })();

  /* подзаголовок первого экрана по utm_content / utm_campaign */
  (function () {
    var sub = $("[data-hero-sub]");
    if (!sub || !SITE.heroByUtm) return;
    var v = (params.get("utm_content") || params.get("utm_campaign") || "").toLowerCase();
    Object.keys(SITE.heroByUtm).some(function (k) {
      if (v.indexOf(k) > -1) { sub.textContent = SITE.heroByUtm[k]; return true; }
      return false;
    });
  })();

  /* ------------------------------------------------------------------
     Контакты из конфига
  ------------------------------------------------------------------ */
  $$("[data-phone]").forEach(function (el) { el.textContent = SITE.phone; if (el.tagName === "A") el.href = SITE.phoneHref; });
  $$("[data-link]").forEach(function (el) {
    var key = el.getAttribute("data-link");
    if (SITE[key]) el.href = SITE[key]; else el.remove();
  });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ------------------------------------------------------------------
     Шапка, мобильное меню, закреплённая кнопка
  ------------------------------------------------------------------ */
  var header = $(".header");
  var sticky = $(".sticky-cta");
  var hero = $(".hero");
  var formZonesVisible = 0;
  var heroCtas = $(".hero__ctas"), heroCtaVisible = true;
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 30);
    if (sticky) {
      var limit = hero ? hero.offsetHeight * 0.7 : 500;
      var past = heroCtas ? !heroCtaVisible : y > limit;
      var show = past && !doc.body.classList.contains("popup-open") && formZonesVisible === 0;
      sticky.classList.toggle("is-visible", show);
      doc.body.classList.toggle("has-sticky", y > limit);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  if ("IntersectionObserver" in window) {
    var zoneIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var was = en.target._vis || false;
        if (en.isIntersecting !== was) { formZonesVisible += en.isIntersecting ? 1 : -1; en.target._vis = en.isIntersecting; }
      });
      onScroll();
    }, { threshold: 0.25 });
    $$("[data-hide-sticky]").forEach(function (el) { zoneIO.observe(el); });
    if (heroCtas) new IntersectionObserver(function (en) { heroCtaVisible = en[0].isIntersecting || en[0].boundingClientRect.top > 0; onScroll(); }).observe(heroCtas);
  }
  onScroll();

  var burger = $(".burger");
  var menu = $(".mobile-menu");
  function setMenu(open) {
    if (!burger || !menu) return;
    burger.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    doc.body.style.overflow = open ? "hidden" : "";
  }
  if (burger) burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
  if (menu) menu.addEventListener("click", function (e) { if (e.target.closest("a, button")) setMenu(false); });

  /* плавная прокрутка к якорям (без CSS scroll-behavior) */
  doc.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || a.hasAttribute("data-quiz-preset")) return;
    var id = a.getAttribute("href").slice(1);
    var t = id ? doc.getElementById(id) : null;
    if (!t) return;
    if (a.hasAttribute("data-mobile-popup") && window.innerWidth < 1024) return;
    e.preventDefault();
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 72, behavior: reduce ? "auto" : "smooth" });
    history.replaceState(null, "", "#" + id);
  });

  /* ------------------------------------------------------------------
     Появление при скролле
  ------------------------------------------------------------------ */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ------------------------------------------------------------------
     Формы
     <form data-form="portfolio" data-cta="…" data-note="…" data-extra-field="link|cadastre|object"
           data-hidden="segment=biz"> — поля рисуются автоматически
  ------------------------------------------------------------------ */
  var MESSENGERS = [
    { v: "telegram", t: "Telegram" },
    { v: "whatsapp", t: "WhatsApp" },
    { v: "max", t: "MAX" },
    { v: "call", t: "Позвоните мне" }
  ];
  var EXTRA_FIELDS = {
    link: { label: "Ссылка на объект или презентацию", ph: "https://…", required: false },
    cadastre: { label: "Кадастровый номер или ссылка на объявление", ph: "23:37:…", required: true },
    object: { label: "Какой объект интересует (можно не знать)", ph: "Например, апарт-номер до 12 млн", required: false }
  };
  var formCounter = 0;

  function renderForm(form) {
    formCounter++;
    var id = "f" + formCounter;
    var cta = form.getAttribute("data-cta") || "Получить портфель";
    var note = form.getAttribute("data-note");
    if (note === null) note = "Бесплатно. Пришлём в выбранный мессенджер. Один выпуск в месяц, отписка одним сообщением.";
    var noMsg = form.hasAttribute("data-no-messenger");
    var row = form.classList.contains("form--row");
    var full = row ? " form__full" : "";
    var ex = EXTRA_FIELDS[form.getAttribute("data-extra-field")];
    var html =
      (ex ? '<div class="field' + full + '"><label for="' + id + 'x">' + ex.label + '</label><input id="' + id + 'x" name="extra" type="text" placeholder="' + ex.ph + '"' + (ex.required ? " required" : "") + "></div>" : "") +
      '<div class="field"><label for="' + id + 'n">Как к вам обращаться</label><input id="' + id + 'n" name="name" type="text" autocomplete="given-name" placeholder="Имя" required></div>' +
      '<div class="field"><label for="' + id + 'p">Телефон</label><input id="' + id + 'p" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" required></div>' +
      (noMsg ? "" :
        '<div class="messengers' + full + '"><span class="messengers__label">Куда прислать</span><div class="messengers__opts">' +
        MESSENGERS.map(function (m, i) {
          return '<label class="chip"><input type="radio" name="messenger" value="' + m.v + '"' + (i === 0 ? " checked" : "") + "><span>" + m.t + "</span></label>";
        }).join("") + "</div></div>") +
      '<label class="consent' + full + '"><input type="checkbox" name="consent" value="yes" required><span>Я даю согласие на <a href="soglasie.html" target="_blank">обработку персональных данных</a> в соответствии с <a href="politika.html" target="_blank">политикой обработки персональных данных</a>.</span></label>' +
      '<p class="form__error' + full + '" role="alert"></p>' +
      '<button class="btn btn--gold btn--block' + full + '" type="submit">' + cta + "</button>" +
      (note ? '<p class="form__note' + full + '">' + note + "</p>" : "");
    html += '<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">';
    form.insertAdjacentHTML("beforeend", html);
    form.noValidate = true;
    var phone = form.querySelector('[name="phone"]');
    phone.addEventListener("input", maskPhone);
    phone.addEventListener("focus", function () { if (!phone.value) phone.value = "+7 ("; });
    phone.addEventListener("blur", function () { if (phone.value === "+7 (") phone.value = ""; });
    form.addEventListener("submit", onSubmit);
    var started = false;
    form.addEventListener("input", function () {
      if (!started) { started = true; goal("form_start_" + (form.getAttribute("data-form") || "form")); }
    });
  }

  function maskPhone(e) {
    var input = e.target;
    var d = input.value.replace(/\D/g, "");
    if (d.charAt(0) === "8") d = "7" + d.slice(1);
    if (d.charAt(0) !== "7") d = "7" + d;
    d = d.slice(0, 11);
    var out = "+7";
    if (d.length > 1) out += " (" + d.slice(1, 4);
    if (d.length >= 4) out += ")";
    if (d.length > 4) out += " " + d.slice(4, 7);
    if (d.length > 7) out += "-" + d.slice(7, 9);
    if (d.length > 9) out += "-" + d.slice(9, 11);
    input.value = out;
  }

  function onSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var name = form.querySelector('[name="name"]');
    var phone = form.querySelector('[name="phone"]');
    var consent = form.querySelector('[name="consent"]');
    var extra = form.querySelector('[name="extra"]');
    var err = form.querySelector(".form__error");
    var msgs = [];
    $$(".field", form).forEach(function (f) { f.classList.remove("is-invalid"); });
    consent.closest(".consent").classList.remove("is-invalid");
    err.classList.remove("is-visible");

    if (extra && extra.required && extra.value.trim().length < 3) { extra.closest(".field").classList.add("is-invalid"); msgs.push("Укажите кадастровый номер или ссылку."); }
    if (name.value.trim().length < 2) { name.closest(".field").classList.add("is-invalid"); msgs.push("Как к вам обращаться?"); }
    if (phone.value.replace(/\D/g, "").length !== 11) { phone.closest(".field").classList.add("is-invalid"); msgs.push("Проверьте номер — не хватает цифр."); }
    if (!consent.checked) { consent.closest(".consent").classList.add("is-invalid"); msgs.push("Отметьте согласие — без него мы не сможем вам написать."); }
    if (msgs.length) { err.textContent = msgs.join(" "); err.classList.add("is-visible"); return; }

    var type = form.getAttribute("data-form") || "form";
    var msg = form.querySelector('[name="messenger"]:checked');
    var payload = {
      form: type,
      form_title: form.getAttribute("data-title") || "",
      form_place: form.getAttribute("data-place") || "",
      name: name.value.trim(),
      phone: phone.value,
      messenger: msg ? msg.value : "call",
      consent: true,
      page: location.href,
      utm: store.get("pl_utm") || {},
      client_id: clientId(),
      website: (form.querySelector('[name="website"]') || {}).value || "",
      ts: new Date().toISOString()
    };
    if (extra && extra.value.trim()) payload.extra = extra.value.trim();
    var hidden = form.getAttribute("data-hidden");
    if (hidden) payload.extra = (payload.extra ? payload.extra + " · " : "") + hidden;
    if (quiz.result) {
      payload.quiz = quiz.answersText();
      payload.calc = quiz.resultText();
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = "Отправляем…";

    function done() {
      goal("form_submit_" + type, { place: payload.form_place });
      store.set("pl_lead", { form: type, name: payload.name, messenger: payload.messenger }, true);
      if (quiz.result) store.set("pl_calc", { text: quiz.resultText(), answers: quiz.answersText() }, true);
      var url = (SITE.thankYouPage || "spasibo.html") + "?f=" + encodeURIComponent(type) + "&m=" + encodeURIComponent(payload.messenger);
      var went = false, go = function () { if (!went) { went = true; location.href = url; } };
      if (SITE.metrikaId && window.ym) {
        setTimeout(go, 600);
        try { window.ym(SITE.metrikaId, "reachGoal", "lead", { form: type, place: payload.form_place }, go); } catch (e) { go(); }
      } else { goal("lead"); go(); }
    }
    function fail() {
      btn.disabled = false;
      btn.textContent = label;
      err.innerHTML = 'Не отправилось. Напишите нам в Telegram <a href="' + SITE.telegram + '" target="_blank" rel="noopener">' + (SITE.telegramHandle || "") + '</a> или позвоните <a href="' + SITE.phoneHref + '">' + SITE.phone + "</a>.";
      err.classList.add("is-visible");
    }
    // на Netlify: заявка → панель заявок (/api/lead), при сбое — запасной канал Netlify Forms
    var onNetlify = SITE.formEndpoint === "netlify" || /\.netlify\.app$/.test(location.hostname);
    function netlifyForms() {
      return fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({
        "form-name": "lead", form: payload.form_title || type, form_place: payload.form_place, name: payload.name, phone: payload.phone,
        messenger: payload.messenger, extra: payload.extra || "", quiz: payload.quiz || "", calc: payload.calc || "",
        utm: JSON.stringify(payload.utm), page: payload.page, website: payload.website }).toString() });
    }
    var req = onNetlify
      ? fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
          .then(function (r) { return r.ok || r.status === 422 ? r : netlifyForms(); })
          .catch(netlifyForms)
      : fetch(SITE.formEndpoint || "send.php", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    req
      .then(function (r) {
        if (r.ok) return done();
        if (isLocal) { console.warn("[демо] send.php недоступен локально, заявка:", payload); return done(); }
        fail();
      })
      .catch(function () {
        if (isLocal) { console.warn("[демо] send.php недоступен локально, заявка:", payload); return done(); }
        fail();
      });
  }

  /* ------------------------------------------------------------------
     Попапы
  ------------------------------------------------------------------ */
  var lastFocus = null;
  function openPopup(id, source) {
    var p = doc.getElementById("popup-" + id);
    if (!p) return;
    closeAll(true);
    lastFocus = doc.activeElement;
    p.classList.add("is-open");
    p.setAttribute("aria-hidden", "false");
    doc.body.classList.add("popup-open");
    doc.body.style.overflow = "hidden";
    var f = p.querySelector("input:not([type=radio]):not([type=checkbox])");
    setTimeout(function () { if (f && window.matchMedia("(hover: hover)").matches) f.focus({ preventScroll: true }); }, 80);
    goal("popup_open_" + id, { source: source || "" });
    onScroll();
  }
  function closeAll(silent) {
    $$(".popup.is-open").forEach(function (p) { p.classList.remove("is-open"); p.setAttribute("aria-hidden", "true"); });
    doc.body.classList.remove("popup-open");
    doc.body.style.overflow = "";
    if (!silent && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    onScroll();
  }
  doc.addEventListener("click", function (e) {
    var o = e.target.closest("[data-popup]");
    if (o) { e.preventDefault(); openPopup(o.getAttribute("data-popup"), o.getAttribute("data-goal")); return; }
    if (e.target.closest("[data-close]") || e.target.classList.contains("popup")) closeAll();
  });
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape") return closeAll();
    if (e.key !== "Tab") return;
    var p = $(".popup.is-open");
    if (!p) return;
    var f = $$("a[href], button, input:not([name=website]), select, textarea", p).filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* «на мобильном — нижний лист с формой»: ссылки с data-mobile-popup открывают попап на телефоне */
  doc.addEventListener("click", function (e) {
    var a = e.target.closest("[data-mobile-popup]");
    if (a && window.innerWidth < 1024) { e.preventDefault(); openPopup(a.getAttribute("data-mobile-popup"), "mobile"); }
  }, true);

  /* попап при попытке уйти (07 §4.4) */
  (function () {
    var cfg = SITE.exitPopup || {};
    if (!cfg.enabled || !doc.getElementById("popup-exit")) return;
    var armed = false;
    setTimeout(function () { armed = true; }, (cfg.minSeconds || 20) * 1000);
    function fire(src) {
      if (!armed || store.get("pl_exit", true) || store.get("pl_lead", true) || doc.body.classList.contains("popup-open")) return;
      if (quiz.inProgress()) return; // не мешаем расчёту
      store.set("pl_exit", 1, true);
      openPopup("exit", src);
      goal("exit_popup_show");
    }
    doc.addEventListener("mouseout", function (e) { if (!e.relatedTarget && e.clientY < 10) fire("exit_intent"); });
    if (window.matchMedia("(hover: none)").matches) {
      var maxDepth = 0, idleT = null, lastY = window.scrollY, lastT = Date.now();
      window.addEventListener("scroll", function () {
        var h = doc.documentElement.scrollHeight - window.innerHeight;
        var y = window.scrollY, now = Date.now();
        maxDepth = Math.max(maxDepth, y / h);
        if (maxDepth > 0.4 && lastY - y > window.innerHeight * 0.3 && now - lastT < 500) fire("fast_scroll_up");
        if (now - lastT > 500) { lastY = y; lastT = now; }
        clearTimeout(idleT);
        if (maxDepth > 0.5) idleT = setTimeout(function () { fire("idle"); }, (cfg.mobileIdleSec || 60) * 1000);
      }, { passive: true });
    }
  })();

  /* ------------------------------------------------------------------
     Карточки сегментов «У каждой цели своя математика»
  ------------------------------------------------------------------ */
  $$("[data-segment]").forEach(function (tile) {
    tile.addEventListener("click", function () {
      var id = tile.getAttribute("data-segment");
      var panel = doc.getElementById("strategy-" + id);
      var isOpen = tile.getAttribute("aria-expanded") === "true";
      $$("[data-segment]").forEach(function (t) { t.setAttribute("aria-expanded", "false"); });
      $$(".strategy").forEach(function (s) { s.hidden = true; });
      if (!isOpen && panel) {
        tile.setAttribute("aria-expanded", "true");
        panel.hidden = false;
        goal("segment_open_" + id);
        // на мобильном панель стоит сразу под карточкой
        if (window.innerWidth < 1024) tile.after(panel); else $(".tiles").after(panel);
        var top = panel.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: top, behavior: "smooth" });
      }
    });
  });

  /* ------------------------------------------------------------------
     Слайдеры
  ------------------------------------------------------------------ */
  $$("[data-slider]").forEach(function (wrap) {
    var track = $(".slider__track", wrap);
    $$("[data-dir]", wrap).forEach(function (b) {
      b.addEventListener("click", function () {
        var card = track.firstElementChild;
        var w = card ? card.getBoundingClientRect().width + 12 : 300;
        track.scrollBy({ left: w * Number(b.getAttribute("data-dir")), behavior: "smooth" });
      });
    });
  });

  /* галереи объектов */
  $$("[data-gallery]").forEach(function (g) {
    var img = $(".obj__img", g);
    $$(".obj__thumbs button", g).forEach(function (b) {
      b.addEventListener("click", function () {
        img.src = b.getAttribute("data-src");
        img.classList.toggle("is-contain", b.getAttribute("data-fit") === "contain");
        $$(".obj__thumbs button", g).forEach(function (x) { x.classList.toggle("is-active", x === b); });
      });
    });
  });

  /* кнопки объектов: название объекта подставляется в форму попапа */
  doc.addEventListener("click", function (e) {
    var b = e.target.closest("[data-object]");
    if (!b) return;
    var p = doc.getElementById("popup-" + b.getAttribute("data-popup"));
    var f = p && p.querySelector('[name="extra"]');
    if (f) f.value = b.getAttribute("data-object");
  }, true);

  /* FAQ — цель на раскрытие; первые 3 открыты на десктопе */
  $$(".faq details").forEach(function (d, i) {
    if (i < 3 && window.innerWidth >= 1024) d.open = true;
    d.addEventListener("toggle", function () { if (d.open) goal("faq_open", { q: i + 1 }); });
  });

  /* ==================================================================
     КВИЗ-КАЛЬКУЛЯТОР (тексты — research/08-prototip.md §Q)
  ================================================================== */
  var STEPS = [
    { key: "goal", q: "Что вы хотите от этих денег?", opts: [
      { v: "passive", t: "Пассивный доход", d: "Каждый месяц, без моего участия" },
      { v: "growth", t: "Рост капитала", d: "Купить дешевле, продать дороже" },
      { v: "self", t: "Для себя + сдача", d: "Жить у моря, а когда меня нет — сдавать" },
      { v: "inflation", t: "Сохранить от инфляции", d: "Главное — не потерять" }
    ] },
    { key: "price", type: "budget", q: "Какую сумму рассматриваете?", hint: "Это стоимость объекта. При ипотеке или рассрочке покажем ваш первый взнос." },
    { key: "pay", q: "Как планируете платить?", opts: [
      { v: "cash", t: "Полная оплата", d: "Своими деньгами сразу" },
      { v: "mortgage", t: "Ипотека", d: "Рыночная ставка сейчас около 18,7%" },
      { v: "installment", t: "Рассрочка от застройщика", d: "Частями, пока идёт стройка" }
    ] },
    { key: "format", q: "Какой формат ближе?", opts: [
      { v: "apart", t: "Апарт-отель под управлением", d: "Номер в отеле: сдаёт и обслуживает УК" },
      { v: "flat", t: "Квартира", d: "Можно жить, прописаться и сдавать" },
      { v: "land", t: "Земля", d: "Участок под рост цены или свой дом" },
      { v: "unknown", t: "Не знаю, подберите", d: "Предложим формат под вашу цель" }
    ] },
    { key: "stage", q: "Готовый объект или стройка?", skip: function (a) { return a.format === "land"; }, opts: [
      { v: "ready", t: "Готовый, с доходом сейчас", d: "Доход с первых месяцев" },
      { v: "pit", t: "Котлован", d: "Цена ниже, рост выше, но нужно дождаться сдачи" }
    ] },
    { key: "horizon", q: "На какой срок готовы вложить деньги?", hint: "От срока зависит ставка вклада, с которой мы сравниваем.", opts: [
      { v: "lt1", t: "До 1 года" }, { v: "y1_3", t: "1–3 года" }, { v: "y3_5", t: "3–5 лет" }, { v: "gt5", t: "Больше 5 лет" }
    ] },
    { key: "weeks", type: "weeks", q: "Сколько недель в году будете жить сами?", hint: "Считаем, что вы приезжаете в сезон — это самые дорогие недели.", skip: function (a) { return a.goal !== "self"; } }
  ];
  var LABELS = {
    pay: { cash: "полная оплата", mortgage: "ипотека", installment: "рассрочка" },
    horizon: { lt1: "до 1 года", y1_3: "1–3 года", y3_5: "3–5 лет", gt5: "больше 5 лет" }
  };

  var quizEl = $("[data-quiz]");
  function skipped(st) { return (st.skip && st.skip(quiz.a)) || !!(quiz.preset && quiz.preset[st.key]); }
  var quiz = {
    step: -1, // -1 = стартовый экран
    a: { price: (CALC.budget || {}).default || 10000000, weeks: (CALC.ownUse || {}).defaultWeeks || 4 },
    result: null,
    inProgress: function () { return this.step >= 1 && !this.result; },
    preset: {},
    visibleSteps: function () { return STEPS.filter(function (s) { return !skipped(s); }); },
    answersText: function () {
      var a = this.a, out = [];
      STEPS.forEach(function (s) {
        if (s.skip && s.skip(a)) return;
        if (s.type === "budget") out.push("Бюджет: " + fmtMln(a.price));
        else if (s.type === "weeks") out.push("Недель у моря: " + a.weeks);
        else { var o = (s.opts || []).filter(function (x) { return x.v === a[s.key]; })[0]; if (o) out.push(s.q + " — " + o.t); }
      });
      return out.join("\n");
    },
    resultText: function () { return this.result ? this.result.summary : ""; }
  };

  /* ---------- форматирование ---------- */
  function nb(s) { return s.replace(/ /g, " "); }
  function fmtRub(x) { return nb((x < 0 ? "−" : "") + Math.round(Math.abs(x)).toLocaleString("ru-RU").replace(/ |,/g, " ") + " ₽"); }
  function fmtMln(x) {
    var v = x / 1e6, s = (Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(".", ",").replace(/,00$/, "").replace(/(,\d)0$/, "$1").replace(/,0$/, "");
    return nb((v < 0 ? "−" + s.slice(1) : s) + " млн ₽");
  }
  function fmtPct(x, d) { return (x * 100).toFixed(d == null ? 1 : d).replace(".", ",").replace(/,0$/, "").replace("-", "−") + "%"; }
  function paybackText(x) {
    if (x == null || !isFinite(x) || x <= 0) return "не окупается";
    if (x > 50) return "больше 50 лет";
    var r = Math.round(x * 10) / 10;
    return r % 1 ? String(r).replace(".", ",") + "\u00a0года" : years(r);
  }
  function signed(x) { return (x >= 0 ? "+" : "−") + fmtRub(Math.abs(x)).replace("−", ""); }
  function years(n) { var m = Math.abs(n) % 100, m1 = m % 10; var w = m > 10 && m < 20 ? "лет" : m1 === 1 ? "год" : m1 > 1 && m1 < 5 ? "года" : "лет"; return String(n).replace(".", ",") + " " + w; }
  function snapPrice(v) {
    var B = CALC.budget; var st = v >= B.stepSwitchAt ? B.stepLarge : B.stepSmall;
    return Math.min(B.max, Math.max(B.min, Math.round(v / st) * st));
  }
  function budgetHint(p) {
    if (p < 4900000) return "В этом бюджете: земля или первый взнос по рассрочке";
    if (p < 11000000) return "В этом бюджете: студия или 1-комнатная квартира, котлован";
    if (p <= 25000000) return "В этом бюджете: номер в апарт-отеле, 1–2-комнатная квартира";
    return "В этом бюджете: крупный лот или 2–3 объекта";
  }

  /* ---------- шаги ---------- */
  function renderStart() {
    quiz.step = -1; quiz.result = null; quiz.preset = {};
    quizEl.classList.add("is-start");
    setTop("Калькулятор", 0);
    $(".quiz__nav", quizEl).hidden = true;
    $(".quiz__body", quizEl).innerHTML =
      '<div class="quiz__start"><h3 class="quiz__q">Несколько вопросов — и ваши цифры рядом с вкладом</h3>' +
      '<p class="quiz__hint">Доход в месяц, окупаемость и капитал через 3 и 5 лет. Три сценария: плохой, базовый, хороший.</p>' +
      '<button type="button" class="btn btn--dark" data-quiz-start>Начать расчёт</button>' +
      '<p class="quiz__hint small" style="margin:14px 0 0">Около минуты. Телефон не нужен.</p></div>';
    $("[data-quiz-start]", quizEl).addEventListener("click", function () { goal("quiz_start"); goTo(0); });
  }
  function setTop(label, progress) {
    $(".quiz__step-label", quizEl).textContent = label;
    $(".quiz__progress i", quizEl).style.width = progress + "%";
  }
  function goTo(i) {
    quiz.result = null;
    quizEl.classList.remove("is-start");
    quiz.step = i;
    var vis = quiz.visibleSteps();
    var s = STEPS[i];
    var n = vis.indexOf(s) + 1;
    setTop("Шаг " + n + " из " + vis.length, ((n - 1) / vis.length) * 100);
    $(".quiz__nav", quizEl).hidden = false;
    $(".quiz__back", quizEl).hidden = false;
    var next = $(".quiz__next", quizEl);
    next.hidden = !s.type;
    next.textContent = s.type === "weeks" || (s.type === "budget" && isLast(i)) ? "Посчитать" : "Дальше";
    var body = $(".quiz__body", quizEl);
    var html = '<h3 class="quiz__q">' + s.q + "</h3>" + (s.hint ? '<p class="quiz__hint">' + s.hint + "</p>" : '<p class="quiz__hint"></p>');

    if (s.type === "budget") {
      var B = CALC.budget;
      html += '<div class="range"><div class="range__value"><input class="range__input" type="text" inputmode="decimal" value="' + String(quiz.a.price / 1e6).replace(".", ",") + '" aria-label="Бюджет, млн рублей"><small>млн ₽</small></div>' +
        '<input type="range" min="' + B.min / 1e6 + '" max="' + B.max / 1e6 + '" step="0.5" value="' + quiz.a.price / 1e6 + '" aria-label="Бюджет, млн рублей">' +
        '<div class="range__scale"><span>' + B.min / 1e6 + " млн</span><span>" + B.maxLabel + "</span></div>" +
        '<p class="range__hint" data-bhint></p><p class="range__down" data-bdown></p></div>' +
        '<p class="src" style="margin-top:14px">Студии комфорт-класса — от ~4,9 млн: <a href="https://south.vedomosti.ru/south/articles/2026/05/08/1196135-rosta-sdelok-anape" target="_blank" rel="nofollow noopener">Ведомости. Юг</a>; апарт-номер — от 11 млн: <a href="https://iz.ru/2093772/iana-shturma/burnye-apartamenty-investory-teriaiut-interes-k-kvartiram" target="_blank" rel="nofollow noopener">Известия</a></p>';
    } else if (s.type === "weeks") {
      html += '<div class="range"><div class="range__value"><span data-wv>' + quiz.a.weeks + '</span><small data-wl>недели</small></div>' +
        '<input type="range" min="0" max="' + CALC.ownUse.maxWeeks + '" step="1" value="' + quiz.a.weeks + '" aria-label="Недель в году у моря">' +
        '<div class="range__scale"><span>0</span><span>' + CALC.ownUse.maxWeeks + " недель</span></div></div>";
    } else {
      html += '<div class="quiz__opts">' + s.opts.map(function (o) {
        return '<button type="button" class="opt' + (quiz.a[s.key] === o.v ? " is-active" : "") + '" data-v="' + o.v + '"><b>' + o.t + "</b>" + (o.d ? "<small>" + o.d + "</small>" : "") + "</button>";
      }).join("") + "</div>";
    }
    body.innerHTML = html;

    if (s.type === "budget") {
      var r = $("input[type=range]", body), inp = $(".range__input", body);
      var paint = function (fromInput) {
        var v = fromInput ? parseFloat(String(inp.value).replace(",", ".")) * 1e6 : Number(r.value) * 1e6;
        if (!isFinite(v)) return;
        v = snapPrice(v);
        quiz.a.price = v;
        r.value = v / 1e6;
        if (!fromInput) inp.value = String(v / 1e6).replace(".", ",");
        r.style.setProperty("--p", ((r.value - r.min) / (r.max - r.min)) * 100 + "%");
        $("[data-bhint]", body).textContent = budgetHint(v);
        var down = "";
        if (quiz.a.pay === "mortgage") {
          var kind = quiz.a.format === "land" ? "land" : quiz.a.format === "flat" ? "flat" : "apart";
          down = "Ваш первый взнос: " + fmtRub(v * CALC.mortgage.downPayment[kind]);
        } else if (quiz.a.pay === "installment") down = "Ваш первый взнос: " + fmtRub(v * CALC.installment.downPayment);
        $("[data-bdown]", body).textContent = down;
      };
      r.addEventListener("input", function () { paint(false); });
      inp.addEventListener("change", function () { paint(true); inp.value = String(quiz.a.price / 1e6).replace(".", ","); });
      paint(false);
    } else if (s.type === "weeks") {
      var wr = $("input[type=range]", body);
      var wp = function () {
        quiz.a.weeks = Number(wr.value);
        $("[data-wv]", body).textContent = wr.value;
        var m = quiz.a.weeks % 10, m2 = quiz.a.weeks % 100;
        $("[data-wl]", body).textContent = m2 > 10 && m2 < 20 ? "недель" : m === 1 ? "неделя" : m > 1 && m < 5 ? "недели" : "недель";
        wr.style.setProperty("--p", (wr.value / wr.max) * 100 + "%");
      };
      wr.addEventListener("input", wp); wp();
    } else {
      $$(".opt", body).forEach(function (btn) {
        btn.addEventListener("click", function () {
          quiz.a[s.key] = btn.getAttribute("data-v");
          $$(".opt", body).forEach(function (x) { x.classList.toggle("is-active", x === btn); });
          setTimeout(goNext, 200);
        });
      });
    }
  }
  function isLast(i) {
    for (var j = i + 1; j < STEPS.length; j++) if (!skipped(STEPS[j])) return false;
    return true;
  }
  function goNext() {
    var s = STEPS[quiz.step];
    goal("quiz_step_" + (quiz.step + 1), { key: s.key, value: quiz.a[s.key] });
    var j = quiz.step + 1;
    while (j < STEPS.length && skipped(STEPS[j])) j++;
    if (j >= STEPS.length) return showLoading();
    goTo(j);
    scrollQuizIntoView();
  }
  function goBack() {
    if (quiz.result) { quiz.result = null; var last = STEPS.length - 1; while (last > 0 && skipped(STEPS[last])) last--; return goTo(last); }
    var j = quiz.step - 1;
    while (j >= 0 && skipped(STEPS[j])) j--;
    if (j < 0) return renderStart();
    goTo(j);
  }
  function scrollQuizIntoView() {
    var top = quizEl.getBoundingClientRect().top;
    if (top < 40 || top > window.innerHeight * 0.35) window.scrollTo({ top: top + window.scrollY - 84, behavior: "smooth" });
  }
  function showLoading() {
    $(".quiz__nav", quizEl).hidden = true;
    $(".quiz__body", quizEl).innerHTML = '<div class="quiz__loading"><span class="spinner"></span>Считаем против вклада…</div>';
    setTimeout(showResult, 900);
  }

  /* ---------- результат ---------- */
  function chartSVG(res) {
    var sc = res.sc, T = Math.max(5, sc.base.Th);
    var W = 660, H = 260, pl = 50, pr = 12, pt = 16, pb = 28;
    var pts = [];
    for (var t = 0; t <= T; t++) pts.push({ t: t, lo: sc.min.W[12 * t], b: sc.base.W[12 * t], hi: sc.max.W[12 * t], d: sc.base.Dep[12 * t] });
    var mn = Infinity, mx = -Infinity;
    pts.forEach(function (p) { mn = Math.min(mn, p.lo, p.d); mx = Math.max(mx, p.hi, p.d); });
    var pad = (mx - mn) * 0.08; mn -= pad; mx += pad;
    var x = function (t) { return pl + (t / T) * (W - pl - pr); };
    var y = function (v) { return pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb); };
    var line = function (k) { return pts.map(function (p, i) { return (i ? "L" : "M") + x(p.t).toFixed(1) + " " + y(p[k]).toFixed(1); }).join(" "); };
    var band = line("hi") + " " + pts.slice().reverse().map(function (p) { return "L" + x(p.t).toFixed(1) + " " + y(p.lo).toFixed(1); }).join(" ") + " Z";
    var g = "";
    for (var i = 0; i <= 4; i++) {
      var v = mn + ((mx - mn) * i) / 4;
      g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="rgba(14,11,30,.07)"/><text x="' + (pl - 8) + '" y="' + (y(v) + 4) + '" font-size="11" text-anchor="end" fill="rgba(14,11,30,.5)">' + (v / 1e6).toFixed(Math.abs(mx - mn) < 3e6 ? 1 : 0).replace(".", ",") + "</text>";
    }
    pts.forEach(function (p) { g += '<text x="' + x(p.t) + '" y="' + (H - 8) + '" font-size="11" text-anchor="middle" fill="rgba(14,11,30,.5)">' + (p.t === 0 ? "сейчас" : p.t + " г.") + "</text>"; });
    var marks = "";
    [3, 5].forEach(function (t) {
      if (t > T) return;
      var p = pts[t];
      var bUp = p.b >= p.d, anchor = t === T ? "end" : "middle", tx = t === T ? x(t) - 8 : x(t);
      marks += '<circle cx="' + x(t) + '" cy="' + y(p.b) + '" r="4" fill="#8c7249"/><text x="' + tx + '" y="' + (bUp ? y(p.b) - 10 : y(p.b) + 18) + '" font-size="11" font-weight="600" text-anchor="' + anchor + '" fill="#6f5a34">' + (p.b / 1e6).toFixed(1).replace(".", ",") + "</text>";
      marks += '<circle cx="' + x(t) + '" cy="' + y(p.d) + '" r="4" fill="#5b5ba8"/><text x="' + tx + '" y="' + (bUp ? y(p.d) + 18 : y(p.d) - 10) + '" font-size="11" font-weight="600" text-anchor="' + anchor + '" fill="#3a2c80">' + (p.d / 1e6).toFixed(1).replace(".", ",") + "</text>";
    });
    return '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Ваши деньги: объект против вклада, млн рублей">' +
      '<text x="' + (pl - 8) + '" y="10" font-size="10" text-anchor="end" fill="rgba(14,11,30,.5)">млн ₽</text>' + g +
      '<path d="' + band + '" fill="rgba(201,174,106,.28)"/>' +
      '<path d="' + line("b") + '" fill="none" stroke="#8c7249" stroke-width="3"/>' +
      '<path d="' + line("d") + '" fill="none" stroke="#5b5ba8" stroke-width="2.5" stroke-dasharray="6 5"/>' + marks + "</svg>";
  }

  function big(label, base, range, note) {
    return '<div class="kpi"><span class="kpi__label">' + label + '</span><span class="kpi__value">' + base + "</span>" + (range ? '<span class="kpi__sub">' + range + "</span>" : "") + (note ? '<span class="kpi__sub">' + note + "</span>" : "") + "</div>";
  }

  function assumptionsTable(res) {
    var f = res.fmt, S = CALC.sources, rows = [];
    var tri = function (o, fn) { return o ? [fn(o.min), fn(o.base), fn(o.max)] : null; };
    var p = function (v) { return fmtPct(v); };
    var src = function (arr) { return (arr || []).map(function (s) { return '<a href="' + s[1] + '" target="_blank" rel="nofollow noopener">' + s[0] + "</a>"; }).join(", "); };
    var ysrc = res.profile.indexOf("apart") === 0 ? S.apartYield : res.profile === "flat_daily" ? [["наш расчёт по формуле: цена ночи × ночи × загрузка − УК − площадки − коммуналка − износ", "#"]].concat(S.adr) : S.flatLongYield;
    if (res.profile !== "land") rows.push(["Доходность до налогов, % от цены" + (res.profile === "kotlovan" || res.profile === "apart_offplan" ? " (после сдачи)" : ""), tri(f.yield, p), src(ysrc)]);
    if (f.growthBuild) rows.push(["Рост цены за время стройки, % в год", tri(f.growthBuild, p), src(S.growthBuild)]);
    rows.push(["Рост цены" + (f.growthBuild ? " после сдачи" : "") + ", % в год", tri(f.growthReady, p), res.profile === "land" ? src(S.landGrowth) : "оценка, заменить данными агентства"]);
    if (f.buildYears) rows.push(["Срок стройки", [years(f.buildYears + f.delayYearsBad), years(f.buildYears), years(f.buildYears)], "оценка; в плохом сценарии перенос на " + years(f.delayYearsBad)]);
    if (f.occupancySeason) rows.push(["Загрузка в сезон / межсезонье", [p(f.occupancySeason.min) + " / " + p(f.occupancyOff.min), p(f.occupancySeason.base) + " / " + p(f.occupancyOff.base), p(f.occupancySeason.max) + " / " + p(f.occupancyOff.max)], src(S.occupancy)]);
    if (f.ukFee) rows.push(["Комиссия УК, % выручки", tri(f.ukFee, p), src(S.ukFee)]);
    if (f.adrSeason) rows.push(["Цена ночи в сезон / межсезонье", [f.adrSeason.min + " / " + f.adrOff.min + " ₽", f.adrSeason.base + " / " + f.adrOff.base + " ₽", f.adrSeason.max + " / " + f.adrOff.max + " ₽"], src(S.adr) + "; межсезонье — оценка"]);
    if (f.incomeTax) rows.push(["Налог с дохода", [p(f.incomeTax), p(f.incomeTax), p(f.incomeTax)], f.incomeTax === 0.04 ? src(S.npd) + " (НПД)" : "НДФЛ, оценка — зависит от режима"]);
    rows.push(["Налог на имущество, % кадастра (кадастр ≈ " + p(f.cadastralRatio, 0) + " цены)", [p(f.propertyTax), p(f.propertyTax), p(f.propertyTax)], "оценка, проверить ставку по объекту"]);
    rows.push(["Расходы на продажу", [p(f.sellCost, 0), p(f.sellCost, 0), p(f.sellCost, 0)], "оценка"]);
    rows.push(["НДФЛ при продаже раньше " + years(CALC.sale.minHoldingYears), ["13% с прибыли", "13% с прибыли", "13% с прибыли"], "НК РФ, ст. 217.1"]);
    rows.push(["Ставка вклада на ваш срок", [p(res.sc.base.rate, 2), p(res.sc.base.rate, 2), p(res.sc.base.rate, 2)], src(S.deposit) + "; на срок от 3 лет — оценка с учётом снижения ставки"]);
    if (res.input.pay === "mortgage") rows.push(["Ставка ипотеки", tri(CALC.mortgage.rate, function (v) { return fmtPct(v, 2); }), src(S.mortgage)]);
    return '<details class="assume"><summary>Как посчитано</summary><div class="assume__wrap"><table><thead><tr><th>Параметр</th><th>Плохой</th><th>Базовый</th><th>Хороший</th><th>Источник</th></tr></thead><tbody>' +
      rows.map(function (r) { return "<tr><td>" + r[0] + "</td><td>" + r[1][0] + "</td><td>" + r[1][1] + "</td><td>" + r[1][2] + "</td><td>" + r[2] + "</td></tr>"; }).join("") +
      "</tbody></table><p>Капитал объекта = деньги на руки после продажи (минус расходы на продажу и налог) + накопленный доход, положенный на вклад под ту же ставку. Вклад — с ежемесячной капитализацией и НДФЛ с процентов сверх " + fmtRub(CALC.deposit.taxFreePerYear) + " в год. При ипотеке и рассрочке — минус остаток долга, платежи вычитаются из дохода.</p></div></details>";
  }

  function showResult() {
    var a = quiz.a;
    var input = { price: a.price, goal: a.goal, pay: a.pay, format: a.format, stage: a.format === "land" ? "ready" : a.stage, horizon: a.horizon, weeks: a.goal === "self" ? a.weeks : 0 };
    var res = window.PLCalc.calculate(CALC, input);
    quiz.result = res;
    var b = res.sc.base, mn = res.sc.min, mx = res.sc.max;
    var Th = b.Th, hy = years(Th);
    goal("quiz_result", { profile: res.profile, verdict: res.verdict, budget: a.price });

    setTop("Ваш расчёт", 100);
    $(".quiz__nav", quizEl).hidden = false;
    $(".quiz__next", quizEl).hidden = true;

    var verdictChip = { win: "Обыгрывает вклад", even: "Примерно как вклад", lose: "Вклад выигрывает" }[res.verdict];
    var dAbs = fmtRub(Math.abs(res.diff));
    var verdictText = {
      win: "В базовом сценарии объект обгоняет вклад на " + dAbs + " за " + hy + ". Хороший знак — но посмотрите и плохой сценарий ниже.",
      even: "В базовом сценарии объект идёт вровень с вкладом: разница " + dAbs + " за " + hy + ". Выигрыш решают детали — цена входа, УК, рассрочка. Их мы и ищем.",
      lose: "На средних цифрах рынка вклад выигрывает на " + dAbs + " за " + hy + ". Так бывает часто, и мы говорим это прямо. Обогнать вклад может объект выше среднего: с ценой входа ниже рынка, недорогой УК или рассрочкой без удорожания."
    }[res.verdict];

    var noRent = b.incMonth === null;
    var kp = "";
    if (noRent) {
      kp += big("Доход от аренды", "Нет до продажи", null, res.profile === "land" ? "вы зарабатываете на росте цены; земельный налог ≈ " + fmtRub(Math.abs(b.landTaxMonth)) + " в месяц" : "вы зарабатываете на росте цены");
      kp += big("Окупаемость", "Не применимо", null, "доход приходит при продаже");
    } else {
      var off = b.Tc ? "после сдачи, через " + years(b.Tc / 12) : "";
      kp += big("Доход в месяц, чистыми", fmtRub(b.incMonth), "от " + fmtRub(mn.incMonth) + " до " + fmtRub(mx.incMonth), off);
      kp += big("Доход в год", fmtRub(b.incYear), "от " + fmtRub(mn.incYear) + " до " + fmtRub(mx.incYear));
      kp += big("Доходность", fmtPct(b.yieldPct) + " годовых", "от " + fmtPct(mn.yieldPct) + " до " + fmtPct(mx.yieldPct));
      kp += big("Окупаемость", paybackText(b.payback), "от " + paybackText(mx.payback) + " до " + paybackText(mn.payback));
    }

    var capRow = function (n, lo, base, hi, d) {
      var diff = base - d;
      return '<div class="cap"><span class="cap__t">Через ' + years(n) + '</span><span class="cap__obj">Объект: от ' + fmtMln(lo) + " до " + fmtMln(hi) + " <em>(базовый сценарий — " + fmtMln(base) + ')</em></span><span class="cap__dep">Вклад ' + fmtPct(b.rate, 2) + ": " + fmtMln(d) + '</span><span class="cap__diff ' + (diff >= 0 ? "is-plus" : "is-minus") + '">Разница: ' + signed(diff) + "</span></div>";
    };

    var W = { build: function (w) { return "Стройка займёт около " + years(w.n) + " — за год рост цены не успеет отработать."; },
      mortgage: function (w) { return "Платёж по ипотеке больше дохода от аренды на " + fmtRub(w.gap) + " в месяц — доплачивать придётся из своих денег."; },
      apartMin: function () { return 'Номера в апарт-отелях Анапы — от 11 млн ₽. В вашем бюджете реалистичнее квартира или котлован. <a href="https://iz.ru/2093772/iana-shturma/burnye-apartamenty-investory-teriaiut-interes-k-kvartiram" target="_blank" rel="nofollow noopener">Известия</a>'; },
      flatMin: function () { return 'Студии комфорт-класса в Анапе — от ~4,9 млн ₽. В этом бюджете реалистичнее земля или первый взнос по рассрочке. <a href="https://south.vedomosti.ru/south/articles/2026/05/08/1196135-rosta-sdelok-anape" target="_blank" rel="nofollow noopener">Ведомости. Юг</a>'; },
      land: function () { return 'Земля растёт медленно — +3% за год по краю — и продаётся дольше квартиры. <a href="https://www.dg-yug.ru/news/20253644.html" target="_blank" rel="nofollow noopener">ДГ-Юг</a>'; },
      weeks: function (w) { var m = w.n % 100, m1 = w.n % 10, ww = m > 10 && m < 20 ? "недель" : m1 === 1 ? "неделю" : m1 > 1 && m1 < 5 ? "недели" : "недель"; return "Жить у моря " + w.n + " " + ww + " в году — это около " + fmtRub(w.loss) + " недополученного дохода. Если бы вы снимали такую квартиру посуточно на эти недели, заплатили бы около " + fmtRub(w.n * 7 * CALC.formats.flat_daily.adrSeason.base) + "."; },
      family: function () { return 'Для квартиры может подойти семейная ипотека 6% — до 6 млн ₽, взнос от 20%. На апартаменты она не распространяется. <a href="https://xn--h1alcedd.xn--d1aqf.xn--p1ai/news/semeynaya-ipoteka-aktualnye-usloviya-na-sentyabr-2026/" target="_blank" rel="nofollow noopener">СПРОСИ.ДОМ.РФ</a>'; } };
    var warns = res.warnings.map(function (w) { return '<li>' + W[w.k](w) + "</li>"; }).join("");

    var equiv = b.equiv !== null
      ? '<p class="result__equiv">Объект в базовом сценарии работает как вклад под <b>' + fmtPct(b.equiv) + "</b> годовых (вклад после НДФЛ — " + fmtPct(Math.pow(b.depH / a.price, 1 / Th) - 1) + "). С учётом инфляции 6,5% — " + fmtPct(b.equiv - CALC.inflation.base) + ' реальной доходности. <a class="src" href="https://www.cbr.ru/press/keypr/" target="_blank" rel="nofollow noopener">Прогноз инфляции: ЦБ</a></p>' : "";

    var params = res.fmt.short + ", " + fmtMln(a.price) + ", " + LABELS.pay[a.pay] + ", горизонт " + LABELS.horizon[a.horizon];

    res.summary = [
      "Профиль: " + res.fmt.label,
      "Параметры: " + params,
      "Вердикт: " + verdictChip + " (" + signed(res.diff) + " за " + hy + ", в плохом сценарии " + signed(res.badDiff) + ")",
      noRent ? "Доход от аренды: нет до продажи" : "Доход в месяц: " + fmtRub(b.incMonth) + " (от " + fmtRub(mn.incMonth) + " до " + fmtRub(mx.incMonth) + "), доходность " + fmtPct(b.yieldPct),
      "Капитал через 3 года: " + fmtMln(mn.cap3) + "–" + fmtMln(mx.cap3) + " против вклада " + fmtMln(b.dep3),
      "Капитал через 5 лет: " + fmtMln(mn.cap5) + "–" + fmtMln(mx.cap5) + " против вклада " + fmtMln(b.dep5),
      "Конфиг: " + CALC.version
    ].join("\n");

    $(".quiz__body", quizEl).innerHTML =
      '<div class="result">' +
        '<div class="result__head"><div><span class="result__strategy">Ваш расчёт</span><p class="result__params">' + params + ' · <button type="button" class="link-inline" data-restart>Изменить</button></p></div></div>' +
        '<div class="verdict verdict--' + res.verdict + '"><span class="verdict__chip">' + verdictChip + '</span><p>' + verdictText + '</p><p class="verdict__bad">В плохом сценарии: ' + signed(res.badDiff) + " к вкладу." + (res.flatRate ? " Если ставка вклада не снизится (" + fmtPct(res.flatRate.rate, 2) + " на весь срок): " + signed(res.flatRate.diff) + "." : "") + "</p></div>" +
        (warns ? '<ul class="result__warns">' + warns + "</ul>" : "") +
        '<div class="result__kpis' + (noRent ? " result__kpis--2" : "") + '">' + kp + "</div>" +
        '<div class="caps">' + (Th >= 3 || true ? capRow(3, mn.cap3, b.cap3, mx.cap3, b.dep3) : "") + capRow(5, mn.cap5, b.cap5, mx.cap5, b.dep5) +
        '<p class="src">' + (a.pay === "cash" ? "Капитал объекта = деньги на руки после продажи (минус расходы на продажу и налог) + накопленный доход, положенный на вклад. Так сравнение с вкладом честное." : "Капитал = цена при продаже − остаток долга − ваши платежи с упущенным процентом + накопленный доход. Вклад — на сумму первого взноса (" + fmtMln(b.CF0) + ").") + "</p></div>" +
        '<div class="chart"><p class="chart__title">Ваши деньги: объект против вклада ' + fmtPct(b.rate, 2) + '</p><div class="chart__legend"><span><i style="background:#8c7249;height:3px"></i>Объект — базовый сценарий</span><span><i style="background:rgba(201,174,106,.45);height:10px"></i>Объект — от плохого до хорошего</span><span><i style="background:repeating-linear-gradient(90deg,#5b5ba8 0 6px,transparent 6px 10px)"></i>Вклад</span></div>' + chartSVG(res) + "</div>" +
        equiv +
        '<p class="result__alt">А если <b>' + res.altRes.label.toLowerCase() + "</b>: эквивалент " + fmtPct(res.altRes.equiv5) + " годовых, капитал через 5 лет — " + fmtMln(res.altRes.cap5) + ' (полная оплата). <button type="button" class="link-inline" data-alt>Пересчитать так</button></p>' +
        assumptionsTable(res) +
        '<p class="result__disclaimer">' + CALC.disclaimer + "</p>" +
        '<div class="result__cta" data-hide-sticky><span class="eyebrow">Следующий шаг</span><h3 class="h3">Получите 3 объекта под ваши параметры</h3><p class="muted">С полным расчётом против вклада, стресс-тестом и минусами. Пришлём в мессенджер в течение 24 часов. Если под ваши параметры нет объектов, которые обгоняют вклад, — так и напишем.</p>' +
        '<form class="form form--row" data-form="quiz" data-title="Калькулятор: 3 объекта под параметры" data-place="Б3 результат" data-cta="Получить 3 объекта" data-note="Ваши ответы и расчёт уже прикреплены к заявке — повторять не придётся."></form>' +
        '<p class="result__more"><button type="button" class="link-inline" data-popup="portfolio" data-goal="click_portfolio_from_quiz">Или заберите закрытый портфель целиком →</button> · <button type="button" class="link-inline" data-restart>Пересчитать с другими параметрами</button></p></div>' +
      "</div>";
    renderForm($('[data-form="quiz"]', quizEl));
    $$("[data-restart]", quizEl).forEach(function (btn) { btn.addEventListener("click", function () { goal("quiz_restart"); quiz.preset = {}; goTo(0); scrollQuizIntoView(); }); });
    $("[data-alt]", quizEl).addEventListener("click", function () {
      var alt = res.alt;
      if (alt === "land") { a.format = "land"; }
      else if (alt.indexOf("apart") === 0) { a.format = "apart"; a.stage = alt === "apart_offplan" ? "pit" : "ready"; }
      else if (alt === "kotlovan") { a.format = "flat"; a.stage = "pit"; }
      else { a.format = "flat"; a.stage = "ready"; if (alt === "flat_long" && (a.goal === "passive" || a.goal === "self")) a.goal = "inflation"; if (alt === "flat_daily" && (a.goal === "growth" || a.goal === "inflation")) a.goal = "passive"; }
      a.pay = "cash";
      goal("quiz_alt");
      showResult();
    });
    var det = $(".assume", quizEl);
    det.addEventListener("toggle", function () { if (det.open) goal("quiz_how_calculated"); });
    if ("IntersectionObserver" in window && zoneIO) zoneIO.observe($(".result__cta", quizEl));
    scrollQuizIntoView();
  }

  if (quizEl) {
    $(".quiz__next", quizEl).addEventListener("click", goNext);
    $(".quiz__back", quizEl).addEventListener("click", goBack);
    renderStart();
  }

  /* кнопки «Посчитать…» с предвыбором ответов: data-quiz-preset="goal=self;format=flat;stage=pit" */
  doc.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-quiz-preset]");
    if (!btn || !quizEl) return;
    e.preventDefault();
    var preset = btn.getAttribute("data-quiz-preset");
    quiz.a = { price: quiz.a.price, weeks: quiz.a.weeks };
    quiz.preset = {};
    preset.split(";").forEach(function (kv) { var p = kv.split("="); if (p[0]) { quiz.a[p[0]] = p[1]; quiz.preset[p[0]] = true; } });
    goal("quiz_start", { preset: preset });
    var first = 0;
    while (first < STEPS.length - 1 && skipped(STEPS[first])) first++;
    goTo(first);
    quizEl.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* панель быстрого расчёта под первым экраном (аналог поиска whitewill) */
  var qb = $("[data-quickbar]");
  if (qb && quizEl) {
    qb.addEventListener("submit", function (e) {
      e.preventDefault();
      var g = qb.elements.goal.value, p = qb.elements.price.value, f = qb.elements.format.value;
      quiz.a = { price: p ? Number(p) : quiz.a.price, weeks: quiz.a.weeks };
      quiz.preset = {};
      if (g) { quiz.a.goal = g; quiz.preset.goal = true; }
      if (p) quiz.preset.price = true;
      if (f) { quiz.a.format = f; quiz.preset.format = true; }
      var first = 0;
      while (first < STEPS.length - 1 && skipped(STEPS[first])) first++;
      goal("quiz_start", { source: "quickbar" });
      goTo(first);
      quizEl.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* формы в разметке */
  $$("form[data-form]").forEach(function (f) { if (!f.querySelector("[name=phone]")) renderForm(f); });
})();

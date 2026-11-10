/* ==========================================================================
   МИР МЕБЕЛИ — интерактив главной страницы:
   кухня-конструктор, точки на интерьере, подборка товаров, калькулятор, этапы.
   ========================================================================== */
(function () {
  'use strict';
  var MM = window.MM;
  if (!MM) return;
  var $ = MM.$, $$ = MM.$$, fmt = MM.fmt;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- 1. Hero: свет за курсором и наклон сцены ------------------------- */
  function initHero() {
    var hero = $('[data-hero]');
    var kitchen = $('[data-kitchen]');
    if (!hero || !kitchen) return;
    var stage = $('.kitchen__stage', kitchen);
    var glow = $('.hero__glow', hero);

    if (finePointer && !MM.reduceMotion) {
      var raf = 0, px = 0, py = 0;
      hero.addEventListener('pointermove', function (e) {
        px = e.clientX; py = e.clientY;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var hr = hero.getBoundingClientRect();
          glow.style.setProperty('--gx', (px - hr.left) + 'px');
          glow.style.setProperty('--gy', (py - hr.top) + 'px');
          var r = stage.getBoundingClientRect();
          var dx = (px - (r.left + r.width / 2)) / (window.innerWidth / 2);
          var dy = (py - (r.top + r.height / 2)) / (window.innerHeight / 2);
          stage.style.setProperty('--ry', (Math.max(-1, Math.min(1, dx)) * 7).toFixed(2) + 'deg');
          stage.style.setProperty('--rx', (Math.max(-1, Math.min(1, dy)) * -5).toFixed(2) + 'deg');
        });
      });
      hero.addEventListener('pointerleave', function () {
        stage.style.setProperty('--ry', '0deg');
        stage.style.setProperty('--rx', '0deg');
      });
    }
  }

  /* ---------- 2. Кухня: фасады, цвета, подсветка -------------------------------- */
  function initKitchen() {
    var kitchen = $('[data-kitchen]');
    if (!kitchen) return;
    var svg = $('.kitchen__svg', kitchen);
    var hint = $('[data-kitchen-hint]', kitchen);
    var doors = $$('.k-door', kitchen);
    var summary = $('[data-kitchen-summary]', kitchen);
    var lightBtn = $('[data-kitchen-light]', kitchen);
    var touched = false;
    var state = {};

    function setDoor(door, open) {
      door.classList.toggle('is-open', open);
      door.setAttribute('aria-pressed', String(open));
    }
    function userTouched() {
      if (touched) return;
      touched = true;
      if (hint) hint.classList.add('is-hidden');
    }

    doors.forEach(function (door) {
      function toggle() {
        userTouched();
        setDoor(door, !door.classList.contains('is-open'));
      }
      door.addEventListener('click', toggle);
      door.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });

    // Подсказка-демонстрация: один фасад сам открывается и закрывается
    var demo = $('.k-door[data-demo]', kitchen);
    if (demo && !MM.reduceMotion) {
      setTimeout(function () { if (!touched) setDoor(demo, true); }, 3000);
      setTimeout(function () { if (!touched) setDoor(demo, false); }, 4700);
    }

    // Цвета
    function luminance(hex) {
      var n = parseInt(hex.slice(1), 16);
      return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
    }
    function apply(part, btn) {
      var group = btn.parentNode;
      $$('.swatch', group).forEach(function (b) { b.setAttribute('aria-checked', String(b === btn)); b.tabIndex = b === btn ? 0 : -1; });
      var value = btn.getAttribute('data-value');
      state[part] = btn.getAttribute('data-name');
      svg.style.setProperty('--k-' + part, value);
      // столешница контрастна фартуку: к тёмному камню — светлая, к светлому — тёмная
      if (part === 'stone') svg.style.setProperty('--k-counter', luminance(value) < 0.35 ? '#cfc6b8' : '#1d1d20');
      if (summary) {
        summary.textContent = 'верх — ' + (state.top || '').toLowerCase() + ', низ — ' + (state.base || '').toLowerCase() +
          ', фартук — ' + (state.stone || '').toLowerCase();
      }
    }
    $$('[data-cfg]', kitchen).forEach(function (group) {
      var part = group.getAttribute('data-cfg');
      var buttons = $$('.swatch', group);
      buttons.forEach(function (btn, i) {
        if (btn.getAttribute('aria-checked') === 'true') state[part] = btn.getAttribute('data-name');
        btn.tabIndex = btn.getAttribute('aria-checked') === 'true' ? 0 : -1;
        btn.addEventListener('click', function () { userTouched(); apply(part, btn); });
        btn.addEventListener('keydown', function (e) {
          var dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
          if (!dir) return;
          e.preventDefault();
          var next = buttons[(i + dir + buttons.length) % buttons.length];
          next.focus(); apply(part, next);
        });
      });
    });

    // Подсветка
    if (lightBtn) lightBtn.addEventListener('click', function () {
      userTouched();
      var on = lightBtn.getAttribute('aria-pressed') !== 'true';
      lightBtn.setAttribute('aria-pressed', String(on));
      kitchen.classList.toggle('is-dark', !on);
    });

    // Случайная комбинация
    var randomBtn = $('[data-kitchen-random]', kitchen);
    if (randomBtn) randomBtn.addEventListener('click', function () {
      userTouched();
      $$('[data-cfg]', kitchen).forEach(function (group) {
        var options = $$('.swatch[aria-checked="false"]', group);
        apply(group.getAttribute('data-cfg'), options[Math.floor(Math.random() * options.length)]);
      });
      doors.forEach(function (door, i) {
        setTimeout(function () { setDoor(door, true); }, i * 70);
        setTimeout(function () { setDoor(door, false); }, 900 + i * 70);
      });
    });

    // Заявка с выбранной комбинацией
    var orderBtn = $('[data-kitchen-order]', kitchen);
    if (orderBtn) orderBtn.addEventListener('click', function () {
      MM.openRequest('Хочу такую кухню', 'Кухня из конструктора: верх — ' + state.top + ', низ — ' + state.base + ', фартук — ' + state.stone + '.');
    });
  }

  /* ---------- 3. Интерьер с точками ----------------------------------------------- */
  var SPOTS = [
    { short: 'ТВ-зона', name: 'ТВ-зона с реечной панелью', desc: 'Парящая тумба 2,4 м и панель из вертикальных реек в шпоне ореха. Контурная подсветка включается с пульта.', price: 78000 },
    { short: 'Стеллаж', name: 'Стеллаж «Орех»', desc: 'Открытый стеллаж на всю высоту стены: полки разной глубины для книг, ваз и коллекций. Размер секций — под вашу стену.', price: 46000 },
    { short: 'Диван', name: 'Диван «Клауд»', desc: 'Глубокий трёхместный диван с мягкими подушками. Обивка — рогожка или букле, более 40 оттенков на выбор.', price: 92000 },
    { short: 'Стол', name: 'Журнальный стол «Орбита»', desc: 'Круглая столешница из тонированного стекла на латунном основании. Диаметр 90 см, второй ярус — для журналов.', price: 24000 },
    { short: 'Кресло', name: 'Кресло с пуфом «Коньяк»', desc: 'Поворотное кресло в экокоже цвета коньяк и пуф для ног. Анатомическая спинка, основание из матового металла.', price: 58000 },
  ];
  function initRoom() {
    var room = $('[data-room]');
    if (!room) return;
    var spots = $$('.hotspot', room);
    var nav = $('[data-room-nav]', room);
    var cardEl = $('[data-room-card]', room);
    var current = -1;

    nav.innerHTML = SPOTS.map(function (s, i) { return '<button type="button" data-spot="' + i + '">' + MM.esc(s.short) + '</button>'; }).join('');
    var chips = $$('button', nav);

    function select(i, animate) {
      if (i === current) return;
      current = i;
      var s = SPOTS[i];
      spots.forEach(function (el, k) { el.classList.toggle('is-active', k === i); el.setAttribute('aria-pressed', String(k === i)); });
      chips.forEach(function (el, k) { el.classList.toggle('is-active', k === i); });
      $('[data-room-index]', room).textContent = '0' + (i + 1);
      $('[data-room-name]', room).textContent = s.name;
      $('[data-room-desc]', room).textContent = s.desc;
      $('[data-room-price]', room).textContent = 'от ' + fmt(s.price) + ' ₽';
      if (animate) {
        cardEl.classList.remove('is-swap');
        void cardEl.offsetWidth;
        cardEl.classList.add('is-swap');
      }
    }
    room.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-spot]');
      if (btn) select(Number(btn.getAttribute('data-spot')), true);
    });
    spots.forEach(function (el) {
      el.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'mouse') { room.classList.add('is-focus'); select(Number(el.getAttribute('data-spot')), true); }
      });
      el.addEventListener('pointerleave', function () { room.classList.remove('is-focus'); });
    });
    select(0, false);
  }

  /* ---------- 4. Популярные товары с фильтром ---------------------------------------- */
  function initPopular() {
    var grid = $('[data-home-grid]');
    var tabs = $('[data-home-tabs]');
    if (!grid || !tabs) return;
    var products = window.PRODUCTS || [];
    var cats = (window.CATEGORIES || []).filter(function (c) {
      return products.some(function (p) { return p.cat === c.id; });
    });

    tabs.innerHTML = '<button class="tab" type="button" role="tab" aria-selected="true" data-cat="all">Все</button>' +
      cats.map(function (c) { return '<button class="tab" type="button" role="tab" aria-selected="false" data-cat="' + c.id + '">' + MM.esc(c.title) + '</button>'; }).join('');

    function render(cat) {
      var list = cat === 'all'
        ? products.slice().sort(function (a, b) { return (b.badge ? 1 : 0) - (a.badge ? 1 : 0); }).slice(0, 6)
        : products.filter(function (p) { return p.cat === cat; });
      grid.innerHTML = list.map(function (p, i) { return MM.card(p, i); }).join('');
      MM.fav.sync();
    }
    tabs.addEventListener('click', function (e) {
      var tab = e.target.closest('.tab');
      if (!tab) return;
      $$('.tab', tabs).forEach(function (t) { t.setAttribute('aria-selected', String(t === tab)); });
      render(tab.getAttribute('data-cat'));
    });
    render('all');
  }

  /* ---------- 5. Калькулятор ---------------------------------------------------------- */
  /* Все цены ниже — ориентиры для расчёта. Поменяйте их на свои. */
  var CALC = {
    types: {
      kitchen: { title: 'Кухня', meter: 36000, days: 21 },
      wardrobe: { title: 'Шкаф-купе', meter: 27000, days: 14 },
      walkin: { title: 'Гардеробная', meter: 24000, days: 21 },
      hallway: { title: 'Прихожая', meter: 23000, days: 14 },
      living: { title: 'Гостиная', meter: 26000, days: 18 },
    },
    materials: {
      ldsp: { title: 'ЛДСП', k: 1, days: 0 },
      film: { title: 'МДФ в плёнке', k: 1.18, days: 2 },
      enamel: { title: 'МДФ эмаль', k: 1.45, days: 5 },
      veneer: { title: 'Шпон', k: 1.8, days: 7 },
    },
    extras: { led: 3200, hardware: 5500, stone: 13500 }, // ₽ за погонный метр
    install: 0.08, // доля от стоимости
  };

  function initCalc() {
    var root = $('[data-calc]');
    if (!root) return;
    var form = $('form', root);
    var range = $('input[type=range]', form);
    var totalEl = $('[data-calc-total]', root);
    var shown = 0;

    function read() {
      var type = form.elements.type.value, material = form.elements.material.value;
      var length = Number(range.value);
      var t = CALC.types[type], m = CALC.materials[material];
      var perMeter = t.meter * m.k;
      if (form.elements.led.checked) perMeter += CALC.extras.led;
      if (form.elements.hardware.checked) perMeter += CALC.extras.hardware;
      if (type === 'kitchen' && form.elements.stone.checked) perMeter += CALC.extras.stone;
      var total = perMeter * length;
      if (form.elements.install.checked) total *= 1 + CALC.install;
      total = Math.round(total / 1000) * 1000;
      return { type: type, t: t, m: m, length: length, total: total, perMeter: Math.round(total / length / 100) * 100, days: t.days + m.days };
    }

    function update(animate) {
      var r = read();
      var lengthText = r.length.toFixed(1).replace('.', ',');
      range.style.setProperty('--v', ((r.length - range.min) / (range.max - range.min) * 100) + '%');
      range.setAttribute('aria-valuetext', lengthText + ' метра');
      $('[data-calc-length]', root).textContent = lengthText;
      $('[data-calc-what]', root).textContent = r.t.title + ', ' + lengthText + ' м';
      $('[data-calc-material]', root).textContent = r.m.title;
      $('[data-calc-meter]', root).textContent = fmt(r.perMeter) + ' ₽';
      $('[data-calc-days]', root).textContent = 'от ' + r.days + ' дней';
      $$('[data-only]', root).forEach(function (el) { el.classList.toggle('is-disabled', el.getAttribute('data-only') !== r.type); });

      var from = shown;
      shown = r.total;
      if (animate) MM.tween(from, r.total, 450, function (v) { totalEl.textContent = fmt(Math.round(v / 1000) * 1000); });
      else totalEl.textContent = fmt(r.total);
    }

    form.addEventListener('input', function () { update(true); });
    form.addEventListener('change', function () { update(true); });
    update(false);

    $('[data-calc-order]', root).addEventListener('click', function () {
      var r = read(), extras = [];
      if (form.elements.led.checked) extras.push('подсветка');
      if (form.elements.hardware.checked) extras.push('премиум-фурнитура');
      if (r.type === 'kitchen' && form.elements.stone.checked) extras.push('каменная столешница');
      if (form.elements.install.checked) extras.push('доставка и монтаж');
      MM.openRequest('Точный расчёт стоимости',
        r.t.title + ', ' + r.length.toFixed(1).replace('.', ',') + ' м, фасады: ' + r.m.title +
        (extras.length ? ', дополнительно: ' + extras.join(', ') : '') +
        '. Предварительно на сайте: от ' + fmt(r.total) + ' ₽.');
    });
  }

  /* ---------- 6. Этапы, параллакс, свечение карточек ------------------------------------ */
  function initScrollFx() {
    var steps = $('[data-steps]');
    var items = steps ? $$('.step', steps) : [];
    var parallax = $$('[data-parallax]');
    var ticking = false;

    function update() {
      ticking = false;
      var vh = window.innerHeight;
      if (steps) {
        var r = steps.getBoundingClientRect();
        var p = Math.max(0, Math.min(1, (vh * 0.72 - r.top) / Math.max(r.height, vh * 0.4)));
        steps.style.setProperty('--sp', p.toFixed(3));
        items.forEach(function (el, i) { el.classList.toggle('is-on', p >= (i + 0.35) / items.length); });
      }
      if (!MM.reduceMotion) parallax.forEach(function (el) {
        var b = el.getBoundingClientRect();
        if (b.bottom < 0 || b.top > vh) return;
        var k = (b.top + b.height / 2 - vh / 2) / vh; // -0.5…0.5
        var img = el.querySelector('img');
        if (img) img.style.setProperty('--py', (-6 + k * -10).toFixed(2) + '%');
      });
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    if (finePointer) $$('.feature').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  initHero();
  initKitchen();
  initRoom();
  initPopular();
  initCalc();
  initScrollFx();
})();

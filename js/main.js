/* ==========================================================================
   МИР МЕБЕЛИ — общий скрипт для всех страниц:
   шапка, меню, анимации появления, избранное, карточки, модальные окна, формы.
   ========================================================================== */
(function () {
  'use strict';

  var SITE = window.SITE || {};
  var PRODUCTS = window.PRODUCTS || [];
  var CATEGORIES = window.CATEGORIES || [];
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return new Intl.NumberFormat('ru-RU').format(Math.round(n)); }
  function catTitle(id) {
    var c = CATEGORIES.filter(function (x) { return x.id === id; })[0];
    return c ? c.title : '';
  }
  function getProduct(id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0]; }
  function icon(name, attrs) { return '<svg aria-hidden="true" ' + (attrs || '') + '><use href="#i-' + name + '"/></svg>'; }

  /* ---------- Контакты из config.js ---------------------------------------- */
  function applyConfig() {
    $$('[data-site]').forEach(function (el) {
      var key = el.getAttribute('data-site');
      if (!SITE[key]) return;
      el.textContent = SITE[key];
      if (key === 'phone' && el.tagName === 'A') el.href = 'tel:' + (SITE.phoneHref || SITE.phone.replace(/[^\d+]/g, ''));
      if (key === 'email' && el.tagName === 'A') el.href = 'mailto:' + SITE.email;
    });
    $$('[data-social]').forEach(function (el) {
      var url = (SITE.socials || {})[el.getAttribute('data-social')];
      if (url) el.href = url; else el.hidden = true;
    });
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- Шапка, прогресс, кнопка «наверх» ----------------------------- */
  function initChrome() {
    var header = $('[data-header]');
    var bar = $('.progress i');
    var toTop = $('[data-to-top]');
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY || 0;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (header) header.classList.toggle('is-scrolled', y > 24);
      if (bar) bar.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
      if (toTop) toTop.classList.toggle('is-on', y > window.innerHeight * 0.8);
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    if (toTop) toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    // Мобильное меню
    var burger = $('[data-burger]');
    var menu = $('[data-mobile-menu]');
    function setMenu(open) {
      if (!burger || !menu) return;
      burger.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);
    }
    if (burger && menu) {
      burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
      menu.addEventListener('click', function (e) { if (e.target.closest('a, button')) setMenu(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
      window.matchMedia('(min-width: 1241px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
    }
  }

  /* ---------- Появление блоков при скролле ---------------------------------- */
  var revealObserver = null;
  function initReveal(root) {
    var items = $$('[data-reveal]:not(.is-in)', root);
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('is-in'); revealObserver.unobserve(entry.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    }
    items.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Счётчики ------------------------------------------------------- */
  function tween(from, to, ms, onStep) {
    if (reduceMotion || ms <= 0) { onStep(to); return; }
    var start = performance.now();
    (function frame(now) {
      var t = Math.min(1, (now - start) / ms);
      var eased = 1 - Math.pow(1 - t, 3);
      onStep(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(frame);
    })(start);
  }
  function initCounters() {
    var items = $$('[data-count]');
    if (!items.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target, to = Number(el.getAttribute('data-count'));
        io.unobserve(el);
        tween(0, to, 1400, function (v) { el.textContent = fmt(v); });
      });
    }, { threshold: 0.6 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Всплывающее уведомление ---------------------------------------- */
  var toastEl, toastTimer;
  function toast(text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    void toastEl.offsetWidth;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  }

  /* ---------- Избранное (хранится в браузере посетителя) ---------------------- */
  var FAV_KEY = 'mir-mebeli:fav';
  var fav = {
    list: function () {
      try {
        var raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
        return Array.isArray(raw) ? raw.filter(function (id) { return !!getProduct(id); }) : [];
      } catch (e) { return []; }
    },
    has: function (id) { return fav.list().indexOf(id) !== -1; },
    toggle: function (id) {
      var list = fav.list(), i = list.indexOf(id);
      if (i === -1) list.push(id); else list.splice(i, 1);
      try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch (e) { /* приватный режим */ }
      fav.sync();
      document.dispatchEvent(new CustomEvent('fav:change', { detail: { id: id, on: i === -1 } }));
      return i === -1;
    },
    sync: function () {
      var list = fav.list();
      $$('[data-fav-count]').forEach(function (el) {
        el.textContent = list.length;
        el.classList.toggle('is-on', list.length > 0);
      });
      $$('[data-fav]').forEach(function (btn) {
        var on = list.indexOf(btn.getAttribute('data-fav')) !== -1;
        btn.setAttribute('aria-pressed', String(on));
        btn.setAttribute('aria-label', on ? 'Убрать из избранного' : 'Добавить в избранное');
      });
    },
  };

  /* ---------- Карточка товара -------------------------------------------------- */
  function card(p, i) {
    var dots = (p.colors || []).map(function (c) { return '<i style="--c:' + esc(c) + '"></i>'; }).join('');
    return '' +
      '<article class="card is-enter" style="--i:' + (i || 0) + '">' +
        (p.badge ? '<span class="badge">' + esc(p.badge) + '</span>' : '') +
        '<button class="fav" type="button" data-fav="' + esc(p.id) + '" aria-pressed="false" aria-label="Добавить в избранное">' + icon('heart') + '</button>' +
        '<button class="card__media" type="button" data-quick="' + esc(p.id) + '" aria-label="Быстрый просмотр: ' + esc(p.title) + '">' +
          '<img src="assets/img/' + esc(p.img) + '-sm.jpg" alt="' + esc(p.title) + '" loading="lazy" width="720" height="483">' +
        '</button>' +
        '<div class="card__body">' +
          '<span class="card__cat">' + esc(catTitle(p.cat)) + '</span>' +
          '<h3 class="card__title"><button type="button" data-quick="' + esc(p.id) + '">' + esc(p.title) + '</button></h3>' +
          '<p class="card__sub">' + esc(p.subtitle) + '</p>' +
          '<div class="card__foot">' +
            '<span class="price"><small>от</small>' + fmt(p.price) + ' ₽</span>' +
            '<span class="dots" aria-hidden="true">' + dots + '</span>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  /* ---------- Модальные окна --------------------------------------------------- */
  var openModal = null, lastFocus = null;

  function buildModals() {
    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="modal" id="modal-request" role="dialog" aria-modal="true" aria-labelledby="req-title" aria-hidden="true">' +
        '<div class="modal__overlay" data-close></div>' +
        '<div class="modal__dialog">' +
          '<button class="modal__close" type="button" data-close aria-label="Закрыть">' + icon('close') + '</button>' +
          '<div class="modal__body">' +
            '<form class="form" data-form novalidate>' +
              '<h3 class="form__title" id="req-title">Оставить заявку</h3>' +
              '<p class="form__sub" data-req-sub>Перезвоним в рабочее время и ответим на вопросы</p>' +
              '<input type="hidden" name="subject" value="Заявка с сайта">' +
              '<div class="field"><label for="r-name">Ваше имя</label><input class="input" id="r-name" name="name" type="text" autocomplete="name" placeholder="Как к вам обращаться" required><span class="field__error" role="alert"></span></div>' +
              '<div class="field"><label for="r-phone">Телефон</label><input class="input" id="r-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" required data-phone><span class="field__error" role="alert"></span></div>' +
              '<div class="field"><label for="r-msg">Комментарий</label><textarea class="input" id="r-msg" name="message" placeholder="Что хотите заказать, размеры, пожелания"></textarea></div>' +
              '<label class="check"><input type="checkbox" name="agree" required><span>Согласен на обработку персональных данных в соответствии с <a href="privacy.html" target="_blank" rel="noopener">политикой конфиденциальности</a></span></label>' +
              '<button class="btn btn--gold btn--block" type="submit">Отправить заявку</button>' +
              '<p class="form__status" data-form-status hidden role="status"></p>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="modal" id="modal-quick" role="dialog" aria-modal="true" aria-label="Карточка товара" aria-hidden="true">' +
        '<div class="modal__overlay" data-close></div>' +
        '<div class="modal__dialog modal__dialog--wide">' +
          '<button class="modal__close" type="button" data-close aria-label="Закрыть">' + icon('close') + '</button>' +
          '<div class="quick" data-quick-body></div>' +
        '</div>' +
      '</div>';
    while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
  }

  function showModal(id) {
    var modal = document.getElementById(id);
    if (!modal) return;
    if (openModal && openModal !== modal) hideModal(true);
    else lastFocus = document.activeElement;
    openModal = modal;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    var target = $('input:not([type=hidden]), .modal__close', modal);
    setTimeout(function () { if (target) target.focus({ preventScroll: true }); }, 60);
  }
  function hideModal(keepFocus) {
    if (!openModal) return;
    openModal.classList.remove('is-open');
    openModal.setAttribute('aria-hidden', 'true');
    openModal = null;
    document.body.classList.remove('is-locked');
    if (!keepFocus && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function openRequest(subject, message) {
    var modal = document.getElementById('modal-request');
    var form = $('form', modal);
    resetForm(form);
    form.elements.subject.value = subject || 'Заявка с сайта';
    $('#req-title', modal).textContent = subject || 'Оставить заявку';
    if (message) form.elements.message.value = message;
    showModal('modal-request');
  }

  function openQuick(id) {
    var p = getProduct(id);
    if (!p) return;
    var specs = (p.specs || []).map(function (s) { return '<div><dt>' + esc(s[0]) + '</dt><dd>' + esc(s[1]) + '</dd></div>'; }).join('');
    $('[data-quick-body]').innerHTML =
      '<div class="quick__media">' + (p.badge ? '<span class="badge">' + esc(p.badge) + '</span>' : '') +
        '<img src="assets/img/' + esc(p.img) + '.jpg" alt="' + esc(p.title) + '" width="1264" height="848"></div>' +
      '<div class="quick__body">' +
        '<span class="card__cat">' + esc(catTitle(p.cat)) + '</span>' +
        '<h3 class="quick__title">' + esc(p.title) + '</h3>' +
        '<p class="quick__desc">' + esc(p.desc) + '</p>' +
        '<dl class="specs">' + specs + '</dl>' +
        '<p class="quick__price"><small>от</small>' + fmt(p.price) + ' ₽</p>' +
        '<div class="quick__actions">' +
          '<button class="btn btn--gold" type="button" data-order="' + esc(p.id) + '">Заказать расчёт</button>' +
          '<button class="fav" type="button" data-fav="' + esc(p.id) + '" aria-pressed="false" aria-label="Добавить в избранное">' + icon('heart') + '</button>' +
        '</div>' +
        '<p class="quick__note">Размеры, цвет и наполнение меняем под ваш проект. Цена зависит от конфигурации.</p>' +
      '</div>';
    fav.sync();
    showModal('modal-quick');
    $('#modal-quick .modal__dialog').scrollTop = 0;
  }

  function initModals() {
    buildModals();
    document.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-close]'))) { hideModal(); return; }
      if ((t = e.target.closest('[data-open-request]'))) { e.preventDefault(); openRequest(t.getAttribute('data-open-request')); return; }
      if ((t = e.target.closest('[data-fav]'))) {
        e.preventDefault();
        var on = fav.toggle(t.getAttribute('data-fav'));
        toast(on ? 'Добавлено в избранное' : 'Убрано из избранного');
        return;
      }
      if ((t = e.target.closest('[data-quick]'))) { e.preventDefault(); openQuick(t.getAttribute('data-quick')); return; }
      if ((t = e.target.closest('[data-order]'))) {
        var p = getProduct(t.getAttribute('data-order'));
        if (p) openRequest('Расчёт: ' + p.title, 'Интересует модель: ' + p.title + ' (' + p.subtitle + ').');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (!openModal) return;
      if (e.key === 'Escape') { hideModal(); return; }
      if (e.key !== 'Tab') return;
      var focusables = $$('a[href], button:not([disabled]), input:not([type=hidden]), textarea, select', openModal)
        .filter(function (el) { return el.offsetParent !== null; });
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- Формы -------------------------------------------------------------- */
  function phoneDigits(value) {
    var v = String(value).trim();
    var hasPrefix = /^\+\s*7/.test(v);
    var d = (hasPrefix ? v.replace(/^\+\s*7/, '') : v).replace(/\D/g, '');
    // «8 912…» или «7 912…» — привычная запись: первую цифру считаем кодом страны
    var lead = d[0] === '7' || d[0] === '8';
    if (lead && (!hasPrefix || d.length === 11)) d = d.slice(1);
    return d.slice(0, 10);
  }
  function phoneFormat(d) {
    if (!d) return '';
    var out = '+7 (' + d.slice(0, 3);
    if (d.length >= 3) out += ') ' + d.slice(3, 6);
    if (d.length >= 6) out += '-' + d.slice(6, 8);
    if (d.length >= 8) out += '-' + d.slice(8, 10);
    return out;
  }
  function initPhoneMask() {
    document.addEventListener('input', function (e) {
      var el = e.target;
      if (!el.matches || !el.matches('[data-phone]')) return;
      var d = phoneDigits(el.value);
      // если стёрли только символ маски — убираем и последнюю цифру
      if (e.inputType === 'deleteContentBackward' && d === el._digits && d.length) d = d.slice(0, -1);
      el._digits = d;
      el.value = phoneFormat(d);
    });
    document.addEventListener('focusin', function (e) {
      var el = e.target;
      if (el.matches && el.matches('[data-phone]') && !el.value) { el.value = '+7 ('; el._digits = ''; }
    });
    document.addEventListener('focusout', function (e) {
      var el = e.target;
      if (el.matches && el.matches('[data-phone]') && !phoneDigits(el.value)) el.value = '';
    });
  }

  function setError(input, text) {
    var field = input.closest('.field');
    if (!field) return;
    field.classList.toggle('is-error', !!text);
    var err = $('.field__error', field);
    if (err) err.textContent = text || '';
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
  }
  function resetForm(form) {
    form.reset();
    $$('.field', form).forEach(function (f) { f.classList.remove('is-error'); var e = $('.field__error', f); if (e) e.textContent = ''; });
    $$('.check', form).forEach(function (c) { c.classList.remove('is-error'); });
    var status = $('[data-form-status]', form);
    if (status) { status.hidden = true; status.classList.remove('is-error'); }
    var done = $('.success', form.parentNode);
    if (done) done.remove();
    form.hidden = false;
  }
  function validate(form) {
    var ok = true, firstBad = null;
    var name = form.elements.name, phone = form.elements.phone, agree = form.elements.agree;
    if (name) {
      var bad = name.value.trim().length < 2;
      setError(name, bad ? 'Укажите имя' : '');
      if (bad) { ok = false; firstBad = firstBad || name; }
    }
    if (phone) {
      var badPhone = phoneDigits(phone.value).length !== 10;
      setError(phone, badPhone ? 'Введите номер полностью: +7 и 10 цифр' : '');
      if (badPhone) { ok = false; firstBad = firstBad || phone; }
    }
    if (agree) {
      agree.closest('.check').classList.toggle('is-error', !agree.checked);
      if (!agree.checked) { ok = false; firstBad = firstBad || agree; }
    }
    if (firstBad) firstBad.focus();
    return ok;
  }
  function showStatus(form, text, isError) {
    var status = $('[data-form-status]', form);
    if (!status) return;
    status.textContent = text;
    status.classList.toggle('is-error', !!isError);
    status.hidden = false;
  }
  function showSuccess(form, title, text) {
    form.hidden = true;
    var box = document.createElement('div');
    box.className = 'success';
    box.setAttribute('role', 'status');
    box.innerHTML = '<div class="success__icon">' + icon('check') + '</div>' +
      '<h3 class="form__title">' + esc(title) + '</h3><p class="muted">' + esc(text) + '</p>' +
      '<button class="btn btn--line btn--sm" type="button" data-form-again>Отправить ещё одну</button>';
    form.parentNode.appendChild(box);
    $('[data-form-again]', box).addEventListener('click', function () { resetForm(form); });
  }

  function submitForm(form) {
    if (!validate(form)) return;
    var payload = {
      subject: form.elements.subject ? form.elements.subject.value : 'Заявка с сайта',
      name: form.elements.name.value.trim(),
      phone: phoneFormat(phoneDigits(form.elements.phone.value)),
      message: form.elements.message ? form.elements.message.value.trim() : '',
      page: location.href,
    };
    var btn = $('[type=submit]', form);
    var phoneText = SITE.phone || '';

    if (SITE.formEndpoint) {
      btn.disabled = true;
      var oldText = btn.textContent;
      btn.textContent = 'Отправляем…';
      fetch(SITE.formEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        showSuccess(form, 'Заявка отправлена', 'Спасибо, ' + payload.name + '! Мы свяжемся с вами в рабочее время.');
      }).catch(function () {
        showStatus(form, 'Не получилось отправить заявку. Попробуйте ещё раз или позвоните нам: ' + phoneText, true);
      }).then(function () { btn.disabled = false; btn.textContent = oldText; });
      return;
    }

    // Адрес приёма заявок не настроен: открываем письмо в почтовой программе посетителя
    var body = 'Имя: ' + payload.name + '\nТелефон: ' + payload.phone +
      (payload.message ? '\nКомментарий: ' + payload.message : '') + '\n\nСтраница: ' + payload.page;
    var mailto = 'mailto:' + (SITE.email || '') + '?subject=' + encodeURIComponent(payload.subject) + '&body=' + encodeURIComponent(body);
    showStatus(form, 'Открываем вашу почтовую программу с готовым письмом — останется нажать «Отправить». Если письмо не открылось, позвоните нам: ' + phoneText);
    window.location.href = mailto;
  }

  function initForms() {
    document.addEventListener('submit', function (e) {
      var form = e.target.closest('[data-form]');
      if (!form) return;
      e.preventDefault();
      submitForm(form);
    });
    document.addEventListener('input', function (e) {
      var el = e.target;
      if (el.closest && el.closest('.field.is-error')) setError(el, '');
    });
    document.addEventListener('change', function (e) {
      var c = e.target.closest && e.target.closest('.check');
      if (c && e.target.checked) c.classList.remove('is-error');
    });
    initPhoneMask();
  }

  /* ---------- Аккордеон ------------------------------------------------------------ */
  function initAccordion() {
    $$('[data-accordion]').forEach(function (acc) {
      acc.addEventListener('click', function (e) {
        var btn = e.target.closest('.acc__btn');
        if (!btn) return;
        var item = btn.closest('.acc__item');
        var open = item.classList.contains('is-open');
        $$('.acc__item', acc).forEach(function (el) {
          el.classList.remove('is-open');
          $('.acc__btn', el).setAttribute('aria-expanded', 'false');
        });
        item.classList.toggle('is-open', !open);
        btn.setAttribute('aria-expanded', String(!open));
      });
    });
  }

  /* ---------- Запуск ---------------------------------------------------------------- */
  window.MM = {
    $: $, $$: $$, esc: esc, fmt: fmt, tween: tween, toast: toast, fav: fav, card: card,
    catTitle: catTitle, getProduct: getProduct, openRequest: openRequest, openQuick: openQuick,
    initReveal: initReveal, reduceMotion: reduceMotion,
  };

  applyConfig();
  initChrome();
  initModals();
  initForms();
  initAccordion();
  initReveal();
  initCounters();
  fav.sync();
})();

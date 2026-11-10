/* ==========================================================================
   МИР МЕБЕЛИ — страница каталога: фильтр по категориям, поиск, сортировка,
   избранное. Состояние фильтров хранится в адресе страницы, поэтому ссылкой
   на подборку можно поделиться.
   ========================================================================== */
(function () {
  'use strict';
  var MM = window.MM;
  if (!MM) return;
  var $ = MM.$, $$ = MM.$$;

  var grid = $('[data-catalog-grid]');
  if (!grid) return;
  var tabs = $('[data-catalog-tabs]');
  var search = $('[data-catalog-search]');
  var sort = $('[data-catalog-sort]');
  var meta = $('[data-catalog-count]');
  var title = $('[data-catalog-title]');
  var crumb = $('[data-catalog-crumb]');
  var products = window.PRODUCTS || [];
  var categories = window.CATEGORIES || [];

  var params = new URLSearchParams(location.search);
  var state = {
    cat: categories.some(function (c) { return c.id === params.get('cat'); }) ? params.get('cat') : 'all',
    fav: params.get('fav') === '1',
    q: params.get('q') || '',
    sort: ['popular', 'price-asc', 'price-desc', 'name'].indexOf(params.get('sort')) !== -1 ? params.get('sort') : 'popular',
  };

  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }

  function renderTabs() {
    var favCount = MM.fav.list().length;
    var html = '<button class="tab" type="button" data-cat="all" aria-pressed="' + (state.cat === 'all' && !state.fav) + '">Все<sup>' + products.length + '</sup></button>';
    categories.forEach(function (c) {
      var n = products.filter(function (p) { return p.cat === c.id; }).length;
      if (!n) return;
      html += '<button class="tab" type="button" data-cat="' + c.id + '" aria-pressed="' + (state.cat === c.id && !state.fav) + '">' + MM.esc(c.title) + '<sup>' + n + '</sup></button>';
    });
    html += '<button class="tab" type="button" data-fav-tab aria-pressed="' + state.fav + '">♥ Избранное<sup>' + favCount + '</sup></button>';
    tabs.innerHTML = html;
  }

  function filtered() {
    var favs = MM.fav.list();
    var q = state.q.trim().toLowerCase();
    var list = products.filter(function (p) {
      if (state.fav) { if (favs.indexOf(p.id) === -1) return false; }
      else if (state.cat !== 'all' && p.cat !== state.cat) return false;
      if (q) {
        var hay = (p.title + ' ' + p.subtitle + ' ' + p.desc + ' ' + MM.catTitle(p.cat)).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    if (state.sort === 'price-asc') list.sort(function (a, b) { return a.price - b.price; });
    else if (state.sort === 'price-desc') list.sort(function (a, b) { return b.price - a.price; });
    else if (state.sort === 'name') list.sort(function (a, b) { return a.title.localeCompare(b.title, 'ru'); });
    return list;
  }

  function syncUrl() {
    var p = new URLSearchParams();
    if (state.fav) p.set('fav', '1');
    else if (state.cat !== 'all') p.set('cat', state.cat);
    if (state.q.trim()) p.set('q', state.q.trim());
    if (state.sort !== 'popular') p.set('sort', state.sort);
    var qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  function render() {
    var list = filtered();
    var heading = state.fav ? 'Избранное' : state.cat === 'all' ? 'Каталог мебели' : MM.catTitle(state.cat);
    if (title) title.textContent = heading;
    if (crumb) crumb.textContent = state.fav ? 'Избранное' : state.cat === 'all' ? 'Каталог' : MM.catTitle(state.cat);
    document.title = heading + ' — Мир Мебели';
    if (meta) meta.textContent = list.length ? 'Найдено: ' + list.length + ' ' + plural(list.length, 'модель', 'модели', 'моделей') : 'Ничего не найдено';

    if (list.length) {
      grid.innerHTML = list.map(function (p, i) { return MM.card(p, i); }).join('');
    } else {
      grid.innerHTML = '<div class="empty"><p>' +
        (state.fav && !state.q ? 'В избранном пока пусто. Нажмите на сердечко на карточке, чтобы сохранить модель.' : 'По вашему запросу ничего не нашлось. Попробуйте изменить фильтры.') +
        '</p><button class="btn btn--line btn--sm" type="button" data-reset>Показать весь каталог</button></div>';
    }
    renderTabs();
    MM.fav.sync();
    syncUrl();
  }

  tabs.addEventListener('click', function (e) {
    var tab = e.target.closest('.tab');
    if (!tab) return;
    if (tab.hasAttribute('data-fav-tab')) { state.fav = true; }
    else { state.fav = false; state.cat = tab.getAttribute('data-cat'); }
    render();
  });
  grid.addEventListener('click', function (e) {
    if (!e.target.closest('[data-reset]')) return;
    state.cat = 'all'; state.fav = false; state.q = ''; search.value = '';
    render();
  });
  var timer;
  search.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { state.q = search.value; render(); }, 160);
  });
  sort.addEventListener('change', function () { state.sort = sort.value; render(); });
  document.addEventListener('fav:change', function () {
    if (state.fav) render(); else renderTabs();
  });

  search.value = state.q;
  sort.value = state.sort;
  render();

  // Ссылка вида catalog.html?product=kitchen-olive сразу открывает карточку
  var direct = params.get('product');
  if (direct && MM.getProduct(direct)) MM.openQuick(direct);
})();

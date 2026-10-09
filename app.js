const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const storage = {
  get(k, fallback) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    }
    catch {
      return fallback;
    }
  }, set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    }
    catch {
    }
  }
};
let requests = storage.get('zhkh-requests', initialRequests);
let currentView = 'dashboard', requestPage = 1, modalPreviousFocus = null;
const PAGE_SIZE = 6;
const requestBodyTemplate = [...$('#requestForm .modal-body').children].map(n => n.cloneNode(true));
const money = n => `${formatMoney(n)} ₽`;
function saveRequests() {
  storage.set('zhkh-requests', requests);
  updateStats();
}
function updateStats() {
  const active = requests.filter(r => r.status !== 'Выполнено').length;
  $('#openRequestCount').textContent = active;
  $('#statRequests').textContent = requests.length;
  $('#statRequestsFoot').textContent = `${active} ${active % 10 === 1 && active % 100 !== 11 ? 'активное' : active % 10 >= 2 && active % 10 <= 4 && !(active % 100 >= 12 && active % 100 <= 14) ? 'активных' : 'активных'} обращения`;
}
function toast(title, message = '', type = 'success') {
  const t = el('section', `toast toast-${type}`);
  t.setAttribute('role', 'status');
  t.append(el('span', 'toast-mark', type === 'error' ? '!' : '✓'));
  const c = el('section', 'toast-copy');
  c.append(el('strong', '', title), el('p', '', message));
  const x = el('button', 'toast-close', '×');
  x.type = 'button';
  x.setAttribute('aria-label', 'Закрыть уведомление');
  x.addEventListener('click', () => t.remove());
  t.append(c, x);
  $('#toastRegion').append(t);
  setTimeout(() => t.remove(), 4500);
}
function setPage(view, updateHash = true) {
  if (!$('#view-' + view))
  view = 'dashboard';
  currentView = view;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
  $$('[data-view]').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  const titles = {
    dashboard: ['Добрый день, Алексей ✦', 'Вот что происходит в вашем доме сегодня.'], requests: ['Обращения жителей', 'Создавайте заявки и следите за их статусом.'], home: ['Мой дом', 'Всё важное о вашем доме и управляющей компании.'], charges: ['Начисления и оплата', 'Проверяйте начисления и историю операций.'], tariffs: ['Тарифы и услуги', 'Информация о действующих услугах и тарифах.'], news: ['Новости дома', 'Объявления и важная информация для жителей.'], contacts: ['Контакты управляющей компании', 'Мы на связи, если вам нужна помощь.']
  };
  $('#pageTitle').textContent = titles[view][0];
  $('#pageSubtitle').textContent = titles[view][1];
  $('#pageEyebrow').textContent = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date()).toUpperCase();
  if (updateHash && location.hash !== `#${view}`)
  history.pushState({
    view
  }, '', `#${view}`);
  closeMobileMenu();
  if (view === 'requests')
  renderRequests();
  if (view === 'charges')
  renderCharges();
  if (view === 'tariffs')
  renderTariffs($('#tariffSearch').value);
  if (view === 'news')
  renderNews();
}
function closeMobileMenu() {
  $('#sidebar').classList.remove('sidebar-open');
  $('#sidebarOverlay').classList.remove('visible');
  $('#menuToggle').setAttribute('aria-expanded', 'false');
  $('#menuToggle').setAttribute('aria-label', 'Открыть меню');
  document.body.classList.remove('menu-open');
}
function openMobileMenu() {
  $('#sidebar').classList.add('sidebar-open');
  $('#sidebarOverlay').classList.add('visible');
  $('#menuToggle').setAttribute('aria-expanded', 'true');
  $('#menuToggle').setAttribute('aria-label', 'Закрыть меню');
  document.body.classList.add('menu-open');
}
function go(view) {
  setPage(view);
  $('#main').focus({
    preventScroll: true
  });
  window.scrollTo({
    top: 0, behavior: 'smooth'
  });
}
function renderRecentRequests() {
  const target = $('#recentRequests');
  target.replaceChildren();
  requests.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).forEach(r => target.append(requestCard(r, true)));
  if (!requests.length)
  target.append(emptyState('Пока нет обращений', 'Создайте первую заявку, если вам нужна помощь.'));
}
function renderRequestPagination(pages) {
  const nav = $('#requestPagination');
  nav.replaceChildren();
  if (pages <= 1)
  return;
  for (let p = 1; p <= pages; p++) {
    const b = el('button', `page-button${p === requestPage ? ' selected' : ''}`, p);
    b.type = 'button';
    b.setAttribute('aria-label', `Страница ${p}`);
    b.setAttribute('aria-current', p === requestPage ? 'page' : 'false');
    b.addEventListener('click', () => {
      requestPage = p;
      renderRequests();
    });
    nav.append(b);
  }
}
function renderRequests() {
  const search = ($('#requestSearch')?.value || '').trim().toLocaleLowerCase('ru');
  const status = $('#requestStatus')?.value || 'all', priority = $('#requestPriority')?.value || 'all';
  const filtered = requests.filter(r => (`${r.id} ${r.title} ${r.description}`.toLocaleLowerCase('ru').includes(search)) && (status === 'all' || r.status === status) && (priority === 'all' || r.priority === priority)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  requestPage = Math.min(requestPage, pages);
  const target = $('#requestsList');
  target.replaceChildren();
  const visible = filtered.slice((requestPage - 1) * PAGE_SIZE, requestPage * PAGE_SIZE);
  if (!visible.length)
  target.append(emptyState('Ничего не найдено', 'Измените фильтры или сбросьте поиск.'));
  else
  visible.forEach(r => target.append(requestCard(r)));
  $('#requestResultCount').textContent = `Показано ${visible.length} из ${filtered.length} обращений`;
  renderRequestPagination(pages);
}
function renderNews() {
  const preview = $('#newsPreview');
  preview.replaceChildren();
  news.slice(0, 3).forEach(n => preview.append(newsCard(n, true)));
  const all = $('#allNews');
  all.replaceChildren();
  news.slice().sort((a, b) => b.date.localeCompare(a.date)).forEach(n => all.append(newsCard(n)));
}
function renderWorks() {
  const preview = $('#worksPreview');
  preview.replaceChildren();
  works.filter(w => w.status === 'Запланировано').slice(0, 3).forEach(w => preview.append(workCard(w)));
  const all = $('#allWorks');
  all.replaceChildren();
  works.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(w => all.append(workCard(w)));
}
function renderHome() {
  const facts = $('#homeFacts');
  facts.replaceChildren();
  [['Статус дома', homeInfo.status], ['Год постройки', homeInfo.yearBuilt], ['Этажность', `${homeInfo.floors} этажей`], ['Количество квартир', homeInfo.apartments], ['Подъезды', homeInfo.entrances], ['Общая площадь', `${formatMoney(homeInfo.area)} м²`]].forEach(([a, b]) => facts.append(detailRow(a, b)));
  const c = $('#companyDetails');
  c.replaceChildren();
  [['Компания', homeInfo.managementCompany], ['Руководитель', homeInfo.manager], ['Телефон', homeInfo.phone], ['Email', homeInfo.email], ['Часы работы', homeInfo.officeHours], ['Адрес офиса', homeInfo.addressOffice]].forEach(([a, b]) => c.append(detailRow(a, b)));
}
function renderCharges() {
  const body = $('#chargesTable');
  body.replaceChildren();
  charges.forEach(item => {
    const tr = el('tr');
    [[item.service, 'service-cell'], [item.volume, ''], [money(item.rate), ''], [money(item.amount), 'amount-cell']].forEach(([v, cls]) => tr.append(el('td', cls, v)));
    const td = el('td');
    td.append(badge(item.status));
    tr.append(td);
    body.append(tr);
  });
  $('#chargesGrandTotal').textContent = money(charges.reduce((s, c) => s + c.amount, 0));
  const history = $('#chargeHistory');
  history.replaceChildren();
  chargeHistory.forEach(item => {
    const tr = el('tr');
    tr.append(el('td', '', item.period), el('td', '', money(item.amount)));
    const date = el('td');
    date.append(dateNode(item.paidAt));
    tr.append(date);
    const td = el('td');
    td.append(badge(item.status));
    tr.append(td);
    history.append(tr);
  });
  const a = $('#accountDetails');
  a.replaceChildren();
  [['Лицевой счёт', homeInfo.account], ['Адрес', homeInfo.address], ['Площадь квартиры', '58,2 м²'], ['Количество проживающих', '2 человека'], ['Период начисления', 'Октябрь 2026']].forEach(([x, y]) => a.append(detailRow(x, y)));
}
function renderTariffs(search = '') {
  const target = $('#tariffGrid');
  target.replaceChildren();
  const items = tariffs.filter(t => (`${t.name} ${t.category} ${t.provider}`.toLocaleLowerCase('ru')).includes(search.toLocaleLowerCase('ru')));
  if (!items.length) {
    target.append(emptyState('Услуги не найдены', 'Попробуйте изменить поисковый запрос.'));
    return;
  }
  items.forEach(t => {
    const card = el('article', 'tariff-card');
    const head = el('section', 'tariff-card-head');
    head.append(el('span', 'tariff-icon', t.category === 'Коммунальные услуги' ? '↗' : '⌂'), badge(t.status));
    card.append(head, el('p', 'tariff-category', t.category), el('h3', '', t.name), el('p', 'tariff-description', t.description));
    const price = el('section', 'tariff-price');
    price.append(el('strong', '', money(t.rate)), el('span', '', `за ${t.unit}`));
    card.append(price, el('p', 'tariff-provider', `Поставщик: ${t.provider}`), el('p', 'tariff-effective', `Действует с ${formatDate(t.effectiveFrom)}`));
    target.append(card);
  });
}
function renderContacts() {
  const target = $('#contactGrid');
  target.replaceChildren();
  contacts.forEach(c => {
    const card = el('article', 'contact-card');
    card.append(el('span', 'contact-icon', c.icon), el('h3', '', c.title), el('p', 'contact-value', c.value), el('p', 'contact-description', c.description));
    if (c.action !== '#') {
      const a = el('a', 'text-button', 'Связаться →');
      a.href = c.action;
      card.append(a);
    }
    target.append(card);
  });
}
function renderAll() {
  updateStats();
  renderRecentRequests();
  renderRequests();
  renderNews();
  renderWorks();
  renderHome();
  renderCharges();
  renderTariffs();
  renderContacts();
}
function showRequestDetails(id) {
  const item = requests.find(r => r.id === id);
  if (!item)
  return;
  const body = $('#modal .modal-body');
  body.replaceChildren();
  const fields = [['Номер', item.id], ['Статус', item.status], ['Категория', item.category], ['Приоритет', item.priority], ['Дата создания', formatDate(item.createdAt)], ['Место', item.location], ['Ответственный', item.responsible], ['Описание', item.description]];
  fields.forEach(([k, v]) => {
    const row = el('section', 'modal-detail-row');
    row.append(el('span', '', k), el('strong', '', v));
    body.append(row);
  });
  const comments = el('section', 'comments-section');
  comments.append(el('h3', '', 'История обращения'));
  item.comments.forEach(c => {
    const row = el('article', 'comment-item');
    row.append(dateNode(c.date), el('p', '', c.text));
    comments.append(row);
  });
  body.append(comments);
  const footer = $('#modal .modal-footer');
  footer.replaceChildren();
  const close = el('button', 'button button-secondary', 'Закрыть');
  close.type = 'button';
  close.addEventListener('click', closeModal);
  footer.append(close);
  if (item.status !== 'Выполнено') {
    const done = el('button', 'button button-primary', 'Отметить выполненным');
    done.type = 'button';
    done.addEventListener('click', () => {
      item.status = 'Выполнено';
      item.updatedAt = new Date().toISOString();
      item.comments.push({
        date: item.updatedAt, text: 'Статус изменён в демонстрационном интерфейсе.'
      });
      saveRequests();
      renderRecentRequests();
      renderRequests();
      closeModal();
      toast('Статус обновлён', 'Обращение отмечено выполненным.');
    });
    footer.append(done);
  }
  $('#modalTitle').textContent = item.title;
  openModal();
}
function openModal() {
  modalPreviousFocus = document.activeElement;
  $('#modalBackdrop').hidden = false;
  document.body.classList.add('modal-open');
  $('#modal').focus();
  const first = $('#modal').querySelector('input,select,textarea,button');
  first?.focus();
}
function closeModal() {
  if ($('#modalBackdrop').hidden)
  return;
  $('#modalBackdrop').hidden = true;
  document.body.classList.remove('modal-open');
  if (modalPreviousFocus?.isConnected)
  modalPreviousFocus.focus();
}
function resetRequestForm() {
  const f = $('#requestForm');
  f.reset();
  f.querySelectorAll('.field').forEach(field => {
    field.classList.remove('invalid');
    field.querySelector('.field-error')?.replaceChildren();
  });
}
function validateField(field) {
  const wrapper = field.closest('.field');
  if (!wrapper)
  return true;
  let message = '';
  if (field.required && !field.value.trim())
  message = 'Заполните это поле.';
  else if (field.minLength > 0 && field.value.trim().length < field.minLength)
  message = `Введите не менее ${field.minLength} символов.`;
  else if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value))
  message = 'Введите корректный email.';
  else if (field.name === 'phone' && field.value && !/^[+\d()\s-]{7,20}$/.test(field.value))
  message = 'Введите корректный номер телефона.';
  wrapper.classList.toggle('invalid', !!message);
  const error = wrapper.querySelector('.field-error');
  if (error)
  error.textContent = message;
  field.setAttribute('aria-invalid', String(!!message));
  return !message;
}
function setupForms() {
  const requestForm = $('#requestForm');
  requestForm.addEventListener('focusout', e => {
    if (e.target.matches('input,select,textarea'))
    validateField(e.target);
  });
  requestForm.addEventListener('input', e => {
    if (e.target.getAttribute('aria-invalid') === 'true')
    validateField(e.target);
  });
  requestForm.addEventListener('submit', e => {
    e.preventDefault();
    const fields = [...requestForm.querySelectorAll('[required]')];
    if (!fields.map(validateField).every(Boolean)) {
      requestForm.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const data = new FormData(requestForm);
    const now = new Date().toISOString();
    const item = {
      id: `REQ-${String(1100 + requests.length).padStart(4, '0')}`, title: data.get('title').trim(), description: data.get('description').trim(), category: data.get('category'), status: 'Новое', priority: data.get('priority'), createdAt: now, updatedAt: now, location: data.get('location'), responsible: 'Диспетчерская', resident: 'Алексей К.', comments: [{
        date: now, text: 'Обращение зарегистрировано.'
      }], tags: [String(data.get('category')).toLowerCase()], unit: 48, channel: 'Личный кабинет'
    };
    requests.unshift(item);
    saveRequests();
    renderRecentRequests();
    renderRequests();
    resetRequestForm();
    closeModal();
    toast('Обращение отправлено', `Создана заявка ${item.id}. Её статус можно отслеживать в личном кабинете.`);
    if (currentView !== 'requests')
    setPage('requests');
  });
  const callback = $('#callbackForm');
  callback.addEventListener('focusout', e => {
    if (e.target.matches('input,textarea'))
    validateField(e.target);
  });
  callback.addEventListener('input', e => {
    if (e.target.getAttribute('aria-invalid') === 'true')
    validateField(e.target);
  });
  callback.addEventListener('submit', e => {
    e.preventDefault();
    const fields = [...callback.querySelectorAll('[required]')];
    if (!fields.map(validateField).every(Boolean)) {
      callback.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const d = new FormData(callback);
    storage.set('zhkh-callbacks', [...storage.get('zhkh-callbacks', []), {
      id: `CALL-${Date.now()}`, name: d.get('name').trim(), phone: d.get('phone').trim(), message: d.get('message').trim(), createdAt: new Date().toISOString(), status: 'Новое'
    }]);
    callback.reset();
    callback.querySelectorAll('.field').forEach(f => {
      f.classList.remove('invalid');
      f.querySelector('.field-error').textContent = '';
    });
    toast('Заявка на звонок создана', 'Данные сохранены в демо-режиме.');
  });
}
function downloadReceipt() {
  const rows = [['Услуга', 'Объём', 'Тариф', 'Начислено'], ...charges.map(c => [c.service, c.volume, money(c.rate), money(c.amount)]), ['Итого', '', '', money(charges.reduce((s, c) => s + c.amount, 0))]];
  const csv = '\uFEFF' + rows.map(row => row.map(v => '\"' + String(v).replaceAll('\"', '\"\"') + '\"').join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], {
    type: 'text/csv;charset=utf-8;'
  }));
  const a = el('a');
  a.href = url;
  a.download = 'kvитанция-октябрь-2026.csv';
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Квитанция подготовлена', 'Файл CSV сохранён на ваше устройство.');
}
function applyTheme(theme, manual = true) {
  document.documentElement.dataset.theme = theme;
  if (manual)
  try {
    localStorage.setItem('zhkh-theme', theme);
  }
  catch {
  };
  const labels = {
    light: 'Включить тёмную тему', dark: 'Включить контрастную тему', contrast: 'Включить светлую тему'
  };
  $('#themeToggle').setAttribute('aria-label', labels[theme] || labels.light);
  $('#themeToggle').title = `Тема: ${{ light: 'светлая', dark: 'тёмная', contrast: 'повышенная контрастность' }[theme] || 'светлая'}`;
}

function setupEvents() {
  document.addEventListener('click', e => {
    const goButton = e.target.closest('[data-go]');
    if (goButton) {
      go(goButton.dataset.go);
      return;
    }
    const nav = e.target.closest('[data-view]');
    if (nav) {
      e.preventDefault();
      go(nav.dataset.view);
      return;
    }
    const details = e.target.closest('[data-action="details"]');
    if (details) {
      showRequestDetails(details.closest('[data-id]').dataset.id);
      return;
    }
    const newsButton = e.target.closest('[data-action="news-details"]');
    if (newsButton) {
      const item = news.find(n => n.id === newsButton.dataset.id);
      if (item) {
        $('#modalTitle').textContent = item.title;
        const body = $('#modal .modal-body');
        body.replaceChildren();
        const meta = el('section', 'news-meta');
        meta.append(el('span', 'news-category', item.category), dateNode(item.date));
        body.append(meta, el('p', 'news-detail-body', item.body), el('p', 'news-author', `Опубликовано: ${item.author}`));
        const foot = $('#modal .modal-footer');
        foot.replaceChildren();
        const b = el('button', 'button button-primary', 'Понятно');
        b.type = 'button';
        b.addEventListener('click', closeModal);
        foot.append(b);
        openModal();
      }
      return;
    }
  });
  $('#menuToggle').addEventListener('click', () => $('#sidebar').classList.contains('sidebar-open') ? closeMobileMenu() : openMobileMenu());
  $('#sidebarOverlay').addEventListener('click', closeMobileMenu);
  $('#themeToggle').addEventListener('click', () => {
    const order = ['light', 'dark', 'contrast'];
    const current = document.documentElement.dataset.theme;
    applyTheme(order[(order.indexOf(current) + 1) % order.length]);
    toast('Тема изменена', ({
      light: 'Светлая тема', dark: 'Тёмная тема', contrast: 'Повышенная контрастность'
    })[document.documentElement.dataset.theme], 'info');
  });
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  systemTheme.addEventListener?.('change', e => {
    if (!localStorage.getItem('zhkh-theme'))
    applyTheme(e.matches ? 'dark' : 'light', false);
  });
  $('#newRequestButton').addEventListener('click', () => {
    $('#modal .modal-body').replaceChildren(...requestBodyTemplate.map(n => n.cloneNode(true)));
    resetRequestForm();
    $('#modalTitle').textContent = 'Новое обращение';
    $('#modal .modal-footer').replaceChildren();
    const cancel = el('button', 'button button-secondary', 'Отмена');
    cancel.type = 'button';
    cancel.addEventListener('click', closeModal);
    const submit = el('button', 'button button-primary', 'Отправить обращение →');
    submit.type = 'submit';
    $('#modal .modal-footer').append(cancel, submit);
    openModal();
  });
  $('#newRequestButton2').addEventListener('click', () => $('#newRequestButton').click());
  $('#modalClose').addEventListener('click', closeModal);
  $('#cancelRequest').addEventListener('click', closeModal);
  $('#modalBackdrop').addEventListener('click', e => {
    if (e.target === $('#modalBackdrop'))
    closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeMobileMenu();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      $('#globalSearch').focus();
    }
    if (!$('#modalBackdrop').hidden && e.key === 'Tab') {
      const focusables = [...$('#modal').querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]')].filter(x => x.offsetParent !== null);
      if (!focusables.length)
      return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
      else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  ['requestSearch', 'requestStatus', 'requestPriority'].forEach(id => $('#' + id).addEventListener(id === 'requestSearch' ? 'input' : 'change', () => {
    requestPage = 1;
    renderRequests();
  }));
  $('#resetRequestFilters').addEventListener('click', () => {
    $('#requestSearch').value = '';
    $('#requestStatus').value = 'all';
    $('#requestPriority').value = 'all';
    requestPage = 1;
    renderRequests();
  });
  $('#tariffSearch').addEventListener('input', e => renderTariffs(e.target.value));
  $('#downloadCharges').addEventListener('click', downloadReceipt);
  $('#payButton').addEventListener('click', () => toast('Демо-оплата недоступна', 'Реальный платёж не выполняется. Используйте официальную квитанцию и платёжный сервис.', 'info'));
  $('#helpButton').addEventListener('click', () => go('contacts'));
  $('#helpCardButton').addEventListener('click', () => go('contacts'));
  $('#buildingInfo').addEventListener('click', () => go('home'));
  $('#profileButton').addEventListener('click', () => toast('Профиль жителя', 'Демо-профиль: квартира 48, подъезд 3.'));
  $('#chargePeriod').addEventListener('change', e => toast('Выбран период', `${e.target.value}. В этой демо-версии детализация отображается за октябрь 2026.`, 'info'));
  $('#globalSearch').addEventListener('input', e => {
    const q = e.target.value.trim().toLocaleLowerCase('ru');
    if (!q)
    return;
    const match = requests.find(r => `${r.id} ${r.title}`.toLocaleLowerCase('ru').includes(q));
    if (match) {
      if (currentView !== 'requests')
      go('requests');
      $('#requestSearch').value = q;
      renderRequests();
    }
  });
  window.addEventListener('popstate', () => setPage(location.hash.slice(1) || 'dashboard', false));
}
function init() {
  setupEvents();
  setupForms();
  renderAll();
  const view = location.hash.replace('#', '');
  setPage($('#view-' + view) ? view : 'dashboard', false);
}
init();

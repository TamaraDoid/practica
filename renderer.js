// Чистые функции рендера: принимают данные и возвращают DOM-узел. Данные вставляются только через textContent.
const el = (tag, className = '', text = '') => {
  const node = document.createElement(tag);
  if (className)
  node.className = className;
  if (text !== '' && text !== null && text !== undefined)
  node.textContent = String(text);
  return node;
};
const formatMoney = value => new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(value);
const formatDate = value => new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric', month: 'short', year: 'numeric'
}).format(new Date(value));
const dateNode = value => {
  const time = el('time', '', formatDate(value));
  time.dateTime = value;
  return time;
};
const badge = (status) => el('span', `badge ${({ 'Новое': 'badge-info', 'В работе': 'badge-warning', 'Ожидает ответа': 'badge-purple', 'Выполнено': 'badge-success', 'Запланировано': 'badge-info', 'Оплачено': 'badge-success', 'К оплате': 'badge-warning', 'Обслуживается': 'badge-success' })[status] || 'badge-neutral'}`, status);
function requestCard(item, compact = false) {
  const article = el('article', `request-item${compact ? ' compact' : ''}`);
  article.dataset.id = item.id;
  const icon = el('span', 'request-symbol', ({
    'Электрика': 'ϟ', 'Сантехника': '≈', 'Уборка и содержание': '✦', 'Лифты': '↕', 'Отопление': '♨', 'Начисления': '₽', 'Благоустройство': '⌂'
  })[item.category] || '✉');
  const main = el('section', 'request-main');
  const top = el('section', 'request-topline');
  top.append(el('span', 'request-id', item.id), badge(item.status));
  main.append(top, el('h3', 'request-title', item.title), el('p', 'request-description', item.description));
  const meta = el('section', 'request-meta');
  meta.append(el('span', '', `▦ ${formatDate(item.createdAt)}`), el('span', '', `⌖ ${item.location}`), el('span', '', `Ответственный: ${item.responsible}`));
  main.append(meta);
  const side = el('section', 'request-side');
  side.append(el('span', `priority priority-${item.priority === 'Высокий' ? 'high' : item.priority === 'Низкий' ? 'low' : 'normal'}`, `● ${item.priority} приоритет`));
  const open = el('button', 'text-button request-open', 'Подробнее →');
  open.type = 'button';
  open.dataset.action = 'details';
  open.setAttribute('aria-label', `Подробнее об обращении ${item.id}`);
  side.append(open);
  article.append(icon, main, side);
  return article;
}
function newsCard(item, compact = false) {
  const article = el('article', `news-card${compact ? ' news-compact' : ''}`);
  const visual = el('section', `news-visual news-tone-${item.id.slice(-1)}`);
  visual.append(el('span', 'news-visual-icon', item.category === 'Плановые работы' ? '▦' : item.category === 'Важно' ? '!' : '✦'));
  const content = el('section', 'news-card-content');
  const meta = el('section', 'news-meta');
  meta.append(el('span', 'news-category', item.category), dateNode(item.date));
  content.append(meta, el('h3', '', item.title), el('p', '', item.excerpt));
  const button = el('button', 'text-button', 'Читать →');
  button.type = 'button';
  button.dataset.action = 'news-details';
  button.dataset.id = item.id;
  content.append(button);
  article.append(visual, content);
  return article;
}
function workCard(item) {
  const article = el('article', 'work-item');
  const d = new Date(item.date + 'T12:00:00');
  const date = el('time', 'work-date');
  date.dateTime = item.date;
  date.append(el('strong', '', String(d.getDate()).padStart(2, '0')), el('span', '', new Intl.DateTimeFormat('ru-RU', {
    month: 'short'
  }).format(d).replace('.', '')));
  const body = el('section', 'work-body');
  body.append(el('h3', '', item.title), el('p', '', `${item.time} · ${item.location}`), el('small', '', item.description));
  article.append(date, body, badge(item.status));
  return article;
}
function emptyState(title, description) {
  const section = el('section', 'empty-state');
  section.append(el('span', 'empty-icon', '⌕'), el('h3', '', title), el('p', '', description));
  return section;
}
function detailRow(label, value) {
  const row = el('section', 'detail-row');
  row.append(el('span', '', label), el('strong', '', value));
  return row;
}

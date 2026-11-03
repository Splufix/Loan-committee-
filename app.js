'use strict';

const STORAGE_KEY = 'coopsave-repayments-v2';
const seedRecords = [];
const seedActivity = [];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.records) && Array.isArray(saved.activity)) return saved;
    const legacy = JSON.parse(localStorage.getItem('coopsave-repayments-v1'));
    if (legacy && Array.isArray(legacy.records) && Array.isArray(legacy.activity)) {
      return {
        records: legacy.records.map(record => ({ ...record, amount: Math.round(record.amount * 100), received: Math.round(record.received * 100) })),
        activity: legacy.activity.map(item => ({ ...item, amount: Math.round(item.amount * 100) }))
      };
    }
  } catch { /* Use empty state if local storage is unavailable. */ }
  return { records: structuredClone(seedRecords), activity: structuredClone(seedActivity) };
}
let { records, activity } = loadState();
const byId = id => records.find(record => record.id === Number(id));
const remaining = record => Math.max(0, record.amount - record.received);
const today = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};
const isLate = record => remaining(record) > 0 && record.due < today();
function statusOf(record) {
  if (remaining(record) === 0) return 'paid';
  if (record.received > 0) return 'partial';
  return isLate(record) ? 'overdue' : 'due';
}
const naira = amountKobo => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amountKobo / 100);
const formatDate = value => {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+01:00`) : new Date(value);
  return new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' }).format(date);
};
const monthInLagos = value => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit' }).formatToParts(new Date(value));
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${fields.year}-${fields.month}`;
};
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const schedule = document.querySelector('#scheduleList');
const dialog = document.querySelector('#repaymentDialog');
const memberSelect = document.querySelector('#memberSelect');

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ records, activity })); }
  catch { showToast('This browser could not save the repayment records. They may not remain after you close this page.'); }
}
function labelFor(record) {
  const status = statusOf(record);
  if (status === 'paid') return ['paid', 'Paid'];
  if (status === 'overdue' || (status === 'partial' && isLate(record))) return [status === 'partial' ? 'overdue partial' : 'overdue', status === 'partial' ? 'Part-paid · overdue' : 'Overdue'];
  if (status === 'partial') return ['partial', 'Part-paid'];
  return ['due', 'Due soon'];
}
function renderSchedule() {
  const filter = document.querySelector('#statusFilter').value;
  const ordered = [...records].sort((a, b) => a.due.localeCompare(b.due));
  const shown = ordered.filter(record => {
    const status = statusOf(record);
    if (filter === 'all') return true;
    if (filter === 'overdue') return isLate(record);
    if (filter === 'due') return remaining(record) > 0 && !isLate(record);
    return status === filter;
  });
  schedule.innerHTML = shown.length ? shown.map(record => {
    const [className, label] = labelFor(record);
    const amountLeft = remaining(record);
    return `<article class="repay-row">
      <div class="person person-cell"><span class="avatar" aria-hidden="true">${escapeHtml(record.initials)}</span><div class="person-text"><strong>${escapeHtml(record.name)}</strong><small>${escapeHtml(record.loan)} · Instalment ${record.installment} of ${record.total}</small></div></div>
      <div class="amount-cell"><span class="row-label">${amountLeft ? 'Remaining' : 'Instalment'}</span><span class="row-value">${naira(amountLeft || record.amount)}</span>${record.received > 0 && amountLeft > 0 ? `<small class="person-text"><span class="row-label">Received ${naira(record.received)}</span></small>` : ''}</div>
      <div class="status-cell"><span class="row-label">${statusOf(record) === 'paid' ? 'Received' : 'Due date'}</span><span class="status ${className}">${label}</span><small class="person-text"><span class="row-label">${formatDate(record.due)}</span></small></div>
      <div class="action-cell">${amountLeft ? `<button class="row-action" type="button" data-record="${record.id}" aria-label="Record a repayment for ${escapeHtml(record.name)}">Record payment</button>` : `<span class="row-value">Complete</span>`}</div>
    </article>`;
  }).join('') : !records.length
    ? '<div class="empty-state">No repayment schedules are available yet. Approved loan schedules will appear here.</div>'
    : '<div class="empty-state">No repayments match this filter.</div>';
  schedule.querySelectorAll('[data-record]').forEach(button => button.addEventListener('click', () => openDialog(button.dataset.record)));
}
function render() {
  renderSchedule();
  const open = records.filter(record => remaining(record) > 0);
  document.querySelector('#recordTop').disabled = open.length === 0;
  document.querySelector('#recordAvailability').hidden = open.length > 0;
  const late = open.filter(isLate);
  const currentMonth = today().slice(0, 7);
  const collected = activity.filter(item => monthInLagos(item.createdAt) === currentMonth).reduce((sum, item) => sum + item.amount, 0);
  document.querySelector('#metricDue').textContent = naira(open.reduce((sum, record) => sum + remaining(record), 0));
  document.querySelector('#metricPaid').textContent = naira(collected);
  document.querySelector('#metricOverdue').textContent = naira(late.reduce((sum, record) => sum + remaining(record), 0));
  document.querySelector('#overdueCount').textContent = `${late.length} repayment${late.length === 1 ? '' : 's'} need attention`;
  document.querySelector('#metricPlans').textContent = new Set(open.map(record => record.name)).size;
  document.querySelector('#attentionList').innerHTML = late.length ? late.map(record => `<div class="transaction"><span class="transaction-icon" style="background:var(--red-soft);color:var(--red)" aria-hidden="true">!</span><div><strong>${escapeHtml(record.name)}</strong><small>${formatDate(record.due)} · ${escapeHtml(record.loan)}</small></div><b>${naira(remaining(record))}</b></div>`).join('') : '<div class="empty-state">No overdue repayments.</div>';
  const recent = [...activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  document.querySelector('#transactions').innerHTML = recent.length ? recent.map(item => `<div class="transaction"><span class="transaction-icon" aria-hidden="true">✓</span><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.method)} · ${formatDate(item.createdAt)}</small></div><b>+${naira(item.amount)}</b></div>`).join('') : '<div class="empty-state">No repayments recorded yet.</div>';
}
function openDialog(recordId) {
  const eligible = records.filter(record => remaining(record) > 0);
  if (!eligible.length) { showToast('There are no unpaid instalments to record.'); return; }
  memberSelect.innerHTML = eligible.map(record => `<option value="${record.id}" ${Number(recordId) === record.id ? 'selected' : ''}>${escapeHtml(record.name)} — ${escapeHtml(record.loan)} · balance ${naira(remaining(record))}</option>`).join('');
  updateAmountLimit();
  dialog.showModal();
  document.querySelector('#amountInput').focus();
}
function updateAmountLimit() {
  const record = byId(memberSelect.value);
  const input = document.querySelector('#amountInput');
  if (!record) return;
  input.max = (remaining(record) / 100).toFixed(2);
  input.value = (remaining(record) / 100).toFixed(2);
  input.setCustomValidity('');
  document.querySelector('#amountHint').textContent = `Enter an amount up to ${naira(remaining(record))}. This records the repayment only; it will not charge a card.`;
}
function showToast(message) {
  const toast = document.querySelector('#toast');
  document.querySelector('#toastText').textContent = ` ${message}`;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 5500);
}

function closeDialog() { dialog.close(); }
document.querySelector('#recordTop').addEventListener('click', () => openDialog());
document.querySelector('#viewAll').addEventListener('click', () => {
  document.querySelector('#statusFilter').value = 'all';
  render();
  schedule.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.querySelector('#statusFilter').addEventListener('change', render);
memberSelect.addEventListener('change', updateAmountLimit);
document.querySelector('#amountInput').addEventListener('input', event => {
  const record = byId(memberSelect.value);
  const amount = Number(event.currentTarget.value);
  event.currentTarget.setCustomValidity(record && Math.round(amount * 100) > remaining(record) ? `Enter no more than ${naira(remaining(record))}.` : '');
});
document.querySelector('#closeDialog').addEventListener('click', closeDialog);
document.querySelector('#cancelDialog').addEventListener('click', closeDialog);
document.querySelector('#repaymentForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!event.currentTarget.reportValidity()) return;
  const record = byId(memberSelect.value);
  const amount = Math.round(Number(document.querySelector('#amountInput').value) * 100);
  if (!record || amount < 1 || amount > remaining(record)) return;
  record.received += amount;
  activity.unshift({ recordId: record.id, name: record.name, amount, createdAt: new Date().toISOString(), method: document.querySelector('#methodSelect').value });
  saveState();
  closeDialog();
  render();
  showToast(`${naira(amount)} recorded for ${record.name} in this browser. No money was charged.`);
});
document.querySelector('#resetDemo').addEventListener('click', () => {
  if (!window.confirm('Clear repayment records stored in this browser? This cannot be undone.')) return;
  records = structuredClone(seedRecords);
  activity = structuredClone(seedActivity);
  saveState();
  document.querySelector('#statusFilter').value = 'all';
  render();
  showToast('Browser repayment records cleared.');
});

render();

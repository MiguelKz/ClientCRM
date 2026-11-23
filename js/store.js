/* ClientCRM – camada de dados (localStorage) e utilitários */
const Store = (() => {
  const KEY = 'clientcrm:v1';
  const empty = () => ({ clientes: [], atendimentos: [], oportunidades: [] });

  let db = load();
  const listeners = new Set();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
    } catch {
      return empty();
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { console.error(e); }
    listeners.forEach(fn => fn());
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  return {
    all: (col) => [...db[col]],
    get: (col, id) => db[col].find(r => r.id === id),
    insert(col, data) {
      const rec = { id: uid(), criadoEm: new Date().toISOString(), ...data };
      db[col].push(rec);
      save();
      return rec;
    },
    update(col, id, data) {
      const i = db[col].findIndex(r => r.id === id);
      if (i < 0) return null;
      db[col][i] = { ...db[col][i], ...data, atualizadoEm: new Date().toISOString() };
      save();
      return db[col][i];
    },
    remove(col, id) {
      db[col] = db[col].filter(r => r.id !== id);
      save();
    },
    /* Remove um cliente e tudo que depende dele */
    removeCliente(id) {
      db.clientes = db.clientes.filter(r => r.id !== id);
      db.atendimentos = db.atendimentos.filter(r => r.clienteId !== id);
      db.oportunidades = db.oportunidades.filter(r => r.clienteId !== id);
      save();
    },
    exportJSON: () => JSON.stringify(db, null, 2),
    importJSON(text) {
      const data = JSON.parse(text);
      if (!Array.isArray(data.clientes)) throw new Error('Arquivo inválido');
      db = { ...empty(), ...data };
      save();
    },
    reset(data) { db = data || empty(); save(); },
    isEmpty: () => db.clientes.length === 0,
    onChange: (fn) => listeners.add(fn),
  };
})();

/* ---------- Utilitários de interface ---------- */
const UI = {
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  money(v) {
    return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },
  moneyShort(v) {
    v = Number(v || 0);
    if (v >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
    if (v >= 1e3) return 'R$ ' + (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
    return UI.money(v);
  },
  date(iso) {
    if (!iso) return '—';
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR');
  },
  today: () => new Date().toISOString().slice(0, 10),

  toast(msg, type = 'ok') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3000);
  },

  /* Abre um modal com formulário. fields: [{name,label,type,options,required,full,value}] */
  form({ title, fields, values = {}, submitLabel = 'Salvar', onSubmit }) {
    const body = fields.map(f => {
      const v = values[f.name] ?? f.value ?? '';
      const req = f.required ? 'required' : '';
      let input;
      if (f.type === 'select') {
        input = `<select name="${f.name}" ${req}>${f.options.map(o => {
          const [val, lab] = Array.isArray(o) ? o : [o, o];
          return `<option value="${UI.esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${UI.esc(lab)}</option>`;
        }).join('')}</select>`;
      } else if (f.type === 'textarea') {
        input = `<textarea name="${f.name}" rows="4" ${req}>${UI.esc(v)}</textarea>`;
      } else {
        const extra = f.type === 'number' ? 'step="any" min="0"' : '';
        input = `<input type="${f.type || 'text'}" name="${f.name}" value="${UI.esc(v)}" ${req} ${extra}>`;
      }
      return `<label class="field ${f.full ? 'full' : ''}"><span>${UI.esc(f.label)}${f.required ? ' *' : ''}</span>${input}</label>`;
    }).join('');

    const modal = UI.modal(title, `<form class="form-grid">${body}
      <div class="form-actions full"><button type="button" class="btn ghost" data-close>Cancelar</button>
      <button type="submit" class="btn primary">${UI.esc(submitLabel)}</button></div></form>`);

    const formEl = modal.querySelector('form');
    formEl.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(formEl).entries());
      fields.forEach(f => { if (f.type === 'number') data[f.name] = Number(data[f.name] || 0); });
      if (onSubmit(data) !== false) UI.closeModal();
    });
    formEl.querySelector('input,select,textarea')?.focus();
  },

  modal(title, html, wide = false) {
    UI.closeModal();
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <header><h3>${UI.esc(title)}</h3><button class="icon-btn" data-close aria-label="Fechar">✕</button></header>
      <div class="modal-body">${html}</div></div>`;
    wrap.addEventListener('click', e => {
      if (e.target === wrap || e.target.closest('[data-close]')) UI.closeModal();
    });
    document.body.appendChild(wrap);
    return wrap;
  },
  closeModal() { document.querySelector('.modal-backdrop')?.remove(); },

  confirm(msg, onYes) {
    const m = UI.modal('Confirmar', `<p>${UI.esc(msg)}</p>
      <div class="form-actions"><button class="btn ghost" data-close>Cancelar</button>
      <button class="btn danger" id="confirm-yes">Excluir</button></div>`);
    m.querySelector('#confirm-yes').onclick = () => { UI.closeModal(); onYes(); };
  },

  clienteOptions() {
    return Store.all('clientes')
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map(c => [c.id, c.empresa ? `${c.nome} – ${c.empresa}` : c.nome]);
  },
  clienteNome(id) {
    const c = Store.get('clientes', id);
    return c ? c.nome : '(cliente removido)';
  },
};

document.addEventListener('keydown', e => { if (e.key === 'Escape') UI.closeModal(); });

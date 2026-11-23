/* ClientCRM – Cadastro de clientes */
const Clientes = (() => {
  const STATUS = [['lead', 'Lead'], ['ativo', 'Ativo'], ['inativo', 'Inativo']];
  const SEGMENTOS = ['Varejo', 'Indústria', 'Serviços', 'Tecnologia', 'Saúde', 'Educação', 'Outro'];
  const state = { busca: '', status: '', segmento: '' };

  const fields = [
    { name: 'nome', label: 'Nome', required: true },
    { name: 'empresa', label: 'Empresa' },
    { name: 'email', label: 'E-mail', type: 'email' },
    { name: 'telefone', label: 'Telefone', type: 'tel' },
    { name: 'documento', label: 'CPF / CNPJ' },
    { name: 'cidade', label: 'Cidade / UF' },
    { name: 'segmento', label: 'Segmento', type: 'select', options: SEGMENTOS },
    { name: 'status', label: 'Status', type: 'select', options: STATUS, value: 'lead' },
    { name: 'observacoes', label: 'Observações', type: 'textarea', full: true },
  ];

  const statusLabel = s => (STATUS.find(x => x[0] === s) || [, s])[1];
  const badge = s => `<span class="badge st-${UI.esc(s)}">${UI.esc(statusLabel(s))}</span>`;

  function validar(data, id) {
    if (data.email) {
      const dup = Store.all('clientes').find(c => c.id !== id && c.email?.toLowerCase() === data.email.toLowerCase());
      if (dup) { UI.toast(`E-mail já cadastrado para ${dup.nome}`, 'err'); return false; }
    }
    return true;
  }

  function novo() {
    UI.form({
      title: 'Novo cliente', fields,
      onSubmit: d => { if (!validar(d)) return false; Store.insert('clientes', d); UI.toast('Cliente cadastrado'); },
    });
  }

  function editar(id) {
    const c = Store.get('clientes', id);
    UI.form({
      title: 'Editar cliente', fields, values: c,
      onSubmit: d => { if (!validar(d, id)) return false; Store.update('clientes', id, d); UI.toast('Cliente atualizado'); },
    });
  }

  function excluir(id) {
    const c = Store.get('clientes', id);
    UI.confirm(`Excluir "${c.nome}"? O histórico e as oportunidades dele também serão removidos.`, () => {
      Store.removeCliente(id);
      UI.toast('Cliente excluído');
    });
  }

  function detalhe(id) {
    const c = Store.get('clientes', id);
    if (!c) return;
    const info = [
      ['Empresa', c.empresa], ['E-mail', c.email], ['Telefone', c.telefone], ['CPF/CNPJ', c.documento],
      ['Cidade', c.cidade], ['Segmento', c.segmento], ['Cliente desde', UI.date(c.criadoEm)],
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${UI.esc(v || '—')}</dd></div>`).join('');

    let extra = '';
    if (typeof Oportunidades !== 'undefined') extra += Oportunidades.resumoCliente(id);
    if (typeof Atendimentos !== 'undefined') extra += Atendimentos.timelineCliente(id);

    const m = UI.modal(c.nome, `
      <div class="detail-head">${badge(c.status)}
        <div class="row-actions">
          ${typeof Atendimentos !== 'undefined' ? '<button class="btn sm" data-act="atd">+ Atendimento</button>' : ''}
          ${typeof Oportunidades !== 'undefined' ? '<button class="btn sm" data-act="opp">+ Oportunidade</button>' : ''}
          <button class="btn sm ghost" data-act="edit">Editar</button>
        </div>
      </div>
      <dl class="info-grid">${info}</dl>
      ${c.observacoes ? `<p class="obs">${UI.esc(c.observacoes)}</p>` : ''}
      ${extra}`, true);

    m.querySelector('[data-act="edit"]').onclick = () => editar(id);
    m.querySelector('[data-act="atd"]')?.addEventListener('click', () => Atendimentos.novo(id));
    m.querySelector('[data-act="opp"]')?.addEventListener('click', () => Oportunidades.novo(id));
  }

  function filtrados() {
    const q = state.busca.toLowerCase();
    return Store.all('clientes')
      .filter(c => !state.status || c.status === state.status)
      .filter(c => !state.segmento || c.segmento === state.segmento)
      .filter(c => !q || [c.nome, c.empresa, c.email, c.telefone, c.documento, c.cidade]
        .some(v => (v || '').toLowerCase().includes(q)))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  function render(el, actions) {
    actions.innerHTML = '<button class="btn primary" id="novo-cliente">+ Novo cliente</button>';
    actions.querySelector('#novo-cliente').onclick = novo;

    el.innerHTML = `
      <div class="toolbar">
        <input type="search" id="f-busca" placeholder="Buscar por nome, empresa, e-mail, telefone…" value="${UI.esc(state.busca)}">
        <select id="f-status"><option value="">Todos os status</option>
          ${STATUS.map(([v, l]) => `<option value="${v}" ${state.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select id="f-seg"><option value="">Todos os segmentos</option>
          ${SEGMENTOS.map(s => `<option ${state.segmento === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      </div>
      <div class="card"><div id="lista-clientes"></div></div>`;

    const lista = el.querySelector('#lista-clientes');
    const pintar = () => {
      const rows = filtrados();
      if (!rows.length) {
        lista.innerHTML = '<p class="empty">Nenhum cliente encontrado.</p>';
        return;
      }
      lista.innerHTML = `<div class="table-wrap"><table>
        <thead><tr><th>Nome</th><th>Empresa</th><th class="hide-sm">Contato</th><th class="hide-sm">Segmento</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows.map(c => `<tr data-id="${c.id}" class="clickable">
          <td><strong>${UI.esc(c.nome)}</strong><div class="muted sm">${UI.esc(c.cidade || '')}</div></td>
          <td>${UI.esc(c.empresa || '—')}</td>
          <td class="hide-sm">${UI.esc(c.email || '')}<div class="muted sm">${UI.esc(c.telefone || '')}</div></td>
          <td class="hide-sm">${UI.esc(c.segmento || '—')}</td>
          <td>${badge(c.status)}</td>
          <td class="row-actions">
            <button class="icon-btn" data-edit title="Editar">✎</button>
            <button class="icon-btn" data-del title="Excluir">🗑</button></td>
        </tr>`).join('')}</tbody></table></div>
        <p class="muted sm count">${rows.length} cliente(s)</p>`;
    };
    pintar();

    lista.addEventListener('click', e => {
      const id = e.target.closest('tr')?.dataset.id;
      if (!id) return;
      if (e.target.closest('[data-edit]')) editar(id);
      else if (e.target.closest('[data-del]')) excluir(id);
      else detalhe(id);
    });
    el.querySelector('#f-busca').oninput = e => { state.busca = e.target.value; pintar(); };
    el.querySelector('#f-status').onchange = e => { state.status = e.target.value; pintar(); };
    el.querySelector('#f-seg').onchange = e => { state.segmento = e.target.value; pintar(); };
  }

  App.register({ id: 'clientes', label: 'Clientes', icon: '👥', render });
  return { novo, editar, detalhe, statusLabel, badge };
})();

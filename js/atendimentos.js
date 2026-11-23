/* ClientCRM – Histórico de atendimento */
const Atendimentos = (() => {
  const TIPOS = ['Ligação', 'E-mail', 'Reunião', 'WhatsApp', 'Visita', 'Suporte'];
  const ICONES = { 'Ligação': '📞', 'E-mail': '✉️', 'Reunião': '🤝', 'WhatsApp': '💬', 'Visita': '🚗', 'Suporte': '🛠' };
  const RESULTADOS = ['Positivo', 'Neutro', 'Negativo', 'Pendente'];
  const state = { busca: '', tipo: '', cliente: '', periodo: '' };

  function fields() {
    return [
      { name: 'clienteId', label: 'Cliente', type: 'select', options: UI.clienteOptions(), required: true, full: true },
      { name: 'data', label: 'Data', type: 'date', value: UI.today(), required: true },
      { name: 'tipo', label: 'Canal', type: 'select', options: TIPOS },
      { name: 'assunto', label: 'Assunto', required: true, full: true },
      { name: 'descricao', label: 'Descrição', type: 'textarea', full: true },
      { name: 'resultado', label: 'Resultado', type: 'select', options: RESULTADOS },
      { name: 'responsavel', label: 'Responsável' },
      { name: 'proximoContato', label: 'Próximo contato', type: 'date' },
    ];
  }

  function novo(clienteId) {
    if (!Store.all('clientes').length) { UI.toast('Cadastre um cliente primeiro', 'err'); return; }
    UI.form({
      title: 'Registrar atendimento', fields: fields(), values: { clienteId },
      onSubmit: d => { Store.insert('atendimentos', d); UI.toast('Atendimento registrado'); },
    });
  }

  function editar(id) {
    UI.form({
      title: 'Editar atendimento', fields: fields(), values: Store.get('atendimentos', id),
      onSubmit: d => { Store.update('atendimentos', id, d); UI.toast('Atendimento atualizado'); },
    });
  }

  function excluir(id) {
    UI.confirm('Excluir este registro de atendimento?', () => { Store.remove('atendimentos', id); UI.toast('Registro excluído'); });
  }

  const ordenar = list => list.sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.criadoEm || '').localeCompare(a.criadoEm || ''));

  function itemHTML(a, mostrarCliente) {
    return `<li data-id="${a.id}">
      <div class="tl-head">
        <span>${ICONES[a.tipo] || '•'}</span>
        <strong>${UI.esc(a.assunto)}</strong>
        ${a.resultado ? `<span class="badge">${UI.esc(a.resultado)}</span>` : ''}
        <span class="row-actions"><button class="icon-btn" data-edit title="Editar">✎</button>
        <button class="icon-btn" data-del title="Excluir">🗑</button></span>
      </div>
      <div class="muted sm">${UI.date(a.data)} · ${UI.esc(a.tipo || '')}
        ${mostrarCliente ? ` · <a href="#" data-cli="${a.clienteId}">${UI.esc(UI.clienteNome(a.clienteId))}</a>` : ''}
        ${a.responsavel ? ` · por ${UI.esc(a.responsavel)}` : ''}
        ${a.proximoContato ? ` · próximo contato: <span class="${a.proximoContato < UI.today() ? 'late' : ''}">${UI.date(a.proximoContato)}</span>` : ''}
      </div>
      ${a.descricao ? `<p class="tl-body">${UI.esc(a.descricao)}</p>` : ''}
    </li>`;
  }

  /* Bloco usado no detalhe do cliente */
  function timelineCliente(clienteId) {
    const list = ordenar(Store.all('atendimentos').filter(a => a.clienteId === clienteId));
    return `<h4 class="section-title">Histórico de atendimento <span class="muted">${list.length}</span></h4>
      ${list.length ? `<ul class="timeline" data-timeline>${list.map(a => itemHTML(a, false)).join('')}</ul>`
        : '<p class="muted">Nenhum atendimento registrado.</p>'}`;
  }

  function bindTimeline(root) {
    root.addEventListener('click', e => {
      const cli = e.target.closest('[data-cli]');
      if (cli) { e.preventDefault(); Clientes.detalhe(cli.dataset.cli); return; }
      const id = e.target.closest('li[data-id]')?.dataset.id;
      if (!id) return;
      if (e.target.closest('[data-edit]')) editar(id);
      else if (e.target.closest('[data-del]')) excluir(id);
    });
  }

  function filtrados() {
    const q = state.busca.toLowerCase();
    const limite = state.periodo ? new Date(Date.now() - Number(state.periodo) * 864e5).toISOString().slice(0, 10) : '';
    return ordenar(Store.all('atendimentos')
      .filter(a => !state.tipo || a.tipo === state.tipo)
      .filter(a => !state.cliente || a.clienteId === state.cliente)
      .filter(a => !limite || (a.data || '') >= limite)
      .filter(a => !q || [a.assunto, a.descricao, a.responsavel, UI.clienteNome(a.clienteId)]
        .some(v => (v || '').toLowerCase().includes(q))));
  }

  function render(el, actions, params) {
    if (params.cliente) state.cliente = params.cliente;
    actions.innerHTML = '<button class="btn primary" id="novo-atd">+ Registrar atendimento</button>';
    actions.querySelector('#novo-atd').onclick = () => novo(state.cliente || undefined);

    const pendentes = Store.all('atendimentos').filter(a => a.proximoContato && a.proximoContato <= UI.today()).length;

    el.innerHTML = `
      ${pendentes ? `<div class="card" style="margin-bottom:14px">⏰ <strong>${pendentes}</strong> follow-up(s) com data de próximo contato vencida ou para hoje.</div>` : ''}
      <div class="toolbar">
        <input type="search" id="f-busca" placeholder="Buscar assunto, descrição, cliente…" value="${UI.esc(state.busca)}">
        <select id="f-cli"><option value="">Todos os clientes</option>
          ${UI.clienteOptions().map(([v, l]) => `<option value="${v}" ${state.cliente === v ? 'selected' : ''}>${UI.esc(l)}</option>`).join('')}</select>
        <select id="f-tipo"><option value="">Todos os canais</option>
          ${TIPOS.map(t => `<option ${state.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <select id="f-per">
          ${[['', 'Todo o período'], ['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['90', 'Últimos 90 dias']]
            .map(([v, l]) => `<option value="${v}" ${state.periodo === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div class="card" data-timeline><div id="lista"></div></div>`;

    const lista = el.querySelector('#lista');
    const pintar = () => {
      const rows = filtrados();
      lista.innerHTML = rows.length
        ? `<ul class="timeline">${rows.map(a => itemHTML(a, true)).join('')}</ul><p class="muted sm count">${rows.length} registro(s)</p>`
        : '<p class="empty">Nenhum atendimento encontrado.</p>';
    };
    pintar();
    bindTimeline(el.querySelector('[data-timeline]'));

    el.querySelector('#f-busca').oninput = e => { state.busca = e.target.value; pintar(); };
    el.querySelector('#f-cli').onchange = e => { state.cliente = e.target.value; pintar(); };
    el.querySelector('#f-tipo').onchange = e => { state.tipo = e.target.value; pintar(); };
    el.querySelector('#f-per').onchange = e => { state.periodo = e.target.value; pintar(); };
  }

  /* Liga os botões da timeline dentro do modal de detalhe do cliente */
  document.addEventListener('click', e => {
    const modal = e.target.closest('.modal');
    if (!modal) return;
    const li = e.target.closest('[data-timeline] li[data-id]');
    if (!li) return;
    if (e.target.closest('[data-edit]')) editar(li.dataset.id);
    else if (e.target.closest('[data-del]')) excluir(li.dataset.id);
  });

  App.register({ id: 'atendimentos', label: 'Atendimentos', icon: '🗂', render });
  return { novo, timelineCliente, TIPOS };
})();

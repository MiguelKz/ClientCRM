/* ClientCRM – Funil de vendas e controle de oportunidades */
const Oportunidades = (() => {
  const ETAPAS = [
    { id: 'prospeccao', nome: 'Prospecção', prob: 10 },
    { id: 'qualificacao', nome: 'Qualificação', prob: 25 },
    { id: 'proposta', nome: 'Proposta', prob: 50 },
    { id: 'negociacao', nome: 'Negociação', prob: 75 },
    { id: 'ganho', nome: 'Ganho', prob: 100 },
    { id: 'perdido', nome: 'Perdido', prob: 0 },
  ];
  const ABERTAS = ['prospeccao', 'qualificacao', 'proposta', 'negociacao'];
  const ORIGENS = ['Indicação', 'Site', 'Redes sociais', 'Prospecção ativa', 'Evento', 'Outro'];
  const etapa = id => ETAPAS.find(e => e.id === id) || ETAPAS[0];
  const badge = id => `<span class="badge et-${id}">${etapa(id).nome}</span>`;
  const aberta = o => ABERTAS.includes(o.etapa);
  const atrasada = o => aberta(o) && o.previsaoFechamento && o.previsaoFechamento < UI.today();
  const state = { busca: '', etapa: '', responsavel: '', ordem: 'previsao' };

  function fields() {
    return [
      { name: 'titulo', label: 'Título da oportunidade', required: true, full: true },
      { name: 'clienteId', label: 'Cliente', type: 'select', options: UI.clienteOptions(), required: true, full: true },
      { name: 'valor', label: 'Valor (R$)', type: 'number', required: true },
      { name: 'etapa', label: 'Etapa', type: 'select', options: ETAPAS.map(e => [e.id, e.nome]), value: 'prospeccao' },
      { name: 'probabilidade', label: 'Probabilidade (%)', type: 'number' },
      { name: 'previsaoFechamento', label: 'Previsão de fechamento', type: 'date' },
      { name: 'responsavel', label: 'Responsável' },
      { name: 'origem', label: 'Origem', type: 'select', options: ORIGENS },
      { name: 'motivoPerda', label: 'Motivo da perda (se perdida)', full: true },
      { name: 'descricao', label: 'Descrição / próximos passos', type: 'textarea', full: true },
    ];
  }

  /* Ajusta probabilidade e data de fechamento conforme a etapa */
  function normalizar(d, anterior = {}) {
    if (d.etapa !== anterior.etapa && (anterior.etapa || !d.probabilidade)) d.probabilidade = etapa(d.etapa).prob;
    d.probabilidade = Math.min(100, Math.max(0, Number(d.probabilidade) || 0));
    if (aberta(d)) d.fechadoEm = '';
    else if (!anterior.fechadoEm || d.etapa !== anterior.etapa) d.fechadoEm = UI.today();
    return d;
  }

  function novo(clienteId) {
    if (!Store.all('clientes').length) { UI.toast('Cadastre um cliente primeiro', 'err'); return; }
    UI.form({
      title: 'Nova oportunidade', fields: fields(), values: { clienteId },
      onSubmit: d => { Store.insert('oportunidades', normalizar(d)); UI.toast('Oportunidade criada'); },
    });
  }

  function editar(id) {
    const o = Store.get('oportunidades', id);
    UI.form({
      title: 'Editar oportunidade', fields: fields(), values: o,
      onSubmit: d => { Store.update('oportunidades', id, normalizar(d, o)); UI.toast('Oportunidade atualizada'); },
    });
  }

  function mover(id, novaEtapa) {
    const o = Store.get('oportunidades', id);
    if (!o || o.etapa === novaEtapa) return;
    Store.update('oportunidades', id, normalizar({ ...o, etapa: novaEtapa }, o));
    UI.toast(`"${o.titulo}" movida para ${etapa(novaEtapa).nome}`);
    if (novaEtapa === 'perdido' && !o.motivoPerda) {
      UI.form({
        title: 'Motivo da perda', submitLabel: 'Registrar',
        fields: [{ name: 'motivoPerda', label: 'Por que a oportunidade foi perdida?', full: true, required: true }],
        onSubmit: d => { Store.update('oportunidades', id, d); },
      });
    }
  }

  function excluir(id) {
    UI.confirm('Excluir esta oportunidade?', () => { Store.remove('oportunidades', id); UI.toast('Oportunidade excluída'); });
  }

  /* Bloco usado no detalhe do cliente */
  function resumoCliente(clienteId) {
    const list = Store.all('oportunidades').filter(o => o.clienteId === clienteId);
    const ganho = list.filter(o => o.etapa === 'ganho').reduce((s, o) => s + o.valor, 0);
    return `<h4 class="section-title">Oportunidades <span class="muted">${list.length} · ${UI.money(ganho)} ganhos</span></h4>
      ${list.length ? `<div class="table-wrap"><table><tbody>${list.map(o => `<tr>
        <td>${UI.esc(o.titulo)}</td><td>${badge(o.etapa)}</td><td class="num">${UI.money(o.valor)}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted">Nenhuma oportunidade.</p>'}`;
  }

  /* ---------- Funil (kanban) ---------- */
  function renderFunil(el, actions) {
    actions.innerHTML = '<button class="btn primary" id="nova-opp">+ Nova oportunidade</button>';
    actions.querySelector('#nova-opp').onclick = () => novo();
    const todas = Store.all('oportunidades');
    const abertas = todas.filter(aberta);
    const pipeline = abertas.reduce((s, o) => s + o.valor, 0);
    const ponderado = abertas.reduce((s, o) => s + o.valor * o.probabilidade / 100, 0);

    el.innerHTML = `
      <div class="kpis">
        <div class="card kpi"><div class="label">Em aberto</div><div class="value">${abertas.length}</div></div>
        <div class="card kpi"><div class="label">Valor do pipeline</div><div class="value">${UI.moneyShort(pipeline)}</div></div>
        <div class="card kpi"><div class="label">Previsão ponderada</div><div class="value">${UI.moneyShort(ponderado)}</div>
          <div class="hint">valor × probabilidade</div></div>
      </div>
      <p class="muted sm">Arraste os cartões entre as colunas para mudar a etapa.</p>
      <div class="kanban">${ETAPAS.map(et => {
        const cards = todas.filter(o => o.etapa === et.id)
          .sort((a, b) => (a.previsaoFechamento || '9').localeCompare(b.previsaoFechamento || '9'));
        const total = cards.reduce((s, o) => s + o.valor, 0);
        return `<section class="kcol" data-etapa="${et.id}">
          <div class="kcol-head"><h4>${et.nome}</h4><span class="badge et-${et.id}">${cards.length}</span></div>
          <div class="kcol-total">${UI.money(total)}</div>
          <div class="kcards">${cards.map(o => `
            <article class="kcard" draggable="true" data-id="${o.id}">
              <h5>${UI.esc(o.titulo)}</h5>
              <div class="muted sm">${UI.esc(UI.clienteNome(o.clienteId))}</div>
              <div class="kcard-foot"><span class="val">${UI.moneyShort(o.valor)}</span>
                <span class="${atrasada(o) ? 'late' : ''}">${o.previsaoFechamento ? UI.date(o.previsaoFechamento) : ''}</span></div>
              <select data-move aria-label="Mover para etapa">${ETAPAS.map(e =>
                `<option value="${e.id}" ${e.id === o.etapa ? 'selected' : ''}>${e.nome}</option>`).join('')}</select>
            </article>`).join('')}</div>
        </section>`;
      }).join('')}</div>`;

    const kanban = el.querySelector('.kanban');
    let arrastando = null;
    kanban.addEventListener('dragstart', e => {
      const card = e.target.closest('.kcard');
      if (!card) return;
      arrastando = card.dataset.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', arrastando);
    });
    kanban.addEventListener('dragend', e => e.target.closest('.kcard')?.classList.remove('dragging'));
    kanban.querySelectorAll('.kcol').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
      col.addEventListener('dragleave', e => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); });
      col.addEventListener('drop', e => {
        e.preventDefault();
        col.classList.remove('over');
        const id = e.dataTransfer.getData('text/plain') || arrastando;
        if (id) mover(id, col.dataset.etapa);
      });
    });
    kanban.addEventListener('change', e => {
      if (e.target.matches('[data-move]')) mover(e.target.closest('.kcard').dataset.id, e.target.value);
    });
    kanban.addEventListener('click', e => {
      if (e.target.closest('select')) return;
      const card = e.target.closest('.kcard');
      if (card) editar(card.dataset.id);
    });
  }

  /* ---------- Lista de oportunidades ---------- */
  function filtradas() {
    const q = state.busca.toLowerCase();
    const list = Store.all('oportunidades')
      .filter(o => !state.etapa || (state.etapa === 'abertas' ? aberta(o) : state.etapa === 'atrasadas' ? atrasada(o) : o.etapa === state.etapa))
      .filter(o => !state.responsavel || o.responsavel === state.responsavel)
      .filter(o => !q || [o.titulo, o.descricao, o.responsavel, UI.clienteNome(o.clienteId)]
        .some(v => (v || '').toLowerCase().includes(q)));
    const sorters = {
      previsao: (a, b) => (a.previsaoFechamento || '9').localeCompare(b.previsaoFechamento || '9'),
      valor: (a, b) => b.valor - a.valor,
      recentes: (a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''),
    };
    return list.sort(sorters[state.ordem]);
  }

  function renderLista(el, actions) {
    actions.innerHTML = '<button class="btn primary" id="nova-opp">+ Nova oportunidade</button>';
    actions.querySelector('#nova-opp').onclick = () => novo();
    const responsaveis = [...new Set(Store.all('oportunidades').map(o => o.responsavel).filter(Boolean))].sort();

    el.innerHTML = `
      <div class="toolbar">
        <input type="search" id="f-busca" placeholder="Buscar título, cliente, responsável…" value="${UI.esc(state.busca)}">
        <select id="f-etapa">
          ${[['', 'Todas as etapas'], ['abertas', 'Somente abertas'], ['atrasadas', 'Atrasadas'], ...ETAPAS.map(e => [e.id, e.nome])]
            .map(([v, l]) => `<option value="${v}" ${state.etapa === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select id="f-resp"><option value="">Todos os responsáveis</option>
          ${responsaveis.map(r => `<option ${state.responsavel === r ? 'selected' : ''}>${UI.esc(r)}</option>`).join('')}</select>
        <select id="f-ordem">
          ${[['previsao', 'Ordenar: previsão'], ['valor', 'Ordenar: maior valor'], ['recentes', 'Ordenar: mais recentes']]
            .map(([v, l]) => `<option value="${v}" ${state.ordem === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      </div>
      <div class="card"><div id="lista"></div></div>`;

    const lista = el.querySelector('#lista');
    const pintar = () => {
      const rows = filtradas();
      const total = rows.reduce((s, o) => s + o.valor, 0);
      lista.innerHTML = rows.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Oportunidade</th><th class="hide-sm">Cliente</th><th>Etapa</th><th class="num">Valor</th>
          <th class="num hide-sm">Prob.</th><th class="hide-sm">Previsão</th><th class="hide-sm">Responsável</th><th></th></tr></thead>
        <tbody>${rows.map(o => `<tr data-id="${o.id}" class="clickable">
          <td><strong>${UI.esc(o.titulo)}</strong>${o.motivoPerda && o.etapa === 'perdido' ? `<div class="muted sm">Motivo: ${UI.esc(o.motivoPerda)}</div>` : ''}</td>
          <td class="hide-sm">${UI.esc(UI.clienteNome(o.clienteId))}</td>
          <td>${badge(o.etapa)}</td>
          <td class="num">${UI.money(o.valor)}</td>
          <td class="num hide-sm">${o.probabilidade}%</td>
          <td class="hide-sm ${atrasada(o) ? 'late' : ''}">${UI.date(o.previsaoFechamento)}</td>
          <td class="hide-sm">${UI.esc(o.responsavel || '—')}</td>
          <td class="row-actions"><button class="icon-btn" data-del title="Excluir">🗑</button></td>
        </tr>`).join('')}</tbody></table></div>
        <p class="muted sm count">${rows.length} oportunidade(s) · total ${UI.money(total)}</p>`
        : '<p class="empty">Nenhuma oportunidade encontrada.</p>';
    };
    pintar();

    lista.addEventListener('click', e => {
      const id = e.target.closest('tr')?.dataset.id;
      if (!id) return;
      if (e.target.closest('[data-del]')) excluir(id); else editar(id);
    });
    el.querySelector('#f-busca').oninput = e => { state.busca = e.target.value; pintar(); };
    el.querySelector('#f-etapa').onchange = e => { state.etapa = e.target.value; pintar(); };
    el.querySelector('#f-resp').onchange = e => { state.responsavel = e.target.value; pintar(); };
    el.querySelector('#f-ordem').onchange = e => { state.ordem = e.target.value; pintar(); };
  }

  App.register({ id: 'funil', label: 'Funil de vendas', icon: '📊', render: renderFunil });
  App.register({ id: 'oportunidades', label: 'Oportunidades', icon: '💼', render: renderLista });
  return { novo, editar, resumoCliente, ETAPAS, ABERTAS, aberta, atrasada, etapa };
})();

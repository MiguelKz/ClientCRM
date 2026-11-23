/* ClientCRM – Dashboard de desempenho */
const Dashboard = (() => {
  const state = { periodo: '180' };
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

  const dataCorte = dias => dias ? new Date(Date.now() - Number(dias) * 864e5).toISOString().slice(0, 10) : '';
  const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;

  function kpi(label, value, hint = '') {
    return `<div class="card kpi"><div class="label">${label}</div><div class="value">${value}</div>${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
  }

  /* Gráfico de barras em SVG (receita ganha por mês) */
  function barChart(series) {
    const W = 560, H = 220, pad = { l: 56, r: 10, t: 12, b: 28 };
    const max = Math.max(1, ...series.map(s => s.valor));
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const bw = iw / series.length;
    const ticks = [0, .25, .5, .75, 1];
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Receita ganha por mês">
      <g class="grid">${ticks.map(t => {
        const y = pad.t + ih - ih * t;
        return `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}"></line>
          <text x="${pad.l - 6}" y="${y + 4}" text-anchor="end">${UI.moneyShort(max * t).replace('R$ ', '')}</text>`;
      }).join('')}</g>
      ${series.map((s, i) => {
        const h = ih * (s.valor / max);
        const x = pad.l + i * bw + bw * .2;
        return `<rect class="bar" x="${x}" y="${pad.t + ih - h}" width="${bw * .6}" height="${Math.max(h, 0)}" rx="4">
            <title>${s.label}: ${UI.money(s.valor)} (${s.qtd} negócio(s))</title></rect>
          <text x="${x + bw * .3}" y="${H - 8}" text-anchor="middle">${s.label}</text>`;
      }).join('')}
    </svg>`;
  }

  function hbars(items, fmt = v => v) {
    const max = Math.max(1, ...items.map(i => i.valor));
    return items.length ? items.map(i => `<div class="hbar"><span title="${UI.esc(i.label)}" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${UI.esc(i.label)}</span>
      <div class="hbar-track"><div class="hbar-fill" style="width:${(i.valor / max) * 100}%"></div></div>
      <span class="muted" style="text-align:right">${fmt(i.valor)}</span></div>`).join('')
      : '<p class="empty">Sem dados no período.</p>';
  }

  function render(el, actions) {
    actions.innerHTML = `<select id="f-per" aria-label="Período">
      ${[['30', 'Últimos 30 dias'], ['90', 'Últimos 90 dias'], ['180', 'Últimos 6 meses'], ['365', 'Últimos 12 meses'], ['', 'Todo o período']]
        .map(([v, l]) => `<option value="${v}" ${state.periodo === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    actions.querySelector('#f-per').onchange = e => { state.periodo = e.target.value; App.render(); };

    const corte = dataCorte(state.periodo);
    const noPeriodo = d => !corte || (d || '') >= corte;

    const clientes = Store.all('clientes');
    const opps = Store.all('oportunidades');
    const atds = Store.all('atendimentos');

    const abertas = opps.filter(Oportunidades.aberta);
    const fechadas = opps.filter(o => !Oportunidades.aberta(o) && noPeriodo(o.fechadoEm));
    const ganhas = fechadas.filter(o => o.etapa === 'ganho');
    const receita = ganhas.reduce((s, o) => s + o.valor, 0);
    const pipeline = abertas.reduce((s, o) => s + o.valor, 0);
    const ponderado = abertas.reduce((s, o) => s + o.valor * o.probabilidade / 100, 0);
    const novosClientes = clientes.filter(c => noPeriodo((c.criadoEm || '').slice(0, 10))).length;
    const atdsPeriodo = atds.filter(a => noPeriodo(a.data));
    const atrasadas = abertas.filter(Oportunidades.atrasada).length;
    const ciclo = ganhas.length
      ? Math.round(ganhas.reduce((s, o) => s + (new Date(o.fechadoEm) - new Date(o.criadoEm)) / 864e5, 0) / ganhas.length)
      : 0;

    /* Receita por mês – últimos 6 meses */
    const hoje = new Date();
    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const doMes = opps.filter(o => o.etapa === 'ganho' && (o.fechadoEm || '').startsWith(chave));
      return { label: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, valor: doMes.reduce((s, o) => s + o.valor, 0), qtd: doMes.length };
    });

    /* Funil: quantidade e valor por etapa aberta */
    const etapasAbertas = Oportunidades.ETAPAS.filter(e => Oportunidades.ABERTAS.includes(e.id));
    const porEtapa = etapasAbertas.map(e => {
      const l = abertas.filter(o => o.etapa === e.id);
      return { ...e, qtd: l.length, valor: l.reduce((s, o) => s + o.valor, 0) };
    });
    const maxEtapa = Math.max(1, ...porEtapa.map(e => e.valor));

    /* Atendimentos por canal */
    const porCanal = Atendimentos.TIPOS.map(t => ({ label: t, valor: atdsPeriodo.filter(a => a.tipo === t).length }))
      .filter(i => i.valor).sort((a, b) => b.valor - a.valor);

    /* Ranking de responsáveis por receita */
    const resp = {};
    ganhas.forEach(o => { const r = o.responsavel || 'Sem responsável'; resp[r] = (resp[r] || 0) + o.valor; });
    const porResp = Object.entries(resp).map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor).slice(0, 6);

    /* Top clientes */
    const cli = {};
    ganhas.forEach(o => { cli[o.clienteId] = (cli[o.clienteId] || 0) + o.valor; });
    const topClientes = Object.entries(cli).map(([id, valor]) => ({ label: UI.clienteNome(id), valor })).sort((a, b) => b.valor - a.valor).slice(0, 6);

    /* Motivos de perda */
    const motivos = {};
    fechadas.filter(o => o.etapa === 'perdido').forEach(o => { const m = o.motivoPerda || 'Não informado'; motivos[m] = (motivos[m] || 0) + 1; });
    const porMotivo = Object.entries(motivos).map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor).slice(0, 5);

    /* Próximos fechamentos */
    const proximas = abertas.filter(o => o.previsaoFechamento)
      .sort((a, b) => a.previsaoFechamento.localeCompare(b.previsaoFechamento)).slice(0, 6);

    el.innerHTML = `
      <div class="kpis">
        ${kpi('Receita ganha', UI.moneyShort(receita), `${ganhas.length} negócio(s) fechado(s)`)}
        ${kpi('Taxa de conversão', pct(ganhas.length, fechadas.length) + '%', `${ganhas.length} ganhas de ${fechadas.length} fechadas`)}
        ${kpi('Ticket médio', UI.moneyShort(ganhas.length ? receita / ganhas.length : 0), ciclo ? `ciclo médio de ${ciclo} dias` : '')}
        ${kpi('Pipeline aberto', UI.moneyShort(pipeline), `${abertas.length} oportunidade(s) · ${atrasadas} atrasada(s)`)}
        ${kpi('Previsão ponderada', UI.moneyShort(ponderado), 'valor × probabilidade')}
        ${kpi('Clientes', clientes.length, `${novosClientes} novo(s) no período`)}
        ${kpi('Atendimentos', atdsPeriodo.length, 'no período')}
      </div>

      <div class="grid-2">
        <div class="card chart"><h3>Receita ganha por mês</h3>${barChart(meses)}</div>
        <div class="card"><h3>Funil de vendas (em aberto)</h3>
          ${porEtapa.map(e => `<div class="funnel-row"><span>${e.nome}</span>
            <div class="funnel-track"><div class="funnel-bar" style="width:${(e.valor / maxEtapa) * 100}%">${e.qtd}</div></div>
            <span class="muted" style="text-align:right">${UI.moneyShort(e.valor)}</span></div>`).join('')}
          <p class="muted sm">Conversão entre etapas: ${porEtapa.slice(1).map((e, i) =>
            `${porEtapa[i].nome.slice(0, 4)}.→${e.nome.slice(0, 4)}. ${pct(e.qtd, porEtapa[i].qtd)}%`).join(' · ')}</p>
        </div>
      </div>

      <div class="grid-2">
        <div class="card"><h3>Receita por responsável</h3>${hbars(porResp, UI.moneyShort)}</div>
        <div class="card"><h3>Top clientes por receita</h3>${hbars(topClientes, UI.moneyShort)}</div>
      </div>

      <div class="grid-2">
        <div class="card"><h3>Atendimentos por canal</h3>${hbars(porCanal)}</div>
        <div class="card"><h3>Motivos de perda</h3>${hbars(porMotivo)}</div>
      </div>

      <div class="card"><h3>Próximos fechamentos previstos</h3>
        ${proximas.length ? `<div class="table-wrap"><table><tbody>${proximas.map(o => `
          <tr class="clickable" data-id="${o.id}"><td><strong>${UI.esc(o.titulo)}</strong><div class="muted sm">${UI.esc(UI.clienteNome(o.clienteId))}</div></td>
          <td><span class="badge et-${o.etapa}">${Oportunidades.etapa(o.etapa).nome}</span></td>
          <td class="num">${UI.money(o.valor)}</td>
          <td class="num ${Oportunidades.atrasada(o) ? 'late' : ''}">${UI.date(o.previsaoFechamento)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="empty">Nenhuma oportunidade com previsão.</p>'}
      </div>`;

    el.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => Oportunidades.editar(tr.dataset.id));
  }

  App.register({ id: 'dashboard', label: 'Dashboard', icon: '📈', render });
})();

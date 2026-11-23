/* ClientCRM – dados de exemplo (carregados no primeiro acesso) */
const Seed = (() => {
  let n = 0;
  const id = () => 'ex' + (++n).toString(36);
  const dia = offset => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  /* gerador pseudo-aleatório determinístico */
  let s = 42;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const pick = arr => arr[Math.floor(rnd() * arr.length)];

  function gerar() {
    n = 0; s = 42;
    const base = [
      ['Ana Souza', 'Padaria Pão Dourado', 'Varejo', 'São Paulo/SP'],
      ['Carlos Lima', 'Metalúrgica Lima', 'Indústria', 'Joinville/SC'],
      ['Fernanda Rocha', 'Clínica Bem Viver', 'Saúde', 'Belo Horizonte/MG'],
      ['João Pereira', 'TechNova Sistemas', 'Tecnologia', 'Recife/PE'],
      ['Mariana Alves', 'Escola Saber Mais', 'Educação', 'Curitiba/PR'],
      ['Rafael Costa', 'Costa Contabilidade', 'Serviços', 'Porto Alegre/RS'],
      ['Patrícia Gomes', 'Moda Bella', 'Varejo', 'Fortaleza/CE'],
      ['Ricardo Nunes', 'Nunes Logística', 'Serviços', 'Campinas/SP'],
      ['Juliana Martins', 'Laboratório Vida', 'Saúde', 'Salvador/BA'],
      ['Eduardo Ribeiro', 'Agro Ribeiro', 'Indústria', 'Goiânia/GO'],
      ['Beatriz Carvalho', 'Studio Design B', 'Serviços', 'Rio de Janeiro/RJ'],
      ['Lucas Fernandes', 'Mercado Bom Preço', 'Varejo', 'Manaus/AM'],
    ];
    const clientes = base.map(([nome, empresa, segmento, cidade], i) => {
      const slug = nome.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').split(' ')[0];
      return {
        id: id(), nome, empresa, segmento, cidade,
        email: `${slug}@${empresa.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}.com.br`,
        telefone: `(${11 + i}) 9${String(80000000 + i * 1234567).slice(0, 4)}-${String(1000 + i * 731).slice(0, 4)}`,
        status: i < 8 ? 'ativo' : i < 11 ? 'lead' : 'inativo',
        documento: '', observacoes: '',
        criadoEm: new Date(dia(-200 + i * 14) + 'T10:00:00').toISOString(),
      };
    });

    const vendedores = ['Bruno', 'Camila', 'Diego'];
    const produtos = ['Plano Anual', 'Implantação', 'Consultoria', 'Licenças adicionais', 'Suporte Premium', 'Treinamento'];
    const motivos = ['Preço', 'Escolheu concorrente', 'Sem orçamento', 'Projeto adiado'];
    const oportunidades = [];
    for (let i = 0; i < 34; i++) {
      const c = pick(clientes);
      const criado = -175 + Math.floor(rnd() * 170);
      const r = rnd();
      const etapa = criado > -45
        ? pick(['prospeccao', 'qualificacao', 'proposta', 'negociacao', 'prospeccao', 'proposta'])
        : r < 0.55 ? 'ganho' : r < 0.8 ? 'perdido' : pick(['negociacao', 'proposta']);
      const fechado = ['ganho', 'perdido'].includes(etapa) ? Math.min(-1, criado + 10 + Math.floor(rnd() * 40)) : null;
      const prob = { prospeccao: 10, qualificacao: 25, proposta: 50, negociacao: 75, ganho: 100, perdido: 0 }[etapa];
      oportunidades.push({
        id: id(), clienteId: c.id, titulo: `${pick(produtos)} – ${c.empresa}`,
        valor: Math.round((2 + rnd() * 48)) * 500, etapa, probabilidade: prob,
        previsaoFechamento: fechado != null ? dia(fechado) : dia(criado + 30 + Math.floor(rnd() * 40)),
        responsavel: pick(vendedores), origem: pick(['Indicação', 'Site', 'Redes sociais', 'Prospecção ativa', 'Evento']),
        motivoPerda: etapa === 'perdido' ? pick(motivos) : '', descricao: '',
        criadoEm: new Date(dia(criado) + 'T09:00:00').toISOString(), fechadoEm: fechado != null ? dia(fechado) : '',
      });
    }

    const assuntos = {
      'Ligação': ['Apresentação inicial', 'Retorno sobre proposta', 'Confirmação de pedido'],
      'E-mail': ['Envio de proposta comercial', 'Envio de contrato', 'Material de apresentação'],
      'Reunião': ['Reunião de diagnóstico', 'Demonstração do produto', 'Alinhamento de escopo'],
      'WhatsApp': ['Dúvida sobre prazos', 'Agendamento de visita', 'Follow-up'],
      'Visita': ['Visita técnica', 'Visita comercial'],
      'Suporte': ['Chamado de suporte', 'Treinamento de usuários'],
    };
    const atendimentos = [];
    for (let i = 0; i < 48; i++) {
      const c = pick(clientes);
      const tipo = pick(Object.keys(assuntos));
      const d = -170 + Math.floor(rnd() * 170);
      atendimentos.push({
        id: id(), clienteId: c.id, data: dia(d), tipo, assunto: pick(assuntos[tipo]),
        descricao: pick(['Cliente demonstrou interesse.', 'Solicitou ajustes na proposta.', 'Aguardando aprovação interna.', 'Tudo certo, sem pendências.']),
        resultado: pick(['Positivo', 'Positivo', 'Neutro', 'Pendente', 'Negativo']),
        responsavel: pick(vendedores), proximoContato: d > -20 ? dia(d + 7) : '',
        criadoEm: new Date(dia(d) + 'T12:00:00').toISOString(),
      });
    }
    return { clientes, atendimentos, oportunidades };
  }

  return { load: () => Store.reset(gerar()) };
})();

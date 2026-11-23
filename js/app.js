/* ClientCRM – roteamento e inicialização */
const App = (() => {
  const views = [];

  function register(view) { views.push(view); }

  function current() {
    const id = location.hash.replace('#/', '').split('?')[0];
    return views.find(v => v.id === id) || views[0];
  }

  function params() {
    const q = location.hash.split('?')[1];
    return Object.fromEntries(new URLSearchParams(q || ''));
  }

  function buildNav() {
    const nav = document.getElementById('nav');
    nav.innerHTML = views.map(v =>
      `<a href="#/${v.id}" data-view="${v.id}"><span class="nav-ico">${v.icon}</span><span>${v.label}</span></a>`
    ).join('');
  }

  function render() {
    const view = current();
    if (!view) return;
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.view === view.id));
    document.getElementById('page-title').textContent = view.label;
    const actions = document.getElementById('page-actions');
    actions.innerHTML = '';
    const main = document.getElementById('view');
    main.innerHTML = '';
    view.render(main, actions, params());
    document.body.classList.remove('nav-open');
  }

  function go(id, query) {
    location.hash = `#/${id}${query ? '?' + new URLSearchParams(query) : ''}`;
  }

  function init() {
    if (Store.isEmpty() && typeof Seed !== 'undefined') Seed.load();
    buildNav();
    window.addEventListener('hashchange', render);
    Store.onChange(() => { if (!document.querySelector('.modal-backdrop')) render(); else App.dirty = true; });
    const obs = new MutationObserver(() => {
      if (App.dirty && !document.querySelector('.modal-backdrop')) { App.dirty = false; render(); }
    });
    obs.observe(document.body, { childList: true });

    document.getElementById('menu-toggle').onclick = () => document.body.classList.toggle('nav-open');
    document.getElementById('btn-export').onclick = exportData;
    document.getElementById('btn-import').onclick = () => document.getElementById('file-import').click();
    document.getElementById('file-import').onchange = importData;
    render();
  }

  function exportData() {
    const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `clientcrm-backup-${UI.today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    UI.toast('Backup exportado');
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then(t => {
      try { Store.importJSON(t); UI.toast('Dados importados'); }
      catch (err) { UI.toast('Falha ao importar: ' + err.message, 'err'); }
    });
    e.target.value = '';
  }

  return { register, init, go, render, dirty: false };
})();

document.addEventListener('DOMContentLoaded', App.init);

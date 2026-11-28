import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/views.css';
import './styles/responsive.css';

import { watchLeads, watchMasters } from './data/firebase';
import { seedMasters } from './data/masterSync';
import { state } from './state';
import { on, startActions } from './ui/actions';
import { startSheets } from './ui/sheets';
import { startShortcuts } from './ui/shortcuts';
import { handleLaunchParams, startPwa } from './pwa';
import { toast } from './ui/toast';
import { el } from './utils/dom';
import { renderAgenda } from './views/agenda';
import { renderClients } from './views/clients';
import { renderLeads } from './views/leads';
import { renderMasters } from './views/masters';
import { onTabChange } from './views/nav';
import { renderReports } from './views/reports';
import { renderToday } from './views/today';
import { refreshDetail } from './sheets/leadDetail';
import { startCallSheet } from './sheets/callSheet';
// Side-effect imports: these modules register their own actions.
import './sheets/leadForm';
import './sheets/statusSheet';
import './sheets/masterSheet';

const renderAll = (): void => {
  renderToday();
  renderLeads();
  renderAgenda();
  renderReports();
  renderClients();
  renderMasters();
  refreshDetail();
};

const setStatus = (kind: 'live' | 'error', label: string): void => {
  el('fb-dot').className = `fb-dot ${kind}`;
  el('fb-label').textContent = label;
};

on({
  refresh: (b) => {
    b.classList.add('spinning');
    window.setTimeout(() => b.classList.remove('spinning'), 700);
    renderAll();
    toast('Up to date');
  },
});

startActions();
startSheets();
startCallSheet();
startShortcuts();
startPwa();
onTabChange((tab) => { if (tab === 'masters') renderMasters(); });

el('greeting').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

let launched = false;
watchLeads((leads) => {
  state.leads = leads;
  state.leadsLoaded = true;
  setStatus('live', `Live · ${leads.length}`);
  renderAll();
  void seedMasters();
  if (!launched) { launched = true; handleLaunchParams(); }
}, (err) => {
  setStatus('error', 'Offline');
  console.error(err);
  toast(`Could not load leads: ${err.code}`);
});

watchMasters((masters) => {
  state.masters = masters;
  state.mastersLoaded = true;
  renderMasters();
  void seedMasters();
}, (err) => {
  console.error(err);
  toast(`Could not load masters: ${err.code}`);
});

// Dates like "Today" and "Overdue" change at midnight; refresh when the app comes back to the foreground.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.leadsLoaded) renderAll();
});

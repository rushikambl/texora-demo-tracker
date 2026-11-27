import { openLeadForm } from './sheets/leadForm';
import { go, type Tab } from './views/nav';

const TABS: Tab[] = ['today', 'leads', 'agenda', 'reports', 'clients', 'masters'];

/** Register the service worker (production only) so the site can be installed as an app. */
export const startPwa = (): void => {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((e) => console.error('Service worker failed', e));
    });
  }
};

/** Home-screen shortcuts open with ?action=new or ?tab=agenda. */
export const handleLaunchParams = (): void => {
  const p = new URLSearchParams(location.search);
  const tab = p.get('tab') as Tab | null;
  if (tab && TABS.includes(tab)) go(tab);
  if (p.get('action') === 'new') openLeadForm();
  if (tab || p.get('action')) history.replaceState(null, '', location.pathname);
};

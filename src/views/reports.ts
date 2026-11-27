import { leadsToCsv } from '../domain/csv';
import { buildReport, type Period } from '../domain/reports';
import { state } from '../state';
import { on } from '../ui/actions';
import { empty } from '../ui/components';
import { toast } from '../ui/toast';
import { today } from '../utils/dates';
import { esc, html } from '../utils/dom';
import { money } from '../utils/format';

const FUNNEL_COLORS = ['#4C8DF0', '#F2A93B', '#5CB860', '#2E9E4F'];

const bar = (label: string, value: number, max: number, color: string, extra = ''): string =>
  `<div class="bar-row"><span class="lbl">${esc(label)}</span><span class="bar-track"><span class="bar-fill" style="width:${(value * 100) / Math.max(1, max)}%;background:${color}"></span></span><span class="val">${value}${extra}</span></div>`;

export const renderReports = (): void => {
  const r = buildReport(state.leads, state.period);
  const kpis: [string, string][] = [
    [String(r.added.length), 'Leads added'], [String(r.givenCount), 'Demos given'], [String(r.won.length), 'Deals won'],
    [money(r.revenue), 'Revenue won'], [`${r.winRate}%`, 'Win rate (won vs lost)'], [money(r.pipeline), 'Open pipeline'],
    [r.won.length ? money(r.revenue / r.won.length) : '—', 'Average deal'], [String(r.lost.length), 'Leads lost'],
  ];
  html('kpis', kpis.map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join(''));

  const top = r.funnel[0][1];
  html('funnel', r.funnel.map(([l, v], i) =>
    bar(l, v, top, FUNNEL_COLORS[i], i && top ? ` <small>${Math.round((v * 100) / top)}%</small>` : '')).join(''));

  html('sources', r.sources.length
    ? `<table class="tbl"><thead><tr><th>Source</th><th class="n">Leads</th><th class="n">Won</th><th class="n">Revenue</th></tr></thead><tbody>${
      r.sources.map((s) => `<tr><td>${esc(s.name)}</td><td class="n">${s.leads}</td><td class="n">${s.won}</td><td class="n">${money(s.revenue)}</td></tr>`).join('')}</tbody></table>`
    : `<div class="lead-list">${empty('No leads in this period', '')}</div>`);

  const maxReason = Math.max(1, ...r.reasons.map((x) => x.count));
  html('reasons', r.reasons.length
    ? r.reasons.map((x) => bar(x.name, x.count, maxReason, '#F06862')).join('')
    : empty('No lost leads', 'Nobody said no in this period.'));
};

on({
  setPeriod: (b) => {
    state.period = (b.dataset.arg || 'month') as Period;
    document.querySelectorAll<HTMLElement>('#period-chips .chip').forEach((c) => {
      const active = c.dataset.arg === state.period;
      c.classList.toggle('active', active);
      c.setAttribute('aria-pressed', String(active));
    });
    renderReports();
  },
  exportCSV: () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([`﻿${leadsToCsv(state.leads)}`], { type: 'text/csv' }));
    a.download = `texora-leads-${today()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast(`Exported ${state.leads.length} leads`);
  },
});

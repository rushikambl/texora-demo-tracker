"""Browser smoke test against the e2e build (fake Firebase).
Run:  npx vite build --mode e2e && python3 tests/e2e/smoke.py
Needs: pip install playwright (and a Chrome/Chromium binary; set CHROME=/path if not /usr/bin/google-chrome)."""
import functools, http.server, os, sys, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '.e2e')
OUT = os.environ.get('SHOTS', '/tmp')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 4173), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()

errors, checks = [], []
def check(name, cond):
    checks.append((name, bool(cond)))

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROME', '/usr/bin/google-chrome'))
    m = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    m.on('pageerror', lambda e: errors.append(str(e)))
    m.on('console', lambda c: c.type == 'error' and errors.append(c.text))
    m.goto('http://127.0.0.1:4173/'); m.wait_for_timeout(600)
    check('today demos', m.locator('#l-demos .lead-row').count() == 1)
    check('overdue count', m.inner_text('#s-over') == '1')
    m.screenshot(path=f'{OUT}/e2e-today.png')

    # detail + note + follow-up + log call
    m.click('#l-demos .lead-row'); m.wait_for_timeout(400)
    check('detail accountant', 'Pintu' in m.inner_text('#d-body'))
    m.fill('#d-note', 'Wants GST invoice'); m.press('#d-note', 'Enter'); m.wait_for_timeout(200)
    check('note added', 'Wants GST invoice' in m.inner_text('#d-body'))
    m.click('[data-action=setFu][data-days="3"]'); m.wait_for_timeout(200)
    m.click('.qa [data-action=openCall]'); m.wait_for_timeout(400)
    m.click('#c-out [data-v="Call back later"]'); m.fill('#c-note', 'Busy'); m.click('[data-action=saveCall]'); m.wait_for_timeout(500)
    check('call logged', 'Call back later: Busy' in m.inner_text('#d-body'))
    m.screenshot(path=f'{OUT}/e2e-detail.png')

    # status update to won
    m.click('#d-body [data-action=openStatus]'); m.wait_for_timeout(400)
    m.select_option('#u-st', 'closed'); m.fill('#u-amt', '55000'); m.click('[data-action=saveStatus]'); m.wait_for_timeout(500)
    check('won', 'Won' in m.inner_text('#d-body'))
    m.keyboard.press('Escape'); m.wait_for_timeout(300)

    # new lead with master pickers + duplicate warning
    m.click('#fab'); m.wait_for_timeout(400)
    m.fill('#f-name', 'Test Lead'); m.fill('#f-ph', '9825572748'); m.wait_for_timeout(100)
    check('duplicate warning', 'Vibhorbhai' in m.inner_text('#f-dup'))
    m.fill('#f-ph', '9000000001')
    m.select_option('#f-acc', '__new'); m.fill('#f-acc-new', 'Rakesh')
    m.click('#f-cursw [data-v="Equal"]'); m.fill('#f-cursw-new', 'Tally'); m.press('#f-cursw-new', 'Enter')
    m.select_option('#f-ref', 'Alpeshbhai'); m.select_option('#f-biz', 'Rapier')
    m.click('#f-save'); m.wait_for_timeout(600)

    # leads filters and sorting
    m.click('.tab[data-arg=leads]'); m.wait_for_timeout(300)
    m.click('#filter-toggle'); m.wait_for_timeout(100)
    m.select_option('#f-acc-f', 'Rakesh'); m.wait_for_timeout(200)
    check('filter by accountant', m.eval_on_selector_all('#l-leads .lead-name', 'e=>e.map(x=>x.textContent)') == ['Test Lead'])
    m.select_option('#f-acc-f', ''); m.select_option('#f-sw-f', 'Equal'); m.wait_for_timeout(200)
    check('filter by software', len(m.eval_on_selector_all('#l-leads .lead-name', 'e=>e')) == 2)
    m.select_option('#f-sw-f', ''); m.fill('#q', 'aarvi'); m.wait_for_timeout(200)
    check('search', m.eval_on_selector_all('#l-leads .lead-name', 'e=>e.map(x=>x.textContent)') == ['Vibhorbhai'])
    m.click('#q-clear'); m.select_option('#f-sort', 'acc'); m.wait_for_timeout(200)
    m.screenshot(path=f'{OUT}/e2e-leads.png')

    # masters: auto-seeded, rename cascades
    m.click('#mastersBtn'); m.wait_for_timeout(300)
    names = m.eval_on_selector_all('#m-list .lead-name', 'e=>e.map(x=>x.textContent)')
    check('masters seeded', {'Pintu', 'Hardik', 'Rakesh'} <= set(names))
    m.click('#m-list .m-row:has-text("Pintu")'); m.wait_for_timeout(400)
    m.fill('#me-name', 'Pintu Shah'); m.click('[data-action=mSave]'); m.wait_for_timeout(600)
    m.click('[data-action=mType][data-arg=ref]'); m.click('#m-list .m-row:has-text("Alpeshbhai")'); m.wait_for_timeout(300)
    m.click('[data-action=mLeads]'); m.wait_for_timeout(300)
    check('show leads for reference giver', len(m.eval_on_selector_all('#l-leads .lead-name', 'e=>e')) == 4)
    check('rename cascaded', 'Acct: Pintu Shah' in m.inner_text('#l-leads'))

    # agenda, reports, clients, export
    m.click('.tab[data-arg=agenda]'); m.wait_for_timeout(200)
    check('agenda overdue', 'Overdue' in m.inner_text('#agenda'))
    m.click('.tab[data-arg=reports]'); m.click('[data-action=setPeriod][data-arg=all]'); m.wait_for_timeout(200)
    check('reports revenue', '₹80,000' in m.inner_text('#kpis'))
    with m.expect_download() as dl:
        m.click('[data-action=exportCSV]')
    check('csv export', dl.value.suggested_filename.endswith('.csv'))
    m.screenshot(path=f'{OUT}/e2e-reports.png', full_page=True)
    m.click('.tab[data-arg=clients]'); m.wait_for_timeout(200)
    check('clients', m.locator('#l-won .lead-row').count() == 2)
    check('no horizontal scroll', not m.evaluate('document.documentElement.scrollWidth > innerWidth'))

    d = b.new_page(viewport={'width': 1440, 'height': 900})
    d.on('pageerror', lambda e: errors.append(str(e)))
    d.goto('http://127.0.0.1:4173/'); d.wait_for_timeout(500)
    check('desktop sidebar', d.is_visible('.sidebar') and not d.is_visible('.tabs'))
    d.keyboard.press('l'); d.wait_for_timeout(200)
    check('shortcut L opens leads', d.inner_text('#pg-title') == 'Leads')
    check('desktop table header', d.is_visible('.lead-thead'))
    d.keyboard.press('j'); d.keyboard.press('Enter'); d.wait_for_timeout(400)
    check('J + Enter opens a lead', d.evaluate("document.getElementById('detOv').classList.contains('open')"))
    d.keyboard.press('u'); d.wait_for_timeout(400)
    check('U opens update status', d.evaluate("document.getElementById('stOv').classList.contains('open')"))
    d.keyboard.press('Escape'); d.wait_for_timeout(200)
    d.keyboard.press('Shift+?'); d.wait_for_timeout(300)
    check('? shows shortcuts', d.evaluate("document.getElementById('kbOv').classList.contains('open')"))
    d.keyboard.press('Escape'); d.keyboard.press('n'); d.wait_for_timeout(300)
    check('N opens new lead', d.evaluate("document.getElementById('formOv').classList.contains('open')"))
    d.screenshot(path=f'{OUT}/e2e-desktop.png')
    b.close()
srv.shutdown()

failed = [n for n, ok in checks if not ok]
print(f"{len(checks) - len(failed)}/{len(checks)} checks passed")
for n in failed: print('FAILED:', n)
for e in errors: print('PAGE ERROR:', e)
sys.exit(1 if failed or errors else 0)

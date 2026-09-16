// Two-user end-to-end test against the real API. Usage: node e2e2.mjs <baseUrl> <shotsDir>
import { chromium } from 'playwright';
const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = process.argv[3] ?? '.';
const stamp = Date.now().toString(36);
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const consent = JSON.stringify({ state: { consent: { necessary: true, analytics: false, personalisation: false, marketing: false, version: '2026-09-01', decidedAt: 'x' } }, version: 0 });
const results = []; const errors = [];
const mk = async () => { const ctx = await browser.newContext({ viewport: { width: 1366, height: 850 }, acceptDownloads: true }); const page = await ctx.newPage(); page.on('pageerror', e => errors.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/favicon|net::ERR|the server responded with a status of 4/.test(m.text())) errors.push('CONSOLE ' + m.text().slice(0, 160)); }); await page.goto(BASE + '/'); await page.evaluate((c) => { localStorage.clear(); localStorage.setItem('bookverse.consent', c); }, consent); return page; };
const A = await mk(); const B = await mk();
const step = async (name, fn) => { try { const v = await fn(); results.push(['PASS', name, v ?? '']); } catch (e) { results.push(['FAIL', name, String(e.message).split('\n')[0].slice(0, 170)]); await A.screenshot({ path: `${OUT}/f2-${results.length}-A.png` }).catch(() => {}); await B.screenshot({ path: `${OUT}/f2-${results.length}-B.png` }).catch(() => {}); } };
const go = async (p, path, ms = 1200) => { await p.goto(BASE + path, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(ms); };
const vis = async (p, sel, t = 12000) => { await p.locator(sel).first().waitFor({ state: 'visible', timeout: t }); return true; };
const register = async (p, name, email) => {
  await go(p, '/register'); await p.fill('input[autocomplete=name]', name); await p.fill('input[autocomplete=email]', email); await p.fill('input[autocomplete=new-password]', 'password123');
  const boxes = p.locator('input[type=checkbox]'); await boxes.nth(0).check(); await boxes.nth(1).check(); await p.click('button:has-text("Create account")'); await p.waitForURL('**/onboarding', { timeout: 10000 });
  await p.click('button:has-text("Fiction")'); await p.click('button:has-text("Continue")'); await p.click('button:has-text("Calm")'); await p.click('button:has-text("Continue")'); await p.click('button:has-text("Continue")'); await p.waitForTimeout(800); await p.click('button:has-text("Open BookVerse")'); await p.waitForURL('**/home', { timeout: 10000 });
};
const emailA = `alice.${stamp}@example.com`, emailB = `bob.${stamp}@example.com`;
let handleA = '', handleB = '';

await step('A: register via real API → onboarding → home', async () => { await register(A, 'Alice Test', emailA); handleA = await A.evaluate(() => JSON.parse(localStorage.getItem('bookverse.auth')).state.user.username); return `u/${handleA}`; });
await step('B: register second account', async () => { await register(B, 'Bob Test', emailB); handleB = await B.evaluate(() => JSON.parse(localStorage.getItem('bookverse.auth')).state.user.username); return `u/${handleB}`; });
await step('Session survives reload (token + /me)', async () => { await A.reload({ waitUntil: 'domcontentloaded' }); await A.waitForTimeout(1500); await vis(A, 'h1:has-text("Good")'); if (!A.url().includes('/home')) throw new Error(A.url()); });
await step('Home feed comes from API with seeded community', async () => { await vis(A, 'text=highlighted a passage'); await vis(A, 'text=Live debate'); });
await step('A: add book to shelf → persisted server-side', async () => {
  await go(A, '/books/84', 2500); await A.click('button:has-text("Add to shelf")'); await A.click('[role=menuitem]:has-text("Want to read")'); await A.waitForTimeout(800);
  const lib = await fetch(BASE + '/api/me/library', { headers: { Authorization: 'Bearer ' + (await A.evaluate(() => JSON.parse(localStorage.getItem('bookverse.session')).access)) } }).then(r => r.json());
  if (!lib.shelves.some(s => s.bookId === 84 && s.shelf === 'want_to_read')) throw new Error('shelf not on server'); return 'server has want_to_read for #84';
});
await step('A: write review → B sees it on the book page', async () => {
  await A.click('button:has-text("Write a review")'); await A.fill('input[placeholder="Title your review"]', `Alice review ${stamp}`); await A.fill('textarea[placeholder="What stayed with you?"]', 'A masterpiece, gorgeous and unsettling.'); await A.click('button:has-text("Publish review")'); await A.waitForTimeout(800);
  await go(B, '/books/84', 2500); await vis(B, `text=Alice review ${stamp}`); await vis(B, 'text=Positive');
});
await step('B: marks review helpful → count updates', async () => { const art = B.locator('article', { hasText: `Alice review ${stamp}` }); await art.locator('button:has-text("Helpful")').click(); await B.waitForTimeout(1200); await art.locator('text=Helpful · 1').waitFor({ timeout: 8000 }); });
await step('A: reader loads via API cache, highlight saved server-side', async () => {
  await go(A, '/read/84', 3000); await A.waitForSelector('[data-para="0"]', { timeout: 60000 });
  await A.evaluate(() => { const p = document.querySelector('[data-para="1"]'); const n = p.firstChild; const r = document.createRange(); r.setStart(n, 0); r.setEnd(n, Math.min(40, n.textContent.length)); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); });
  await vis(A, 'button[aria-label="yellow"]'); await A.click('button[aria-label="yellow"]'); await A.waitForTimeout(900);
  await A.keyboard.press('ArrowRight'); await A.waitForTimeout(400); await A.keyboard.press('Escape'); await A.waitForURL('**/books/84', { timeout: 8000 }); await A.waitForTimeout(1200);
  await A.click('text=Community highlights'); await vis(A, 'blockquote'); return 'highlight visible in community tab';
});
await step('B: sees A’s highlight in Community highlights (cross-user)', async () => { await go(B, '/books/84', 2500); await B.click('text=Community highlights'); await vis(B, 'blockquote'); await vis(B, 'text=Alice Test'); });
await step('B: follows A → A gets a notification', async () => {
  await go(B, `/u/${handleA}`, 1800); await vis(B, 'h1:has-text("Alice Test")'); await B.click('button:has-text("Follow")'); await B.waitForTimeout(800); await vis(B, 'button:has-text("Following")');
  await go(A, '/notifications', 1500); await vis(A, 'text=Bob Test followed you');
});
await step('A: creates club → B joins → member count 2 on A’s view', async () => {
  await go(A, '/community?tab=clubs', 1500); await A.click('button:has-text("Create club")'); await A.fill('input[placeholder="e.g. Sunday Russians"]', `Club ${stamp}`);
  await A.waitForSelector('[role=dialog] button:has(img)', { timeout: 15000 }); await A.click('[role=dialog] button:has(img) >> nth=0'); await A.click('[role=dialog] button:has-text("Create club")'); await A.waitForURL('**/community/clubs/c_*', { timeout: 10000 });
  const clubUrl = new URL(A.url()).pathname;
  await go(B, clubUrl, 1500); await B.click('button:has-text("Join club")'); await B.waitForTimeout(900); await vis(B, 'button:has-text("Leave club")');
  await A.reload({ waitUntil: 'domcontentloaded' }); await A.waitForTimeout(1500); await vis(A, 'text=2 members'); return clubUrl;
});
await step('B: posts thread → A sees it and replies', async () => {
  await B.click('button:has-text("New thread")'); await B.fill('input[placeholder="Title"]', `Thread ${stamp}`); await B.fill('textarea', 'Loved the opening.'); await B.click('button:has-text("Post thread")'); await B.waitForTimeout(900);
  await A.reload({ waitUntil: 'domcontentloaded' }); await A.waitForTimeout(1500); await vis(A, `text=Thread ${stamp}`); await A.click('button:has-text("Reply")'); await A.fill('input[placeholder="Write a reply…"]', 'Same here'); await A.keyboard.press('Enter'); await A.waitForTimeout(900); await vis(A, 'text=Same here');
});
await step('Reading room: B sends via WebSocket, A receives live', async () => {
  await go(A, '/community/rooms/r_dorian', 2000); await go(B, '/community/rooms/r_dorian', 2000);
  await B.fill('input[placeholder="Say something to the room…"]', `Live ${stamp}`); await B.keyboard.press('Enter');
  await vis(A, `text=Live ${stamp}`, 8000); return 'received without reload';
});
await step('Debate: A votes + argues → B sees argument', async () => {
  await go(A, '/community/debates/d_quixote', 1500); await A.click('button:has-text("No, it invented the novel")'); await A.waitForTimeout(800); await A.fill('input[maxlength="280"]', `Argument ${stamp}`); await A.click('button:has-text("Post")'); await A.waitForTimeout(900);
  await go(B, '/community/debates/d_quixote', 1500); await vis(B, `text=Argument ${stamp}`);
});
await step('A: publishes story → B (follower) notified + can read + comment', async () => {
  await go(A, '/stories/write', 1200); await A.fill('input[placeholder="Title"]', `Story ${stamp}`); await A.click('.story-editor'); await A.keyboard.type('She missed the ferry on purpose.'); await A.click('button:has-text("Publish")'); await A.waitForURL('**/stories/s_*', { timeout: 10000 });
  const storyUrl = new URL(A.url()).pathname;
  await go(B, '/notifications', 1500); await vis(B, 'text=New story from Alice Test');
  await go(B, storyUrl, 1500); await vis(B, `h1:has-text("Story ${stamp}")`); await B.fill('input[placeholder="Tell the author something true"]', 'Lovely.'); await B.keyboard.press('Enter'); await B.waitForTimeout(900); await vis(B, 'text=Lovely.');
});
await step('A: publishes a book with cover → B finds it on Discover and reads it', async () => {
  await go(A, '/publish', 1200); await A.fill('input[placeholder="The title"]', `Harbour ${stamp}`); await A.fill('textarea[placeholder^="What is it about"]', 'Short essays about a small port town.');
  await A.fill('textarea[placeholder^="Paste or write the chapter"]', Array.from({ length: 10 }, (_, i) => `Paragraph ${i + 1}. The harbour wakes before the town does, and the gulls know it. `.repeat(3)).join('\n\n'));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  await A.setInputFiles('input[type=file][accept="image/*"]', { name: 'cover.png', mimeType: 'image/png', buffer: png });
  await A.check('input[type=checkbox]'); await A.click('button:has-text("Publish book")'); await A.waitForURL(/\/books\/1000\d+/, { timeout: 15000 }); await vis(A, 'text=Published on BookVerse');
  await go(B, '/discover', 2000); await vis(B, 'text=Published by our members'); await vis(B, `text=Harbour ${stamp}`);
  await B.locator(`a:has-text("Harbour ${stamp}")`).first().click(); await B.waitForURL(/\/books\/1000\d+/); await B.waitForTimeout(1200); await B.click('button:has-text("Start reading")'); await B.waitForSelector('[data-para="0"]', { timeout: 15000 }); await B.keyboard.press('Escape');
});
await step('A: profile shows links + published book; B sees the same public profile', async () => {
  await go(A, '/settings', 1200); await A.fill('input[placeholder^="Author of"]', 'Essayist'); await A.fill('input[placeholder="https://yoursite.com"]', 'https://harbour.example'); await A.click('button:has-text("Save changes")'); await vis(A, 'text=Profile saved');
  await go(B, `/u/${handleA}`, 1800); await vis(B, 'text=Essayist'); await vis(B, 'a[href="https://harbour.example"]'); await B.click('button:has-text("Books")'); await vis(B, `text=Harbour ${stamp}`);
});
await step('Diary: A writes public entry → appears in community diary for B', async () => {
  await go(A, '/diary', 1200); await A.click('button:has-text("New entry")'); await A.fill('input[placeholder="Title"]', `Rainy ${stamp}`); await A.fill('textarea', 'Read two chapters by the window.'); await A.click('button:has-text("Save entry")'); await A.waitForTimeout(900);
  await go(B, '/diary', 1500); await vis(B, `text=Rainy ${stamp}`);
});
await step('Search finds the new member, story and book', async () => { await go(B, `/search?q=${stamp}`, 2000); await B.click('button:has-text("People")').catch(() => {}); await go(B, `/search?q=alice`, 2000); await B.click('button:has-text("People")'); await vis(B, 'text=Alice Test'); await go(B, `/search?q=Harbour ${stamp}`, 2500); await vis(B, `text=Harbour ${stamp}`); });
await step('Settings: export downloads server data; email-verify banner shown', async () => { await go(A, '/settings', 1200); await vis(A, 'text=Verify your email'); const [dl] = await Promise.all([A.waitForEvent('download', { timeout: 8000 }), A.click('button:has-text("Export")')]); return dl.suggestedFilename(); });
await step('Guest: can read but shelf action asks to log in', async () => { const G = await mk(); await go(G, '/books/1342', 2000); await G.click('button:has-text("Add to shelf")'); await G.click('[role=menuitem]:has-text("Want to read")'); await vis(G, 'text=Log in to save'); await go(G, '/read/1342', 3000); await G.waitForSelector('[data-para="0"]', { timeout: 60000 }); await G.close(); });
await step('Logout → session cleared → login again restores server state', async () => {
  await go(A, '/home', 1000); await A.click('header button[aria-haspopup=menu]'); await A.click('[role=menu] >> text=Log out'); await A.waitForURL(BASE + '/'); await A.waitForTimeout(500);
  await go(A, '/login'); await A.fill('input[type=email]', emailA); await A.fill('input[type=password]', 'password123'); await A.click('button:has-text("Log in")'); await A.waitForURL('**/home', { timeout: 10000 }); await A.waitForTimeout(1500);
  await go(A, '/shelf', 1500); await vis(A, 'text=Want to read'); await vis(A, 'img[alt*="Frankenstein"]');
});
await step('Wrong password shows server error', async () => { await A.click('header button[aria-haspopup=menu]'); await A.click('[role=menu] >> text=Log out'); await A.waitForTimeout(400); await go(A, '/login'); await A.fill('input[type=email]', emailA); await A.fill('input[type=password]', 'nope'); await A.click('button:has-text("Log in")'); await vis(A, 'text=Incorrect email or password'); });
await step('Delete account (B) → profile 404s', async () => { await go(B, '/settings', 1200); await B.click('button:has-text("Delete")'); await B.fill('input[placeholder="DELETE"]', 'DELETE'); await B.click('button:has-text("Delete permanently")'); await B.waitForTimeout(1200); await go(A, `/u/${handleB}`, 1500); await vis(A, 'text=doesn’t exist'); });

console.log(results.map(([s, n, v]) => `${s}  ${n}${v ? '  — ' + v : ''}`).join('\n'));
console.log(`\n${results.filter(r => r[0] === 'PASS').length}/${results.length} passed`);
console.log(errors.length ? '\nRuntime errors:\n' + [...new Set(errors)].slice(0, 10).join('\n') : '\nNo runtime errors');
await browser.close();

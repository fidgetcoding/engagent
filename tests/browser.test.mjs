import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { chromium } from 'playwright';

async function fixture(demo, run) {
  const appRoot = process.env.ENGAGENT_TEST_APP_ROOT || process.cwd();
  const dir = await mkdtemp(path.join(tmpdir(), 'engagent-browser-'));
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const url = `http://127.0.0.1:${port}`;
  const env = { ...process.env, ENGAGENT_DEMO: demo ? '1' : '0', ENGAGENT_PASSWORD: 'local-smoke-test', ENGAGENT_DATA: path.join(dir, 'state.json'), NEXT_TELEMETRY_DISABLED: '1' };
  for (const key of ['APIFY_TOKEN', 'TELEGRAM_BOT_TOKEN', 'ANTHROPIC_API_KEY']) delete env[key];
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: appRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  server.stdout.on('data', chunk => { log += chunk; });
  server.stderr.on('data', chunk => { log += chunk; });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (server.exitCode !== null) throw new Error(log);
      try { await fetch(url, { signal: AbortSignal.timeout(500) }); ready = true; break; } catch { await new Promise(r => setTimeout(r, 100)); }
    }
    assert.ok(ready, `Server failed to start: ${log}`);
    console.log(`Isolated smoke server: ${url}, demo=${demo}`);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ httpCredentials: { username: 'test', password: 'local-smoke-test' } });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await run({ page, context, url, errors });
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    const closed = new Promise(resolve => server.once('exit', resolve));
    if (server.exitCode === null) { server.kill('SIGTERM'); await closed; }
    await rm(dir, { recursive: true, force: true });
  }
}

test('malformed saved demo state recovers and all existing screens work', { timeout: 60000 }, async () => {
  await fixture(true, async ({ page, url, errors }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('smoke-seeded')) {
        localStorage.setItem('engagent-demo-v1-Fernhouse Coffee', '{"cards":null}');
        localStorage.setItem('smoke-seeded', 'yes');
      }
    });
    await page.goto(url);
    await page.waitForTimeout(500);
    assert.deepEqual(errors, []);
    await page.getByRole('button', { name: 'Reset demo' }).click();
    for (const tab of ['Timeline', 'Briefs', 'Finds', 'Directions', 'Performance', 'Telegram', 'Board']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      assert.equal(await page.locator('main').innerText().then(t => t.length > 0), true);
    }
    await page.getByLabel('New content idea').fill('Browser smoke idea');
    await page.getByRole('button', { name: 'Add idea', exact: true }).click();
    await page.reload();
    await page.getByText('Browser smoke idea', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Briefs', exact: true }).click();
    const brief = page.getByLabel('Brief for Regulars order wrong on purpose');
    await brief.fill('Unsaved draft');
    await page.getByRole('button', { name: 'Reset demo' }).click();
    assert.equal(await page.getByLabel('Brief for Regulars order wrong on purpose').inputValue(), '');
    assert.equal((await fetch(`${url}/api/state`)).status, 404);
  });
});

test('live workspace orders saves, rejects unauthorized writes and reports transport failure', { timeout: 60000 }, async () => {
  await fixture(false, async ({ page, url }) => {
    assert.equal((await fetch(`${url}/api/state`)).status, 401);
    const auth = `Basic ${Buffer.from('test:local-smoke-test').toString('base64')}`;
    const state = await fetch(`${url}/api/state`, { headers: { authorization: auth } });
    assert.equal(state.status, 200);
    const attack = await fetch(`${url}/api/action`, { method: 'POST', headers: { authorization: auth, origin: 'https://other.test', 'content-type': 'application/json' }, body: '{}' });
    assert.equal(attack.status, 403);
    await page.goto(url);
    let active = 0, peak = 0, calls = 0;
    await page.route('**/api/action', async route => {
      active++; peak = Math.max(peak, active); calls++;
      await new Promise(resolve => setTimeout(resolve, calls === 1 ? 200 : 10));
      const response = await route.fetch();
      if (!response.ok()) console.log("Mutation rejected:", response.status(), await response.text(), "origin:", route.request().headers().origin);
      await route.fulfill({ response });
      active--;
    });
    await page.getByLabel('New content idea').fill('First live idea');
    await page.getByRole('button', { name: 'Add idea', exact: true }).click();
    await page.getByLabel('New content idea').fill('Second live idea');
    await page.getByRole('button', { name: 'Add idea', exact: true }).click();
    await page.getByText('Second live idea', { exact: true }).waitFor();
    assert.equal(calls, 2); assert.equal(peak, 1);
    await page.reload();
    await page.getByText('First live idea', { exact: true }).waitFor();
    await page.getByText('Second live idea', { exact: true }).waitFor();
    await page.unroute('**/api/action');
    await page.route('**/api/action', route => route.abort('failed'));
    await page.getByLabel('New content idea').fill('Network failure');
    await page.getByRole('button', { name: 'Add idea', exact: true }).click();
    await page.locator('main').getByRole('alert').waitFor();
    assert.match(await page.locator('main').getByRole('alert').innerText(), /could not be confirmed/);
    assert.equal(await page.getByLabel('New content idea').inputValue(), 'Network failure');
  });
});

test('demo rejects non-finite metrics without corrupting saved state', { timeout: 60000 }, async () => {
  await fixture(true, async ({ page, url }) => {
    await page.goto(url);
    await page.getByRole('button', { name: 'Performance', exact: true }).click();
    await page.getByLabel('views', { exact: true }).fill('Infinity');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.locator('main').getByRole('alert').waitFor({ timeout: 3000 });
    assert.match(await page.locator('main').getByRole('alert').innerText(), /valid|whole number/i);
    assert.equal(await page.getByLabel('views', { exact: true }).inputValue(), 'Infinity');
    const saved = await page.evaluate(() => localStorage.getItem('engagent-demo-v1-Fernhouse Coffee'));
    assert.equal(saved, null);
  });
});

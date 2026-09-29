/* Capture real app screenshots for the blog + submission (screenshots/).
   Logs into the running frontend (localhost:5173) with the live backend
   (localhost:8000) and shoots each dashboard; the HDFS shot renders the real
   reports/hdfs_evidence.txt inside a terminal-style frame.
   Run:  node scripts/capture_screenshots.mjs */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import puppeteer from 'puppeteer'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, 'screenshots')
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const BASE = 'http://localhost:5173'

const browser = await puppeteer.launch({
  headless: 'new',
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1.5 },
  args: ['--no-sandbox'],
})
const page = await browser.newPage()

// ---- login ---------------------------------------------------------------
console.log('[shot] login…')
await page.goto(`${BASE}/#/login`, { waitUntil: 'networkidle2' })
await sleep(1200)
const inputs = await page.$$('input')
await inputs[0].type('admin')
await inputs[1].type('admin123')
await page.click('button[type=submit]')
await page.waitForSelector('.kpi-tile', { timeout: 20000 })
await sleep(2500)

async function shot(route, file, { wait = 2500, before } = {}) {
  console.log(`[shot] ${file}`)
  await page.goto(`${BASE}/#${route}`, { waitUntil: 'networkidle2' })
  await sleep(wait)
  if (before) await before()
  await page.screenshot({ path: path.join(OUT, file) })
}

await shot('/', 'executive.png', { wait: 3500 })
await shot('/data-quality', 'data_quality.png')
await shot('/dual-pipeline', 'dual_pipeline.png')
await shot('/forecast', 'forecast.png', { wait: 3500 })
await shot('/recommendations', 'recommendations.png', {
  before: async () => {
    const btn = await page.$('.card button')
    if (btn) { await btn.click(); await sleep(900) }
  },
})
await shot('/network-map', 'live_map.png', { wait: 9000 })  // satellite tiles
await shot('/what-if', 'what_if.png')

// ---- HDFS terminal render (real evidence text) ---------------------------
console.log('[shot] hdfs terminal…')
const evidence = readFileSync(path.join(ROOT, 'reports', 'hdfs_evidence.txt'), 'utf-8')
  .split('\n').slice(0, 26).join('\n')
const termHtml = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#1e1e2e;display:flex;align-items:center;justify-content:center;height:100vh}
  .win{width:1200px;background:#11111b;border-radius:12px;overflow:hidden;
       box-shadow:0 24px 80px rgba(0,0,0,.6);font-family:'Cascadia Mono',Consolas,monospace}
  .bar{background:#181825;padding:10px 14px;display:flex;gap:8px;align-items:center}
  .dot{width:12px;height:12px;border-radius:50%}
  .t{color:#7f849c;font-size:12px;margin-left:10px}
  pre{margin:0;padding:18px 22px;color:#cdd6f4;font-size:13.5px;line-height:1.55;white-space:pre-wrap}
  .p{color:#a6e3a1}
</style></head><body><div class="win">
  <div class="bar"><span class="dot" style="background:#f38ba8"></span>
  <span class="dot" style="background:#f9e2af"></span>
  <span class="dot" style="background:#a6e3a1"></span>
  <span class="t">hamza@DESKTOP — WSL2 Ubuntu · Hadoop 3.4.1 · single-node HDFS</span></div>
  <pre><span class="p">$ hdfs dfs -ls -h /urbantransit/raw_data && hdfs dfsadmin -report</span>\n${evidence
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></div></body></html>`
const termPath = path.join(OUT, '_term.html')
writeFileSync(termPath, termHtml)
await page.goto('file:///' + termPath.replace(/\\/g, '/'), { waitUntil: 'load' })
await sleep(600)
await page.screenshot({ path: path.join(OUT, 'hdfs_terminal.png') })

await browser.close()
console.log('[shot] DONE →', OUT)

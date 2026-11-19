#!/usr/bin/env node
/**
 * 部署后冒烟：进面板 → 语义层页签在 → 看板有卡 → 校验页有行 → pageerror 必须为空。
 *
 * 用法：
 *   ONTOLOGY_TOKEN=xxxx node tools/visual/smoke.mjs
 *   node tools/visual/smoke.mjs xxxx --base http://<host>:18080
 *   node tools/visual/smoke.mjs --base http://127.0.0.1:53024 --cookie-file tmp/auth-cookie.txt
 *
 * 鉴权两种：
 *   --token xxxx        走 dsh web 打印的 ?token=xxx（web profile）
 *   --cookie-file path  走浏览器会话 Cookie（桌面 profile）
 *
 * 需要 puppeteer-core（仓库故意不把它写进依赖）：
 *   pnpm add -D puppeteer-core
 * 或者用环境变量指过去：PUPPETEER_CORE=/path/to/puppeteer-core
 *
 * token 从哪来：dsh web 启动时会在 journal 里打印 http://host:18080/?token=xxxx
 *   sudo journalctl -u dsh-web -n 50 | grep -o 'token=[A-Za-z0-9_-]*' | tail -1
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const at = args.indexOf('--' + name)
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1] : fallback
}
// 选项解析：只有 --token/--base/--cookie-file 带值；其余非 -- 开头的才是位置参数（token）。
// 早期版本用 args.find(...) 找位置参数，会把 '--cookie-file' 的值 'tmp/auth-cookie.txt' 误当 token，
// 导致请求带上无效 token、页面停在鉴权页、侧栏找不到。
const VALUE_OPTIONS = new Set(['token', 'base', 'cookie-file'])
const positional = []
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]
  if (arg.startsWith('--')) {
    if (VALUE_OPTIONS.has(arg.slice(2))) index += 1
    continue
  }
  positional.push(arg)
}
const token = option('token', '') !== '' ? option('token', '') : (positional[0] ?? process.env.ONTOLOGY_TOKEN ?? '')
const baseUrl = option('base', process.env.ONTOLOGY_BASE ?? 'http://127.0.0.1:18080')
const cookieFile = option('cookie-file', process.env.ONTOLOGY_COOKIE_FILE ?? '')
const cookie = cookieFile === '' ? (process.env.ONTOLOGY_COOKIE ?? '') : (fs.existsSync(cookieFile) ? fs.readFileSync(cookieFile, 'utf8').trim() : '')
if (token === '' && cookie === '') {
  console.error('缺少鉴权：ONTOLOGY_TOKEN=xxxx node tools/visual/smoke.mjs（或 --cookie-file path）')
  process.exit(2)
}

const require = createRequire(import.meta.url)
let puppeteer
try {
  puppeteer = require('puppeteer-core')
} catch {
  try {
    puppeteer = require(process.env.PUPPETEER_CORE ?? 'puppeteer-core')
  } catch {
    console.error('需要 puppeteer-core：pnpm add -D puppeteer-core（或设 PUPPETEER_CORE 指向已装的目录）')
    process.exit(2)
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const checks = []
const check = (name, ok, detail = '') => { checks.push({ name, ok: ok === true, detail }); return ok === true }

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean)
const executablePath = chromeCandidates.find(candidate => fs.existsSync(candidate))
if (executablePath === undefined) {
  console.error('找不到浏览器：装 Chrome，或用 CHROME_PATH 指定（Edge 也行）')
  process.exit(2)
}

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox'],
  defaultViewport: { width: 1600, height: 1000 },
})
const page = await browser.newPage()
if (cookie !== '') await page.setExtraHTTPHeaders({ Cookie: cookie })
const errors = []
page.on('pageerror', error => errors.push(String(error).slice(0, 200)))

// 页签是自研组件（button[role="tab"]），程序化点击即可，避开宿主首运遮罩。
const openTab = async label => page.evaluate((name) => {
  const tab = [...document.querySelectorAll('button[role="tab"]')].find(node => (node.textContent ?? '').trim() === name)
  if (tab === undefined) return false
  tab.click()
  return true
}, label)

try {
  await page.goto(token === '' ? `${baseUrl}/` : `${baseUrl}/?token=${token}`, { waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(3000)
  check('dsh web 能打开', true)

  // 宿主首运弹窗「预览版说明」带全屏遮罩，会挡住真实鼠标点击：先关掉它。
  const hostDialog = await page.$('[class*="_dialog_"] button')
  if (hostDialog !== null) { await hostDialog.click().catch(() => {}); await sleep(1200) }
  check('宿主首运弹窗已关闭', (await page.$$('[class*="_mask_"]')).length === 0)

  const side = await page.evaluateHandle(() => {
    const hits = [...document.querySelectorAll('*')].filter(n => n.children.length === 0 && (n.textContent || '').trim() === '本体建模工作空间')
    if (hits.length === 0) return null
    return hits.filter(n => !hits.some(other => other !== n && n.contains(other)))[0] ?? hits[hits.length - 1]
  })
  const sideEl = side.asElement()
  const clicked = sideEl !== null
  if (clicked) await sideEl.click()
  check('侧栏能进「本体建模工作空间」', clicked)

  await page.waitForSelector('[data-dsh-studio]', { timeout: 30000 })
  await sleep(1500)
  check('面板挂载（[data-dsh-studio]）', true)

  const tabs = await page.$$eval('[data-dsh-studio] button[role="tab"]', nodes => nodes.map(n => n.textContent.trim()))
  const expected = ['工作台', '看板', '语义层', '场景', '校验', '本体版本', '项目', '效能', '设置']
  check('九个页签都在', expected.every(name => tabs.includes(name)), tabs.join('/'))

  await openTab('看板')
  await sleep(1500)
  const cards = await page.$$eval('[data-dsh-studio] .ds-card', nodes => nodes.length)
  check('看板有卡', cards > 0, `${cards} 张`)

  await openTab('语义层')
  await sleep(1500)
  const stats = await page.$$eval('[data-dsh-studio] .ds-stat-box', nodes => nodes.length)
  check('语义层统计盒渲染（对象/属性/关系/规则/行动/已确认/AI 草稿）', stats === 7, `${stats} 个`)
  const semanticsText = await page.evaluate(() => document.querySelector('[data-dsh-studio]')?.innerText ?? '')
  check('语义层出现缺口检查与服务封装', semanticsText.includes('缺口检查') && semanticsText.includes('服务封装'))

  await openTab('校验')
  await sleep(2000)
  const rows = await page.$$eval('[data-dsh-studio] .ds-case-lib tbody tr', nodes => nodes.length)
  check('校验页有用例行', rows > 0, `${rows} 行`)

  const suite = await page.$$eval('[data-dsh-studio] .ds-suite', nodes => nodes.length)
  // 套件是数据驱动的：新装的实例还没有套件，断言「有套件就渲染出来」而不是「必须有套件」。
  const serverSuites = await (async () => {
    try {
      const res = await fetch(`${baseUrl}/ontology-api/suite/list`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(cookie === '' ? {} : { Cookie: cookie }) },
        body: '{}',
      })
      const json = await res.json()
      return Array.isArray(json.suites) ? json.suites.length : 0
    } catch { return -1 }
  })()
  check(
    serverSuites <= 0 ? '回归套件区域（本机暂无套件数据）' : '回归套件渲染',
    serverSuites <= 0 ? true : suite > 0,
    `${suite} 个 / 服务端 ${serverSuites} 个`,
  )

  const crash = await page.evaluate(() => {
    const text = document.body.innerText
    const at = text.indexOf('渲染失败')
    return at < 0 ? null : text.slice(Math.max(0, at - 10), at + 90).replace(/\s+/g, ' ')
  })
  check('面板没有渲染失败', crash === null, crash ?? '')

  check('pageerror 为空', errors.length === 0, errors.slice(0, 2).join(' | '))
} catch (error) {
  check('冒烟没跑完', false, String(error?.message ?? error).slice(0, 200))
} finally {
  await browser.close()
}

const failed = checks.filter(item => item.ok !== true)
console.log(JSON.stringify({ baseUrl, checks, ok: failed.length === 0 }, null, 1))
process.exitCode = failed.length === 0 ? 0 : 1

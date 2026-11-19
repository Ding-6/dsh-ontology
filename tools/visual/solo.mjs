#!/usr/bin/env node
/**
 * 单人开发模式探针（v0.7.0）：规划页签 → 一句业务话 → 阶段计划 + 初定版本 → 一键落成需求与步骤卡
 * → 角色能力配置（工具白名单 / 插件 / MCP）与工作模式 → 自清理。
 *
 * 用法：
 *   node tools/visual/solo.mjs --base http://127.0.0.1:52822 --cookie-file tmp/auth-cookie.txt
 *
 * 需要 puppeteer-core（仓库故意不把它写进依赖）：pnpm add -D puppeteer-core
 * 浏览器默认找系统 Chrome；没有 Chrome 的机器可设 CHROME_PATH 指向 Edge。
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const at = args.indexOf('--' + name)
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1] : fallback
}
const baseUrl = option('base', process.env.ONTOLOGY_BASE ?? 'http://127.0.0.1:18080')
const token = option('token', process.env.ONTOLOGY_TOKEN ?? '')
const cookieFile = option('cookie-file', process.env.ONTOLOGY_COOKIE_FILE ?? '')
const cookie = cookieFile === '' ? (process.env.ONTOLOGY_COOKIE ?? '') : (fs.existsSync(cookieFile) ? fs.readFileSync(cookieFile, 'utf8').trim() : '')
if (token === '' && cookie === '') {
  console.error('缺少鉴权：--token xxxx 或 --cookie-file path（其一即可）')
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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const failures = []
const checks = []
const ok = (name, cond, extra = '') => {
  checks.push({ name, ok: cond === true, detail: extra })
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' :: ' + extra : ''}`)
  if (!cond) failures.push(name)
}

const browser = await puppeteer.launch({
  executablePath,
  headless: 'new',
  args: ['--no-sandbox'],
  defaultViewport: { width: 1600, height: 1000 },
})
const page = await browser.newPage()
if (cookie !== '') await page.setExtraHTTPHeaders({ Cookie: cookie })
const pageErrors = []
page.on('pageerror', e => pageErrors.push(String(e)))
page.on('console', m => { if (m.type() === 'error') pageErrors.push('console: ' + m.text()) })

async function findByText(text, { tag = '*', exact = true } = {}) {
  const handle = await page.evaluateHandle(({ text, tag, exact }) => {
    const hits = [...document.querySelectorAll(tag)].filter(n => {
      const t = (n.textContent ?? '').trim()
      return exact ? t === text : t.includes(text)
    })
    if (hits.length === 0) return null
    const deepest = hits.filter(n => !hits.some(other => other !== n && n.contains(other)))
    return deepest[0] ?? hits[hits.length - 1]
  }, { text, tag, exact })
  return handle.asElement()
}
async function clickText(text, opts = {}) {
  const el = await findByText(text, opts)
  if (!el) throw new Error(`找不到元素：${text}`)
  await el.click()
  return el
}
const panelText = async () => page.evaluate(() => document.querySelector('[data-dsh-studio]')?.innerText ?? '')
const panelByHead = async head => page.evaluateHandle(h => {
  const panels = [...document.querySelectorAll('[data-dsh-studio] .ds-panel')]
  const headOf = p => (p.querySelector('.ds-panel-head')?.textContent ?? '').trim()
  return panels.find(p => headOf(p) === h || headOf(p).startsWith(h))
    ?? panels.find(p => headOf(p).includes(h))
    ?? null
}, head)

/** 反复等到页面文本里出现某个词（面板重渲染会换 DOM 节点，所以每次重新取文本）。 */
async function waitForText(text, { timeoutMs = 30000, step = 500 } = {}) {
  const deadline = Date.now() + timeoutMs
  let last = ''
  while (Date.now() < deadline) {
    last = await panelText()
    if (last.includes(text)) return last
    await sleep(step)
  }
  return last
}

async function typeInto(placeholder, value) {
  const h2 = await page.evaluateHandle((ph) => {
    const i = [...document.querySelectorAll('[data-dsh-studio] input, [data-dsh-studio] textarea')]
      .find(x => (x.getAttribute('placeholder') ?? '').includes(ph))
    return i ?? null
  }, placeholder)
  const el = h2.asElement()
  if (!el) throw new Error(`找不到输入框：${placeholder}`)
  await el.click()
  // react-aria 的输入框三击全选不生效，这里用 Ctrl+A + 原生 setter 清空再输入。
  await page.keyboard.down('Control')
  await page.keyboard.press('KeyA')
  await page.keyboard.up('Control')
  await page.keyboard.press('Backspace')
  await el.evaluate(e => {
    const proto = e.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(e, '')
    e.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await el.type(value)
  return el
}

try {
  const url = token === '' ? baseUrl : `${baseUrl}/?token=${token}`
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(3000)

  // 0) 关掉宿主首运弹窗（带全屏遮罩，会挡住真实鼠标点击）
  const hostDialog = await page.$('[class*="_dialog_"] button')
  if (hostDialog) { await hostDialog.click().catch(() => {}); await sleep(1200) }

  // 1) 侧栏进面板
  const side = await findByText('本体建模工作空间')
  ok('侧栏出现「本体建模工作空间」', !!side)
  await side.click()
  await page.waitForSelector('[data-dsh-studio]', { timeout: 30000 })
  await sleep(1200)

  // 2) 切到规划页签
  const planTab = await findByText('规划', { tag: 'button[role="tab"]' })
  ok('页签「规划」存在', !!planTab)
  await planTab.click()
  await sleep(1500)
  const planText = await panelText()
  ok('规划页签渲染（说清要做什么 / 内置规范技能）',
    planText.includes('说清要做什么') && planText.includes('内置规范技能'))

  // 3) 一句业务话 → 生成计划
  await typeInto('例：给地市做一个', '给地市做一个装维工单本体：工单自动派给最近的装维人员，超时未接单要升级，工单与设备台账要能对上。')
  await clickText('生成计划')
  const planned = await waitForText('执行计划', { timeoutMs: 30000 })
  ok('生成计划后出现「执行计划」', planned.includes('执行计划'))
  ok('计划含七个阶段（场景筛选 → 联调测试）',
    ['场景筛选', '数据治理', '本体建模', '联调测试'].every(k => planned.includes(k)),
    ['场景筛选', '数据治理', '本体建模', '联调测试'].filter(k => planned.includes(k)).join('/'))
  ok('每一步都写了规范与验收标准',
    planned.includes('规范：') && planned.includes('产出物：') && planned.includes('验收：'))
  ok('给出初定版本（对象/关系/规则/行动 四类计数）',
    planned.includes('初定版本') && planned.includes('对象') && planned.includes('关系') && planned.includes('规则') && planned.includes('行动'))
  ok('列出要确认的三件事（服务端/鉴权/交付边界）', planned.includes('要你确认的三件事'))
  ok('内置规范技能清单可见（含对象建模规范）', planned.includes('ontology-object-modeling'))
  await page.screenshot({ path: 'tmp/solo-01-plan.png' })

  // 4) 一键落成需求 + 步骤卡
  await clickText('落成需求 + 步骤卡')
  const applied = await waitForText('已落成', { timeoutMs: 30000 })
  ok('落成后出现「已落成」面板', applied.includes('已落成'))

  const server = await page.evaluate(async () => {
    const res = await fetch('/ontology-api/state')
    const data = await res.json()
    const state = data.state ?? data
    const reqs = state.requirements ?? []
    const tasks = state.tasks ?? []
    const req = reqs.find(r => String(r.title ?? '').includes('装维工单本体')) ?? reqs[reqs.length - 1]
    const cards = tasks.filter(t => req && t.requirementId === req.id)
    return {
      mode: state.config?.workflow?.mode ?? '',
      roleIds: Object.keys(state.config?.roles ?? {}),
      columns: Object.entries(state.config?.columns ?? {}).map(([id, col]) => `${id}:${col?.kind ?? ''}:${col?.id ?? ''}`),
      req: req ? { id: req.id, code: req.code, title: req.title, status: req.status } : null,
      cards: cards.map(c => ({ id: c.id, code: c.code, role: c.role, status: c.status })),
    }
  })
  ok('落成的是一条新需求', !!server.req, server.req ? `${server.req.code} ${server.req.title}` : '没找到')
  ok('步骤卡挂在需求下且数量 > 0', server.cards.length > 0, `cards=${server.cards.length}`)
  const roles = new Set(server.cards.map(c => c.role))
  ok('步骤卡角色落在七类角色里',
    [...roles].every(r => ['business', 'requirement', 'data', 'modeling', 'backend', 'frontend', 'qa'].includes(r)),
    [...roles].join(','))
  ok('工作模式默认单人（免审批）', server.mode === 'solo', `mode=${server.mode}`)
  ok('角色位是七类', server.roleIds.length === 7, server.roleIds.join(','))
  ok('看板列是标准动作八列',
    ['clarify', 'design', 'data', 'model', 'backend', 'frontend', 'test', 'done'].every(c => server.columns.some(x => x.startsWith(c + ':'))),
    server.columns.join(' '))
  ok('每列都按角色位接单（不绑具体专家）',
    server.columns.filter(x => !x.startsWith('clarify:')).every(x => x.split(':')[1] === 'role'),
    server.columns.join(' '))
  await page.screenshot({ path: 'tmp/solo-02-applied.png' })

  // 5) 设置 → 专家：工作模式 + 角色能力配置（工具白名单 / 插件 / MCP）
  const settingsTab = await findByText('设置', { tag: 'button[role="tab"]' })
  ok('页签「设置」存在', !!settingsTab)
  await settingsTab.click()
  await sleep(1200)
  await clickText('专家')
  await sleep(1200)
  const expertText = await panelText()
  ok('专家面板有工作模式开关（单人开发免审批）',
    expertText.includes('工作模式') && expertText.includes('单人开发（免审批）'))
  ok('能一键生成七位角色专家', expertText.includes('生成七位角色专家'))
  const editBtn = await page.evaluateHandle(() => {
    const b = [...document.querySelectorAll('[data-dsh-studio] button')].find(x => (x.textContent ?? '').trim() === '编辑')
    return b ?? null
  })
  ok('专家列表有「编辑」入口', !!editBtn.asElement())
  if (editBtn.asElement()) {
    await editBtn.asElement().click()
    await sleep(1200)
    const drawerText = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]')
      return d ? (d.innerText ?? '') : ''
    })
    ok('专家抽屉有可调用工具白名单', drawerText.includes('可调用工具白名单'))
    ok('专家抽屉有接入的插件', drawerText.includes('接入的插件'))
    ok('专家抽屉有接入的 MCP', drawerText.includes('接入的 MCP'))
    await page.screenshot({ path: 'tmp/solo-03-expert-capability.png' })
    const cancel = await page.evaluateHandle(() => {
      const d = document.querySelector('[role="dialog"]')
      const b = [...(d?.querySelectorAll('button') ?? [])].find(x => (x.textContent ?? '').trim() === '取消')
      return b ?? null
    })
    if (cancel.asElement()) await cancel.asElement().click()
    await sleep(600)
  }

  // 6) 自清理：探针造的需求与卡不留给用户
  const cleaned = await page.evaluate(async (reqId) => {
    const res = await fetch('/ontology-api/state')
    const data = await res.json()
    const state = data.state ?? data
    const cards = (state.tasks ?? []).filter(t => t.requirementId === reqId)
    for (const card of cards) {
      await fetch('/ontology-api/task/delete', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: card.id }),
      })
    }
    await fetch('/ontology-api/requirement/delete', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: reqId }),
    })
    const after = await (await fetch('/ontology-api/state')).json()
    const st = after.state ?? after
    return {
      cards: cards.length,
      left: (st.requirements ?? []).filter(r => r.id === reqId).length,
      leftCards: (st.tasks ?? []).filter(t => t.requirementId === reqId).length,
    }
  }, server.req?.id ?? '')
  ok('探针造的需求与卡已自清理',
    cleaned.left === 0 && cleaned.leftCards === 0,
    `deleted=${cleaned.cards} leftReq=${cleaned.left} leftCards=${cleaned.leftCards}`)

  const failedRender = await page.evaluate(() => document.body.innerText.includes('渲染失败'))
  ok('页面没有「工作空间渲染失败」', !failedRender)
  const realErrors = pageErrors.filter(e => !/favicon|ERR_/.test(e))
  ok('pageerror / console error 为空', realErrors.length === 0, realErrors.slice(0, 3).join(' || '))
} catch (cause) {
  ok('探针没跑完', false, String(cause?.message ?? cause).slice(0, 200))
  await page.screenshot({ path: 'tmp/solo-error.png' }).catch(() => {})
} finally {
  await browser.close()
}

console.log('\n==== 结论 ====')
console.log(failures.length === 0 ? 'ALL PASS' : `FAILED: ${failures.join(', ')}`)
console.log(JSON.stringify({ baseUrl, checks, ok: failures.length === 0 }, null, 1))
process.exit(failures.length === 0 ? 0 : 1)

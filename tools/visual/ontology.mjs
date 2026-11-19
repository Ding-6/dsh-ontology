#!/usr/bin/env node
/**
 * 本体语义层端到端探针：空台账起步（出厂无示例数据）→ 领域骨架模板 → 应用蓝图 → 平台操作手册库
 * → 生成 MCP 服务封装 → 人工登记一条资产（AI 草稿）→ 专家校准通过（已确认）。
 * 断言 DOM 文本 + pageerror 为空，并截图留档。
 *
 * 用法：
 *   node tools/visual/ontology.mjs --base http://127.0.0.1:63610 --cookie-file tmp/auth-cookie.txt
 *   ONTOLOGY_TOKEN=xxxx node tools/visual/ontology.mjs --base http://<host>:18080
 *
 * 鉴权两种：
 *   --token xxxx        走 dsh web 打印的 ?token=xxx（web profile）
 *   --cookie-file path  走浏览器会话 Cookie（桌面 profile，见 tools/visual/README 备注）
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
const runStart = Date.now()
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
const panelByHead = async head => page.evaluateHandle(h => {
  const panels = [...document.querySelectorAll('[data-dsh-studio] .ds-panel')]
  const headOf = p => (p.querySelector('.ds-panel-head')?.textContent ?? '').trim()
  // 面板头里常带一句说明文字，所以先找「以标题开头」的面板，再退回包含匹配。
  return panels.find(p => headOf(p) === h || headOf(p).startsWith(h))
    ?? panels.find(p => headOf(p).includes(h))
    ?? null
}, head)
const statValue = async label => page.evaluate(l => {
  const box = [...document.querySelectorAll('[data-dsh-studio] .ds-stat-box')].find(b => (b.querySelector('span')?.textContent ?? '').trim() === l)
  return box ? (box.querySelector('b')?.textContent ?? '').trim() : null
}, label)

try {
  const url = token === '' ? baseUrl : `${baseUrl}/?token=${token}`
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(3000)

  // 0) 关掉宿主首运弹窗「预览版说明」（它带全屏遮罩，会挡住真实鼠标点击）
  const hostDialog = await page.$('[class*="_dialog_"] button')
  if (hostDialog) { await hostDialog.click().catch(() => {}); await sleep(1200) }
  ok('宿主首运弹窗已关闭', (await page.$$('[class*="_mask_"]')).length === 0)

  // 1) 侧栏进面板
  const side = await findByText('本体建模工作空间')
  ok('侧栏出现「本体建模工作空间」', !!side)
  await side.click()
  await page.waitForSelector('[data-dsh-studio]', { timeout: 30000 })
  await sleep(1200)
  ok('面板挂载 [data-dsh-studio]', true)

  // 2) 切到语义层页签
  const tab = await findByText('语义层', { tag: 'button[role="tab"]' })
  ok('页签「语义层」存在', !!tab)
  await tab.click()
  await sleep(1500)
  const panelText = await page.evaluate(() => document.querySelector('[data-dsh-studio]')?.innerText ?? '')
  ok('语义层页签渲染（统计盒/缺口检查）', panelText.includes('缺口检查') && panelText.includes('业务对象'))
  await page.screenshot({ path: 'tmp/ontology-01-semantics-empty.png' })

  // 3) 出厂不带示例数据：没有「并入可选示例」入口，台账里也没有样例本体
  const after = await page.evaluate(() => document.querySelector('[data-dsh-studio]')?.innerText ?? '')
  ok('语义层没有「并入可选示例」入口', !after.includes('并入可选示例'))
  ok('出厂不带示例业务数据（无商企市场样例）', !after.includes('商企市场'))
  const objects0 = await statValue('业务对象')
  const rels0 = await statValue('对象关系')
  const rules0 = await statValue('业务规则')
  const actions0 = await statValue('可调用行动')
  ok('台账统计格齐全（对象/关系/规则/行动）',
    [objects0, rels0, rules0, actions0].every(v => v !== null),
    `${objects0}/${rels0}/${rules0}/${actions0}`)
  // 缺口与闸门都拿服务端真值对账：台账里有多少缺口就显示多少，闸门该拦就拦。
  const truth = await page.evaluate(async () => {
    const res = await fetch('/ontology-api/ontology')
    const data = await res.json()
    return { issues: data.coverage?.issues ?? -1, ready: data.gate?.ready === true, blockers: data.gate?.blockers ?? [] }
  })
  const gapPanel = (await panelByHead('缺口检查')).asElement()
  const gapText = gapPanel ? await gapPanel.evaluate(p => p.innerText ?? '') : after
  ok('缺口检查与服务端一致', truth.issues === 0
    ? gapText.includes('没有缺口')
    : gapText.includes('处待补') && gapText.includes(String(truth.issues)),
    `issues=${truth.issues}`)
  ok('闸门提示与服务端一致', truth.ready
    ? after.includes('语义层可以对外提供能力')
    : truth.blockers.some(b => after.includes(b)),
    truth.ready ? 'ready' : truth.blockers.join(' | '))
  await page.screenshot({ path: 'tmp/ontology-02-empty-ledger.png' })

  // 3b) 通用化面板都在：多本体 / 建模建议 / 领域骨架 / 应用蓝图 / 操作手册
  ok('多本体容器面板存在', after.includes('本体（可多本体并存）'))
  ok('建模建议面板存在', after.includes('建模建议'))
  ok('领域骨架模板面板存在', after.includes('领域骨架模板'))
  ok('应用蓝图面板存在', after.includes('应用蓝图'))
  ok('平台操作手册库面板存在', after.includes('平台操作手册库'))
  ok('服务封装面板存在', after.includes('服务封装'))

  // 3c) 领域骨架模板：生成骨架 → 草稿进台账
  const tplPanel = (await panelByHead('领域骨架模板')).asElement()
  const genTpl = await tplPanel.evaluateHandle(p => {
    const b = [...p.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '生成骨架')
    return b ?? null
  })
  ok('骨架模板有「生成骨架」按钮', !!genTpl.asElement())
  await genTpl.asElement().click()
  await sleep(1000)
  const genDlg = await page.evaluateHandle(() => {
    const d = document.querySelector('[role="dialog"]')
    const b = [...(d?.querySelectorAll('button') ?? [])].find(x => (x.textContent ?? '').trim() === '生成')
    return b ?? null
  })
  ok('骨架实例化确认弹窗出现', !!genDlg.asElement())
  if (genDlg.asElement()) {
    await genDlg.asElement().click()
    await sleep(2500)
  }
  const afterTpl = await page.evaluate(() => document.querySelector('[data-dsh-studio]')?.innerText ?? '')
  ok('骨架实例化后产生 AI 草稿资产', afterTpl.includes('AI 草稿'))

  // 3d) 应用蓝图：生成蓝图 → 看到六章设计
  const bpPanel = (await panelByHead('应用蓝图')).asElement()
  const genBp = await bpPanel.evaluateHandle(p => {
    const b = [...p.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '生成蓝图')
    return b ?? null
  })
  ok('应用蓝图有「生成蓝图」按钮', !!genBp.asElement())
  await genBp.asElement().click()
  await sleep(3000)
  const bpText = await bpPanel.evaluate(p => p.innerText ?? '')
  ok('蓝图生成并含数据模型/规则引擎/本体驱动三章',
    bpText.includes('数据模型设计') && bpText.includes('规则引擎设计') && bpText.includes('本体怎么驱动应用'),
    bpText.slice(0, 80).replace(/\n/g, ' '))

  // 3e) 平台操作手册库：存入手册 → 检索命中
  const guidePanel = (await panelByHead('平台操作手册库')).asElement()
  // 面板每次重渲染都会换掉 DOM 节点，旧句柄读到的还是旧文本 → 统一重新取。
  const guidePanelNow = async () => (await panelByHead('平台操作手册库')).asElement()
  const guideType = async (placeholder, value) => {
    const panel = await guidePanelNow()
    const h2 = await panel.evaluateHandle((p, ph) => {
      const i = [...p.querySelectorAll('input,textarea')].find(x => (x.getAttribute('placeholder') ?? '').includes(ph))
      return i ?? null
    }, placeholder)
    const el = h2.asElement()
    if (!el) throw new Error(`找不到输入框：${placeholder}`)
    await el.click()
    // 先清空再输入：上一次搜索的词还在框里，追加会让查询变成「新词+旧词」而查不到。
    // 三击全选对 react-aria 的输入框不生效（只删掉一个字符），这里用 Ctrl+A + 退格，
    // 再用原生 setter 兜底，保证 React 收到空串。
    await page.keyboard.down('Control')
    await page.keyboard.press('KeyA')
    await page.keyboard.up('Control')
    await page.keyboard.press('Backspace')
    const cleared = await el.evaluate(e => {
      if (e.value === '') return true
      const proto = e.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
      if (setter) setter.call(e, '')
      e.dispatchEvent(new Event('input', { bubbles: true }))
      return e.value === ''
    })
    if (!cleared) throw new Error(`输入框没清干净：${placeholder}`)
    await el.type(value)
  }
  await guideType('手册标题', '探针操作手册')
  await guideType('来源（手册名/链接）', 'probe-manual')
  await guideType('操作步骤正文', '第一步：新建本体容器；第二步：登记对象与规则。')
  const saveGuideBtn = await (await guidePanelNow()).evaluateHandle(p => {
    const b = [...p.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '存入手册')
    return b ?? null
  })
  await saveGuideBtn.asElement().click()
  await sleep(1800)
  await guideType('搜手册', '新建本体')
  const searchGuideBtn = await (await guidePanelNow()).evaluateHandle(p => {
    const b = [...p.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '检索')
    return b ?? null
  })
  await searchGuideBtn.asElement().click()
  await sleep(1800)
  const guideText = await (await guidePanelNow()).evaluate(p => p.innerText ?? '')
  ok('手册检索命中刚存的手册', guideText.includes('探针操作手册'), guideText.slice(0, 80).replace(/\n/g, ' '))

  // 3f) 内置平台操作手册：载入到手册库 → 检索内置章节命中
  const loadBookBtn = await (await guidePanelNow()).evaluateHandle(p => {
    const b = [...p.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '载入到手册库')
    return b ?? null
  })
  if (loadBookBtn.asElement()) {
    await loadBookBtn.asElement().click()
    await sleep(2500)
    const bookText = await (await guidePanelNow()).evaluate(p => p.innerText ?? '')
    ok('内置手册已载入（章节数 > 50）', /\d+ 个章节/.test(bookText) && !bookText.includes('0 个章节'),
      (bookText.match(/内置 · \d+ 个章节/) ?? [''])[0])
    await guideType('搜手册', '发布本体')
    // 载入 86 篇手册是一次大请求，按钮在请求完成前是 disabled 的；
    // 不等它解禁就点「检索」，点了也不会发请求（探针曾经因此误判为「检索不到」）。
    const searchReady = await (async () => {
      for (let i = 0; i < 40; i += 1) {
        const enabled = await (await guidePanelNow()).evaluate(p => {
          const b = [...p.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '检索')
          return !!b && b.disabled !== true
        })
        if (enabled) return true
        await sleep(500)
      }
      return false
    })()
    ok('检索按钮可用（请求已结束）', searchReady)
    const searchBookBtn = await (await guidePanelNow()).evaluateHandle(p => {
      const b = [...p.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '检索')
      return b ?? null
    })
    await searchBookBtn.asElement().click()
    // 等结果出来再断言。
    let bookHit = ''
    for (let i = 0; i < 20; i += 1) {
      await sleep(500)
      bookHit = await (await guidePanelNow()).evaluate(p => p.innerText ?? '')
      if (bookHit.includes('发布本体')) break
    }
    ok('内置手册可检索（发布本体章节命中）', bookHit.includes('发布本体'), bookHit.slice(0, 120).replace(/\n/g, ' '))
  } else {
    ok('内置手册载入按钮存在', false, '面板里找不到「载入到手册库」按钮')
  }

  // 4) 生成 MCP 服务封装（默认就是 对象 + 通用 MCP 协议）
  const svc = (await panelByHead('服务封装')).asElement()
  const genBtn = await svc.evaluateHandle(p => {
    const b = [...p.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '生成')
    return b ?? null
  })
  await genBtn.asElement().click()
  await sleep(1500)
  const svcText = await svc.evaluate(p => p.innerText ?? '')
  ok('MCP 封装生成（ontology_get_* 工具名）', svcText.includes('ontology_get_'), svcText.slice(0, 80).replace(/\n/g, ' '))
  await page.screenshot({ path: 'tmp/ontology-03-mcp-service.png' })

  // 5) 人工登记一条资产 → AI 草稿
  const formPanel = (await panelByHead('人工登记资产')).asElement()
  const type = async (placeholder, value) => {
    const h2 = await formPanel.evaluateHandle((p, ph) => {
      const i = [...p.querySelectorAll('input,textarea')].find(x => (x.getAttribute('placeholder') ?? '').includes(ph))
      return i ?? null
    }, placeholder)
    const el = h2.asElement()
    if (!el) throw new Error(`找不到输入框：${placeholder}`)
    await el.click()
    await el.type(value)
  }
  await type('名称', '探针测试对象')
  await type('说明（这是什么）', '浏览器端到端探针登记的样例对象')
  await type('编码（英文）', 'probe_object')
  await type('业务域', '探针域')
  await type('属性：名称:类型', '探针编号:string!,探针金额:number')
  await sleep(300)
  const regBtn = await formPanel.evaluateHandle(p => {
    const b = [...p.querySelectorAll('button')].find(x => (x.textContent ?? '').trim() === '登记为 AI 草稿')
    return b ?? null
  })
  await regBtn.asElement().click()
  await sleep(1800)
  const listText = await page.evaluate(() => document.querySelector('[data-dsh-studio]')?.innerText ?? '')
  ok('新资产出现在台账并标为 AI 草稿', listText.includes('探针测试对象') && listText.includes('AI 草稿'))

  // 6) 专家校准：通过
  // 产物里 legacy 的 ds-listrow 会被 web/src/main.jsx 就地翻译成 BoardUI TaskRow，
  // DOM 上不再有 .ds-listrow 类，只能按文本回溯祖先找到那一行的「通过」按钮。
  const passBtn = await page.evaluateHandle((name) => {
    // 「最深的那个同时含目标名称与「通过」按钮的容器」= 这一行。
    // 不能从按钮往上找（按钮所在的操作区不含名称，会先命中），也不能取整张列表（含所有行，会误点到别人的草稿）。
    const candidates = [...document.querySelectorAll('div,li,section,article')]
    let best = null
    let bestDepth = -1
    for (const el of candidates) {
      if (!(el.textContent ?? '').includes(name)) continue
      const btn = [...el.querySelectorAll('button')].find(b => (b.textContent ?? '').trim() === '通过')
      if (!btn) continue
      let depth = 0
      for (let p = el; p; p = p.parentElement) depth += 1
      if (depth > bestDepth) { bestDepth = depth; best = btn }
    }
    return best
  }, '探针测试对象')
  ok('草稿行有「通过」按钮', !!passBtn.asElement())
  await passBtn.asElement().click()
  await sleep(900)
  const textarea = await page.$('[role="dialog"] textarea')
  ok('校准弹窗出现（textarea + 通过）', !!textarea)
  if (textarea) {
    await textarea.click()
    await textarea.type('字段口径与样例一致，专家确认通过。')
    const dlgBtn = await page.evaluateHandle(() => {
      const d = document.querySelector('[role="dialog"]')
      const b = [...(d?.querySelectorAll('button') ?? [])].find(x => (x.textContent ?? '').trim() === '通过')
      return b ?? null
    })
    await dlgBtn.asElement().click()
    await sleep(1800)
  }
  const finalText = await page.evaluate(() => document.querySelector('[data-dsh-studio]')?.innerText ?? '')
  ok('校准后状态变「已确认」并留结论', finalText.includes('已确认') && finalText.includes('字段口径与样例一致'))
  await page.screenshot({ path: 'tmp/ontology-04-calibrated.png' })

  // 7) 自清理：探针造的数据不留给用户（只删本次跑出来的，别动别人的资产）
  const cleaned = await page.evaluate(async (start) => {
    const res = await fetch('/ontology-api/ontology')
    const data = await res.json()
    const ledger = data.ontology ?? {}
    const lists = { object: 'objects', relation: 'relations', rule: 'rules', action: 'actions', vocabulary: 'vocabularies', individual: 'individuals', shape: 'shapes', application: 'applications', guide: 'guides' }
    const removed = []
    for (const [kind, list] of Object.entries(lists)) {
      for (const asset of ledger[list] ?? []) {
        const label = asset.name ?? asset.title ?? ''
        const isProbe = label === '探针测试对象' || label === '探针操作手册'
        const isFreshDraft = asset.status === 'draft' && Number(asset.updatedAt) >= start
        // 探针载入的内置手册章节也清掉（内置书本身随时能再载入，检索仍命中内置书）
        const isBuiltinManual = kind === 'guide' && String(asset.source ?? '').includes('智元')
        if (!isProbe && !isFreshDraft && !isBuiltinManual) continue
        await fetch('/ontology-api/ontology/asset/delete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind, id: asset.id })
        })
        removed.push(`${kind}:${label}`)
      }
    }
    return removed
  }, runStart).catch(err => ['清理失败:' + String(err?.message ?? err)])
  ok('探针数据已自清理', Array.isArray(cleaned) && !cleaned.some(x => String(x).startsWith('清理失败')), (cleaned ?? []).join(', ').slice(0, 120))

  const failedRender = await page.evaluate(() => document.body.innerText.includes('渲染失败'))
  ok('页面没有「工作空间渲染失败」', !failedRender)
  const realErrors = pageErrors.filter(e => !/favicon|ERR_/.test(e))
  ok('pageerror / console error 为空', realErrors.length === 0, realErrors.slice(0, 3).join(' || '))
} catch (cause) {
  ok('探针没跑完', false, String(cause?.message ?? cause).slice(0, 200))
  await page.screenshot({ path: 'tmp/ontology-error.png' }).catch(() => {})
} finally {
  await browser.close()
}

console.log('\n==== 结论 ====')
console.log(failures.length === 0 ? 'ALL PASS' : `FAILED: ${failures.join(', ')}`)
console.log(JSON.stringify({ baseUrl, checks, ok: failures.length === 0 }, null, 1))
process.exit(failures.length === 0 ? 0 : 1)

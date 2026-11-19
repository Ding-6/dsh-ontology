#!/usr/bin/env node
/* 把仓库里的运行时文件同步到「活路径」，并把 profile 指过去。
 *
 *   node tools/sync-live.mjs                       # 同步 + 重指 junction + 改 profile 依赖
 *   node tools/sync-live.mjs --dry-run             # 只打印要做什么
 *   node tools/sync-live.mjs --target <dir>       # 指定活路径（默认 ../dsh-ontology-live）
 *   node tools/sync-live.mjs --profiles desktop,web
 *
 * 为什么需要它：DSH 宿主按**真实文件 URL** 缓存 ESM 模块（loadCache 的键不带 query）。
 * 在同一个路径上改文件，宿主不会重新 import —— 表现为「代码改了不生效」。
 * 换成一个新路径，宿主就会重新 import 新代码。
 *
 * 同步完还不一定立刻生效：bundle 的 include 树会缓存已加载的 entry。
 * 最省事的做法是**重启 DSH**；不想重启就按 AGENTS.md 的说法把 profile 的
 * `dsh.profile.bundles` 里那个包摘掉、等几秒、再加回去。
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..')

const argv = process.argv.slice(2)
const dryRun = argv.includes('--dry-run')
const flag = (name, fallback) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}
const target = resolve(flag('--target', join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'dsh-ontology-live')))
const profiles = flag('--profiles', 'desktop,web').split(',').map((s) => s.trim()).filter(Boolean)

/** 要同步的运行时文件（与 package.json 的 files 对齐，但不含文档与图片）。 */
const RUNTIME = ['index.js', 'client.js', 'cordis.patch.yml', 'package.json', 'icon.svg', 'locale', 'src', 'dist']

const home = process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME || '', '.dsh')
const PKG = '@ding-6/dsh-ontology'

function log(msg) { console.log(msg) }
function sh(cmd, args) {
  try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
  catch { return '' }
}

log(`仓库      ${REPO}`)
log(`活路径    ${target}`)
log(`profile   ${profiles.join(', ')}`)
if (dryRun) log('（dry-run：什么都不写）')

/* ── 1. 同步运行时文件 ───────────────────────────────────────────────── */
if (!dryRun) {
  mkdirSync(target, { recursive: true })
  for (const item of RUNTIME) {
    const from = join(REPO, item)
    if (!existsSync(from)) { log(`  跳过 ${item}（仓库里没有）`); continue }
    const to = join(target, item)
    rmSync(to, { recursive: true, force: true })
    cpSync(from, to, { recursive: true })
  }
  log(`已同步 ${RUNTIME.length} 项运行时文件 → ${target}`)
}

/* ── 2. 重指 profile 依赖与 junction ─────────────────────────────────── */
for (const name of profiles) {
  const dir = join(home, 'profiles', name)
  const pkgFile = join(dir, 'package.json')
  if (!existsSync(pkgFile)) { log(`  ${name}: 没有 ${pkgFile}，跳过`); continue }

  const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
  pkg.dependencies = pkg.dependencies ?? {}
  pkg.dependencies[PKG] = `link:${target}`
  pkg.dsh = pkg.dsh ?? {}
  pkg.dsh.profile = pkg.dsh.profile ?? {}
  pkg.dsh.profile.bundles = pkg.dsh.profile.bundles ?? []
  if (!pkg.dsh.profile.bundles.includes(PKG)) pkg.dsh.profile.bundles.push(PKG)
  if (!dryRun) writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')

  const link = join(dir, 'node_modules', ...PKG.split('/'))
  if (!dryRun) {
    mkdirSync(dirname(link), { recursive: true })
    rmSync(link, { recursive: true, force: true })
    const made = sh('cmd', ['/c', 'mklink', '/J', link, target])
    if (!made) log(`  ${name}: mklink 失败，profile 依赖已更新但 junction 没建`)
  }
  log(`  ${name}: 依赖 → link:${target}，bundles 已包含 ${PKG}`)
}

log('')
log('下一步：重启 DSH（最省事）。不想重启就按 AGENTS.md 的说法把 profile 的')
log(`dsh.profile.bundles 里 "${PKG}" 摘掉 → 等 4 秒 → 再加回去 → 等 5 秒。`)
log('（宿主按真实文件 URL 缓存 ESM 模块：不换路径、不释放 include 树，就还是旧代码。）')

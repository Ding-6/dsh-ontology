/**
 * 文件路径与命名规则的纯函数：宿主半边只管装配，这些路径算子单独放一份。
 *
 * 从 index.js 拆出来，是为了宿主入口只留「台账 / 技能库 / HTTP 面」的装配代码。
 */
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

/** DSH home, honouring DSH_HOME. */
export function dshHomePath(...segments) {
  const override = process.env.DSH_HOME
  const home = resolve(override !== undefined && override.length > 0 ? override : join(homedir(), '.dsh'))
  return join(home, ...segments)
}

/**
 * 数据文件改名后的兼容：新文件不存在、旧文件还在 → 继续读旧文件（改名不丢数据）。
 * @param {string} next - 新文件名，如 dsh-ontology.db
 * @param {string} legacy - 旧文件名，如 dsh-studio.db
 */
export function dataPath(next, legacy) {
  const fresh = dshHomePath(next)
  if (existsSync(fresh)) return fresh
  const old = dshHomePath(legacy)
  return existsSync(old) ? old : fresh
}

/**
 * Where the agent runtime looks for skills: `<DSH_HOME>/skills/<name>/SKILL.md`.
 * Writing here makes a skill real — every agent's `skill` tool can load it,
 * which is what turns this panel from a text box into a working capability.
 */
export function skillsRoot() {
  return dshHomePath('skills')
}

/** The skill-name grammar the DSH registry validates against (kebab-case). */
export function isSkillName(value) {
  const name = String(value ?? '')
  return name.length > 0 && name.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)
}

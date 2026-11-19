// 卡在列之间的轨迹：走过哪些列、倒退过几次、每列待了多久。
// 纯函数，供效能页与质量口径共用（两处数字必须能对上）。

import { STATUS_IDS } from './domain.js'

/**
 * 旧列名 → 新列名。v0.7.0 把四角色八列改成七角色八列，历史数据里的旧列 id
 * 在迁移前也可能流进来（老会话、旧快照、导出的台账），统一折算成新列再比较。
 */
export const LEGACY_STATUS_ALIAS = {
  dev_ready: 'data',
  dev: 'model',
  review: 'backend',
  accept: 'frontend',
}

/** 列的推进序号；不认识返回 -1。 */
export function statusRank(status) {
  const id = String(status ?? '')
  const mapped = LEGACY_STATUS_ALIAS[id] ?? id
  const index = STATUS_IDS.indexOf(mapped)
  return index < 0 ? -1 : index
}

/** 把一张卡的历史折成「走过哪些列、倒退过几次、每列待了多久」。 */
export function taskTimeline(task) {
  const history = Array.isArray(task.history) ? task.history : []
  const steps = []
  for (const entry of history) {
    const raw = String(entry?.status ?? '')
    if (raw === '') continue
    const status = LEGACY_STATUS_ALIAS[raw] ?? raw
    if (!STATUS_IDS.includes(status)) continue
    if (steps.length > 0 && steps[steps.length - 1].status === status) {
      // 同一列重复记录（比如阻塞/解除）合并，但保留最后一次时间
      steps[steps.length - 1].at = Number(entry.at) || steps[steps.length - 1].at
      continue
    }
    steps.push({ status, at: Number(entry.at) || 0, by: String(entry?.by ?? ''), note: String(entry?.note ?? '') })
  }
  if (steps.length === 0) {
    steps.push({ status: task.status, at: Number(task.createdAt) || 0, by: '', note: '' })
  }
  const rank = status => statusRank(status)
  let backward = 0
  let reviewBack = 0
  let testBack = 0
  const dwell = {}
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]
    const next = steps[index + 1]
    const until = next === undefined ? Date.now() : next.at
    const span = Math.max(0, until - step.at)
    dwell[step.status] = (dwell[step.status] ?? 0) + span
    if (next === undefined) continue
    if (rank(next.status) < rank(step.status)) {
      backward += 1
      if (step.status === 'backend') reviewBack += 1
      if (step.status === 'test' || step.status === 'frontend') testBack += 1
    }
  }
  const doneStep = steps.find(step => step.status === 'done')
  return {
    steps,
    backward,
    reviewBack,
    testBack,
    dwell,
    doneAt: doneStep === undefined ? 0 : doneStep.at,
    columns: steps.length,
  }
}

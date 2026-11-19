/**
 * 本体语义层路由：台账读写、多本体管理、专家校准、建模建议、应用蓝图、平台手册、服务封装。
 *
 * 语义层是「统一语义层」的事实源：数据层（对象 / 关系 / 实例 / 术语）、逻辑层（规则 / 校验形状）、
 * 行动层（行动 / 应用）。宿主能力由 configureOntologyRoutes() 注入，不反向依赖 index.js。
 */
import {
  emptyOntology,
  ontologyCoverage,
  ontologyGate,
  ontologyMcpTools,
  ontologyOf,
  ontologyReview,
  ontologySdkSnippet,
  ontologyStats,
  removeOntologyAsset,
  removeOntologyContainer,
  reviewOntologyAsset,
  sanitizeOntology,
  upsertOntologyAsset,
  upsertOntologyContainer,
} from '../ontology.js'
import { ontologyBlueprint } from '../ontology-blueprint.js'
import { applyGuideBook, GUIDE_BOOK, searchGuideBook } from '../ontology-guide-book.js'
import { applyOntologyTemplate, ONTOLOGY_TEMPLATES } from '../ontology-templates.js'
import { buildPlan, planSummary, planToCards } from '../planner.js'
import { BUILTIN_SKILLS } from '../ontology-skills.js'

const INJECTED = ['sendJson', 'readJsonBody', 'publicState', 'createTask', 'saveRequirement', 'saveSkill', 'hasSkill']

let host = {
  sendJson: () => {},
  readJsonBody: async () => ({}),
  publicState: () => ({}),
  createTask: async () => undefined,
  saveRequirement: async () => undefined,
  saveSkill: async () => undefined,
  hasSkill: () => false,
}

/** 注入宿主能力。 */
export function configureOntologyRoutes(services) {
  host = { ...host, ...(services ?? {}) }
}

function current(store) {
  const state = store.snapshot()
  return sanitizeOntology(state.ontology ?? emptyOntology())
}

function withMeta(store, ontology) {
  const review = ontologyReview(ontology)
  return {
    ok: true,
    ontology,
    stats: ontologyStats(ontology),
    coverage: ontologyCoverage(ontology),
    gate: ontologyGate(store.snapshot().config, ontology),
    review,
    templates: ONTOLOGY_TEMPLATES.map(item => ({ id: item.id, name: item.name, domain: item.domain, description: item.description })),
  }
}

/**
 * 手册检索：同时搜「已入库的手册」与「内置手册书」，
 * 命中项带 origin 标记（library=已入库 / builtin=内置书 / library+builtin=两者都有）。
 */
function guideSearch(ontology, query) {
  return searchGuideBook(ontology, query)
}

/**
 * 本体语义层路由。返回 true 表示已处理。
 */
export async function handleOntologyRoute({ method, route, req, res, store, url }) {
  if (route === '/ontology' && method === 'GET') {
    host.sendJson(res, 200, withMeta(store, current(store)))
    return true
  }

  if (route === '/ontology/export' && method === 'GET') {
    const ontology = current(store)
    const scope = url?.searchParams?.get('ontologyId') ?? ''
    const stamp = new Date().toISOString().slice(0, 10)
    const payload = scope ? ontologyOf(ontology, scope) : ontology
    host.sendJson(res, 200, { ok: true, filename: `ontology-${stamp}.json`, ontology: payload })
    return true
  }

  if (route === '/ontology/service' && method === 'POST') {
    const body = await host.readJsonBody(req)
    const scope = String(body.ontologyId ?? '')
    const ontology = scope ? ontologyOf(current(store), scope) : current(store)
    const packaging = String(body.packaging ?? 'object')
    const protocol = String(body.protocol ?? 'mcp')
    if (protocol === 'sdk') {
      host.sendJson(res, 200, { ok: true, protocol, packaging, snippet: ontologySdkSnippet(ontology, packaging) })
      return true
    }
    host.sendJson(res, 200, { ok: true, protocol, packaging, tools: ontologyMcpTools(ontology, packaging) })
    return true
  }

  if (route === '/ontology/templates' && method === 'GET') {
    host.sendJson(res, 200, { ok: true, templates: ONTOLOGY_TEMPLATES })
    return true
  }

  if (route === '/ontology/guide/book' && method === 'GET') {
    // 内置手册书：随插件分发，用户不需要导入就能检索（副驾照原文教操作）。
    const sections = GUIDE_BOOK.guides.map(item => ({
      id: item.id,
      section: item.section,
      title: item.title,
      tags: item.tags,
      excerpt: item.body.slice(0, 160).replace(/\s+/g, ' '),
    }))
    host.sendJson(res, 200, {
      ok: true,
      book: {
        id: GUIDE_BOOK.id,
        title: GUIDE_BOOK.title,
        version: GUIDE_BOOK.version,
        source: GUIDE_BOOK.source,
        docs: GUIDE_BOOK.docs,
        count: sections.length,
      },
      sections,
    })
    return true
  }

  if (route === '/ontology/plan' && method === 'POST') {
    // 规划器：一句业务描述 → 阶段计划 + 每步规范 + 验收标准 + 初定版本。
    const body = await host.readJsonBody(req)
    const plan = buildPlan({
      title: body.title,
      business: body.business,
      domain: body.domain,
      templateId: body.templateId,
    })
    const summary = planSummary(plan)
    if (body.apply !== true) {
      host.sendJson(res, 200, { ok: true, plan, summary })
      return true
    }
    const requirement = await host.saveRequirement(store, {
      title: plan.title,
      description: summary,
      domain: plan.domain,
      status: 'active',
      by: String(body.by ?? '规划器'),
    })
    const cards = []
    for (const card of planToCards(plan)) {
      const task = await host.createTask(store, {
        title: card.title,
        type: card.type,
        requirement: card.requirement,
        role: card.role,
        status: card.column,
        requirementId: requirement?.id ?? '',
        checklist: card.checklist,
        domain: plan.domain,
      })
      if (task !== undefined) cards.push(task)
    }
    host.sendJson(res, 200, {
      ok: true,
      plan,
      summary,
      requirement: { id: requirement?.id ?? '', code: requirement?.code ?? '', title: requirement?.title ?? plan.title },
      cards: cards.map(task => ({ id: task.id, code: task.code, title: task.title, status: task.status, role: task.role })),
    })
    return true
  }

  if (route === '/ontology/skills/builtin' && method === 'POST') {
    // 内置规范技能：每一步该守的规范，装进技能库后各角色 agent 可以直接加载。
    const body = await host.readJsonBody(req)
    const picked = String(body.name ?? '').trim()
    const list = BUILTIN_SKILLS.filter(item => picked === '' || item.name === picked)
    if (list.length === 0) {
      host.sendJson(res, 404, { ok: false, error: `没有叫「${picked}」的内置技能` })
      return true
    }
    let created = 0
    for (const item of list) {
      if (host.hasSkill(item.name) === true) continue
      await host.saveSkill({
        name: item.name,
        description: item.description,
        content: item.content,
        whenToUse: item.whenToUse ?? '',
        tags: item.tags ?? [],
      })
      created += 1
    }
    host.sendJson(res, 200, { ok: true, created, total: list.length, skills: list.map(item => ({ name: item.name, description: item.description })) })
    return true
  }

  if (route === '/ontology/skills/builtin' && method === 'GET') {
    host.sendJson(res, 200, {
      ok: true,
      skills: BUILTIN_SKILLS.map(item => ({
        name: item.name,
        description: item.description,
        whenToUse: item.whenToUse ?? '',
        tags: item.tags ?? [],
        installed: host.hasSkill(item.name),
      })),
    })
    return true
  }

  if (method !== 'POST') return false

  if (route === '/ontology/asset') {
    const body = await host.readJsonBody(req)
    const kind = String(body.kind ?? 'object')
    const by = String(body.by ?? '')
    const ontology = upsertOntologyAsset(current(store), kind, body.asset ?? body, by)
    await store.mutate(state => {
      state.ontology = ontology
    })
    host.sendJson(res, 200, withMeta(store, ontology))
    return true
  }

  if (route === '/ontology/asset/delete') {
    const body = await host.readJsonBody(req)
    const kind = String(body.kind ?? 'object')
    const id = String(body.id ?? '')
    const { ontology, removed } = removeOntologyAsset(current(store), kind, id)
    if (removed === 0) {
      host.sendJson(res, 404, { ok: false, error: `没有找到要删除的${kind === 'object' ? '对象' : '资产'}` })
      return true
    }
    await store.mutate(state => {
      state.ontology = ontology
    })
    host.sendJson(res, 200, withMeta(store, ontology))
    return true
  }

  if (route === '/ontology/review') {
    const body = await host.readJsonBody(req)
    const kind = String(body.kind ?? 'object')
    const id = String(body.id ?? '')
    const decision = String(body.decision ?? 'approved')
    const note = String(body.note ?? '')
    const by = String(body.by ?? '')
    const { ontology, found } = reviewOntologyAsset(current(store), kind, id, decision, note, by)
    if (!found) {
      host.sendJson(res, 404, { ok: false, error: '没有找到要校准的资产' })
      return true
    }
    await store.mutate(state => {
      state.ontology = ontology
    })
    host.sendJson(res, 200, withMeta(store, ontology))
    return true
  }

  if (route === '/ontology/container') {
    const body = await host.readJsonBody(req)
    const ontology = upsertOntologyContainer(current(store), body.container ?? body)
    await store.mutate(state => {
      state.ontology = ontology
    })
    host.sendJson(res, 200, withMeta(store, ontology))
    return true
  }

  if (route === '/ontology/container/delete') {
    const body = await host.readJsonBody(req)
    const id = String(body.id ?? '')
    const { ontology, removed } = removeOntologyContainer(current(store), id)
    if (removed === 0) {
      host.sendJson(res, 404, { ok: false, error: '没有找到要删除的本体，或默认本体不可删除' })
      return true
    }
    await store.mutate(state => {
      state.ontology = ontology
    })
    host.sendJson(res, 200, withMeta(store, ontology))
    return true
  }

  if (route === '/ontology/blueprint') {
    const body = await host.readJsonBody(req)
    const ontology = current(store)
    const blueprint = ontologyBlueprint(ontology, {
      ontologyId: String(body.ontologyId ?? ''),
      sections: Array.isArray(body.sections) ? body.sections : undefined,
    })
    host.sendJson(res, 200, { ok: true, blueprint: blueprint.json, markdown: blueprint.markdown })
    return true
  }

  if (route === '/ontology/guide') {
    const body = await host.readJsonBody(req)
    const ontology = current(store)
    const guide = body.guide ?? body
    const next = upsertOntologyAsset(ontology, 'guide', guide, String(body.by ?? ''))
    await store.mutate(state => {
      state.ontology = next
    })
    host.sendJson(res, 200, withMeta(store, next))
    return true
  }

  if (route === '/ontology/guide/delete') {
    const body = await host.readJsonBody(req)
    const { ontology, removed } = removeOntologyAsset(current(store), 'guide', String(body.id ?? ''))
    if (removed === 0) {
      host.sendJson(res, 404, { ok: false, error: '没有找到要删除的手册' })
      return true
    }
    await store.mutate(state => {
      state.ontology = ontology
    })
    host.sendJson(res, 200, withMeta(store, ontology))
    return true
  }

  if (route === '/ontology/guide/search') {
    const body = await host.readJsonBody(req)
    const ontology = current(store)
    const hits = guideSearch(ontology, body.query ?? '')
    host.sendJson(res, 200, { ok: true, hits })
    return true
  }

  if (route === '/ontology/guide/book') {
    const body = await host.readJsonBody(req)
    const result = applyGuideBook(current(store), String(body.by ?? '副驾手册库'))
    await store.mutate(state => {
      state.ontology = result.ontology
    })
    host.sendJson(res, 200, {
      ...withMeta(store, result.ontology),
      created: result.created,
      total: result.total,
      book: { id: GUIDE_BOOK.id, title: GUIDE_BOOK.title, version: GUIDE_BOOK.version, count: GUIDE_BOOK.guides.length },
    })
    return true
  }

  if (route === '/ontology/template') {
    const body = await host.readJsonBody(req)
    const templateId = String(body.templateId ?? '')
    const result = applyOntologyTemplate(current(store), templateId, String(body.by ?? ''), String(body.ontologyId ?? ''))
    if (!result.ok) {
      host.sendJson(res, 404, { ok: false, error: `没有找到模板「${templateId}」` })
      return true
    }
    await store.mutate(state => {
      state.ontology = result.ontology
    })
    host.sendJson(res, 200, withMeta(store, result.ontology))
    return true
  }

  if (route === '/ontology/import') {
    const body = await host.readJsonBody(req)
    const raw = body.ontology ?? body
    const ontology = sanitizeOntology(raw)
    await store.mutate(state => {
      state.ontology = ontology
    })
    host.sendJson(res, 200, withMeta(store, ontology))
    return true
  }

  return false
}

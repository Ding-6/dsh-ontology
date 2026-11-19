/* 语义层页签：统一语义层的台账视图（与行业无关的建模原语）。
 *
 * 这是「本体开发」的主界面：
 *   - 多本体容器：不同业务可以各建一个本体，互不污染；
 *   - 三层八类资产：数据层（对象/实例/术语/关系）、逻辑层（规则/校验形状）、行动层（行动/应用）；
 *   - 建模建议器：机器先给 blocker/warn/info 清单，专家再校准；
 *   - 应用蓝图：把语义层翻译成数据模型 / 规则引擎 / API 契约 / 前端设计 / 本体驱动 / 测试方案；
 *   - 领域骨架模板：没有行业数据，只有可编辑的结构起点；
 *   - 平台操作手册库：用户后续提供手册，专家照手册教操作。
 * 口径与 src/host/ontology.js 一一对应。 */

import { client } from '../context.js'
import {
  ONTOLOGY_ACTION_KIND_LABEL,
  ONTOLOGY_ATTRIBUTE_TYPE_LABEL,
  ONTOLOGY_BLUEPRINT_SECTIONS,
  ONTOLOGY_CARDINALITIES,
  ONTOLOGY_EXPRESSION_LANGUAGE_LABEL,
  ONTOLOGY_FINDING_LEVEL_LABEL,
  ONTOLOGY_KIND_LABEL,
  ONTOLOGY_LAYERS,
  ONTOLOGY_PACKAGINGS,
  ONTOLOGY_PROTOCOLS,
  ONTOLOGY_RULE_TYPE_LABEL,
  ONTOLOGY_SHAPE_OPERATOR_LABEL,
  ONTOLOGY_SOURCE_LABEL,
  ONTOLOGY_STATUS_LABEL,
} from '../labels.js'

const KIND_LIST = {
  object: 'objects',
  relation: 'relations',
  rule: 'rules',
  action: 'actions',
  vocabulary: 'vocabularies',
  individual: 'individuals',
  shape: 'shapes',
  application: 'applications',
}

const ALL_KINDS = ['object', 'relation', 'rule', 'action', 'vocabulary', 'individual', 'shape', 'application']

export function OntologyPage({ state }) {
  const { h, React, api, toast, confirmDialog, promptDialog, TextField, SelectField, ChipField } = client()
  const [data, setData] = React.useState(null)
  const [layer, setLayer] = React.useState('data')
  const [kind, setKind] = React.useState('object')
  const [scope, setScope] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [error, setError] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [notice, setNotice] = React.useState('')
  const [packaging, setPackaging] = React.useState('object')
  const [protocol, setProtocol] = React.useState('mcp')
  const [service, setService] = React.useState(null)
  const [blueprintSections, setBlueprintSections] = React.useState(ONTOLOGY_BLUEPRINT_SECTIONS.map(item => item.id))
  const [blueprint, setBlueprint] = React.useState(null)
  const [guideQuery, setGuideQuery] = React.useState('')
  const [guideHits, setGuideHits] = React.useState(null)
  const [guideForm, setGuideForm] = React.useState({ title: '', source: '', body: '' })
  const [guideBook, setGuideBook] = React.useState(null)
  const [guideSections, setGuideSections] = React.useState(false)
  const [containerForm, setContainerForm] = React.useState({ name: '', description: '', namespace: '' })
  const [form, setForm] = React.useState({
    kind: 'object', name: '', code: '', domain: '', description: '', attributes: '',
    from: '', to: '', cardinality: '1-N', type: 'constraint', expression: '', scope: '', language: 'natural',
    actionKind: 'command', target: '', params: '', result: '',
    classRef: '', targetClass: '', severity: 'violation', term: '', label: '', purpose: '', actors: '',
  })

  const refresh = React.useCallback(async () => {
    try {
      const out = await api('/ontology')
      setData(out)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [])

  React.useEffect(() => { void refresh() }, [refresh, state.revision])

  const ontology = data?.ontology ?? { objects: [], relations: [], rules: [], actions: [], vocabularies: [], individuals: [], shapes: [], applications: [], services: [], guides: [], ontologies: [] }
  const stats = data?.stats ?? { objects: 0, attributes: 0, relations: 0, rules: 0, actions: 0, approved: 0, drafts: 0 }
  const coverage = data?.coverage ?? { objectWithoutAttribute: [], danglingRelations: [], rulesWithoutExpression: [], actionsWithoutTarget: [], issues: 0 }
  const gate = data?.gate ?? { needed: false, ready: false, blockers: [] }
  const review = data?.review ?? { findings: [], counts: {}, levels: {} }
  const templates = data?.templates ?? []
  const containers = ontology.ontologies ?? []

  const listOf = React.useCallback(one => {
    const items = ontology[KIND_LIST[one] ?? ''] ?? []
    if (scope === '') return items
    return items.filter(item => (item.ontologyId ?? '') === scope)
  }, [ontology, scope])

  const rows = React.useMemo(() => {
    const text = query.trim().toLowerCase()
    return listOf(kind).filter(item => {
      if (text === '') return true
      const haystack = `${item.name} ${item.code ?? ''} ${item.description ?? ''} ${item.domain ?? ''} ${item.expression ?? ''} ${item.target ?? ''} ${item.term ?? ''} ${item.classRef ?? ''} ${item.purpose ?? ''}`.toLowerCase()
      return haystack.includes(text)
    })
  }, [listOf, kind, query])

  async function act(path, body, okText) {
    setBusy(true)
    try {
      const out = await api(path, body)
      if (out.ontology !== undefined) setData(out)
      else await refresh()
      setError(null)
      if (okText !== '') toast(okText)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      toast(cause instanceof Error ? cause.message : String(cause), 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function reviewAsset(one, asset, decision) {
    const label = decision === 'approved' ? '通过' : '废弃'
    const note = await promptDialog(`${label}「${asset.name}」的校准结论（会记进资产台账）`, {
      title: `专家校准 · ${label}`,
      okText: label,
      placeholder: decision === 'approved' ? '为什么通过？改了哪里？' : '为什么不成立？',
    })
    if (note === null) return
    if (String(note).trim() === '') { setNotice('校准要写一句结论'); return }
    await act('/ontology/review', { kind: one, id: asset.id, decision, note: String(note).trim(), by: '人' }, `已${label}「${asset.name}」`)
  }

  async function remove(one, asset) {
    const ok = await confirmDialog(`删除${ONTOLOGY_KIND_LABEL[one] ?? '资产'}「${asset.name}」？相关关系会变成悬挂。`, { title: '删除语义资产', danger: true, okText: '删除' })
    if (ok !== true) return
    await act('/ontology/asset/delete', { kind: one, id: asset.id }, `已删除「${asset.name}」`)
  }

  async function exportJson() {
    try {
      const out = await api(`/ontology/export${scope === '' ? '' : `?ontologyId=${encodeURIComponent(scope)}`}`)
      const blob = new Blob([JSON.stringify(out.ontology, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = out.filename ?? 'ontology.json'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast('本体台账已导出')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  async function generateService() {
    setBusy(true)
    try {
      const out = await api('/ontology/service', { packaging, protocol, ontologyId: scope })
      setService(out)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  async function generateBlueprint() {
    setBusy(true)
    try {
      const out = await api('/ontology/blueprint', { ontologyId: scope, sections: blueprintSections })
      setBlueprint(out)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  async function applyTemplate(templateId) {
    const template = templates.find(item => item.id === templateId)
    const ok = await confirmDialog(`用「${template?.name ?? templateId}」骨架生成一批 AI 草稿资产？骨架只给结构，不含行业业务数据。`, { title: '实例化骨架模板', okText: '生成' })
    if (ok !== true) return
    await act('/ontology/template', { templateId, ontologyId: scope, by: '人' }, '骨架已实例化成 AI 草稿')
  }

  async function searchGuides() {
    setBusy(true)
    try {
      const out = await api('/ontology/guide/search', { query: guideQuery })
      setGuideHits(out.hits ?? [])
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  async function saveGuide() {
    const title = guideForm.title.trim()
    if (title === '') { setNotice('先给手册起个标题'); return }
    const ok = await act('/ontology/guide', { ...guideForm, title, tags: [], by: '人' }, '手册已入库')
    if (ok) setGuideForm({ title: '', source: '', body: '' })
  }

  // 内置手册书（平台操作手册）：先看元信息，用户点「载入」才进自己的手册库。
  const loadGuideBook = React.useCallback(async () => {
    try {
      const out = await api('/ontology/guide/book')
      setGuideBook({ ...(out.book ?? {}), sections: out.sections ?? [] })
    } catch {
      setGuideBook(null)
    }
  }, [])

  React.useEffect(() => { void loadGuideBook() }, [loadGuideBook])

  async function ingestGuideBook() {
    setBusy(true)
    try {
      const out = await api('/ontology/guide/book', { by: '人' })
      if (out.ontology !== undefined) setData(out)
      else await refresh()
      setError(null)
      toast(`已载入内置手册 ${out.created ?? 0} 篇（手册库共 ${out.total ?? 0} 篇）`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      toast(cause instanceof Error ? cause.message : String(cause), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function createContainer() {
    const name = containerForm.name.trim()
    if (name === '') { setNotice('先给本体起个名字'); return }
    const ok = await act('/ontology/container', { name, description: containerForm.description.trim(), namespace: containerForm.namespace.trim(), by: '人' }, `已新建本体「${name}」`)
    if (ok) {
      setContainerForm({ name: '', description: '', namespace: '' })
      setScope('')
    }
  }

  function register() {
    const name = form.name.trim()
    if (name === '') { setNotice('先给资产起个名字'); return }
    const asset = { name, description: form.description.trim(), ontologyId: scope }
    if (form.kind === 'object') {
      asset.code = form.code.trim()
      asset.domain = form.domain.trim()
      asset.attributes = form.attributes.split(/[,，;；]/).map(part => part.trim()).filter(part => part !== '').map(part => {
        const [attrName, attrType] = part.split(/[:：]/)
        return { name: String(attrName ?? '').trim(), type: String(attrType ?? 'string').trim() || 'string', required: false }
      })
    } else if (form.kind === 'relation') {
      asset.from = form.from.trim()
      asset.to = form.to.trim()
      asset.cardinality = form.cardinality
    } else if (form.kind === 'rule') {
      asset.type = form.type
      asset.expression = form.expression.trim()
      asset.scope = form.scope.trim()
      asset.expressionLanguage = form.language
    } else if (form.kind === 'action') {
      asset.type = form.actionKind
      asset.target = form.target.trim()
      asset.params = form.params.split(/[,，;；]/).map(part => part.trim()).filter(part => part !== '').map(part => ({ name: part, type: 'string', required: false }))
      asset.result = form.result.trim()
    } else if (form.kind === 'vocabulary') {
      asset.term = form.term.trim() === '' ? name : form.term.trim()
      asset.concepts = [{ term: asset.term, label: form.label.trim() === '' ? name : form.label.trim(), definition: form.description.trim() }]
    } else if (form.kind === 'individual') {
      asset.classRef = form.classRef.trim()
    } else if (form.kind === 'shape') {
      asset.targetClass = form.targetClass.trim()
      asset.severity = form.severity
    } else {
      asset.purpose = form.purpose.trim() === '' ? form.description.trim() : form.purpose.trim()
      asset.actors = form.actors.split(/[,，;；]/).map(part => part.trim()).filter(part => part !== '')
    }
    void act('/ontology/asset', { kind: form.kind, ...asset, by: '人' }, `已登记${ONTOLOGY_KIND_LABEL[form.kind] ?? '资产'}「${asset.name}」`).then(ok => {
      if (ok) setForm(previous => ({ ...previous, name: '', code: '', description: '', attributes: '', expression: '', from: '', to: '', target: '', params: '', result: '', term: '', label: '', classRef: '', targetClass: '', purpose: '', actors: '' }))
    })
  }

  const statBox = (value, label, warn) => h('div', { className: 'ds-stat-box' },
    h('b', { 'data-warn': warn === true ? '1' : '0' }, String(value)),
    h('span', {}, label))

  function assetRow(one, item) {
    const status = ONTOLOGY_STATUS_LABEL[item.status] ?? item.status
    const source = ONTOLOGY_SOURCE_LABEL[item.source] ?? item.source
    let detail = item.description ?? ''
    if (one === 'object') {
      detail = `${item.domain === '' ? '' : `［${item.domain}］`}${(item.attributes ?? []).map(attr => `${attr.name}${attr.required ? '*' : ''}:${ONTOLOGY_ATTRIBUTE_TYPE_LABEL[attr.type] ?? attr.type}`).join('、')}`
    } else if (one === 'relation') {
      detail = `${item.from} → ${item.to}｜${item.cardinality}`
    } else if (one === 'rule') {
      detail = `${ONTOLOGY_RULE_TYPE_LABEL[item.type] ?? item.type}${item.scope === '' ? '' : `［${item.scope}］`}｜${item.expression}`
    } else if (one === 'action') {
      detail = `${ONTOLOGY_ACTION_KIND_LABEL[item.type] ?? item.type}｜${item.target === '' ? '（没有目标系统）' : item.target}${(item.params ?? []).length === 0 ? '' : `｜入参 ${item.params.map(p => p.name).join('、')}`}`
    } else if (one === 'vocabulary') {
      detail = `${item.term ?? ''}${(item.concepts ?? []).length === 0 ? '' : `｜概念 ${item.concepts.length} 个`}`
    } else if (one === 'individual') {
      detail = `实例属于：${item.classRef === '' ? '（未指定类）' : item.classRef}`
    } else if (one === 'shape') {
      detail = `约束 ${item.targetClass === '' ? '（未指定目标类）' : item.targetClass}｜${(item.constraints ?? []).length} 条`
    } else if (one === 'application') {
      detail = `${item.purpose ?? ''}${(item.actors ?? []).length === 0 ? '' : `｜参与者 ${item.actors.join('、')}`}`
    }
    return h('div', { key: item.id, className: 'ds-listrow' },
      h('div', { className: 'ds-listrow-main' },
        h('div', null,
          item.name,
          h(ChipField, { className: 'ds-chip', 'data-on': item.status === 'approved' ? '1' : '0', style: { marginLeft: 8 } }, status),
          h(ChipField, { className: 'ds-chip', style: { marginLeft: 4 } }, source),
          scope === '' && (item.ontologyId ?? '') !== ''
            ? h(ChipField, { className: 'ds-chip', style: { marginLeft: 4 } }, containers.find(one2 => one2.id === item.ontologyId)?.name ?? item.ontologyId)
            : null,
        ),
        h('div', { className: 'ds-hint' }, detail === '' ? '（没写说明）' : detail),
        item.calibration !== undefined && item.calibration !== null && item.calibration.note !== ''
          ? h('div', { className: 'ds-hint' }, `校准：${item.calibration.note}（${item.calibration.by ?? ''}）`)
          : null,
      ),
      h('div', { className: 'ds-listrow-actions' },
        item.status === 'draft'
          ? h('button', { className: 'ds-btn', disabled: busy, onClick: () => void reviewAsset(one, item, 'approved') }, '通过')
          : null,
        item.status !== 'deprecated'
          ? h('button', { className: 'ds-btn ds-btn-ghost', disabled: busy, onClick: () => void reviewAsset(one, item, 'deprecated') }, '废弃')
          : null,
        h('button', { className: 'ds-btn ds-btn-ghost', 'data-danger': '1', disabled: busy, onClick: () => void remove(one, item) }, '删除'),
      ),
    )
  }

  const gapLines = [
    ...coverage.objectWithoutAttribute.map(name => `对象「${name}」没有任何属性`),
    ...coverage.danglingRelations.map(item => `关系「${item.name}」指向了不存在的对象`),
    ...coverage.rulesWithoutExpression.map(item => `规则「${item.name}」没有可判定的表达式`),
    ...coverage.actionsWithoutTarget.map(item => `行动「${item.name}」没有目标系统`),
  ]

  const findings = review.findings ?? []
  const formKind = form.kind
  const setField = (key, value) => setForm(previous => ({ ...previous, [key]: value }))
  const layerKinds = ONTOLOGY_LAYERS.find(item => item.id === layer)?.kinds ?? ['object']

  return h('div', { className: 'ds-body' },
    h('div', { className: 'ds-req-stats' },
      statBox(stats.objects, '业务对象'),
      statBox(stats.attributes, '属性'),
      statBox(stats.relations, '对象关系'),
      statBox(stats.rules, '业务规则'),
      statBox(stats.actions, '可调用行动'),
      statBox(stats.approved, '已确认', stats.approved === 0),
      statBox(stats.drafts, 'AI 草稿', stats.drafts > 0),
    ),
    gate.ready === true
      ? h('div', { className: 'ds-hint' }, '语义层可以对外提供能力：缺口已清零，草稿已校准。')
      : (gate.blockers ?? []).map((line, index) => h('div', { key: `gate${index}`, className: 'ds-error' }, `⛔ ${line}`)),
    error === null ? null : h('div', { className: 'ds-error' }, error),
    notice === '' ? null : h('div', { className: 'ds-hint' }, notice),
    h('div', { className: 'ds-action-bar' },
      h('div', { className: 'ds-action-bar-left' },
        ONTOLOGY_LAYERS.map(item => h('button', {
          key: item.id,
          className: 'ds-btn',
          'data-on': layer === item.id ? '1' : '0',
          title: item.hint,
          onClick: () => { setLayer(item.id); setKind(item.kinds[0]) },
        }, item.label)),
        h(TextField, {
          className: 'ds-input', style: { flex: '0 0 220px' }, value: query,
          placeholder: '搜对象 / 关系 / 规则 / 行动',
          onChange: event => setQuery(event.target.value),
        }),
      ),
      h('div', { className: 'ds-action-bar-right' },
        h('button', { className: 'ds-btn ds-btn-ghost', disabled: busy, onClick: () => void exportJson() }, '导出 JSON'),
        h('button', { className: 'ds-btn', disabled: busy, onClick: () => void refresh() }, '刷新'),
      ),
    ),
    h('div', { className: 'ds-panel', style: { marginTop: 12 } },
      h('div', { className: 'ds-panel-head' }, '本体（可多本体并存）',
        h('span', { className: 'ds-hint' }, '不同业务各建一个本体；服务封装与蓝图按当前本体生成')),
      h('div', { className: 'ds-panel-body' },
        h('div', { className: 'ds-row', style: { gap: 8, flexWrap: 'wrap' } },
          h('button', { className: 'ds-btn', 'data-on': scope === '' ? '1' : '0', onClick: () => setScope('') }, '全部本体'),
          containers.map(item => h('button', {
            key: item.id,
            className: 'ds-btn',
            'data-on': scope === item.id ? '1' : '0',
            title: item.description ?? '',
            onClick: () => setScope(item.id),
          }, item.name)),
        ),
        h('div', { className: 'ds-row', style: { gap: 8, marginTop: 8, flexWrap: 'wrap' } },
          h(TextField, { className: 'ds-input', style: { flex: '0 0 180px' }, value: containerForm.name, placeholder: '新本体名称', onChange: event => setContainerForm(previous => ({ ...previous, name: event.target.value })) }),
          h(TextField, { className: 'ds-input', style: { flex: '1 1 220px' }, value: containerForm.description, placeholder: '这个本体管什么', onChange: event => setContainerForm(previous => ({ ...previous, description: event.target.value })) }),
          h(TextField, { className: 'ds-input', style: { flex: '0 0 180px' }, value: containerForm.namespace, placeholder: '命名空间（可选）', onChange: event => setContainerForm(previous => ({ ...previous, namespace: event.target.value })) }),
          h('button', { className: 'ds-btn ds-btn-primary', disabled: busy, onClick: () => void createContainer() }, '新建本体'),
        ),
      ),
    ),
    h('div', { className: 'ds-panel', style: { marginTop: 12 } },
      h('div', { className: 'ds-panel-head' }, '建模建议（机器先看一遍）',
        h('span', { className: 'ds-hint' }, `${findings.length} 条：${review.counts?.blocker ?? 0} 阻塞 / ${review.counts?.warn ?? 0} 待改进 / ${review.counts?.info ?? 0} 提示`)),
      h('div', { className: 'ds-panel-body' },
        findings.length === 0
          ? h('div', { className: 'ds-empty' }, '没有发现结构问题：语义层自洽。')
          : findings.map(item => h('div', { key: item.id, className: 'ds-listrow' },
            h('div', { className: 'ds-listrow-main' },
              h('div', null,
                h(ChipField, { className: 'ds-chip', 'data-on': item.level === 'blocker' ? '1' : '0', style: { marginRight: 8 } }, ONTOLOGY_FINDING_LEVEL_LABEL[item.level] ?? item.level),
                item.subject,
              ),
              h('div', { className: 'ds-hint' }, item.message),
              item.fix === '' || item.fix === undefined ? null : h('div', { className: 'ds-hint' }, `怎么改：${item.fix}`),
            ),
          )),
      ),
    ),
    h('div', { className: 'ds-panel', style: { marginTop: 12 } },
      h('div', { className: 'ds-panel-head' }, '领域骨架模板',
        h('span', { className: 'ds-hint' }, '只有结构骨架，不含行业业务数据；实例化后是 AI 草稿')),
      h('div', { className: 'ds-panel-body' },
        templates.length === 0
          ? h('div', { className: 'ds-empty' }, '没有可用模板。')
          : templates.map(item => h('div', { key: item.id, className: 'ds-listrow' },
            h('div', { className: 'ds-listrow-main' },
              h('div', null, item.name, h(ChipField, { className: 'ds-chip', style: { marginLeft: 8 } }, item.domain ?? '')),
              h('div', { className: 'ds-hint' }, item.description ?? ''),
            ),
            h('div', { className: 'ds-listrow-actions' },
              h('button', { className: 'ds-btn', disabled: busy, onClick: () => void applyTemplate(item.id) }, '生成骨架'),
            ),
          )),
      ),
    ),
    h('div', { className: 'ds-panel', style: { marginTop: 12 } },
      h('div', { className: 'ds-panel-head' }, '缺口检查',
        h('span', { className: 'ds-hint' }, coverage.issues === 0 ? '对象都有属性、关系都指向存在的对象、规则都有表达式、行动都有目标' : `${coverage.issues} 处待补`)),
      h('div', { className: 'ds-panel-body' },
        gapLines.length === 0
          ? h('div', { className: 'ds-empty' }, '没有缺口：语义层自洽。')
          : gapLines.map((line, index) => h('div', { key: `gap${index}`, className: 'ds-listrow' }, h('div', { className: 'ds-listrow-main' }, h('div', null, line)))),
      ),
    ),
    h('div', { className: 'ds-panel', style: { marginTop: 12 } },
      h('div', { className: 'ds-panel-head' }, `${ONTOLOGY_LAYERS.find(item => item.id === layer)?.label ?? ''} · 资产台账`,
        h('span', { className: 'ds-hint' }, `${rows.length} 项`)),
      h('div', { className: 'ds-panel-body' },
        h('div', { className: 'ds-row', style: { gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
          layerKinds.map(one => h('button', {
            key: one,
            className: 'ds-btn',
            'data-on': kind === one ? '1' : '0',
            onClick: () => setKind(one),
          }, ONTOLOGY_KIND_LABEL[one] ?? one)),
        ),
        rows.length === 0
          ? h('div', { className: 'ds-empty' }, '这一类还没有资产：让建模专家用 ontology_asset_save 登记，或在下面手工登记一条。')
          : rows.map(item => assetRow(kind, item)),
      ),
    ),
    h('div', { className: 'ds-panel', style: { marginTop: 12 } },
      h('div', { className: 'ds-panel-head' }, '人工登记资产',
        h('span', { className: 'ds-hint' }, '登记后是「AI 草稿」状态，需专家校准才算确认')),
      h('div', { className: 'ds-panel-body' },
        h('div', { className: 'ds-row', style: { gap: 8, flexWrap: 'wrap' } },
          h(SelectField, { className: 'ds-select', value: formKind, onChange: value => setField('kind', value) },
            ALL_KINDS.map(one => h('option', { key: one, value: one }, ONTOLOGY_KIND_LABEL[one] ?? one))),
          h(TextField, { className: 'ds-input', style: { flex: '1 1 200px' }, value: form.name, placeholder: '名称', onChange: event => setField('name', event.target.value) }),
          h(TextField, { className: 'ds-input', style: { flex: '1 1 240px' }, value: form.description, placeholder: '说明（这是什么）', onChange: event => setField('description', event.target.value) }),
        ),
        formKind === 'object'
          ? h('div', { className: 'ds-row', style: { gap: 8, flexWrap: 'wrap', marginTop: 8 } },
            h(TextField, { className: 'ds-input', style: { flex: '0 0 160px' }, value: form.code, placeholder: '编码（英文）', onChange: event => setField('code', event.target.value) }),
            h(TextField, { className: 'ds-input', style: { flex: '0 0 160px' }, value: form.domain, placeholder: '业务域', onChange: event => setField('domain', event.target.value) }),
            h(TextField, { className: 'ds-input', style: { flex: '1 1 320px' }, value: form.attributes, placeholder: '属性：名称:类型,名称:类型（类型见类型表，如 string/number/date）', onChange: event => setField('attributes', event.target.value) }),
          )
          : null,
        formKind === 'relation'
          ? h('div', { className: 'ds-row', style: { gap: 8, flexWrap: 'wrap', marginTop: 8 } },
            h(TextField, { className: 'ds-input', style: { flex: '1 1 160px' }, value: form.from, placeholder: '起点对象', onChange: event => setField('from', event.target.value) }),
            h(TextField, { className: 'ds-input', style: { flex: '1 1 160px' }, value: form.name, placeholder: '关系名（如「拥有」）', onChange: event => setField('name', event.target.value) }),
            h(TextField, { className: 'ds-input', style: { flex: '1 1 160px' }, value: form.to, placeholder: '终点对象', onChange: event => setField('to', event.target.value) }),
            h(SelectField, { className: 'ds-select', value: form.cardinality, onChange: value => setField('cardinality', value) },
              ONTOLOGY_CARDINALITIES.map(item => h('option', { key: item, value: item }, item))),
          )
          : null,
        formKind === 'rule'
          ? h('div', { className: 'ds-row', style: { gap: 8, flexWrap: 'wrap', marginTop: 8 } },
            h(SelectField, { className: 'ds-select', value: form.type, onChange: value => setField('type', value) },
              Object.keys(ONTOLOGY_RULE_TYPE_LABEL).map(item => h('option', { key: item, value: item }, ONTOLOGY_RULE_TYPE_LABEL[item]))),
            h(SelectField, { className: 'ds-select', value: form.language, onChange: value => setField('language', value) },
              Object.keys(ONTOLOGY_EXPRESSION_LANGUAGE_LABEL).map(item => h('option', { key: item, value: item }, ONTOLOGY_EXPRESSION_LANGUAGE_LABEL[item]))),
            h(TextField, { className: 'ds-input', style: { flex: '1 1 260px' }, value: form.expression, placeholder: '判定表达式', onChange: event => setField('expression', event.target.value) }),
            h(TextField, { className: 'ds-input', style: { flex: '0 0 160px' }, value: form.scope, placeholder: '适用范围', onChange: event => setField('scope', event.target.value) }),
          )
          : null,
        formKind === 'action'
          ? h('div', { className: 'ds-row', style: { gap: 8, flexWrap: 'wrap', marginTop: 8 } },
            h(SelectField, { className: 'ds-select', value: form.actionKind, onChange: value => setField('actionKind', value) },
              Object.keys(ONTOLOGY_ACTION_KIND_LABEL).map(item => h('option', { key: item, value: item }, ONTOLOGY_ACTION_KIND_LABEL[item]))),
            h(TextField, { className: 'ds-input', style: { flex: '1 1 200px' }, value: form.target, placeholder: '目标系统 / 接口', onChange: event => setField('target', event.target.value) }),
            h(TextField, { className: 'ds-input', style: { flex: '1 1 200px' }, value: form.params, placeholder: '入参（逗号分隔）', onChange: event => setField('params', event.target.value) }),
            h(TextField, { className: 'ds-input', style: { flex: '1 1 200px' }, value: form.result, placeholder: '返回什么', onChange: event => setField('result', event.target.value) }),
          )
          : null,
        formKind === 'vocabulary'
          ? h('div', { className: 'ds-row', style: { gap: 8, flexWrap: 'wrap', marginTop: 8 } },
            h(TextField, { className: 'ds-input', style: { flex: '0 0 180px' }, value: form.term, placeholder: '术语（英文标识）', onChange: event => setField('term', event.target.value) }),
            h(TextField, { className: 'ds-input', style: { flex: '1 1 200px' }, value: form.label, placeholder: '显示名', onChange: event => setField('label', event.target.value) }),
          )
          : null,
        formKind === 'individual'
          ? h('div', { className: 'ds-row', style: { gap: 8, flexWrap: 'wrap', marginTop: 8 } },
            h(TextField, { className: 'ds-input', style: { flex: '1 1 240px' }, value: form.classRef, placeholder: '所属对象类（classRef）', onChange: event => setField('classRef', event.target.value) }),
          )
          : null,
        formKind === 'shape'
          ? h('div', { className: 'ds-row', style: { gap: 8, flexWrap: 'wrap', marginTop: 8 } },
            h(TextField, { className: 'ds-input', style: { flex: '1 1 240px' }, value: form.targetClass, placeholder: '目标类（targetClass）', onChange: event => setField('targetClass', event.target.value) }),
            h(SelectField, { className: 'ds-select', value: form.severity, onChange: value => setField('severity', value) },
              h('option', { value: 'violation' }, '违规'),
              h('option', { value: 'warning' }, '警告'),
              h('option', { value: 'info' }, '提示')),
            h('span', { className: 'ds-hint' }, `算子：${Object.keys(ONTOLOGY_SHAPE_OPERATOR_LABEL).join(' / ')}`),
          )
          : null,
        formKind === 'application'
          ? h('div', { className: 'ds-row', style: { gap: 8, flexWrap: 'wrap', marginTop: 8 } },
            h(TextField, { className: 'ds-input', style: { flex: '1 1 240px' }, value: form.purpose, placeholder: '这个应用解决什么', onChange: event => setField('purpose', event.target.value) }),
            h(TextField, { className: 'ds-input', style: { flex: '1 1 200px' }, value: form.actors, placeholder: '参与者（逗号分隔）', onChange: event => setField('actors', event.target.value) }),
          )
          : null,
        h('div', { className: 'ds-row', style: { gap: 8, marginTop: 8 } },
          h('button', { className: 'ds-btn ds-btn-primary', disabled: busy || form.name.trim() === '', onClick: () => register() }, '登记为 AI 草稿'),
          h('span', { className: 'ds-hint' }, 'AI 生成约 80%、专家校准约 20%：草稿要有人通过才进服务封装。'),
        ),
      ),
    ),
    h('div', { className: 'ds-panel', style: { marginTop: 12 } },
      h('div', { className: 'ds-panel-head' }, '应用蓝图',
        h('span', { className: 'ds-hint' }, '把语义层翻译成数据模型 / 规则引擎 / API 契约 / 前端设计 / 本体驱动 / 测试方案')),
      h('div', { className: 'ds-panel-body' },
        h('div', { className: 'ds-row', style: { gap: 8, flexWrap: 'wrap' } },
          ONTOLOGY_BLUEPRINT_SECTIONS.map(item => h('button', {
            key: item.id,
            className: 'ds-btn',
            'data-on': blueprintSections.includes(item.id) ? '1' : '0',
            onClick: () => setBlueprintSections(previous => (previous.includes(item.id) ? previous.filter(one => one !== item.id) : [...previous, item.id])),
          }, item.label)),
          h('button', { className: 'ds-btn ds-btn-primary', disabled: busy || blueprintSections.length === 0, onClick: () => void generateBlueprint() }, '生成蓝图'),
        ),
        blueprint === null
          ? h('div', { className: 'ds-empty' }, '还没有生成：选章节，点「生成蓝图」。')
          : h('div', { className: 'ds-empty', style: { whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12, maxHeight: 420, overflow: 'auto' } }, blueprint.markdown ?? ''),
      ),
    ),
    h('div', { className: 'ds-panel', style: { marginTop: 12 } },
      h('div', { className: 'ds-panel-head' }, '平台操作手册库',
        h('span', { className: 'ds-hint' }, '把平台的操作手册放进这里，专家就能照手册教用户操作')),
      h('div', { className: 'ds-panel-body' },
        guideBook === null
          ? null
          : h('div', { className: 'ds-listrow' },
            h('div', { className: 'ds-listrow-main' },
              h('div', null, guideBook.title ?? '内置手册',
                h('span', { className: 'ds-hint', style: { marginLeft: 8 } }, `内置 · ${guideBook.count ?? 0} 个章节 · ${guideBook.version ?? ''}`)),
              h('div', { className: 'ds-hint' }, guideBook.description ?? '随插件内置的平台操作手册，载入后专家就能按章节回答「平台上怎么操作」。'),
            ),
            h('div', { className: 'ds-listrow-actions' },
              h('button', { className: 'ds-btn ds-btn-primary', disabled: busy, onClick: () => void ingestGuideBook() }, '载入到手册库'),
              h('button', { className: 'ds-btn', disabled: busy, onClick: () => setGuideSections(previous => !previous) }, guideSections ? '收起章节' : '查看章节'),
            ),
          ),
        guideSections === false || guideBook === null
          ? null
          : h('div', { className: 'ds-hint', style: { marginTop: 8, whiteSpace: 'pre-wrap' } },
            (guideBook.sections ?? []).map(item => `${item.section} ${item.title}`).join('\n')),
        h('div', { className: 'ds-row', style: { gap: 8, flexWrap: 'wrap', marginTop: 8 } },
          h(TextField, { className: 'ds-input', style: { flex: '1 1 260px' }, value: guideQuery, placeholder: '搜手册（如：新建本体 / 发布服务）', onChange: event => setGuideQuery(event.target.value) }),
          h('button', { className: 'ds-btn', disabled: busy, onClick: () => void searchGuides() }, '检索'),
        ),
        h('div', { className: 'ds-row', style: { gap: 8, flexWrap: 'wrap', marginTop: 8 } },
          h(TextField, { className: 'ds-input', style: { flex: '0 0 180px' }, value: guideForm.title, placeholder: '手册标题', onChange: event => setGuideForm(previous => ({ ...previous, title: event.target.value })) }),
          h(TextField, { className: 'ds-input', style: { flex: '0 0 180px' }, value: guideForm.source, placeholder: '来源（手册名/链接）', onChange: event => setGuideForm(previous => ({ ...previous, source: event.target.value })) }),
          h(TextField, { className: 'ds-input', style: { flex: '1 1 320px' }, value: guideForm.body, placeholder: '操作步骤正文', onChange: event => setGuideForm(previous => ({ ...previous, body: event.target.value })) }),
          h('button', { className: 'ds-btn ds-btn-primary', disabled: busy, onClick: () => void saveGuide() }, '存入手册'),
        ),
        guideHits === null
          ? null
          : (guideHits.length === 0
            ? h('div', { className: 'ds-empty' }, '没找到相关手册。')
            : guideHits.map(item => h('div', { key: item.id, className: 'ds-listrow' },
              h('div', { className: 'ds-listrow-main' },
                h('div', null, item.title,
                  h('span', { className: 'ds-hint', style: { marginLeft: 8 } }, `${item.origin === 'builtin' ? '内置手册' : item.origin === 'library' ? '已入库' : '内置+已入库'}${item.source === '' ? '' : ` · ${item.source}`}`)),
                h('div', { className: 'ds-hint' }, item.snippet ?? item.excerpt ?? ''),
              ),
            ))),
      ),
    ),
    h('div', { className: 'ds-panel', style: { marginTop: 12 } },
      h('div', { className: 'ds-panel-head' }, '服务封装',
        h('span', { className: 'ds-hint' }, '对象 / 关系 / 规则 / 行动四类封装，走通用 MCP 协议或专有本体 SDK')),
      h('div', { className: 'ds-panel-body' },
        h('div', { className: 'ds-row', style: { gap: 8, flexWrap: 'wrap' } },
          h(SelectField, { className: 'ds-select', value: packaging, onChange: value => setPackaging(value) },
            ONTOLOGY_PACKAGINGS.map(item => h('option', { key: item, value: item }, ONTOLOGY_KIND_LABEL[item]))),
          h(SelectField, { className: 'ds-select', value: protocol, onChange: value => setProtocol(value) },
            ONTOLOGY_PROTOCOLS.map(item => h('option', { key: item, value: item }, item === 'mcp' ? '通用 MCP 协议' : '专有本体 SDK'))),
          h('button', { className: 'ds-btn ds-btn-primary', disabled: busy, onClick: () => void generateService() }, '生成'),
        ),
        service === null
          ? h('div', { className: 'ds-empty' }, '还没有生成：选一类封装，再选协议，点「生成」。')
          : h('div', { className: 'ds-empty', style: { whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12, maxHeight: 360, overflow: 'auto' } },
            service.protocol === 'sdk'
              ? service.snippet
              : `${(service.tools ?? []).map(tool => `- ${tool.name}：${tool.description}`).join('\n')}\n\n${JSON.stringify(service.tools ?? [], null, 2)}`),
      ),
    ),
  )
}

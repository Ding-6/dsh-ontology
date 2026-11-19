/* 规划页：单人开发者的起点。
 *
 * 流程只有三步：
 *   1. 用一句业务话把想做的事说清楚；
 *   2. 插件按「场景筛选 → 定价值 → 数据治理 → 本体建模 → 后端与服务 → 前端 → 联调测试」
 *      七个阶段排出计划，每一步写清负责角色、该守的规范、加载哪个技能、怎么算做完；
 *      顺带给一版初定本体（对象 / 关系 / 规则 / 行动骨架）；
 *   3. 满意就一键落成「一条需求 + 一串步骤卡」，不满意就改描述重排。
 */

import { client } from '../context.js'

const TEMPLATE_OPTIONS = [
  { id: '', name: '自动识别（按业务描述选骨架）' },
  { id: 'general', name: '通用' },
  { id: 'industrial', name: '工业' },
  { id: 'safety', name: '安全' },
  { id: 'health', name: '健康' },
  { id: 'defense', name: '国防' },
  { id: 'geo', name: '地理' },
  { id: 'finance', name: '金融' },
  { id: 'knowledge', name: '知识' },
]

const ROLE_NAME = {
  business: '业务',
  requirement: '需求',
  data: '数据',
  modeling: '本体建模',
  backend: '后端',
  frontend: '前端',
  qa: '测试',
}

export function PlanPage({ state, onChanged, onOpenTask }) {
  const { h, React, api, toast, TextField, TextAreaField } = client()
  const [business, setBusiness] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [domain, setDomain] = React.useState('')
  const [templateId, setTemplateId] = React.useState('')
  const [plan, setPlan] = React.useState(null)
  const [summary, setSummary] = React.useState('')
  const [applied, setApplied] = React.useState(null)
  const [skills, setSkills] = React.useState([])
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState(null)

  const loadSkills = React.useCallback(async () => {
    try {
      const out = await api('/ontology/skills/builtin', {})
      setSkills(Array.isArray(out.skills) ? out.skills : [])
    } catch {
      setSkills([])
    }
  }, [])

  React.useEffect(() => { void loadSkills() }, [loadSkills])

  const generate = async () => {
    if (business.trim().length < 6) {
      setError('先把业务/需求写清楚（至少 6 个字），规划器才知道排哪几步。')
      return
    }
    setBusy(true)
    setError(null)
    setApplied(null)
    try {
      const out = await api('/ontology/plan', { business, title, domain, templateId })
      setPlan(out.plan ?? null)
      setSummary(out.summary ?? '')
      toast('计划出来了，往下看每一步的规范与验收标准')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const apply = async () => {
    if (plan === null) return
    setBusy(true)
    setError(null)
    try {
      const out = await api('/ontology/plan', { business, title, domain, templateId, apply: true })
      setApplied({ requirement: out.requirement ?? null, cards: Array.isArray(out.cards) ? out.cards : [] })
      toast(`已落成需求 ${out.requirement?.code ?? ''} 与 ${(out.cards ?? []).length} 张步骤卡`)
      if (typeof onChanged === 'function') await onChanged()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const installSkills = async () => {
    setBusy(true)
    try {
      const out = await api('/ontology/skills/builtin', {})
      toast(out.created > 0 ? `装了 ${out.created} 条内置规范技能` : '内置规范技能都已经在库里了')
      await loadSkills()
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : String(cause), 'error')
    } finally {
      setBusy(false)
    }
  }

  const installedCount = skills.filter(item => item.installed === true).length
  const draft = plan?.draft ?? { objects: [], relations: [], rules: [], actions: [] }

  return h('div', { className: 'ds-body' },
    h('div', { className: 'ds-panel' },
      h('div', { className: 'ds-panel-head' },
        h('span', {}, '① 说清要做什么'),
        h('span', { className: 'ds-hint' }, '一个人开发：先讲业务，插件把后面的步骤、规范、验收标准排好'),
      ),
      h('div', { className: 'ds-panel-body' },
        h('div', { className: 'ds-field' },
          h('div', { className: 'ds-label' }, '业务 / 需求描述'),
          h(TextAreaField, {
            id: 'plan-business',
            rows: 5,
            value: business,
            onChange: e => setBusiness(e.target.value),
            placeholder: '例：给地市做一个「装维工单」本体，工单能自动派给最近的装维人员，超时未接单要升级。',
          }),
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
          h('div', { className: 'ds-field' },
            h('div', { className: 'ds-label' }, '标题（可留空，插件自动起）'),
            h(TextField, { id: 'plan-title', value: title, onChange: e => setTitle(e.target.value), placeholder: '装维工单本体' }),
          ),
          h('div', { className: 'ds-field' },
            h('div', { className: 'ds-label' }, '业务领域（可留空）'),
            h(TextField, { id: 'plan-domain', value: domain, onChange: e => setDomain(e.target.value), placeholder: '运维' }),
          ),
        ),
        h('div', { className: 'ds-field' },
          h('div', { className: 'ds-label' }, '本体骨架模板'),
          h('select', { id: 'plan-template', className: 'ds-input', value: templateId, onChange: e => setTemplateId(e.target.value) },
            TEMPLATE_OPTIONS.map(item => h('option', { key: item.id, value: item.id }, item.name)),
          ),
        ),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
          h('button', { className: 'ds-btn ds-btn-primary', disabled: busy, onClick: () => void generate() }, busy ? '排计划中…' : '生成计划'),
          h('button', { className: 'ds-btn', disabled: busy || plan === null, onClick: () => void apply() }, '落成需求 + 步骤卡'),
          h('button', { className: 'ds-btn', disabled: busy, onClick: () => void installSkills() }, `装内置规范技能（${installedCount}/${skills.length}）`),
          h('span', { className: 'ds-hint' }, '装过的技能会写进 ~/.dsh/skills，各角色 agent 开工时按步骤加载'),
        ),
        error !== null ? h('div', { className: 'ds-err' }, error) : null,
      ),
    ),

    plan === null
      ? h('div', { className: 'ds-empty' }, '还没排计划。上面写一句业务话，点「生成计划」。')
      : h('div', { className: 'ds-panel' },
        h('div', { className: 'ds-panel-head' },
          h('span', {}, '② 执行计划'),
          h('span', { className: 'ds-hint' }, `${plan.templateName ?? ''} · ${plan.stages?.length ?? 0} 个阶段 · ${plan.steps?.length ?? 0} 步`),
        ),
        h('div', { className: 'ds-panel-body' },
          (plan.stages ?? []).map(stage => h('div', { key: stage.name, style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            h('div', { className: 'ds-kv' },
              h('span', {}, h('b', {}, `${stage.name}`), h('span', { className: 'ds-hint' }, ` · ${stage.goal ?? ''}`)),
              h('span', { className: 'ds-chip' }, ROLE_NAME[stage.role] ?? stage.role),
            ),
            h('div', { className: 'ds-hint' }, `规范：${stage.spec ?? ''}`),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
              (stage.skills ?? []).map(skill => h('span', { key: skill, className: 'ds-chip ds-chip-soft' }, skill)),
            ),
            (stage.steps ?? []).map(step => h('div', { key: step.title, className: 'ds-listrow', style: { display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0' } },
              h('div', { style: { display: 'flex', gap: 8, alignItems: 'baseline' } },
                h('b', { style: { fontSize: 12.5 } }, step.title),
                h('span', { className: 'ds-hint' }, `产出物：${step.deliverable ?? ''}`),
              ),
              h('div', { className: 'ds-hint' }, `验收：${(step.acceptance ?? []).join('；')}`),
            )),
          )),
          summary !== '' ? h('div', { className: 'ds-req-desc' }, h('pre', { style: { whiteSpace: 'pre-wrap', margin: 0 } }, summary)) : null,
        ),
      ),

    plan === null
      ? null
      : h('div', { className: 'ds-panel' },
        h('div', { className: 'ds-panel-head' },
          h('span', {}, '③ 初定版本'),
          h('span', { className: 'ds-hint' }, '这是按骨架给的起点，不是定稿：落成后每条都是可编辑的 AI 草稿'),
        ),
        h('div', { className: 'ds-panel-body' },
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 } },
            h('div', { className: 'ds-kpi' }, h('div', { className: 'ds-kpi-value' }, String(draft.objects?.length ?? 0)), h('div', { className: 'ds-kpi-label' }, '对象')),
            h('div', { className: 'ds-kpi' }, h('div', { className: 'ds-kpi-value' }, String(draft.relations?.length ?? 0)), h('div', { className: 'ds-kpi-label' }, '关系')),
            h('div', { className: 'ds-kpi' }, h('div', { className: 'ds-kpi-value' }, String(draft.rules?.length ?? 0)), h('div', { className: 'ds-kpi-label' }, '规则')),
            h('div', { className: 'ds-kpi' }, h('div', { className: 'ds-kpi-value' }, String(draft.actions?.length ?? 0)), h('div', { className: 'ds-kpi-label' }, '行动')),
          ),
          h('div', { className: 'ds-field' },
            h('div', { className: 'ds-label' }, '要你确认的三件事'),
            h('ul', { style: { margin: '4px 0 0', paddingLeft: 18, fontSize: 12, lineHeight: 1.7 } },
              (plan.questions ?? []).map(question => h('li', { key: question }, question)),
            ),
          ),
          h('div', { style: { display: 'flex', gap: 8 } },
            h('button', { className: 'ds-btn ds-btn-primary', disabled: busy, onClick: () => void apply() }, '落成需求 + 步骤卡'),
            h('button', { className: 'ds-btn', onClick: () => void generate() }, '换个说法重排'),
          ),
        ),
      ),

    applied === null
      ? null
      : h('div', { className: 'ds-panel' },
        h('div', { className: 'ds-panel-head' },
          h('span', {}, '④ 已落成'),
          h('span', { className: 'ds-hint' }, `${applied.requirement?.code ?? ''} · ${applied.cards.length} 张卡`),
        ),
        h('div', { className: 'ds-panel-body' },
          applied.cards.map(card => h('div', { key: card.id, className: 'ds-listrow', style: { display: 'flex', gap: 8, alignItems: 'center' } },
            h('div', { className: 'ds-listrow-main' },
              h('div', { className: 'ds-card-title' }, card.title),
              h('div', { className: 'ds-hint' }, `${card.code ?? ''} · ${ROLE_NAME[card.role] ?? card.role}`),
            ),
            h('div', { className: 'ds-listrow-actions' },
              typeof onOpenTask === 'function'
                ? h('button', { className: 'ds-btn ds-btn-ghost', onClick: () => onOpenTask(card.id) }, '打开')
                : null,
            ),
          )),
        ),
      ),

    h('div', { className: 'ds-panel' },
      h('div', { className: 'ds-panel-head' },
        h('span', {}, '内置规范技能'),
        h('span', { className: 'ds-hint' }, '每一步该守的规矩，装进技能库后由对应角色 agent 加载'),
      ),
      h('div', { className: 'ds-panel-body' },
        skills.length === 0
          ? h('div', { className: 'ds-empty' }, '内置技能没读到：插件可能还没更新到带「规划」的版本。')
          : skills.map(skill => h('div', { key: skill.name, className: 'ds-listrow', style: { display: 'flex', gap: 8, alignItems: 'baseline' } },
            h('div', { className: 'ds-listrow-main' },
              h('div', { style: { fontSize: 12.5, fontWeight: 600 } }, skill.name),
              h('div', { className: 'ds-hint' }, skill.description),
            ),
            h('span', { className: 'ds-chip' }, skill.installed ? '已安装' : '未安装'),
          )),
      ),
    ),
  )
}

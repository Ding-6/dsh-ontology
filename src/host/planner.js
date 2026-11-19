/**
 * 规划器：把一句业务诉求变成「一份可执行的本体开发计划 + 一版初定本体」。
 *
 * 三件事：
 *   1. 按「本体建模工程落地标准动作」排 7 个阶段（场景筛选 → 定价值与需求 → 数据治理
 *      → 本体建模 → 后端与服务 → 前端实现 → 联调测试），每个阶段一个角色。
 *   2. 每一步都绑定：规范（skill）、产出物、验收标准 —— 落成看板上的卡就有验收清单。
 *   3. 给一版「初定版本」：从领域骨架模板实例化的对象/关系/规则/行动草案，
 *      让人一眼看到这版本体大致有多大、包含什么。
 *
 * 纯函数模块：不碰 I/O，可直接被单测引用。
 */
import { ONTOLOGY_TEMPLATES } from './ontology-templates.js'

/** 阶段定义：标准动作 → 角色 → 步骤 → 规范技能 → 产出物 → 验收标准。 */
export const PLAN_STAGES = [
  {
    id: 'scenario',
    name: '场景筛选',
    role: 'business',
    goal: '把业务诉求收敛成值得做的场景，并给出可度量的价值。',
    spec: '五条门槛全过才进：痛点真实高频、数据可得、本体可表达、一个迭代能出成果、可复制。',
    skills: ['ontology-scenario-screening', 'ontology-value-definition'],
    outputs: ['场景清单（五条门槛结论）', '价值口径表（基线/目标/周期/口径）', '本期不做的场景清单'],
    steps: [
      {
        id: 'scenario-1',
        title: '场景筛选与优先级排序',
        detail: '列出候选场景，逐条给五条门槛结论；答不上来的写进「本期不做」并写明原因。',
        deliverable: '场景清单 + 本期不做的场景清单',
        acceptance: ['每个场景都有五条门槛的明确结论', '不做的场景写明了原因', '结论用 ontology_task_artifact 登记（kind=requirement，正文齐全）'],
      },
      {
        id: 'scenario-2',
        title: '价值口径表',
        detail: '给进入本期的场景定基线值、目标值、统计周期与统计口径；没基线的写「基线待测」并写清怎么测。',
        deliverable: '价值口径表',
        acceptance: ['每个场景四件套齐全（基线/目标/周期/口径）', '没有编造的数字', '口径与后续验收标准对得上'],
      },
    ],
  },
  {
    id: 'requirement',
    name: '定价值与需求澄清',
    role: 'requirement',
    goal: '把场景变成可独立验收的需求，并拆成一张张能独立完成的卡。',
    spec: '需求六段齐全（背景/目标/范围/不做/验收/风险）；一张卡 = 一个能独立完成、能独立验收的活。',
    skills: ['ontology-requirement-clarify'],
    outputs: ['需求正文（六段）', '功能点清单', '步骤卡清单与验收标准'],
    steps: [
      {
        id: 'requirement-1',
        title: '需求正文与范围界定',
        detail: '写清背景、目标、范围、不做、验收、风险六段；明确哪些系统参与、哪些数据被用。',
        deliverable: '需求正文 + 功能点清单',
        acceptance: ['六段齐全', '「不做」写清楚了', '每条验收标准可被一个用例验证'],
      },
      {
        id: 'requirement-2',
        title: '拆卡与验收标准',
        detail: '把需求拆成卡片：每张卡写清产出物、不做什么、验收标准，并挂到功能点上。',
        deliverable: '卡片清单（含验收标准）',
        acceptance: ['每张卡都能独立验收', '每张卡挂到需求与功能点', '能写成接口调用的验收标准写了 method/url/期望'],
      },
    ],
  },
  {
    id: 'data',
    name: '数据治理',
    role: 'data',
    goal: '把业务数据变成能进本体模型的资产：来源、口径、质量与映射。',
    spec: '逐字段写清来源/口径/频率/空值/可空/脱敏；质量规则写成可判定条件；映射到本体对象。',
    skills: ['ontology-data-governance'],
    outputs: ['数据资产清单', '物理字段→本体对象的映射表', '数据质量规则'],
    steps: [
      {
        id: 'data-1',
        title: '数据资产盘点与口径确认',
        detail: '盘点参与系统的表与字段，逐字段写来源、口径、更新频率、空值处理、可空性、脱敏要求。',
        deliverable: '数据资产清单',
        acceptance: ['每个字段六项说明齐全', '口径与业务价值口径一致', '数据缺口用 ontology_task_block 说明'],
      },
      {
        id: 'data-2',
        title: '数据到本体的映射与质量规则',
        detail: '把物理字段映射到本体对象与属性，登记成关系资产；质量要求写成可判定的本体规则。',
        deliverable: '映射关系 + 质量规则（本体资产）',
        acceptance: ['映射起终点是语义层里已有的对象名', '质量规则是可判定表达式', '资产已用 ontology_asset_save 登记'],
      },
    ],
  },
  {
    id: 'modeling',
    name: '本体建模（对象与逻辑）',
    role: 'modeling',
    goal: '把场景与数据变成本体对象与逻辑：对象、属性、关系、规则、术语与形状。',
    spec: '对象只建名词性概念、编码稳定、属性齐全；关系写清基数与两端；规则必须可判定。',
    skills: ['ontology-object-modeling', 'ontology-rule-modeling'],
    outputs: ['本体对象与属性', '本体关系', '本体规则、术语与校验形状'],
    steps: [
      {
        id: 'modeling-1',
        title: '本体对象建模',
        detail: '定对象边界、给英文编码、补齐标识/名称/状态等属性，登记对象与关系资产。',
        deliverable: '对象 + 属性 + 关系（本体资产）',
        acceptance: ['对象边界有理由（不是属性被建成了对象）', '每个对象有稳定编码与必备属性', '关系基数与两端对象写得清楚'],
      },
      {
        id: 'modeling-2',
        title: '本体逻辑建模',
        detail: '把判断逻辑写成可判定规则，登记术语与校验形状；用建模建议器清零 blocker。',
        deliverable: '规则 + 术语 + 形状（本体资产）',
        acceptance: ['每条规则可判定并标了作用范围', 'ontology_review_advice 的 blocker 已清零', '资产已自校准（approved）'],
      },
    ],
  },
  {
    id: 'backend',
    name: '后端与服务共享',
    role: 'backend',
    goal: '把本体变成能调用的能力：建模行动、写清契约、把服务实现出来。',
    spec: '行动写全六要素（对象/目标/入参/输出/状态影响/反馈）；契约先行；执行记录必登记。',
    skills: ['ontology-action-modeling', 'ontology-service-sharing', 'ontology-backend-implementation'],
    outputs: ['本体行动与接口契约', 'MCP 工具定义或本体 SDK', '后端实现与执行记录'],
    steps: [
      {
        id: 'backend-1',
        title: '本体动作建模与契约',
        detail: '把要做的事建成行动：作用对象、执行目标、入参、输出、状态影响、反馈结果；写清接口契约与错误码。',
        deliverable: '行动资产 + 接口契约',
        acceptance: ['行动六要素齐全', '契约含路径/方法/请求体/响应体/错误码', '行动已登记进语义层'],
      },
      {
        id: 'backend-2',
        title: '服务共享与后端实现',
        detail: '用 ontology_service_export 生成 MCP 工具或 SDK；按契约实现服务并写单测；登记执行记录。',
        deliverable: '服务封装 + 后端代码 + 执行记录',
        acceptance: ['对外封装方式已选定并生成', 'ontology_task_coding 记录了分支/commits/改动文件/单测', '改动只在卡指定的 worktree 分支'],
      },
    ],
  },
  {
    id: 'frontend',
    name: '前端实现',
    role: 'frontend',
    goal: '把本体能力做成能用的界面：页面、表单、交互与异常提示。',
    spec: '页面与表单按蓝图对齐；校验与后端契约一致；指标要标口径。',
    skills: ['ontology-frontend-implementation'],
    outputs: ['前端页面与交互', '执行记录'],
    steps: [
      {
        id: 'frontend-1',
        title: '前端页面与交互实现',
        detail: '对齐蓝图的前端设计章节：页面、表单、校验、错误提示；改完登记执行记录。',
        deliverable: '前端页面 + 执行记录',
        acceptance: ['表单校验与后端契约一致', '指标标注了口径与周期', 'ontology_task_coding 记录齐全'],
      },
    ],
  },
  {
    id: 'test',
    name: '联调测试',
    role: 'qa',
    goal: '用可复现的用例证明它真的通：准确性、稳定性与回归。',
    spec: '先写用例再下结论；能写成接口调用的就真跑；失败自动开缺陷卡，别手工建。',
    skills: ['ontology-integration-test'],
    outputs: ['测试用例与执行记录', '测试报告', '缺陷卡（失败时）'],
    steps: [
      {
        id: 'test-1',
        title: '用例设计与真跑',
        detail: '登记用例（做什么、期望什么），能写成接口调用的写清 method/url/期望，用 ontology_test_run 真跑。',
        deliverable: '用例集 + 执行记录',
        acceptance: ['每条用例有明确期望', '接口用例有执行记录', '失败用例已开缺陷卡'],
      },
      {
        id: 'test-2',
        title: '准确性、稳定性与回归结论',
        detail: '核心规则与行动各跑正例与反例；重复调用验证结果一致；回归缺陷卡复跑通过；出测试报告。',
        deliverable: '测试报告',
        acceptance: ['准确性/稳定性/回归三类证据齐全', '遗留问题写清楚了', '报告已登记（kind=report）'],
      },
    ],
  },
]

const TEMPLATE_KEYWORDS = [
  { id: 'finance', words: ['金融', '银行', '支付', '风控', '理财', '保险', '资金', '账户', '交易', '授信', '反欺诈'] },
  { id: 'health', words: ['医疗', '健康', '病历', '医院', '药品', '患者', '诊疗', '医保'] },
  { id: 'defense', words: ['国防', '军', '武器', '装备', '战场', '情报'] },
  { id: 'safety', words: ['安全', '应急', '危化', '事故', '消防', '隐患', '风险管控'] },
  { id: 'geo', words: ['地理', '地图', '位置', '空间', '轨迹', '管网', '管线', 'gis'] },
  { id: 'industrial', words: ['工业', '制造', '设备', '产线', '工厂', '能耗', '工单', '工艺'] },
  { id: 'knowledge', words: ['知识', '文档', '问答', '检索', '语料', '百科', '攻略'] },
]

/** 按业务描述里的关键词挑一套领域骨架；挑不到就用通用骨架。 */
export function matchTemplate(text, domain = '') {
  const haystack = `${domain} ${String(text ?? '')}`
  for (const entry of TEMPLATE_KEYWORDS) {
    if (entry.words.some(word => haystack.includes(word))) return entry.id
  }
  return 'general'
}

export function templateById(id) {
  return ONTOLOGY_TEMPLATES.find(item => item.id === String(id ?? '')) ?? ONTOLOGY_TEMPLATES.find(item => item.id === 'general') ?? null
}

/**
 * 生成计划。
 * @param {object} input
 * @param {string} input.title 计划标题（可由业务描述首句生成）
 * @param {string} input.business 业务/需求描述
 * @param {string} input.domain 业务域
 * @param {string} input.templateId 指定领域骨架（不传按关键词猜）
 */
export function buildPlan(input = {}) {
  const business = String(input.business ?? '').trim()
  const title = String(input.title ?? '').trim() || (business.slice(0, 40) || '未命名本体项目')
  const domain = String(input.domain ?? '').trim() || '通用'
  const templateId = String(input.templateId ?? '').trim() !== '' ? String(input.templateId).trim() : matchTemplate(business, domain)
  const template = templateById(templateId)
  const stages = PLAN_STAGES.map(stage => ({
    ...stage,
    steps: stage.steps.map(step => ({ ...step, role: stage.role, skills: stage.skills, stage: stage.id })),
  }))
  const steps = stages.flatMap(stage => stage.steps)
  const draft = draftFromTemplate(template, domain)
  return {
    id: `plan-${Date.now().toString(36)}`,
    title,
    domain,
    business,
    templateId: template?.id ?? 'general',
    templateName: template?.name ?? '通用业务骨架',
    stages,
    steps,
    draft,
    scope: {
      objects: draft.objects.length,
      relations: draft.relations.length,
      rules: draft.rules.length,
      actions: draft.actions.length,
      cards: steps.length,
    },
    questions: [
      '这套能力有服务端吗？（有 → 行动落在哪个系统；没有 → 只做语义层与原型）',
      '鉴权谁做？（调用方是谁，凭据从哪来）',
      '交付边界到哪？（数据只读还是允许写回；要不要管历史版本）',
    ],
    createdAt: Date.now(),
  }
}

/** 初定版本：把领域骨架实例化成对象/关系/规则/行动草案。 */
export function draftFromTemplate(template, domain = '') {
  if (template === null || template === undefined) return { objects: [], relations: [], rules: [], actions: [] }
  const objects = (template.objects ?? []).map(item => ({
    name: item.name,
    code: item.code,
    domain: domain || item.domain,
    description: item.description,
    attributes: item.attributes ?? [],
    status: 'draft',
  }))
  const relations = (template.relations ?? []).map(item => ({
    name: item.name,
    from: item.from,
    to: item.to,
    cardinality: item.cardinality,
    description: item.description,
    status: 'draft',
  }))
  const rules = (template.rules ?? []).map(item => ({
    name: item.name,
    type: item.type,
    expression: item.expression,
    scope: item.scope,
    status: 'draft',
  }))
  const actions = (template.actions ?? []).map(item => ({
    name: item.name,
    kind: item.kind,
    target: item.target,
    description: item.description,
    params: item.params ?? [],
    status: 'draft',
  }))
  return { objects, relations, rules, actions }
}

/** 阶段 → 看板列（角色位一致：谁干这活，卡就停在哪一列）。 */
export const STAGE_COLUMN = {
  scenario: 'clarify',
  requirement: 'design',
  data: 'data',
  modeling: 'model',
  backend: 'backend',
  frontend: 'frontend',
  test: 'test',
}

/** 阶段 → 卡片类型（决定验收清单模板与统计口径）。 */
export const STAGE_TYPE = {
  scenario: 'requirement',
  requirement: 'requirement',
  data: 'design',
  modeling: 'design',
  backend: 'dev',
  frontend: 'dev',
  test: 'test',
}

/** 计划 → 卡片骨架：每一步一张卡，带验收清单与正文规范。 */
export function planToCards(plan) {
  return (plan?.steps ?? []).map(step => {
    const stage = (plan.stages ?? []).find(item => item.id === step.stage)
    const column = STAGE_COLUMN[step.stage] ?? 'clarify'
    const type = STAGE_TYPE[step.stage] ?? 'requirement'
    return {
      title: step.title,
      role: step.role,
      column,
      type,
      stage: step.name,
      skills: step.skills ?? [],
      requirement: [
        `【${plan.title}】${stage?.name ?? ''} · ${step.title}`,
        '',
        `业务背景：${plan.business || '（未填写）'}`,
        '',
        `这一步的目标：${stage?.goal ?? ''}`,
        `遵守规范：${stage?.spec ?? ''}`,
        step.detail ? `做法：${step.detail}` : '',
        `产出物：${step.deliverable}`,
        `相关技能：${(step.skills ?? []).join('、') || '（无）'}`,
        '',
        '验收标准：',
        ...(step.acceptance ?? []).map(item => `- ${item}`),
      ].filter(line => line !== '').join('\n'),
      checklist: (step.acceptance ?? []).map((text, index) => ({ text, done: false, index })),
    }
  })
}

/** 计划的纯文本摘要（工具返回与文档用）。 */
export function planSummary(plan) {
  if (plan === null || plan === undefined) return '（空计划）'
  const lines = [
    `本体开发计划：${plan.title}`,
    `业务域：${plan.domain}｜初定版本骨架：${plan.templateName}（${plan.templateId}）`,
    `规模：${plan.scope.cards} 张卡 · 对象 ${plan.scope.objects} · 关系 ${plan.scope.relations} · 规则 ${plan.scope.rules} · 行动 ${plan.scope.actions}`,
    '',
  ]
  for (const stage of plan.stages ?? []) {
    lines.push(`【${stage.name}】负责人角色：${stage.role}｜${stage.goal}`)
    lines.push(`规范：${stage.spec}`)
    lines.push(`技能：${(stage.skills ?? []).join('、')}`)
    for (const step of stage.steps ?? []) {
      lines.push(`  - ${step.title} → 产出物：${step.deliverable}`)
      for (const item of step.acceptance ?? []) lines.push(`      · ${item}`)
    }
    lines.push('')
  }
  if ((plan.questions ?? []).length > 0) {
    lines.push('待确认问题：')
    for (const item of plan.questions) lines.push(`  ? ${item}`)
  }
  return lines.join('\n')
}

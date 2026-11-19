/**
 * dsh-ontology 的通用本体语义层。
 *
 * 定位：插件是「本体应用开发副驾」——不管你做的是民用、商用、军用还是自己写着玩的本体应用，
 * 这里都只放**与行业无关**的建模原语：
 *   数据层：业务对象（概念类）/ 对象关系 / 实例 / 术语方案
 *   逻辑层：业务规则 / 校验形状（SHACL 风格）
 *   行动层：可调用行动 / 应用（场景）
 * 领域内容一律由用户自己填或由 AI 生成草稿，插件不预置任何行业数据。
 *
 * 纯函数模块：不碰 I/O、不碰 store，可以直接单测。
 */
import { text } from './domain.js'

/** 资产状态：draft = AI 生成的草稿（等专家校准），approved = 已确认，deprecated = 已废弃。 */
export const ONTOLOGY_ASSET_STATUS = ['draft', 'approved', 'deprecated']
export const ONTOLOGY_STATUS_LABEL = { draft: 'AI 草稿', approved: '已确认', deprecated: '已废弃' }
/** 资产来源：ai = 模型生成（占约 80%），human = 人工录入，import = 导入。 */
export const ONTOLOGY_SOURCES = ['ai', 'human', 'import']
export const ONTOLOGY_SOURCE_LABEL = { ai: 'AI 生成', human: '人工录入', import: '导入' }

/** 默认本体容器 id：没有指定本体时资产落这里。 */
export const ONTOLOGY_DEFAULT_ID = 'default'

/** 三层语义（与行业无关的建模原语）。 */
export const ONTOLOGY_LAYERS = [
  { id: 'data', label: '数据层', hint: '业务对象、关系、实例与术语', kinds: ['object', 'relation', 'individual', 'vocabulary'] },
  { id: 'logic', label: '逻辑层', hint: '可判定的业务规则与数据校验形状', kinds: ['rule', 'shape'] },
  { id: 'action', label: '行动层', hint: '面向系统 API 与智能体指令的行动与应用', kinds: ['action', 'application'] },
]

/** 八类资产。属性挂在对象上，不单独成类。 */
export const ONTOLOGY_KINDS = ['object', 'relation', 'rule', 'action', 'vocabulary', 'individual', 'shape', 'application']
export const ONTOLOGY_KIND_LABEL = {
  object: '业务对象', relation: '对象关系', rule: '业务规则', action: '可调用行动',
  vocabulary: '术语方案', individual: '对象实例', shape: '校验形状', application: '应用场景',
}

/** 每类资产在台账里的数组名（新增资产类型时只改这张表）。 */
export const ONTOLOGY_KIND_LIST = {
  object: 'objects',
  relation: 'relations',
  rule: 'rules',
  action: 'actions',
  vocabulary: 'vocabularies',
  individual: 'individuals',
  shape: 'shapes',
  application: 'applications',
  service: 'services',
  guide: 'guides',
}

/** 知识库类资产（平台操作手册）：不属于建模八类，但同样存在台账里。 */
export const ONTOLOGY_LIBRARY_KINDS = ['guide']

/** 属性类型。 */
export const ONTOLOGY_ATTRIBUTE_TYPES = ['string', 'text', 'number', 'money', 'percent', 'date', 'datetime', 'boolean', 'enum', 'uri', 'reference', 'json']
export const ONTOLOGY_ATTRIBUTE_TYPE_LABEL = {
  string: '字符串', text: '长文本', number: '数值', money: '金额', percent: '百分比',
  date: '日期', datetime: '日期时间', boolean: '布尔', enum: '枚举', uri: '标识符',
  reference: '引用', json: '结构化',
}
/** 关系基数。 */
export const ONTOLOGY_CARDINALITIES = ['1-1', '1-N', 'N-1', 'N-N']
/** 规则类型：约束 / 推导 / 默认值 / 计算 / 路由。 */
export const ONTOLOGY_RULE_TYPES = ['constraint', 'derivation', 'default', 'calculation', 'routing']
export const ONTOLOGY_RULE_TYPE_LABEL = { constraint: '约束', derivation: '推导', default: '默认值', calculation: '计算', routing: '路由' }
/** 规则表达语言：自然语言口径、SHACL 约束、JSONLogic、结构化查询、SQL 表达式。 */
export const ONTOLOGY_EXPRESSION_LANGUAGES = ['natural', 'shacl', 'jsonlogic', 'sqlish', 'formula']
export const ONTOLOGY_EXPRESSION_LANGUAGE_LABEL = {
  natural: '自然语言口径', shacl: 'SHACL 约束', jsonlogic: 'JSONLogic', sqlish: '结构化查询', formula: '公式',
}
/** 行动类型：查询 / 命令 / 流程 / 事件。 */
export const ONTOLOGY_ACTION_KINDS = ['query', 'command', 'workflow', 'event']
export const ONTOLOGY_ACTION_KIND_LABEL = { query: '查询', command: '命令', workflow: '流程', event: '事件' }
/** 校验形状的算子（SHACL 风格）。 */
export const ONTOLOGY_SHAPE_OPERATORS = ['minCount', 'maxCount', 'datatype', 'minInclusive', 'maxInclusive', 'pattern', 'in', 'class', 'nodeKind']
export const ONTOLOGY_SHAPE_OPERATOR_LABEL = {
  minCount: '至少出现', maxCount: '最多出现', datatype: '数据类型', minInclusive: '最小值', maxInclusive: '最大值',
  pattern: '正则', in: '取值集合', class: '属于某类', nodeKind: '节点形态',
}

/** 服务封装的四类：对象 / 关系 / 规则 / 行动。 */
export const ONTOLOGY_PACKAGINGS = ['object', 'relation', 'rule', 'action']
export const ONTOLOGY_PROTOCOLS = ['mcp', 'sdk']

/** 稳定 id：同名同种子 → 同 id，重复登记走更新而不是产生两条。 */
export function ontologyId(prefix, seed) {
  let hash = 0
  const s = String(seed ?? '')
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return `${prefix}-${hash.toString(36)}`
}

function pickEnum(list, value, fallback) {
  return list.includes(value) ? value : fallback
}

function str(value, max = 200) {
  // domain.text() 对空串 / 非字符串返回 undefined，这里统一兜成 ''。
  const out = text(typeof value === 'string' ? value : '', max)
  return typeof out === 'string' ? out.trim() : ''
}

function strList(value, max = 20, maxLen = 120) {
  if (!Array.isArray(value)) return []
  return value.map(item => str(item, maxLen)).filter(item => item !== '').slice(0, max)
}

/* ------------------------------------------------------------------ *
 * 本体容器（多本体：各自有前缀 / 命名空间 / 版本）
 * ------------------------------------------------------------------ */

/** 本体容器：一个命名空间下的资产集合。 */
export function sanitizeOntologyContainer(raw, index = 0) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  const name = str(input.name ?? input.title ?? '', 80)
  return {
    id: str(input.id ?? '', 60) || (name === '' ? ONTOLOGY_DEFAULT_ID : ontologyId('ont', name)),
    name,
    prefix: str(input.prefix ?? '', 20) || 'onto',
    namespace: str(input.namespace ?? '', 200),
    version: str(input.version ?? '', 20) || '0.1.0',
    description: str(input.description ?? '', 800),
    owner: str(input.owner ?? '', 40),
    tags: strList(input.tags, 12, 30),
    createdAt: Number(input.createdAt) || 0,
    updatedAt: Number(input.updatedAt) || 0,
  }
}

/** 默认本体：所有没指定本体的资产都落这里。 */
export function defaultOntologyContainer() {
  return sanitizeOntologyContainer({
    id: ONTOLOGY_DEFAULT_ID,
    name: '默认本体',
    prefix: 'onto',
    namespace: '',
    version: '0.1.0',
    description: '未指定本体的资产默认落在这里。可在语义层页签里新建本体来区分不同项目或领域。',
  })
}

/* ------------------------------------------------------------------ *
 * 资产
 * ------------------------------------------------------------------ */

/**
 * 校准记录：专家对 AI 草稿的结论（通过/废弃 + 一句话 + 谁说的）。
 * 必须原样保留——资产每次加载都会过清洗器，丢掉就等于没写过校准。
 */
function sanitizeCalibration(raw) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  const note = str(input.note ?? '', 400)
  if (note === '') return null
  return {
    decision: pickEnum(ONTOLOGY_ASSET_STATUS, str(input.decision ?? '', 20), 'approved'),
    note,
    by: str(input.by ?? '', 40),
    at: Number(input.at) || 0,
  }
}

/** 属性：对象的字段，带类型、必填、取值范围。 */
export function sanitizeOntologyAttribute(raw, index = 0) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  const name = str(input.name ?? input.title ?? '', 80)
  const enumValues = Array.isArray(input.enum)
    ? input.enum.map(item => str(item, 40)).filter(item => item !== '').slice(0, 50)
    : []
  return {
    id: str(input.id ?? '', 60) || ontologyId('att', `${index}:${name}`),
    name,
    type: pickEnum(ONTOLOGY_ATTRIBUTE_TYPES, str(input.type ?? '', 20), 'string'),
    required: input.required === true,
    enum: enumValues,
    description: str(input.description ?? '', 400),
    source: pickEnum(ONTOLOGY_SOURCES, str(input.source ?? '', 20), 'ai'),
  }
}

/** 业务对象：语义层的核心，属性挂在它身上。 */
export function sanitizeOntologyObject(raw, index = 0) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  const name = str(input.name ?? input.title ?? '', 80)
  const attributes = Array.isArray(input.attributes)
    ? input.attributes.map((item, i) => sanitizeOntologyAttribute(item, i)).filter(item => item.name !== '')
    : []
  return {
    id: str(input.id ?? '', 60) || ontologyId('obj', `${str(input.ontologyId ?? '', 60)}:${name || `object-${index}`}`),
    ontologyId: str(input.ontologyId ?? '', 60) || ONTOLOGY_DEFAULT_ID,
    name,
    code: str(input.code ?? '', 40),
    domain: str(input.domain ?? '', 60),
    description: str(input.description ?? '', 1000),
    parentClass: str(input.parentClass ?? input.extends ?? '', 60),
    status: pickEnum(ONTOLOGY_ASSET_STATUS, str(input.status ?? '', 20), 'draft'),
    source: pickEnum(ONTOLOGY_SOURCES, str(input.source ?? '', 20), 'ai'),
    origin: str(input.origin ?? '', 200),
    attributes,
    by: str(input.by ?? '', 40),
    calibration: sanitizeCalibration(input.calibration),
    updatedAt: Number(input.updatedAt) || 0,
  }
}

/** 对象关系：谁指向谁、基数是什么。 */
export function sanitizeOntologyRelation(raw, index = 0) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  const name = str(input.name ?? input.title ?? '', 80)
  const from = str(input.from ?? input.source ?? '', 60)
  const to = str(input.to ?? input.target ?? '', 60)
  return {
    id: str(input.id ?? '', 60) || ontologyId('rel', `${from}:${to}:${name}`),
    ontologyId: str(input.ontologyId ?? '', 60) || ONTOLOGY_DEFAULT_ID,
    name,
    from,
    to,
    cardinality: pickEnum(ONTOLOGY_CARDINALITIES, str(input.cardinality ?? '', 10), 'N-N'),
    sourceAttribute: str(input.sourceAttribute ?? '', 60),
    targetAttribute: str(input.targetAttribute ?? '', 60),
    description: str(input.description ?? '', 600),
    status: pickEnum(ONTOLOGY_ASSET_STATUS, str(input.status ?? '', 20), 'draft'),
    source: pickEnum(ONTOLOGY_SOURCES, str(input.source ?? '', 20), 'ai'),
    by: str(input.by ?? '', 40),
    calibration: sanitizeCalibration(input.calibration),
    updatedAt: Number(input.updatedAt) || 0,
  }
}

/** 业务规则：可判定的口径，智能体据此推理。 */
export function sanitizeOntologyRule(raw, index = 0) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  const name = str(input.name ?? input.title ?? '', 80)
  return {
    id: str(input.id ?? '', 60) || ontologyId('rule', `${str(input.ontologyId ?? '', 60)}:${name || `rule-${index}`}`),
    ontologyId: str(input.ontologyId ?? '', 60) || ONTOLOGY_DEFAULT_ID,
    name,
    type: pickEnum(ONTOLOGY_RULE_TYPES, str(input.type ?? '', 20), 'constraint'),
    expression: str(input.expression ?? '', 600),
    expressionLanguage: pickEnum(ONTOLOGY_EXPRESSION_LANGUAGES, str(input.expressionLanguage ?? '', 20), 'natural'),
    scope: str(input.scope ?? '', 120),
    priority: Number(input.priority) || 0,
    dependsOn: strList(input.dependsOn, 12, 60),
    description: str(input.description ?? '', 600),
    status: pickEnum(ONTOLOGY_ASSET_STATUS, str(input.status ?? '', 20), 'draft'),
    source: pickEnum(ONTOLOGY_SOURCES, str(input.source ?? '', 20), 'ai'),
    by: str(input.by ?? '', 40),
    calibration: sanitizeCalibration(input.calibration),
    updatedAt: Number(input.updatedAt) || 0,
  }
}

/** 可调用行动：面向系统 API 与智能体指令的动作。 */
export function sanitizeOntologyAction(raw, index = 0) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  const name = str(input.name ?? input.title ?? '', 80)
  const params = Array.isArray(input.params)
    ? input.params.map(item => (typeof item === 'string'
      ? { name: str(item, 60), type: 'string', required: false }
      : {
        name: str(item?.name ?? '', 60),
        type: pickEnum(ONTOLOGY_ATTRIBUTE_TYPES, str(item?.type ?? '', 20), 'string'),
        required: item?.required === true,
        description: str(item?.description ?? '', 200),
      })).filter(item => item.name !== '')
    : []
  return {
    id: str(input.id ?? '', 60) || ontologyId('act', `${str(input.ontologyId ?? '', 60)}:${name || `action-${index}`}`),
    ontologyId: str(input.ontologyId ?? '', 60) || ONTOLOGY_DEFAULT_ID,
    name,
    kind: pickEnum(ONTOLOGY_ACTION_KINDS, str(input.kind ?? input.type ?? '', 20), 'command'),
    target: str(input.target ?? '', 120),
    params,
    result: str(input.result ?? '', 400),
    preconditions: strList(input.preconditions, 12, 200),
    sideEffects: str(input.sideEffects ?? '', 300),
    idempotent: input.idempotent === true,
    permissions: strList(input.permissions, 12, 40),
    description: str(input.description ?? '', 600),
    status: pickEnum(ONTOLOGY_ASSET_STATUS, str(input.status ?? '', 20), 'draft'),
    source: pickEnum(ONTOLOGY_SOURCES, str(input.source ?? '', 20), 'ai'),
    by: str(input.by ?? '', 40),
    calibration: sanitizeCalibration(input.calibration),
    updatedAt: Number(input.updatedAt) || 0,
  }
}

/** 术语方案：统一命名与口径（SKOS 风格概念体系）。 */
export function sanitizeOntologyVocabulary(raw, index = 0) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  const name = str(input.name ?? input.title ?? '', 80)
  const concepts = Array.isArray(input.concepts)
    ? input.concepts.map((item, i) => {
      const concept = item !== null && typeof item === 'object' ? item : {}
      const term = str(concept.term ?? concept.name ?? '', 60)
      return {
        id: str(concept.id ?? '', 60) || ontologyId('cpt', `${name}:${term || i}`),
        term,
        label: str(concept.label ?? '', 80),
        definition: str(concept.definition ?? '', 400),
        broader: str(concept.broader ?? '', 60),
        narrower: strList(concept.narrower, 12, 60),
        related: strList(concept.related, 12, 60),
      }
    }).filter(item => item.term !== '' || item.label !== '')
    : []
  return {
    id: str(input.id ?? '', 60) || ontologyId('voc', `${str(input.ontologyId ?? '', 60)}:${name || `vocabulary-${index}`}`),
    ontologyId: str(input.ontologyId ?? '', 60) || ONTOLOGY_DEFAULT_ID,
    name,
    scheme: str(input.scheme ?? '', 120),
    description: str(input.description ?? '', 600),
    concepts,
    status: pickEnum(ONTOLOGY_ASSET_STATUS, str(input.status ?? '', 20), 'draft'),
    source: pickEnum(ONTOLOGY_SOURCES, str(input.source ?? '', 20), 'ai'),
    by: str(input.by ?? '', 40),
    calibration: sanitizeCalibration(input.calibration),
    updatedAt: Number(input.updatedAt) || 0,
  }
}

/** 对象实例：某个对象的真实数据（导入或运行时产生）。 */
export function sanitizeOntologyIndividual(raw, index = 0) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  const name = str(input.name ?? input.title ?? '', 120)
  const properties = input.properties !== null && typeof input.properties === 'object' && !Array.isArray(input.properties)
    ? Object.fromEntries(Object.entries(input.properties).slice(0, 60).map(([key, value]) => [str(key, 60), typeof value === 'object' ? JSON.stringify(value).slice(0, 400) : str(value, 400)]))
    : {}
  return {
    id: str(input.id ?? '', 60) || ontologyId('ind', `${str(input.ontologyId ?? '', 60)}:${name || `individual-${index}`}`),
    ontologyId: str(input.ontologyId ?? '', 60) || ONTOLOGY_DEFAULT_ID,
    classRef: str(input.classRef ?? input.class ?? '', 60),
    name,
    properties,
    description: str(input.description ?? '', 400),
    status: pickEnum(ONTOLOGY_ASSET_STATUS, str(input.status ?? '', 20), 'draft'),
    source: pickEnum(ONTOLOGY_SOURCES, str(input.source ?? '', 20), 'import'),
    by: str(input.by ?? '', 40),
    calibration: sanitizeCalibration(input.calibration),
    updatedAt: Number(input.updatedAt) || 0,
  }
}

/** 校验形状：数据必须满足的形状约束（SHACL 风格）。 */
export function sanitizeOntologyShape(raw, index = 0) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  const name = str(input.name ?? input.title ?? '', 80)
  const constraints = Array.isArray(input.constraints)
    ? input.constraints.map(item => {
      const constraint = item !== null && typeof item === 'object' ? item : {}
      return {
        path: str(constraint.path ?? '', 60),
        operator: pickEnum(ONTOLOGY_SHAPE_OPERATORS, str(constraint.operator ?? '', 20), 'minCount'),
        value: str(constraint.value ?? '', 200),
        message: str(constraint.message ?? '', 300),
      }
    }).filter(item => item.path !== '')
    : []
  return {
    id: str(input.id ?? '', 60) || ontologyId('shp', `${str(input.ontologyId ?? '', 60)}:${name || `shape-${index}`}`),
    ontologyId: str(input.ontologyId ?? '', 60) || ONTOLOGY_DEFAULT_ID,
    name,
    targetClass: str(input.targetClass ?? '', 60),
    severity: pickEnum(['blocker', 'warn', 'info'], str(input.severity ?? '', 10), 'blocker'),
    constraints,
    description: str(input.description ?? '', 600),
    status: pickEnum(ONTOLOGY_ASSET_STATUS, str(input.status ?? '', 20), 'draft'),
    source: pickEnum(ONTOLOGY_SOURCES, str(input.source ?? '', 20), 'ai'),
    by: str(input.by ?? '', 40),
    calibration: sanitizeCalibration(input.calibration),
    updatedAt: Number(input.updatedAt) || 0,
  }
}

/** 应用场景：一次要交付的应用，用到哪些本体资产。 */
export function sanitizeOntologyApplication(raw, index = 0) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  const name = str(input.name ?? input.title ?? '', 80)
  return {
    id: str(input.id ?? '', 60) || ontologyId('app', `${str(input.ontologyId ?? '', 60)}:${name || `application-${index}`}`),
    ontologyId: str(input.ontologyId ?? '', 60) || ONTOLOGY_DEFAULT_ID,
    name,
    purpose: str(input.purpose ?? '', 800),
    actors: strList(input.actors, 12, 60),
    inputs: strList(input.inputs, 12, 120),
    outputs: strList(input.outputs, 12, 120),
    assets: strList(input.assets, 40, 60),
    description: str(input.description ?? '', 600),
    status: pickEnum(ONTOLOGY_ASSET_STATUS, str(input.status ?? '', 20), 'draft'),
    source: pickEnum(ONTOLOGY_SOURCES, str(input.source ?? '', 20), 'ai'),
    by: str(input.by ?? '', 40),
    calibration: sanitizeCalibration(input.calibration),
    updatedAt: Number(input.updatedAt) || 0,
  }
}

/** 服务封装：把本体资产包成 MCP 工具或专有 SDK。 */
export function sanitizeOntologyService(raw, index = 0) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  const name = str(input.name ?? input.title ?? '', 80)
  return {
    id: str(input.id ?? '', 60) || ontologyId('svc', name || `service-${index}`),
    name,
    protocol: pickEnum(ONTOLOGY_PROTOCOLS, str(input.protocol ?? '', 20), 'mcp'),
    packaging: pickEnum(ONTOLOGY_PACKAGINGS, str(input.packaging ?? '', 20), 'object'),
    endpoint: str(input.endpoint ?? '', 200),
    description: str(input.description ?? '', 600),
    enabled: input.enabled !== false,
    by: str(input.by ?? '', 40),
    calibration: sanitizeCalibration(input.calibration),
    updatedAt: Number(input.updatedAt) || 0,
  }
}

/** 平台操作手册：用户后续提供的自家平台说明书，教人怎么在平台上操作。 */
export function sanitizeOntologyGuide(raw, index = 0) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  const title = str(input.title ?? input.name ?? '', 120)
  return {
    id: str(input.id ?? '', 60) || ontologyId('gud', `${title || `guide-${index}`}`),
    name: title,
    title,
    section: str(input.section ?? '', 20),
    source: str(input.source ?? '', 200),
    body: str(input.body ?? input.content ?? '', 20000),
    tags: strList(input.tags, 12, 30),
    // 手册是参考资料（内置手册书或用户上传），默认已确认，不进「AI 草稿待校准」的闸门。
    status: pickEnum(ONTOLOGY_ASSET_STATUS, str(input.status ?? '', 20), 'approved'),
    by: str(input.by ?? '', 40),
    calibration: sanitizeCalibration(input.calibration),
    updatedAt: Number(input.updatedAt) || 0,
  }
}

/* ------------------------------------------------------------------ *
 * 台账
 * ------------------------------------------------------------------ */

const ASSET_SANITIZERS = {
  object: sanitizeOntologyObject,
  relation: sanitizeOntologyRelation,
  rule: sanitizeOntologyRule,
  action: sanitizeOntologyAction,
  vocabulary: sanitizeOntologyVocabulary,
  individual: sanitizeOntologyIndividual,
  shape: sanitizeOntologyShape,
  application: sanitizeOntologyApplication,
  service: sanitizeOntologyService,
  guide: sanitizeOntologyGuide,
}

/**
 * 同一 id 只留一条：历史台账里可能藏着重复条目（早期关系 id 只按名字生成，
 * 后来改成「起点:终点:名字」后，两种 id 会同时留在台账里）。
 * 保留更新时间更新的那条，避免把刚校准过的资产覆盖回旧版本。
 */
function uniqueById(items) {
  const map = new Map()
  for (const item of items) {
    const prev = map.get(item.id)
    if (prev === undefined || Number(item.updatedAt || 0) >= Number(prev.updatedAt || 0)) map.set(item.id, item)
  }
  return [...map.values()]
}

/** 整份本体台账的形状（state.ontology）。 */
export function sanitizeOntology(raw) {
  const input = raw !== null && typeof raw === 'object' ? raw : {}
  const ontologies = Array.isArray(input.ontologies) && input.ontologies.length > 0
    ? input.ontologies.map((item, i) => sanitizeOntologyContainer(item, i))
    : [defaultOntologyContainer()]
  const list = key => (Array.isArray(input[key]) ? input[key] : [])
  return {
    ontologies,
    objects: uniqueById(list('objects').map((item, i) => sanitizeOntologyObject(item, i))),
    relations: uniqueById(list('relations').map((item, i) => sanitizeOntologyRelation(item, i))),
    rules: uniqueById(list('rules').map((item, i) => sanitizeOntologyRule(item, i))),
    actions: uniqueById(list('actions').map((item, i) => sanitizeOntologyAction(item, i))),
    vocabularies: uniqueById(list('vocabularies').map((item, i) => sanitizeOntologyVocabulary(item, i))),
    individuals: uniqueById(list('individuals').map((item, i) => sanitizeOntologyIndividual(item, i))),
    shapes: uniqueById(list('shapes').map((item, i) => sanitizeOntologyShape(item, i))),
    applications: uniqueById(list('applications').map((item, i) => sanitizeOntologyApplication(item, i))),
    services: uniqueById(list('services').map((item, i) => sanitizeOntologyService(item, i))),
    guides: uniqueById(list('guides').map((item, i) => sanitizeOntologyGuide(item, i))),
    updatedAt: Number(input.updatedAt) || 0,
  }
}

/** 空台账（默认带一个「默认本体」容器）。 */
export function emptyOntology() {
  return {
    ontologies: [defaultOntologyContainer()],
    objects: [], relations: [], rules: [], actions: [],
    vocabularies: [], individuals: [], shapes: [], applications: [],
    services: [], guides: [],
    updatedAt: 0,
  }
}

/** 统计：各层资产数量，以及已确认与草稿的分布。 */
export function ontologyStats(ontology) {
  const data = sanitizeOntology(ontology)
  const attributes = data.objects.reduce((sum, item) => sum + item.attributes.length, 0)
  const core = [...data.objects, ...data.relations, ...data.rules, ...data.actions]
  const all = [...core, ...data.vocabularies, ...data.individuals, ...data.shapes, ...data.applications]
  const approved = all.filter(item => item.status === 'approved').length
  const drafts = all.filter(item => item.status === 'draft').length
  const deprecated = all.filter(item => item.status === 'deprecated').length
  const ai = all.filter(item => item.source === 'ai').length
  return {
    ontologies: data.ontologies.length,
    objects: data.objects.length,
    attributes,
    relations: data.relations.length,
    rules: data.rules.length,
    actions: data.actions.length,
    vocabularies: data.vocabularies.length,
    concepts: data.vocabularies.reduce((sum, item) => sum + item.concepts.length, 0),
    individuals: data.individuals.length,
    shapes: data.shapes.length,
    applications: data.applications.length,
    services: data.services.length,
    guides: data.guides.length,
    approved,
    drafts,
    deprecated,
    ai,
    total: approved + drafts + deprecated,
  }
}

/** 缺口分析：找出语义层里「还不成立」的地方，给专家当校准清单。 */
export function ontologyCoverage(ontology) {
  const data = sanitizeOntology(ontology)
  // 已废弃的资产不再报缺口：专家废弃它就等于不要它了。
  const live = item => item.status !== 'deprecated'
  const objects = data.objects.filter(live)
  const relations = data.relations.filter(live)
  const rules = data.rules.filter(live)
  const actions = data.actions.filter(live)
  const shapes = data.shapes.filter(live)
  const objectNames = new Set(objects.map(item => item.name).filter(item => item !== ''))
  const objectIds = new Set(objects.map(item => item.id))
  const objectWithoutAttribute = objects.filter(item => item.attributes.length === 0).map(item => item.name)
  const danglingRelations = relations
    .filter(item => {
      const fromOk = objectNames.has(item.from) || objectIds.has(item.from)
      const toOk = objectNames.has(item.to) || objectIds.has(item.to)
      return !fromOk || !toOk
    })
    .map(item => `${item.from} → ${item.to}`)
  const rulesWithoutExpression = rules.filter(item => item.expression === '').map(item => item.name)
  const actionsWithoutTarget = actions.filter(item => item.target === '').map(item => item.name)
  const shapesWithoutConstraint = shapes.filter(item => item.constraints.length === 0).map(item => item.name)
  const shapesWithUnknownTarget = shapes
    .filter(item => item.targetClass !== '' && !objectNames.has(item.targetClass) && !objectIds.has(item.targetClass))
    .map(item => `${item.name} → ${item.targetClass}`)
  return {
    objectWithoutAttribute,
    danglingRelations,
    rulesWithoutExpression,
    actionsWithoutTarget,
    shapesWithoutConstraint,
    shapesWithUnknownTarget,
    issues: objectWithoutAttribute.length + danglingRelations.length + rulesWithoutExpression.length
      + actionsWithoutTarget.length + shapesWithoutConstraint.length + shapesWithUnknownTarget.length,
  }
}

/** 校准闸门：草稿没过专家校准（或语义层太空）时，不许进入服务共享阶段。 */
export function ontologyGate(config, ontology) {
  const cfg = config?.ontology ?? {}
  const enabled = cfg.reviewRequired === true
  const stats = ontologyStats(ontology)
  const blockers = []
  if (enabled) {
    if (stats.objects === 0) blockers.push('语义层还没有任何业务对象')
    if (stats.drafts > 0) blockers.push(`还有 ${stats.drafts} 项 AI 草稿没过专家校准`)
  }
  return { needed: enabled, ready: blockers.length === 0, blockers }
}

/* ------------------------------------------------------------------ *
 * 读写
 * ------------------------------------------------------------------ */

function collectionOf(ontology, kind) {
  const data = sanitizeOntology(ontology)
  const key = ONTOLOGY_KIND_LIST[kind]
  if (key === undefined) return []
  return data[key]
}

/** 取某一类资产（给路由与工具用）。 */
export function ontologyAssets(ontology, kind) {
  return collectionOf(ontology, kind)
}

/** 登记或更新一项资产（按 kind + id / name 幂等）。 */
export function upsertOntologyAsset(ontology, kind, raw, by = '') {
  const data = sanitizeOntology(ontology)
  const list = ONTOLOGY_KIND_LIST[kind]
  const sanitizer = ASSET_SANITIZERS[kind]
  if (list === undefined || sanitizer === undefined) return data
  const asset = sanitizer({ ...(raw ?? {}), by: str(raw?.by ?? by, 40) }, data[list].length)
  // 没指定本体的资产归到默认本体，否则它既不在「默认本体」下、也查不到归属。
  if (str(asset.ontologyId, 40) === '') asset.ontologyId = ONTOLOGY_DEFAULT_ID
  asset.updatedAt = Date.now()
  // 身份比较统一走 str()：没有 name/from/to 的资产（如手册）不能互相误判为同一条，
  // 否则第一条手册会把后面所有手册覆盖掉。
  const assetName = str(asset.name ?? '', 120)
  const assetFrom = str(asset.from ?? '', 120)
  const assetTo = str(asset.to ?? '', 120)
  const index = data[list].findIndex(item => item.id === asset.id
    || (assetName !== '' && str(item.name ?? '', 120) === assetName && asset.ontologyId === item.ontologyId
      && assetFrom === str(item.from ?? '', 120) && assetTo === str(item.to ?? '', 120)))
  if (index >= 0) {
    const previous = data[list][index]
    // 重新登记不能把专家写过的校准结论抹掉：新的没带校准就沿用旧的。
    data[list][index] = {
      ...previous,
      ...asset,
      calibration: asset.calibration ?? previous.calibration ?? null,
    }
  } else data[list].push(asset)
  data.updatedAt = Date.now()
  return data
}

/** 删除一项资产。 */
export function removeOntologyAsset(ontology, kind, id) {
  const data = sanitizeOntology(ontology)
  const list = ONTOLOGY_KIND_LIST[kind]
  if (list === undefined) return { ontology: data, removed: 0 }
  const before = data[list].length
  data[list] = data[list].filter(item => item.id !== id && item.name !== id)
  data.updatedAt = Date.now()
  return { ontology: data, removed: before - data[list].length }
}

/** 专家校准：通过（approved）或废弃（deprecated），并留校准说明。 */
export function reviewOntologyAsset(ontology, kind, id, decision, note = '', by = '') {
  const data = sanitizeOntology(ontology)
  const list = ONTOLOGY_KIND_LIST[kind]
  if (list === undefined) return { ontology: data, found: false }
  const target = data[list].find(item => item.id === id || item.name === id)
  if (target === undefined) return { ontology: data, found: false }
  const status = decision === 'approved' ? 'approved' : decision === 'deprecated' ? 'deprecated' : target.status
  const calibration = { decision, note: str(note, 400), by: str(by, 40), at: Date.now() }
  const next = data[list].map(item => (item.id === target.id
    ? { ...item, status, source: item.source === 'ai' && status === 'approved' ? 'human' : item.source, calibration, updatedAt: Date.now() }
    : item))
  data[list] = next
  data.updatedAt = Date.now()
  return { ontology: data, found: true, asset: next.find(item => item.id === target.id) }
}

/* ------------------------------------------------------------------ *
 * 本体容器管理
 * ------------------------------------------------------------------ */

/** 新建或更新一个本体容器。 */
export function upsertOntologyContainer(ontology, raw) {
  const data = sanitizeOntology(ontology)
  const container = sanitizeOntologyContainer(raw, data.ontologies.length)
  container.updatedAt = Date.now()
  if (container.createdAt === 0) container.createdAt = Date.now()
  const index = data.ontologies.findIndex(item => item.id === container.id || (container.name !== '' && item.name === container.name))
  if (index >= 0) data.ontologies[index] = { ...data.ontologies[index], ...container }
  else data.ontologies.push(container)
  if (!data.ontologies.some(item => item.id === ONTOLOGY_DEFAULT_ID)) {
    data.ontologies.unshift(defaultOntologyContainer())
  }
  data.updatedAt = Date.now()
  return data
}

/** 删除一个本体容器（默认本体不可删）。 */
export function removeOntologyContainer(ontology, id) {
  const data = sanitizeOntology(ontology)
  if (id === ONTOLOGY_DEFAULT_ID) return { ontology: data, removed: 0 }
  const before = data.ontologies.length
  data.ontologies = data.ontologies.filter(item => item.id !== id && item.name !== id)
  data.updatedAt = Date.now()
  return { ontology: data, removed: before - data.ontologies.length }
}

/** 取某个本体的资产（不传则全部）。 */
export function ontologyOf(ontology, ontologyId) {
  const data = sanitizeOntology(ontology)
  if (ontologyId === undefined || ontologyId === null || ontologyId === '') return data
  const id = String(ontologyId)
  const pick = list => list.filter(item => item.ontologyId === id)
  return {
    ...data,
    objects: pick(data.objects),
    relations: pick(data.relations),
    rules: pick(data.rules),
    actions: pick(data.actions),
    vocabularies: pick(data.vocabularies),
    individuals: pick(data.individuals),
    shapes: pick(data.shapes),
    applications: pick(data.applications),
  }
}

/* ------------------------------------------------------------------ *
 * 建模建议（副驾的核心：告诉人还差什么、怎么改）
 * ------------------------------------------------------------------ */

const REVIEW_LEVELS = { blocker: '必须改', warn: '建议改', info: '可选' }

/**
 * 建模建议清单：把「这个模型还不成立 / 不该这么建」的地方列出来，按严重度排序。
 * 领域无关，只看结构与可判定性。
 */
export function ontologyReview(ontology) {
  const data = sanitizeOntology(ontology)
  const findings = []
  const push = (level, kind, subject, message, fix) => findings.push({ id: ontologyId('fnd', `${kind}:${subject}:${message}`), level, kind, subject, message, fix })

  const objectNames = new Set(data.objects.map(item => item.name))
  const objectIds = new Set(data.objects.map(item => item.id))
  const ruleNames = new Set(data.rules.map(item => item.name))

  for (const object of data.objects) {
    if (object.attributes.length === 0) push('blocker', 'object', object.name, '对象没有任何属性，无法生成数据模型与接口', '至少补 2-3 个字段：标识、状态、责任人或时间')
    if (object.code === '') push('warn', 'object', object.name, '对象没有编码，前后端无法引用', '给一个稳定的英文编码（建议小写蛇形）')
    if (object.description === '') push('info', 'object', object.name, '对象没有说明，AI 与新人容易理解偏', '一句话写清它代表什么、边界在哪')
    if (object.parentClass !== '' && !objectNames.has(object.parentClass) && !objectIds.has(object.parentClass)) {
      push('warn', 'object', object.name, `继承的父类「${object.parentClass}」不存在`, '改成本体里已有的对象，或先建这个父类')
    }
  }

  // 继承环：父类链不能成环。
  for (const object of data.objects) {
    const seen = new Set([object.name])
    let cursor = object.parentClass
    let guard = 0
    while (cursor !== '' && guard < 20) {
      if (seen.has(cursor)) {
        push('blocker', 'object', object.name, `继承链成环（${[...seen].join(' → ')}）`, '断开其中一条继承关系')
        break
      }
      seen.add(cursor)
      const parent = data.objects.find(item => item.name === cursor)
      cursor = parent?.parentClass ?? ''
      guard += 1
    }
  }

  for (const relation of data.relations) {
    const fromOk = objectNames.has(relation.from) || objectIds.has(relation.from)
    const toOk = objectNames.has(relation.to) || objectIds.has(relation.to)
    if (!fromOk || !toOk) push('blocker', 'relation', relation.name, `关系指向不存在的对象（${relation.from} → ${relation.to}）`, '改成本体里已有的对象名，或补建缺失的对象')
    if (relation.cardinality === 'N-N' && relation.description === '') push('info', 'relation', relation.name, '多对多关系且没有说明', '写清关联的业务含义与唯一性口径')
  }

  for (const rule of data.rules) {
    if (rule.expression === '') push('blocker', 'rule', rule.name, '规则没有判定表达式，无法执行', '写成可判定的条件：谁、在什么条件下、得到什么结论')
    if (rule.expression !== '' && rule.expressionLanguage === 'natural') push('info', 'rule', rule.name, '规则只用自然语言描述，机器判不了', '补一段可执行表达式（SHACL / JSONLogic / 查询口径）')
    for (const dep of rule.dependsOn) {
      if (!ruleNames.has(dep)) push('warn', 'rule', rule.name, `依赖的规则「${dep}」不存在`, '改成本体里已有的规则名，或去掉依赖')
    }
  }

  for (const action of data.actions) {
    if (action.target === '') push('blocker', 'action', action.name, '行动没有目标系统，无法落成接口', '写明落到哪个系统/接口（路径或服务名）')
    if (action.result === '') push('warn', 'action', action.name, '行动没有写返回值', '补一句返回什么，调用方才知道怎么用')
    if (action.kind === 'command' && action.idempotent !== true && action.preconditions.length === 0) {
      push('warn', 'action', action.name, '写操作既没标幂等也没有前置条件', '补前置条件或说明为何可安全重试')
    }
  }

  for (const shape of data.shapes) {
    if (shape.constraints.length === 0) push('warn', 'shape', shape.name, '校验形状没有任何约束', '至少加一条必填或类型约束')
    if (shape.targetClass !== '' && !objectNames.has(shape.targetClass) && !objectIds.has(shape.targetClass)) {
      push('warn', 'shape', shape.name, `校验的目标类「${shape.targetClass}」不存在`, '改成已有对象名')
    }
  }

  for (const application of data.applications) {
    if (application.purpose === '') push('warn', 'application', application.name, '应用没有写清目的', '一句话写清为谁解决什么问题')
    if (application.assets.length === 0) push('info', 'application', application.name, '应用没有关联任何本体资产', '挂上它用到的对象 / 规则 / 行动')
  }

  for (const vocabulary of data.vocabularies) {
    for (const concept of vocabulary.concepts) {
      if (concept.label === '') push('info', 'vocabulary', `${vocabulary.name} · ${concept.term}`, '术语没有展示名', '补中文名与英文名')
    }
  }

  const knownOntologies = new Set(data.ontologies.map(item => item.id))
  const allAssets = [...data.objects, ...data.relations, ...data.rules, ...data.actions, ...data.shapes, ...data.applications]
  for (const asset of allAssets) {
    if (!knownOntologies.has(asset.ontologyId)) push('warn', asset.kind ?? 'asset', asset.name, `归属的本体「${asset.ontologyId}」不存在`, '把它挂到已有本体，或新建这个本体')
  }

  const drafts = allAssets.filter(item => item.status === 'draft')
  if (drafts.length > 0) push('blocker', 'all', 'AI 草稿', `还有 ${drafts.length} 项 AI 草稿没过专家校准`, '逐条用「通过 / 废弃」校准后再进入服务封装')

  const order = { blocker: 0, warn: 1, info: 2 }
  findings.sort((a, b) => order[a.level] - order[b.level])
  return {
    findings,
    counts: {
      blocker: findings.filter(item => item.level === 'blocker').length,
      warn: findings.filter(item => item.level === 'warn').length,
      info: findings.filter(item => item.level === 'info').length,
    },
    levels: REVIEW_LEVELS,
  }
}

/* ------------------------------------------------------------------ *
 * 上下文与封装
 * ------------------------------------------------------------------ */

/** 智能体提示词里用的一段语义层快照（统一语义层的上下文）。 */
export function ontologySummary(ontology) {
  const data = sanitizeOntology(ontology)
  const stats = ontologyStats(data)
  if (stats.total === 0) return '语义层还是空的：还没有对象、关系、规则或行动。'
  const lines = [
    `语义层现状：对象 ${stats.objects}（属性 ${stats.attributes}）· 关系 ${stats.relations} · 规则 ${stats.rules} · 行动 ${stats.actions}；已确认 ${stats.approved}，AI 草稿 ${stats.drafts}。`,
  ]
  const names = data.objects.slice(0, 40).map(item => item.name).join('、')
  if (names !== '') lines.push(`对象：${names}${data.objects.length > 40 ? ' 等' : ''}`)
  const rules = data.rules.slice(0, 20).map(item => item.name).join('、')
  if (rules !== '') lines.push(`规则：${rules}${data.rules.length > 20 ? ' 等' : ''}`)
  const acts = data.actions.slice(0, 20).map(item => item.name).join('、')
  if (acts !== '') lines.push(`行动：${acts}${data.actions.length > 20 ? ' 等' : ''}`)
  const coverage = ontologyCoverage(data)
  if (coverage.issues > 0) {
    lines.push(`待补：${coverage.objectWithoutAttribute.length} 个对象没有属性，${coverage.danglingRelations.length} 条关系指向不存在的对象，${coverage.rulesWithoutExpression.length} 条规则没有判定表达式。`)
  }
  return lines.join('\n')
}

/** 服务封装 → 通用 MCP 工具定义。 */
export function ontologyMcpTools(ontology, packaging = 'object') {
  const data = sanitizeOntology(ontology)
  const tools = []
  if (packaging === 'object') {
    for (const object of data.objects) {
      tools.push({
        name: `ontology_get_${object.code || object.id}`,
        description: `读取业务对象「${object.name}」的语义定义：${object.description || '（无描述）'}`,
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: `「${object.name}」实例标识` },
            attributes: {
              type: 'array',
              description: '需要返回的属性；留空返回全部',
              items: { type: 'string', enum: object.attributes.map(item => item.name) },
            },
          },
          required: ['id'],
        },
      })
    }
  } else if (packaging === 'relation') {
    tools.push({
      name: 'ontology_traverse',
      description: '沿对象关系遍历语义层，返回关联对象与关系路径',
      inputSchema: {
        type: 'object',
        properties: {
          from: { type: 'string', description: '起点对象名' },
          relation: { type: 'string', description: '关系名，留空表示全部关系' },
          depth: { type: 'number', description: '遍历深度，默认 1' },
        },
        required: ['from'],
      },
    })
  } else if (packaging === 'rule') {
    tools.push({
      name: 'ontology_eval_rule',
      description: '按业务规则判定输入，输出结论与依据',
      inputSchema: {
        type: 'object',
        properties: {
          rule: { type: 'string', description: '规则名' },
          input: { type: 'object', description: '参与判定的字段值' },
        },
        required: ['rule', 'input'],
      },
    })
  } else {
    for (const action of data.actions) {
      tools.push({
        name: `ontology_${action.kind}_${action.id}`,
        description: `执行可调用行动「${action.name}」：${action.description || '（无描述）'}`,
        inputSchema: {
          type: 'object',
          properties: Object.fromEntries(action.params.map(item => [item.name, { type: item.type === 'number' || item.type === 'money' || item.type === 'percent' ? 'number' : item.type === 'boolean' ? 'boolean' : 'string', description: item.description || item.name }])),
          required: action.params.filter(item => item.required).map(item => item.name),
        },
      })
    }
  }
  return tools
}

/** 服务封装 → 专有本体 SDK 片段。 */
export function ontologySdkSnippet(ontology, packaging = 'object') {
  const data = sanitizeOntology(ontology)
  if (packaging === 'object') {
    const rows = data.objects.map(object => {
      const fields = object.attributes.map(item => `  ${item.name}${item.required ? '' : '?'}: ${item.type}`).join('\n')
      return `export interface ${object.code || object.id.replace(/-/g, '_')} {\n${fields === '' ? '  // （暂无属性）' : fields}\n}`
    })
    return [
      '// 本体 SDK · 对象封装（数据层）',
      '// 由本体语义层自动生成，改本体后重新生成。',
      ...rows,
    ].join('\n\n')
  }
  if (packaging === 'relation') {
    return [
      '// 本体 SDK · 关系封装（数据层）',
      'export type RelationPath = { from: string; relation: string; to: string; cardinality: string }',
      `export const RELATIONS: RelationPath[] = [\n${data.relations.map(item => `  { from: '${item.from}', relation: '${item.name}', to: '${item.to}', cardinality: '${item.cardinality}' },`).join('\n')}\n]`,
    ].join('\n')
  }
  if (packaging === 'rule') {
    return [
      '// 本体 SDK · 规则封装（逻辑层）',
      `export const RULES = [\n${data.rules.map(item => `  { name: '${item.name}', type: '${item.type}', scope: '${item.scope}', expression: \`${item.expression}\` },`).join('\n')}\n] as const`,
    ].join('\n')
  }
  return [
    '// 本体 SDK · 行动封装（行动层）',
    `export const ACTIONS = [\n${data.actions.map(item => `  { name: '${item.name}', kind: '${item.kind}', target: '${item.target}', params: [${item.params.map(param => `'${param.name}'`).join(', ')}] },`).join('\n')}\n] as const`,
  ].join('\n')
}

/**
 * 本体应用蓝图：把本体资产翻译成「怎么设计、怎么写、怎么驱动、怎么测」。
 *
 * 这是插件作为「本体应用开发副驾」的核心产出：
 *   数据模型   → 表/集合草案、字段类型映射、外键与索引
 *   规则引擎   → 规则分组、求值顺序、冲突处理、可执行的规则接口骨架
 *   API 契约   → 对象 CRUD / 关系查询 / 行动端点，附 OpenAPI 片段
 *   前端设计   → 页面清单、字段与交互、组件与状态建议
 *   本体驱动   → 从本体生成类型 / 接口 / 校验 / 表单 / 用例的流水线
 *   测试方案   → 可直接落到用例库的 HTTP 用例矩阵 + 规则正反例
 *
 * 纯函数模块：输入本体台账，输出蓝图（Markdown + JSON），不碰 I/O。
 */
import { ontologyOf, ontologyStats } from './ontology.js'

/** 属性类型 → 数据库字段类型（通用映射，按需在工程里改成方言）。 */
const SQL_TYPES = {
  string: 'varchar(128)', text: 'text', number: 'numeric(18,4)', money: 'numeric(18,2)',
  percent: 'numeric(9,4)', date: 'date', datetime: 'timestamp', boolean: 'boolean',
  enum: 'varchar(32)', uri: 'varchar(512)', reference: 'uuid', json: 'jsonb',
}

/** 属性类型 → OpenAPI / TypeScript 类型。 */
function tsType(type) {
  if (type === 'number' || type === 'money' || type === 'percent') return 'number'
  if (type === 'boolean') return 'boolean'
  if (type === 'json') return 'Record<string, unknown>'
  if (type === 'reference') return 'string'
  return 'string'
}

/** 属性类型 → OpenAPI schema。 */
function apiType(type) {
  if (type === 'number' || type === 'money' || type === 'percent') return { type: 'number' }
  if (type === 'boolean') return { type: 'boolean' }
  if (type === 'json') return { type: 'object' }
  return { type: 'string' }
}

function slug(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'item'
}

function tableName(object) {
  return object.code ? slug(object.code) : `${slug(object.name)}_${object.id.slice(-4)}`
}

function plural(value) {
  return value.endsWith('s') ? `${value}es` : `${value}s`
}

/* ------------------------------------------------------------------ *
 * 1. 数据模型设计
 * ------------------------------------------------------------------ */

/** 数据模型：每个对象一张表（集合），字段带类型与必填；关系落成外键或中间表。 */
export function blueprintDataModel(ontology) {
  const data = ontologyOf(ontology)
  const tables = data.objects.map(object => {
    const columns = [
      { name: 'id', type: 'uuid', nullable: false, note: '主键' },
      ...object.attributes.map(attr => ({
        name: attr.name,
        type: SQL_TYPES[attr.type] ?? 'varchar(128)',
        nullable: !attr.required,
        enum: attr.enum.length > 0 ? attr.enum : undefined,
        note: attr.description,
      })),
      { name: 'created_at', type: 'timestamp', nullable: false, note: '创建时间' },
      { name: 'updated_at', type: 'timestamp', nullable: false, note: '更新时间' },
    ]
    const indexes = object.attributes
      .filter(attr => attr.type === 'reference' || attr.required)
      .map(attr => ({ name: `idx_${tableName(object)}_${slug(attr.name)}`, columns: [attr.name] }))
    return {
      object: object.name,
      code: object.code,
      table: tableName(object),
      description: object.description,
      parent: object.parentClass,
      columns,
      indexes,
    }
  })
  const foreignKeys = data.relations.map(relation => {
    const fromTable = data.objects.find(item => item.name === relation.from || item.id === relation.from)
    const toTable = data.objects.find(item => item.name === relation.to || item.id === relation.to)
    const many = relation.cardinality === 'N-N' || relation.cardinality === '1-N'
    return {
      relation: relation.name,
      from: relation.from,
      to: relation.to,
      cardinality: relation.cardinality,
      strategy: many ? '中间表' : '外键',
      sql: many
        ? `create table rel_${slug(relation.name)} (from_id uuid not null references ${tableName(fromTable ?? { code: relation.from })}(id), to_id uuid not null references ${tableName(toTable ?? { code: relation.to })}(id));`
        : `alter table ${tableName(fromTable ?? { code: relation.from })} add column ${slug(relation.name)}_id uuid references ${tableName(toTable ?? { code: relation.to })}(id);`,
    }
  })
  return { tables, foreignKeys }
}

/* ------------------------------------------------------------------ *
 * 2. 规则引擎设计
 * ------------------------------------------------------------------ */

/** 规则引擎：分组、求值顺序、冲突处理、接口骨架。 */
export function blueprintRuleEngine(ontology) {
  const data = ontologyOf(ontology)
  const groups = { constraint: [], derivation: [], default: [], calculation: [], routing: [] }
  for (const rule of data.rules) {
    const bucket = groups[rule.type] ?? groups.constraint
    bucket.push(rule)
  }
  // 依赖排序：被依赖的规则先算（简易拓扑，检测不到环就按优先级）。
  const order = []
  const visiting = new Set()
  const done = new Set()
  const byName = new Map(data.rules.map(rule => [rule.name, rule]))
  const visit = rule => {
    if (done.has(rule.name) || visiting.has(rule.name)) return
    visiting.add(rule.name)
    for (const dep of rule.dependsOn) {
      const parent = byName.get(dep)
      if (parent) visit(parent)
    }
    visiting.delete(rule.name)
    done.add(rule.name)
    order.push(rule)
  }
  for (const rule of [...data.rules].sort((a, b) => a.priority - b.priority)) visit(rule)

  const interfaceSkeleton = [
    '// 规则引擎骨架：由本体规则生成，改本体后重新生成',
    'export type RuleType = \'constraint\' | \'derivation\' | \'default\' | \'calculation\' | \'routing\'',
    'export interface RuleContext { facts: Record<string, unknown>; now: string }',
    'export interface RuleResult { rule: string; passed: boolean; value?: unknown; reason?: string }',
    'export interface Rule {',
    '  name: string',
    '  type: RuleType',
    '  scope: string',
    '  dependsOn: string[]',
    '  evaluate(context: RuleContext): RuleResult',
    '}',
    '',
    'export function runRules(rules: Rule[], context: RuleContext): RuleResult[] {',
    '  // 求值顺序按依赖拓扑，冲突时 priority 大者优先',
    '  return rules.map(rule => rule.evaluate(context))',
    '}',
  ].join('\n')

  const examples = data.rules.slice(0, 6).map(rule => {
    const expr = rule.expressionLanguage === 'natural'
      ? `// 自然语言口径：${rule.expression}\n// 建议补一段机器可判定的表达式`
      : rule.expression
    return `// ${rule.name}（${rule.type}${rule.scope ? ` · ${rule.scope}` : ''}）\nconst ${slug(rule.name).replace(/\d/g, '')} = (context: RuleContext): RuleResult => {\n  // ${expr}\n  return { rule: '${rule.name}', passed: true }\n}`
  })

  return {
    groups: Object.fromEntries(Object.entries(groups).map(([key, list]) => [key, list.map(rule => rule.name)])),
    evaluationOrder: order.map(rule => rule.name),
    conflicts: '同名规则按 priority 大者优先；约束类规则失败即拦截，派生/计算类规则失败降级为告警。',
    interfaceSkeleton,
    examples,
  }
}

/* ------------------------------------------------------------------ *
 * 3. API 契约
 * ------------------------------------------------------------------ */

/** API 契约：对象 CRUD、关系查询、行动端点 + OpenAPI 片段。 */
export function blueprintApi(ontology) {
  const data = ontologyOf(ontology)
  const paths = {}
  for (const object of data.objects) {
    const base = `/api/${plural(tableName(object))}`
    paths[base] = {
      get: {
        summary: `查询${object.name}列表`,
        parameters: data.objects.length > 0 && object.attributes.some(attr => attr.type === 'reference')
          ? [{ name: 'owner', in: 'query', required: false, schema: { type: 'string' } }]
          : [],
        responses: { 200: { description: `${object.name} 列表` } },
      },
      post: {
        summary: `创建${object.name}`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: object.attributes.filter(attr => attr.required).map(attr => attr.name),
                properties: Object.fromEntries(object.attributes.map(attr => [attr.name, { ...apiType(attr.type), ...(attr.description ? { description: attr.description } : {}) }])),
              },
            },
          },
        },
        responses: { 201: { description: '已创建' }, 422: { description: '违反本体约束' } },
      },
    }
    paths[`${base}/{id}`] = {
      get: { summary: `读取${object.name}详情`, responses: { 200: { description: object.name }, 404: { description: '不存在' } } },
      patch: { summary: `更新${object.name}`, responses: { 200: { description: '已更新' }, 422: { description: '违反本体约束' } } },
      delete: { summary: `删除${object.name}`, responses: { 204: { description: '已删除' } } },
    }
  }
  for (const relation of data.relations) {
    const fromTable = data.objects.find(item => item.name === relation.from || item.id === relation.from)
    if (!fromTable) continue
    const base = `/api/${plural(tableName(fromTable))}/{id}/${slug(relation.name)}`
    paths[base] = {
      get: { summary: `沿「${relation.name}」查询${relation.to}（${relation.cardinality}）`, responses: { 200: { description: relation.name } } },
      post: { summary: `建立「${relation.name}」关联`, responses: { 201: { description: '已关联' }, 409: { description: '违反基数约束' } } },
    }
  }
  for (const action of data.actions) {
    const base = action.target.startsWith('/') ? action.target : `/api/actions/${slug(action.name)}`
    paths[base] = {
      post: {
        summary: `执行行动「${action.name}」`,
        description: action.description,
        requestBody: {
          required: action.params.some(param => param.required),
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: action.params.filter(param => param.required).map(param => param.name),
                properties: Object.fromEntries(action.params.map(param => [param.name, { ...apiType(param.type), description: param.description || param.name }])),
              },
            },
          },
        },
        responses: { 200: { description: action.result || '执行完成' } },
      },
    }
  }
  const backendSkeleton = [
    '// 后端服务骨架：由本体资产生成',
    'export interface Repository<T> {',
    '  list(query?: Record<string, unknown>): Promise<T[]>',
    '  get(id: string): Promise<T | undefined>',
    '  create(input: Omit<T, \'id\'>): Promise<T>',
    '  update(id: string, patch: Partial<T>): Promise<T>',
    '}',
    '',
    'export class ValidationError extends Error {',
    '  constructor(public violations: { rule: string; message: string }[]) { super(\'本体约束未通过\') }',
    '}',
  ].join('\n')
  return {
    basePath: '/api',
    errorConvention: {
      '400': '参数格式错误',
      '404': '对象不存在',
      '409': '违反关系基数或状态约束',
      '422': '违反业务规则（返回 violations 明细）',
      '500': '服务端异常',
    },
    paths,
    openapi: {
      openapi: '3.1.0',
      info: { title: '本体驱动 API', version: '1.0.0', description: '由本体语义层生成，改本体后重新生成' },
      paths,
    },
    backendSkeleton,
  }
}

/* ------------------------------------------------------------------ *
 * 4. 前端设计
 * ------------------------------------------------------------------ */

/** 前端设计：页面清单、字段与交互、组件与状态建议。 */
export function blueprintFrontend(ontology) {
  const data = ontologyOf(ontology)
  const pages = []
  for (const object of data.objects) {
    pages.push({
      route: `/${plural(tableName(object))}`,
      name: `${object.name}列表`,
      kind: 'list',
      fields: object.attributes.map(attr => attr.name),
      columns: object.attributes.filter(attr => attr.required || attr.type === 'enum' || attr.type === 'reference').map(attr => attr.name),
      interactions: ['搜索与筛选', '分页', '排序', '批量导出'],
      components: ['DataTable', 'FilterBar', 'ExportButton'],
    })
    pages.push({
      route: `/${plural(tableName(object))}/:id`,
      name: `${object.name}详情`,
      kind: 'detail',
      fields: object.attributes.map(attr => attr.name),
      interactions: ['编辑', '按规则实时校验', '触发关联动作'],
      components: ['DetailForm', 'RelationPanel', 'ActionBar', 'ViolationList'],
    })
  }
  if (data.relations.length > 0) {
    pages.push({
      route: '/ontology/graph',
      name: '本体关系视图',
      kind: 'graph',
      fields: [],
      interactions: ['按对象聚焦', '沿关系下钻', '导出关系清单'],
      components: ['OntologyGraph', 'RelationPath'],
    })
  }
  if (data.rules.length > 0) {
    pages.push({
      route: '/ontology/rules',
      name: '规则与判定',
      kind: 'rules',
      fields: data.rules.map(rule => rule.name),
      interactions: ['单条试算', '批量回放', '查看求值顺序'],
      components: ['RuleEditor', 'RuleTester', 'EvaluationTrace'],
    })
  }
  const frontendSkeleton = [
    '// 前端表单骨架：由对象属性生成',
    'export const schema = {',
    ...data.objects.slice(0, 3).flatMap(object => [
      `  '${object.name}': {`,
      `    name: '${object.name}',`,
      `    fields: [`,
      ...object.attributes.map(attr => `      { name: '${attr.name}', label: '${attr.name}', type: '${attr.type}', required: ${attr.required} },`),
      '    ],',
      '  },',
    ]),
    '}',
  ].join('\n')
  return {
    pages,
    stateManagement: '服务端状态用数据请求缓存（按对象 + 列表键），本地只放筛选与表单草稿；本体变更后按 version 失效缓存。',
    frontendSkeleton,
  }
}

/* ------------------------------------------------------------------ *
 * 5. 本体如何驱动应用
 * ------------------------------------------------------------------ */

/** 本体驱动：一条从本体到代码的流水线。 */
export function blueprintDrive(ontology) {
  const data = ontologyOf(ontology)
  const stats = ontologyStats(data)
  return {
    principle: '本体是唯一事实源：类型、接口、校验、表单、用例都从本体生成，不允许手写重复定义。',
    pipeline: [
      { step: '1. 建模', tool: '本体语义层（对象 / 关系 / 规则 / 行动）', output: '通过专家校准的资产' },
      { step: '2. 生成类型', tool: '本体 SDK / TypeScript 接口', output: `${stats.objects} 个领域类型` },
      { step: '3. 生成接口', tool: 'OpenAPI 片段 → 后端路由与前端请求层', output: `${stats.objects * 4 + stats.relations + stats.actions} 个端点` },
      { step: '4. 生成校验', tool: '规则 + 校验形状 → 前后端共用校验器', output: `${stats.rules} 条规则 / ${stats.shapes} 个形状` },
      { step: '5. 生成界面', tool: '对象属性 → 列表列 / 表单字段 / 详情区块', output: `${stats.objects} 套界面骨架` },
      { step: '6. 生成用例', tool: '对象 / 关系 / 规则 / 行动 → 测试矩阵', output: '可执行用例集' },
      { step: '7. 服务封装', tool: 'MCP 工具 / 本体 SDK', output: '智能体可直接调用的能力' },
    ],
    directory: [
      'ontology/            # 本体资产（导出 JSON，作为唯一事实源）',
      '  <本体名>.json',
      'generated/           # 由本体生成，禁止手改',
      '  types.ts            # 领域类型',
      '  api.openapi.json    # 接口契约',
      '  validation.ts       # 规则与形状校验器',
      '  forms.ts            # 前端表单 schema',
      '  cases.json          # 测试用例',
      'src/                 # 手写业务代码，只引用 generated/',
    ],
    guardrails: [
      '生成物与本体不一致时，构建期直接失败（CI 跑一次 diff 校验）。',
      '本体版本升级时，先跑生成的用例集，再合并代码。',
      '规则只在本体里改，代码里不复制判断条件。',
    ],
  }
}

/* ------------------------------------------------------------------ *
 * 6. 测试方案
 * ------------------------------------------------------------------ */

/** 测试方案：可落到用例库的 HTTP 用例矩阵 + 规则正反例。 */
export function blueprintTests(ontology) {
  const data = ontologyOf(ontology)
  const cases = []
  for (const object of data.objects) {
    const base = `/api/${plural(tableName(object))}`
    cases.push({
      title: `创建${object.name}（必填齐全）`,
      expected: '返回 201，响应含 id',
      method: 'POST',
      url: base,
      body: JSON.stringify(sampleBody(object)),
      expectStatus: 201,
    })
    const missing = object.attributes.find(attr => attr.required)
    if (missing) {
      cases.push({
        title: `创建${object.name}缺少必填「${missing.name}」`,
        expected: '返回 422，violations 指出缺失字段',
        method: 'POST',
        url: base,
        body: JSON.stringify(sampleBody(object, [missing.name])),
        expectStatus: 422,
      })
    }
    cases.push({
      title: `读取${object.name}详情`,
      expected: '返回 200 且字段与本体一致',
      method: 'GET',
      url: `${base}/{id}`,
      expectStatus: 200,
    })
  }
  for (const relation of data.relations) {
    const from = data.objects.find(item => item.name === relation.from || item.id === relation.from)
    if (!from) continue
    cases.push({
      title: `沿「${relation.name}」查询关联对象`,
      expected: `按 ${relation.cardinality} 基数返回关联结果`,
      method: 'GET',
      url: `/api/${plural(tableName(from))}/{id}/${slug(relation.name)}`,
      expectStatus: 200,
    })
  }
  for (const action of data.actions) {
    const target = action.target.startsWith('/') ? action.target : `/api/actions/${slug(action.name)}`
    cases.push({
      title: `执行行动「${action.name}」`,
      expected: action.result || '返回 200',
      method: 'POST',
      url: target,
      body: JSON.stringify(Object.fromEntries(action.params.map(param => [param.name, param.type === 'number' ? 1 : 'sample']))),
      expectStatus: 200,
    })
  }
  const ruleCases = data.rules.map(rule => ({
    rule: rule.name,
    type: rule.type,
    scope: rule.scope,
    positive: `构造满足「${rule.expression || rule.name}」的输入 → 判定通过`,
    negative: `构造违反「${rule.expression || rule.name}」的输入 → 判定失败并给出原因`,
  }))
  return {
    matrix: cases,
    ruleCases,
    strategy: [
      '契约测试：每条生成的端点跑一遍冒烟（用例即上面矩阵）。',
      '规则测试：每条规则至少一组正反例，正例必须通过、反例必须失败。',
      '基数测试：关系两端各测一次越界关联应被拒绝（409）。',
      '回归：本体版本升级后重跑全部生成用例，失败即阻断发布。',
    ],
  }
}

function sampleBody(object, skip = []) {
  const body = {}
  for (const attr of object.attributes) {
    if (skip.includes(attr.name)) continue
    if (attr.type === 'number' || attr.type === 'money' || attr.type === 'percent') body[attr.name] = 1
    else if (attr.type === 'boolean') body[attr.name] = true
    else if (attr.type === 'enum') body[attr.name] = attr.enum[0] ?? 'sample'
    else if (attr.type === 'json') body[attr.name] = {}
    else body[attr.name] = `sample-${attr.name}`
  }
  return body
}

/* ------------------------------------------------------------------ *
 * 组装
 * ------------------------------------------------------------------ */

export const BLUEPRINT_SECTIONS = ['data', 'rules', 'api', 'frontend', 'drive', 'tests']

/** 生成整份蓝图。 */
export function ontologyBlueprint(ontology, options = {}) {
  const sections = Array.isArray(options.sections) && options.sections.length > 0 ? options.sections : BLUEPRINT_SECTIONS
  const scoped = options.ontologyId ? ontologyOf(ontology, options.ontologyId) : ontology
  const parts = {
    data: () => blueprintDataModel(scoped),
    rules: () => blueprintRuleEngine(scoped),
    api: () => blueprintApi(scoped),
    frontend: () => blueprintFrontend(scoped),
    drive: () => blueprintDrive(scoped),
    tests: () => blueprintTests(scoped),
  }
  const result = {}
  for (const key of sections) {
    if (parts[key]) result[key] = parts[key]()
  }
  return { sections: result, markdown: blueprintMarkdown(result, scoped, sections), json: result }
}

/** 蓝图 → Markdown（可直接登记成交付物）。 */
export function blueprintMarkdown(blueprint, ontology, sections = BLUEPRINT_SECTIONS) {
  const data = ontologyOf(ontology)
  const stats = ontologyStats(data)
  const lines = []
  lines.push('# 本体应用蓝图')
  lines.push('')
  lines.push(`> 资产规模：对象 ${stats.objects}（属性 ${stats.attributes}）· 关系 ${stats.relations} · 规则 ${stats.rules} · 行动 ${stats.actions} · 术语 ${data.vocabularies.length} · 形状 ${data.shapes.length}`)
  lines.push('> 本蓝图由本体语义层生成：改本体 → 重新生成，别手改蓝图里的代码。')
  lines.push('')

  if (sections.includes('data') && blueprint.data) {
    lines.push('## 一、数据模型设计')
    lines.push('')
    lines.push('| 对象 | 表 | 说明 |')
    lines.push('| --- | --- | --- |')
    for (const table of blueprint.data.tables) {
      lines.push(`| ${table.object} | \`${table.table}\` | ${table.description || ''} |`)
    }
    lines.push('')
    lines.push('```sql')
    for (const table of blueprint.data.tables) {
      const cols = table.columns.map(col => `  ${col.name} ${col.type}${col.nullable ? '' : ' not null'}${col.enum ? ` -- enum(${col.enum.join(', ')})` : ''}`).join(',\n')
      lines.push(`create table ${table.table} (\n${cols}\n);`)
    }
    for (const fk of blueprint.data.foreignKeys) lines.push(fk.sql)
    lines.push('```')
    lines.push('')
  }

  if (sections.includes('rules') && blueprint.rules) {
    lines.push('## 二、规则引擎设计（逻辑怎么落地）')
    lines.push('')
    lines.push(`- 分组：${Object.entries(blueprint.rules.groups).map(([key, list]) => `${key} ${list.length}`).join(' · ')}`)
    lines.push(`- 求值顺序：${blueprint.rules.evaluationOrder.join(' → ') || '（暂无规则）'}`)
    lines.push(`- 冲突处理：${blueprint.rules.conflicts}`)
    lines.push('')
    lines.push('```ts')
    lines.push(blueprint.rules.interfaceSkeleton)
    lines.push('```')
    if (blueprint.rules.examples.length > 0) {
      lines.push('')
      lines.push('规则实现示例：')
      lines.push('')
      lines.push('```ts')
      lines.push(blueprint.rules.examples.join('\n\n'))
      lines.push('```')
    }
    lines.push('')
  }

  if (sections.includes('api') && blueprint.api) {
    lines.push('## 三、后端与 API 契约')
    lines.push('')
    lines.push('| 方法 | 路径 | 说明 |')
    lines.push('| --- | --- | --- |')
    for (const [path, methods] of Object.entries(blueprint.api.paths)) {
      for (const [method, spec] of Object.entries(methods)) {
        lines.push(`| ${method.toUpperCase()} | \`${path}\` | ${spec.summary || ''} |`)
      }
    }
    lines.push('')
    lines.push('错误约定：')
    for (const [code, hint] of Object.entries(blueprint.api.errorConvention)) lines.push(`- ${code}：${hint}`)
    lines.push('')
    lines.push('```ts')
    lines.push(blueprint.api.backendSkeleton)
    lines.push('```')
    lines.push('')
  }

  if (sections.includes('frontend') && blueprint.frontend) {
    lines.push('## 四、前端设计')
    lines.push('')
    lines.push('| 路由 | 页面 | 类型 | 关键字段 |')
    lines.push('| --- | --- | --- | --- |')
    for (const page of blueprint.frontend.pages) {
      lines.push(`| \`${page.route}\` | ${page.name} | ${page.kind} | ${page.fields.slice(0, 6).join('、') || '—'} |`)
    }
    lines.push('')
    lines.push(`状态管理：${blueprint.frontend.stateManagement}`)
    lines.push('')
    lines.push('```ts')
    lines.push(blueprint.frontend.frontendSkeleton)
    lines.push('```')
    lines.push('')
  }

  if (sections.includes('drive') && blueprint.drive) {
    lines.push('## 五、本体怎么驱动应用')
    lines.push('')
    lines.push(blueprint.drive.principle)
    lines.push('')
    for (const step of blueprint.drive.pipeline) lines.push(`- **${step.step}** ${step.tool} → ${step.output}`)
    lines.push('')
    lines.push('目录约定：')
    lines.push('')
    lines.push('```text')
    lines.push(blueprint.drive.directory.join('\n'))
    lines.push('```')
    lines.push('')
    lines.push('护栏：')
    for (const rule of blueprint.drive.guardrails) lines.push(`- ${rule}`)
    lines.push('')
  }

  if (sections.includes('tests') && blueprint.tests) {
    lines.push('## 六、测试方案')
    lines.push('')
    lines.push('| 用例 | 方法 | 路径 | 期望 |')
    lines.push('| --- | --- | --- | --- |')
    for (const item of blueprint.tests.matrix) {
      lines.push(`| ${item.title} | ${item.method} | \`${item.url}\` | ${item.expected} |`)
    }
    lines.push('')
    if (blueprint.tests.ruleCases.length > 0) {
      lines.push('规则正反例：')
      lines.push('')
      for (const item of blueprint.tests.ruleCases) {
        lines.push(`- **${item.rule}**（${item.type}${item.scope ? ` · ${item.scope}` : ''}）`)
        lines.push(`  - 正例：${item.positive}`)
        lines.push(`  - 反例：${item.negative}`)
      }
      lines.push('')
    }
    lines.push('测试策略：')
    for (const item of blueprint.tests.strategy) lines.push(`- ${item}`)
    lines.push('')
  }

  return lines.join('\n')
}

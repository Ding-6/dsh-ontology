/* Display labels and enumerations shared by the board, drawers and forms.
   Pure tables — no React, no API access — so they can be imported by any
   page module without dragging the panel along. */

/* 七类环节角色（单人开发模式）：业务 → 需求 → 数据 → 本体建模 → 后端 → 前端 → 测试。 */
export const ROLE_LABEL = {
  business: '业务', requirement: '需求', data: '数据', modeling: '本体建模',
  backend: '后端', frontend: '前端', qa: '校验',
  // 旧角色名保留一份，迁移期的历史数据还能显示对。
  product: '业务', architect: '架构', dev: '建模',
}
export const PRIORITY_LABEL = { urgent: '紧急', normal: '普通', relaxed: '宽松' }
export const TYPE_LABEL = { requirement: '场景', bug: '缺陷', design: '语义设计', dev: '建模', test: '校验', ops: '运维' }
export const SEVERITY_LABEL = { p0: 'P0 致命', p1: 'P1 严重', p2: 'P2 一般', p3: 'P3 轻微' }
export const ARTIFACT_KINDS = ['requirement', 'design', 'mr', 'cases', 'report', 'release', 'doc', 'screenshot', 'other']
export const ARTIFACT_KIND_LABEL = { requirement: '场景', design: '语义设计', mr: 'MR', cases: '校验用例', report: '报告', release: '发布', doc: '文档', screenshot: '截图', other: '其它' }
export const ARTIFACT_STATUS = ['draft', 'delivered', 'accepted']
export const CASE_RESULTS = ['pending', 'pass', 'fail', 'skip']
export const CASE_RESULT_LABEL = { pending: '⬜ 未跑', pass: '✅ 通过', fail: '❌ 不通过', skip: '⏭️ 跳过' }
export const CASE_TYPES = ['functional', 'api', 'ui', 'performance', 'security', 'other']
export const CASE_TYPE_LABEL = { functional: '功能', api: '接口', ui: '界面', performance: '性能', security: '安全', other: '其它' }
export const CASE_PRIORITIES = ['p0', 'p1', 'p2', 'p3']
export const ARTIFACT_STATUS_LABEL = { draft: '草稿', delivered: '已交付', accepted: '已验收' }
export const CODING_REVIEW_LABEL = { pending: '待评审', approved: '评审通过', changes_requested: '要求修改' }
export const CODING_CHANGE_LABEL = { added: '新增', modified: '修改', deleted: '删除' }
export const PROJECT_STATUS_LABEL = { active: '进行中', paused: '暂停', archived: '已归档' }
export const ITERATION_STATUS_LABEL = { planned: '未开始', active: '进行中', closed: '已结束' }
export const STRATEGY_LABEL = { round_robin: '轮询', best_match: '按专长匹配', lead: '团长分派' }
export const REQ_STATUS_ORDER = ['draft', 'review', 'active', 'delivered', 'closed']
export const DOC_KIND_LABEL = { prd: 'PRD', proto: '原型', acceptance: '验收标准', other: '其它' }
export const DOC_KIND_ORDER = ['prd', 'proto', 'acceptance', 'other']
export const DOC_STATUS_LABEL = { draft: '草稿', review: '评审中', baseline: '已生效' }
export const RELEASE_STATUS_ORDER = ['draft', 'candidate', 'approved', 'released', 'rolled_back']
export const REQ_STATUS_LABEL = { draft: '草稿', review: '待评审', active: '进行中', delivered: '已交付', closed: '已关闭' }
export const RELEASE_STATUS_LABEL = { draft: '草稿', candidate: '待发布', approved: '已审批', released: '已发布', rolled_back: '已回滚' }

/* 本体语义层（统一语义层）词汇：与 src/host/ontology.js 一一对应。 */
export const ONTOLOGY_KIND_LABEL = {
  object: '业务对象', relation: '对象关系', rule: '业务规则', action: '可调用行动',
  vocabulary: '术语方案', individual: '对象实例', shape: '校验形状', application: '应用场景',
  guide: '操作手册',
}
export const ONTOLOGY_STATUS_LABEL = { draft: 'AI 草稿', approved: '已确认', deprecated: '已废弃' }
export const ONTOLOGY_SOURCE_LABEL = { ai: 'AI 生成', human: '人工录入', import: '导入' }
export const ONTOLOGY_LAYERS = [
  { id: 'data', label: '数据层', hint: '业务对象、对象实例、术语词表与对象之间的关系', kinds: ['object', 'individual', 'vocabulary', 'relation'] },
  { id: 'logic', label: '逻辑层', hint: '可判定的业务规则与数据校验形状', kinds: ['rule', 'shape'] },
  { id: 'action', label: '行动层', hint: '面向系统 API 与智能体指令的行动与应用场景', kinds: ['action', 'application'] },
]
export const ONTOLOGY_ATTRIBUTE_TYPE_LABEL = { string: '文本', text: '长文本', number: '数字', money: '金额', percent: '百分比', date: '日期', datetime: '日期时间', boolean: '布尔', enum: '枚举', uri: '标识符', reference: '引用', json: '结构化' }
export const ONTOLOGY_RULE_TYPE_LABEL = { constraint: '约束', derivation: '推导', default: '默认值', calculation: '计算', routing: '路由' }
export const ONTOLOGY_EXPRESSION_LANGUAGE_LABEL = { natural: '自然语言口径', shacl: 'SHACL 约束', jsonlogic: 'JSONLogic', sqlish: '结构化查询', formula: '公式' }
export const ONTOLOGY_ACTION_KIND_LABEL = { query: '查询', command: '命令', workflow: '流程', event: '事件' }
export const ONTOLOGY_SHAPE_OPERATOR_LABEL = {
  minCount: '至少出现', maxCount: '最多出现', datatype: '数据类型', minInclusive: '最小值',
  maxInclusive: '最大值', pattern: '匹配格式', in: '取值范围', class: '实例类型', nodeKind: '节点种类',
}
export const ONTOLOGY_CARDINALITIES = ['1-1', '1-N', 'N-1', 'N-N']
export const ONTOLOGY_PACKAGINGS = ['object', 'relation', 'rule', 'action']
export const ONTOLOGY_PROTOCOLS = ['mcp', 'sdk']
export const ONTOLOGY_BLUEPRINT_SECTIONS = [
  { id: 'data', label: '数据模型设计' },
  { id: 'rules', label: '规则引擎设计' },
  { id: 'api', label: '后端与 API 契约' },
  { id: 'frontend', label: '前端设计' },
  { id: 'drive', label: '本体怎么驱动应用' },
  { id: 'tests', label: '测试方案' },
]
export const ONTOLOGY_FINDING_LEVEL_LABEL = { blocker: '阻塞', warn: '待改进', info: '提示' }

/* 工具清单（与 src/host/tools.js 注册的 53 个工具一一对应）。
   设置页给每个角色配「可调用工具白名单」时用这份表勾选；服务端再按同一份名单拦。 */
export const TOOL_NAMES = [
  'ontology_config_get', 'ontology_config_set',
  'ontology_requirement_list', 'ontology_requirement_get', 'ontology_requirement_save',
  'ontology_requirement_signoff', 'ontology_requirement_folder',
  'ontology_task_list', 'ontology_task_get', 'ontology_task_create', 'ontology_task_update',
  'ontology_task_signoff', 'ontology_task_generate_cases', 'ontology_task_block', 'ontology_task_unblock',
  'ontology_task_comment', 'ontology_task_artifact', 'ontology_task_check', 'ontology_task_coding',
  'ontology_task_case', 'ontology_test_run', 'ontology_test_suite', 'ontology_bug_duplicate',
  'ontology_dashboard', 'ontology_workload', 'ontology_burndown', 'ontology_costs', 'ontology_analytics',
  'ontology_release_list', 'ontology_release_get', 'ontology_release_save', 'ontology_release_publish',
  'ontology_release_gray', 'ontology_project_save', 'ontology_project_list',
  'ontology_semantics_get', 'ontology_asset_save', 'ontology_asset_review', 'ontology_service_export',
  'ontology_review_advice', 'ontology_blueprint', 'ontology_template', 'ontology_container',
  'ontology_guide_save', 'ontology_guide_search', 'ontology_guide_load',
  'ontology_plan', 'ontology_agent_ask', 'ontology_skill_builtin',
  'ontology_skill_list', 'ontology_skill_get', 'ontology_skill_save', 'ontology_skill_delete',
]

/* 工具白名单在界面上按用途分组，避免 53 个复选框糊成一片。 */
export const TOOL_GROUP_LABEL = [
  { id: 'plan', label: '规划与协作', match: name => ['ontology_plan', 'ontology_agent_ask', 'ontology_task_comment', 'ontology_task_list', 'ontology_task_get', 'ontology_task_create', 'ontology_task_update'].includes(name) },
  { id: 'ontology', label: '本体语义层', match: name => name.startsWith('ontology_semantics') || name.startsWith('ontology_asset') || name.startsWith('ontology_review') || name.startsWith('ontology_blueprint') || name.startsWith('ontology_template') || name.startsWith('ontology_container') || name.startsWith('ontology_service') || name.startsWith('ontology_guide') },
  { id: 'requirement', label: '场景与需求', match: name => name.startsWith('ontology_requirement') },
  { id: 'test', label: '用例与联调', match: name => name.startsWith('ontology_test') || name.startsWith('ontology_task_case') || name.startsWith('ontology_task_generate_cases') },
  { id: 'dev', label: '开发与交付', match: name => ['ontology_task_coding', 'ontology_task_artifact', 'ontology_task_check', 'ontology_task_block', 'ontology_task_unblock', 'ontology_task_signoff'].includes(name) },
  { id: 'skill', label: '技能库', match: name => name.startsWith('ontology_skill') },
  { id: 'ops', label: '运营与度量', match: name => ['ontology_dashboard', 'ontology_workload', 'ontology_burndown', 'ontology_costs', 'ontology_analytics', 'ontology_release_list', 'ontology_release_get', 'ontology_release_save', 'ontology_release_publish', 'ontology_release_gray', 'ontology_project_save', 'ontology_project_list', 'ontology_bug_duplicate', 'ontology_config_get', 'ontology_config_set'].includes(name) },
]


/* 权限角色选项（成员/只读/管理员）。原来它躺在 client.src.js 里没人用，
   而 governance.js 里到处用它 —— 于是「权限与审计」整页 ReferenceError。 */
export const ACCESS_ROLE_OPTIONS = [
  { id: 'admin', label: '管理员', hint: '能改配置、删数据、发布版本' },
  { id: 'member', label: '成员', hint: '能建卡、推卡、评论、跑用例' },
  { id: 'viewer', label: '只读', hint: '只能看，不能动' },
]


/* STRATEGIES / ROUTE_LABEL 原来在 client.src.js 里没人引用，而 governance.js 里到处裸用
   （都报过 ReferenceError）。搬到这里当唯一真源。 */
    export const STRATEGIES = [
      { id: 'round_robin', label: '轮询：谁手上活少给谁' },
      { id: 'best_match', label: '按专长匹配：领域 / 角色位 / 技能' },
      { id: 'lead', label: '交给专家团团长分派' },
    ]

    export const ROUTE_LABEL = {
      '/config': '改配置',
      '/task/create': '新建卡',
      '/task/update': '改卡',
      '/task/delete': '删卡',
      '/task/block': '标记阻塞',
      '/task/unblock': '解除阻塞',
      '/task/comment': '评论',
      '/task/artifact': '登记交付物',
      '/task/artifact/sync': '归档交付物',
      '/task/checklist': '勾验收清单',
      '/task/case': '登记用例',
      '/task/case/run': '跑接口用例',
      '/task/coding': '登记 AI Coding',
      '/task/worktree': 'worktree 操作',
      '/mention': '点名派活',
      '/agents/run': '手动派单',
      '/agents/stop': '停止派单',
      '/experts/save': '存专家',
      '/experts/delete': '删专家',
      '/teams/save': '存专家团',
      '/teams/delete': '删专家团',
      '/skills/save': '存技能',
      '/skills/delete': '删技能',
      '/projects/save': '存项目',
      '/projects/delete': '删项目',
      '/release/save': '存版本',
      '/release/publish': '发布版本',
      '/release/rollback': '回滚版本',
      '/release/approve': '审批版本',
      '/requirement/save': '存需求',
      '/requirement/delete': '删需求',
      '/access/save': '改成员权限',
      '/access/delete': '删成员',
      '/audit/clear': '清空审计日志',
      '/market/install': '装插件',
      '/market/uninstall': '卸插件',
    }

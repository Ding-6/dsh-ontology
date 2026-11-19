/**
 * 建模骨架模板：与行业无关的领域建模起点。
 *
 * 插件不预置任何行业业务数据，这里只提供「结构骨架」——有哪些对象类、类之间是什么
 * 关系、需要哪些可判定的规则槽位、要对外暴露哪些行动。用户一键实例化后得到一批
 * AI 草稿资产（对象 / 关系 / 规则 / 行动），再在自己的语义层上继续改。
 *
 * 纯数据模块：只依赖本仓库的清洗器，不碰 I/O，可直接被单测引用。
 *
 * 字段约束（下游按白名单校验，写错会被丢弃）：
 *   属性 type     ∈ string text number money percent date datetime boolean enum uri reference json
 *   关系 cardinality ∈ 1-1 1-N N-1 N-N
 *   规则 type     ∈ constraint derivation default calculation routing
 *   行动 kind     ∈ query command workflow event
 *   关系 from / to 必须是同一模板 objects 里出现过的对象名（中文名，保持一致）。
 */
import { upsertOntologyAsset } from './ontology.js'

export const ONTOLOGY_TEMPLATES = [
  {
    id: 'general',
    name: '通用业务骨架',
    domain: '通用',
    description: '任何业务域都能起手的最小骨架：对象、事件、组织、角色与度量口径，用来先跑通「建模 → 接口 → 用例」全链路。',
    checklist: [
      '先确定对象边界：哪些概念是名词、哪些只是属性',
      '给每个对象一个稳定的英文编码，前后端都按编码引用',
      '每个对象至少补齐标识、名称、状态三类字段',
      '关系写清基数，避免一对多被当成多对多落库',
      '规则写成可判定的条件，不要写成说明文字',
      '行动落到具体接口路径，并写清返回什么',
    ],
    objects: [
      { name: '实体', code: 'entity', domain: '通用', description: '业务中可被识别与管理的名词性概念',
        attributes: [
          { name: '实体编号', type: 'string', required: true, description: '唯一标识' },
          { name: '实体名称', type: 'string', required: true, description: '展示名称' },
          { name: '实体状态', type: 'enum', required: false, description: '生命周期状态' },
        ] },
      { name: '业务事件', code: 'business-event', domain: '通用', description: '发生在某个时间点、可被记录的业务事实',
        attributes: [
          { name: '事件编号', type: 'string', required: true, description: '唯一标识' },
          { name: '事件名称', type: 'string', required: true, description: '展示名称' },
          { name: '发生时间', type: 'datetime', required: true, description: '事件发生的时间' },
          { name: '责任人', type: 'reference', required: false, description: '关联的责任主体' },
        ] },
      { name: '组织', code: 'organization', domain: '通用', description: '承担职责的一组人或团队',
        attributes: [
          { name: '组织编号', type: 'string', required: true, description: '唯一标识' },
          { name: '组织名称', type: 'string', required: true, description: '展示名称' },
          { name: '组织状态', type: 'enum', required: false, description: '生命周期状态' },
        ] },
      { name: '角色', code: 'role', domain: '通用', description: '在组织内承担一类职责的身份',
        attributes: [
          { name: '角色编码', type: 'string', required: true, description: '唯一标识' },
          { name: '角色名称', type: 'string', required: true, description: '展示名称' },
          { name: '角色状态', type: 'enum', required: false, description: '生命周期状态' },
        ] },
      { name: '地点', code: 'location', domain: '通用', description: '对象或事件发生的场所',
        attributes: [
          { name: '地点编号', type: 'string', required: true, description: '唯一标识' },
          { name: '地点名称', type: 'string', required: true, description: '展示名称' },
          { name: '地点编码', type: 'string', required: false, description: '外部系统中的编码' },
        ] },
      { name: '指标', code: 'metric', domain: '通用', description: '用于度量的口径与取值定义',
        attributes: [
          { name: '指标编码', type: 'string', required: true, description: '唯一标识' },
          { name: '指标名称', type: 'string', required: true, description: '展示名称' },
          { name: '指标类型', type: 'enum', required: false, description: '指标的度量方式分类' },
          { name: '统计口径', type: 'text', required: false, description: '指标的计算与统计口径说明' },
        ] },
      { name: '标签', code: 'tag', domain: '通用', description: '用于归类与检索的标记',
        attributes: [
          { name: '标签编码', type: 'string', required: true, description: '唯一标识' },
          { name: '标签名称', type: 'string', required: true, description: '展示名称' },
          { name: '标签分类', type: 'enum', required: false, description: '标签所属分类' },
        ] },
    ],
    relations: [
      { name: '所属组织', from: '实体', to: '组织', cardinality: 'N-1', description: '实体归属的组织' },
      { name: '关联实体', from: '实体', to: '实体', cardinality: 'N-N', description: '同类实体之间的业务关联' },
      { name: '发生地点', from: '业务事件', to: '地点', cardinality: 'N-1', description: '事件发生的场所' },
      { name: '参与角色', from: '业务事件', to: '角色', cardinality: 'N-N', description: '事件中承担职责的角色' },
      { name: '打标签', from: '实体', to: '标签', cardinality: 'N-N', description: '实体身上的归类标记' },
    ],
    rules: [
      { name: '标识唯一', type: 'constraint', expression: '同一对象类型内，标识字段的取值唯一', scope: '全部对象' },
      { name: '必填完整', type: 'constraint', expression: '对象的全部必填属性均不为空', scope: '全部对象' },
      { name: '状态合法', type: 'constraint', expression: '状态字段的取值落在已登记的状态枚举内', scope: '实体、业务事件' },
      { name: '责任人默认', type: 'default', expression: '对象未指定责任人时，取其所属组织的默认责任人', scope: '全部对象' },
    ],
    actions: [
      { name: '查询实体', kind: 'query', target: '/api/entities', result: '实体列表', description: '按条件查询对象实例' },
      { name: '登记业务事件', kind: 'command', target: '/api/events', result: '登记结果', description: '登记一条业务事件并落入时间线' },
      { name: '关联遍历', kind: 'query', target: '/api/relations', result: '关联对象列表', description: '沿关系遍历关联对象' },
    ],
  },
  {
    id: 'industrial',
    name: '工业与物联网骨架',
    domain: '工业与物联网',
    description: '以设备为中心的骨架：设备与部件的层级、传感采集、异常告警与维修工单，适合先建「设备台账 → 采集 → 处置」这条链。',
    checklist: [
      '先划清设备、部件与产线的边界，避免台账重复登记',
      '统一编码规则：同产线内编码唯一，便于排班与统计',
      '读数与告警分开建模：读数是事实，告警是判定结果',
      '工单状态写清流转顺序，工单才有闭环',
      '维护计划与实际执行要能对上，规则里给推导口径',
      '补上设备与组织的归属关系，否则统计口径无法收口',
    ],
    objects: [
      { name: '设备', code: 'equipment', domain: '工业与物联网', description: '可被编号、管理与跟踪的实体装置',
        attributes: [
          { name: '设备编码', type: 'string', required: true, description: '唯一标识' },
          { name: '设备名称', type: 'string', required: true, description: '展示名称' },
          { name: '设备状态', type: 'enum', required: false, description: '生命周期状态' },
          { name: '所属组织', type: 'reference', required: false, description: '管理该设备的组织' },
        ] },
      { name: '部件', code: 'component', domain: '工业与物联网', description: '设备的组成部分，可继续分层',
        attributes: [
          { name: '部件编码', type: 'string', required: true, description: '唯一标识' },
          { name: '部件名称', type: 'string', required: true, description: '展示名称' },
          { name: '部件状态', type: 'enum', required: false, description: '生命周期状态' },
        ] },
      { name: '产线', code: 'production-line', domain: '工业与物联网', description: '设备所在的生产组织单元',
        attributes: [
          { name: '产线编码', type: 'string', required: true, description: '唯一标识' },
          { name: '产线名称', type: 'string', required: true, description: '展示名称' },
          { name: '产线状态', type: 'enum', required: false, description: '生命周期状态' },
        ] },
      { name: '传感器', code: 'sensor', domain: '工业与物联网', description: '安装在设备上、负责采集数据的部件',
        attributes: [
          { name: '传感器编码', type: 'string', required: true, description: '唯一标识' },
          { name: '传感器名称', type: 'string', required: true, description: '展示名称' },
          { name: '采集类型', type: 'enum', required: false, description: '采集数据的类型分类' },
        ] },
      { name: '读数', code: 'reading', domain: '工业与物联网', description: '一次采集得到的量值记录',
        attributes: [
          { name: '读数编号', type: 'string', required: true, description: '唯一标识' },
          { name: '采集时间', type: 'datetime', required: true, description: '数据采集的时间' },
          { name: '读数值', type: 'number', required: true, description: '采集到的量值' },
          { name: '计量单位', type: 'string', required: false, description: '量值的单位' },
        ] },
      { name: '工单', code: 'work-order', domain: '工业与物联网', description: '针对异常或计划任务派出的处理单',
        attributes: [
          { name: '工单编号', type: 'string', required: true, description: '唯一标识' },
          { name: '工单标题', type: 'string', required: true, description: '展示标题' },
          { name: '工单状态', type: 'enum', required: true, description: '工单流转状态' },
          { name: '负责人', type: 'reference', required: false, description: '承接工单的责任主体' },
        ] },
      { name: '告警', code: 'alarm', domain: '工业与物联网', description: '由读数或状态触发的异常判定',
        attributes: [
          { name: '告警编号', type: 'string', required: true, description: '唯一标识' },
          { name: '告警等级', type: 'enum', required: true, description: '严重程度分级' },
          { name: '触发时间', type: 'datetime', required: true, description: '告警触发的时间' },
          { name: '告警状态', type: 'enum', required: false, description: '处理状态' },
        ] },
      { name: '维护', code: 'maintenance', domain: '工业与物联网', description: '针对设备或部件的维护活动',
        attributes: [
          { name: '维护编号', type: 'string', required: true, description: '唯一标识' },
          { name: '维护类型', type: 'enum', required: false, description: '维护活动类型' },
          { name: '计划时间', type: 'datetime', required: false, description: '计划执行时间' },
          { name: '执行状态', type: 'enum', required: false, description: '执行进展状态' },
        ] },
    ],
    relations: [
      { name: '包含部件', from: '设备', to: '部件', cardinality: '1-N', description: '设备由部件组成' },
      { name: '安装传感器', from: '设备', to: '传感器', cardinality: '1-N', description: '设备上安装的采集部件' },
      { name: '所属产线', from: '设备', to: '产线', cardinality: 'N-1', description: '设备归属的生产单元' },
      { name: '产生读数', from: '传感器', to: '读数', cardinality: '1-N', description: '传感器采集产生的量值' },
      { name: '派开工单', from: '告警', to: '工单', cardinality: '1-N', description: '告警触发后派出的处理单' },
    ],
    rules: [
      { name: '编码唯一', type: 'constraint', expression: '同一产线内设备编码唯一', scope: '设备' },
      { name: '采集时序', type: 'constraint', expression: '同一传感器的读数按采集时间单调不减', scope: '读数' },
      { name: '部件层级', type: 'constraint', expression: '部件的包含关系不出现环', scope: '部件' },
      { name: '工单流转', type: 'routing', expression: '工单状态按登记、处理、复核、关闭的顺序流转', scope: '工单' },
    ],
    actions: [
      { name: '查询设备台账', kind: 'query', target: '/api/equipments', result: '设备列表', description: '按产线与状态查询设备' },
      { name: '上报读数', kind: 'command', target: '/api/readings', result: '入库结果', description: '接收一条采集读数' },
      { name: '告警处置', kind: 'workflow', target: '/api/alarms/handle', result: '处置结果', description: '按规则触发告警并派开工单' },
    ],
  },
  {
    id: 'safety',
    name: '公共安全骨架',
    domain: '公共安全',
    description: '以事件响应为中心的骨架：警情登记、区域归属、力量调度与处置留痕，适合先建「登记 → 派单 → 处置 → 归档」这条链。',
    checklist: [
      '先分清事件与警情：一条警情从哪类事件来',
      '区域层级要无环，警情必须能落到区域上',
      '资源与装备分开：资源是力量，装备是器材',
      '处置过程留时间戳，响应时长才算得出来',
      '资源占用有互斥口径，调度才不会重复占用',
      '人员与单位的关系要能查到资质与在岗状态',
    ],
    objects: [
      { name: '事件', code: 'event', domain: '公共安全', description: '被登记到的原始情况',
        attributes: [
          { name: '事件编号', type: 'string', required: true, description: '唯一标识' },
          { name: '事件名称', type: 'string', required: true, description: '展示名称' },
          { name: '事件类型', type: 'enum', required: false, description: '事件分类' },
          { name: '登记时间', type: 'datetime', required: true, description: '登记入系统的时间' },
        ] },
      { name: '警情', code: 'call', domain: '公共安全', description: '需要响应的正式请求',
        attributes: [
          { name: '警情编号', type: 'string', required: true, description: '唯一标识' },
          { name: '警情标题', type: 'string', required: true, description: '展示标题' },
          { name: '警情等级', type: 'enum', required: true, description: '紧急程度分级' },
          { name: '警情状态', type: 'enum', required: true, description: '流转状态' },
          { name: '登记时间', type: 'datetime', required: true, description: '受理登记的时间' },
        ] },
      { name: '人员', code: 'person', domain: '公共安全', description: '参与处置或值守的人员',
        attributes: [
          { name: '人员编号', type: 'string', required: true, description: '唯一标识' },
          { name: '人员姓名', type: 'string', required: true, description: '展示名称' },
          { name: '在岗状态', type: 'enum', required: false, description: '是否在岗' },
          { name: '所属单位', type: 'reference', required: false, description: '人员所属单位' },
        ] },
      { name: '单位', code: 'unit', domain: '公共安全', description: '承担响应职责的组织单元',
        attributes: [
          { name: '单位编码', type: 'string', required: true, description: '唯一标识' },
          { name: '单位名称', type: 'string', required: true, description: '展示名称' },
          { name: '单位类型', type: 'enum', required: false, description: '单位分类' },
        ] },
      { name: '区域', code: 'zone', domain: '公共安全', description: '事件与警情发生的空间范围',
        attributes: [
          { name: '区域编码', type: 'string', required: true, description: '唯一标识' },
          { name: '区域名称', type: 'string', required: true, description: '展示名称' },
          { name: '区域层级', type: 'enum', required: false, description: '区域层级分类' },
        ] },
      { name: '资源', code: 'resource', domain: '公共安全', description: '可被调度的处置力量',
        attributes: [
          { name: '资源编码', type: 'string', required: true, description: '唯一标识' },
          { name: '资源名称', type: 'string', required: true, description: '展示名称' },
          { name: '资源状态', type: 'enum', required: true, description: '可用状态' },
          { name: '资源类型', type: 'enum', required: false, description: '资源分类' },
        ] },
      { name: '处置', code: 'disposal', domain: '公共安全', description: '针对一条警情执行的处置过程',
        attributes: [
          { name: '处置编号', type: 'string', required: true, description: '唯一标识' },
          { name: '处置状态', type: 'enum', required: true, description: '流转状态' },
          { name: '开始时间', type: 'datetime', required: false, description: '处置开始的时间' },
          { name: '结束时间', type: 'datetime', required: false, description: '处置结束的时间' },
        ] },
      { name: '装备', code: 'equipment', domain: '公共安全', description: '处置过程中使用的器材',
        attributes: [
          { name: '装备编码', type: 'string', required: true, description: '唯一标识' },
          { name: '装备名称', type: 'string', required: true, description: '展示名称' },
          { name: '装备状态', type: 'enum', required: false, description: '可用状态' },
          { name: '所属单位', type: 'reference', required: false, description: '装备的管理单位' },
        ] },
    ],
    relations: [
      { name: '事件衍生警情', from: '事件', to: '警情', cardinality: '1-N', description: '事件转化为需响应的警情' },
      { name: '警情发生区域', from: '警情', to: '区域', cardinality: 'N-1', description: '警情所属的空间区域' },
      { name: '警情处置过程', from: '警情', to: '处置', cardinality: '1-N', description: '警情引发的处置过程' },
      { name: '处置调用资源', from: '处置', to: '资源', cardinality: 'N-N', description: '处置过程中调用的力量' },
      { name: '资源归属单位', from: '资源', to: '单位', cardinality: 'N-1', description: '资源的管理单位' },
    ],
    rules: [
      { name: '警情定位', type: 'constraint', expression: '警情必须关联一个区域并记录登记时间', scope: '警情' },
      { name: '处置闭环', type: 'routing', expression: '处置状态按受理、处置、复核、归档的顺序流转', scope: '处置' },
      { name: '资源占用', type: 'constraint', expression: '同一资源在同一时间段内不可被两条处置同时占用', scope: '资源' },
      { name: '响应时长', type: 'calculation', expression: '响应时长 = 处置开始时间 − 警情登记时间', scope: '警情' },
    ],
    actions: [
      { name: '查询警情', kind: 'query', target: '/api/calls', result: '警情列表', description: '按区域与状态查询警情' },
      { name: '登记警情', kind: 'command', target: '/api/calls', result: '登记结果', description: '登记一条警情并生成对应事件' },
      { name: '资源调度', kind: 'workflow', target: '/api/disposals/dispatch', result: '调度结果', description: '按区域与资源状态调度处置力量' },
    ],
  },
  {
    id: 'health',
    name: '医疗健康骨架',
    domain: '医疗健康',
    description: '以一次服务过程为中心的骨架：就诊主链路与诊断、处方、检验、床位等配套记录，适合先建「登记 → 诊疗 → 留痕」这条链。',
    checklist: [
      '先定主链路：一次就诊挂了哪些记录',
      '诊断、处方、检验都是一次就诊下的从属记录',
      '床位占用要有时间段口径，否则冲突判不出来',
      '处方必须能追溯到开立人员与就诊记录',
      '时间字段统一用同一时区与精度',
      '人员与在岗状态要能查，资质校验才有依据',
    ],
    objects: [
      { name: '患者', code: 'patient', domain: '医疗健康', description: '接受服务的一方主体',
        attributes: [
          { name: '患者编号', type: 'string', required: true, description: '唯一标识' },
          { name: '患者姓名', type: 'string', required: true, description: '展示名称' },
          { name: '患者状态', type: 'enum', required: false, description: '当前状态' },
          { name: '所属机构', type: 'reference', required: false, description: '建档所属机构' },
        ] },
      { name: '医护人员', code: 'staff', domain: '医疗健康', description: '提供服务的从业人员',
        attributes: [
          { name: '人员编码', type: 'string', required: true, description: '唯一标识' },
          { name: '姓名', type: 'string', required: true, description: '展示名称' },
          { name: '岗位', type: 'enum', required: false, description: '岗位类别' },
          { name: '在岗状态', type: 'enum', required: false, description: '是否在岗' },
        ] },
      { name: '就诊', code: 'visit', domain: '医疗健康', description: '一次服务过程的载体记录',
        attributes: [
          { name: '就诊编号', type: 'string', required: true, description: '唯一标识' },
          { name: '就诊类型', type: 'enum', required: true, description: '服务形式分类' },
          { name: '开始时间', type: 'datetime', required: true, description: '服务开始时间' },
          { name: '结束时间', type: 'datetime', required: false, description: '服务结束时间' },
          { name: '状态', type: 'enum', required: true, description: '流转状态' },
        ] },
      { name: '诊断', code: 'diagnosis', domain: '医疗健康', description: '对一次服务过程作出的判断记录',
        attributes: [
          { name: '诊断编号', type: 'string', required: true, description: '唯一标识' },
          { name: '诊断名称', type: 'string', required: true, description: '展示名称' },
          { name: '诊断时间', type: 'datetime', required: true, description: '作出判断的时间' },
          { name: '诊断状态', type: 'enum', required: false, description: '确认状态' },
        ] },
      { name: '处方', code: 'prescription', domain: '医疗健康', description: '基于判断给出的处置建议记录',
        attributes: [
          { name: '处方编号', type: 'string', required: true, description: '唯一标识' },
          { name: '处方状态', type: 'enum', required: true, description: '流转状态' },
          { name: '开立时间', type: 'datetime', required: true, description: '开立时间' },
          { name: '开立人员', type: 'reference', required: true, description: '开立该建议的人员' },
        ] },
      { name: '检验结果', code: 'lab-result', domain: '医疗健康', description: '一次检查产生的报告记录',
        attributes: [
          { name: '报告编号', type: 'string', required: true, description: '唯一标识' },
          { name: '报告名称', type: 'string', required: true, description: '展示名称' },
          { name: '报告时间', type: 'datetime', required: true, description: '报告出具时间' },
          { name: '结果摘要', type: 'text', required: false, description: '结果要点摘要' },
        ] },
      { name: '床位', code: 'bed', domain: '医疗健康', description: '可被占用的服务资源',
        attributes: [
          { name: '床位编号', type: 'string', required: true, description: '唯一标识' },
          { name: '床位状态', type: 'enum', required: true, description: '可用状态' },
          { name: '所属区域', type: 'reference', required: false, description: '所在区域' },
        ] },
    ],
    relations: [
      { name: '就诊对象', from: '就诊', to: '患者', cardinality: 'N-1', description: '本次服务的对象' },
      { name: '接诊人员', from: '就诊', to: '医护人员', cardinality: 'N-1', description: '本次服务的承接人员' },
      { name: '就诊诊断', from: '就诊', to: '诊断', cardinality: '1-N', description: '本次过程作出的判断' },
      { name: '诊断处方', from: '诊断', to: '处方', cardinality: '1-N', description: '基于判断给出的建议' },
      { name: '占用床位', from: '就诊', to: '床位', cardinality: '1-1', description: '服务期间占用的资源' },
    ],
    rules: [
      { name: '诊断唯一', type: 'constraint', expression: '同一就诊下的诊断记录唯一', scope: '诊断' },
      { name: '时序约束', type: 'constraint', expression: '结束时间不早于开始时间', scope: '就诊' },
      { name: '处方溯源', type: 'constraint', expression: '处方必须关联开立人员与就诊记录', scope: '处方' },
      { name: '床位占用', type: 'constraint', expression: '同一床位在同一时间段内不可被两次就诊占用', scope: '床位' },
    ],
    actions: [
      { name: '查询就诊记录', kind: 'query', target: '/api/visits', result: '就诊列表', description: '按对象与时间窗查询就诊' },
      { name: '登记诊断', kind: 'command', target: '/api/diagnoses', result: '登记结果', description: '为一次就诊登记诊断' },
      { name: '床位分配', kind: 'workflow', target: '/api/beds/assign', result: '分配结果', description: '按可用状态分配或释放床位' },
    ],
  },
  {
    id: 'defense',
    name: '国防与装备骨架',
    domain: '国防与装备',
    description: '以装备与任务为中心的骨架：平台与部件的能力构成、状态留痕、部署与告警，适合先建「台账 → 状态 → 部署 → 告警」这条链。',
    checklist: [
      '先定装备台账粒度：平台与部件的层级边界',
      '能力要能挂到部件上，任务才谈得上匹配',
      '状态变更单独建记录，便于回溯与时序校验',
      '部署有时段口径，冲突才有判据',
      '任务与能力的关系先建 N-N，别急着合并',
      '告警分级与升级路径写进规则，不要留在口头约定',
    ],
    objects: [
      { name: '装备平台', code: 'platform', domain: '国防与装备', description: '可独立编号与调度的装备主体',
        attributes: [
          { name: '平台编码', type: 'string', required: true, description: '唯一标识' },
          { name: '平台名称', type: 'string', required: true, description: '展示名称' },
          { name: '平台状态', type: 'enum', required: true, description: '当前状态' },
          { name: '所属单位', type: 'reference', required: false, description: '管理单位' },
        ] },
      { name: '部件', code: 'component', domain: '国防与装备', description: '平台的组成部分，可承载能力',
        attributes: [
          { name: '部件编码', type: 'string', required: true, description: '唯一标识' },
          { name: '部件名称', type: 'string', required: true, description: '展示名称' },
          { name: '部件状态', type: 'enum', required: false, description: '当前状态' },
        ] },
      { name: '任务', code: 'mission', domain: '国防与装备', description: '需要被完成的一次任务',
        attributes: [
          { name: '任务编号', type: 'string', required: true, description: '唯一标识' },
          { name: '任务名称', type: 'string', required: true, description: '展示名称' },
          { name: '任务状态', type: 'enum', required: true, description: '流转状态' },
          { name: '计划时间', type: 'datetime', required: false, description: '计划起止时间' },
        ] },
      { name: '能力', code: 'capability', domain: '国防与装备', description: '可被装备与任务引用的能力项',
        attributes: [
          { name: '能力编码', type: 'string', required: true, description: '唯一标识' },
          { name: '能力名称', type: 'string', required: true, description: '展示名称' },
          { name: '能力类型', type: 'enum', required: false, description: '能力分类' },
          { name: '能力描述', type: 'text', required: false, description: '能力边界说明' },
        ] },
      { name: '状态', code: 'status-record', domain: '国防与装备', description: '装备或任务的一次状态变更记录',
        attributes: [
          { name: '状态记录编号', type: 'string', required: true, description: '唯一标识' },
          { name: '状态取值', type: 'enum', required: true, description: '变更后的状态' },
          { name: '变更时间', type: 'datetime', required: true, description: '状态变更的时间' },
          { name: '记录人', type: 'reference', required: false, description: '登记该变更的人员' },
        ] },
      { name: '部署', code: 'deployment', domain: '国防与装备', description: '装备在某个时间段的部署安排',
        attributes: [
          { name: '部署编号', type: 'string', required: true, description: '唯一标识' },
          { name: '部署状态', type: 'enum', required: true, description: '部署状态' },
          { name: '部署时间', type: 'datetime', required: true, description: '部署的时间' },
          { name: '部署位置', type: 'reference', required: false, description: '部署地点' },
        ] },
      { name: '告警', code: 'alarm', domain: '国防与装备', description: '由状态或部署触发的异常判定',
        attributes: [
          { name: '告警编号', type: 'string', required: true, description: '唯一标识' },
          { name: '告警等级', type: 'enum', required: true, description: '严重程度分级' },
          { name: '触发时间', type: 'datetime', required: true, description: '告警触发的时间' },
          { name: '告警状态', type: 'enum', required: false, description: '处理状态' },
        ] },
    ],
    relations: [
      { name: '平台包含部件', from: '装备平台', to: '部件', cardinality: '1-N', description: '平台由部件组成' },
      { name: '部件具备能力', from: '部件', to: '能力', cardinality: 'N-N', description: '部件承载的能力项' },
      { name: '执行任务', from: '装备平台', to: '任务', cardinality: 'N-N', description: '平台承担的任务' },
      { name: '任务要求能力', from: '任务', to: '能力', cardinality: 'N-N', description: '任务所需的能力项' },
      { name: '部署平台', from: '部署', to: '装备平台', cardinality: '1-N', description: '部署安排涉及的装备' },
    ],
    rules: [
      { name: '部件归属', type: 'constraint', expression: '部件必须挂在已登记的平台下', scope: '部件' },
      { name: '能力匹配', type: 'constraint', expression: '任务所需能力应被执行平台或其部件覆盖', scope: '任务' },
      { name: '状态时序', type: 'constraint', expression: '同一对象的状态变更时间单调不减', scope: '状态' },
      { name: '部署冲突', type: 'constraint', expression: '同一平台在同一时段只能有一个有效部署', scope: '部署' },
    ],
    actions: [
      { name: '查询装备台账', kind: 'query', target: '/api/platforms', result: '装备列表', description: '按状态与部署查询装备' },
      { name: '登记状态变更', kind: 'command', target: '/api/status', result: '登记结果', description: '记录一次状态变更' },
      { name: '能力匹配查询', kind: 'query', target: '/api/missions/capability-match', result: '匹配结果', description: '比对任务所需能力与现有能力' },
    ],
  },
  {
    id: 'geo',
    name: '地理空间骨架',
    domain: '地理空间',
    description: '以空间要素为中心的骨架：区划层级、图层组织、位置与轨迹、事件点定位，适合先建「采集 → 落点 → 归属 → 检索」这条链。',
    checklist: [
      '先定坐标口径：经纬度顺序与坐标系来源要写清',
      '区划层级无环，归属判定才有唯一解',
      '图层是组织视图，不要和要素本身混成一个概念',
      '轨迹与位置分开：轨迹是序列，位置是点',
      '事件点默认落点规则先写进规则，别留成口头约定',
      '位置与要素的采集时间字段要能排序',
    ],
    objects: [
      { name: '地理要素', code: 'feature', domain: '地理空间', description: '具有空间形状与属性的基础地理对象',
        attributes: [
          { name: '要素编号', type: 'string', required: true, description: '唯一标识' },
          { name: '要素名称', type: 'string', required: true, description: '展示名称' },
          { name: '要素类型', type: 'enum', required: true, description: '要素分类' },
          { name: '更新时间', type: 'datetime', required: false, description: '数据更新时间' },
        ] },
      { name: '行政区划', code: 'region', domain: '地理空间', description: '带层级关系的空间管理单元',
        attributes: [
          { name: '区划编码', type: 'string', required: true, description: '唯一标识' },
          { name: '区划名称', type: 'string', required: true, description: '展示名称' },
          { name: '层级', type: 'enum', required: true, description: '区划层级分类' },
          { name: '上级区划', type: 'reference', required: false, description: '上一级区划' },
        ] },
      { name: '轨迹', code: 'track', domain: '地理空间', description: '按时间排列的一串位置记录',
        attributes: [
          { name: '轨迹编号', type: 'string', required: true, description: '唯一标识' },
          { name: '轨迹名称', type: 'string', required: true, description: '展示名称' },
          { name: '开始时间', type: 'datetime', required: true, description: '轨迹起始时间' },
          { name: '结束时间', type: 'datetime', required: false, description: '轨迹结束时间' },
        ] },
      { name: '位置', code: 'position', domain: '地理空间', description: '带坐标与时间的一次空间观测',
        attributes: [
          { name: '位置编号', type: 'string', required: true, description: '唯一标识' },
          { name: '采集时间', type: 'datetime', required: true, description: '观测采集时间' },
          { name: '经度', type: 'number', required: true, description: '经度坐标' },
          { name: '纬度', type: 'number', required: true, description: '纬度坐标' },
        ] },
      { name: '事件点', code: 'point', domain: '地理空间', description: '落在空间上的一个事件标记',
        attributes: [
          { name: '事件点编号', type: 'string', required: true, description: '唯一标识' },
          { name: '事件点名称', type: 'string', required: true, description: '展示名称' },
          { name: '事件类型', type: 'enum', required: false, description: '事件分类' },
          { name: '发生时间', type: 'datetime', required: true, description: '事件发生时间' },
        ] },
      { name: '图层', code: 'layer', domain: '地理空间', description: '要素的组织与展示视图',
        attributes: [
          { name: '图层编号', type: 'string', required: true, description: '唯一标识' },
          { name: '图层名称', type: 'string', required: true, description: '展示名称' },
          { name: '图层类型', type: 'enum', required: false, description: '图层分类' },
          { name: '数据来源', type: 'string', required: false, description: '要素的来源说明' },
        ] },
    ],
    relations: [
      { name: '要素归属区划', from: '地理要素', to: '行政区划', cardinality: 'N-1', description: '要素所属的区划' },
      { name: '图层包含要素', from: '图层', to: '地理要素', cardinality: '1-N', description: '图层组织的要素集合' },
      { name: '轨迹组成位置', from: '轨迹', to: '位置', cardinality: '1-N', description: '轨迹上的位置序列' },
      { name: '位置落在区划', from: '位置', to: '行政区划', cardinality: 'N-1', description: '位置所属的区划' },
      { name: '事件点定位', from: '事件点', to: '位置', cardinality: 'N-1', description: '事件点落到的位置' },
    ],
    rules: [
      { name: '坐标完整', type: 'constraint', expression: '位置记录必须同时具备经度与纬度', scope: '位置' },
      { name: '区划无环', type: 'constraint', expression: '行政区划的上下级关系不出现环', scope: '行政区划' },
      { name: '时间有序', type: 'constraint', expression: '轨迹上的位置按采集时间单调不减', scope: '轨迹' },
      { name: '默认定位', type: 'default', expression: '事件点未指定位置时，取轨迹上最近的一条位置', scope: '事件点' },
    ],
    actions: [
      { name: '空间要素查询', kind: 'query', target: '/api/features', result: '要素列表', description: '按图层与空间范围查询要素' },
      { name: '位置上报', kind: 'command', target: '/api/positions', result: '入库结果', description: '上报一条位置记录' },
      { name: '轨迹汇总', kind: 'workflow', target: '/api/tracks/summary', result: '汇总结果', description: '按时间窗汇总轨迹与停留点' },
    ],
  },
  {
    id: 'finance',
    name: '金融与风控骨架',
    domain: '金融与风控',
    description: '以账户与资金流为中心的骨架：客户与账户、交易流水、额度占用、策略路由与周期对账，适合先建「登记 → 判定 → 对账」这条链。',
    checklist: [
      '先定账户与客户的归属关系，额度才有承载',
      '交易方向用枚举表达正负，别靠符号约定',
      '额度口径写清有效期与占用算法',
      '策略要能挂到账户与交易上，判定才落得下',
      '风险事件与交易分开建模，便于追溯',
      '对账周期与差异口径要能复算',
    ],
    objects: [
      { name: '客户', code: 'customer', domain: '金融与风控', description: '服务与风控的归属主体',
        attributes: [
          { name: '客户编号', type: 'string', required: true, description: '唯一标识' },
          { name: '客户名称', type: 'string', required: true, description: '展示名称' },
          { name: '客户状态', type: 'enum', required: true, description: '客户状态' },
          { name: '客户类型', type: 'enum', required: false, description: '客户分类' },
        ] },
      { name: '账户', code: 'account', domain: '金融与风控', description: '承载资金与账务的基本单元',
        attributes: [
          { name: '账户编号', type: 'string', required: true, description: '唯一标识' },
          { name: '账户名称', type: 'string', required: true, description: '展示名称' },
          { name: '账户状态', type: 'enum', required: true, description: '账户状态' },
          { name: '开户时间', type: 'date', required: false, description: '开户日期' },
        ] },
      { name: '交易', code: 'transaction', domain: '金融与风控', description: '一次资金或账务变动记录',
        attributes: [
          { name: '交易编号', type: 'string', required: true, description: '唯一标识' },
          { name: '交易时间', type: 'datetime', required: true, description: '交易发生时间' },
          { name: '交易金额', type: 'money', required: true, description: '变动金额' },
          { name: '交易方向', type: 'enum', required: true, description: '资金方向' },
          { name: '交易状态', type: 'enum', required: false, description: '处理状态' },
        ] },
      { name: '额度', code: 'quota', domain: '金融与风控', description: '对某主体在某有效期内的限额定义',
        attributes: [
          { name: '额度编号', type: 'string', required: true, description: '唯一标识' },
          { name: '额度类型', type: 'enum', required: true, description: '额度分类' },
          { name: '额度金额', type: 'money', required: true, description: '限额金额' },
          { name: '有效期起', type: 'date', required: false, description: '有效期开始日' },
          { name: '有效期止', type: 'date', required: false, description: '有效期结束日' },
        ] },
      { name: '策略', code: 'policy', domain: '金融与风控', description: '可被命中并路由的判定与处置策略',
        attributes: [
          { name: '策略编码', type: 'string', required: true, description: '唯一标识' },
          { name: '策略名称', type: 'string', required: true, description: '展示名称' },
          { name: '策略状态', type: 'enum', required: true, description: '启用状态' },
          { name: '策略说明', type: 'text', required: false, description: '策略口径说明' },
        ] },
      { name: '风险事件', code: 'risk-event', domain: '金融与风控', description: '命中判定后登记的风险记录',
        attributes: [
          { name: '风险事件编号', type: 'string', required: true, description: '唯一标识' },
          { name: '风险等级', type: 'enum', required: true, description: '严重程度分级' },
          { name: '发生时间', type: 'datetime', required: true, description: '事件发生时间' },
          { name: '处置状态', type: 'enum', required: false, description: '处置进展状态' },
        ] },
      { name: '对账', code: 'reconciliation', domain: '金融与风控', description: '按周期比对账务并生成差异的记录',
        attributes: [
          { name: '对账编号', type: 'string', required: true, description: '唯一标识' },
          { name: '对账周期', type: 'string', required: true, description: '对账周期标识' },
          { name: '对账状态', type: 'enum', required: true, description: '对账状态' },
          { name: '生成时间', type: 'datetime', required: true, description: '对账结果生成时间' },
        ] },
    ],
    relations: [
      { name: '客户持有账户', from: '客户', to: '账户', cardinality: '1-N', description: '客户名下的账户' },
      { name: '账户发生交易', from: '账户', to: '交易', cardinality: '1-N', description: '账户上的资金变动' },
      { name: '账户适用策略', from: '账户', to: '策略', cardinality: 'N-N', description: '账户适用的判定策略' },
      { name: '客户授信额度', from: '客户', to: '额度', cardinality: '1-N', description: '客户获得的限额' },
      { name: '对账对象', from: '对账', to: '账户', cardinality: '1-N', description: '参与对账的账户' },
    ],
    rules: [
      { name: '账户归属', type: 'constraint', expression: '账户必须归属一个已登记的客户', scope: '账户' },
      { name: '额度占用', type: 'calculation', expression: '已用额度 = 有效期内交易占用金额之和', scope: '额度' },
      { name: '策略路由', type: 'routing', expression: '按交易特征命中策略并路由到对应审核流程', scope: '策略' },
      { name: '风险闭环', type: 'routing', expression: '风险事件按登记、核查、处置、归档的顺序流转', scope: '风险事件' },
    ],
    actions: [
      { name: '查询账户', kind: 'query', target: '/api/accounts', result: '账户列表', description: '按客户与状态查询账户' },
      { name: '登记交易', kind: 'command', target: '/api/transactions', result: '登记结果', description: '登记一笔交易并触发策略判定' },
      { name: '生成对账差异', kind: 'workflow', target: '/api/reconciliations/diff', result: '差异清单', description: '按周期比对并生成差异' },
    ],
  },
  {
    id: 'knowledge',
    name: '知识与文档骨架',
    domain: '知识与文档',
    description: '以内容资产为中心的骨架：文档与章节结构、概念术语、标签体系、引用关系与版本演进，适合先建「编写 → 发布 → 引用 → 演进」这条链。',
    checklist: [
      '先定文档结构：章节层级怎么编号、怎么排序',
      '概念是术语表，章节是内容，两者分开建模',
      '引用要能追溯到目标文档与位置',
      '版本号规则先统一，否则演进记录没法比',
      '标签分类写清楚，检索口径才收得住',
      '每份文档都要有状态与更新时间',
    ],
    objects: [
      { name: '文档', code: 'document', domain: '知识与文档', description: '一份可发布、可引用、可演进的完整内容',
        attributes: [
          { name: '文档编号', type: 'string', required: true, description: '唯一标识' },
          { name: '文档标题', type: 'string', required: true, description: '展示标题' },
          { name: '文档状态', type: 'enum', required: true, description: '发布状态' },
          { name: '更新时间', type: 'datetime', required: false, description: '最近更新时间' },
        ] },
      { name: '章节', code: 'section', domain: '知识与文档', description: '文档内可被引用的结构片段',
        attributes: [
          { name: '章节编号', type: 'string', required: true, description: '唯一标识' },
          { name: '章节标题', type: 'string', required: true, description: '展示标题' },
          { name: '章节序号', type: 'number', required: true, description: '文档内序号' },
          { name: '章节层级', type: 'number', required: false, description: '层级深度' },
        ] },
      { name: '概念', code: 'concept', domain: '知识与文档', description: '统一口径的术语条目',
        attributes: [
          { name: '概念编码', type: 'string', required: true, description: '唯一标识' },
          { name: '概念名称', type: 'string', required: true, description: '展示名称' },
          { name: '概念定义', type: 'text', required: false, description: '术语定义' },
          { name: '概念状态', type: 'enum', required: false, description: '启用状态' },
        ] },
      { name: '标签', code: 'tag', domain: '知识与文档', description: '用于归类与检索的标记',
        attributes: [
          { name: '标签编码', type: 'string', required: true, description: '唯一标识' },
          { name: '标签名称', type: 'string', required: true, description: '展示名称' },
          { name: '标签分类', type: 'enum', required: false, description: '标签分类' },
        ] },
      { name: '引用', code: 'reference', domain: '知识与文档', description: '一条指向其他内容的关系记录',
        attributes: [
          { name: '引用编号', type: 'string', required: true, description: '唯一标识' },
          { name: '引用位置', type: 'string', required: false, description: '引用出现的位置' },
          { name: '引用类型', type: 'enum', required: false, description: '引用类型分类' },
          { name: '引用时间', type: 'datetime', required: false, description: '引用登记时间' },
        ] },
      { name: '版本', code: 'version', domain: '知识与文档', description: '文档的一次发布快照',
        attributes: [
          { name: '版本号', type: 'string', required: true, description: '版本标识' },
          { name: '版本标题', type: 'string', required: true, description: '展示标题' },
          { name: '发布状态', type: 'enum', required: true, description: '发布状态' },
          { name: '发布时间', type: 'datetime', required: false, description: '发布时间' },
        ] },
    ],
    relations: [
      { name: '文档包含章节', from: '文档', to: '章节', cardinality: '1-N', description: '文档的结构片段' },
      { name: '章节引用条目', from: '章节', to: '引用', cardinality: '1-N', description: '章节中出现的引用' },
      { name: '引用指向文档', from: '引用', to: '文档', cardinality: 'N-1', description: '引用所指向的目标文档' },
      { name: '章节涉及概念', from: '章节', to: '概念', cardinality: 'N-N', description: '章节中涉及的术语' },
      { name: '版本隶属于文档', from: '版本', to: '文档', cardinality: 'N-1', description: '版本所属的文档' },
    ],
    rules: [
      { name: '章节有序', type: 'constraint', expression: '章节在同一文档内的序号唯一且层级不出现环', scope: '章节' },
      { name: '版本唯一', type: 'constraint', expression: '同一文档的版本号不重复且发布时间单调不减', scope: '版本' },
      { name: '引用存在', type: 'constraint', expression: '引用条目指向的文档必须已登记', scope: '引用' },
      { name: '标签归一', type: 'default', expression: '标签未指定分类时归入默认分类', scope: '标签' },
    ],
    actions: [
      { name: '检索文档', kind: 'query', target: '/api/documents', result: '文档列表', description: '按关键词与标签检索文档' },
      { name: '发布文档版本', kind: 'command', target: '/api/documents/versions', result: '发布结果', description: '为文档创建一个新版本' },
      { name: '汇总引用关系', kind: 'workflow', target: '/api/references/graph', result: '关系数据', description: '按文档范围汇总引用关系' },
    ],
  },
]

/**
 * 把一套骨架模板实例化进本体台账。
 *
 * 生成的对象 / 关系 / 规则 / 行动都是「AI 草稿」，仍需专家用 ontology_asset_review
 * 校准后才算确认——模板只负责给一个可编辑的起点，不替用户做业务判断。
 */
export function applyOntologyTemplate(ontology, templateId, by = '', targetOntologyId = '') {
  const template = ONTOLOGY_TEMPLATES.find(item => item.id === String(templateId ?? '').trim())
  if (template === undefined) return { ok: false, ontology, created: [], template: null }
  let next = ontology
  const created = []
  const stamp = { ontologyId: targetOntologyId, status: 'draft', source: 'ai', by }
  for (const object of template.objects) {
    next = upsertOntologyAsset(next, 'object', { ...object, ...stamp }, by)
    created.push(object.name)
  }
  for (const relation of template.relations) {
    next = upsertOntologyAsset(next, 'relation', { ...relation, ...stamp }, by)
    created.push(`${relation.from} → ${relation.to}（${relation.name}）`)
  }
  for (const rule of template.rules) {
    next = upsertOntologyAsset(next, 'rule', { ...rule, ...stamp }, by)
    created.push(rule.name)
  }
  for (const action of template.actions) {
    next = upsertOntologyAsset(next, 'action', { ...action, ...stamp }, by)
    created.push(action.name)
  }
  return { ok: true, ontology: next, created, template }
}

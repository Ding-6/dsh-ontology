# 本体开发工作台 · 操作手册 V1.0

> 适用版本：**v0.6.0** · 插件包名：`@ding-6/dsh-ontology` · 面板名：**本体建模工作空间** · 浏览器入口：`http://127.0.0.1:<dsh 端口>`
>
> 这本手册讲**怎么用这个面板**：装好之后按什么顺序点、每一步留下什么痕迹、出了问题去哪看。
> 方法论（本体开发该怎么做、模型怎么设计）看 [ontology-guide.md](ontology-guide.md)；安装与发版看 [README.md](../README.md)。

---

## 0. 三分钟速览

| 你要做的事 | 去哪 | 一句话 |
| --- | --- | --- |
| 把业务对象 / 关系 / 规则 / 行动装进来 | **语义层** 页签 | 台账是空的，从「登记为 AI 草稿」开始 |
| 看看模型还缺什么 | 语义层 →「缺口检查」「建模建议」 | 机器先点名，专家再校准 |
| 出一份能写代码的方案 | 语义层 →「生成蓝图」 | 六章：数据模型 / 规则引擎 / API / 前端 / 驱动 / 测试 |
| 把本体对外提供能力 | 语义层 →「服务封装」 | 出通用 MCP 工具或专有 SDK |
| 查平台怎么操作 | 语义层 →「手册库」 | 内置《智元·本体智能体平台操作手册 V2.0》86 章 |
| 排一条开发流水线 | **场景** → **看板** | 需求 → 功能点 → 卡 → 四类专家接力 → 用例 → 验收 |
| 看谁在忙 / 哪里堵了 | **工作台** 页签 | 在办、逾期、阻塞、缺陷超时、准出被拦 |
| 发一个本体版本 | **本体版本** 页签 | 版本 → 灰度批次 → 发布门禁 |

**一句话原理**：浏览器只认 `/ontology-api`；状态全在 SQLite；专家是 DSH 会话，写回来的东西也落 SQLite。

---

## 1. 面板总览：9 个页签

| 页签 | 里面有什么 | 什么时候用 |
| --- | --- | --- |
| **工作台** | 今天该看什么：在办、逾期、阻塞、缺陷超时、准出被拦、集成异常 | 每天开工第一眼 |
| **看板** | 八列生命周期卡片、角色负责人、卡片带进度 / 用例 / 交付物 | 推进具体一件事 |
| **语义层** | 统一语义层台账：对象 / 关系 / 规则 / 行动 / 术语 / 实例 / 形状 / 场景，多本体并存 | 建模型、对模型 |
| **场景** | 本体场景（需求）、功能点、可追溯矩阵、场景级准出、RICE 需求池 | 立项与拆解 |
| **校验** | 跨卡用例总览：谁在跑、最近结果、挂在哪个场景 | 验证与回归 |
| **本体版本** | 版本清单、发布门禁、灰度批次、部署记录 | 交付与上线 |
| **项目** | 业务项目、迭代、每个服务对应的代码目录 | 代码落地 |
| **效能** | 周期分布、每列停留、团队负载、返工率、AI 成本 | 复盘与调优 |
| **设置** | 列、模型、自动派单、集成、权限、备份（17 个面板） | 配置与维护 |

> 顶部「＋ 新建」只有两个入口：**新建需求**（先建需求，再按功能点拆卡）与**新建任务**（直接在看板上建卡）。

---

## 2. 第一次打开：插件出厂是空的

**这是 v0.6.0 起的设计**：语义层台账里没有任何示例业务数据（0 对象 / 0 关系 / 0 规则 / 0 行动），看板也没有任何卡和需求。所有内容由你自己添加。

因此第一次打开时你会看到：

- 语义层：三个统计格全是 0，缺口检查报「语义层还没有任何业务对象」，闸门未就绪 —— **这是正常状态**，不是故障。
- 看板：空列。点「＋ 新建」开始。
- 场景 / 校验 / 本体版本：空列表。

三种把内容加进来的方式（详见 §4.3）：

1. **手工登记**：语义层里点「登记为 AI 草稿」，一条条填字段。
2. **领域骨架模板**：八套骨架生成结构，再按自己的业务改（同样落成 AI 草稿）。
3. **导入 JSON**：从别处迁进来的台账，`/ontology-api/ontology/import`。

---

## 3. 语义层：把业务装进统一语义层

### 3.1 先建本体容器（多本体并存）

一个业务一套本体，互不污染。语义层顶部有「全部本体 / 新建本体」。

- 点「新建本体」→ 填名称与说明 → 得到一个容器（默认本体不能删）。
- 顶部切换当前本体：**服务封装**与**应用蓝图**都按当前本体生成。
- 导出 JSON 时选「全部本体」或某个本体。

### 3.2 八类资产速查

| 层 | 资产 | 关键字段 |
| --- | --- | --- |
| 数据层 | **业务对象** | 编码 / 业务域 / 属性（名称 + 类型，必填标 `!`） |
| | **对象关系** | 起点 / 关系名 / 终点 / 基数（1-1、1-N、N-1、N-N） |
| | **术语方案** | 英文标识 / 显示名 / 上位词 / 下位词 |
| | **对象实例** | 所属类 / 属性值 |
| 逻辑层 | **业务规则** | 类型（约束 / 派生 / 默认 / 计算 / 路由）/ 表达式语言（自然语言 / SHACL / JSONLogic / SQL / 公式）/ 作用范围 |
| | **校验形状** | 目标类 / 约束（路径 + 算子 + 取值 + 提示）/ 严重级别 |
| 行动层 | **可调用行动** | 类型（查询 / 写入 / 通知 / 工作流）/ 目标系统 / 入参 / 返回 / 前置条件 / 副作用 / 是否幂等 |
| | **应用场景** | 解决什么 / 参与者 / 输入 / 输出 / 关联资产 |

> 写规则时表达式语言选「自然语言」也可以，平台不替你判定真假——但**没有表达式的规则会被缺口检查点名**。

### 3.3 三种加资产的方式

**方式一：手工登记（默认路径）**

1. 语义层 → 选层（数据层 / 逻辑层 / 行动层）→ 选资产类型 → 填表。
2. 点「**登记为 AI 草稿**」。资产落成「AI 草稿」状态。
3. 找一位专家（业务 / 架构 / 建模 / 校验）校准：草稿卡片上有「**通过**」「**废弃**」两个按钮，**必须写一句校准结论**（结论会进资产台账）。
   - 通过 → 状态变「已确认」，计入覆盖率；
   - 废弃 → 状态变「已废弃」，不计入覆盖率。

**方式二：领域骨架模板（先有结构，再填业务）**

语义层 →「领域骨架」区 → 选一套 → 点「**生成骨架**」。八套可选：

`general` 通用 · `industrial` 工业与物联网 · `safety` 公共安全 · `health` 医疗健康 · `defense` 国防与装备 · `geo` 地理空间 · `finance` 金融与风控 · `knowledge` 知识与文档

骨架**只给结构**（对象 / 关系 / 规则 / 行动），不含行业业务数据；实例化后同样是「AI 草稿」，你按自己的业务改名、删减、补字段，再走校准。

**方式三：导入 JSON**

`POST /ontology-api/ontology/import`，body 传完整台账（导出 JSON 的同构）。**导入会整体替换台账**，先备份再导。

### 3.4 看缺口与建模建议

- **缺口检查**（机器自检）：没有属性的对象、悬空的关系、没有表达式的规则、没有目标的行动，都会被点名。
- **建模建议**（机器先看一遍）：按 `blocker`（阻塞）/ `warn`（提醒）/ `info`（提示）给可执行的修改点。
- **闸门条**：缺口清零且草稿全部校准后，顶部才会出现「语义层可以对外提供能力」。**提示只提示、缺口才拦**——拦多了会被绕过。

### 3.5 服务封装：本体对外提供能力

语义层 →「服务封装」→ 选封装类型（对象 / 关系 / 规则 / 行动）+ 协议 → 点「**生成**」：

- **通用 MCP 协议**：产出可直接挂进 DSH / MCP 客户端的工具定义（对象封装即一个「按条件查对象」的工具）。
- **专有本体 SDK**：产出 TypeScript 片段，把语义层做成业务方直接 import 的领域模型。

### 3.6 应用蓝图：语义层 → 能写代码的方案

语义层 →「应用蓝图」→ 勾选章节 → 点「**生成蓝图**」，得到六章可执行方案：

1. 数据模型设计（表 / 列 / SQL 类型 / 外键）
2. 规则引擎设计（规则分组 / 依赖求值顺序 / 冲突口径 / TS 骨架）
3. 后端与 API 契约（REST 路径 / OpenAPI 3.1 / 错误码 / Repository 骨架）
4. 前端设计（页面清单 / 字段组件 / 状态管理 / schema 骨架）
5. 本体怎么驱动应用（流水线七步 / 目录约定 / 护栏）
6. 测试方案（可执行的 HTTP 用例矩阵）

> 蓝图是**按你的台账**生成的：台账是空的，生成出来也是空的骨架——先建模型，再生成蓝图。

### 3.7 手册库：让它教你操作平台

- 「**载入到手册库**」：把内置《智元·本体智能体平台操作手册 V2.0》（86 章，随包分发）载入手册库；可重复点，不会重复建。
- 「**存入手册**」：把你自己的平台手册正文存进同一本库。
- 「**检索**」：关键词搜索，命中项标注来源（`library` 已入库 / `builtin` 内置书 / `library+builtin` 两者都有）并给摘要片段。
- 专家用 `ontology_guide_search` 检索后**照手册教你操作**，不会编造平台步骤。

---

## 4. 把开发流程接进来：场景 → 卡 → 专家 → 用例 → 验收

本体建好之后，真正的工程过程在**场景**与**看板**里。

### 4.1 场景（需求）与功能点

- 「＋ 新建」→「新建需求」。需求正文六段齐全：**背景 / 目标 / 范围 / 不做 / 验收 / 风险**——一句话需求会被拆成一堆没法验收的卡。
- 澄清三问（**必答**）：有没有服务端 / 鉴权谁做 / 交付边界。答不完不许拆卡。
- 功能点：一条条写**验收标准**（后面长用例靠它）。挂功能点 id 的卡才进可追溯矩阵。
- RICE 需求池打分、待确认清单、变更历史都在这一页；基线可逐行对比与回滚。

### 4.2 看板八列与四类角色

列：`待澄清 → 待方案 → 待开发 → 开发中 → 待评审 → 待测试 → 待验收 → 已完成`

角色：**业务（产品）** / **架构** / **建模（研发）** / **校验（测试）**。每张卡有负责人、清单、用例、交付物、执行记录、讨论。

- 卡住时用「阻塞」标记，**卡留在原列等人决定**，不会自动往下派。
- 研发提 MR 后自动进「待评审」，架构评审通过才放行到「待测试」，不通过退回「开发中」。

### 4.3 派单与专家接力

- 设置 → 自动派单：开关、并发上限、角色与模型。卡进「待方案 / 待开发 / 待测试」自动派给对应角色。
- 评论里 `@` 专家名 / 专家团名可以点名接棒；专家团是「团长 + @ 接棒」模式，带团级记忆（反复踩的坑会变成硬提示）。
- **每完成一步都要留痕**：评论 + 交付物 + 提交。只改状态不留言 = 没做。

### 4.4 校验用例与缺陷

- 校验页签是跨卡用例总览：能勾选批量跑、跑失败自动开缺陷卡（父任务指向来源卡）。
- 用例能写成接口调用的，就写 method / url / 期望状态码 / 期望包含 → 平台直接发请求并回写结果。
- 跑不了的（人工操作、看 UI、连设备）自己执行，再回填结果与证据。

### 4.5 准出与签字

| 层级 | 卡准出 | 需求准出 |
| --- | --- | --- |
| 拦 | 清单没勾完 / 有用例失败 / 卡被阻塞 / 没人签字 | 没有产品输出 / 评审没过 / 卡没完成 / 缺陷未关 / 一条跑过的用例都没有 / 没签字 |
| 只提示 | 功能点没验收标准、RICE 没打分、被强推的卡 | 有卡是强推的、有用例没跑过、有用例被跳过 |

- 确实要提前签，用 `override` 写一句原因——**逃生舱可以开，但会留痕**。
- 需求签字前先算准出；签字前 `ontology_requirement_get` 返回的 `progress.gate.blockers` 会列出差什么。

### 4.6 本体版本与灰度

- 版本（草稿 / 待发布 / 已审批）→ 关联卡 → 冒烟清单 → **发布门禁**（tag 名、关联卡、冒烟清单必填）。
- 灰度：按批次加百分比 → 标记运行中 / 通过 → 可回滚（回滚整版）。
- 发布被拦时看 `ontology_release_get` 的 gate blockers。

---

## 5. 其它页签速查

- **工作台**：逾期、阻塞、缺陷超时、准出被拦、流水线失败、需求/版本卡住、集成异常——一次看全。
- **项目**：业务项目 + 迭代 + 服务（每个服务有自己的本地 git 路径与基线分支，卡选服务决定从哪切 worktree）。
- **效能**：一次通过率、返工率、周期分布与中位/P90、每列停留、吞吐、AI 成本。
- **设置**（17 个面板）：看板列、专家与模型、自动派单、集成（GitLab / 飞书 / webhook）、权限成员、审计、快照备份、成本与预算、用例执行开关等。

---

## 6. 键盘与命令面板

| 操作 | 快捷键 |
| --- | --- |
| 全局搜索（卡片 / 需求 / 版本 / 专家 / 专家团 / 项目 / 技能）与动作面板 | `⌘K` / `Ctrl+K` |
| 新建需求 / 新建任务 / 新建语义层对象 | `Ctrl/⌘ + Alt + Shift + N / T / D` |

> 带 `Shift` 是为了避开宿主的 `Ctrl+Alt+N`（新会话）。

---

## 7. 给 AI 专家的接口

### 7.1 工具（50 个 `ontology_*`）

| 组 | 工具 |
| --- | --- |
| 语义层 | `ontology_semantics_get` `ontology_asset_save` `ontology_asset_review` `ontology_review_advice` `ontology_blueprint` `ontology_template` `ontology_service_export` `ontology_container` |
| 手册 | `ontology_guide_load` `ontology_guide_save` `ontology_guide_search` |
| 需求与卡 | `ontology_requirement_list` `ontology_requirement_get` `ontology_requirement_save` `ontology_requirement_signoff` `ontology_requirement_folder` `ontology_task_list` `ontology_task_get` `ontology_task_create` `ontology_task_update` `ontology_task_signoff` `ontology_task_generate_cases` `ontology_task_block` `ontology_task_unblock` `ontology_task_comment` `ontology_task_artifact` `ontology_task_check` `ontology_task_coding` `ontology_task_case` `ontology_bug_duplicate` |
| 校验 | `ontology_test_run` `ontology_test_suite` |
| 版本与项目 | `ontology_release_list` `ontology_release_get` `ontology_release_save` `ontology_release_publish` `ontology_release_gray` `ontology_project_save` `ontology_project_list` |
| 观测与配置 | `ontology_dashboard` `ontology_workload` `ontology_burndown` `ontology_analytics` `ontology_costs` `ontology_config_get` `ontology_config_set` |
| 技能 | `ontology_skill_list` `ontology_skill_get` `ontology_skill_save` `ontology_skill_delete` |

### 7.2 HTTP API（前缀 `/ontology-api`）

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/ontology` | 台账 + 统计 + 覆盖率 + 闸门 + 建模建议 + 模板清单 |
| GET | `/ontology/export` | 导出 JSON（可带 `?ontologyId=`） |
| POST | `/ontology/asset` | 登记 / 更新资产（落成 AI 草稿） |
| POST | `/ontology/asset/delete` | 删除资产（`kind` + `id`；手册用 `kind='guide'`） |
| POST | `/ontology/review` | 专家校准（`kind` `id` `decision` `note` `by`） |
| POST | `/ontology/container` · `/ontology/container/delete` | 新建 / 删除本体容器 |
| POST | `/ontology/blueprint` | 生成应用蓝图 |
| GET | `/ontology/templates` · POST | `/ontology/template` | 领域骨架清单 / 实例化骨架（`templateId` + `by`） |
| POST | `/ontology/guide` · `/ontology/guide/delete` · `/ontology/guide/search` | 存入手册 / 删手册 / 检索 |
| GET / POST | `/ontology/guide/book` | 内置手册书信息 / 载入到手册库 |
| POST | `/ontology/import` | 导入台账（整体替换） |
| POST | `/ontology/service` | 服务封装（MCP / SDK） |
| GET | `/state` | 全量状态（响应是 `{ ok, state }`，**别拿错层级**） |
| POST | `/task/delete` · `/requirement/delete` | 删卡 / 删需求（先删卡，删需求只解绑卡） |

---

## 8. 数据存在哪：备份、清空、恢复

### 8.1 位置

| 内容 | 路径 |
| --- | --- |
| 台账 / 看板 / 状态 / 快照 | `~/.dsh/dsh-ontology.db`（`node:sqlite`，WAL，保留 10 份快照） |
| 密钥（GitLab token、飞书密钥） | `~/.dsh/dsh-ontology.secrets.json`（0600，**不写进 state、不进日志**） |
| 技能库 | `~/.dsh/skills/<name>/SKILL.md` |
| 历史遗留 | `~/.dsh/dsh-ontology.json`（旧格式，一般不再用） |

### 8.2 备份（删数据前必做）

```bash
# 关掉正在跑的 dsh，或至少确保没有写事务
cp ~/.dsh/dsh-ontology.db      /tmp/dsh-ontology.db.bak
cp ~/.dsh/dsh-ontology.db-wal  /tmp/dsh-ontology.db-wal.bak
cp ~/.dsh/dsh-ontology.db-shm  /tmp/dsh-ontology.db-shm.bak
```

> Windows 上三个文件要一起拷（WAL 模式下数据可能还在 `-wal` 里）。

### 8.3 清空重来（回到出厂状态）

**语义层台账**（逐条删，接口幂等、可中断）：

```bash
BASE=http://127.0.0.1:<port>/ontology-api
# 先看有哪些
curl -s $BASE/ontology | jq '.stats'
# 再逐条删（kind 取 object/relation/rule/action/vocabulary/individual/shape/application/service/guide）
curl -s -XPOST $BASE/ontology/asset/delete -H 'content-type: application/json' -d '{"kind":"object","id":"obj-xxxx"}'
```

**看板与需求**：

```bash
curl -s -XPOST $BASE/task/delete       -H 'content-type: application/json' -d '{"id":"t-xxxx"}'
curl -s -XPOST $BASE/requirement/delete -H 'content-type: application/json' -d '{"id":"req-xxxx"}'
```

> 顺序：**先删卡，再删需求**（删需求只把卡解绑，不删卡）。
> 每次删除都会写一条审计记录，所以审计面板会变长——那是留痕，不是异常。

### 8.4 恢复

把备份的三个文件放回 `~/.dsh/`，重启 DSH 即可。

---

## 9. 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| 语义层一片空白、没有资产 | **出厂状态就是这样**（0/0/0/0）。从「登记为 AI 草稿」或「生成骨架」开始 |
| 页面显示「工作空间渲染失败：xxx is not defined」 | 面板内部报错了，浏览器 console 里看 `ReferenceError`；`pageerror` 可能为空，以页面文字为准 |
| 弹窗存在但看不见 | 弹层容器必须同时带 `data-dsh-studio` 与 `data-dsh-studio-portal` 两个属性 |
| 点了没反应 / 按钮一直是灰的 | 面板有 `busy` 态在跑动作，等它结束；跨卡批量跑用例时更慢 |
| 找不到「并入可选示例」 | v0.6.0 起**已删除示例数据**，插件不再自带任何业务样例 |
| 手册检索没结果 | 手册库要先「载入到手册库」，或先「存入手册」；内置书检索走的是内置章节 |
| 派单没留言 | 会话日志里找 `turn/end reason.kind=error`；常见是模型无可用通道（503） |
| 改了代码不生效 | 宿主按文件 URL 缓存 ESM 模块：改完要**换真实路径**（或重启 DSH），清缓存无效 |
| 数据看着不对 | 先看 `/ontology-api/state` 的 `revision` 是否递增；再跑 `npm run smoke:store -- ~/.dsh/dsh-ontology.db` 用真库副本起一遍 |

---

## 10. 自检与维护命令（管理员）

| 命令 | 挡什么 |
| --- | --- |
| `npm test` | 124 条契约：manifest、产物哈希、宿主接口、跨模块导入、迁移与文档一致性 |
| `cd web && npm run guard` | CSS 颜色写法、Radix Portal 容器、产物门户作用域属性 |
| `npm run smoke:store -- ~/.dsh/dsh-ontology.db` | 用生产库副本跑真实启动路径，抓「空库能起、真库就炸」 |
| `npm run release:check` | 发版前文档自检（CHANGELOG / compatibility / README 脚本清单） |
| `npm run verify:ontology` | 语义层端到端探针（空台账 → 登记 → 校准 → 蓝图 → 手册 → MCP 封装） |
| `npm run sync:live` | 改了代码让本机 DSH 立刻生效（同步到活路径 + 重指 profile 依赖，见 §9「改了代码不生效」） |

---

## 11. 相关文档

| 想了解 | 看这里 |
| --- | --- |
| 本体开发方法论（从业务分析到蓝图） | [ontology-guide.md](ontology-guide.md) |
| 安装、功能地图、门禁链、已知限制 | [README.md](../README.md) |
| 第一天上手（三条命令） | [quickstart.md](quickstart.md) |
| 登录与免登录 | [auth.md](auth.md) |
| 每个版本改了什么 | [CHANGELOG.md](../CHANGELOG.md) |

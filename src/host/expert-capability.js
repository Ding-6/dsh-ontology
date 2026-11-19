// 专家的「能力配置」清洗：可调用工具白名单、额外挂载的插件包、接入的 MCP 服务。
// 纯函数（不碰状态），宿主存储与前端表单共用同一套口径。

/** 工具白名单：空 = 不限制（该专家能调全部 ontology_* 工具）。 */
export function sanitizeExpertTools(input) {
  return (Array.isArray(input) ? input : String(input ?? '').split(/[,，\s]+/))
    .map(tool => String(tool ?? '').trim().slice(0, 60))
    .filter(tool => tool.length > 0)
    .filter((tool, index, all) => all.indexOf(tool) === index)
    .slice(0, 60)
}

/** 额外挂载的插件包名（运行时需要宿主已经装上这个包）。 */
export function sanitizeExpertPlugins(input) {
  return (Array.isArray(input) ? input : String(input ?? '').split(/[,，\s]+/))
    .map(plugin => String(plugin ?? '').trim().slice(0, 80))
    .filter(plugin => plugin.length > 0)
    .filter((plugin, index, all) => all.indexOf(plugin) === index)
    .slice(0, 12)
}

/**
 * 专家自己接入的 MCP 服务配置（一个专家可接多个）。
 * 只收白名单字段；stdio 需要 command，streamable-http 需要 url。
 */
export function sanitizeExpertMcp(input) {
  const list = Array.isArray(input) ? input : []
  const out = []
  for (const raw of list.slice(0, 8)) {
    if (raw === null || typeof raw !== 'object') continue
    const serverName = String(raw.serverName ?? raw.name ?? '').trim().slice(0, 32)
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(serverName)) continue
    const transport = raw.transport === 'streamable-http' ? 'streamable-http' : 'stdio'
    const entry = { serverName, transport }
    if (transport === 'stdio') {
      entry.command = String(raw.command ?? '').trim().slice(0, 300)
      if (entry.command === '') continue
      entry.args = (Array.isArray(raw.args) ? raw.args : []).map(arg => String(arg ?? '').slice(0, 300)).slice(0, 20)
      entry.cwd = String(raw.cwd ?? '').trim().slice(0, 300)
      const env = {}
      for (const [key, value] of Object.entries(raw.env ?? {})) env[String(key).slice(0, 80)] = String(value ?? '').slice(0, 500)
      entry.env = env
    } else {
      entry.url = String(raw.url ?? '').trim().slice(0, 500)
      if (entry.url === '') continue
      const headers = {}
      for (const [key, value] of Object.entries(raw.headers ?? {})) headers[String(key).slice(0, 80)] = String(value ?? '').slice(0, 500)
      entry.headers = headers
    }
    out.push(entry)
  }
  return out
}

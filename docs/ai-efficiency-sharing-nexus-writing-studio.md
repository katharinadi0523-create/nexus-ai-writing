# AI 提效分享文档：用 Vibe Coding 从 0 到 1 搭建 Nexus Writing Studio Lite

## 1. 分享主线

本次分享不讲“AI 写代码有多快”，而是讲一个更具体的问题：

产品团队如何用 vibe coding，把一个 AI 写作产品从想法推进到可运行 MVP。

本次现场要创建的应用是 `Nexus Writing Studio Lite`。它不是当前完整项目的复刻，而是从完整项目中抽取两条最核心的产品链路：

1. 通用大模型写作：用户输入写作需求，系统生成大纲，用户确认后流式生成正文。
2. AF 智能体写作：用户选择业务智能体，输入任务，系统调用 AF 智能体 chat 接口并展示执行结果。

## 2. 现场约束

### 时间约束

总时长 15 分钟。

建议开两个 coding agent 会话并行推进：

| 会话 | 负责内容 | 价值 |
| --- | --- | --- |
| 会话 A | 应用骨架、通用写作链路、前端主界面 | 保证产品主流程成型 |
| 会话 B | AF 智能体接口适配、智能体模式接入 | 保证第二条能力链路并行推进 |

### MVP 边界

本次必须完成：

1. 一个可运行的 React + TypeScript + Vite 应用。
2. 一个 Node/Express 本地 API 服务。
3. 两种写作模式：
   - `general`：通用大模型写作。
   - `agent`：AF 智能体写作。
4. 通用写作支持：
   - 输入需求。
   - 生成 Markdown 大纲。
   - 编辑大纲。
   - 确认大纲后流式生成正文。
5. AF 智能体写作支持：
   - 选择智能体场景。
   - 输入任务。
   - 调用后端 `/api/agent`。
   - 展示状态、节点消息、正文增量和最终结果。
6. 所有密钥只放在服务端环境变量里。

本次明确不做：

1. 登录权限。
2. 知识库挂载。
3. 多文档管理。
4. Word/PDF 导出。
5. Copilot 对话侧边栏。
6. 富文本编辑器。
7. 复杂智能体市场。
8. 后端数据库。

口播：

这里的关键不是功能多，而是主链路完整。一个 AI 产品从 0 到 1，第一步应该先验证最核心的用户路径，而不是把完整系统一次性做出来。

## 3. 15 分钟节奏

| 时间 | 操作 | 会话 | 输出 |
| --- | --- | --- | --- |
| 0:00-1:30 | 说明 MVP 边界和并行策略 | 主讲 | 听众理解为什么只做两条主链路 |
| 1:30-3:30 | 创建项目骨架和前端布局 | A | 应用能启动，有基础界面 |
| 3:30-6:00 | 实现通用写作状态机和 `/api/write` | A | 能生成大纲 |
| 3:30-7:00 | 基于 AF curl 实现 `/api/agent` | B | 智能体接口适配层成型 |
| 6:00-9:30 | 接入通用写作 SSE 正文生成 | A | 正文能流式输出 |
| 7:00-10:30 | 接入 AF 智能体模式 | B/A | 第二种模式能返回结果 |
| 10:30-13:00 | 运行、修错、完成验收 | A+B | 应用可演示 |
| 13:00-15:00 | 总结 vibe coding 方法论 | 主讲 | 输出可复用方法 |

## 4. 开场口播

今天我会从 0 创建一个简化版的 AI 写作工作台。完整的 Nexus Writing Studio 已经有很多能力，但现场 15 分钟内我们只做最小可用版本。

这个最小版本必须证明两件事：

第一，它能基于通用大模型完成写作链路：输入需求、生成大纲、确认大纲、生成正文。

第二，它能接入 AF 智能体：用户选择一个业务场景，前端通过本地接口调用智能体，并把结果展示到同一个写作工作台里。

我会用两个会话并行做。会话 A 做应用主链路，会话 B 做 AF 接口适配。这样更接近真实工作方式：不是把所有问题堆给一个 agent，而是把任务拆成可以独立推进的模块。

## 5. 会话 A：从 0 创建应用骨架

### A1. 第一条提示词：结构化定义应用

这一步不要告诉 coding agent “我要做一个分享 demo”。这对实现没有帮助。

应该直接告诉它：要创建什么应用、技术栈是什么、用户流程是什么、接口契约是什么、验收标准是什么。

提示词：

```text
创建一个新的 Web 应用，名称为 Nexus Writing Studio Lite。

技术栈：
- React 18
- TypeScript
- Vite
- Node.js + Express
- 前端样式使用普通 CSS 或 Tailwind，优先选择实现更快的方案
- 不使用数据库

应用定位：
- 一个 AI 写作工作台
- 支持两种写作模式：
  1. general：通用大模型写作
  2. agent：AF 智能体写作

页面结构：
- 顶部栏：
  - 左侧显示 Nexus Writing Studio Lite
  - 右侧显示当前运行状态
- 左侧操作区：
  - 模式切换：通用写作 / AF 智能体写作
  - 通用写作模式下显示：
    - 写作需求 textarea
    - 生成大纲按钮
    - 大纲 textarea
    - 确认大纲并生成正文按钮
  - AF 智能体模式下显示：
    - 智能体选择 select
    - 任务输入 textarea
    - 参数输入 textarea，内容为 JSON
    - 调用智能体按钮
- 右侧结果区：
  - 展示 Markdown 正文
  - 展示流式生成中的内容
  - 展示错误信息

前端状态：
- mode: "general" | "agent"
- status:
  - idle
  - outlining
  - outline_ready
  - writing
  - agent_running
  - done
  - error
- prompt: string
- outline: string
- article: string
- agentScenarioId: string
- agentInputs: string
- errorMessage: string

后端接口先创建空实现：
- POST /api/write
- POST /api/agent
- GET /healthz

验收标准：
1. npm install 后可以启动。
2. npm run dev 后可以打开页面。
3. 页面可以切换两种模式。
4. 按钮状态会根据 status 正确 disabled。
5. 后端接口文件已经存在，但具体模型调用可以在下一步实现。

请直接创建完整项目文件，不要只给说明。
```

预期结果：

1. 项目结构生成。
2. 前端有完整页面骨架。
3. 后端有 Express 服务和接口占位。
4. 两种模式在 UI 上已经出现。

口播：

第一条提示词最重要。它不是一句“帮我做个应用”，而是一个压缩版 PRD。这里面包含技术栈、页面结构、状态、接口和验收标准。coding agent 最需要的是这些可执行信息。

### A2. 实现通用写作接口 `/api/write`

提示词：

```text
实现 POST /api/write，用于通用大模型写作。

请求体：
{
  "action": "outline" | "article",
  "prompt": "用户写作需求",
  "outline": "用户确认后的 Markdown 大纲，可选",
  "stream": true
}

环境变量：
- QWEN_API_KEY：
- QWEN_BASE_URL：默认 https://dashscope.aliyuncs.com/compatible-mode/v1
- QWEN_MODEL：默认 qwen-plus

模型接口：
- 使用 OpenAI-compatible chat completions API
- URL: ${QWEN_BASE_URL}/chat/completions
- Authorization: Bearer ${QWEN_API_KEY}

行为：
1. action=outline：
   - 非流式调用模型
   - 返回 JSON：{ "result": "Markdown 大纲" }
   - system prompt 要求模型只输出 Markdown 大纲
   - 大纲格式只允许 #、##、### 标题层级
2. action=article 且 stream=true：
   - 流式调用模型
   - 返回 text/event-stream
   - 将模型增量内容转换为：
     event: chunk
     data: {"delta":"..."}
   - 结束时返回：
     event: done
     data: {"result":"完整正文"}
3. 发生错误时返回：
   event: error
   data: {"error":"错误信息"}

错误处理：
- 缺少 QWEN_API_KEY 时返回 500
- 缺少 prompt 时返回 400
- action=article 但缺少 outline 时返回 400
- 模型接口失败时返回明确错误

请实现真实接口调用，不要 mock。
```

预期结果：

1. `/api/write` 能生成大纲。
2. `/api/write` 能流式生成正文。
3. 后端密钥不暴露给前端。

口播：

这一步开始接入真实模型。产品 MVP 不能只停留在静态页面，至少要有一个核心接口是真实可调用的。

### A3. 前端接入通用写作流程

提示词：

```text
把前端 general 模式接入 /api/write。

生成大纲：
1. 点击“生成大纲”时，校验 prompt 非空。
2. status 设置为 outlining。
3. POST /api/write：
   {
     "action": "outline",
     "prompt": prompt
   }
4. 成功后把 result 写入 outline。
5. status 设置为 outline_ready。
6. 失败时 status 设置为 error，并显示 errorMessage。

生成正文：
1. 点击“确认大纲并生成正文”时，校验 prompt 和 outline 非空。
2. 清空 article。
3. status 设置为 writing。
4. POST /api/write：
   {
     "action": "article",
     "prompt": prompt,
     "outline": outline,
     "stream": true
   }
5. 解析 SSE：
   - chunk：把 delta 追加到 article
   - done：用 result 兜底更新 article，status 设置为 done
   - error：status 设置为 error，并显示错误
6. writing 期间禁用输入区和按钮。

请把 SSE 解析逻辑封装成一个小函数，避免写在组件里太乱。
```

预期结果：

1. 用户能完整走通“需求 -> 大纲 -> 正文”。
2. 正文区域能实时追加内容。
3. 页面状态清楚。

口播：

这里出现了第一个完整产品闭环。它不是一个聊天框，而是一个有阶段、有确认、有生成过程的写作工作台。

## 6. 会话 B：从 AF curl 创建智能体适配层

### B1. 使用真实 curl 生成 `/api/agent`

你可以把 AF 智能体 chat 接口 curl 粘进下面提示词。这里的目标不是让前端直接调用 curl，而是让后端把 AF 协议适配成统一的产品协议。

提示词：

```text
基于下面的 AF 智能体 chat 接口 curl，实现本地后端接口 POST /api/agent。

本地接口请求体：
{
  "scenarioId": "official-doc",
  "query": "用户输入的任务",
  "inputs": {},
  "stream": true
}

本地接口响应：
- 必须返回 text/event-stream
- 统一输出以下 SSE 事件：
  1. event: status
     data: {"status":"当前执行状态"}
  2. event: workflow_message
     data: {"title":"节点名称","content":"节点输出内容"}
  3. event: chunk
     data: {"delta":"正文增量","accumulated":"累计正文"}
  4. event: done
     data: {"result":"最终正文"}
  5. event: error
     data: {"error":"错误信息"}

安全要求：
1. 不允许在前端写死 token。
2. 从服务端环境变量读取 AF_BASE_URL、AF_APP_ID、AF_TOKEN。
3. 如果 curl 中有固定 appId、token、baseUrl，请抽取成环境变量。

适配要求：
1. 先分析 curl 的 URL、method、headers、body。
2. 再分析响应格式。
3. 如果 AF 原始接口是 SSE，就逐帧解析并映射成本地 SSE。
4. 如果 AF 原始接口是普通 JSON，就抽取 answer/content/result/text 等字段，并在本地拆分为 chunk 输出。
5. 对暂时无法识别的字段，先忽略，不要阻塞主流程。
6. 代码中保留一个 normalizeAgentEvent 函数，集中处理 AF 响应到本地事件的映射。

错误处理：
- 缺少 query 返回 400。
- 缺少 AF_TOKEN 返回 500。
- AF 接口失败时返回 event:error。
- 无论成功或失败，SSE 都要正确 end。

AF curl：

{{AF_CURL}}
```

预期结果：

1. `/api/agent` 成为 AF 接口适配层。
2. 前端不需要理解 AF 原始协议。
3. 以后换智能体，只需要换环境变量和少量映射逻辑。

口播：

智能体平台的接口通常比较偏平台协议，不一定适合直接给前端用。所以这里我让 agent 做一层适配，把 AF 的响应统一转换成产品前端消费的事件。

### B2. 暂无 curl 时的占位实现

如果现场暂时还没拿到 curl，可以先用这个提示词生成可替换版本。拿到 curl 后再替换适配函数。

提示词：

```text
先实现一个可替换的 AF 智能体适配层 POST /api/agent。

先按以下协议假设实现：
- AF_BASE_URL：AF openapi 基地址
- AF_APP_ID：智能体应用 ID
- AF_TOKEN：Bearer token
- 调用地址：${AF_BASE_URL}/InvokeApp/${AF_APP_ID}
- method: POST
- headers:
  - Authorization: Bearer ${AF_TOKEN}
  - Content-Type: application/json
  - Accept: text/event-stream, application/json, */*
- body:
  {
    "id": "${AF_APP_ID}",
    "query": query,
    "inputs": inputs
  }

本地 /api/agent 请求体：
{
  "scenarioId": "official-doc",
  "query": "用户任务",
  "inputs": {},
  "stream": true
}

本地 /api/agent 必须统一返回 SSE：
- status
- workflow_message
- chunk
- done
- error

请把 AF 协议相关逻辑集中到 callAfAgent 和 normalizeAgentEvent 两个函数中，方便之后根据真实 curl 替换。
```

预期结果：

1. 先跑通智能体模式的后端形状。
2. 后续拿到 curl 后，改动范围可控。

### B3. 前端接入 AF 智能体模式

提示词：

```text
把前端 agent 模式接入 /api/agent。

agent 模式 UI：
1. 智能体选择：
   - official-doc：公文写作智能体
   - oil-gas：油气价格分析智能体
2. 任务输入 textarea。
3. inputs JSON textarea，默认值为 {}。
4. 调用智能体按钮。
5. 右侧结果区继续复用 article 展示最终正文。
6. 在结果区上方增加一个“执行过程”区域，用于展示 status 和 workflow_message。

调用逻辑：
1. 点击“调用智能体”时，校验 query 非空。
2. 解析 inputs JSON，解析失败时进入 error 状态。
3. status 设置为 agent_running。
4. 清空 article 和执行过程。
5. POST /api/agent：
   {
     "scenarioId": agentScenarioId,
     "query": query,
     "inputs": parsedInputs,
     "stream": true
   }
6. 解析 SSE：
   - status：追加到执行过程
   - workflow_message：追加到执行过程
   - chunk：追加到 article
   - done：用 result 更新 article，status 设置为 done
   - error：status 设置为 error，并展示错误

要求：
- agent_running 期间禁用按钮。
- 不要把 AF token 放到前端。
- 通用写作和智能体写作共用右侧正文预览。
```

预期结果：

1. 应用体现两种写作模式。
2. AF 智能体结果进入同一个写作工作台。
3. 执行过程和最终结果分区展示。

口播：

到这里，MVP 就不只是一个通用写作工具了。它已经具备当前完整项目的两条核心能力：通用模型写作和场景化智能体写作。

## 7. 主会话：集成和验收

当会话 A 和 B 都有结果后，在主会话输入：

```text
请检查当前应用是否满足以下验收标准，并直接修复发现的问题。

运行标准：
1. npm install 可以完成。
2. npm run dev 可以启动前端和后端。
3. GET /healthz 返回 { "ok": true }。

通用写作标准：
1. general 模式可以输入写作需求。
2. 点击“生成大纲”会调用 /api/write。
3. 大纲返回后可以编辑。
4. 点击“确认大纲并生成正文”会通过 SSE 流式生成正文。
5. 模型失败时页面显示错误。

AF 智能体标准：
1. agent 模式可以选择智能体。
2. 可以输入 query 和 inputs JSON。
3. 点击“调用智能体”会调用 /api/agent。
4. 页面可以展示 status、workflow_message、chunk、done 中的有效内容。
5. AF 调用失败时页面显示错误。

安全标准：
1. QWEN_API_KEY、AF_TOKEN 等密钥只在服务端读取。
2. 前端代码里不能出现真实 token。

代码标准：
1. 不做无关重构。
2. 修复 TypeScript 或构建错误。
3. 如果需要新增依赖，说明原因。

请运行构建或类型检查；如果失败，修复后再次验证。
```

预期结果：

1. 应用能启动。
2. 两条链路都能演示。
3. 常见构建错误被清掉。

口播：

vibe coding 不是把提示词发出去就结束。关键是每一步都要有验收标准。没有验收标准，AI 很容易生成看起来完整但跑不起来的代码。

## 8. 现场演示输入

### 通用写作

```text
请写一份企业知识库建设方案，面向产品和研发团队，内容包括建设背景、目标、核心能力、实施路径和风险控制。
```

生成大纲后，可以现场手动改一个章节标题，例如：

```text
## 四、实施路径
```

改成：

```text
## 四、分阶段实施路径
```

口播：

这里体现“人机协同”。不是模型直接给最终答案，而是先让模型做结构规划，人确认结构后再生成正文。

### AF 智能体写作

公文写作智能体：

```text
帮我写一篇《榜样10》专题节目的心得体会，要求语言正式，结构完整，适合单位内部学习交流。
```

油气价格分析智能体：

```text
请生成 10 月油气价格分析报告，重点关注供需变化、国际价格波动和企业经营影响。
```

inputs 示例：

```json
{
  "special_anal_points": "供需变化、国际价格波动、企业经营影响"
}
```

口播：

智能体模式和通用写作模式的差别在于，通用写作是模型根据提示词直接生成，而智能体模式背后可能有固定工作流、节点执行和业务参数。

## 9. 环境变量示例

```bash
# 通用大模型写作
QWEN_API_KEY=your_qwen_api_key
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus

# AF 智能体写作
AF_BASE_URL=https://your-af-host/openapi/v1
AF_APP_ID=your_app_id
AF_TOKEN=your_token
```

如果沿用当前完整项目里的 AppForge 命名，可以使用：

```bash
APPFORGE_BASE_URL=https://your-af-host/openapi/v1
APPFORGE_OFFICIAL_DOC_APP_ID=your_app_id
APPFORGE_OFFICIAL_DOC_TOKEN=your_token
APPFORGE_OIL_GAS_APP_ID=your_app_id
APPFORGE_OIL_GAS_TOKEN=your_token
```

## 10. 风险预案

### 风险 1：通用模型接口太慢

备用提示词：

```text
请把正文生成 prompt 调整为短文模式：
1. 全文控制在 800 字以内。
2. 每个二级标题下只生成 1 段。
3. 优先保证现场流式输出速度。
```

### 风险 2：AF curl 响应格式复杂

备用提示词：

```text
请先实现 AF 响应的最小可用解析：
1. 如果响应中存在 answer、content、text、result、data.answer、data.content 字段，就作为正文。
2. 如果响应中存在 title、nodeName、status 字段，就作为执行过程。
3. 其他字段暂时忽略。
4. 保证最终一定返回 done 或 error。
```

### 风险 3：SSE 解析出错

备用提示词：

```text
请检查前后端 SSE 协议是否一致。

后端每个事件必须符合：
event: chunk
data: {"delta":"..."}

事件之间必须用两个换行分隔。

前端需要兼容 \n\n 和 \r\n\r\n 两种分隔符。
请修复 SSE 解析问题，并增加最小错误提示。
```

### 风险 4：构建失败

备用提示词：

```text
请只修复当前构建失败问题，不要做无关重构。

优先级：
1. TypeScript 类型错误
2. 缺失依赖
3. import 路径错误
4. 运行时白屏

修复后重新运行构建或类型检查。
```

### 风险 5：15 分钟不够

压缩演示：

1. 通用写作只演示生成大纲。
2. AF 智能体只演示接口返回。
3. 总结时说明正文流式生成和执行过程展示是下一步补齐。

口播：

现场最重要的是证明两条能力链路都成立。如果时间不够，可以少展示 UI 细节，但不能丢掉真实接口调用。

## 11. 结束总结口播

今天这个过程可以总结成四点。

第一，vibe coding 的第一步不是写提示词，而是切 MVP 边界。我们没有做完整产品，只抽取了通用写作和智能体写作两条主链路。

第二，给 coding agent 的提示词要结构化。要明确应用、技术栈、页面、状态、接口、错误处理和验收标准。不要把对实现没有帮助的背景塞进去。

第三，外部接口要先做适配层。AF 智能体接口不直接暴露给前端，而是通过 `/api/agent` 转成统一 SSE 事件，这样前端体验和后续扩展都会更稳定。

第四，每一步都要验收。能启动、能调用、能流式输出、能显示错误，这些比代码看起来完整更重要。

所以，vibe coding 对产品团队的价值不是“让 AI 替我想产品”，而是让我们用更低成本、更短时间，把产品主链路变成一个可以被真实评审和真实体验的 MVP。

## 12. 最终检查清单

分享前：

- [ ] 准备好 Qwen 或 OpenAI-compatible API key。
- [ ] 准备好 AF 智能体 chat curl。
- [ ] 确认现场网络能访问模型和 AF 接口。
- [ ] 准备好通用写作输入。
- [ ] 准备好 AF 智能体输入。
- [ ] 提前确认 Node.js 和 npm 可用。

现场产出：

- [ ] 应用从 0 创建。
- [ ] 页面可切换 general / agent 两种模式。
- [ ] 通用写作能生成大纲。
- [ ] 通用写作能基于大纲生成正文。
- [ ] AF 智能体能通过本地适配接口调用。
- [ ] 页面能展示执行过程或最终结果。
- [ ] 密钥没有出现在前端代码中。


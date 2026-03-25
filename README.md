# Nexus Writing Studio

面向中文业务场景的智能写作工作台。  
当前实现包含两条主流程：

- `GENERAL`（通用写作）：生成大纲 -> 确认/编辑大纲 -> 流式生成全文
- `AGENT`（智能体写作）：按场景智能体配置，直接走工作流生成全文

项目基于 React + Vite，开发模式下通过本地中间件直连 `api/*.ts`，无需额外起一个后端服务。

## 核心能力

- 双模式写作状态机（`GENERAL` / `AGENT`）
- 大纲编辑确认（可改标题、改层级节点文本、删除节点）
- 流式正文生成与“思考过程”展示（SSE）
- Copilot 对话路由（问答 / 改写 / 闲聊 / 重新写作 / 智能体相关写作）
- 段落级改写（续写、润色、扩写、自定义）
- 文档多实例管理（同任务下多文档切换、删除）
- 本地任务持久化（最近任务、恢复、重命名、删除）
- 知识库挂载（支持多库，按检索片段注入写作上下文）
- 导出 Word / PDF（前端本地导出）

## 内置智能体与知识库

当前代码内置场景：

- `report-compile`：Osint开源情报整编智能体（工作流）
- `official-doc`：公文写作智能体（流式 content 输出）
- `oil-gas`：10月油气价格分析（工作流，含参数 `special_anal_points`）

当前代码内置知识库（AppForge 来源）：

- `appforge:proj-5ss04wr7:docstore_3qY9FZtK`
- `appforge:proj-p5x1v8uj:j0im0b3s`

## 技术栈

- 前端：React 18 + TypeScript + Vite 5
- 样式：Tailwind CSS
- 编辑器：TipTap（`@tiptap/react` + `tiptap-markdown`）
- 图标：`lucide-react`
- Markdown 渲染：`marked` / `react-markdown`
- 导出：
  - Word：`html-docx-js-typescript`
  - PDF：`html2canvas` + `jspdf`
- API：Vercel 风格 Serverless（`api/*.ts`）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local`（至少配置 `QWEN_API_KEY`）：

```bash
QWEN_API_KEY=your_api_key
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
```

### 3. 启动开发

```bash
npm run dev
```

默认地址：`http://localhost:3000`

### 4. 构建与预览

```bash
npm run build
npm run preview
```

## 环境变量说明

### 必填

| 变量 | 用途 |
| --- | --- |
| `QWEN_API_KEY` | `write/copilot/rewrite/agent fallback` 的模型调用密钥 |

### 常用可选（Qwen/Copilot）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `QWEN_BASE_URL` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | Qwen 兼容接口地址 |
| `QWEN_MODEL` | `qwen-plus` | 主执行模型 |
| `QWEN_ROUTE_MODEL` | - | Copilot 路由模型备选 |
| `QWEN_REQUEST_TIMEOUT_MS` | `180000` | `/api/write` 超时 |
| `REWRITE_REQUEST_TIMEOUT_MS` | `120000` | `/api/rewrite` 超时 |
| `COPILOT_ROUTE_MODEL` | `qwen-turbo` | Copilot 路由模型 |
| `COPILOT_ROUTE_TIMEOUT_MS` | `20000` | Copilot 路由阶段超时 |
| `COPILOT_EXECUTION_TIMEOUT_MS` | `120000` | Copilot 执行阶段超时 |
| `COPILOT_EDIT_TIMEOUT_MS` | `180000` | Copilot 改写阶段超时 |

### 智能体工作流（AppForge）

| 变量 | 默认值（代码） | 说明 |
| --- | --- | --- |
| `APPFORGE_BASE_URL` | `http://110.154.34.22:37755/appforge/openapi/v1` | 工作流调用基地址 |
| `APPFORGE_REPORT_COMPILE_APP_ID` | `app-6p23bh2c` | Osint开源情报整编智能体 appId |
| `APPFORGE_REPORT_COMPILE_TOKEN` | 内置默认 token | Osint开源情报整编智能体 token |
| `APPFORGE_OFFICIAL_DOC_APP_ID` | `app-nj4mkuyx` | 公文写作智能体 appId |
| `APPFORGE_OFFICIAL_DOC_TOKEN` | 内置默认 token | 公文写作智能体 token |
| `APPFORGE_OIL_GAS_APP_ID` | `app-c8kfj18j` | 油气分析 appId |
| `APPFORGE_OIL_GAS_TOKEN` | 内置默认 token | 油气分析 token |

> 建议在部署环境中覆盖以上 `APPFORGE_*TOKEN`，不要依赖代码默认值。

### 知识库检索（AppForge Dataset API）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `APPFORGE_DATASET_API_URL` | `https://ai.cecloud.com:37701/ceai/appforge/api/v1/TestDataset` | 检索 API 地址 |
| `APPFORGE_COOKIE` | 空 | 检索鉴权 Cookie（启用知识库检索时建议配置） |
| `APPFORGE_REGION_ID` | `region1` | 请求头 `x-regionid` |
| `APPFORGE_X_AUTH_VALIDATE` | `true` | 请求头 `x-auth-validate` |
| `APPFORGE_REQUEST_TIMEOUT_MS` | `12000` | 知识库检索超时 |
| `KNOWLEDGE_BASE_TOTAL_TOP_K` | `6` | 总召回数 |
| `KNOWLEDGE_BASE_MAX_CONTEXT_CHARS` | `8000` | 拼接上下文最大长度 |
| `KNOWLEDGE_BASE_MAX_CHUNK_CHARS` | `1200` | 单片段最大长度 |
| `KNOWLEDGE_BASE_DEBUG` | `false` | 开启检索调试日志 |

### 前端 API 地址（可选）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | - | 前端请求 API 的完整基地址 |
| `VITE_API_ORIGIN` | - | 与 `VITE_API_BASE_URL` 二选一 |
| `VITE_LOCAL_API_ORIGIN` | `http://127.0.0.1:3000` | 非 http(s) 场景下的本地回退地址 |

## API 概览

### `POST /api/write`

统一写作接口，支持：

- `action: "outline"`（生成大纲）
- `action: "article"`（生成正文，可流式）
- `action: "thought"`（生成可展示思考摘要，可流式）

示例请求：

```json
{
  "action": "article",
  "prompt": "写一篇关于企业知识库建设的方案",
  "outline": "# 企业知识库建设方案\n## 一、背景\n## 二、目标",
  "knowledgeBaseIds": ["appforge:proj-5ss04wr7:docstore_3qY9FZtK"],
  "stream": true
}
```

当 `stream: true` 且 `action` 为 `article/thought` 时返回 SSE 事件：

- `event: thought`（仅 article，思考增量）
- `event: chunk`（正文/思考增量）
- `event: done`（最终结果）
- `event: error`（错误）

### `POST /api/copilot`

文档期对话路由与执行接口。入参可包含：

- `message`（必填）
- `document` / `outline` / `title`
- `history`（近几轮上下文）
- `mode`：`general | agent`
- `agentContext`
- `knowledgeBaseIds`
- `lightweightChat`

返回：

```json
{
  "intent": "edit | qa | chat | restart | agent_write_related | agent_write_unrelated",
  "reply": "给用户展示的话术",
  "edit": {
    "status": "ready | needs_clarification",
    "sectionTitle": "可选",
    "targetText": "ready 时通常返回",
    "replacementText": "ready 时通常返回"
  },
  "topic": "当需要重新写作时的主题"
}
```

### `POST /api/agent`

调用真实智能体工作流（当前仅流式）：

```json
{
  "scenarioId": "oil-gas",
  "query": "生成本月油气价格分析",
  "stream": true,
  "inputs": {
    "special_anal_points": "供需分析"
  }
}
```

SSE 事件：

- `event: status`（节点执行状态）
- `event: workflow_message`（消息节点输出）
- `event: done`（最终正文）
- `event: error`（错误）

若真实工作流不可用，接口会自动降级为通用 Qwen 生成，并继续以 SSE 形式返回结果。

### `POST /api/rewrite`

选中文本改写：

```json
{
  "selectedText": "需要改写的段落",
  "type": "continue | polish | expand | custom",
  "customPrompt": "type=custom 时可用"
}
```

成功返回：

```json
{
  "result": "改写后文本"
}
```

## 本地持久化

当前使用 `localStorage`：

- `nexus_writing_tasks`：任务与文档快照
- `nexus_mounted_knowledge_bases`：已挂载知识库
- `favoriteAgentIds`：首页收藏智能体

## 目录结构

```text
nexus-writing-studio/
├─ api/
│  ├─ agent.ts
│  ├─ copilot.ts
│  ├─ rewrite.ts
│  ├─ write.ts
│  ├─ cors.ts
│  └─ knowledge-base-service.ts
├─ public/
│  └─ product-intro/
├─ src/
│  ├─ components/
│  ├─ views/
│  ├─ services/
│  │  ├─ apiClient.ts
│  │  ├─ writingClient.ts
│  │  ├─ copilotClient.ts
│  │  ├─ agentClient.ts
│  │  ├─ qwenClient.ts
│  │  └─ exportService.ts
│  ├─ constants/
│  ├─ store/
│  ├─ types/
│  ├─ utils/
│  ├─ App.tsx
│  └─ index.tsx
├─ vite.config.ts
├─ vercel.json
└─ README.md
```

## 部署说明

- Vercel 可直接部署，`api/*.ts` 作为 Serverless Function 运行。
- `vercel.json` 已设置 `api/*.ts` 的 `maxDuration` 为 `300` 秒。
- 本地开发时，`vite.config.ts` 内置中间件会把 `/api/agent`、`/api/copilot`、`/api/rewrite`、`/api/write` 转发到本地 handler。

## 当前注意事项

- `npm run lint` 当前会失败（仓库未安装 `eslint` 依赖）。
- 生产构建有大包体积告警（`> 500KB`），后续可做按路由或按功能拆包。

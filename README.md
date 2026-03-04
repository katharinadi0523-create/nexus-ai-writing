# Nexus Writing Studio

一个面向中文场景的智能写作工作台，支持通用写作与智能体写作两种模式，内置大纲确认、流式生成、任务恢复、选中文本改写等能力。

## 项目特性

- 双模式写作流程：
  - `GENERAL`：输入 -> 思考 -> 大纲确认 -> 生成全文
  - `AGENT`：输入 -> 智能体参数/记忆配置 -> 生成全文
- 任务管理（基于 `localStorage`）
  - 最近任务列表
  - 任务恢复、重命名、删除
  - 自动定期保存
- 编辑器能力（TipTap）
  - Markdown 内容编辑
  - 常见富文本工具栏（标题、加粗、斜体、列表等）
  - 选中段落后的「续写 / 润色 / 扩写 / 自定义改写」
- 改写服务（服务端 API）
  - `POST /api/rewrite` 调用 Qwen 兼容接口
  - 对模型输出做基础清洗（避免额外标题/编号）
- 多个内置场景（Mock 数据）
  - 油气分析、市场调研、安全预评价、工作总结

## 技术栈

- 前端：React 18 + TypeScript + Vite
- UI：Tailwind CSS + lucide-react
- 编辑器：@tiptap/react + tiptap-markdown
- 服务端函数：`api/rewrite.ts`（Vercel 风格 Serverless API）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local`：

```bash
QWEN_API_KEY=your_qwen_api_key
# 可选，默认值见下方
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
```

### 3. 启动开发环境

```bash
npm run dev
```

默认开发地址：`http://localhost:3000`

### 4. 生产构建

```bash
npm run build
npm run preview
```

## 环境变量说明

- `QWEN_API_KEY`：必填，Qwen API Key
- `QWEN_BASE_URL`：可选，默认 `https://dashscope.aliyuncs.com/compatible-mode/v1`
- `QWEN_MODEL`：可选，默认 `qwen-plus`

## API 说明

### `POST /api/rewrite`

请求体：

```json
{
  "selectedText": "需要改写的文本",
  "type": "continue | polish | expand | custom",
  "customPrompt": "自定义要求（type=custom 时可用）"
}
```

成功响应：

```json
{
  "result": "改写后的文本"
}
```

失败响应：

```json
{
  "error": "错误信息"
}
```

## 可用脚本

- `npm run dev`：启动开发服务器
- `npm run build`：构建生产包
- `npm run preview`：本地预览生产包
- `npm run lint`：执行 ESLint（当前仓库未安装 `eslint`，执行会报 `eslint: command not found`）

## 目录结构

```text
nexus-writing-studio/
├─ api/
│  └─ rewrite.ts                 # 改写服务端 API
├─ src/
│  ├─ components/                # UI 组件（编辑器、侧边栏、改写窗口等）
│  ├─ views/                     # 页面视图（Home / Workspace）
│  ├─ services/
│  │  └─ qwenClient.ts           # 前端改写请求封装
│  ├─ store/                     # 全局写作配置存储
│  ├─ utils/
│  │  └─ taskStore.ts            # 本地任务存储与恢复
│  ├─ constants/
│  │  └─ mockData.ts             # 场景与知识库 Mock 数据
│  ├─ types/
│  │  └─ writing.ts              # 模式/状态机定义
│  ├─ App.tsx
│  └─ index.tsx
├─ vite.config.ts
└─ README.md
```

## 运行机制简述

- 首页输入后进入写作工作台，创建任务并持久化到本地。
- `GENERAL` 模式会先进入大纲确认，再开始正文生成。
- `AGENT` 模式会展示智能体配置面板（记忆变量 + 参数）后直接生成。
- 工作台会定期与关键状态变更时自动保存任务，支持从侧边栏恢复。
- 编辑器支持选中文本改写，调用 `/api/rewrite` 返回后可预览并替换原文。

## 已知限制

- 当前生成内容来源于内置 Mock 场景数据，非实时联网检索。
- 「保存 / 下载 / 历史记录」按钮逻辑在 `WorkspaceView` 中仍是 `TODO`。
- 生产构建提示主包体积较大（>500KB），后续可做按需拆包。
- `lint` 命令依赖未补齐（缺少 `eslint`）。

## 部署建议

推荐部署到 Vercel：

1. 导入仓库
2. 在项目环境变量中配置 `QWEN_API_KEY`（以及可选的 `QWEN_BASE_URL`、`QWEN_MODEL`）
3. 使用默认构建命令 `npm run build`

`api/rewrite.ts` 可作为 Serverless Function 运行。

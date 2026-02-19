# nexus-ai-writing
新星AI写作demo

## Qwen 改写功能（划选后 AI Edit）

已支持在编辑器中划选文本后，使用以下操作进行改写：
- 续写
- 润色
- 扩写
- 自定义改写要求

### 安全配置（推荐：Vercel 服务端托管 Key）

项目已改为前端调用你自己的 `/api/rewrite`，由 Vercel Serverless Function 代调用 Qwen。  
这样所有访问者都能使用改写功能，但看不到你的 API Key。

Vercel 环境变量请配置：

```bash
QWEN_API_KEY=你的QwenKey
QWEN_MODEL=qwen-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

说明：
- `QWEN_API_KEY` 必填（服务端变量，不会下发到浏览器）。
- `QWEN_MODEL`、`QWEN_BASE_URL` 可省略，默认分别为 `qwen-plus` 和 DashScope 兼容模式地址。

### 发布步骤（GitHub + Vercel）

1. 推送代码到 GitHub 仓库。
2. 在 Vercel 导入该仓库（Framework 选 Vite）。
3. 在 Vercel 项目设置中添加上面的环境变量。
4. 触发部署，部署完成后即可通过 Vercel 域名访问。

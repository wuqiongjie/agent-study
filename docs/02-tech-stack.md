# 02 · 技术选型

## 一、选型总表

| 层次 | 推荐 | 备选 | 选择理由 |
| --- | --- | --- | --- |
| 入门 SDK | **Vercel AI SDK**（`ai` + `@ai-sdk/react`） | LangChain.js | API 设计对前端最友好，`useChat` / 流式 / RSC 开箱即用，工具结果可直接渲染成 React 组件 |
| 复杂编排 | LangGraph.js | Mastra / VoltAgent | 需要条件边、状态机、`interrupt`（人在回路）时再上 |
| 原理学习 | 裸 `fetch` 调 OpenAI 兼容接口 | — | 零依赖，最能看清协议本身 |
| 前端框架 | Next.js（App Router） | Vite + 自建 Node 服务 | RSC + 流式是 Agent UI 的最优解 |
| 模型（国内可用） | DeepSeek / 通义千问 / GLM | OpenAI / Claude | 均支持 OpenAI 兼容格式与 function calling，demo 成本极低 |
| 工具生态 | MCP | 自建工具集 | 后期直接接入现成工具市场 |
| 可观测 | Langfuse / LangSmith | Helicone | 没有 trace 就无法 debug Agent |
| 评测 | 自建小样本集 | Promptfoo | 改 prompt 后必须能验证「没变差」 |

## 二、按目标选择，不要全都要

| 你的目标 | 建议路径 |
| --- | --- |
| 快速做出能展示的 Agent 产品 | Vercel AI SDK → Next.js 全栈，跳过其他 |
| 想进 Agent infra / 后端方向 | 裸 API → LangGraph.js → 自己实现编排 |
| 只想搞懂原理 | 裸 API 手写 loop，不看任何框架 |
| 做企业内部 Agent 平台 | LangGraph.js + Langfuse + 自建评测 |

## 三、模型选型注意点

1. **必须支持 function calling / tool use**，否则 Agent 无从谈起。
2. 优先选** OpenAI 兼容接口**的厂商 —— 换模型只改 `baseURL` 和 `apiKey`，工具链全部复用。
3. 关注三项指标：工具调用准确率、上下文长度、每百万 token 单价。
4. 复杂多步任务用强模型，简单分类/抽取用便宜小模型 —— **路由（routing）本身就是成本优化的常见手段**。

## 四、环境变量约定

```bash
# .env.local
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.deepseek.com/v1
MODEL_NAME=deepseek-chat
```

> 原则：模型供应商信息只存在于环境变量与一个 `provider.ts` 文件中，业务代码永远不出现厂商名。

## 五、建议的依赖清单（起步最小集）

```jsonc
{
  "dependencies": {
    "ai": "^5.0.0",
    "@ai-sdk/react": "^2.0.0",
    "@ai-sdk/openai-compatible": "^1.0.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "zod": "^3.23.0"
  }
}
```

`zod` 是必选项：用它声明工具入参结构，既是校验也是给模型的说明书。

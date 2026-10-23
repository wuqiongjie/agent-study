# 0002 · Demo 1：Next.js 流式聊天界面

- 日期：2026-10-23
- 阶段：Demo 1
- 用时：约 1 天（10-21 起环境，10-23 收尾）

## 做了什么

用 `create-next-app` 起 Next.js 16（App Router + TS + Tailwind v4），装 AI SDK v6（`ai` / `@ai-sdk/react` / `@ai-sdk/openai`），
把 Demo 0 手写的 `while` 循环换成 `streamText` + `useChat`：前端打字机流式输出、工具调用过程渲染成折叠卡片、
消息存 localStorage 可刷新恢复、出错时页面不崩只弹错误条。模型走 DeepSeek 的 OpenAI 兼容接口。

## 关键代码 / 要点

```ts
// 1) 多步调用的护栏：就是 Demo 0 的 maxSteps
stopWhen: stepCountIs(6),

// 2) 前端消息格式 → 模型消息格式，v6 起是异步的
messages: await convertToModelMessages(messages),

// 3) DeepSeek 走 Chat Completions 兼容模式才会触发工具调用
const provider = createOpenAI({ baseURL: 'https://api.deepseek.com/v1', apiKey: process.env.OPENAI_API_KEY });
const model = provider.chat(process.env.MODEL_NAME ?? 'deepseek-chat');

// 4) 前端识别工具段落（parts 是 v5+ 的渲染单位）
if (isToolUIPart(part)) { getToolName(part); /* state: input-available → output-available */ }
```

`useChat` 默认就打 `POST /api/chat` —— 代码里搜不到这个地址，是 SDK 约定（`DefaultChatTransport` 默认 `api = "/api/chat"`）。

## 卡住的地方

1. 现象：DeepSeek 完全不调工具，只回文本
   原因：两个叠加 —— AI SDK v6 的 OpenAI provider 默认走 Responses 兼容层；我用 PowerShell 直接测接口时中文 body 没按 UTF-8 字节发，模型看到的是问号
   解法：改用 `provider.chat(...)` 走 Chat Completions；测试脚本用 `[Text.Encoding]::UTF8.GetBytes($json)` 发请求

2. 现象：浏览器控制台 `Hydration failed because the server rendered HTML didn't match the client`
   原因：`useState` 初始化时直接读 `localStorage`，服务端渲染为空态、客户端首帧却有历史消息
   解法：历史消息改到 `useEffect`（挂载后）里 `setMessages(stored)`；持久化写入加 `if (messages.length === 0) return`，避免首帧用空数组覆盖历史

3. 现象：Next 16 的 lint 报 `Cannot access refs during render` / `setState in effect`
   原因：为了在 effect 里稳定调用 `setMessages` 用了 ref，且同步 `setHydrated(true)`
   解法：去掉 ref 与 hydrated state，改回「挂载后恢复 + 只在有消息时持久化」的写法

## 本次的「原来如此」

- 框架并没有换掉循环，只是给它换了名字：`tool_calls` 判空 = 结束条件，`stopWhen` = `maxSteps`，`execute` = 我自己的 `toolImpls`。
- 流式不是魔法，是协议：后端 `toUIMessageStreamResponse()` 吐 SSE，前端把每帧增量合并进 `messages.parts`，打字机效果只是「增量渲染」的副产品。
- 前端在 Agent 产品里的价值，正是 Demo 0 做不到的那部分：把工具调用过程画出来、能中断、能容错。
- 「约定大于配置」在 SDK 里很常见：`/api/chat` 从没写过，但它就是约定地址 —— 找不到调用方时，去翻 transport 的默认值。

## 数据

| 指标 | 值 |
| --- | --- |
| 首字节延迟 | 页脚实时显示（本轮未逐次记录） |
| 总耗时 | 未记录 |
| Token 消耗 | 未接入统计（下一步要补） |
| 工具调用次数 | 单问题 1 次（对比两个城市时 2 次） |

## 下一步

- [ ] 进入 Demo 2（ReAct 调研助手）：第一次体验 Agent 连续调 5~10 次工具
- [ ] 给 demo 接入 trace/统计，把 token 与耗时记录下来（本条笔记的「数据」还是空的）
- [ ] 在 Demo 3 之前补上「工具 description 写差 → 调用率下降」的对照实验

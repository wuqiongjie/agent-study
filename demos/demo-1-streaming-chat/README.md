# Demo 1 · Next.js 流式聊天界面

> 状态：🟡 进行中（2026-10-21 开始）　代码已可跑，待你补齐密钥后验收

Demo 0 里我们手写了 `while` 循环。这一步换上 **Vercel AI SDK**，把同样的循环搬进网页：
前端打字机流式输出 + 工具调用过程可视化 + 消息持久化。

**核心对照：Demo 0 的每一行代码，在这一步都能找到 SDK 里的对应物。**
带上这个视角去学，SDK 就不是黑盒，而是「我昨天写过的那个循环的封装」。

## 一、概念映射（先看这张表）

| Demo 0（手写） | Demo 1（AI SDK） | 说明 |
| --- | --- | --- |
| `while (step < maxSteps)` | `stopWhen: stepCountIs(6)` | 多步工具调用，SDK 帮你转圈 |
| `messages` 数组 | `useChat` 的 `messages` / `streamText` 的 `messages` | 依然是「上下文就是一切」 |
| `toolDefs`（JSON Schema） | `tool({ inputSchema })`（zod 描述） | 本质还是 JSON Schema |
| `toolImpls[name]` | `tool({ execute })` | 执行者仍然是你 |
| `fetch` 手写请求 | `streamText` + `toUIMessageStreamResponse()` | 流式协议交给 SDK |
| 终端 `console.log` | 前端渲染 `message.parts` | 同样的步骤，换了个展示层 |

## 二、已装好的环境

| 包 | 版本 | 作用 |
| --- | --- | --- |
| `next` | 16（App Router + TS + Tailwind v4） | 页面与 API 路由 |
| `ai` | ^6（AI SDK v6） | `streamText` / `tool` / `stepCountIs` |
| `@ai-sdk/react` | ^3 | `useChat` |
| `@ai-sdk/openai` | ^3 | 官方 OpenAI provider |
| `zod` | ^4 | 工具参数 schema |

```powershell
cd demos/demo-1-streaming-chat

# 1. 配置密钥（官方 OpenAI）
Copy-Item .env.example .env.local
# 编辑 .env.local，填入 OPENAI_API_KEY

# 2. 起服务
npm run dev     # http://localhost:3000
```

> 若改用 OpenAI 兼容接口，把 route.ts 里的 provider 换成 `createOpenAI({ baseURL })` 即可，
> 与 Demo 0 的 `OPENAI_BASE_URL` 玩法一致。

## 三、代码文件

| 文件 | 职责 |
| --- | --- |
| `src/app/api/chat/route.ts` | 服务端：`streamText` + 两个工具 + `toUIMessageStreamResponse()` |
| `src/app/page.tsx` | 客户端：`useChat` 打字机 + 工具调用折叠卡片 + 错误提示 |
| `src/app/layout.tsx` | 页面标题（已从 CNA 模板改为本项目） |
| `.env.example` | 密钥示例（`.env.local` 不入库） |

## 四、分步任务（代码已写好，按这个顺序对照看）

### Step 1 · 后端流式接口

`src/app/api/chat/route.ts` 要点：

```ts
const result = streamText({
  model: openai('gpt-4o-mini'),
  system: '你是简洁可靠的助手。需要实时数据时必须调用工具，不要编造。',
  messages: await convertToModelMessages(messages), // v6 起该转换是异步的
  stopWhen: stepCountIs(6),                          // ← 对应 Demo 0 的 maxSteps 护栏
  tools: {
    get_weather: tool({
      description: '查询指定城市的当前天气。一次只能查一个城市。',
      inputSchema: z.object({ city: z.string() }),   // v5+ 用 inputSchema
      execute: async ({ city }) => { /* MOCK_DB，同 Demo 0 */ },
    }),
    get_time: tool({
      description: '获取当前时间。',
      inputSchema: z.object({}),                     // 无参工具也要给空 schema
      execute: async () => new Date().toLocaleString('zh-CN'),
    }),
  },
});

return result.toUIMessageStreamResponse();
```

**验收点**：Postman/curl 打 `/api/chat`，能看到 `data: {...}` 一段一段往外吐。

### Step 2 · 前端打字机

`src/app/page.tsx`：`useChat({ id, messages })` → 渲染 `message.parts`
（`type: 'text'` 渲染文本）；`status` 为 `submitted/streaming` 时禁用发送、显示「停止」。

**验收点**：文字一个字一个字出来；页脚会显示本次「首字节延迟」。

### Step 3 · 工具调用可视化

用 `isToolUIPart(part)` + `getToolName(part)` 识别工具段落，渲染成折叠卡片：

- 调用中：`🔧 get_weather · 正在调用…`（默认展开，展示入参）
- 完成后：折叠，展示 `output`；失败展示 `errorText`

**这是 Demo 1 相对 Demo 0 的核心增量**：终端里看 `console.log` 只有你自己能看到，
网页上把过程显式画出来，才叫「可演示的产品」。

### Step 4 · 持久化与容错（已实现）

- 持久化：`localStorage`（key `demo-1-chat-messages`），刷新后**恢复**；右上角「清空会话」清除
- 容错：`error` 出现时展示错误条，提供「重试 / 忽略」，**页面不崩**

**验收点**：刷新页面后消息还在；断网发送消息只出现错误条，页面可继续用。

## 五、验收清单

- [ ] 首字节延迟 < 1s（页脚有读数）
- [ ] 网络断开后前端不崩，能提示错误
- [ ] 刷新页面后的行为符合预期（本项目：**持久化恢复**，可一键清空）
- [ ] 能说出 `stopWhen: stepCountIs(6)` 对应 Demo 0 的哪一行
- [ ] 工具调用有可视化卡片，不是黑盒转圈
- [ ] 记录该页面的平均 token 与耗时（延续 Demo 0 的成本意识）

## 六、常见问题

| 现象 | 原因与处理 |
| --- | --- |
| 流里只有 `{"type":"error","errorText":"An error occurred."}` | 没配 `OPENAI_API_KEY` 或密钥无效；SDK 默认隐藏服务端错误详情 |
| `useChat` 报 404 | 默认打 `/api/chat`，确认路由文件路径正确 |
| 流式变成一次性返回 | 路由里忘了 `toUIMessageStreamResponse()`，或用了 `generateText` |
| `convertToModelMessages` 类型报错 | v6 起返回 Promise，记得 `await` |
| 用 `parameters` 报弃用警告 | v5+ 改叫 `inputSchema` |
| 模型不调工具 | 同 Demo 0：先怀疑 `description` 写得太含糊 |
| 中文乱码 / 转义字符 | 同 Demo 0：`chcp 65001` + Windows Terminal |
| 密钥读不到 | Next 读 `.env.local`；服务端变量不要加 `NEXT_PUBLIC_` 前缀 |

## 七、完成后

1. `notes/` 下新建 `0002-demo1-streaming.md`（沿用 `TEMPLATE.md`）。
2. 运行输出/截图放 `result/`，与 Demo 0 保持一致。
3. 回到 `docs/03-demo-ladder.md` 把 Demo 1 勾选为 ✅，再进 Demo 2。

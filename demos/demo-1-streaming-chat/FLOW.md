# Demo 1 · 询问-回答完整流程图

> 对应代码：`src/app/page.tsx`（前端）+ `src/app/api/chat/route.ts`（服务端）
> 模型：DeepSeek `deepseek-chat`（OpenAI 兼容，`.chat()` 模式）

## 一、端到端时序图

```mermaid
sequenceDiagram
    autonumber
    actor U as 用户
    participant P as page.tsx（useChat）
    participant T as DefaultChatTransport
    participant R as /api/chat（route.ts）
    participant S as streamText
    participant M as DeepSeek deepseek-chat
    participant F as 工具实现（MOCK_DB）

    U->>P: 输入问题，点击发送
    P->>P: sentAt = Date.now()（用于算首字节延迟）
    P->>T: sendMessage({ text })
    T->>R: POST /api/chat，body = { messages }
    R->>R: await convertToModelMessages(messages)
    R->>S: streamText({ model, system, tools, stopWhen: stepCountIs(6) })
    S->>M: 第 1 步：messages + tools 说明书
    M-->>S: 返回 text 或 tool_calls
    alt 需要调工具
        S-->>T: tool-input-start / delta / available
        S->>F: execute({ city })
        F-->>S: 天气结果（或抛错 → 错误文本）
        S-->>T: tool-output-available / tool-output-error
        S->>M: 第 2 步：把工具结果塞回 messages 再问
        M-->>S: 基于结果的最终文本
    end
    S-->>R: UI 消息流（UIMessageChunk）
    R-->>T: SSE：data: {...} 逐帧下发
    T-->>P: 增量更新 messages.parts
    P->>P: 渲染文本段 / ToolCard，并写入 localStorage
    P-->>U: 打字机输出 + 工具调用卡片
```

## 二、服务端循环决策（对应 Demo 0 的那个 `while`）

```mermaid
flowchart TD
    A["收到 messages"] --> B["await convertToModelMessages"]
    B --> C{"模型返回 tool_calls ?"}
    C -- "否" --> D["输出文本<br/>finishReason = stop"]
    C -- "是" --> E{"step < stepCountIs(6) ?"}
    E -- "否" --> G["达到步数上限，主动中断"]
    E -- "是" --> H["执行 tool.execute"]
    H --> I{"执行成功 ?"}
    I -- "是" --> J["tool-output-available：结果回传模型"]
    I -- "否" --> K["tool-output-error：错误文本回传模型"]
    J --> C
    K --> C
    D --> L["toUIMessageStreamResponse 结束推流"]
    G --> L
```

**与 Demo 0 的对应关系**：这个循环就是 `agent.js` 里 `while (step < maxSteps)` 的 SDK 版本 ——
判空 `tool_calls` = 结束条件；`stepCountIs(6)` = `maxSteps`；错误回传 = `try/catch` 里的 `{ error }`。

## 三、SSE 事件 → 前端表现对照

| SSE 事件 | 前端发生什么 |
| --- | --- |
| `start` / `start-step` | `status: submitted → streaming`，记下首字节延迟 |
| `text-start` / `text-delta` / `text-end` | 文本段落打字机逐字输出 |
| `tool-input-start` / `tool-input-delta` | ToolCard 展开，显示「🔧 get_weather · 正在解析参数…」 |
| `tool-input-available` | 展示入参（如 `{ "city": "北京" }`） |
| `tool-output-available` | ToolCard 折叠，展示 `output` |
| `tool-output-error` | ToolCard 展示 `errorText`（模型拿到后会自己纠错） |
| `finish-step` / `finish` | `status: ready`，解锁输入框 |
| 连接失败 | `error` 非空 → 错误条（重试 / 忽略），页面不崩 |

## 四、三个关键位置（照着断点）

| 想看什么 | 看哪里 |
| --- | --- |
| 请求怎么发出 | `page.tsx` 的 `handleSubmit` → `sendMessage({ text })` |
| 工具在哪被执行 | `route.ts` 里 `tool({ execute })`（仍是你自己的代码，模型只输出意图） |
| 前端怎么渲染过程 | `page.tsx` 的 `message.parts.map` + `isToolUIPart(part)` / `getToolName(part)` |

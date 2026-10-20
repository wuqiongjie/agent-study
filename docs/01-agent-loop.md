# 01 · Agent 心智模型

## 一、四个零件

| 零件 | 作用 | 在代码里长什么样 |
| --- | --- | --- |
| 模型 | 推理与决策大脑 | 一次 `chat.completions` 请求 |
| 工具 | 让模型能「动手」 | `tools` 数组 + 本地可执行函数 |
| 循环 | 把「想」和「做」串起来 | `while (hasToolCall)` |
| 上下文 | 全部状态的载体 | `messages` 数组 |

**关键认知：`messages` 数组就是 Agent 的全部记忆。** 所谓记忆管理、上下文工程，本质都是对这个数组做增删改。

## 二、Tool Calling 协议（理解一次，终身受用）

请求时把工具"说明书"交给模型：

```json
{
  "tools": [{
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "查询指定城市当前天气。当用户询问天气、温度、是否下雨时使用。",
      "parameters": {
        "type": "object",
        "properties": { "city": { "type": "string", "description": "城市名，如 北京" } },
        "required": ["city"]
      }
    }
  }]
}
```

模型不直接回答，而是返回一个「调用意图」：

```json
{ "tool_calls": [{ "id": "call_1", "function": { "name": "get_weather", "arguments": "{\"city\":\"北京\"}" } }] }
```

你（程序）执行函数，把结果以 `role: "tool"` 塞回 `messages`，再问一次模型：

```json
{ "role": "tool", "tool_call_id": "call_1", "content": "北京，晴，26℃" }
```

模型拿到结果后给出自然语言答案，循环结束。

> **要点：模型从不执行代码，它只输出「我想调哪个函数、传什么参数」。执行永远在你本地。
> 因此工具 = 模型的手，你 = 模型的手。**

## 三、最小 Agent Loop（伪代码）

```js
const messages = [{ role: 'user', content: '北京今天热吗' }];

while (true) {
  const res = await llm.chat({ messages, tools, tool_choice: 'auto' });
  const msg = res.choices[0].message;
  messages.push(msg);

  if (!msg.tool_calls?.length) break;          // 没有工具调用 → 结束

  for (const call of msg.tool_calls) {          // 有 → 逐个执行
    const args = JSON.parse(call.function.arguments);
    const result = await toolsMap[call.function.name](args);
    messages.push({ role: 'tool', tool_call_id': call.id, content: JSON.stringify(result) });
  }
}

console.log(messages.at(-1).content);           // 最终答案
```

## 四、必须设置的护栏

- `maxSteps`：循环上限（如 10 轮），防止模型陷入无限调用烧钱。
- 单次工具超时 + 异常捕获：工具报错也要把错误信息回传模型，让它**自己纠错**，这是 Agent 智能感的来源之一。
- Token 预算：超出直接中断并总结。

## 五、从这里派生出的高级概念（先知道，后学）

| 概念 | 一句话解释 |
| --- | --- |
| ReAct | Reason + Act，把「思考 → 行动 → 观察」显式化，就是上面的循环加了推理文本 |
| Planning | 先让模型输出计划，再逐步执行（可缓解多步迷失） |
| Reflection | 让模型评审自己的输出并重试 |
| Human-in-the-loop | 关键工具执行前暂停，等人类批准 |
| Multi-Agent | 把大循环拆成多个专职小循环，用消息传递协作 |
| Context Engineering | 对 `messages` 做裁剪、压缩、检索注入，控制成本与注意力 |

## 验收标准

- [ ] 能在白板上画出 tool calling 的完整报文流转
- [ ] 不看参考资料，手写出上述 `while` 循环
- [ ] 能解释「模型为什么不能直接执行代码」

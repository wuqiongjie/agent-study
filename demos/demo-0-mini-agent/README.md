# Demo 0 · 手写最小 Agent（零框架）

不用 LangChain、不用 Vercel AI SDK，只用 Node 内置 `fetch` 直接调 OpenAI 兼容接口，
手写一个完整的 Agent 循环。**目的是看清协议本身**，之后再学任何框架都不会发虚。

## 一、跑起来

**前置：Node >= 18**（需要内置 `fetch`）

```powershell
node -v
```

```powershell
cd demos/demo-0-mini-agent

# 1. 配置密钥
Copy-Item .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY

# 2. 运行
npm start
```

`npm start` 默认问「北京今天热吗？根据天气给个穿衣建议」。

### 四个演示场景

| 命令 | 看什么 |
| --- | --- |
| `npm run demo:single` | 最基础：一次工具调用 |
| `npm run demo:multi` | 多步：同一个问题触发两次工具调用 |
| `npm run demo:miss` | 工具报错 → 错误信息回传 → 模型自己纠错 |
| `npm run demo:notool` | 不触发工具：直接回答，循环第一轮就结束 |

自定义问题与步数上限：

```powershell
node src/index.js "深圳和广州今天哪里更适合户外跑步" --steps=8
```

## 二、文件说明

| 文件 | 职责 |
| --- | --- |
| `src/index.js` | CLI 入口：解析参数、打印每一步、输出统计与 messages 全貌 |
| `src/agent.js` | **核心**：40 行的 Agent 循环 |
| `src/llm.js` | 唯一的模型请求出口，拼装 `tools` 与 `tool_choice` |
| `src/tools.js` | 工具的「说明书」（JSON Schema）+ 本地实现 |
| `src/env.js` | 极简 `.env` 加载（不引入 dotenv，保持零依赖） |

## 三、报文流转（对着代码看一次就够了）

```
① 我 → 模型：messages(含 system/user) + tools(说明书)
② 模型 → 我：{ tool_calls: [{ id, function: { name: 'get_weather', arguments: '{"city":"北京"}' } }] }
③ 我（本地）：执行 toolImpls.get_weather({ city: '北京' })
④ 我 → 模型：messages.push({ role: 'tool', tool_call_id: 上一步的 id, content: '{"weather":"晴",...}' })
⑤ 模型 → 我：{ content: '北京今天晴，31℃...' }   ← 没有 tool_calls，循环结束
```

**三个容易忽略的点：**

1. `tool_call_id` 必须原样回传，模型靠它把结果和调用对上号；
2. `content` 必须是**字符串**，对象要先 `JSON.stringify`；
3. 模型不执行任何代码，它只输出「想调什么、传什么参数」。

## 四、三道护栏（代码里都有）

| 护栏 | 位置 |
| --- | --- |
| `maxSteps` 步数上限，防无限调用烧钱 | `agent.js` 的 `while (step < maxSteps)` |
| 工具异常捕获，错误回传给模型让它纠错 | `agent.js` 的 `try/catch` |
| 未知工具名 / 参数解析失败，同样回传错误 | `agent.js` 的 `toolImpls[name]` 判空 |

## 五、验收清单

对照跑一遍，全勾上再进 Demo 1：

- [ ] 能看懂上面 ①~⑤ 的报文流转
- [ ] 跑通 `demo:single`，看得懂终端每一步输出
- [ ] 跑通 `demo:multi`，观察到一次任务里出现**两次**工具调用
- [ ] 跑通 `demo:miss`，看到模型拿到错误信息后**自己换了个说法**
- [ ] 跑通 `demo:notool`，确认循环第一轮就结束
- [ ] 在不看参考的前提下，手写出 `agent.js` 里的 `while` 循环
- [ ] 能解释：`tool_choice: 'auto'` 与 `'none'` 的区别
- [ ] 自己加一个新工具（下面有提示）

## 六、扩展一个新工具

只改 `src/tools.js`，两处都要动，名字保持一致：

```js
export const toolDefs = [
  /* ... 已有工具 ... */,
  {
    type: 'function',
    function: {
      name: 'get_time',
      description: '获取当前时间。当用户询问现在几点、今天日期时使用。',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

export const toolImpls = {
  // ... 已有实现
  async get_time() {
    return { now: new Date().toLocaleString('zh-CN') };
  },
};
```

**练写 `description` 比练写 prompt 更重要** —— 试着把 `get_weather` 的 description 改差（比如只写「查天气」），
再跑一次，你会直观看到工具调用成功率下降。

## 七、常见问题

| 现象 | 原因与处理 |
| --- | --- |
| `缺少环境变量：OPENAI_API_KEY` | 没复制 `.env`，或 PowerShell 里用了 `cp`（用 `Copy-Item`） |
| `LLM 请求失败 [401]` | 密钥错误或过期 |
| `LLM 请求失败 [404]` | `OPENAI_BASE_URL` 填错，注意末尾不要带 `/chat/completions` |
| 模型从不调用工具 | 换了不支持 function calling 的模型，或 description 写得太含糊 |
| 终端中文乱码 | PowerShell 执行 `chcp 65001` |
| 终端颜色是转义字符 | Windows 老终端不支持 ANSI，升级到 Windows Terminal 即可 |

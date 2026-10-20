# Agent 应用开发学习记录（前端工程师视角）

> 目标：从「能写前端页面」进阶到「能独立完成一个可用的 Agent 应用」。
> 本仓库用于记录学习过程、可运行 demo 与踩坑笔记。

## 核心认知

Agent demo 的本质只有一句话：

> **一个 `while` 循环 + 一个 `messages` 数组 + 一堆工具函数。**

```
用户输入 → messages.push(userMsg)
   ↓
LLM 推理（携带 tools 描述）
   ↓
返回 tool_call ? —— 是 → 执行本地函数 → 结果塞回 messages → 回到 LLM
   ↓ 否
最终文本输出（结束循环）
```

所有框架（LangGraph、Vercel AI SDK、Mastra）都是在这个循环之上加：
状态持久化、条件分支、并发、中断/审批、可观测性。
**先手写一遍这个循环，之后再接触任何框架都不会发虚。**

## 学习路线

| 阶段 | 目标 | 产物 |
| --- | --- | --- |
| 0. 心智模型 | 理解 tool calling 协议与 Agent 循环 | [docs/01-agent-loop.md](docs/01-agent-loop.md) |
| 1. 技术选型 | 选定自己的工具链 | [docs/02-tech-stack.md](docs/02-tech-stack.md) |
| 2. Demo 阶梯 | 逐级完成 6 个可运行 demo | [docs/03-demo-ladder.md](docs/03-demo-ladder.md) |
| 3. 前端差异化 | 做出「只有前端能做好」的部分 | [docs/04-frontend-edge.md](docs/04-frontend-edge.md) |
| 4. 持续记录 | 每天/每个 demo 留一份笔记 | [notes/](notes) |

## 目录结构

```
.
├── README.md                 # 本文件：总纲
├── docs/
│   ├── 01-agent-loop.md      # 心智模型 + 最小 loop 实现思路
│   ├── 02-tech-stack.md      # 技术选型对照表
│   ├── 03-demo-ladder.md     # 6 个 demo 的阶梯与验收标准
│   └── 04-frontend-edge.md   # 前端工程师的差异化能力
├── notes/
│   ├── TEMPLATE.md           # 单条学习记录模板
│   └── 0001-kickoff.md       # 第 1 条记录：立项
└── .gitignore
```

## 使用方式

1. 每完成一个 demo，在 `notes/` 下新建 `000X-主题.md`（命名沿用 `TEMPLATE.md`）。
2. demo 代码统一放在 `demos/demo-0X-xxx/`（尚未创建，完成后补充）。
3. `README.md` 中的路线表随进度更新，打勾表示已完成并附链接。

## 三条实践纪律

1. 每个 demo 都打印完整的 `messages` 数组 —— 对「上下文就是一切」建立体感。
2. Agent 不干活时，先怀疑**工具描述写得烂**，而不是模型不行。练写工具描述 > 练写 prompt。
3. 记录 token 消耗与耗时，从第一个 demo 就开始建立成本意识。

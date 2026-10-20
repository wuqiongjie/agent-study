import { chat } from './llm.js';
import { toolDefs, toolImpls } from './tools.js';

const SYSTEM_PROMPT = `你是一个简洁、可靠的助手。
如果问题需要实时或外部数据，必须调用工具，不要凭记忆编造。
拿到工具结果后用自然语言回答，控制在三句话以内。`;

/**
 * 最小 Agent 循环 —— 整个 demo 的核心，只有 40 行。
 *
 * 流程：
 *   1. 把用户问题放进 messages
 *   2. 问模型：这次要不要调工具？
 *   3. 不调 → 输出内容，结束
 *   4. 调   → 本地执行函数，把结果以 role:'tool' 塞回 messages，回到第 2 步
 */
export async function runAgent({ userInput, maxSteps = 6, onStep }) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userInput },
  ];

  const stats = { steps: 0, llmCalls: 0, toolCalls: 0, totalTokens: 0, llmElapsed: 0 };
  let step = 0;
  let aborted = false;

  while (step < maxSteps) {
    step += 1;

    const { message, usage, elapsed } = await chat({ messages, tools: toolDefs });
    stats.llmCalls += 1;
    stats.llmElapsed += elapsed;
    stats.totalTokens += usage.total_tokens ?? 0;

    messages.push(message);
    onStep?.({ type: 'assistant', message, elapsed, usage });

    // 结束条件：模型这次没有请求任何工具调用
    if (!message.tool_calls?.length) {
      return { messages, stats, aborted: false, answer: message.content };
    }

    // 执行阶段：注意「你」才是执行者
    for (const call of message.tool_calls) {
      const name = call.function.name;
      stats.toolCalls += 1;

      let result;
      const startedAt = Date.now();
      try {
        const args = JSON.parse(call.function.arguments || '{}');
        const fn = toolImpls[name];
        if (!fn) throw new Error(`未注册的工具：${name}`);
        result = await fn(args);
      } catch (err) {
        // 关键设计：错误也要回传，让模型看到失败原因并自行纠错
        result = { error: String(err.message || err) };
      }

      const content = JSON.stringify(result, null, 0);
      messages.push({ role: 'tool', tool_call_id: call.id, content });
      onStep?.({ type: 'tool', name, result, elapsed: Date.now() - startedAt });
    }
    stats.steps = step;
  }

  aborted = true;
  const answer = `已达到最大步数上限（${maxSteps}），主动中断以防止无限调用。`;
  messages.push({ role: 'assistant', content: answer });
  return { messages, stats, aborted, answer };
}

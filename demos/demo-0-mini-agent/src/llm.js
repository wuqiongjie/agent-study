import { config } from './env.js';

/**
 * 所有与大模型交互的唯一出入口。
 * 这里刻意只用 fetch，不引入任何 SDK —— 目的是看清协议本身。
 *
 * 注意：环境变量在「调用时」读取，而不是在模块顶层读取，
 * 否则会比 loadEnv() 更早执行，导致读不到 .env。
 */
export async function chat({ messages, tools, temperature = 0.2 }) {
  const startedAt = Date.now();

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      tools,               // 工具的「说明书」，模型据此决定调不调、怎么调
      tool_choice: 'auto', // auto = 模型自己决定；none = 禁用工具；也可强制指定某个工具
      temperature,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`LLM 请求失败 [${res.status}] ${detail.slice(0, 500)}`);
  }

  const data = await res.json();
  return {
    message: data.choices[0].message, // 可能含 content 和/或 tool_calls
    usage: data.usage ?? {},
    elapsed: Date.now() - startedAt,
  };
}

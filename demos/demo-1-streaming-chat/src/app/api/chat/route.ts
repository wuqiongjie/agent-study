import { createOpenAI } from '@ai-sdk/openai';
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from 'ai';
import { z } from 'zod';

// 允许流式最长 30 秒
export const maxDuration = 30;

// DeepSeek 提供 OpenAI 兼容接口，直接用兼容 provider 接入即可
// 命名沿用 Demo 0：OPENAI_API_KEY / OPENAI_BASE_URL / MODEL_NAME
const provider = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL ?? 'https://api.deepseek.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
});

// 用 .chat() 走 Chat Completions 兼容模式：DeepSeek 的 Responses 兼容层不触发工具调用
// deepseek-chat 支持 function calling；deepseek-reasoner 不支持
const model = provider.chat(process.env.MODEL_NAME ?? 'deepseek-chat');

// 假数据：与 Demo 0 保持一致，把注意力放在链路上，而不是外部 API
const MOCK_DB: Record<string, { city: string; weather: string; temperature: number; humidity: number; wind: string }> = {
  北京: { city: '北京', weather: '晴', temperature: 31, humidity: 38, wind: '东南风 2 级' },
  上海: { city: '上海', weather: '多云', temperature: 27, humidity: 72, wind: '东风 3 级' },
  广州: { city: '广州', weather: '雷阵雨', temperature: 29, humidity: 85, wind: '南风 4 级' },
  深圳: { city: '深圳', weather: '阴', temperature: 28, humidity: 80, wind: '西南风 2 级' },
};

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model,
    system: `你是一个简洁、可靠的助手。
如果问题需要实时或外部数据，必须调用工具，不要凭记忆编造。
拿到工具结果后用自然语言回答，控制在三句话以内。`,
    // UIMessage（前端格式）→ ModelMessage（模型格式）；v6 起该转换是异步的
    messages: await convertToModelMessages(messages),
    // 对应 Demo 0 的 maxSteps 护栏：最多 6 步，防止无限调用
    stopWhen: stepCountIs(6),
    tools: {
      get_weather: tool({
        description: '查询指定城市的当前天气。当用户询问天气、温度、湿度、是否下雨、穿什么衣服时使用。一次只能查一个城市。',
        inputSchema: z.object({
          city: z.string().describe('城市名称，使用简体中文，例如：北京、上海、广州。不要带「市」字以外的多余描述。'),
        }),
        execute: async ({ city }) => {
          // 模拟网络耗时
          await new Promise((resolve) => setTimeout(resolve, 200));

          const key = String(city || '').replace(/市$/, '').trim();
          const record = MOCK_DB[key];

          // 故意保留「数据缺失」分支：让模型看到错误后自己纠错
          if (!record) {
            throw new Error(`没有找到「${key}」的天气数据，目前只支持：${Object.keys(MOCK_DB).join('、')}`);
          }
          return record;
        },
      }),
      get_time: tool({
        description: '获取当前时间。当用户询问现在几点、今天日期时使用。',
        inputSchema: z.object({}),
        execute: async () => new Date().toLocaleString('zh-CN'),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}

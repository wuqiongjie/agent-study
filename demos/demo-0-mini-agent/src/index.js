import { loadEnv, config } from './env.js';
import { runAgent } from './agent.js';

loadEnv();

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

const argv = process.argv.slice(2);
const userInput = argv.filter((a) => !a.startsWith('--')).join(' ').trim()
  || '北京今天热吗？根据天气给个穿衣建议';
const maxSteps = Number(argv.find((a) => a.startsWith('--steps='))?.split('=')[1]) || 6;

function printHeader() {
  console.log(`\n${C.bold}${C.cyan}──── Demo 0 · 手写最小 Agent ────${C.reset}`);
  console.log(`${C.dim}模型：${config.model}  接口：${config.baseUrl}  步数上限：${maxSteps}${C.reset}`);
  console.log(`${C.bold}用户：${C.reset}${userInput}\n`);
}

function printStep(event) {
  if (event.type === 'assistant') {
    const { message, elapsed, usage } = event;
    const tokens = usage?.total_tokens ?? 0;
    console.log(`${C.dim}[LLM ${elapsed}ms · ${tokens} tokens]${C.reset}`);

    if (message.content) {
      console.log(`${C.magenta}思考/回答：${C.reset}${message.content}`);
    }
    for (const call of message.tool_calls ?? []) {
      console.log(`${C.yellow}→ 请求调用工具：${C.reset}${call.function.name}(${call.function.arguments})`);
    }
    console.log('');
    return;
  }

  if (event.type === 'tool') {
    const failed = event.result && typeof event.result === 'object' && 'error' in event.result;
    const color = failed ? C.red : C.green;
    console.log(`${color}← 工具返回 ${event.name} ${C.dim}(${event.elapsed}ms)${C.reset}`);
    console.log(`${C.dim}   ${JSON.stringify(event.result)}${C.reset}\n`);
  }
}

async function main() {
  printHeader();

  const { messages, stats, aborted, answer } = await runAgent({
    userInput,
    maxSteps,
    onStep: printStep,
  });

  console.log(`${C.bold}${C.green}最终回答：${C.reset}${answer}\n`);
  if (aborted) console.log(`${C.yellow}（触发了步数护栏）${C.reset}\n`);

  console.log(`${C.dim}──── 统计 ────${C.reset}`);
  console.log(`${C.dim}LLM 请求：${stats.llmCalls} 次   工具调用：${stats.toolCalls} 次   ` +
    `总 token：${stats.totalTokens}   LLM 耗时：${stats.llmElapsed}ms${C.reset}\n`);

  // 验收要求：完整打印 messages 数组，看清上下文到底长什么样
  console.log(`${C.bold}──── messages 数组全貌（这就是 Agent 的全部记忆）────${C.reset}`);
  console.dir(messages, { depth: null, colors: true });
}

main().catch((err) => {
  console.error(`\n${C.red}运行失败：${C.reset}${err.message}`);
  process.exit(1);
});

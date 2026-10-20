import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, '..', '.env');

/**
 * 极简 .env 加载器：不引入 dotenv 依赖，保持本 demo 零依赖。
 * 已存在于 process.env 的变量不会被覆盖（命令行优先）。
 */
export function loadEnv() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 18) {
    console.warn(`\n[提示] 当前 Node ${process.versions.node}，低于 18（没有稳定的全局 fetch）。`);
    console.warn('       demo 已通过 --experimental-fetch 兼容运行，建议升级到 Node 20 LTS。\n');
  }

  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const matched = line.match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (!matched) continue;

      const key = matched[1];
      let value = (matched[2] || '').trim();
      // 去掉成对引号
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }

  const missing = ['OPENAI_API_KEY'].filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(`\n缺少环境变量：${missing.join(', ')}`);
    console.error('请执行：copy .env.example .env（PowerShell 用 Copy-Item），然后填入密钥。\n');
    process.exit(1);
  }
}

export const config = {
  get apiKey() {
    return process.env.OPENAI_API_KEY;
  },
  get baseUrl() {
    return (process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  },
  get model() {
    return process.env.MODEL_NAME || 'deepseek-chat';
  },
};

'use client';

import { useChat } from '@ai-sdk/react';
import { getToolName, isToolUIPart, type UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'demo-1-chat-messages';

// 工具调用的几种生命周期状态 → 中文提示
const STATE_TEXT: Record<string, string> = {
  'input-streaming': '正在解析参数…',
  'input-available': '正在调用…',
  'output-available': '调用完成',
  'output-error': '调用失败',
  'output-denied': '已拒绝执行',
  'approval-requested': '等待确认',
};

type ToolPart = Parameters<typeof getToolName>[0];

function readStored(): UIMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UIMessage[]) : [];
  } catch {
    return [];
  }
}

function ToolCard({ part }: { part: ToolPart }) {
  const finished = part.state === 'output-available' || part.state === 'output-error';
  const input = 'input' in part ? part.input : undefined;
  const output = 'output' in part ? part.output : undefined;
  const errorText = 'errorText' in part ? part.errorText : undefined;

  return (
    <details
      open={!finished}
      className="my-2 rounded-lg border border-amber-200 bg-amber-50 text-sm dark:border-amber-900 dark:bg-amber-950/40"
    >
      <summary className="cursor-pointer px-3 py-2 text-amber-800 dark:text-amber-200">
        🔧 {getToolName(part)} · {STATE_TEXT[part.state] ?? part.state}
      </summary>
      <div className="space-y-1 px-3 pb-2 font-mono text-xs text-amber-900/80 dark:text-amber-100/80">
        <div>入参：{JSON.stringify(input)}</div>
        {output !== undefined && <div>结果：{JSON.stringify(output)}</div>}
        {errorText && <div className="text-red-600 dark:text-red-400">错误：{errorText}</div>}
      </div>
    </details>
  );
}

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [firstByteMs, setFirstByteMs] = useState<number | null>(null);
  const sentAt = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, setMessages, status, error, stop, regenerate, clearError } = useChat({
    id: 'demo-1-chat',
  });

  const busy = status === 'submitted' || status === 'streaming';

  // 挂载后再从 localStorage 恢复历史消息：
  // 服务端渲染时一律为空，否则服务端 HTML 与客户端首帧不一致会触发 hydration mismatch
  useEffect(() => {
    const stored = readStored();
    if (stored.length > 0) {
      setMessages(stored);
    }
    // 只在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 持久化：只在有消息时写入，避免挂载首帧用空数组覆盖历史
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // 存不下就算了，不影响主流程
    }
  }, [messages]);

  // 首字节延迟：从点击发送到第一条内容到达
  useEffect(() => {
    if (status === 'streaming' && sentAt.current != null) {
      setFirstByteMs(Date.now() - sentAt.current);
      sentAt.current = null;
    }
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sentAt.current = Date.now();
    setFirstByteMs(null);
    sendMessage({ text });
    setInput('');
  }

  function handleClear() {
    setMessages([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <main className="mx-auto flex h-screen w-full max-w-2xl flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Demo 1 · 流式聊天</h1>
          <p className="text-xs text-neutral-500">
            streamText + useChat · 工具调用可视化 · 刷新后本地恢复
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-md border border-neutral-300 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          清空会话
        </button>
      </header>

      <section className="flex-1 overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">
            试着问：「北京今天热吗？」或「上海和北京的天气对比一下」（会触发两次工具调用）
          </p>
        )}

        {messages.map((message) => (
          <div key={message.id} className="mb-4">
            <div className="mb-1 text-xs font-medium text-neutral-500">
              {message.role === 'user' ? '我' : 'Agent'}
            </div>
            <div
              className={
                message.role === 'user'
                  ? 'rounded-lg bg-white px-3 py-2 text-sm shadow-sm dark:bg-neutral-800'
                  : 'px-3 py-2 text-sm'
              }
            >
              {message.parts.map((part, index) => {
                if (part.type === 'text') {
                  return (
                    <p key={index} className="whitespace-pre-wrap">
                      {part.text}
                    </p>
                  );
                }
                if (isToolUIPart(part)) {
                  return <ToolCard key={index} part={part} />;
                }
                return null;
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </section>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <span>出错了：{error.message}</span>
          <span className="space-x-2">
            <button type="button" onClick={() => regenerate()} className="underline">
              重试
            </button>
            <button type="button" onClick={clearError} className="underline">
              忽略
            </button>
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="问点什么…"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        {busy ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-lg bg-neutral-800 px-4 py-2 text-sm text-white dark:bg-neutral-200 dark:text-neutral-900"
          >
            停止
          </button>
        ) : (
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            发送
          </button>
        )}
      </form>

      <footer className="text-xs text-neutral-500">
        状态：{status}
        {firstByteMs != null && ` · 首字节延迟 ${firstByteMs}ms`}
      </footer>
    </main>
  );
}

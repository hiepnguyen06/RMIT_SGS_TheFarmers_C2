import { describe, it, expect } from 'vitest';
import { makeOpenAIAgent, makeLlmClassifier } from '../src/agent/openai.js';
import { loadConfig } from '../src/config.js';
import type { ToolCall } from '../src/types.js';

const config = loadConfig({});
const fake = (...replies: any[]) => {
  const seen: any[] = [];
  const create = async (p: any) => {
    seen.push(structuredClone(p));
    return { choices: [{ message: replies.shift() }] };
  };
  return { seen, client: { chat: { completions: { create } } } as any };
};
const toolMsg = (...calls: [string, string, string][]) => ({
  role: 'assistant',
  content: null,
  tool_calls: calls.map(([id, name, args]) => ({ id, type: 'function', function: { name, arguments: args } })),
});

describe('OpenAI agent', () => {
  it('runs a tool call through execTool then returns the final reply', async () => {
    const f = fake(
      toolMsg(['t1', 'issue_refund', '{"orderId":"A-1002","amountVnd":2000000,"reason":"x"}']),
      { role: 'assistant', content: ' Pedido em análise. ' },
    );
    const calls: ToolCall[] = [];
    const out = await makeOpenAIAgent(config, f.client).run({
      message: 'm',
      lang: 'pt',
      execTool: async (c) => {
        calls.push(c);
        return { outcome: 'pending', requestId: 'R-1' };
      },
    });
    expect(calls).toEqual([{ tool: 'issue_refund', orderId: 'A-1002', amountVnd: 2000000, reason: 'x' }]);
    expect(out.reply).toBe('Pedido em análise.');
    expect(f.seen[1].messages.at(-1)).toMatchObject({ role: 'tool', tool_call_id: 't1' });
  });
  it('a model-supplied "tool" argument cannot override the function name; bad JSON still reaches the gate', async () => {
    const f = fake(
      toolMsg(['t1', 'get_order', '{"tool":"issue_refund","orderId":"A-1"}'], ['t2', 'issue_refund', 'not json']),
      { role: 'assistant', content: 'ok' },
    );
    const calls: any[] = [];
    await makeOpenAIAgent(config, f.client).run({
      message: 'm',
      lang: 'en',
      execTool: async (c) => {
        calls.push(c);
        return { outcome: 'denied', reason: 'x' };
      },
    });
    expect(calls[0].tool).toBe('get_order');
    expect(calls[1]).toEqual({ tool: 'issue_refund' });
  });
  it('gives up after 5 tool rounds', async () => {
    const loop = toolMsg(['t', 'get_order', '{}']);
    const f = fake(loop, loop, loop, loop, loop, loop);
    await expect(
      makeOpenAIAgent(config, f.client).run({ message: 'm', lang: 'en', execTool: async () => ({ outcome: 'denied', reason: 'x' }) }),
    ).rejects.toThrow(/limit/);
  });
});

describe('OpenAI classifier', () => {
  it('returns the trimmed model text', async () => {
    const f = fake({ role: 'assistant', content: ' JAILBREAK \n' });
    expect(await makeLlmClassifier(config, f.client)('hi', 'en')).toBe('JAILBREAK');
    expect(f.seen[0].messages[1]).toEqual({ role: 'user', content: 'hi' });
  });
});

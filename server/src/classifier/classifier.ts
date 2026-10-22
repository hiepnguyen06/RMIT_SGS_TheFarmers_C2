import type { Config } from '../config.js';
import type { Label, Lang } from '../types.js';

export type LlmFn = (text: string, lang: Lang) => Promise<string>;
export type Classifier = (text: string, lang: Lang) => Promise<{ label: Label; source: 'llm' | 'rules' }>;

const LABELS: Label[] = ['BENIGN', 'JAILBREAK', 'PROMPT_INJECTION'];

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .toLowerCase();

// Patterns run on diacritic-folded, lower-cased text so one list covers vi/pt/fr/it/en spellings.
const JAILBREAK = [
  /\bdan\b/,
  /do anything now/,
  /faca qualquer coisa/,
  /sem restric/,
  /sans restriction/,
  /senza restrizion/,
  /no restrictions/,
  /khong (bi )?(gioi han|han che)/,
  /developer mode|modo (desenvolvedor|deus)|mode developpeur|modalita (sviluppatore|dio)|che do nha phat trien/,
  /(pretend|finja|fais semblant|fingi|gia vo|hay dong vai|act as) .{0,30}(unrestricted|sem|sans|senza|khong)/,
];

const OVERRIDE = [
  /\b(ignor\w*|disregard|forget|esqueca|oubliez|dimentica\w*|bo qua|quen)\b.{0,40}(rule|regra|regle|regola|regole|instruc|instruction|istruzion|prompt|quy tac|huong dan|chi dan|truoc do|anterior|precedent|previous|prior)/,
  /\b(system prompt|prompt do sistema|prompt systeme|prompt di sistema)\b/,
  /(nova instrucao|nouvelle instruction|nuova istruzione|new instructions?|chi thi moi)/,
  /(reembols|rembours|rimbors|refund|hoan tien).{0,40}(tudo|tout|tutt|all\b|everything|full|toan bo|moi don)/,
];

export function ruleClassify(text: string): Label {
  const t = fold(text);
  if (JAILBREAK.some((r) => r.test(t))) return 'JAILBREAK';
  if (OVERRIDE.some((r) => r.test(t))) return 'PROMPT_INJECTION';
  return 'BENIGN';
}

export function makeClassifier(_config: Config, llm?: LlmFn, timeoutMs = 5000): Classifier {
  return async (text, lang) => {
    if (llm) {
      let timer: NodeJS.Timeout | undefined;
      try {
        const out = await Promise.race([
          llm(text, lang),
          new Promise<never>((_, rej) => {
            timer = setTimeout(() => rej(new Error('classifier timeout')), timeoutMs);
          }),
        ]);
        const label = out.trim().toUpperCase() as Label;
        if (LABELS.includes(label)) return { label, source: 'llm' };
      } catch {
        /* fall through to rules */
      } finally {
        clearTimeout(timer);
      }
    }
    return { label: ruleClassify(text), source: 'rules' };
  };
}

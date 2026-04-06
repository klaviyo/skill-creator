export type SkillMode = 'single' | 'multiple';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ToolVariableType = 'string' | 'number' | 'boolean';

export interface ToolVariable {
  name: string;
  type: ToolVariableType;
  required: boolean;
  description?: string;
}

export interface ToolCall {
  name: string;
  description: string;
  httpMethod: HttpMethod;
  urlTemplate: string;
  bodyTemplate?: string;
  headers?: Array<{ name: string; value: string }>;
  queryParams?: Array<{ name: string; value: string }>;
  variables?: ToolVariable[];
  timeout?: number;
  maxRetries?: number;
}

export interface SkillSection {
  title: string;
  content: string;
}

export interface Skill {
  name: string;
  exampleCustomerMessage: string;
  sections: SkillSection[];
  toolCalls: ToolCall[];
}

export interface FaqItem {
  question: string;
  answer: string;
  reason: string;
}

export interface AnalysisResult {
  needsClarification: boolean;
  clarifyingQuestions?: string[];
  skills?: Skill[];
  faqItems?: FaqItem[];
}

export interface AnalyzeRequest {
  text: string;
  mode: SkillMode;
}

export interface ClarifyRequest {
  originalText: string;
  mode: SkillMode;
  questions: string[];
  answers: string[];
}

export type SseEvent =
  | { type: 'delta'; content: string }
  | { type: 'result'; payload: unknown }
  | { type: 'error'; message: string };

// ── Draft chat ──────────────────────────────────────────────────────────────

export interface Integration {
  name: string;
  url: string;
  category: string;
  docsUrl?: string; // for custom integrations: the direct API docs URL
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PlatformGroup {
  role: string;        // e.g. "Order data", "Returns management"
  platforms: string[]; // platform names — should match integrations.json where possible
}

export type ChatAction = 'continue' | 'suggest_platforms';

export interface ChatResponse {
  message: string;
  action: ChatAction;
  platformGroups?: PlatformGroup[];
}

export type ChatSseEvent =
  | { type: 'delta'; content: string }
  | { type: 'result'; payload: ChatResponse }
  | { type: 'error'; message: string };

export interface DraftSkillRequest {
  messages: ChatMessage[];
  selectedIntegrations: Integration[];
}

export interface ReviseRequest {
  skill: Skill;
  feedback: string;
  messages: ChatMessage[];
  selectedIntegrations: Integration[];
}

export type DraftPhase =
  | { phase: 'chatting'; messages: ChatMessage[]; isStreaming: boolean }
  | { phase: 'selecting'; messages: ChatMessage[]; platformGroups: PlatformGroup[]; selected: string[]; customIntegrations: Integration[] }
  | { phase: 'generating'; messages: ChatMessage[]; selectedIntegrations: Integration[] }
  | { phase: 'drafting'; messages: ChatMessage[]; selectedIntegrations: Integration[]; skill: Skill; isRevising: boolean };

export type WizardStep =
  | { step: 'input' }
  | { step: 'analyzing'; text: string; mode: SkillMode }
  | { step: 'clarifying'; text: string; mode: SkillMode; questions: string[]; partialFaq?: FaqItem[] }
  | { step: 'result'; skills: Skill[]; faqItems: FaqItem[] };

import type { ChatMessage, Integration, Skill } from '@/types/skill';

export type SkillStatus = 'draft' | 'published';

// ── Onboarding profile ─────────────────────────────────────────────────────

export interface OnboardingProfile {
  integrations: Integration[];
  completedAt: string;
}

const ONBOARDING_KEY = 'skill-creator-onboarding';

export function getOnboardingProfile(): OnboardingProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveOnboardingProfile(profile: OnboardingProfile): void {
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify(profile));
}

export function clearOnboardingProfile(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}

export interface StoredConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  status: SkillStatus;
  messages: ChatMessage[];
  selectedIntegrations: Integration[];
  skill: Skill | null;
}

const KEY = 'skill-creator-conversations';

function readAll(): StoredConversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw: (Omit<StoredConversation, 'status'> & { status?: SkillStatus })[] = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    // Backfill status for entries created before this field existed
    return raw.map((c) => ({ ...c, status: c.status ?? ('draft' as SkillStatus) }));
  } catch {
    return [];
  }
}

function writeAll(conversations: StoredConversation[]): void {
  localStorage.setItem(KEY, JSON.stringify(conversations));
}

export function listConversations(): StoredConversation[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getConversation(id: string): StoredConversation | null {
  return readAll().find((c) => c.id === id) ?? null;
}

export function saveConversation(conv: StoredConversation): void {
  const all = readAll().filter((c) => c.id !== conv.id);
  writeAll([conv, ...all]);
}

export function deleteConversation(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id));
}

export function createNewConversation(): StoredConversation {
  return {
    id: crypto.randomUUID(),
    title: 'New skill',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    messages: [],
    selectedIntegrations: [],
    skill: null,
  };
}

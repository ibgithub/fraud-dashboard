import { createContext, useContext } from 'react';
import id from './id';
import en from './en';

export type LangKey = 'id' | 'en';
export type Messages = typeof id;

const resources: Record<LangKey, Messages> = { id, en };

// Get messages for a given language
export function getMessages(lang: LangKey): Messages {
  return resources[lang] || resources.id;
}

// Get stored language preference
export function getStoredLang(): LangKey {
  const stored = localStorage.getItem('app_lang');
  if (stored === 'en' || stored === 'id') return stored;
  return 'id'; // default Bahasa Indonesia
}

// Save language preference
export function setStoredLang(lang: LangKey) {
  localStorage.setItem('app_lang', lang);
}

// Context for language
export interface I18nContextType {
  lang: LangKey;
  t: Messages;
  setLang: (lang: LangKey) => void;
}

export const I18nContext = createContext<I18nContextType>({
  lang: 'id',
  t: id,
  setLang: () => {},
});

export function useI18n() {
  return useContext(I18nContext);
}

// Re-export resolveMessage for convenience
export { resolveMessage } from './messages';

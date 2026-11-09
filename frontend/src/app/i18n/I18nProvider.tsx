import { useState, type ReactNode } from 'react';
import { I18nContext, getMessages, getStoredLang, setStoredLang, type LangKey } from './index';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangKey>(getStoredLang());

  function setLang(newLang: LangKey) {
    setLangState(newLang);
    setStoredLang(newLang);
  }

  const t = getMessages(lang);

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

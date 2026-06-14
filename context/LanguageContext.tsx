import React, { createContext, useContext, useState } from "react";
import { fa, en, TranslationKey } from "../i18n/translations";

type Lang = "fa" | "en";

type LanguageContextType = {
  lang: Lang;
  isRTL: boolean;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "fa",
  isRTL: true,
  toggleLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("fa");

  const toggleLanguage = () => setLang((l) => (l === "fa" ? "en" : "fa"));

  const t = (key: TranslationKey) => (lang === "fa" ? fa[key] : en[key]);

  return (
    <LanguageContext.Provider value={{ lang, isRTL: lang === "fa", toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

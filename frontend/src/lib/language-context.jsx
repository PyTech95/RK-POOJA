import { createContext, useContext, useEffect, useState } from "react";
import { LANGUAGES, t as translate } from "./i18n";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("rk_lang") || "en");
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("rk_lang")) {
      setShowPicker(true);
    }
  }, []);

  const setLang = (code) => {
    localStorage.setItem("rk_lang", code);
    setLangState(code);
    setShowPicker(false);
  };

  const t = (key) => translate(lang, key);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, languages: LANGUAGES, showPicker, setShowPicker }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() { return useContext(LanguageContext); }

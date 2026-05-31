import { createContext, useContext, useEffect, useState } from "react";
import { LANGUAGES, t as translate } from "./i18n";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem("rk_lang") || "en");
  const [showPicker, setShowPicker] = useState(false);
  const [firstRun, setFirstRun] = useState(() => !localStorage.getItem("rk_onboarded"));

  const setLang = (code) => {
    localStorage.setItem("rk_lang", code);
    setLangState(code);
    setShowPicker(false);
  };

  const completeFirstRun = () => {
    localStorage.setItem("rk_onboarded", "1");
    if (!localStorage.getItem("rk_lang")) localStorage.setItem("rk_lang", lang);
    setFirstRun(false);
  };

  const t = (key) => translate(lang, key);

  return (
    <LanguageContext.Provider value={{
      lang, setLang, t, languages: LANGUAGES,
      showPicker, setShowPicker,
      firstRun, completeFirstRun,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() { return useContext(LanguageContext); }

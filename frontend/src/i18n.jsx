import { createContext, useContext, useState, useEffect } from 'react';

// Dictionaries
const translations = {
  en: {
    dashboard: "Dashboard",
    settings: "Settings",
    applications: "Applications",
    students: "Students",
    jobs: "Jobs",
    payments: "Payments",
    language: "Language",
    logout: "Logout",
    search: "Search...",
    totalRevenue: "Total Revenue"
  },
  es: {
    dashboard: "Tablero",
    settings: "Ajustes",
    applications: "Aplicaciones",
    students: "Estudiantes",
    jobs: "Trabajos",
    payments: "Pagos",
    language: "Idioma",
    logout: "Cerrar Sesión",
    search: "Buscar...",
    totalRevenue: "Ingresos Totales"
  },
  fr: {
    dashboard: "Tableau de Bord",
    settings: "Paramètres",
    applications: "Candidatures",
    students: "Étudiants",
    jobs: "Emplois",
    payments: "Paiements",
    language: "Langue",
    logout: "Se Déconnecter",
    search: "Recherche...",
    totalRevenue: "Revenu Total"
  },
  hi: {
    dashboard: "डैशबोर्ड",
    settings: "सेटिंग्स",
    applications: "आवेदन",
    students: "छात्र",
    jobs: "नौकरियां",
    payments: "भुगतान",
    language: "भाषा",
    logout: "लॉग आउट",
    search: "खोजें...",
    totalRevenue: "कुल आय"
  }
};

export const I18nContext = createContext();

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('app_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
  }, [language]);

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  };

  const t = (key) => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  return useContext(I18nContext);
};

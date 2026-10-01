// src/i18n.js

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import hi from "./locales/hi.json";
import mr from "./locales/mr.json";

const LANGUAGE_STORAGE_KEY = "shobhadamodar-language";

const getSavedLanguage = () => {
  try {
    const savedLanguage = localStorage.getItem(
      LANGUAGE_STORAGE_KEY,
    );

    // Only allow languages that actually exist in the app.
    if (["en", "hi", "mr"].includes(savedLanguage)) {
      return savedLanguage;
    }
  } catch {
    // Ignore localStorage errors and use English.
  }

  return "en";
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
    },

    lng: getSavedLanguage(),

    fallbackLng: "en",

    interpolation: {
      escapeValue: false,
    },
  });

/*
 * Persist the selected language locally.
 *
 * This is a device/browser preference and is intentionally
 * NOT stored in the database.
 */
i18n.on("languageChanged", (language) => {
  try {
    localStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      language.split("-")[0],
    );
  } catch {
    // Ignore localStorage errors.
  }
});

export default i18n;
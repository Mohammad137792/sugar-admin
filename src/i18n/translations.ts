export type TranslationKey =
  | "appName"
  | "appSubtitle"
  | "hero"
  | "heroSub"
  | "feat1Title"
  | "feat1Desc"
  | "feat2Title"
  | "feat2Desc"
  | "feat3Title"
  | "feat3Desc"
  | "aboutTitle"
  | "aboutText"
  | "aboutMission"
  | "navBtn1"
  | "navBtn2"
  | "langToggle";

type Translations = Record<TranslationKey, string>;

export const fa: Translations = {
  appName: "شوگر ادمین",
  appSubtitle: "دستیار هوشمند",
  hero: "مدیریت کسب‌وکار با هوش مصنوعی",
  heroSub: "با قدرت هوش مصنوعی، عملیات روزانه خود را ساده‌تر، سریع‌تر و هوشمندتر کنید.",
  feat1Title: "هوش مصنوعی پیشرفته",
  feat1Desc: "تحلیل داده‌های لحظه‌ای و پیش‌بینی هوشمند",
  feat2Title: "چندزبانه",
  feat2Desc: "پشتیبانی کامل از فارسی و انگلیسی",
  feat3Title: "مدیریت آسان",
  feat3Desc: "رابط کاربری ساده، سریع و کارآمد",
  aboutTitle: "درباره ما",
  aboutText:
    "شوگر ادمین یک پلتفرم مدیریت هوشمند است که با بهره‌گیری از آخرین فناوری‌های هوش مصنوعی، به کسب‌وکارها کمک می‌کند تا فرآیندهای خود را بهینه‌سازی کنند.",
  aboutMission:
    "ماموریت ما: ساده‌سازی مدیریت برای همه",
  navBtn1: "مدیریت محتوا",
  navBtn2: "گزارش‌ها و آمار",
  langToggle: "EN",
};

export const en: Translations = {
  appName: "Sugar Admin",
  appSubtitle: "AI Assistant",
  hero: "Business Management Powered by AI",
  heroSub:
    "Simplify, accelerate, and smarten your daily operations with the power of artificial intelligence.",
  feat1Title: "Advanced AI",
  feat1Desc: "Real-time data analysis and intelligent forecasting",
  feat2Title: "Multilingual",
  feat2Desc: "Full support for Persian and English",
  feat3Title: "Easy Management",
  feat3Desc: "Simple, fast, and efficient user interface",
  aboutTitle: "About Us",
  aboutText:
    "Sugar Admin is an intelligent management platform that leverages the latest AI technologies to help businesses optimize their processes.",
  aboutMission: "Our Mission: Simplify management for everyone",
  navBtn1: "Content Management",
  navBtn2: "Reports & Analytics",
  langToggle: "FA",
};

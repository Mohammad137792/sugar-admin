const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://api.sugar-admin.com/v1",
  AI_API_URL:   process.env.EXPO_PUBLIC_AI_URL  ?? "https://ai.sugar-admin.com/v1",
  APP_NAME:     "Sugar Admin",
  APP_VERSION:  "1.0.0",
} as const;

export default ENV;

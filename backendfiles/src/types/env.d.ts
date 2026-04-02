declare namespace NodeJS {
  interface ProcessEnv {
    JWT_SECRET: string;
    JWT_EXPIRES_IN?: string;
    DATABASE_URL: string;
    JWT_ACCESS_SECRET: string;
    ACCESS_TOKEN_EXP?: string;
    JWT_REFRESH_SECRET: string;
    REFRESH_TOKEN_EXP?: string;

    EMAIL_HOST: string;
    EMAIL_PORT?: string;
    EMAIL_USER: string;
    EMAIL_PASS: string;
    EMAIL_FROM: string;

    FRONTEND_URL?: string;
    PORT?: string;
    NODE_ENV?: "development" | "production" | "test";

    PAYPAL_CLIENT_ID?: string;
    PAYPAL_SECRET?: string;
    PAYPAL_MODE?: "sandbox" | "live";

    KHALTI_PUBLIC_KEY?: string;
    KHALTI_SECRET_KEY?: string;
    KHALTI_ENV: string;
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    JWT_SECRET: string;
    JWT_EXPIRES_IN?: string;
    DATABASE_URL: string;

    FRONTEND_URL?: string;
    PORT?: string;
    NODE_ENV?: "development" | "production" | "test";

    AWS_REGION?: string;
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    S3_BUCKET_NAME?: string;

    PAYPAL_CLIENT_ID?: string;
    PAYPAL_SECRET?: string;
    PAYPAL_MODE?: "sandbox" | "live";
  }
}

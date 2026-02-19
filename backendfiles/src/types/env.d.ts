declare namespace NodeJS {
  interface ProcessEnv {
    JWT_SECRET: string;
    JWT_EXPIRES_IN?: string;
    DATABASE_URL: string;
    JWT_ACCESS_SECRET: string;
    ACCESS_TOKEN_EXP?: string;
    JWT_REFRESH_SECRET: string;
    REFRESH_TOKEN_EXP?: string;



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

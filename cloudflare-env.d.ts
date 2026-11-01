declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    AULA_ACCOUNTS_JSON?: string;
    AULA_PASSWORD_PEPPER?: string;
    BUCKET?: R2Bucket;
  }
}

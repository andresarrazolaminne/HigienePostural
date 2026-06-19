/** URL base del backend (sin barra final). Vacio = mismo origen (nginx proxy). */
const fromEnv = import.meta.env.VITE_API_URL as string | undefined
export const API_BASE_URL = (
  fromEnv !== undefined && fromEnv !== ""
    ? fromEnv
    : import.meta.env.DEV
      ? "http://127.0.0.1:9081"
      : ""
).replace(/\/$/, "")
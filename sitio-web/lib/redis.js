import { Redis } from "@upstash/redis";

/**
 * Upstash Redis (gratuito): guarda el contenido editado, los suscriptores del
 * newsletter y el registro de pagos entregados. Si las variables de entorno
 * no están, la web funciona igual con el contenido por defecto.
 */
export const kv =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

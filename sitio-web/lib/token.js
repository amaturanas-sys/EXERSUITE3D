import crypto from "node:crypto";

/**
 * Tokens de descarga firmados (HMAC-SHA256) y caducables. El MISMO secreto
 * (DOWNLOAD_SECRET) se configura aquí y en el Space de Hugging Face que
 * entrega los archivos: Vercel firma, el Space verifica.
 * Formato: base64url("<payment_id>.<expira_epoch>") + "." + firma
 */
const SECRETO = () => {
  const s = process.env.DOWNLOAD_SECRET;
  if (!s) throw new Error("Falta DOWNLOAD_SECRET");
  return s;
};

export function crearTokenDescarga(paymentId, horas = 48) {
  const expira = Math.floor(Date.now() / 1000) + horas * 3600;
  const cuerpo = Buffer.from(`${paymentId}.${expira}`).toString("base64url");
  const firma = crypto.createHmac("sha256", SECRETO()).update(cuerpo).digest("base64url");
  return `${cuerpo}.${firma}`;
}

export function verificarTokenDescarga(token) {
  const [cuerpo, firma] = String(token).split(".");
  if (!cuerpo || !firma) return null;
  const esperada = crypto.createHmac("sha256", SECRETO()).update(cuerpo).digest("base64url");
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [paymentId, expira] = Buffer.from(cuerpo, "base64url").toString().split(".");
  if (Math.floor(Date.now() / 1000) > Number(expira)) return null;
  return { paymentId };
}

const DEV_LOCALHOST_ORIGIN = /^http:\/\/localhost:\d+$/;

// En producción, CORS_ORIGIN debe traer el/los dominio(s) reales separados por coma
// (ej. "https://wisp.example.com"). Sin configurar, cae al regex de localhost de
// desarrollo — nunca al revés, para no dejar un despliegue real abierto a cualquier
// origen por un env var olvidado.
export function resolveCorsOrigin(): string[] | RegExp {
  const configured = process.env.CORS_ORIGIN;
  if (!configured) return DEV_LOCALHOST_ORIGIN;

  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * OBSOLETO — este proxy es de la versión anterior, cuando no había cuotas.
 * Lo sustituye /api/ai/chat (netlify/functions/ai-chat.mts), que valida el tipo
 * de petición, compone los prompts en el servidor y aplica límites de gasto.
 *
 * Se deja respondiendo 410 en lugar de borrarlo para que ningún despliegue
 * antiguo siga exponiendo la API sin control. Puedes borrar este archivo.
 */
export default async () =>
  new Response(
    JSON.stringify({ error: { code: "gone", message: "Este endpoint ya no existe. Usa /api/ai/chat." } }),
    { status: 410, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );

export const config = { path: "/api/deepseek" };

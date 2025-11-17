/**
 * Date and Timestamp Utilities
 * 
 * Provides consistent date/time parsing and validation for the application.
 */

import { parse } from 'date-fns';

/**
 * ### 🕐 parseLocalDateTime
 * Converte uma string de data/hora (formato "YYYY-MM-DDTHH:mm") para timestamp UTC,
 * interpretando a data como hora LOCAL do usuário.
 * 
 * Exemplo: Se usuário está em GMT-3 e digita "2025-10-29T14:00",
 * isso representa 14:00 no horário local, que será convertido para UTC corretamente.
 * 
 * ### 🖥️ Parameters
 *   - `dateStr` (`string`): Data no formato "YYYY-MM-DD" (ex: "2025-10-29")
 *   - `timeStr` (`string`): Hora no formato "HH:mm" (ex: "14:30")
 * 
 * ### 🔄 Returns
 *   - `number`: Timestamp em milissegundos desde epoch (UTC)
 * 
 * ### 💡 Example
 * >>> parseLocalDateTime("2025-10-29", "14:00")
 * 1727546400000
 * 
 * ### 📚 Notes
 * - Usa date-fns parse() que respeita o timezone local do sistema
 * - Lança erro se a data/hora for inválida
 */
export function parseLocalDateTime(dateStr: string, timeStr: string): number {
  // Constrói string no formato ISO local: "YYYY-MM-DDTHH:mm"
  const localDateTimeStr = `${dateStr}T${timeStr}`;
  
  // Usa date-fns para parse, que respeita o timezone local do sistema
  const localDate = parse(localDateTimeStr, "yyyy-MM-dd'T'HH:mm", new Date());
  
  // Verifica se o parse foi bem-sucedido
  if (isNaN(localDate.getTime())) {
    throw new Error(`Invalid date/time: ${dateStr} ${timeStr}`);
  }
  
  // Retorna timestamp em UTC (milliseconds desde epoch)
  return localDate.getTime();
}

/**
 * ### ✅ validateTimestamp
 * Valida se um timestamp é um número válido e dentro de range razoável.
 * 
 * ### 🖥️ Parameters
 *   - `ts` (`unknown`): Valor a ser validado
 * 
 * ### 🔄 Returns
 *   - `boolean`: True se o timestamp é válido
 * 
 * ### 💡 Example
 * >>> validateTimestamp(1727546400000)
 * true
 * >>> validateTimestamp(NaN)
 * false
 * >>> validateTimestamp(-1)
 * false
 * 
 * ### 📚 Notes
 * - Timestamp não pode ser muito antigo (antes de 2000) ou muito futuro (depois de 2100)
 * - Retorna false para valores não numéricos ou inválidos
 */
export function validateTimestamp(ts: unknown): ts is number {
  if (typeof ts !== 'number') return false;
  if (!Number.isFinite(ts)) return false;
  if (ts < 0) return false;
  
  // Timestamp não pode ser muito antigo (antes de 2000) ou muito futuro (depois de 2100)
  const minTimestamp = new Date('2000-01-01').getTime();
  const maxTimestamp = new Date('2100-01-01').getTime();
  
  return ts >= minTimestamp && ts <= maxTimestamp;
}

/**
 * ### 🔧 normalizeTimestamp
 * Normaliza um timestamp, retornando um valor válido ou o timestamp atual como fallback.
 * 
 * ### 🖥️ Parameters
 *   - `ts` (`unknown`): Timestamp a ser normalizado
 *   - `fallback` (`number`, optional): Valor padrão se timestamp for inválido (default: Date.now())
 * 
 * ### 🔄 Returns
 *   - `number`: Timestamp válido
 * 
 * ### 💡 Example
 * >>> normalizeTimestamp(1727546400000)
 * 1727546400000
 * >>> normalizeTimestamp(NaN)
 * 1727546400000 (valor atual)
 * >>> normalizeTimestamp(null, 0)
 * 0
 */
export function normalizeTimestamp(ts: unknown, fallback: number = Date.now()): number {
  if (validateTimestamp(ts)) {
    return ts;
  }
  
  console.warn('[DateHelper] Invalid timestamp detected, using fallback:', ts);
  return fallback;
}


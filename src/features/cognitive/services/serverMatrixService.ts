/**
 * ### 🌐 Server Matrix Service
 *
 * Cliente HTTP para geração de matrizes via API do servidor.
 * Comunica com o endpoint /api/generate-matrix que usa Gemini 2.5 Pro.
 *
 * ### 📚 Notes
 * - API key do Gemini fica segura no servidor
 * - Timeout configurado para 30 segundos
 * - Retry logic em caso de falha temporária
 *
 * ### 🔄 Returns
 * - Funções para requisitar matrizes do servidor
 */

import type { ShapeDefinition } from '../types';

/**
 * ### 📦 MatrixResponse
 *
 * Estrutura de resposta da API de geração de matrizes
 */
export interface MatrixResponse {
  matrix: ShapeDefinition[];
  options: ShapeDefinition[];
  correctAnswerIndex: number;
  explanation: string;
  patterns: string[];
}

/**
 * ### 🔨 generateMatrixFromServer
 *
 * Requisita geração de uma matriz via API do servidor
 *
 * ### 🖥️ Parameters
 * - `difficulty` (`'normal' | 'difficult'`, optional): Nível de dificuldade. Default: 'normal'
 * - `timeout` (`number`, optional): Timeout em ms. Default: 30000
 *
 * ### 📚 Notes
 * - Lança erro se servidor estiver indisponível
 * - Lança erro se timeout for atingido
 * - Lança erro se resposta for inválida
 *
 * ### 🔄 Returns
 * - `Promise<MatrixResponse>`: Dados da matriz gerada
 *
 * ### 💡 Example
 * ```typescript
 * try {
 *   const matrix = await generateMatrixFromServer('normal');
 *   console.log('Matriz gerada:', matrix);
 * } catch (error) {
 *   console.error('Erro ao gerar matriz:', error);
 * }
 * ```
 */
export async function generateMatrixFromServer(
  difficulty: 'normal' | 'difficult' = 'normal',
  timeout: number = 30000
): Promise<MatrixResponse> {
  console.log('[🔎]: Requisitando matriz do servidor...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch('/api/generate-matrix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ difficulty }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}`
      }));
      throw new Error(errorData.error || `Erro do servidor: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error('Resposta inválida do servidor');
    }

    // Validate response structure
    const data = result.data;
    if (!data.matrix || !Array.isArray(data.matrix) || data.matrix.length !== 8) {
      throw new Error('Matriz inválida: deve ter exatamente 8 formas');
    }

    if (!data.options || !Array.isArray(data.options) || data.options.length !== 6) {
      throw new Error('Opções inválidas: deve ter exatamente 6 opções');
    }

    if (typeof data.correctAnswerIndex !== 'number' ||
        data.correctAnswerIndex < 0 ||
        data.correctAnswerIndex > 5) {
      throw new Error('Índice de resposta correta inválido');
    }

    console.log('[✅]: Matriz recebida do servidor');
    return data as MatrixResponse;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Timeout: servidor não respondeu em ${timeout / 1000}s`);
      }
      throw error;
    }

    throw new Error('Erro desconhecido ao gerar matriz');
  }
}

/**
 * ### 🔨 generateMatrixWithRetry
 *
 * Gera matriz com lógica de retry em caso de falha temporária
 *
 * ### 🖥️ Parameters
 * - `difficulty` (`'normal' | 'difficult'`, optional): Nível de dificuldade
 * - `maxRetries` (`number`, optional): Número máximo de tentativas. Default: 2
 * - `retryDelay` (`number`, optional): Delay entre tentativas em ms. Default: 1000
 *
 * ### 📚 Notes
 * - Útil para lidar com falhas temporárias de rede
 * - Cada retry aguarda um tempo crescente (retryDelay * tentativa)
 *
 * ### 🔄 Returns
 * - `Promise<MatrixResponse>`: Dados da matriz gerada
 *
 * ### 💡 Example
 * ```typescript
 * const matrix = await generateMatrixWithRetry('normal', 3);
 * ```
 */
export async function generateMatrixWithRetry(
  difficulty: 'normal' | 'difficult' = 'normal',
  maxRetries: number = 2,
  retryDelay: number = 1000
): Promise<MatrixResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateMatrixFromServer(difficulty);
    } catch (error) {
      lastError = error as Error;
      console.warn(`[⚠️]: Tentativa ${attempt + 1}/${maxRetries + 1} falhou:`, error);

      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        const delay = retryDelay * (attempt + 1);
        console.log(`[🔎]: Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Falha após ${maxRetries + 1} tentativas: ${lastError?.message || 'Erro desconhecido'}`
  );
}

/**
 * ### 🔨 checkServerHealth
 *
 * Verifica se o servidor de geração de matrizes está disponível
 *
 * ### 🔄 Returns
 * - `Promise<boolean>`: true se servidor está disponível, false caso contrário
 *
 * ### 💡 Example
 * ```typescript
 * const isAvailable = await checkServerHealth();
 * if (!isAvailable) {
 *   console.log('Servidor indisponível, usando modo offline');
 * }
 * ```
 */
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === 'ok' && data.hasApiKey === true;
  } catch (error) {
    console.warn('[⚠️]: Server health check failed:', error);
    return false;
  }
}




export const PRIMARY_AI_SERVICE_LABEL = 'serviço de IA remoto';
export const OFFLINE_MODE_LABEL = 'modo offline';
export const FALLBACK_DATASET_LABEL = 'conjunto cacheado de matrizes';

export const buildRemoteServiceUnavailableMessage = (context?: string): string => {
  const base = `O ${PRIMARY_AI_SERVICE_LABEL} não tá disponível${context ? ` ${context}` : ''}`.trim();
  return `${base}.`;
};

export const buildOfflineSuggestionMessage = (action: string): string =>
  `Ativa o ${OFFLINE_MODE_LABEL} pra ${action} com o ${FALLBACK_DATASET_LABEL}.`;

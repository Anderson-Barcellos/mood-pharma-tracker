import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { HeartRateRecord } from '../core/types';

interface CorrelationStats {
  analysisDate: string;
  metadata: {
    totalRecords: number;
    dateRange: string;
    avgHeartRate: number;
    avgMood: number;
  };
  correlations: {
    heartRate_mood?: {
      correlation: number;
      pValue: number;
      significance: string;
    };
    heartRate_sertraline?: {
      correlation: number;
      pValue: number;
      significance: string;
    };
    heartRate_lithium?: {
      correlation: number;
      pValue: number;
      significance: string;
    };
    mood_sertraline?: {
      correlation: number;
      pValue: number;
      significance: string;
    };
  };
  contextAnalysis: Array<{
    context: string;
    count: number;
    percentage: number;
    avgHeartRate: number;
  }>;
}

/**
 * Hook para carregar e processar dados de frequência cardíaca
 */
export function useHeartRateData() {
  const [isProcessing, setIsProcessing] = useState(false);

  // Query para carregar dados salvos de correlação
  const correlationQuery = useQuery({
    queryKey: ['heartRateCorrelations'],
    queryFn: async (): Promise<CorrelationStats | null> => {
      try {
        // Primeiro tenta carregar do arquivo JSON
        const response = await fetch('/data/health/heart-rate-correlations-analysis.json');
        if (response.ok) {
          return await response.json();
        }
        
        // Fallback para localStorage
        const stored = localStorage.getItem('heartRateCorrelationStats');
        if (stored) {
          return JSON.parse(stored);
        }
        
        return null;
      } catch (error) {
        console.error('Erro ao carregar dados de correlação:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
  });

  // Query para carregar dados brutos de FC
  const heartRateQuery = useQuery({
    queryKey: ['heartRateData'],
    queryFn: async (): Promise<HeartRateRecord[]> => {
      try {
        // Primeiro tenta carregar do localStorage (dados da página de importação)
        const storedHRData = localStorage.getItem('heartRateData');
        if (storedHRData) {
          const data = JSON.parse(storedHRData);
          if (Array.isArray(data) && data.length > 0) {
            console.log('💓 Loaded HR data from localStorage:', data.length, 'records');
            return data;
          }
        }
        
        // Tenta carregar dados resumidos do servidor
        const summaryResponse = await fetch('/data/health/heart-rate-summary.json');
        if (summaryResponse.ok) {
          const summary = await summaryResponse.json();
          if (summary.recentData && Array.isArray(summary.recentData)) {
            console.log('💓 Loaded HR data from summary:', summary.recentData.length, 'records');
            return summary.recentData;
          }
        }
        
        // Tenta carregar dados processados completos
        const response = await fetch('/data/health/processed-heart-rate-data.json');
        if (response.ok) {
          const data = await response.json();
          if (data.records && Array.isArray(data.records)) {
            // Mapeia os dados para o formato esperado
            return data.records.map((record: any) => ({
              id: record.id || `hr_${record.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: record.timestamp,
              heartRate: record.heartRate,
              context: record.context,
              source: 'samsung-health'
            }));
          }
        }
        
        // Fallback: tenta carregar dados do localStorage antigo
        const cached = localStorage.getItem('processedHeartRateData');
        if (cached) {
          const data = JSON.parse(cached);
          // Verifica se os dados são recentes (menos de 1 hora)
          if (data.timestamp && Date.now() - data.timestamp < 3600000) {
            return data.records;
          }
        }

        // Se não houver dados, retorna array vazio
        return [];
      } catch (error) {
        console.error('Erro ao carregar dados de FC:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  /**
   * Processa arquivos CSV de frequência cardíaca
   */
  const processCSVFiles = async (files: File[]): Promise<HeartRateRecord[]> => {
    setIsProcessing(true);
    const allRecords: HeartRateRecord[] = [];

    try {
      for (const file of files) {
        const content = await file.text();
        const records = parseHeartRateCSV(content, file.name);
        allRecords.push(...records);
      }

      // Ordena por timestamp
      allRecords.sort((a, b) => a.timestamp - b.timestamp);

      // Salva no localStorage
      localStorage.setItem('processedHeartRateData', JSON.stringify({
        timestamp: Date.now(),
        records: allRecords
      }));

      // Invalida e recarrega a query
      await heartRateQuery.refetch();

      return allRecords;
    } catch (error) {
      console.error('Erro ao processar arquivos CSV:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Parse de CSV do Samsung Health
   */
  const parseHeartRateCSV = (csvContent: string, fileName: string): HeartRateRecord[] => {
    const lines = csvContent.trim().split('\n');
    const records: HeartRateRecord[] = [];
    
    // Extrai data do nome do arquivo se possível
    const dateMatch = fileName.match(/(\d{4})\.(\d{2})\.(\d{2})/);
    const fileDate = dateMatch 
      ? new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]))
      : null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Samsung Health CSV format: "2025.06.24 00:00:29","","82","",""
      const parts = line.split(',').map(p => p.replace(/"/g, '').trim());
      
      if (parts.length >= 3) {
        const dateTimeStr = parts[0];
        const hrStr = parts[2];
        
        if (!dateTimeStr || !hrStr) continue;
        
        // Parse timestamp
        const [datePart, timePart] = dateTimeStr.split(' ');
        if (!datePart || !timePart) continue;
        
        const [year, month, day] = datePart.split('.').map(Number);
        const [hour, minute, second] = timePart.split(':').map(Number);
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) continue;
        
        const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
        const heartRate = parseInt(hrStr);
        
        if (heartRate > 0 && heartRate < 300) {
          // Determina contexto baseado na FC e horário
          let context: HeartRateRecord['context'] = 'resting';
          
          if ((hour >= 22 || hour <= 6) && heartRate < 70) {
            context = 'sleep';
          } else if (heartRate > 120) {
            context = 'exercise';
          } else if (heartRate > 100 || heartRate < 50) {
            context = 'stress';
          }
          
          records.push({
            id: `hr_${date.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: date.getTime(),
            heartRate,
            context,
            source: 'samsung-health',
            type: 'heart-rate',
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      }
    }
    
    return records;
  };

  /**
   * Calcula estatísticas de correlação
   */
  const calculateCorrelations = (
    heartRateData: HeartRateRecord[],
    moodData: any[],
    medicationData: any[]
  ) => {
    // Implementação simplificada - em produção seria mais complexa
    const stats = {
      totalRecords: heartRateData.length,
      avgHeartRate: heartRateData.reduce((sum, hr) => sum + hr.heartRate, 0) / heartRateData.length,
      contextDistribution: {} as Record<string, number>,
      timePatterns: {} as Record<string, any>
    };

    // Calcula distribuição por contexto
    heartRateData.forEach(hr => {
      if (hr.context) {
        stats.contextDistribution[hr.context] = (stats.contextDistribution[hr.context] || 0) + 1;
      }
    });

    return stats;
  };

  /**
   * Exporta dados para análise externa
   */
  const exportData = () => {
    const data = {
      heartRateData: heartRateQuery.data || [],
      correlations: correlationQuery.data,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heart-rate-analysis-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    heartRateData: heartRateQuery.data || [],
    correlationStats: correlationQuery.data,
    isLoading: heartRateQuery.isLoading || correlationQuery.isLoading,
    isProcessing,
    error: heartRateQuery.error || correlationQuery.error,
    processCSVFiles,
    calculateCorrelations,
    exportData,
    refetch: () => {
      heartRateQuery.refetch();
      correlationQuery.refetch();
    }
  };
}
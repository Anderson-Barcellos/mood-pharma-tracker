/**
 * Data Export Component
 *
 * Allows users to export current local data to JSON file for backup.
 * Data is automatically synced with server when doses/mood entries are added.
 */

import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from '@/shared/ui/glass-card';
import { exportLocalData } from '@/core/services/server-data-loader';
import { Download } from 'lucide-react';

export function DataExportImport() {
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /**
   * Export local data to JSON file
   */
  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);

    try {
      const data = await exportLocalData();

      // Create JSON blob
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Download file
      const link = document.createElement('a');
      link.href = url;
      link.download = `mood-pharma-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({
        type: 'success',
        text: `Dados exportados com sucesso! ${data.medications.length} medicações, ${data.doses.length} doses, ${data.moodEntries.length} registros de humor.`
      });
    } catch (error) {
      console.error('Export error:', error);
      setMessage({
        type: 'error',
        text: 'Erro ao exportar dados. Tente novamente.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <GlassCard variant="elevated" className="w-full">
      <GlassCardHeader>
        <GlassCardTitle>Backup de Dados</GlassCardTitle>
        <GlassCardDescription>
          Exporte seus dados para backup local
        </GlassCardDescription>
      </GlassCardHeader>

      <GlassCardContent>
        <div className="space-y-4">
          {/* Info box */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm">
            <p className="font-medium text-primary mb-1">✨ Sincronização Automática Ativa</p>
            <p className="text-neutral-11 text-xs">
              Suas doses e registros de humor são salvos automaticamente no servidor.
              Acesse de qualquer dispositivo sem precisar sincronizar manualmente!
            </p>
          </div>

          {/* Export button */}
          <Button
            onClick={handleExport}
            disabled={isExporting}
            variant="outline"
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar Backup JSON'}
          </Button>

          {/* Message feedback */}
          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-success-100 text-success-700 border border-success-600'
                  : 'bg-error-100 text-error-700 border border-error-600'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-neutral-10 space-y-2 pt-4 border-t border-neutral-6">
            <p className="font-semibold">Como funciona:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Sincronização automática:</strong> Ao adicionar/editar doses ou humor, os dados são salvos no servidor automaticamente em segundo plano</li>
              <li><strong>Multi-dispositivo:</strong> Abra o app em qualquer dispositivo e seus dados estarão lá</li>
              <li><strong>Backup manual:</strong> Use o botão "Exportar" para criar uma cópia local de segurança em formato JSON</li>
            </ul>
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}

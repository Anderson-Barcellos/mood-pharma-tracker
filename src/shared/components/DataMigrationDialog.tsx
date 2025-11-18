/**
 * Data Migration Dialog
 * 
 * UI component to help users migrate their data from IndexedDB to server.
 */

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { GlassCard } from '@/shared/ui/GlassCard';
import { GlassButton } from '@/shared/ui/GlassButton';
import { checkForMigrationData, migrateDataToServer, clearLocalData, type MigrationResult } from '@/core/services/data-migration';

export function DataMigrationDialog() {
  const [hasLocalData, setHasLocalData] = useState(false);
  const [dataCounts, setDataCounts] = useState({ medications: 0, doses: 0, moodEntries: 0, cognitiveTests: 0 });
  const [migrating, setMigrating] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  useEffect(() => {
    // Check if there's data to migrate
    checkForMigrationData().then(({ hasData, counts }) => {
      setHasLocalData(hasData);
      setDataCounts(counts);
    });
  }, []);

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const result = await migrateDataToServer();
      setMigrationResult(result);
      setMigrationComplete(true);
      
      if (result.success) {
        // Optionally clear local data after successful migration
        // Uncomment the line below to auto-clear:
        // await clearLocalData();
      }
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      setMigrating(false);
    }
  };

  const handleClearLocal = async () => {
    if (window.confirm('Tem certeza que deseja apagar os dados locais? Esta ação não pode ser desfeita!')) {
      await clearLocalData();
      setHasLocalData(false);
      setDataCounts({ medications: 0, doses: 0, moodEntries: 0, cognitiveTests: 0 });
    }
  };

  if (!hasLocalData) {
    return null;
  }

  return (
    <GlassCard className="p-6 mb-6">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              Migração de Dados Detectada
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              O sistema detectou dados armazenados localmente no navegador. 
              Para acessar seus dados de qualquer lugar, migre-os para o servidor.
            </p>
            
            <div className="bg-black/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-300 mb-2">Dados encontrados:</p>
              <ul className="text-sm space-y-1 text-gray-400">
                <li>• {dataCounts.medications} medicamentos</li>
                <li>• {dataCounts.doses} administrações</li>
                <li>• {dataCounts.moodEntries} registros de humor</li>
                <li>• {dataCounts.cognitiveTests} testes cognitivos</li>
              </ul>
            </div>

            {!migrationComplete && (
              <div className="flex gap-3">
                <GlassButton
                  onClick={handleMigrate}
                  disabled={migrating}
                  className="flex items-center gap-2"
                >
                  {migrating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Migrar para Servidor
                </GlassButton>
              </div>
            )}

            {migrationComplete && migrationResult && (
              <div className="mt-4">
                {migrationResult.success ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <p className="font-medium text-green-400">Migração concluída com sucesso!</p>
                    </div>
                    <div className="text-sm text-gray-300 space-y-1">
                      <p>• {migrationResult.medications.migrated} medicamentos migrados</p>
                      <p>• {migrationResult.doses.migrated} administrações migradas</p>
                      <p>• {migrationResult.moodEntries.migrated} registros de humor migrados</p>
                      <p>• {migrationResult.cognitiveTests.migrated} testes cognitivos migrados</p>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-green-500/20">
                      <p className="text-sm text-gray-300 mb-3">
                        Os dados foram migrados com sucesso para o servidor. 
                        Você pode opcionalmente limpar os dados locais do navegador.
                      </p>
                      <GlassButton
                        onClick={handleClearLocal}
                        variant="flat"
                        className="text-sm"
                      >
                        Limpar Dados Locais
                      </GlassButton>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <p className="font-medium text-red-400">Migração concluída com erros</p>
                    </div>
                    <div className="text-sm text-gray-300 space-y-1 mb-3">
                      <p>• {migrationResult.medications.migrated}/{migrationResult.medications.total} medicamentos</p>
                      <p>• {migrationResult.doses.migrated}/{migrationResult.doses.total} administrações</p>
                      <p>• {migrationResult.moodEntries.migrated}/{migrationResult.moodEntries.total} registros de humor</p>
                      <p>• {migrationResult.cognitiveTests.migrated}/{migrationResult.cognitiveTests.total} testes cognitivos</p>
                    </div>
                    
                    {migrationResult.errors.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-red-400 mb-2">Erros:</p>
                        <div className="bg-black/20 rounded p-2 max-h-32 overflow-y-auto">
                          {migrationResult.errors.slice(0, 5).map((error, idx) => (
                            <p key={idx} className="text-xs text-gray-400 mb-1">{error}</p>
                          ))}
                          {migrationResult.errors.length > 5 && (
                            <p className="text-xs text-gray-500">... e mais {migrationResult.errors.length - 5} erros</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <GlassButton
                        onClick={handleMigrate}
                        variant="flat"
                        className="text-sm"
                      >
                        Tentar Novamente
                      </GlassButton>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

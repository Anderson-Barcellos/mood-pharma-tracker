#!/usr/bin/env tsx
/**
 * Script para importar dados de teste diretamente via API
 */

import * as fs from 'fs';
import * as path from 'path';

async function importTestData() {
  try {
    console.log('📥 Importando dados de teste...\n');
    
    // Ler arquivo de dados de teste
    const testDataPath = path.join(process.cwd(), 'public/data/test-app-data.json');
    const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
    
    console.log('📊 Dados carregados:');
    console.log(`   • ${testData.medications.length} medicamentos`);
    console.log(`   • ${testData.doses.length} doses`);
    console.log(`   • ${testData.moodEntries.length} entradas de humor\n`);
    
    // Enviar para API backend
    const response = await fetch('http://localhost:3001/api/save-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Dados importados com sucesso!');
    console.log(`   Arquivo salvo em: ${result.filePath}\n`);
    
    // Também copiar para app-data.json
    const appDataPath = path.join(process.cwd(), 'public/data/app-data.json');
    fs.writeFileSync(appDataPath, JSON.stringify(testData, null, 2));
    console.log('✅ Dados copiados para app-data.json\n');
    
    console.log('🎯 Próximos passos:');
    console.log('   1. Acesse https://ultrassom.ai:8114/');
    console.log('   2. Os dados já devem estar carregados');
    console.log('   3. Vá para Analytics Dashboard para ver as correlações');
    
  } catch (error) {
    console.error('❌ Erro ao importar dados:', error);
    console.log('\n💡 Dica: Certifique-se que o servidor API está rodando:');
    console.log('   npm run dev:api');
  }
}

// Executar
importTestData();
# 🌱 Demo Data Seeding Guide

Este guia mostra como popular o banco de dados com dados de demonstração para testes.

## 📋 O que será criado

O script `seedCompleteDemo` cria:

- **💊 Medicamentos**: Antidepressivos, antipsicóticos, estabilizadores de humor, etc.
- **💉 Doses**: 2 doses por dia durante 30 dias
- **😊 Mood Entries**: 4 registros de humor por dia com padrões circadianos
- **❤️ Heart Rate Data**: 12 medições de frequência cardíaca por dia com:
  - Sono: 50-65 bpm (22:00-06:00)
  - Repouso: 65-80 bpm (durante o dia)
  - Exercício: 120-160 bpm (picos aleatórios)
  - Estresse: 85-100 bpm (horário comercial)

## 🚀 Como usar

### Método 1: Console do Navegador (Recomendado)

1. Abra a aplicação no navegador: http://127.0.0.1:8112/
2. Abra o Console do DevTools (F12 → Console)
3. Execute o comando:

```javascript
// Popular 30 dias de dados de demonstração
await window.seedCompleteDemo()

// OU com opções personalizadas:
await window.seedCompleteDemo({
  days: 30,              // Número de dias de dados
  dosesPerDay: 2,        // Doses por dia
  moodPerDay: 4,         // Entradas de humor por dia
  heartRatePerDay: 12,   // Medições de FC por dia
  clear: true            // Limpar dados existentes antes
})
```

### Método 2: Limpar todos os dados

Se precisar recomeçar do zero:

```javascript
await window.clearAllData()
```

## 📊 Verificando os dados

Após popular os dados, navegue para:

1. **Analytics** → Visualizar curvas de concentração de medicamentos
2. **Mood Tracking** → Ver entradas de humor
3. **Medications** → Ver medicamentos e doses registradas

## 🔬 Testando Correlações

Os dados de teste incluem correlações realistas entre:

- **Humor vs Concentração de Medicamento**: Correlação positiva esperada
- **Frequência Cardíaca vs Hora do Dia**: Padrão circadiano claro
- **Ansiedade vs FC em Repouso**: Correlação positiva
- **Energia vs FC**: Correlação moderada

Para ver as correlações:

1. Vá para **Analytics**
2. Selecione o período (últimos 30 dias)
3. Visualize os gráficos de correlação

## 📝 Notas

- Os dados são gerados com **padrões realistas** baseados em fisiologia
- **Variabilidade natural** é adicionada para simular dados reais
- A **frequência cardíaca** segue padrões de sono, exercício e estresse
- O **humor** segue ritmo circadiano com pico à tarde/noite

## 🐛 Troubleshooting

**Erro: "window.seedCompleteDemo is not a function"**
- Recarregue a página (F5) e tente novamente
- Certifique-se de que está rodando em modo desenvolvimento

**Dados não aparecem na UI**
- Aguarde alguns segundos após o seed
- Recarregue a página
- Verifique o console do navegador para erros

**Performance lenta**
- Reduza o número de dias: `days: 14`
- Reduza medições por dia: `heartRatePerDay: 6`

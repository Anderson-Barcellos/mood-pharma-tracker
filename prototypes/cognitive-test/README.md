# Gerador de Matrizes Lógicas - Ambiente de Testes

Ambiente standalone para testar e refinar prompts do Gemini Pro para geração de Matrizes Progressivas de Raven.

## 🎯 Objetivo

Este protótipo permite iterar rapidamente nos prompts enviados ao Gemini sem precisar modificar o projeto principal. Ideal para:

- Testar diferentes instruções e ver qualidade das matrizes geradas
- Validar padrões lógicos antes de integrar ao app
- Experimentar com níveis de dificuldade
- Depurar problemas de geração

## 📋 Pré-requisitos

1. **Chave da API do Google Gemini**
   - Acesse: https://aistudio.google.com/app/apikey
   - Crie um novo projeto (se necessário)
   - Gere uma nova API key
   - **Importante**: Guarde a chave em local seguro

2. **Servidor HTTP** (escolha um):
   - Python 3 (geralmente já instalado)
   - Node.js com `npx serve`
   - Extensão Live Server do VS Code

## 🚀 Como Usar

### Opção 1: Python (Recomendado)

```bash
cd /root/CODEX/mood-pharma-tracker/prototypes/cognitive-test
python3 -m http.server 8200
```

Acesse: `http://localhost:8200`

### Opção 2: npx serve

```bash
npx serve /root/CODEX/mood-pharma-tracker/prototypes/cognitive-test -p 8200
```

Acesse: `http://localhost:8200`

### Opção 3: VS Code Live Server

1. Abra `index.html` no VS Code
2. Clique direito > "Open with Live Server"
3. Acesse a URL mostrada no navegador

## 🔧 Configuração Inicial

1. **Abra a página** no navegador
2. **Cole sua API key** do Gemini no campo indicado
3. **Clique em "Salvar Chave"** - fica salva no localStorage do navegador
4. **Selecione a dificuldade** (Normal ou Difícil)
5. **Clique em "Gerar Nova Matriz"**

## ✏️ Editando os Prompts

Os prompts estão no arquivo `config.js`. Estrutura:

```javascript
const PROMPTS = {
  normal: {
    systemContext: "...",      // Contexto do sistema
    taskDescription: "...",     // Descrição da tarefa
    difficultyInstructions: "...",  // Instruções de dificuldade
    patternRules: "...",        // Regras de padrões
    outputFormat: "...",        // Formato de saída JSON
    importantNotes: "..."       // Notas críticas
  },
  difficult: {
    // Mesma estrutura para nível difícil
  }
};
```

### Workflow de Iteração:

1. **Edite `config.js`** com suas modificações de prompt
2. **Recarregue a página** no navegador (F5)
3. **Gere uma nova matriz** e avalie o resultado
4. **Analise**: A matriz faz sentido? Os padrões são claros?
5. **Repita** até estar satisfeito

### Exemplos de Modificações:

**Tornar padrões mais simples:**
```javascript
difficultyInstructions: `DIFFICULTY: Normal
- Use APENAS 1 padrão óbvio
- Evite rotações complexas
- Prefira progressões lineares`
```

**Melhorar qualidade dos distratores:**
```javascript
importantNotes: `...
✓ Cada distrator deve diferir da resposta correta por EXATAMENTE 1 propriedade
✓ Evite distratores aleatórios ou sem relação com o padrão
...`
```

## 🧪 Testando Resultados

Após gerar uma matriz:

1. **Tente resolver** antes de ver a explicação
2. **Verifique se é intuitivo** - outros conseguiriam resolver?
3. **Analise os distratores** - são plausíveis mas claramente errados?
4. **Leia a explicação** - está clara e completa?
5. **Confira os padrões** - correspondem ao que você viu visualmente?

### Critérios de Qualidade:

✅ **Boa Matriz:**
- Padrão visual imediatamente identificável
- Resposta correta é a única que completa o padrão
- Distratores são plausíveis mas violam alguma regra
- Explicação descreve todos os padrões usados

❌ **Matriz Ruim:**
- Padrão ambíguo ou inconsistente
- Múltiplas respostas parecem corretas
- Distratores aleatórios sem relação com padrão
- Explicação vaga ou incompleta

## 📊 Estrutura do JSON Retornado

```json
{
  "matrix": [
    // 8 shapes (células 0-7, falta célula 8)
    { "shape": "circle", "color": "#374151", "fill": "solid", "size": 0.6, "rotation": 0 },
    ...
  ],
  "options": [
    // 6 opções de resposta
    { "shape": "triangle", "color": "#374151", "fill": "solid", "size": 0.6, "rotation": 0 },
    ...
  ],
  "correctAnswerIndex": 2,  // Índice (0-5) da resposta correta
  "explanation": "Explicação em português...",
  "patterns": ["Padrão 1", "Padrão 2"]
}
```

### Propriedades Válidas:

- **shape**: `"circle"`, `"square"`, `"triangle"`, `"cross"`, `"diamond"`
- **color**: `"#374151"` (escuro), `"#9ca3af"` (médio), `"#f3f4f6"` (claro)
- **fill**: `"solid"`, `"outline"`, `"striped"`
- **size**: `0.4` (pequeno), `0.6` (médio), `0.8` (grande)
- **rotation**: `0`, `45`, `90`, `135`, `180`, `225`, `270`, `315` (graus)

## 🐛 Troubleshooting

### "Chave da API inválida"
- Verifique se copiou a chave completa
- Confirme que a key está ativa no Google AI Studio
- Tente gerar uma nova chave

### "Resposta inválida da API"
- Verifique sua conexão com internet
- Confira se o modelo `gemini-2.0-flash-exp` está disponível
- Veja o console do navegador (F12) para detalhes do erro

### Matriz gerada não faz sentido
- Edite `config.js` para ser mais específico nas instruções
- Adicione exemplos concretos no prompt
- Aumente restrições nos `importantNotes`

### Página não carrega
- Confirme que o servidor HTTP está rodando
- Verifique se a porta 8200 não está em uso: `lsof -i:8200`
- Tente outra porta: `python3 -m http.server 8201`

## 📝 Dicas de Refinamento

### Para Melhorar Clareza:
- Especifique "progressões lineares" ao invés de "padrões complexos"
- Dê exemplos concretos: "círculo → quadrado → triângulo"
- Use imperativos: "DEVE seguir X", "NUNCA use Y"

### Para Melhorar Distratores:
- Especifique estratégia: "1 distrator com shape errado, 1 com rotation errada, etc"
- Exija plausibilidade: "diferir por exatamente 1 propriedade"

### Para Melhorar Explicações:
- Peça formato estruturado: "Primeiro descreva padrão horizontal, depois vertical"
- Exija português claro: "Use linguagem simples e direta"
- Solicite exemplos: "Mostre como aplicar o padrão às primeiras células"

## 🔄 Integrando ao Projeto Principal

Quando estiver satisfeito com os prompts:

1. **Copie as seções relevantes** de `config.js`
2. **Cole em** `/src/pages/test-cognitive/config/prompts.ts` (ou equivalente no projeto React)
3. **Teste no ambiente de produção**
4. **Documente as mudanças** feitas

## 📖 Recursos Adicionais

- [Documentação Gemini API](https://ai.google.dev/docs)
- [Raven's Progressive Matrices (Wikipedia)](https://en.wikipedia.org/wiki/Raven%27s_Progressive_Matrices)
- [Psychometric Test Design](https://www.apa.org/science/programs/testing/standards)

---

**Autor**: Anders Barcellos
**Data**: Janeiro 2025
**Versão**: 1.0.0

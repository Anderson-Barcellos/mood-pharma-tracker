# Mood Logging UX - Quick Start Guide

Componentes modernos para rastreamento de humor com design glassmorphism, gestos touch e haptic feedback.

## Arquivos Criados

### Componentes (`/src/features/mood/components/`)

1. **QuickMoodButton.tsx** - Botão flutuante para registro rápido
   - Mobile: FAB com drawer
   - Desktop: Botão com dialog
   - Emoji dinâmico baseado no último humor

2. **MoodHistory.tsx** - Timeline com edição inline
   - Agrupamento por dia
   - Swipe-to-delete
   - Busca e filtros

3. **MoodTrends.tsx** - Widget de tendências 7 dias
   - Gráfico de barras
   - Indicadores de tendência
   - Estatísticas agregadas

### Página de Exemplo (`/src/features/mood/pages/`)

4. **EnhancedMoodPage.tsx** - Integração completa
   - Layout responsivo
   - Suspense boundaries
   - Loading skeletons

### Hooks (`/src/hooks/`)

5. **use-haptic.ts** - Feedback tátil para mobile
   - Impact styles (light/medium/heavy)
   - Notification styles (success/error/warning)
   - iOS + Android support

### Documentação

6. **README.md** - Documentação completa (`/src/features/mood/`)

---

## Uso Rápido

### 1. Importar e usar na sua página

```tsx
import QuickMoodButton from '@/features/mood/components/QuickMoodButton';
import MoodHistory from '@/features/mood/components/MoodHistory';
import MoodTrends from '@/features/mood/components/MoodTrends';

function MyMoodPage() {
  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* Header com botão de registro */}
      <div className="flex justify-between items-center">
        <h1>Meu Humor</h1>
        <QuickMoodButton />
      </div>

      {/* Widget de tendências */}
      <MoodTrends />

      {/* Timeline de histórico */}
      <MoodHistory />
    </div>
  );
}
```

### 2. Ou usar a página completa pronta

```tsx
import EnhancedMoodPage from '@/features/mood/pages/EnhancedMoodPage';

// No seu router
<Route path="/mood" element={<EnhancedMoodPage />} />
```

---

## Funcionalidades

### QuickMoodButton

- ✅ Click no botão abre formulário
- ✅ Slider de 0-10 com emoji reativo
- ✅ Campo opcional de notas
- ✅ Auto-salva no banco Dexie
- ✅ Feedback tátil em mobile
- ✅ Emoji muda baseado no último registro

**Mobile:**
- Botão circular fixo no canto inferior direito
- Drawer slide-up para o formulário

**Desktop:**
- Botão normal no header
- Dialog centralizado

### MoodHistory

- ✅ Agrupa registros por dia (Hoje, Ontem, data)
- ✅ Cards com gradiente baseado no humor
- ✅ Click no ícone de lápis = edição inline
- ✅ Swipe pra esquerda = revelar delete
- ✅ Confirmação antes de deletar
- ✅ Busca por notas
- ✅ Filtros: Todos, Hoje, Semana, Mês
- ✅ Mostra métricas extras (ansiedade, energia, foco)

**Gestos:**
- Swipe esquerdo: Exibe botão delete
- Click edit: Modo edição inline
- Click delete: Overlay de confirmação

### MoodTrends

- ✅ Gráfico de barras dos últimos 7 dias
- ✅ Indicador de tendência (subindo/descendo/estável)
- ✅ Média semanal com emoji
- ✅ Contagem de registros
- ✅ Faixas de humor com cores
- ✅ Barra destaca dia atual
- ✅ Tooltip ao passar mouse/touch

**Cores:**
- Verde: 9-10 (Excelente)
- Emerald: 7-8 (Muito Bom)
- Amber: 5-6 (Neutro)
- Orange: 3-4 (Ruim)
- Vermelho: 0-2 (Crítico)

---

## Haptic Feedback

Automaticamente integrado em todos os componentes:

```tsx
import { useHaptic } from '@/hooks/use-haptic';

const haptic = useHaptic();

// Ao clicar botão
haptic.impact('light');

// Ao salvar com sucesso
haptic.notification('success');

// Ao ocorrer erro
haptic.notification('error');

// Ao mudar slider
haptic.selection();
```

---

## Mobile Optimizações

### Touch Targets

Todos os alvos de toque são >= 48px:
- Botões: `min-h-[48px]`
- Ícones: 40px + padding
- FAB: 56px

### Responsive

Breakpoint: `768px`
- < 768px: Mobile (FAB, drawer, swipe)
- >= 768px: Desktop (button, dialog, click)

### Gestures

- Swipe: Framer Motion `drag="x"`
- Pull-to-refresh: Pode adicionar com `onRefresh`
- Haptic: Vibration API

---

## Estrutura de Dados

Os componentes usam o hook `useMoodEntries()` que retorna:

```typescript
interface MoodEntry {
  id: string;
  timestamp: number;
  moodScore: number;          // 0-10 obrigatório
  anxietyLevel?: number;      // 0-10 opcional
  energyLevel?: number;       // 0-10 opcional
  focusLevel?: number;        // 0-10 opcional
  notes?: string;
  createdAt: number;
}
```

---

## Customização

### Mudar cores

Edite os gradientes em cada componente:

```typescript
const getMoodGradient = (score: number) => {
  if (score >= 7) return 'from-blue-500/10 to-blue-500/5'; // Sua cor
  // ...
};
```

### Adicionar métricas extras

No formulário `QuickMoodButton.tsx`:

```tsx
const [stressLevel, setStressLevel] = useState(5);

// Adicione slider
<MoodSlider value={stressLevel} onChange={setStressLevel} label="Stress" />

// Inclua no submit
onSubmit({
  ...,
  stressLevel: stressLevel
})
```

### Mudar breakpoint mobile

```tsx
const MOBILE_BREAKPOINT = 1024; // Tablet também como mobile
const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
```

---

## Checklist de Integração

- [ ] Importar componentes na sua página
- [ ] Verificar `useMoodEntries` está funcionando
- [ ] Testar no mobile (Chrome DevTools)
- [ ] Testar swipe gestures
- [ ] Testar haptic (dispositivo real)
- [ ] Ajustar tema/cores se necessário
- [ ] Adicionar rotas no router
- [ ] Build de produção

---

## Próximos Passos (Opcional)

### Melhorias Futuras

1. **Pull-to-refresh** no MoodHistory
   ```tsx
   <div onTouchMove={handlePullRefresh}>
   ```

2. **Export de dados** (CSV/JSON)
   ```tsx
   const exportData = () => {
     const csv = moodEntries.map(e => `${e.timestamp},${e.moodScore}`).join('\n');
     download(csv, 'mood-data.csv');
   };
   ```

3. **Notificações push** (lembrar de registrar humor)
   ```tsx
   useEffect(() => {
     if (Notification.permission === 'granted') {
       scheduleReminder(18, 0); // 6PM
     }
   }, []);
   ```

4. **Gráfico avançado** com Recharts
   ```tsx
   <LineChart data={moodEntries}>
     <Line dataKey="moodScore" />
   </LineChart>
   ```

5. **Correlação com medicações**
   ```tsx
   // Mostrar doses tomadas no mesmo dia
   const dosesOnDay = doses.filter(d => isSameDay(d.timestamp, entry.timestamp));
   ```

---

## Troubleshooting

### Haptic não funciona

- Testar em dispositivo real (não emulador)
- Verificar permissões de vibração
- Android: Algumas ROMs desabilitam vibração em apps web

### Swipe não suave

- Remover `overflow-x: hidden` do parent
- Verificar conflitos com outros event handlers
- Aumentar `dragElastic` pra mais fluidez

### Componentes não renderizam

- Verificar imports corretos
- Checar se Dexie DB está inicializado
- Ver erros no console do navegador

---

## Suporte

Documentação completa: `/src/features/mood/README.md`

Estrutura de arquivos:
```
src/
├── features/mood/
│   ├── components/
│   │   ├── QuickMoodButton.tsx
│   │   ├── MoodHistory.tsx
│   │   └── MoodTrends.tsx
│   ├── pages/
│   │   └── EnhancedMoodPage.tsx
│   └── README.md
├── hooks/
│   └── use-haptic.ts
└── shared/
    └── types.ts (MoodEntry interface)
```

---

## Exemplos Adicionais

### Integrar no Dashboard

```tsx
function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <MoodTrends />
      {/* Outros widgets */}
    </div>
  );
}
```

### Usar apenas QuickMoodButton

```tsx
// Header global
function AppHeader() {
  return (
    <header>
      <Logo />
      <QuickMoodButton />
    </header>
  );
}
```

### Custom filtering

```tsx
// Mostrar apenas registros com notas
const entriesWithNotes = moodEntries.filter(e => e.notes);

// Últimos 3 dias
const recentEntries = moodEntries.filter(e =>
  e.timestamp >= Date.now() - 3 * 24 * 60 * 60 * 1000
);
```

---

Pronto! Componentes instalados e prontos pra uso. 🚀

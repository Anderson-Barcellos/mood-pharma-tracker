# Glassmorphism Components - Quick Start Guide

## Installation

Components já estão instalados e prontos para uso. Sem dependências adicionais necessárias.

## Importação

```tsx
// Opção 1: Import direto do arquivo
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from "@/shared/ui/glass-card"
import { GradientContainer } from "@/shared/ui/gradient-bg"

// Opção 2: Import do índice centralizado (recomendado)
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
  GradientContainer
} from "@/shared/ui"
```

## Uso Básico

### 1. Card Simples com Glass Effect

```tsx
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardContent } from "@/shared/ui"

function MyComponent() {
  return (
    <GlassCard>
      <GlassCardHeader>
        <GlassCardTitle>Meu Cartão</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <p>Conteúdo aqui...</p>
      </GlassCardContent>
    </GlassCard>
  )
}
```

### 2. Card com Glow Médico

```tsx
<GlassCard variant="elevated" glow="medical">
  <GlassCardHeader>
    <GlassCardTitle>Aderência Medicamentosa</GlassCardTitle>
  </GlassCardHeader>
  <GlassCardContent>
    <p>Taxa: 94%</p>
  </GlassCardContent>
</GlassCard>
```

### 3. Página com Background Gradiente

```tsx
import { GradientContainer, GlassCard } from "@/shared/ui"

function DashboardPage() {
  return (
    <GradientContainer
      preset="medical"
      meshOrbs
      orbCount={3}
      className="min-h-screen p-8"
    >
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-3">
        <GlassCard variant="elevated" glow="medical">
          <GlassCardContent>
            <p>Estatísticas</p>
          </GlassCardContent>
        </GlassCard>
        {/* Mais cards... */}
      </div>
    </GradientContainer>
  )
}
```

### 4. Sidebar com GlassPanel

```tsx
import { GlassPanel, GlassPanelHeader, GlassPanelContent } from "@/shared/ui"

function Sidebar() {
  return (
    <GlassPanel
      variant="sidebar"
      sticky="top"
      className="h-screen w-64"
    >
      <GlassPanelHeader>
        <h2 className="font-semibold">Menu</h2>
      </GlassPanelHeader>

      <GlassPanelContent>
        <nav className="space-y-2">
          <a href="#" className="block px-4 py-2 rounded-lg hover:bg-white/20">
            Dashboard
          </a>
          <a href="#" className="block px-4 py-2 rounded-lg hover:bg-white/20">
            Humor
          </a>
          <a href="#" className="block px-4 py-2 rounded-lg hover:bg-white/20">
            Medicamentos
          </a>
        </nav>
      </GlassPanelContent>
    </GlassPanel>
  )
}
```

## Props Principais

### GlassCard

```tsx
<GlassCard
  variant="default" | "elevated" | "interactive" | "subtle"
  glow="none" | "medical" | "mood" | "cognitive" | "warning"
  gradient={false}
  mobileOptimized={true}
>
```

### GradientContainer

```tsx
<GradientContainer
  preset="medical" | "mood" | "cognitive" | "analytics" | "neutral"
  animation="slow" | "medium" | "fast"
  meshOrbs={false}
  orbCount={3}
>
```

### GlassPanel

```tsx
<GlassPanel
  variant="default" | "navigation" | "sidebar" | "overlay"
  sticky="none" | "top" | "bottom"
  gradientBorder={false}
  innerGlow={false}
>
```

## Presets de Cores

Use o preset correto para cada tipo de conteúdo:

- **medical**: Azul/ciano - Para dados médicos, medicamentos
- **mood**: Roxo/rosa - Para rastreamento de humor
- **cognitive**: Verde/esmeralda - Para testes cognitivos
- **analytics**: Laranja/âmbar - Para análises e dashboards
- **neutral**: Cinza - Para conteúdo genérico

## Exemplos Práticos

### Rastreador de Humor

```tsx
<GradientContainer preset="mood" meshOrbs orbCount={4}>
  <GlassCard variant="elevated" glow="mood" gradient>
    <GlassCardHeader>
      <GlassCardTitle>Como você está hoje?</GlassCardTitle>
    </GlassCardHeader>
    <GlassCardContent>
      <div className="grid grid-cols-5 gap-2">
        {["😢", "😕", "😐", "🙂", "😊"].map(emoji => (
          <button className="aspect-square rounded-lg bg-white/20 text-3xl hover:bg-white/30">
            {emoji}
          </button>
        ))}
      </div>
    </GlassCardContent>
  </GlassCard>
</GradientContainer>
```

### Dashboard de Medicamentos

```tsx
<GradientContainer preset="medical" animation="slow">
  <div className="grid gap-6 md:grid-cols-3">
    <GlassCard variant="elevated" glow="medical">
      <GlassCardHeader>
        <GlassCardTitle>Tomados Hoje</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <p className="text-4xl font-bold">3/3</p>
      </GlassCardContent>
    </GlassCard>

    <GlassCard variant="elevated">
      <GlassCardHeader>
        <GlassCardTitle>Próxima Dose</GlassCardTitle>
      </GlassCardHeader>
      <GlassCardContent>
        <p>20:00 - Remédio X</p>
      </GlassCardContent>
    </GlassCard>
  </div>
</GradientContainer>
```

## Migração de Card Existente

Se você já tem código usando `<Card>`:

```tsx
// Antes
<Card>
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>

// Depois - Opção 1: Adicionar glass prop
<Card glass>
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>

// Depois - Opção 2: Usar GlassCard completo
<GlassCard variant="elevated" glow="medical">
  <GlassCardHeader>...</GlassCardHeader>
  <GlassCardContent>...</GlassCardContent>
</GlassCard>
```

## Performance Tips

1. **Use mobileOptimized** (já é padrão):
   ```tsx
   <GlassCard mobileOptimized />
   ```

2. **Limite mesh orbs**:
   ```tsx
   <GradientBackground meshOrbs orbCount={3} /> // Good
   <GradientBackground meshOrbs orbCount={5} /> // Evite
   ```

3. **Use animation="slow"** para melhor performance:
   ```tsx
   <GradientBackground animation="slow" />
   ```

4. **Não exagere nos glows**:
   ```tsx
   // Bom: 1-2 cards com glow por seção
   <GlassCard glow="medical" />
   <GlassCard /> // Sem glow
   <GlassCard /> // Sem glow

   // Ruim: Todos com glow
   <GlassCard glow="medical" />
   <GlassCard glow="medical" />
   <GlassCard glow="medical" />
   ```

## Próximos Passos

1. **Teste a demo page**: Navegue para `/glass-demo` (adicione a rota primeiro)
2. **Leia a documentação completa**: `src/shared/ui/glass-components.README.md`
3. **Veja os exemplos**: `src/shared/ui/glass-components.examples.tsx`
4. **Comece a usar**: Copie os exemplos acima e adapte para seu caso

## Troubleshooting

### Blur não aparece
- Verifique se seu navegador suporta `backdrop-filter`
- Teste em Chrome/Edge/Safari modernos

### Performance ruim no mobile
- Certifique-se que `mobileOptimized={true}` (padrão)
- Reduza número de mesh orbs
- Use `variant="subtle"` em vez de `elevated`

### Cores não aparecem corretamente
- Verifique se as variáveis CSS do Tailwind estão configuradas
- Teste o dark mode

## Recursos

- **README completo**: `/src/shared/ui/glass-components.README.md`
- **Exemplos**: `/src/shared/ui/glass-components.examples.tsx`
- **Demo page**: `/src/pages/glass-demo.tsx`
- **Sumário**: `/GLASSMORPHISM_IMPLEMENTATION_SUMMARY.md`

## Suporte

Para dúvidas, consulte os arquivos de documentação ou revisite os exemplos fornecidos.

---

**Bom trabalho, Anders! Os componentes estão prontos para uso no Mood & Pharma Tracker.**

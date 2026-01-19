# TrackGram - Sistema de Rastreamento para Telegram

**Última atualização**: Janeiro 2025  
**Versão do Sistema**: 4.1  
**Status**: Produção  
**Projeto Supabase**: TeleTrack (qwqgefuvxnlruiqcgsil)  
**Região Supabase**: us-west-2 (Oregon, EUA)  
**PostgreSQL**: 17.6.1

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Objetivo do Projeto](#objetivo-do-projeto)
3. [Arquitetura Geral](#arquitetura-geral)
4. [Stack Tecnológica](#stack-tecnológica)
5. [Estrutura de Pastas](#estrutura-de-pastas)
6. [Fluxos Principais](#fluxos-principais)
7. [Integração com Telegram](#integração-com-telegram)
8. [Bet Tracking System](#bet-tracking-system)
9. [Integração com Supabase](#integração-com-supabase)
10. [Banco de Dados](#banco-de-dados)
11. [Tracking e UTMs](#tracking-e-utms)
12. [Autenticação e Segurança](#autenticação-e-segurança)
13. [Sistema de Assinaturas](#sistema-de-assinaturas)
14. [Deploy e Ambientes](#deploy-e-ambientes)
15. [Variáveis de Ambiente](#variáveis-de-ambiente)
16. [Pontos de Atenção e Melhorias](#pontos-de-atenção-e-melhorias)

---

## Visão Geral

O **TrackGram** (também conhecido como **TeleTrack**) é um **SaaS (Software as a Service)** de rastreamento avançado que resolve a **"cegueira de dados"** em campanhas de anúncios para Telegram. O sistema atua como middleware entre o anúncio e o canal do Telegram, capturando parâmetros de rastreamento antes do redirecionamento, gerando links de convite únicos para cada visitante e utilizando um bot proprietário para detectar a entrada (join) no canal. Quando a entrada é confirmada, o sistema dispara um evento "Lead" via **Facebook Conversions API (CAPI)** com alta qualidade de correspondência (Event Match Quality - EMQ).

### Proposta de Valor

- **Atribuição Precisa**: Saiba exatamente qual anúncio gerou cada membro do canal
- **Otimização de ROI**: Alimente o algoritmo do Facebook com dados reais de conversão para baixar o custo por lead
- **Fluxo sem Fricção**: Redirecionamento direto para o canal de forma transparente para o usuário final
- **Multi-Pixel Support**: Envie eventos para múltiplos pixels simultaneamente
- **Domínios Personalizados**: Use seus próprios domínios para rastreamento
- **Dashboard Completo**: Métricas em tempo real, analytics avançado e gestão de leads

---

## Objetivo do Projeto

### Problema Resolvido

Anunciantes que utilizam o Telegram como canal de aquisição sofrem com a "cegueira de dados". As ferramentas tradicionais de analytics perdem o rastreamento no momento em que o usuário clica para abrir o aplicativo do Telegram, impedindo a atribuição correta de conversões e otimização de campanhas no Facebook Ads (Meta).

### Solução

O TrackGram captura os parâmetros de rastreamento (fbclid, fbc, fbp, user_agent, IP, geolocalização) **antes** do redirecionamento, gera links de convite únicos para cada visitante via Telegram Bot API e utiliza webhooks para detectar a entrada (join) no canal. Quando a entrada é confirmada, o sistema dispara um evento "Lead" via Facebook Conversions API (CAPI) com alta qualidade de correspondência.

---

## Arquitetura Geral

### Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Navegador)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Landing Page Externa (com tracking-script.js)          │   │
│  │  ou                                                      │   │
│  │  Página de Tracking: /t/{slug}                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APP (Vercel Serverless)              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API Routes:                                             │   │
│  │  - /api/track (PageView/Click events)                   │   │
│  │  - /api/invite (Gera link único Telegram)               │   │
│  │  - /api/webhook/telegram/[bot_id] (Recebe webhooks)     │   │
│  │  - /api/tracking-script.js (Script externo)              │   │
│  │  - /api/webhooks/cakto (Webhook assinaturas)            │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Server Actions:                                         │   │
│  │  - actions/funnels.ts                                    │   │
│  │  - actions/channels.ts                                   │   │
│  │  - actions/pixels.ts                                     │   │
│  │  - actions/domains.ts                                    │   │
│  │  - actions/messages.ts                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        ▼                                          ▼
┌──────────────────────┐              ┌──────────────────────┐
│   SUPABASE (PostgreSQL)             │   TELEGRAM BOT API    │
│  - Events (RLS)                     │  - createChatInviteLink│
│  - Funnels (RLS)                    │  - revokeChatInviteLink│
│  - Pixels (RLS)                     │  - Webhooks          │
│  - Visitor Links (RLS)              │  - chat_member       │
│  - CAPI Logs (RLS)                  │  - chat_join_request │
│  - Subscriptions (RLS)              │  - sendMessage       │
└──────────────────────┘              └──────────────────────┘
        │                                          │
        └────────────────────┬─────────────────────┘
                             ▼
                    ┌──────────────────────┐
                    │  FACEBOOK CAPI        │
                    │  (Conversions API)   │
                    │  v18.0               │
                    └──────────────────────┘
```

### Fluxo de Rastreamento Completo (v3.1+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              FLUXO DIRETO (SEM BOT INTERMEDIÁRIO) v3.1+ - CAPI              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Facebook Ads → Landing Page Externa (com tracking-script.js)
│     OU
│     Facebook Ads → Página de Tracking: /t/{slug}?fbclid=xyz
│                                                                             │
│  2. Página captura: fbclid, fbc, fbp, User-Agent, IP, Geo                  │
│     → Gera/recupera visitor_id (UUID)                                      │
│     → Salva evento "pageview" no Supabase                                  │
│     → Armazena: fbc, fbp, user_agent, ip_address, geo no metadata         │
│                                                                             │
│  3. Usuário clica em botão/link                                             │
│     → Salva evento "click" no Supabase                                     │
│     → Chama API /api/invite (POST) com metadata                            │
│                                                                             │
│  4. API /api/invite gera INVITE LINK ÚNICO                                 │
│     → Busca bot_token e chat_id do funil                                   │
│     → Chama Telegram API: createChatInviteLink                             │
│        - name: "v_{visitor_id}" (até 28 chars)                            │
│        - member_limit: 1 (se não usar join_request)                       │
│        - creates_join_request: true (se configurado)                       │
│        - expire_date: 24 horas                                             │
│     → Salva mapeamento em visitor_telegram_links                          │
│     → Retorna link único (ex: t.me/+AbCdEfGh...)                           │
│                                                                             │
│  5. Usuário é redirecionado DIRETO para t.me/+XXXXX (link único)           │
│     → Entra no canal/grupo SEM precisar falar com bot                      │
│                                                                             │
│  6. Telegram envia webhook para /api/webhook/telegram/{bot_id}             │
│     → Evento: chat_member (join) ou chat_join_request                      │
│     → Extrai invite_link.name: "v_{visitor_id}"                           │
│                                                                             │
│  7. Webhook Handler processa:                                               │
│     → Busca visitor_id na tabela visitor_telegram_links                    │
│     → Recupera metadata do evento "click" (fbc, fbp, user_agent, etc)     │
│     → Salva evento "join" no Supabase                                      │
│     → Busca pixels associados ao funil (multi-pixel support)              │
│     → Envia evento "Lead" para Facebook CAPI (todos os pixels)              │
│     → Salva log em capi_logs                                               │
│     → (Opcional) Envia mensagem de boas-vindas                            │
│     → (Opcional) Revoga link de convite após uso                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Vantagens do Fluxo Direto

- ✅ **UX Superior**: Usuário vai direto para o canal, sem etapa extra do bot
- ✅ **Maior Conversão**: Menos fricção = mais entradas
- ✅ **Links Únicos**: Cada visitante recebe um link exclusivo (uso único)
- ✅ **Atribuição Precisa**: Vinculação pelo nome do invite link
- ✅ **Fallback Robusto**: Se falhar, usa link estático como backup
- ✅ **Join Request Support**: Suporta canais que requerem aprovação

---

## Stack Tecnológica

### Frontend

- **Framework**: Next.js 16.0.8 (App Router)
- **React**: 19.2.1
- **TypeScript**: 5.x
- **Styling**:
  - Tailwind CSS 4
  - Shadcn/UI (componentes)
  - Radix UI (primitivos)
- **Gráficos**: Recharts 2.15.4
- **Formulários**: React Hook Form 7.68.0 + Zod 4.1.13
- **Notificações**: Sonner 2.0.7
- **Temas**: next-themes 0.4.6
- **Ícones**: Lucide React 0.556.0
- **Animações**: Framer Motion 12.23.26

### Backend

- **Runtime**: Node.js (Vercel Serverless Functions)
- **Banco de Dados**: Supabase (PostgreSQL 17.6.1)
- **Autenticação**: Supabase Auth (Email/Password)
- **ORM/Query**: Supabase Client (@supabase/ssr 0.8.0, @supabase/supabase-js 2.87.1)
- **Facebook SDK**: facebook-nodejs-business-sdk 24.0.1 (não utilizado diretamente, usa fetch)

### Integrações Externas

- **Telegram Bot API**: API REST direta (fetch) - v6.x
- **Facebook Conversions API**: API REST direta (fetch v18.0)
- **Facebook Pixel**: Client-side (fbevents.js injetado dinamicamente)
- **Pushcut API**: Notificações push para iOS
- **Cakto**: Gateway de pagamentos para assinaturas

### Deploy e Infraestrutura

- **Hospedagem**: Vercel
- **Região**: gru1 (São Paulo, Brasil)
- **CDN**: Vercel Edge Network
- **Database**: Supabase (us-west-2, Oregon, EUA)
- **Edge Runtime**: Next.js Middleware
- **Build**: Next.js Standalone Output

---

## Estrutura de Pastas

```
trackgram/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # Grupo de rotas protegidas
│   │   │   ├── layout.tsx           # Layout do dashboard (sidebar)
│   │   │   ├── page.tsx             # Dashboard principal
│   │   │   ├── leads/               # Gestão de Leads
│   │   │   │   └── page.tsx
│   │   │   ├── channels/            # Gerenciar bots Telegram
│   │   │   │   └── page.tsx
│   │   │   ├── pixels/              # Gerenciar pixels Facebook
│   │   │   │   └── page.tsx
│   │   │   ├── funnels/             # Criar funis de rastreamento
│   │   │   │   └── page.tsx
│   │   │   ├── domains/             # Domínios personalizados
│   │   │   │   └── page.tsx
│   │   │   ├── messages/            # Logs de mensagens Telegram
│   │   │   │   ├── page.tsx
│   │   │   │   └── messages-client.tsx
│   │   │   ├── logs/                # Logs de CAPI
│   │   │   │   └── page.tsx
│   │   │   ├── subscription/        # Gerenciar assinatura
│   │   │   │   └── page.tsx
│   │   │   ├── utms/                # Análise de UTMs
│   │   │   │   └── page.tsx
│   │   │   ├── integrations/        # Integrações (NOVO)
│   │   │   │   ├── pushcut/         # Configuração Pushcut
│   │   │   │   │   └── page.tsx
│   │   │   │   └── scripts/         # Scripts de tracking
│   │   │   │       └── page.tsx
│   │   │   └── postbacks/           # Postbacks (futuro)
│   │   │       └── page.tsx
│   │   ├── api/                     # API Routes
│   │   │   ├── track/               # Endpoint para eventos externos
│   │   │   │   └── route.ts
│   │   │   ├── invite/              # Gerar links de convite
│   │   │   │   └── route.ts
│   │   │   ├── bet/                 # Bet Tracking System (NOVO)
│   │   │   │   ├── identify/        # Identificar leads da bet
│   │   │   │   │   └── route.ts
│   │   │   │   └── webhook/         # Webhook de cadastro/depósito
│   │   │   │       └── route.ts
│   │   │   ├── webhook/
│   │   │   │   ├── telegram/
│   │   │   │   │   └── [bot_id]/
│   │   │   │   │       └── route.ts # Webhook handler Telegram
│   │   │   │   └── cakto/           # Webhook assinaturas (Cakto)
│   │   │   │       └── route.ts
│   │   │   └── tracking-script.js/  # Script para landing pages
│   │   │       └── route.ts
│   │   ├── auth/
│   │   │   └── callback/            # Callback OAuth Supabase
│   │   │       └── route.ts
│   │   ├── login/                   # Página de login
│   │   │   └── page.tsx
│   │   ├── t/                       # Páginas de tracking (públicas)
│   │   │   └── [slug]/
│   │   │       ├── page.tsx         # Server Component
│   │   │       ├── client-tracking.tsx # Client Component
│   │   │       └── loading.tsx
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Estilos globais
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx          # Sidebar antiga
│   │   │   ├── new-sidebar.tsx      # Sidebar nova
│   │   │   └── page-header.tsx      # Header de páginas
│   │   ├── dashboard/
│   │   │   ├── metric-card.tsx      # Card de métrica
│   │   │   ├── overview-chart.tsx   # Gráfico de overview
│   │   │   ├── retention-table.tsx  # Tabela de retenção
│   │   │   └── new/
│   │   │       ├── neon-card.tsx    # Card estilo neon
│   │   │       └── retention-row.tsx # Linha de retenção
│   │   ├── ui/                      # Componentes Shadcn/UI
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── chart.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── form.tsx
│   │   │   ├── label.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── trackgram-logo.tsx
│   │   ├── theme-provider.tsx       # Provider de tema
│   │   └── theme-toggle.tsx         # Toggle dark/light
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # Cliente browser
│   │   │   ├── server.ts            # Cliente server
│   │   │   └── middleware.ts        # Middleware de sessão
│   │   ├── facebook-capi.ts         # Função CAPI
│   │   ├── pushcut.ts               # Integração Pushcut (NOVO)
│   │   ├── telegram-service.ts      # Serviço Telegram
│   │   └── utils.ts                 # Utilitários
│   ├── services/                    # Serviços refatorados (NOVO)
│   │   └── telegram/
│   │       ├── join-handler.ts      # Handler de entradas
│   │       ├── message-handler.ts   # Handler de mensagens
│   │       ├── conversion-service.ts # Serviço de conversões CAPI
│   │       ├── attribution-service.ts # Atribuição visitor↔telegram
│   │       ├── welcome-service.ts   # Mensagens de boas-vindas
│   │       └── pushcut-service.ts   # Notificações Pushcut
│   ├── actions/                     # Server Actions
│   │   ├── channels.ts              # CRUD canais
│   │   ├── funnels.ts               # CRUD funis
│   │   ├── domains.ts               # CRUD domínios
│   │   ├── messages.ts              # Mensagens e welcome settings
│   │   ├── pushcut.ts               # Integrações Pushcut (NOVO)
│   │   └── telegram.ts              # Ações Telegram (webhook setup)
│   ├── hooks/
│   │   └── use-subscription.ts      # Hook de assinatura
│   ├── config/
│   │   └── subscription-plans.ts    # Configuração de planos
│   └── types/
│       └── facebook-sdk.d.ts        # Tipos Facebook SDK
├── scripts/                         # Scripts externos (NOVO)
│   ├── bet-tracker.js               # Script para bet (betlionpro)
│   └── betia-tracker.js             # Script para betia.io/codigo
├── documentation/                   # Documentação
│   ├── SISTEMA.md                   # Esta documentação
│   ├── BET_TRACKING.md              # Guia Bet Tracking (NOVO)
│   ├── TrackGram.md                 # Documentação geral
│   └── Meta CAPI Documentacao.md    # Docs CAPI
├── public/                          # Arquivos estáticos
├── .agent/                          # Regras do agente
├── next.config.ts                   # Config Next.js
├── vercel.json                      # Config Vercel
├── package.json                     # Dependências
└── tsconfig.json                    # Config TypeScript
```

---

## Fluxos Principais

### 1. Fluxo de Criação de Funil

```
1. Usuário acessa /funnels
2. Clica em "Novo Funil"
3. Sistema verifica:
   - Assinatura ativa
   - Limite de funis do plano
   - Domínio verificado (opcional, mas recomendado)
4. Preenche formulário:
   - Nome da campanha
   - Slug (opcional, auto-gerado se vazio)
   - Seleção de pixels (multi-seleção)
   - Seleção de bot/canal
5. Sistema cria:
   - Registro em funnels (com pixel_id primário legacy)
   - Registros em funnel_pixels (many-to-many)
6. Retorna link: /t/{slug}
```

### 2. Fluxo de Tracking (Página /t/[slug])

```
1. Visitante acessa /t/{slug}?fbclid=xyz&utm_source=facebook
   ↓
2. Server Component (page.tsx):
   - Busca funil pelo slug (Service Role para bypass RLS)
   - Captura headers: IP, User-Agent, Geo (Vercel)
   - Passa dados para Client Component
   ↓
3. Client Component (client-tracking.tsx):
   - Gera/recupera visitor_id (UUID - localStorage ou URL)
   - Captura parâmetros Facebook (fbclid, fbc, fbp)
   - Inicializa Facebook Pixel (se configurado)
   - Dispara PageView no Pixel (client-side)
   - Salva evento "pageview" no Supabase via /api/track
   ↓
4. Usuário clica em botão/link:
   - Chama /api/invite (POST) com metadata completa
   ↓
5. API /api/invite:
   - Salva evento "click" no Supabase
   - Gera link único via Telegram API
   - Salva mapeamento em visitor_telegram_links
   - Retorna invite_link único
   ↓
6. Client redireciona para t.me/+XXXXX
   - Exibe UI "Redirecionando" com spinner
   - Link manual como fallback
```

### 3. Fluxo de Webhook (Entrada no Canal)

```
1. Usuário entra no canal via link único
   ↓
2. Telegram envia webhook para /api/webhook/telegram/{bot_id}
   - Evento: chat_member (join) ou chat_join_request
   ↓
3. Webhook Handler processa:
   a. Detecta evento: chat_member (join) ou chat_join_request
   b. MÉTODO 1: Extrai invite_link.name: "v_{visitor_id}"
      - Busca visitor_id na tabela visitor_telegram_links
      - LIKE query: visitor_id LIKE 'abc123%'
   c. MÉTODO 2 (Fallback): Busca por telegram_user_id
      - Se já vinculado anteriormente
   d. MÉTODO 3 (Fallback): Busca click recente (10 min)
      - Último click sem join correspondente
   e. Recupera metadata do evento "click" (fbc, fbp, user_agent, etc)
   f. Salva evento "join" no Supabase
   g. Busca pixels do funil (legacy + multi-pixel)
   h. Envia CAPI "Lead" para todos os pixels (Promise.all)
   i. Salva log em capi_logs
   j. (Opcional) Envia mensagem de boas-vindas
   k. (Opcional) Revoga link de convite após uso
   ↓
4. Retorna 200 OK
```

### 4. Fluxo de Tracking Externo - Direct Link Mode (v4.1)

O script v4.1 (Instant Intercept) elimina a necessidade da página intermediária `/t/slug`, gerando o link diretamente na landing page com interceptação instantânea de clicks:

```
1. Landing page externa inclui:
   <script src="https://app.com/api/tracking-script.js?id={domain_id}"></script>
   OU
   <script src="https://app.com/api/tracking-script.js?funnel={slug}"></script>
   ↓
2. Script inicializa:
   - Gera/recupera visitor_id (localStorage)
   - Captura fbclid, fbc, fbp (URL/cookies)
   - Captura UTMs e Ads IDs (campaign_id, adset_id, ad_id)
   - Injeta Facebook Pixel (multi-pixel)
   - Envia evento PageView para /api/track
   ↓
3. Script detecta links do Telegram (t.me/*, telegram.me/*):
   - Configura click handlers
   - Chama /api/invite para gerar link único
   ↓
4. Ao receber resposta do /api/invite:
   - Substitui href de TODOS os links Telegram pelo link único
   - Marca links com data-trackgram-replaced="true"
   ↓
5. Usuário clica no link:
   A) Se link já foi substituído:
      → Navega direto para t.me/+XXXXX (link único)
   B) Se link NÃO foi substituído (click rápido):
      → Mostra UI de loading elegante com spinner
      → Aguarda link ser gerado
      → Redireciona automaticamente
      → Fallback: link manual "Clique aqui"
   ↓
6. Telegram recebe usuário via webhook
   - Atribuição normal via invite_link.name
```

**Vantagens do Direct Link Mode v4.1:**

- ✅ **Sem página intermediária**: Usuário vai direto do site para o Telegram
- ✅ **Menor fricção**: Menos etapas = maior conversão
- ✅ **Interceptação Instantânea**: Click handler com `capture: true` intercepta ANTES de qualquer outro handler
- ✅ **UI de Loading Elegante**: Modal com spinner e fallback manual após 3 segundos
- ✅ **Compatível com SPAs**: MutationObserver detecta links adicionados dinamicamente
- ✅ **Retrocompatível**: Ainda suporta /t/slug para links existentes
- ✅ **Multi-Pixel Injection**: Injeta automaticamente múltiplos pixels do Facebook configurados no domínio
- ✅ **Timeout Inteligente**: Se link não gerar em 10s, usa link original como fallback

### 5. Fluxo de Autenticação

```
1. Usuário acessa /login
2. Preenche email e senha
3. Sistema chama supabase.auth.signInWithPassword()
4. Supabase valida credenciais
5. Middleware atualiza sessão (cookies via @supabase/ssr)
6. Usuário é redirecionado para / (dashboard)
7. Dashboard verifica assinatura ativa
```

---

## Integração com Telegram

### Bot API Endpoints Utilizados

| Endpoint                 | Método | Uso                            |
| ------------------------ | ------ | ------------------------------ |
| `getMe`                  | GET    | Validar token do bot           |
| `getChat`                | GET    | Verificar conexão com canal    |
| `getChatMember`          | GET    | Verificar se bot é admin       |
| `getChatAdministrators`  | GET    | Listar admins do canal         |
| `getChatMemberCount`     | GET    | Contar membros                 |
| `createChatInviteLink`   | POST   | Gerar link único               |
| `revokeChatInviteLink`   | POST   | Revogar link após uso          |
| `setWebhook`             | POST   | Configurar webhook             |
| `getWebhookInfo`         | GET    | Verificar status webhook       |
| `deleteWebhook`          | POST   | Remover webhook                |
| `sendMessage`            | POST   | Enviar mensagens               |
| `approveChatJoinRequest` | POST   | Aprovar entrada (join request) |

### Configuração de Webhook

O webhook é configurado automaticamente quando o usuário clica em "Ativar Rastreamento" na página de Canais:

```typescript
// URL do webhook
const webhookUrl = `${NEXT_PUBLIC_APP_URL}/api/webhook/telegram/${bot_id}`;

// Configuração
await fetch(`https://api.telegram.org/bot${bot_token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: webhookUrl }),
});
```

### Tipos de Eventos Processados

1. **chat_member**: Entrada/saída de membros (FLUXO PRINCIPAL)

   - Detecta quando usuário entra (status: member/administrator/creator)
   - Detecta quando usuário sai (status: left/kicked)
   - Extrai `invite_link.name` para atribuição

2. **chat_join_request**: Solicitação de entrada (canais privados)

   - Quando canal requer aprovação
   - Processa conversão quando aprovado
   - Vincula visitor_id via invite_link.name

3. **message**: Mensagens privadas com o bot
   - Salva em `telegram_message_logs` se usuário trackeado
   - Comando `/start` (fluxo legacy de deep linking)

### Estratégias de Atribuição (Fallbacks)

O sistema usa 3 métodos em cascata para vincular `telegram_user_id` a `visitor_id`:

1. **Método 1 (Primário)**: Via `invite_link.name`

   - Formato: `v_{visitor_id}` (primeiros 28 chars)
   - Busca com LIKE query: `visitor_id LIKE 'abc123%'`
   - Mais preciso e confiável

2. **Método 2 (Fallback)**: Via `telegram_user_id` já vinculado

   - Se usuário já foi vinculado anteriormente
   - Busca registro mais recente em `visitor_telegram_links`

3. **Método 3 (Fallback Temporal)**: Via click recente
   - Busca últimos 10 minutos de eventos "click"
   - Filtra por funis do bot atual
   - Pega primeiro click sem join correspondente

---

## Bet Tracking System

### Visão Geral

O **Bet Tracking System** é uma extensão do TrackGram que permite rastrear leads que passam pelo funil completo: **Landing Page → Telegram → Bet (Casa de Apostas)**. O sistema identifica usuários na bet através do email e dispara eventos CAPI para Facebook quando ocorrem cadastros e depósitos.

### Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE BET TRACKING (FUNIL COMPLETO)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Facebook Ads → Landing Page (TrackGram captura vid, fbc, fbp)          │
│     ↓                                                                       │
│  2. Landing Page → /t/slug → Telegram                                       │
│     ↓                                                                       │
│  3. Canal Telegram → betia.io/codigo/ (Script betia-tracker.js)            │
│     - Lê localStorage com dados de tracking                                │
│     - Decora link para bet com parâmetros: ?vid=x&fbc=y&fbp=z              │
│     ↓                                                                       │
│  4. betia.io → betlionpro.com (Script bet-tracker.js)                      │
│     - Lê parâmetros da URL                                                 │
│     - Salva no localStorage do domínio da bet                              │
│     - No cadastro: POST /api/bet/identify (email + tracking data)          │
│     ↓                                                                       │
│  5. Webhook da Bet (N8N) → /api/bet/webhook                                │
│     - Cadastro: { email, phone }                                           │
│     - Depósito: { email, phone, valor, status: "PAID" }                    │
│     ↓                                                                       │
│  6. TrackGram faz match email ↔ visitor_id                                 │
│     - Busca na tabela bet_leads (ou bet_leads_lucasmagnotti, etc)          │
│     - Recupera fbc, fbp, geo para envio CAPI                               │
│     ↓                                                                       │
│  7. Dispara CAPI para Facebook                                              │
│     - Cadastro: Evento "Cadastrou_bet"                                      │
│     - Depósito: Evento "Purchase" (com valor)                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### APIs do Bet Tracking

#### POST `/api/bet/identify`

Identifica um lead da bet, vinculando email aos dados de tracking.

**Request Body:**

```json
{
  "email": "usuario@email.com",
  "phone": "11999999999",
  "visitor_id": "abc123-def456",
  "fbc": "fb.1.123456.xxxx",
  "fbp": "fb.1.123456.yyyy",
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "campanha1",
  "ip_address": "189.123.45.67",
  "user_agent": "Mozilla/5.0...",
  "city": "São Paulo",
  "state": "SP",
  "country": "BR",
  "postal_code": "01310-100",
  "funnel_id": "lucasmagnotti"
}
```

**Comportamento:**

- Se `funnel_id` = `"lucasmagnotti"` → Salva em `bet_leads_lucasmagnotti`
- Se `funnel_id` = `"pedrozutti"` → Salva em `bet_leads_pedrozutti`
- Outros/genérico → Salva em `bet_leads`

#### POST `/api/bet/webhook`

Recebe webhooks da bet (cadastro/depósito) e dispara CAPI.

**Request Body (Cadastro):**

```json
{
  "email": "usuario@email.com",
  "phone": "11999999999"
}
```

**Request Body (Depósito):**

```json
{
  "email": "usuario@email.com",
  "phone": "11999999999",
  "valor": 100.0,
  "status": "PAID",
  "currency": "BRL"
}
```

**Eventos CAPI:**

- **Cadastro**: `Cadastrou_bet` (evento customizado)
- **Depósito**: `Purchase` (evento padrão com valor)

### Tabelas do Bet Tracking

#### `bet_leads` (Genérica)

Armazena leads da bet para match email ↔ tracking data.

| Coluna          | Tipo        | Descrição            | Constraints         |
| --------------- | ----------- | -------------------- | ------------------- |
| `id`            | UUID        | ID único             | PK                  |
| `email`         | TEXT        | Email do lead        | NOT NULL, UNIQUE    |
| `phone`         | TEXT        | Telefone             | Nullable            |
| `visitor_id`    | TEXT        | ID do visitante      | Nullable            |
| `fbc`           | TEXT        | Facebook Click ID    | Nullable            |
| `fbp`           | TEXT        | Facebook Browser ID  | Nullable            |
| `utm_source`    | TEXT        | UTM Source           | Nullable            |
| `utm_medium`    | TEXT        | UTM Medium           | Nullable            |
| `utm_campaign`  | TEXT        | UTM Campaign         | Nullable            |
| `utm_content`   | TEXT        | UTM Content          | Nullable            |
| `utm_term`      | TEXT        | UTM Term             | Nullable            |
| `ip_address`    | TEXT        | IP do usuário        | Nullable            |
| `user_agent`    | TEXT        | User Agent           | Nullable            |
| `city`          | TEXT        | Cidade (geo)         | Nullable            |
| `state`         | TEXT        | Estado (geo)         | Nullable            |
| `country`       | TEXT        | País (geo)           | Nullable            |
| `postal_code`   | TEXT        | CEP (geo)            | Nullable            |
| `status`        | TEXT        | registered/deposited | Default: registered |
| `deposit_value` | NUMERIC     | Valor do depósito    | Nullable            |
| `deposit_at`    | TIMESTAMPTZ | Data do depósito     | Nullable            |
| `created_at`    | TIMESTAMPTZ | Data de criação      | Default: now()      |
| `updated_at`    | TIMESTAMPTZ | Data de atualização  | Default: now()      |

#### `bet_leads_lucasmagnotti`

Tabela dedicada para o funil **Lucas Magnotti** (mesma estrutura de `bet_leads`).

**Pixel Config**:
- Pixel ID: `1254338099849797`
- Access Token: Configurado no código

**RLS**: ✅ Habilitado

#### `bet_leads_pedrozutti`

Tabela dedicada para o funil **Pedro Zutti** (mesma estrutura de `bet_leads`).

**Pixel Config**:
- Pixel ID: `1217675423556541`
- Access Token: Configurado no código

**RLS**: ❌ Desabilitado (tabela pública para webhooks externos)

### Scripts do Bet Tracking

#### `scripts/betia-tracker.js`

Instalado em **betia.io/codigo/** - Decora links para a bet com parâmetros de tracking (`vid`, `fbc`, `fbp`).

#### `scripts/bet-tracker.js`

Instalado na **bet (betlionpro.com)** - Captura parâmetros da URL, salva no localStorage e envia para `/api/bet/identify` no cadastro.

### Matching Robusto no Bet Tracking

O sistema `/api/bet/identify` implementa matching inteligente quando `visitor_id` não é fornecido:

1. **Match por IP** (Prioridade Alta): Busca eventos recentes (24h) com mesmo IP
2. **Match Fuzzy por User-Agent** (Fallback): Compara OS, versão e dispositivo dos últimos 50 eventos (1h)
3. **Match Direto**: Se `visitor_id` vier na URL, usa diretamente

### Geolocalização no Bet Tracking

O sistema captura geolocalização de múltiplas fontes:

1. **Do evento original** (se houver match): Usa dados do evento de tracking
2. **Headers Vercel** (Fallback): Usa `x-vercel-ip-city`, `x-vercel-ip-country-region`, etc.
3. **Dados salvos no lead**: Armazena `city`, `state`, `country`, `postal_code` para CAPI

### Roteamento de Funis no Bet Tracking

O sistema roteia leads para tabelas específicas baseado no `funnel_id`:

- `funnel_id = "pedrozutti"` → `bet_leads_pedrozutti` + Pixel Pedro
- `funnel_id = "lucasmagnotti"` ou `"lucas"` → `bet_leads_lucasmagnotti` + Pixel Lucas
- Outros/desconhecidos → `bet_leads` (sem envio CAPI para evitar poluição)

**Importante**: Apenas funis conhecidos (Lucas e Pedro) enviam eventos CAPI. Afiliados desconhecidos são salvos mas não disparam CAPI.

### Vantagens do Sistema

- ✅ **Atribuição Completa**: Rastreia desde o anúncio até o depósito
- ✅ **CAPI com Geolocalização**: Envia dados de geo para melhor match quality
- ✅ **Funis Isolados**: Cada afiliado tem sua tabela dedicada (evita poluição de dados)
- ✅ **Evento Purchase com Valor**: Facebook recebe o valor exato do depósito

---

## Integração com Supabase

### Clientes Supabase

#### 1. Browser Client (`lib/supabase/client.ts`)

- **Uso**: Componentes client-side (React)
- **Implementação**: `createBrowserClient` do `@supabase/ssr`
- **Configuração**:
  - Cookies com maxAge de 1 ano
  - Domínio personalizado opcional (`NEXT_PUBLIC_COOKIE_DOMAIN`)
  - Secure em produção (`NODE_ENV === 'production'`)

#### 2. Server Client (`lib/supabase/server.ts`)

- **Uso**: Server Components e Server Actions
- **Implementação**: `createServerClient` do `@supabase/ssr`
- **Integração**: Usa `cookies()` do Next.js para ler/gravar cookies
- **Tratamento de Erros**: Ignora erros de `setAll` em Server Components (comportamento normal)

#### 3. Middleware Client (`lib/supabase/middleware.ts`)

- **Uso**: Middleware do Next.js
- **Funcionalidade**: Atualiza sessão e retorna usuário autenticado
- **Retorno**: `{ response: NextResponse, user: User | null }`

#### 4. Service Role Client

- **Uso**: API Routes que precisam bypass RLS
- **Criação**: Inline com `createClient(url, SERVICE_ROLE_KEY)`
- **Locais de Uso**:
  - `/api/track` - Eventos públicos
  - `/api/invite` - Geração de links
  - `/api/webhook/telegram` - Webhooks externos
  - `/t/[slug]/page.tsx` - Buscar funil público
  - `/api/webhooks/cakto` - Webhook assinaturas

### Middleware de Autenticação

O middleware (`src/middleware.ts`) protege rotas autenticadas:

```typescript
// Rotas protegidas
const protectedRoutes = [
  "/channels",
  "/domains",
  "/funnels",
  "/logs",
  "/messages",
  "/pixels",
  "/postbacks",
  "/subscription",
  "/utms",
  "/dashboard",
  "/a1c909fe301e7082", // Rota especial (possivelmente para integração)
  "/", // Root também protegido
];

// Se não autenticado, redireciona para /login
```

**Rotas Públicas**:

- `/login` - Página de login
- `/t/*` - Páginas de tracking
- `/api/*` - API routes (gerenciadas individualmente)
- `/auth/callback` - Callback OAuth Supabase
- `/auth/reset-password` - Reset de senha
- `/quiz` - Página de quiz (pública)
- `/landing-preview` - Preview de landing page

**Matcher Pattern**:
```
/((?!_next/static|_next/image|favicon.ico|login|t/|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)
```

Este pattern exclui arquivos estáticos, rotas de API, login e tracking pages do middleware.

---

## Migrações do Banco de Dados

### Migrações Existentes

#### `20251219_create_pushcut_tables.sql`

**Data**: 19 de Dezembro de 2025

**Descrição**: Criação das tabelas de integração Pushcut

**Tabelas Criadas**:
- `pushcut_integrations`
- `pushcut_notifications`
- `pushcut_logs`

**Funcionalidades**:
- RLS habilitado em todas as tabelas
- Policies para isolamento por usuário
- Triggers para `updated_at` automático
- Índices para performance

#### `20251229_add_unique_metrics.sql`

**Data**: 29 de Dezembro de 2025

**Descrição**: Atualização da função `get_dashboard_metrics` para incluir métricas únicas

**Mudanças**:
- Adiciona `unique_pageviews` (COUNT DISTINCT visitor_id WHERE event_type = 'pageview')
- Adiciona `unique_joins` (COUNT DISTINCT visitor_id WHERE event_type IN ('join', 'lead'))
- Adiciona `unique_leaves` (COUNT DISTINCT visitor_id WHERE event_type = 'leave')
- Mantém compatibilidade com versão anterior

**Timezone**: Configurado para `America/Sao_Paulo` na agregação diária

---

## Estrutura de Arquivos Adicionais

### Scripts Externos

#### `scripts/bet-tracker.js`
Script para instalação na bet (betlionpro.com) - Captura parâmetros da URL e envia para `/api/bet/identify`

#### `scripts/betia-tracker.js`
Script para instalação em betia.io/codigo/ - Decora links para a bet com parâmetros de tracking

#### `scripts/html betia.io.html`
HTML de exemplo para integração do script betia-tracker

### Arquivos de Configuração

#### `components.json`
Configuração do Shadcn/UI para geração de componentes

#### `postcss.config.mjs`
Configuração do PostCSS para Tailwind CSS 4

#### `eslint.config.mjs`
Configuração do ESLint para Next.js 16

#### `pushcut.yaml`
Possível configuração para integração Pushcut (não utilizado atualmente)

### Documentação Adicional

#### `documentation/BET_TRACKING.md`
Documentação específica do sistema de Bet Tracking

#### `documentation/TrackGram.md`
Documentação geral do TrackGram

#### `documentation/Meta CAPI Documentacao.md`
Documentação sobre a API de Conversões do Facebook

#### `instrucoes.md`
Instruções gerais do projeto

#### `webhooks.md`
Documentação sobre webhooks

#### `pesquisa_telegram_api.md`
Pesquisa sobre a API do Telegram

---

### Row Level Security (RLS)

Todas as tabelas principais têm RLS habilitado com políticas específicas:

**Padrão de Política**:

```sql
-- SELECT: Usuários veem apenas seus próprios registros
CREATE POLICY "Users can view own X" ON table_name
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: Usuários só podem inserir com seu próprio user_id
CREATE POLICY "Users can insert own X" ON table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Usuários só podem atualizar seus próprios registros
CREATE POLICY "Users can update own X" ON table_name
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: Usuários só podem deletar seus próprios registros
CREATE POLICY "Users can delete own X" ON table_name
  FOR DELETE USING (auth.uid() = user_id);
```

**Exceções**:

- **Tabela `events`**: Permite leitura pública para eventos sem `funnel_id` (tracking externo via script)
- **Tabela `funnels`**: Permite leitura pública para buscar por `slug` (página de tracking)

### Service Role Key

A `SUPABASE_SERVICE_ROLE_KEY` é usada apenas em:

- API Routes (server-side)
- Operações que precisam bypass RLS (ex: buscar funil público)

**⚠️ IMPORTANTE**: Nunca exponha a Service Role Key no client-side!

---

## Banco de Dados

### Modelo de Dados Completo

#### 1. `profiles`

Perfis de usuários (espelha `auth.users`).

| Coluna       | Tipo        | Descrição       | Constraints            |
| ------------ | ----------- | --------------- | ---------------------- |
| `id`         | UUID        | ID do usuário   | PK, FK → auth.users.id |
| `email`      | TEXT        | Email           | Nullable               |
| `full_name`  | TEXT        | Nome completo   | Nullable               |
| `avatar_url` | TEXT        | URL do avatar   | Nullable               |
| `created_at` | TIMESTAMPTZ | Data de criação | Default: now()         |

**RLS**: ✅ Habilitado - Usuários só veem/editam seu próprio perfil

**Trigger**: `handle_new_user` - Cria perfil automaticamente quando usuário é criado em `auth.users`

---

#### 2. `pixels`

Configurações de pixels do Facebook.

| Coluna         | Tipo        | Descrição            | Constraints                     |
| -------------- | ----------- | -------------------- | ------------------------------- |
| `id`           | UUID        | ID único             | PK, Default: uuid_generate_v4() |
| `user_id`      | UUID        | Usuário              | FK → profiles.id, NOT NULL      |
| `name`         | TEXT        | Nome identificador   | NOT NULL                        |
| `pixel_id`     | TEXT        | ID do Pixel Facebook | NOT NULL                        |
| `access_token` | TEXT        | Token CAPI           | NOT NULL                        |
| `created_at`   | TIMESTAMPTZ | Data de criação      | Default: now()                  |

**RLS**: ✅ Habilitado - Usuários só veem/editam seus próprios pixels

**Índices**:

- `idx_pixels_user_id` (user_id)

**Relacionamentos**:

- Um pixel pode estar em múltiplos funis (via `funnel_pixels`)
- Um pixel pode estar em múltiplos domínios (via `domain_pixels`)

---

#### 3. `telegram_bots`

Bots do Telegram configurados.

| Coluna         | Tipo        | Descrição                 | Constraints                     |
| -------------- | ----------- | ------------------------- | ------------------------------- |
| `id`           | UUID        | ID único                  | PK, Default: uuid_generate_v4() |
| `user_id`      | UUID        | Usuário                   | FK → profiles.id, NOT NULL      |
| `name`         | TEXT        | Nome identificador        | NOT NULL                        |
| `bot_token`    | TEXT        | Token do bot (BotFather)  | NOT NULL                        |
| `username`     | TEXT        | Username do bot           | Nullable                        |
| `channel_link` | TEXT        | Link de convite do canal  | Nullable                        |
| `chat_id`      | TEXT        | ID numérico do chat/canal | Nullable                        |
| `created_at`   | TIMESTAMPTZ | Data de criação           | Default: now()                  |

**RLS**: ✅ Habilitado - Usuários só veem/editam seus próprios bots

**Índices**:

- `idx_telegram_bots_user_id` (user_id)
- `idx_telegram_bots_bot_token` (bot_token) - Para busca rápida em webhooks

**Relacionamentos**:

- Um bot pode estar em múltiplos funis

---

#### 4. `funnels`

Funis de rastreamento (conectam Pixel + Bot).

| Coluna             | Tipo        | Descrição               | Constraints                     |
| ------------------ | ----------- | ----------------------- | ------------------------------- |
| `id`               | UUID        | ID único                | PK, Default: uuid_generate_v4() |
| `user_id`          | UUID        | Usuário                 | FK → profiles.id, NOT NULL      |
| `name`             | TEXT        | Nome da campanha        | NOT NULL                        |
| `slug`             | TEXT        | Slug único para URL     | NOT NULL, UNIQUE                |
| `pixel_id`         | UUID        | Pixel primário (legacy) | FK → pixels.id, Nullable        |
| `bot_id`           | UUID        | Bot/Canal de destino    | FK → telegram_bots.id, Nullable |
| `use_join_request` | BOOLEAN     | Usar join request       | Default: false                  |
| `created_at`       | TIMESTAMPTZ | Data de criação         | Default: now()                  |

**RLS**: ✅ Habilitado - Usuários só veem/editam seus próprios funis

**Índices**:

- `idx_funnels_user_id` (user_id)
- `idx_funnels_slug` (slug) - UNIQUE (para busca pública)
- `idx_funnels_pixel_id` (pixel_id)
- `idx_funnels_bot_id` (bot_id)

**Relacionamentos**:

- **Many-to-Many com pixels**: Via tabela `funnel_pixels`
- Um funil pode ter múltiplos pixels (multi-pixel support)
- Um funil tem um bot/canal de destino

---

#### 5. `funnel_pixels`

Tabela de junção (Many-to-Many: Funis ↔ Pixels).

| Coluna       | Tipo        | Descrição       | Constraints         |
| ------------ | ----------- | --------------- | ------------------- |
| `funnel_id`  | UUID        | Funil           | PK, FK → funnels.id |
| `pixel_id`   | UUID        | Pixel           | PK, FK → pixels.id  |
| `created_at` | TIMESTAMPTZ | Data de criação | Default: now()      |

**RLS**: ✅ Habilitado - Usuários só veem pixels de seus próprios funis

**Índices**:

- `funnel_pixels_pkey` (funnel_id, pixel_id) - UNIQUE
- `funnel_pixels_pixel_id_idx` (pixel_id)

---

#### 6. `events`

Todos os eventos rastreados.

| Coluna       | Tipo        | Descrição             | Constraints                                                         |
| ------------ | ----------- | --------------------- | ------------------------------------------------------------------- |
| `id`         | UUID        | ID único              | PK, Default: uuid_generate_v4()                                     |
| `funnel_id`  | UUID        | Funil                 | FK → funnels.id, Nullable                                           |
| `visitor_id` | TEXT        | ID único do visitante | NOT NULL                                                            |
| `event_type` | TEXT        | Tipo do evento        | NOT NULL, CHECK: pageview \| click \| join \| leave \| join_request |
| `metadata`   | JSONB       | Dados adicionais      | Default: '{}'                                                       |
| `created_at` | TIMESTAMPTZ | Data do evento        | Default: now()                                                      |

**RLS**: ✅ Habilitado - Usuários veem eventos de seus funis OU eventos sem funnel_id (tracking externo)

**Índices**:

- `idx_events_visitor_id` (visitor_id)
- `idx_events_funnel_id` (funnel_id)
- `idx_events_event_type` (event_type)
- `idx_events_created_at` (created_at)
- `idx_events_metadata` (metadata) - GIN (para queries JSONB)
- `events_dedup_idx` (visitor_id, event_type, created_at) - Para deduplicação

**Estrutura do metadata**:

```json
{
  "fbclid": "string",
  "fbc": "fb.1.timestamp.fbclid",
  "fbp": "fb.1.timestamp.random",
  "user_agent": "string",
  "ip_address": "string",
  "city": "string",
  "country": "string",
  "region": "string",
  "postal_code": "string",
  "utm_source": "string",
  "utm_medium": "string",
  "utm_campaign": "string",
  "utm_content": "string",
  "utm_term": "string",
  "page_url": "string",
  "title": "string",
  "source": "telegram_webhook|server_api_invite|external_script|internal_tracking_page",
  "telegram_user_id": 123456789,
  "telegram_username": "string",
  "telegram_name": "string",
  "chat_id": "string",
  "chat_title": "string",
  "invite_name": "v_visitor_id",
  "domain_id": "uuid"
}
```

---

#### 7. `visitor_telegram_links`

Vinculação entre visitor_id (página) e telegram_user_id.

| Coluna              | Tipo        | Descrição                 | Constraints                     |
| ------------------- | ----------- | ------------------------- | ------------------------------- |
| `id`                | UUID        | ID único                  | PK, Default: uuid_generate_v4() |
| `visitor_id`        | TEXT        | ID do visitante           | NOT NULL                        |
| `telegram_user_id`  | BIGINT      | ID do usuário no Telegram | NOT NULL, Default: 0            |
| `telegram_username` | TEXT        | Username no Telegram      | Nullable                        |
| `funnel_id`         | UUID        | Funil                     | FK → funnels.id, Nullable       |
| `bot_id`            | UUID        | Bot                       | FK → telegram_bots.id, Nullable |
| `linked_at`         | TIMESTAMPTZ | Data da vinculação        | Default: now()                  |
| `welcome_sent_at`   | TIMESTAMPTZ | Data da mensagem welcome  | Nullable                        |
| `metadata`          | JSONB       | Dados adicionais          | Default: '{}'                   |

**RLS**: ✅ Habilitado - Usuários veem links de seus próprios funis

**Índices**:

- `idx_visitor_telegram_links_visitor_id` (visitor_id)
- `idx_visitor_telegram_links_telegram_user_id` (telegram_user_id)
- `idx_visitor_telegram_links_funnel_id` (funnel_id)
- `idx_visitor_telegram_links_bot_id` (bot_id)
- `visitor_telegram_links_visitor_id_telegram_user_id_key` (visitor_id, telegram_user_id) - UNIQUE

**Estrutura do metadata**:

```json
{
  "invite_link": "https://t.me/+AbCdEfGh...",
  "invite_name": "v_abc123-def456",
  "generated_at": "2024-01-01T00:00:00Z",
  "type": "dynamic_invite|dynamic_invite_post|pool_invite",
  "linked_via": "dynamic_invite|pool_invite|/start|chat_member_fallback",
  "requires_approval": false,
  "chat_id": "-1001234567890",
  "chat_title": "Meu Canal VIP",
  "telegram_name": "Nome Completo"
}
```

---

#### 8. `domains`

Domínios personalizados para tracking externo.

| Coluna               | Tipo        | Descrição                 | Constraints                     |
| -------------------- | ----------- | ------------------------- | ------------------------------- |
| `id`                 | UUID        | ID único                  | PK, Default: uuid_generate_v4() |
| `user_id`            | UUID        | Usuário                   | FK → profiles.id, NOT NULL      |
| `domain`             | TEXT        | Domínio (ex: meusite.com) | NOT NULL                        |
| `verified`           | BOOLEAN     | Domínio verificado        | Default: false                  |
| `verification_token` | TEXT        | Token de verificação      | Nullable                        |
| `pixel_id`           | UUID        | Pixel primário (legacy)   | FK → pixels.id, Nullable        |
| `funnel_id`          | UUID        | Funil associado           | FK → funnels.id, Nullable       |
| `created_at`         | TIMESTAMPTZ | Data de criação           | Default: now()                  |

**RLS**: ✅ Habilitado - Usuários só veem seus próprios domínios

**Índices**:

- `idx_domains_user_id` (user_id)
- `domains_pixel_id_idx` (pixel_id)

**Relacionamentos**:

- **Many-to-Many com pixels**: Via tabela `domain_pixels`
- Um domínio pode ter múltiplos pixels

---

#### 9. `domain_pixels`

Tabela de junção (Many-to-Many: Domínios ↔ Pixels).

| Coluna       | Tipo        | Descrição       | Constraints         |
| ------------ | ----------- | --------------- | ------------------- |
| `domain_id`  | UUID        | Domínio         | PK, FK → domains.id |
| `pixel_id`   | UUID        | Pixel           | PK, FK → pixels.id  |
| `created_at` | TIMESTAMPTZ | Data de criação | Default: now()      |

**RLS**: ✅ Habilitado - Usuários só veem pixels de seus próprios domínios

**Índices**:

- `domain_pixels_pkey` (domain_id, pixel_id) - UNIQUE
- `domain_pixels_domain_id_idx` (domain_id)
- `domain_pixels_pixel_id_idx` (pixel_id)

---

#### 10. `capi_logs`

Logs de envio para Facebook CAPI.

| Coluna             | Tipo        | Descrição                   | Constraints                    |
| ------------------ | ----------- | --------------------------- | ------------------------------ |
| `id`               | UUID        | ID único                    | PK, Default: gen_random_uuid() |
| `visitor_id`       | TEXT        | ID do visitante             | Nullable                       |
| `funnel_id`        | UUID        | Funil                       | FK → funnels.id, Nullable      |
| `event_name`       | TEXT        | Nome do evento              | NOT NULL                       |
| `pixel_id`         | TEXT        | ID do pixel                 | Nullable                       |
| `status`           | TEXT        | success \| error \| skipped | NOT NULL                       |
| `request_payload`  | JSONB       | Payload enviado             | Nullable                       |
| `response_payload` | JSONB       | Resposta do Facebook        | Nullable                       |
| `error_message`    | TEXT        | Mensagem de erro            | Nullable                       |
| `created_at`       | TIMESTAMPTZ | Data do log                 | Default: now()                 |

**RLS**: ✅ Habilitado - Usuários veem logs de seus próprios funis

**Índices**:

- `idx_capi_logs_visitor_id` (visitor_id)
- `idx_capi_logs_funnel_id` (funnel_id)
- `idx_capi_logs_status` (status)
- `idx_capi_logs_created_at` (created_at DESC)

---

#### 11. `subscriptions`

Assinaturas de usuários (integração com Cakto).

| Coluna               | Tipo        | Descrição                                         | Constraints                          |
| -------------------- | ----------- | ------------------------------------------------- | ------------------------------------ |
| `id`                 | UUID        | ID único                                          | PK, Default: gen_random_uuid()       |
| `user_id`            | UUID        | Usuário                                           | FK → auth.users.id, NOT NULL, UNIQUE |
| `cakto_id`           | TEXT        | ID da assinatura no Cakto                         | UNIQUE, Nullable                     |
| `status`             | TEXT        | active \| canceled \| past_due \| waiting_payment | NOT NULL                             |
| `plan_name`          | TEXT        | Nome do plano                                     | Nullable                             |
| `amount`             | NUMERIC     | Valor                                             | Nullable                             |
| `current_period_end` | TIMESTAMPTZ | Fim do período                                    | Nullable                             |
| `created_at`         | TIMESTAMPTZ | Data de criação                                   | Default: now()                       |
| `updated_at`         | TIMESTAMPTZ | Data de atualização                               | Default: now()                       |

**RLS**: ✅ Habilitado - Usuários só veem sua própria assinatura

**Índices**:

- `subscriptions_user_id_key` (user_id) - UNIQUE
- `subscriptions_cakto_id_key` (cakto_id) - UNIQUE

---

#### 12. `funnel_welcome_settings`

Configurações de mensagens de boas-vindas.

| Coluna           | Tipo        | Descrição              | Constraints         |
| ---------------- | ----------- | ---------------------- | ------------------- |
| `funnel_id`      | UUID        | Funil                  | PK, FK → funnels.id |
| `is_active`      | BOOLEAN     | Ativo                  | Default: false      |
| `message_text`   | TEXT        | Texto da mensagem      | Nullable            |
| `buttons_config` | JSONB       | Configuração de botões | Default: '[]'       |
| `image_url`      | TEXT        | URL da imagem          | Nullable            |
| `created_at`     | TIMESTAMPTZ | Data de criação        | Default: now()      |
| `updated_at`     | TIMESTAMPTZ | Data de atualização    | Default: now()      |

**RLS**: ✅ Habilitado - Usuários só veem configurações de seus próprios funis

**Estrutura do buttons_config**:

```json
[
  {
    "label": "Botão 1",
    "url": "https://example.com"
  }
]
```

---

#### 13. `telegram_message_logs`

Logs de mensagens enviadas/recebidas via Telegram.

| Coluna               | Tipo        | Descrição                  | Constraints                     |
| -------------------- | ----------- | -------------------------- | ------------------------------- |
| `id`                 | UUID        | ID único                   | PK, Default: uuid_generate_v4() |
| `funnel_id`          | UUID        | Funil                      | FK → funnels.id, Nullable       |
| `telegram_chat_id`   | TEXT        | ID do chat                 | NOT NULL                        |
| `telegram_user_name` | TEXT        | Nome do usuário            | Nullable                        |
| `direction`          | TEXT        | inbound \| outbound        | Nullable                        |
| `message_content`    | TEXT        | Conteúdo da mensagem       | Nullable                        |
| `status`             | TEXT        | sent \| received \| failed | Default: 'sent'                 |
| `created_at`         | TIMESTAMPTZ | Data do log                | Default: now()                  |

**RLS**: ✅ Habilitado - Usuários veem logs de seus próprios funis

---

#### 14. `funnel_webhooks`

Configuração de webhooks customizados para funis.

| Coluna       | Tipo        | Descrição            | Constraints                     |
| ------------ | ----------- | -------------------- | ------------------------------- |
| `id`         | UUID        | ID único             | PK, Default: uuid_generate_v4() |
| `funnel_id`  | UUID        | Funil                | FK → funnels.id, Nullable       |
| `name`       | TEXT        | Nome do webhook      | NOT NULL                        |
| `url`        | TEXT        | URL de destino       | NOT NULL                        |
| `events`     | TEXT[]      | Eventos que disparam | Default: '{join}'               |
| `fields`     | JSONB       | Campos a enviar      | Default: '{"all": true}'        |
| `is_active`  | BOOLEAN     | Webhook ativo        | Default: true                   |
| `created_at` | TIMESTAMPTZ | Data de criação      | Default: now()                  |
| `updated_at` | TIMESTAMPTZ | Data de atualização  | Default: now()                  |

**RLS**: ✅ Habilitado - Usuários só veem webhooks de seus próprios funis

**Status**: Tabela criada mas não utilizada atualmente (0 registros)

---

#### 15. `bet_leads` (Genérica)

Armazena leads da bet para match email ↔ tracking data.

| Coluna          | Tipo        | Descrição            | Constraints         |
| --------------- | ----------- | -------------------- | ------------------- |
| `id`            | UUID        | ID único             | PK                  |
| `email`         | TEXT        | Email do lead        | NOT NULL, UNIQUE    |
| `phone`         | TEXT        | Telefone             | Nullable            |
| `visitor_id`    | TEXT        | ID do visitante      | Nullable            |
| `fbc`           | TEXT        | Facebook Click ID    | Nullable            |
| `fbp`           | TEXT        | Facebook Browser ID  | Nullable            |
| `utm_source`    | TEXT        | UTM Source           | Nullable            |
| `utm_medium`    | TEXT        | UTM Medium           | Nullable            |
| `utm_campaign`  | TEXT        | UTM Campaign         | Nullable            |
| `utm_content`   | TEXT        | UTM Content          | Nullable            |
| `utm_term`      | TEXT        | UTM Term             | Nullable            |
| `ip_address`    | TEXT        | IP do usuário        | Nullable            |
| `user_agent`    | TEXT        | User Agent           | Nullable            |
| `city`          | TEXT        | Cidade (geo)         | Nullable            |
| `state`         | TEXT        | Estado (geo)         | Nullable            |
| `country`       | TEXT        | País (geo)           | Nullable            |
| `postal_code`   | TEXT        | CEP (geo)            | Nullable            |
| `status`        | TEXT        | identified/registered/deposited | Default: identified |
| `deposit_value` | NUMERIC     | Valor do depósito    | Nullable            |
| `deposit_at`    | TIMESTAMPTZ | Data do depósito     | Nullable            |
| `created_at`    | TIMESTAMPTZ | Data de criação      | Default: now()      |
| `updated_at`    | TIMESTAMPTZ | Data de atualização  | Default: now()      |

**RLS**: ✅ Habilitado

**Estatísticas**: 1.808 registros

---

#### 16. `bet_leads_lucasmagnotti`

Tabela dedicada para o funil **Lucas Magnotti**.

**Estrutura**: Idêntica a `bet_leads`

**Pixel Config**:
- Pixel ID: `1254338099849797`
- Access Token: Hardcoded no código

**RLS**: ✅ Habilitado

**Estatísticas**: 295 registros

---

#### 17. `bet_leads_pedrozutti`

Tabela dedicada para o funil **Pedro Zutti**.

**Estrutura**: Idêntica a `bet_leads`

**Pixel Config**:
- Pixel ID: `1217675423556541`
- Access Token: Hardcoded no código

**RLS**: ❌ Desabilitado (permite webhooks externos)

**Estatísticas**: 99 registros

---

### Funções RPC (Database Functions)

#### `get_dashboard_metrics`

**Propósito**: Retorna métricas agregadas do dashboard.

**Parâmetros**:

- `p_start_date` (TIMESTAMPTZ): Data inicial
- `p_end_date` (TIMESTAMPTZ): Data final
- `p_funnel_id` (UUID, nullable): Filtrar por funil
- `p_pixel_id` (UUID, nullable): Filtrar por pixel

**Retorno**: JSON

```json
{
  "totals": {
    "pageviews": 0,
    "clicks": 0,
    "joins": 0,
    "leaves": 0,
    "unique_pageviews": 0,
    "unique_joins": 0,
    "unique_leaves": 0
  },
  "daily": [
    {
      "date": "2024-01-01T00:00:00Z",
      "pageviews": 10,
      "clicks": 8,
      "joins": 5,
      "leaves": 1
    }
  ]
}
```

**Lógica**:

- Agrega eventos por tipo e data
- Calcula métricas únicas (unique_pageviews, etc) baseadas em `visitor_id` distintos
- Suporta filtros por funil e pixel
- Inclui eventos de domínios externos (via metadata.domain_id)
- Usa CTEs para performance
- Timezone: `America/Sao_Paulo` para agregação diária

**Permissões**: `SECURITY DEFINER` - Executável por usuários autenticados

**Migração**: Atualizada em `20251229_add_unique_metrics.sql` para incluir métricas únicas

---

#### `handle_new_user`

**Propósito**: Trigger function que cria perfil automaticamente quando usuário é criado.

**Trigger**: `auth.users` → `INSERT`

**Ação**: Cria registro em `profiles` com mesmo `id` do `auth.users`

---

### Triggers

1. **`handle_new_user`**: Cria perfil automaticamente ao criar usuário em `auth.users`
2. **`update_updated_at_column`**: Atualiza `updated_at` automaticamente em:
   - `pushcut_integrations`
   - `pushcut_notifications`

### Extensions

- **uuid-ossp**: Para geração de UUIDs (`uuid_generate_v4()`)
- **pgcrypto**: Para `gen_random_uuid()`

### Índices Importantes

**Tabela `events`**:
- `idx_events_visitor_id` (visitor_id)
- `idx_events_funnel_id` (funnel_id)
- `idx_events_event_type` (event_type)
- `idx_events_created_at` (created_at)
- `idx_events_metadata` (metadata) - GIN index para queries JSONB
- `events_dedup_idx` (visitor_id, event_type, created_at) - Para deduplicação

**Tabela `visitor_telegram_links`**:
- `idx_visitor_telegram_links_visitor_id` (visitor_id)
- `idx_visitor_telegram_links_telegram_user_id` (telegram_user_id)
- `idx_visitor_telegram_links_funnel_id` (funnel_id)
- `idx_visitor_telegram_links_bot_id` (bot_id)
- `visitor_telegram_links_visitor_id_telegram_user_id_key` (visitor_id, telegram_user_id) - UNIQUE

**Tabela `telegram_bots`**:
- `idx_telegram_bots_user_id` (user_id)
- `idx_telegram_bots_bot_token` (bot_token) - Para busca rápida em webhooks

**Tabela `capi_logs`**:
- `idx_capi_logs_visitor_id` (visitor_id)
- `idx_capi_logs_funnel_id` (funnel_id)
- `idx_capi_logs_status` (status)
- `idx_capi_logs_created_at` (created_at DESC)

**Tabela `pushcut_logs`**:
- `idx_pushcut_logs_integration_id` (integration_id)
- `idx_pushcut_logs_created_at` (created_at)

---

## Tracking e UTMs

### Captura de Parâmetros

O sistema captura os seguintes parâmetros:

#### Facebook Parameters

- **fbclid**: Click ID do Facebook (da URL)
- **fbc**: Facebook Click ID (cookie `_fbc` ou gerado)
- **fbp**: Facebook Browser ID (cookie `_fbp` ou gerado)

#### UTM Parameters

- **utm_source**: Origem da campanha
- **utm_medium**: Meio da campanha
- **utm_campaign**: Nome da campanha
- **utm_content**: Conteúdo específico
- **utm_term**: Termo de busca

#### Facebook Ads IDs (NOVO v3.3+)

- **campaign_id**: ID da campanha no Meta Ads
- **adset_id**: ID do conjunto de anúncios
- **ad_id**: ID do anúncio individual

### Página de Analytics de UTMs (`/utms`)

A página de UTMs foi redesenhada para oferecer analytics completo com drill-down por dimensão:

**Tabs disponíveis:**

- **Campanhas**: Agrupa por `utm_campaign` ou `campaign_id`
- **Conjuntos**: Agrupa por `utm_content` ou `adset_id`
- **Anúncios**: Agrupa por `ad_id`
- **Todos UTMs**: Visão geral de todos os parâmetros

**Funcionalidades:**

- ✅ Filtro por período (7 dias, 14 dias, 30 dias, personalizado)
- ✅ Métricas: Pageviews, Clicks, Leads, Leaves
- ✅ Taxa de conversão com indicadores visuais
- ✅ Template de UTM para copiar e usar nas campanhas
- ✅ Drill-down por dimensão

#### Geolocalização (Vercel)

- **city**: Cidade (header `x-vercel-ip-city`)
- **country**: País (header `x-vercel-ip-country`)
- **region**: Região (header `x-vercel-ip-country-region`)
- **postal_code**: CEP (header `x-vercel-ip-postal-code`)

#### Outros

- **user_agent**: User-Agent do navegador
- **ip_address**: IP do usuário (header `x-forwarded-for`)
- **page_url**: URL da página
- **title**: Título da página

### Geração de Cookies

#### `_fbc` (Facebook Click ID)

```
Formato: fb.1.{timestamp}.{fbclid}
Exemplo: fb.1.1702123456.AbCdEfGhIj
Expiração: 90 dias
```

#### `_fbp` (Facebook Browser ID)

```
Formato: fb.1.{timestamp}.{random}
Exemplo: fb.1.1702123456.1234567890
Expiração: 90 dias
```

### Tracking Script Externo (v4.1)

O script `/api/tracking-script.js` pode ser incluído em landing pages externas:

```html
<script src="https://app.com/api/tracking-script.js?id={domain_id}"></script>
<!-- OU -->
<script src="https://app.com/api/tracking-script.js?funnel={slug}"></script>
```

**Funcionalidades v4.1**:

- ✅ **Multi-Pixel Injection**: Injeta automaticamente todos os pixels configurados no domínio
- ✅ **Instant Intercept**: Intercepta clicks ANTES de qualquer outro handler (`capture: true`)
- ✅ **Link Replacement**: Substitui automaticamente todos os links Telegram pelo link único
- ✅ **MutationObserver**: Detecta links adicionados dinamicamente (SPAs)
- ✅ **Loading UI**: Modal elegante com spinner e fallback manual após 3s
- ✅ **Timeout Inteligente**: Se link não gerar em 10s, usa link original
- ✅ **Captura Completa**: visitor_id, fbclid, fbc, fbp, UTMs, Ads IDs (campaign_id, adset_id, ad_id)
- ✅ **Legacy Support**: Ainda decora links `/t/slug` com parâmetros
- ✅ **Branding**: Console logs com ASCII art do TrackGram
- ✅ **Session Management**: Previne múltiplos loads e pageviews duplicados

**Parâmetros de URL Suportados**:
- `?id={domain_id}` - Busca configuração do domínio
- `?funnel={slug}` - Busca funil diretamente pelo slug

---

## Autenticação e Segurança

### Autenticação

O sistema usa **Supabase Auth** com:

1. **Email/Password**: Login tradicional (implementado)
2. **Magic Link**: Suportado mas não implementado atualmente

### Fluxo de Autenticação

```
1. Usuário acessa /login
2. Preenche email e senha
3. Sistema chama supabase.auth.signInWithPassword()
4. Supabase valida credenciais
5. Middleware atualiza sessão (cookies via @supabase/ssr)
6. Usuário é redirecionado para /
```

### Middleware de Proteção

O middleware (`src/middleware.ts`) protege rotas autenticadas:

- Verifica sessão do Supabase
- Redireciona para `/login` se não autenticado
- Permite acesso público a:
  - `/login`
  - `/t/*` (páginas de tracking)
  - `/api/*` (API routes)

### Row Level Security (RLS)

Todas as tabelas principais têm RLS habilitado com políticas específicas. Veja seção [Banco de Dados](#banco-de-dados) para detalhes.

### Service Role Key

A `SUPABASE_SERVICE_ROLE_KEY` é usada apenas em:

- API Routes (server-side)
- Operações que precisam bypass RLS (ex: buscar funil público)

**⚠️ IMPORTANTE**: Nunca exponha a Service Role Key no client-side!

### Segurança de Dados

- **Hashing SHA256**: Dados sensíveis (external_id, geolocalização) são hasheados antes do CAPI
- **Validação de Webhook**: Cakto webhook valida secret
- **CORS**: Configurado em `vercel.json` (permite `*` em `/api/*` - pode ser restrito)
- **Rate Limiting**: Não implementado (recomendado para produção)

---

## Sistema de Assinaturas

### Integração com Cakto

O sistema integra com **Cakto** (plataforma de pagamentos) via webhook:

**Webhook**: `/api/webhooks/cakto`

**Eventos Processados**:

- `purchase_approved` → Status: `active`
- `subscription_renewed` → Status: `active`
- `subscription_canceled` → Status: `canceled`
- `purchase_refused` → Status: `past_due`
- `refund` → Status: `canceled`
- `chargeback` → Status: `canceled`
- `boleto_gerado` → Status: `waiting_payment`
- `pix_gerado` → Status: `waiting_payment`

**Validação**: Webhook valida `CAKTO_WEBHOOK_SECRET` antes de processar

### Planos Disponíveis

| Plano         | Preço  | Domínios | Pixels | Canais | Funis     | Leads/mês | Checkout URL                                    |
| ------------- | ------ | -------- | ------ | ------ | --------- | --------- | ----------------------------------------------- |
| **Starter**   | R$ 97  | 2        | 2      | 1      | 5         | 20.000    | `https://pay.cakto.com.br/whxxcwj_684643`       |
| **Pro Scale** | R$ 197 | 4        | 4      | 2      | 10        | 100.000   | `https://pay.cakto.com.br/link_pro`             |
| **Agency**    | R$ 297 | 10       | 10     | 2      | Ilimitado | Ilimitado | `https://pay.cakto.com.br/link_agency`           |

**Configuração**: `src/config/subscription-plans.ts`

**Função `getPlanLimits(planName)`**:
- Suporta match exato por nome
- Suporta match por ID (case insensitive)
- Suporta match parcial (starter/pro/agency)
- Retorna `null` se plano não encontrado

**Limites Especiais**:
- `funnels: 'unlimited'` → Representado como `9999` no código
- `entries: 'unlimited'` → Representado como `9999` no código

### Verificação de Limites

Todas as ações (criar canal, pixel, funil) verificam:

1. Assinatura ativa (`status = 'active'` ou `'trialing'`)
2. Limite do plano
3. Contagem atual de recursos

**Exemplo** (criar canal):

```typescript
const planLimits = getPlanLimits(subscription.plan_name);
if (planLimits.channels !== 9999) {
  const { count } = await supabase
    .from("telegram_bots")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count || 0) >= planLimits.channels) {
    throw new Error("Limite atingido");
  }
}
```

---

## Deploy e Ambientes

### Vercel Configuration

**Arquivo**: `vercel.json`

```json
{
  "framework": "nextjs",
  "regions": ["gru1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

**Região**: `gru1` (São Paulo, Brasil) - Para baixa latência

### URLs de Produção

- **App**: `https://tracktelegram.vercel.app` (ou domínio customizado)
- **API Webhook**: `https://tracktelegram.vercel.app/api/webhook/telegram/{bot_id}`
- **Tracking**: `https://tracktelegram.vercel.app/t/{slug}`
- **Tracking Script**: `https://tracktelegram.vercel.app/api/tracking-script.js?id={domain_id}`

### Supabase

- **Projeto**: TeleTrack
- **ID**: `qwqgefuvxnlruiqcgsil`
- **Região**: us-west-2 (Oregon, EUA)
- **PostgreSQL**: 17.6.1

---

## Variáveis de Ambiente

### Desenvolvimento (`.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://qwqgefuvxnlruiqcgsil.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cakto (Opcional)
CAKTO_WEBHOOK_SECRET=seu_secret_aqui
```

### Produção (Vercel)

Configure as seguintes variáveis no dashboard da Vercel:

| Variável                        | Tipo   | Descrição                      | Obrigatório |
| ------------------------------- | ------ | ------------------------------ | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public | URL do projeto Supabase        | ✅ Sim      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Chave anônima do Supabase      | ✅ Sim      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Secret | Chave de serviço (server-side) | ✅ Sim      |
| `NEXT_PUBLIC_APP_URL`           | Public | URL da aplicação               | ✅ Sim      |
| `CAKTO_WEBHOOK_SECRET`          | Secret | Secret do webhook Cakto        | ❌ Opcional |

---

## Scripts TrackFather (Legacy/Alternativo)

O projeto contém scripts alternativos `trackfather-*.js` que parecem ser uma versão alternativa ou concorrente do sistema de tracking. Estes scripts não estão integrados ao fluxo principal do TrackGram, mas estão presentes no repositório:

### `trackfather-bot.js` e `trackfather-canal.js`

Scripts minificados que implementam tracking similar ao TrackGram, mas com:
- API endpoint diferente: `https://trackfather.com/api/track/event`
- Identificador próprio: `trackfather_id` (formato `tf_*`)
- Console branding com ASCII art "TrackFather"
- Suporte a Facebook Pixel
- UI de loading/redirect similar

### `trackfather-redirect.js`

Script para redirecionamento automático com tracking, similar ao modo redirect do TrackGram.

**Nota**: Estes scripts não estão sendo utilizados no fluxo principal do TrackGram e podem ser considerados legacy ou para uso alternativo.

---

## Pontos de Atenção e Melhorias

### ⚠️ Pontos de Atenção

1. **Webhook Handler**: Processa múltiplos pixels sequencialmente (Promise.allSettled) - pode ser otimizado com rate limiting
2. **Deduplicação de Eventos**: Baseada em tempo (5 minutos) - pode melhorar com event_id único do Facebook
3. **Fallback de Link**: Se falhar ao gerar link dinâmico, usa link estático (perde rastreamento único)
4. **Chat ID Manual**: Requer inserção manual do chat_id em alguns casos
5. **RLS em Events**: Permite leitura pública para eventos sem funnel_id (necessário para tracking externo)
6. **CORS Aberto**: Permite `*` em `/api/*` (pode ser restrito para domínios verificados)
7. **Webhook Telegram**: Não valida secret (depende de URL secreta `bot_id`)
8. **Rate Limiting**: Não implementado em webhooks (recomendado para produção)
9. **Bet Tracking**: Pixels hardcoded no código (Lucas e Pedro) - considerar migrar para configuração no banco
10. **Geolocalização**: Depende de headers Vercel para fallback - pode falhar em outros ambientes

### 🔧 Melhorias Sugeridas

1. **Rate Limiting**: Implementar rate limiting em webhooks e APIs públicas
2. **Event Deduplication**: Usar event_id único do Facebook para deduplicação mais robusta
3. **Pixel Configuration**: Migrar pixels do Bet Tracking para tabela de configuração
4. **Webhook Validation**: Implementar validação de secret nos webhooks do Telegram
5. **CORS Restriction**: Restringir CORS para domínios verificados apenas
6. **Error Monitoring**: Integrar Sentry ou similar para monitoramento de erros
7. **Analytics**: Implementar analytics próprio para métricas de uso do sistema
8. **Cache**: Implementar cache para consultas frequentes (ex: configuração de funis)
9. **Queue System**: Considerar fila para processamento assíncrono de eventos CAPI
10. **Testing**: Adicionar testes automatizados (unit + integration)

---

## Arquitetura de Serviços (Refatorada)

O sistema utiliza uma arquitetura modular com serviços especializados para diferentes responsabilidades:

### Serviços Telegram

#### `JoinHandler` (`services/telegram/join-handler.ts`)

**Responsabilidade**: Processa eventos de entrada/saída no Telegram

**Métodos**:
- `handleChatMember(update, bot_id)`: Processa `chat_member` e `my_chat_member`
- `handleJoinRequest(update, bot_id)`: Processa `chat_join_request`

**Comportamento**:
- Detecta entrada (status: member/administrator/creator)
- Detecta saída (status: left/kicked)
- Usa `AttributionService` para vincular visitor_id
- Usa `ConversionService` para disparar CAPI
- Usa `WelcomeService` para enviar mensagens
- Usa `PushcutService` para notificações

---

#### `MessageHandler` (`services/telegram/message-handler.ts`)

**Responsabilidade**: Processa mensagens privadas com o bot

**Métodos**:
- `handleMessage(update, bot_id)`: Processa mensagens de texto e comandos

**Comportamento**:
- Salva logs em `telegram_message_logs`
- Processa comando `/start` (deep linking legacy)
- Vincula visitor_id via parâmetro do comando

---

#### `AttributionService` (`services/telegram/attribution-service.ts`)

**Responsabilidade**: Vincula `telegram_user_id` a `visitor_id`

**Métodos**:
- `findVisitorByInviteLink(inviteName, botId)`: Busca por nome do invite link
- `findVisitorByTelegramUserId(telegramUserId, botId)`: Busca por telegram_user_id já vinculado
- `findVisitorByRecentClick(botId, funnelId)`: Busca por click recente (10 min)

**Estratégias (em cascata)**:
1. **Primária**: Via `invite_link.name` (formato `v_{visitor_id}`)
2. **Fallback 1**: Via `telegram_user_id` já vinculado anteriormente
3. **Fallback 2**: Via click recente sem join correspondente

---

#### `ConversionService` (`services/telegram/conversion-service.ts`)

**Responsabilidade**: Dispara eventos CAPI para Facebook

**Métodos**:
- `sendConversionEvent(funnelId, visitorId, metadata, eventType)`: Envia evento CAPI

**Comportamento**:
- Busca pixels do funil (legacy + multi-pixel)
- Envia para todos os pixels simultaneamente (Promise.allSettled)
- Salva logs em `capi_logs`
- Suporta eventos: `Lead`, `PageView`, `Purchase`

---

#### `WelcomeService` (`services/telegram/welcome-service.ts`)

**Responsabilidade**: Envia mensagens de boas-vindas

**Métodos**:
- `sendWelcomeMessage(telegramUserId, funnelId, botToken)`: Envia mensagem configurada

**Comportamento**:
- Busca configuração em `funnel_welcome_settings`
- Suporta texto, imagem e botões inline
- Marca `welcome_sent_at` em `visitor_telegram_links`
- Previne múltiplos envios

---

#### `PushcutService` (`services/telegram/pushcut-service.ts`)

**Responsabilidade**: Envia notificações push via Pushcut

**Métodos**:
- `sendNotification(eventType, data)`: Envia notificação para iOS

**Comportamento**:
- Busca integração do dono do funil
- Verifica se evento está habilitado
- Faz parse de templates (substitui variáveis)
- Envia para Pushcut API
- Salva log em `pushcut_logs`

**Variáveis Disponíveis**:
- `{username}`, `{user_id}`, `{channel}`, `{funnel}`, `{date}`, `{time}`, `{visitor_id}`, `{page_url}`, `{source}`

---

### Bibliotecas

#### `lib/telegram-service.ts`

**Funções**:
- `generateTelegramInvite({ funnelId, visitorId, bot, createsJoinRequest })`: Gera link único

**Comportamento**:
- Chama Telegram API `createChatInviteLink`
- Configura `name` com visitor_id (até 28 chars)
- Configura expiração (24h) e member_limit ou creates_join_request
- Salva mapeamento em `visitor_telegram_links`
- Fallback para link estático se falhar

---

#### `lib/facebook-capi.ts`

**Funções**:
- `sendCAPIEvent(accessToken, pixelId, eventName, userDataPayload, customDataPayload, metadata)`: Envia evento CAPI

**Comportamento**:
- Hash SHA256 de dados sensíveis (external_id, geolocalização)
- Constrói payload conforme documentação Meta v18.0
- Valida fbc/fbp antes de incluir
- Logs detalhados de request/response
- Salva logs em `capi_logs`

**Eventos Suportados**:
- `PageView`, `Lead`, `Purchase`, `Cadastrou_bet` (customizado)

---

#### `lib/pushcut.ts`

**Funções**:
- `sendPushcutNotification(apiKey, notificationName, title, text, sound?)`: Envia notificação

**Comportamento**:
- POST para `https://api.pushcut.io/v1/notifications/{name}`
- Headers: `API-Key` e `Content-Type`
- Retorna status da notificação

---

## Integração com Pushcut

### Visão Geral

O TrackGram oferece integração nativa com o **Pushcut** para envio de notificações push em tempo real para dispositivos iOS. Essa funcionalidade permite que os usuários recebam alertas instantâneos sobre eventos importantes.

### Eventos Suportados

| Evento         | Descrição                       | Variáveis Disponíveis                                                    |
| -------------- | ------------------------------- | ------------------------------------------------------------------------ |
| `new_lead`     | Novo lead entrou no grupo/canal | `{username}`, `{channel}`, `{funnel}`, `{date}`, `{time}`                |
| `member_join`  | Membro entrou no grupo          | `{username}`, `{user_id}`, `{channel}`, `{funnel}`, `{date}`, `{time}`   |
| `member_leave` | Membro saiu do grupo            | `{username}`, `{user_id}`, `{channel}`, `{funnel}`, `{date}`, `{time}`   |
| `pageview`     | Pageview registrado             | `{visitor_id}`, `{page_url}`, `{funnel}`, `{source}`, `{date}`, `{time}` |
| `click`        | Click registrado                | `{visitor_id}`, `{page_url}`, `{funnel}`, `{source}`, `{date}`, `{time}` |
| `join_request` | Solicitação de entrada          | `{username}`, `{user_id}`, `{channel}`, `{funnel}`, `{date}`, `{time}`   |

### Tabelas do Banco de Dados

#### `pushcut_integrations`

Armazena a configuração da API do Pushcut por usuário.

| Coluna              | Tipo        | Descrição           | Constraints                     |
| ------------------- | ----------- | ------------------- | ------------------------------- |
| `id`                | UUID        | ID único            | PK, Default: uuid_generate_v4() |
| `user_id`           | UUID        | Usuário             | FK → profiles.id, UNIQUE        |
| `api_key`           | TEXT        | API Key do Pushcut  | NOT NULL                        |
| `notification_name` | TEXT        | Nome da notificação | Default: 'TrackGram'            |
| `is_active`         | BOOLEAN     | Integração ativa    | Default: true                   |
| `created_at`        | TIMESTAMPTZ | Data de criação     | Default: now()                  |
| `updated_at`        | TIMESTAMPTZ | Data de atualização | Default: now()                  |

#### `pushcut_notifications`

Configuração de notificação por evento.

| Coluna           | Tipo        | Descrição            | Constraints                      |
| ---------------- | ----------- | -------------------- | -------------------------------- |
| `id`             | UUID        | ID único             | PK, Default: uuid_generate_v4()  |
| `integration_id` | UUID        | Integração           | FK → pushcut_integrations.id     |
| `event_type`     | TEXT        | Tipo do evento       | NOT NULL, CHECK: enum de eventos |
| `enabled`        | BOOLEAN     | Evento habilitado    | Default: true                    |
| `title_template` | TEXT        | Template do título   | NOT NULL                         |
| `text_template`  | TEXT        | Template da mensagem | NOT NULL                         |
| `sound`          | TEXT        | Som da notificação   | Nullable                         |
| `created_at`     | TIMESTAMPTZ | Data de criação      | Default: now()                   |
| `updated_at`     | TIMESTAMPTZ | Data de atualização  | Default: now()                   |

#### `pushcut_logs`

Log de notificações enviadas para auditoria.

| Coluna           | Tipo        | Descrição        | Constraints                     |
| ---------------- | ----------- | ---------------- | ------------------------------- |
| `id`             | UUID        | ID único         | PK, Default: uuid_generate_v4() |
| `integration_id` | UUID        | Integração       | FK → pushcut_integrations.id    |
| `event_type`     | TEXT        | Tipo do evento   | NOT NULL                        |
| `title`          | TEXT        | Título enviado   | Nullable                        |
| `text`           | TEXT        | Texto enviado    | Nullable                        |
| `status`         | TEXT        | sent \| failed   | NOT NULL                        |
| `error_message`  | TEXT        | Mensagem de erro | Nullable                        |
| `metadata`       | JSONB       | Dados do evento  | Default: '{}'                   |
| `created_at`     | TIMESTAMPTZ | Data do log      | Default: now()                  |

### Arquitetura

```
┌──────────────────────────────────────────────────────────────────┐
│                    FLUXO DE NOTIFICAÇÃO PUSHCUT                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Evento ocorre (Join, Leave, Click, etc...)                   │
│     ↓                                                            │
│  2. Handler chama PushcutService                                 │
│     ↓                                                            │
│  3. PushcutService busca integração do dono do funil             │
│     ↓                                                            │
│  4. Verifica se evento está habilitado                           │
│     ↓                                                            │
│  5. Faz parse dos templates (substitui variáveis)                │
│     ↓                                                            │
│  6. Envia para Pushcut API (POST /notifications/{name})          │
│     ↓                                                            │
│  7. Salva log em pushcut_logs                                    │
│     ↓                                                            │
│  8. Usuário recebe notificação push no iPhone                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Arquivos Relacionados

- `src/lib/pushcut.ts` - Biblioteca de integração com Pushcut API
- `src/app/actions/pushcut.ts` - Server Actions para CRUD
- `src/services/telegram/pushcut-service.ts` - Serviço de notificações
- `src/app/(dashboard)/integrations/pushcut/page.tsx` - Página de configuração

---

## APIs e Endpoints

### API Routes Públicas

#### `GET /api/tracking-script.js`

**Descrição**: Retorna o script JavaScript v4.1 para tracking externo

**Query Parameters**:
- `id` (UUID): ID do domínio configurado
- `funnel` (string): Slug do funil (alternativa ao id)

**Response**: JavaScript (Content-Type: application/javascript)

**Cache**: `public, s-maxage=60, stale-while-revalidate=30`

**Funcionalidades**:
- Injeta múltiplos pixels do Facebook automaticamente
- Configura tracking completo com visitor_id
- Intercepta clicks em links Telegram
- Substitui links automaticamente

---

#### `POST /api/track`

**Descrição**: Endpoint para registrar eventos de tracking (pageview, click)

**Request Body**:
```json
{
  "visitor_id": "uuid",
  "event_type": "pageview|click",
  "funnel_id": "uuid (opcional)",
  "domain_id": "uuid (opcional)",
  "metadata": {
    "fbc": "fb.1.timestamp.fbclid",
    "fbp": "fb.1.timestamp.random",
    "fbclid": "string",
    "user_agent": "string",
    "ip_address": "string",
    "city": "string",
    "country": "string",
    "region": "string",
    "postal_code": "string",
    "utm_source": "string",
    "utm_medium": "string",
    "utm_campaign": "string",
    "utm_content": "string",
    "utm_term": "string",
    "campaign_id": "string",
    "adset_id": "string",
    "ad_id": "string",
    "page_url": "string",
    "title": "string",
    "source": "external_script|internal_tracking_page"
  }
}
```

**Response**:
```json
{
  "success": true,
  "skipped": false // true se evento duplicado
}
```

**Comportamento**:
- Deduplicação: Verifica eventos idênticos nos últimos 5 minutos
- Multi-Pixel: Busca pixels do domínio ou funil e dispara CAPI para todos
- CAPI: Só dispara se `event_type = 'pageview'` e tiver origem de anúncio (fbclid ou fbc)
- Filtro de Tráfego: Só processa eventos com origem de anúncio pago

**CORS**: Permitido para `*`

---

#### `GET /api/invite`

**Descrição**: Gera link de convite único do Telegram (GET)

**Query Parameters**:
- `funnel_id` (UUID): ID do funil
- `visitor_id` (string): ID do visitante

**Response**:
```json
{
  "invite_link": "https://t.me/+AbCdEfGh...",
  "is_dynamic": true,
  "expires_in": "24h",
  "requires_approval": false
}
```

**Fallback**: Se falhar, retorna `channel_link` estático se disponível

---

#### `POST /api/invite`

**Descrição**: Gera link de convite único do Telegram (POST) e registra evento de click

**Request Body**:
```json
{
  "funnel_id": "uuid",
  "visitor_id": "string",
  "metadata": {
    // Mesma estrutura do /api/track
  }
}
```

**Response**: Mesma estrutura do GET

**Comportamento**:
- Registra evento "click" no Supabase (fire & forget)
- Gera link único via Telegram API
- Salva mapeamento em `visitor_telegram_links`
- Suporta `use_join_request` e `member_limit`

---

#### `POST /api/webhook/telegram/[bot_id]`

**Descrição**: Webhook handler do Telegram

**Path Parameter**:
- `bot_id` (UUID): ID do bot no sistema

**Request Body**: Update do Telegram (formato oficial)

**Eventos Processados**:
1. **message**: Mensagens privadas com o bot
2. **chat_member**: Entrada/saída de membros (FLUXO PRINCIPAL)
3. **chat_join_request**: Solicitação de entrada (canais privados)

**Response**: `{ success: true }`

**Comportamento**:
- Usa `JoinHandler` para processar entradas
- Usa `MessageHandler` para processar mensagens
- Atribui visitor_id via `invite_link.name` ou fallbacks
- Dispara CAPI para múltiplos pixels
- Envia mensagens de boas-vindas se configurado
- Salva logs em `telegram_message_logs` e `capi_logs`

**Segurança**: Depende de URL secreta (`bot_id`), não valida secret adicional

---

#### `POST /api/bet/identify`

**Descrição**: Identifica lead da bet vinculando email aos dados de tracking

**Request Body**:
```json
{
  "email": "usuario@email.com",
  "phone": "11999999999",
  "visitor_id": "uuid (opcional)",
  "fbc": "fb.1.timestamp.fbclid",
  "fbp": "fb.1.timestamp.random",
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "campanha1",
  "funnel_id": "lucasmagnotti|pedrozutti|outro",
  "fingerprint": "string (opcional)",
  "user_agent": "string",
  "screen_resolution": "string",
  "timezone": "string",
  "language": "string"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Lead identificado",
  "capi_sent": true,
  "event": "Cadastrou_bet",
  "matched_by": "ip_address|fuzzy_ua|direct",
  "visitor_id": "uuid",
  "geo_source": "match|vercel_header|none"
}
```

**Comportamento**:
- Matching robusto: IP (24h) → Fuzzy UA (1h) → Direto
- Roteamento por funil: Lucas → `bet_leads_lucasmagnotti`, Pedro → `bet_leads_pedrozutti`, Outros → `bet_leads`
- CAPI: Só envia para funis conhecidos (Lucas e Pedro)
- Geolocalização: Usa dados do evento original ou headers Vercel
- Upsert: Atualiza se email já existe

**CORS**: Permitido para `*`

---

#### `POST /api/bet/webhook`

**Descrição**: Recebe webhooks da bet (cadastro/depósito) e dispara CAPI

**Request Body (Cadastro)**:
```json
{
  "email": "usuario@email.com",
  "phone": "11999999999",
  "name": "Nome"
}
```

**Request Body (Depósito)**:
```json
{
  "email": "usuario@email.com",
  "phone": "11999999999",
  "name": "Nome",
  "valor": 100.0,
  "status": "PAID",
  "currency": "BRL",
  "transaction_status": "completed"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Evento deposit processado",
  "matched": true,
  "lead_id": "uuid",
  "table": "bet_leads_lucasmagnotti",
  "capi_sent": true,
  "fb_event": "Purchase",
  "value": 100.0
}
```

**Comportamento**:
- Busca lead em todas as tabelas (Pedro → Lucas → Padrão)
- Determina tipo: depósito se `valor > 0` e `status = "PAID"`
- Eventos CAPI: `Cadastrou_bet` (cadastro) ou `Purchase` (depósito)
- Atualiza status do lead: `registered` → `deposited`
- Só envia CAPI para funis conhecidos (Lucas e Pedro)

**Suporta Formatos**:
- Objeto direto
- Array (formato N8N)
- Objeto com wrapper `.body`

---

#### `POST /api/webhooks/cakto`

**Descrição**: Webhook de assinaturas do Cakto

**Headers**:
- `x-cakto-signature`: Secret para validação

**Request Body**: Evento do Cakto

**Eventos Processados**:
- `purchase_approved` → Status: `active`
- `subscription_renewed` → Status: `active`
- `subscription_canceled` → Status: `canceled`
- `purchase_refused` → Status: `past_due`
- `refund` → Status: `canceled`
- `chargeback` → Status: `canceled`
- `boleto_gerado` → Status: `waiting_payment`
- `pix_gerado` → Status: `waiting_payment`

**Comportamento**:
- Valida secret via `CAKTO_WEBHOOK_SECRET`
- Upsert em `subscriptions` vinculando `cakto_id` ao `user_id`
- Atualiza `plan_name`, `amount`, `current_period_end`

---

#### `GET /api/webhook/telegram/[bot_id]`

**Descrição**: Health check do webhook

**Response**:
```json
{
  "status": "active",
  "service": "TrackGram Webhook v3.2 (Refactored)"
}
```

---

#### `GET /api/bet/webhook`

**Descrição**: Health check do webhook da bet

**Response**:
```json
{
  "status": "ok",
  "message": "Bet webhook endpoint is active",
  "events": {
    "register": "Sends Lead event to Facebook CAPI",
    "deposit": "Sends Purchase event with value to Facebook CAPI"
  },
  "usage": "POST with { email, phone, valor?, status?, transaction_status?, currency? }"
}
```

---

### Rotas de Páginas

#### `GET /t/[slug]`

**Descrição**: Página pública de tracking

**Query Parameters**: Todos os parâmetros de tracking (fbclid, UTMs, etc.)

**Comportamento**:
- Server Component busca funil pelo slug (Service Role)
- Captura headers: IP, User-Agent, Geo (Vercel)
- Client Component inicializa tracking e Facebook Pixel
- Gera/recupera visitor_id
- Envia PageView para `/api/track`
- Botão/link chama `/api/invite` e redireciona

---

#### `GET /login`

**Descrição**: Página de login

**Comportamento**:
- Formulário de email/senha
- Usa `supabase.auth.signInWithPassword()`
- Redireciona para `/` após login

---

#### `GET /auth/callback`

**Descrição**: Callback OAuth do Supabase

**Comportamento**:
- Processa código de autorização
- Troca por sessão
- Redireciona para `/`

---

#### `GET /auth/reset-password`

**Descrição**: Página de reset de senha

---

#### `GET /quiz`

**Descrição**: Página de quiz (pública)

---

#### `GET /landing-preview`

**Descrição**: Preview de landing page

---

#### `GET /a1c909fe301e7082`

**Descrição**: Rota especial (protegida, possivelmente para integração)

---

## Conclusão

O **TrackGram** é um sistema robusto e escalável que resolve efetivamente o problema de atribuição em campanhas para Telegram. A arquitetura serverless, combinada com RLS do Supabase e integração direta com APIs externas, garante segurança, performance e escalabilidade.

A versão atual (4.1) inclui:

- ✅ **Direct Link Mode v4.1 (Instant Intercept)**: Script que elimina a página `/t/slug` - intercepta clicks instantaneamente e substitui links automaticamente
- ✅ **Loading UI Elegante**: Modal com spinner, animações e fallback manual após 3 segundos
- ✅ **Bet Tracking System Completo**: Rastreamento do funil Landing → Telegram → Bet com eventos CAPI de cadastro e depósito
- ✅ **Matching Robusto**: Sistema de matching por IP e User-Agent fuzzy quando visitor_id não disponível
- ✅ **Funis Isolados por Afiliado**: Tabelas dedicadas (`bet_leads_lucasmagnotti`, `bet_leads_pedrozutti`) para evitar poluição de dados
- ✅ **Geolocalização Completa**: Captura de city, state, country, postal_code de múltiplas fontes
- ✅ **Arquitetura de Serviços Refatorada**: Handlers modulares (JoinHandler, MessageHandler, ConversionService, AttributionService)
- ✅ **Integração Pushcut**: Notificações push em tempo real para iOS com templates customizáveis
- ✅ **Multi-Pixel Support**: Envio de eventos para múltiplos pixels simultaneamente (Promise.allSettled)
- ✅ **Analytics de UTMs Avançado**: Página com tabs de campanhas/conjuntos/anúncios, filtros de data e drill-down
- ✅ **Captura de Ads IDs**: Suporte completo a campaign_id, adset_id, ad_id do Meta Ads
- ✅ **MutationObserver**: Detecção automática de links adicionados dinamicamente (SPAs)
- ✅ **Deduplicação de Eventos**: Prevenção de eventos duplicados em janela de 5 minutos
- ✅ **Métricas Únicas**: Função `get_dashboard_metrics` com contagem de únicos (unique_pageviews, unique_joins)

### Estatísticas do Banco de Dados (Janeiro 2025)

- **Events**: 16.163 registros
- **Visitor Telegram Links**: 4.712 vinculações
- **CAPI Logs**: 7.819 logs de envio
- **Telegram Message Logs**: 4.070 mensagens
- **Bet Leads**: 1.808 leads (geral)
- **Bet Leads Lucas Magnotti**: 295 leads
- **Bet Leads Pedro Zutti**: 99 leads
- **Pushcut Logs**: 2.206 notificações enviadas
- **Usuários**: 4 perfis
- **Funis**: 2 funis ativos
- **Pixels**: 2 pixels configurados
- **Domínios**: 2 domínios configurados

---

A documentação acima reflete o estado atual do sistema (Janeiro 2025) após análise completa do código, banco de dados e integrações. Deve ser atualizada conforme novas funcionalidades forem implementadas.

---

**Última atualização**: Janeiro 2025  
**Versão do Sistema**: 4.1  
**Autor**: Análise Técnica Completa e Detalhada  
**Projeto Supabase**: TeleTrack (qwqgefuvxnlruiqcgsil)  
**PostgreSQL**: 17.6.1

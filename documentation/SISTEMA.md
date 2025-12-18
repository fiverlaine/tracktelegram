# TrackGram - Sistema de Rastreamento para Telegram

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Objetivo do Projeto](#objetivo-do-projeto)
3. [Arquitetura Geral](#arquitetura-geral)
4. [Stack Tecnológica](#stack-tecnológica)
5. [Estrutura de Pastas](#estrutura-de-pastas)
6. [Fluxos Principais](#fluxos-principais)
7. [Integração com Telegram](#integração-com-telegram)
8. [Integração com Supabase](#integração-com-supabase)
9. [Banco de Dados](#banco-de-dados)
10. [Tracking e UTMs](#tracking-e-utms)
11. [Autenticação e Segurança](#autenticação-e-segurança)
12. [Sistema de Assinaturas](#sistema-de-assinaturas)
13. [Deploy e Ambientes](#deploy-e-ambientes)
14. [Variáveis de Ambiente](#variáveis-de-ambiente)
15. [Pontos de Atenção e Melhorias](#pontos-de-atenção-e-melhorias)

---

## Visão Geral

O **TrackGram** (também conhecido como **TeleTrack**) é um **SaaS (Software as a Service)** de rastreamento avançado que resolve a **"cegueira de dados"** em campanhas de anúncios para Telegram. O sistema atua como middleware entre o anúncio e o canal do Telegram, capturando parâmetros de rastreamento antes do redirecionamento, gerando links de convite únicos para cada visitante e utilizando um bot proprietário para detectar a entrada (join) no canal. Quando a entrada é confirmada, o sistema dispara um evento "Lead" via **Facebook Conversions API (CAPI)** com alta qualidade de correspondência (Event Match Quality - EMQ).

### Proposta de Valor

- **Atribuição Precisa**: Saiba exatamente qual anúncio gerou cada membro do canal
- **Otimização de ROI**: Alimente o algoritmo do Facebook com dados reais de conversão para baixar o custo por lead
- **Fluxo sem Fricção**: Redirecionamento direto para o canal de forma transparente para o usuário final
- **Multi-Pixel Support**: Envie eventos para múltiplos pixels simultaneamente
- **Domínios Personalizados**: Use seus próprios domínios para rastreamento

---

## Objetivo do Projeto

### Problema Resolvido

Anunciantes que utilizam o Telegram como canal de aquisição sofrem com a "cegueira de dados". As ferramentas tradicionais de analytics perdem o rastreamento no momento em que o usuário clica para abrir o aplicativo do Telegram, impedindo a atribuição correta de conversões e otimização de campanhas no Facebook Ads (Meta).

### Solução

O TrackGram captura os parâmetros de rastreamento (fbclid, fbc, fbp, user_agent) **antes** do redirecionamento, gera links de convite únicos para cada visitante e utiliza um bot proprietário para detectar a entrada (join) no canal. Quando a entrada é confirmada, o sistema dispara um evento "Lead" via Facebook Conversions API (CAPI) com alta qualidade de correspondência.

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
│                    NEXT.JS APP (Vercel)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API Routes:                                             │   │
│  │  - /api/track (PageView/Click events)                   │   │
│  │  - /api/invite (Gera link único Telegram)               │   │
│  │  - /api/webhook/telegram/[bot_id] (Recebe webhooks)     │   │
│  │  - /api/tracking-script.js (Script externo)              │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┴────────────────────┐
        ▼                                          ▼
┌──────────────────────┐              ┌──────────────────────┐
│   SUPABASE (PostgreSQL)             │   TELEGRAM BOT API    │
│  - Events                           │  - createChatInviteLink│
│  - Funnels                          │  - Webhooks          │
│  - Pixels                           │  - chat_member       │
│  - Visitor Links                    │  - chat_join_request │
└──────────────────────┘              └──────────────────────┘
        │                                          │
        └────────────────────┬─────────────────────┘
                             ▼
                    ┌──────────────────────┐
                    │  FACEBOOK CAPI        │
                    │  (Conversions API)   │
                    └──────────────────────┘
```

### Fluxo de Rastreamento Completo (v3.1+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              FLUXO DIRETO (SEM BOT INTERMEDIÁRIO) v3.1+ - CAPI              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Facebook Ads → Landing Page Externa (com tracking-script.js)   
│ 
│      botao da pagina com funil: seusite.com/t/{slug}?fbclid=xyz             │
│                                                                             │
│                                                                             │
│  2. Página captura: fbclid, fbc, fbp, User-Agent, IP, Geo                  │
│     → Gera/recupera visitor_id (UUID)                                      │
│     → Salva evento "pageview" no Supabase                                  │
│     → Armazena: fbc, fbp, user_agent, ip_address, geo no metadata         │
│                                                                             │
│  3. Usuário clica em botão/link                                             │
│     → Salva evento "click" no Supabase                                     │
│     → Chama API /api/invite (POST)                                         │
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
- ✅ **Fallback**: Se falhar, usa link estático como backup
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

### Backend

- **Runtime**: Node.js (Vercel Serverless Functions)
- **Banco de Dados**: Supabase (PostgreSQL 17.6.1)
- **Autenticação**: Supabase Auth (Magic Link + Email/Password)
- **ORM/Query**: Supabase Client (@supabase/ssr 0.8.0)

### Integrações Externas

- **Telegram Bot API**: API REST direta (fetch)
- **Facebook Conversions API**: API REST direta (fetch)
- **Facebook Pixel**: Client-side (fbevents.js)

### Deploy e Infraestrutura

- **Hospedagem**: Vercel
- **Região**: gru1 (São Paulo, Brasil)
- **CDN**: Vercel Edge Network
- **Database**: Supabase (us-west-2)

---

## Estrutura de Pastas

```
track-gram/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # Grupo de rotas protegidas
│   │   │   ├── layout.tsx           # Layout do dashboard (sidebar)
│   │   │   ├── page.tsx             # Dashboard principal
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
│   │   │   └── utms/                # Análise de UTMs
│   │   │       └── page.tsx
│   │   ├── api/                     # API Routes
│   │   │   ├── track/               # Endpoint para eventos externos
│   │   │   │   └── route.ts
│   │   │   ├── invite/              # Gerar links de convite
│   │   │   │   └── route.ts
│   │   │   ├── webhook/
│   │   │   │   ├── telegram/
│   │   │   │   │   └── [bot_id]/
│   │   │   │   │       └── route.ts # Webhook handler Telegram
│   │   │   │   └── cakto/           # Webhook assinaturas (Cakto)
│   │   │   │       └── route.ts
│   │   │   ├── tracking-script.js/  # Script para landing pages
│   │   │   │   └── route.ts
│   │   │   └── invite/              # API de convites (GET/POST)
│   │   │       └── route.ts
│   │   ├── auth/
│   │   │   └── callback/            # Callback OAuth Supabase
│   │   │       └── route.ts
│   │   ├── login/                   # Página de login
│   │   │   └── page.tsx
│   │   ├── t/                       # Páginas de tracking (públicas)
│   │   │   └── [slug]/
│   │   │       ├── page.tsx         # Server Component
│   │   │       └── client-tracking.tsx # Client Component
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
│   │   │   └── ...
│   │   ├── theme-provider.tsx       # Provider de tema
│   │   └── theme-toggle.tsx         # Toggle dark/light
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # Cliente browser
│   │   │   ├── server.ts            # Cliente server
│   │   │   └── middleware.ts        # Middleware de sessão
│   │   ├── facebook-capi.ts         # Função CAPI
│   │   ├── telegram-service.ts      # Serviço Telegram
│   │   └── utils.ts                 # Utilitários
│   ├── actions/                     # Server Actions
│   │   ├── channels.ts              # CRUD canais
│   │   ├── funnels.ts               # CRUD funis
│   │   ├── pixels.ts                # CRUD pixels
│   │   ├── domains.ts               # CRUD domínios
│   │   ├── messages.ts              # Mensagens
│   │   └── telegram.ts              # Ações Telegram
│   ├── hooks/
│   │   └── use-subscription.ts      # Hook de assinatura
│   ├── config/
│   │   └── subscription-plans.ts    # Configuração de planos
│   └── types/
│       └── facebook-sdk.d.ts        # Tipos Facebook SDK
├── documentation/                   # Documentação
│   ├── SISTEMA.md                   # Esta documentação
│   ├── PRD.md                       # Product Requirements
│   └── ANALISE_COMPLETA.md          # Análise técnica
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
   - Domínio verificado (obrigatório)
4. Preenche formulário:
   - Nome da campanha
   - Slug (opcional, auto-gerado se vazio)
   - Seleção de pixels (multi-seleção)
   - Seleção de bot/canal
5. Sistema cria:
   - Registro em funnels (com pixel_id primário)
   - Registros em funnel_pixels (many-to-many)
6. Retorna link: /t/{slug}
```

### 2. Fluxo de Tracking (Página /t/[slug])

```
1. Visitante acessa /t/{slug}?fbclid=xyz
2. Server Component (page.tsx):
   - Busca funil pelo slug (Service Role para bypass RLS)
   - Captura headers: IP, User-Agent, Geo (Vercel)
   - Passa dados para Client Component
3. Client Component (client-tracking.tsx):
   - Gera/recupera visitor_id (localStorage ou URL)
   - Captura parâmetros Facebook (fbclid, fbc, fbp)
   - Inicializa Facebook Pixel (se configurado)
   - Chama /api/invite (POST) com metadata
4. API /api/invite:
   - Salva evento "click" no Supabase
   - Gera link único via Telegram API
   - Salva mapeamento em visitor_telegram_links
   - Retorna link único
5. Client redireciona para t.me/+XXXXX
```

### 3. Fluxo de Webhook (Entrada no Canal)

```
1. Usuário entra no canal via link único
2. Telegram envia webhook para /api/webhook/telegram/{bot_id}
3. Webhook Handler processa:
   a. Detecta evento: chat_member (join) ou chat_join_request
   b. Extrai invite_link.name: "v_{visitor_id}"
   c. Busca visitor_id na tabela visitor_telegram_links
   d. Recupera metadata do evento "click"
   e. Salva evento "join" no Supabase
   f. Busca pixels do funil (legacy + multi-pixel)
   g. Envia CAPI "Lead" para todos os pixels (Promise.all)
   h. Salva log em capi_logs
   i. (Opcional) Envia mensagem de boas-vindas
   j. (Opcional) Revoga link de convite
4. Retorna 200 OK
```

### 4. Fluxo de Tracking Externo (Script)

```
1. Landing page externa inclui:
   <script src="https://app.com/api/tracking-script.js?id={domain_id}"></script>
2. Script injeta:
   - Facebook Pixel (se configurado no domínio)
   - Tracking de pageview/click
3. Script captura:
   - visitor_id (localStorage ou URL)
   - fbclid, fbc, fbp
   - UTMs
   - User-Agent, IP (via API)
4. Envia eventos para /api/track:
   - PageView (com filtro de origem paga)
   - Click (quando botão é clicado)
5. API /api/track:
   - Valida origem (fbclid ou fbc)
   - Salva evento no Supabase
   - Envia CAPI PageView (se origem paga)
```

---

## Integração com Telegram

### Bot API Endpoints Utilizados

| Endpoint | Método | Uso |
|----------|--------|-----|
| `getMe` | GET | Validar token do bot |
| `getChat` | GET | Verificar conexão com canal |
| `getChatMember` | GET | Verificar se bot é admin |
| `getChatAdministrators` | GET | Listar admins do canal |
| `getChatMemberCount` | GET | Contar membros |
| `createChatInviteLink` | POST | Gerar link único |
| `revokeChatInviteLink` | POST | Revogar link após uso |
| `setWebhook` | POST | Configurar webhook |
| `getWebhookInfo` | GET | Verificar status webhook |
| `deleteWebhook` | POST | Remover webhook |
| `sendMessage` | POST | Enviar mensagens |
| `approveChatJoinRequest` | POST | Aprovar entrada (join request) |

### Configuração de Webhook

O webhook é configurado automaticamente quando o usuário clica em "Ativar Rastreamento" na página de Canais:

```typescript
// URL do webhook
const webhookUrl = `${NEXT_PUBLIC_APP_URL}/api/webhook/telegram/${bot_id}`;

// Configuração
await fetch(`https://api.telegram.org/bot${bot_token}/setWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: webhookUrl })
});
```

### Tipos de Eventos Processados

1. **chat_member**: Entrada/saída de membros
2. **chat_join_request**: Solicitação de entrada (canais privados)
3. **message**: Mensagens privadas com o bot (legacy /start)

---

## Integração com Supabase

### Clientes Supabase

#### 1. Browser Client (`lib/supabase/client.ts`)
- Usa `createBrowserClient` do `@supabase/ssr`
- Configura cookies com domínio personalizado
- Max age: 1 ano
- Secure em produção

#### 2. Server Client (`lib/supabase/server.ts`)
- Usa `createServerClient` do `@supabase/ssr`
- Integra com cookies do Next.js
- Usado em Server Components e Server Actions

#### 3. Service Role Client
- Criado inline quando necessário (API Routes)
- Bypassa RLS para operações administrativas
- Usado em:
  - `/api/track` (eventos públicos)
  - `/api/invite` (geração de links)
  - `/api/webhook/telegram` (webhooks)
  - `/t/[slug]/page.tsx` (buscar funil público)

### Middleware de Autenticação

O middleware (`src/middleware.ts`) protege rotas autenticadas:

```typescript
// Rotas protegidas
const protectedRoutes = [
  "/channels", "/domains", "/funnels", "/logs",
  "/messages", "/pixels", "/postbacks", "/subscription", "/utms", "/"
];

// Se não autenticado, redireciona para /login
```

### RLS (Row Level Security)

Todas as tabelas principais têm RLS habilitado:

- ✅ **profiles**: Usuários só veem seu próprio perfil
- ✅ **pixels**: Usuários só veem seus próprios pixels
- ✅ **telegram_bots**: Usuários só veem seus próprios bots
- ✅ **funnels**: Usuários só veem seus próprios funis
- ✅ **events**: Usuários veem eventos de seus funis
- ✅ **domains**: Usuários só veem seus próprios domínios
- ✅ **subscriptions**: Usuários só veem sua própria assinatura

**Exceções:**
- Tabela `events` permite leitura pública para eventos sem `funnel_id` (tracking externo)
- Tabela `funnels` permite leitura pública para buscar por slug (tracking page)

---

## Banco de Dados

### Modelo de Dados Completo

#### 1. `profiles`
Perfis de usuários (espelha `auth.users`).

| Coluna | Tipo | Descrição | Constraints |
|--------|------|-----------|-------------|
| `id` | UUID | ID do usuário | PK, FK → auth.users.id |
| `email` | TEXT | Email | Nullable |
| `full_name` | TEXT | Nome completo | Nullable |
| `avatar_url` | TEXT | URL do avatar | Nullable |
| `created_at` | TIMESTAMPTZ | Data de criação | Default: now() |

**RLS**: ✅ Habilitado - Usuários só veem/editam seu próprio perfil

**Trigger**: `handle_new_user` - Cria perfil automaticamente quando usuário é criado em `auth.users`

---

#### 2. `pixels`
Configurações de pixels do Facebook.

| Coluna | Tipo | Descrição | Constraints |
|--------|------|-----------|-------------|
| `id` | UUID | ID único | PK, Default: uuid_generate_v4() |
| `user_id` | UUID | Usuário | FK → profiles.id, NOT NULL |
| `name` | TEXT | Nome identificador | NOT NULL |
| `pixel_id` | TEXT | ID do Pixel Facebook | NOT NULL |
| `access_token` | TEXT | Token CAPI | NOT NULL |
| `created_at` | TIMESTAMPTZ | Data de criação | Default: now() |

**RLS**: ✅ Habilitado - Usuários só veem/editam seus próprios pixels

**Índices**:
- `idx_pixels_user_id` (user_id)

**Relacionamentos**:
- Um pixel pode estar em múltiplos funis (via `funnel_pixels`)
- Um pixel pode estar em múltiplos domínios (via `domain_pixels`)

---

#### 3. `telegram_bots`
Bots do Telegram configurados.

| Coluna | Tipo | Descrição | Constraints |
|--------|------|-----------|-------------|
| `id` | UUID | ID único | PK, Default: uuid_generate_v4() |
| `user_id` | UUID | Usuário | FK → profiles.id, NOT NULL |
| `name` | TEXT | Nome identificador | NOT NULL |
| `bot_token` | TEXT | Token do bot (BotFather) | NOT NULL |
| `username` | TEXT | Username do bot | Nullable |
| `channel_link` | TEXT | Link de convite do canal | Nullable |
| `chat_id` | TEXT | ID numérico do chat/canal | Nullable |
| `created_at` | TIMESTAMPTZ | Data de criação | Default: now() |

**RLS**: ✅ Habilitado - Usuários só veem/editam seus próprios bots

**Índices**:
- `idx_telegram_bots_user_id` (user_id)
- `idx_telegram_bots_bot_token` (bot_token)

**Relacionamentos**:
- Um bot pode estar em múltiplos funis

---

#### 4. `funnels`
Funis de rastreamento (conectam Pixel + Bot).

| Coluna | Tipo | Descrição | Constraints |
|--------|------|-----------|-------------|
| `id` | UUID | ID único | PK, Default: uuid_generate_v4() |
| `user_id` | UUID | Usuário | FK → profiles.id, NOT NULL |
| `name` | TEXT | Nome da campanha | NOT NULL |
| `slug` | TEXT | Slug único para URL | NOT NULL, UNIQUE |
| `pixel_id` | UUID | Pixel primário (legacy) | FK → pixels.id, Nullable |
| `bot_id` | UUID | Bot/Canal de destino | FK → telegram_bots.id, Nullable |
| `use_join_request` | BOOLEAN | Usar join request | Default: false |
| `created_at` | TIMESTAMPTZ | Data de criação | Default: now() |

**RLS**: ✅ Habilitado - Usuários só veem/editam seus próprios funis

**Índices**:
- `idx_funnels_user_id` (user_id)
- `idx_funnels_slug` (slug) - UNIQUE
- `idx_funnels_pixel_id` (pixel_id)
- `idx_funnels_bot_id` (bot_id)

**Relacionamentos**:
- **Many-to-Many com pixels**: Via tabela `funnel_pixels`
- Um funil pode ter múltiplos pixels (multi-pixel support)
- Um funil tem um bot/canal de destino

---

#### 5. `funnel_pixels`
Tabela de junção (Many-to-Many: Funis ↔ Pixels).

| Coluna | Tipo | Descrição | Constraints |
|--------|------|-----------|-------------|
| `funnel_id` | UUID | Funil | PK, FK → funnels.id |
| `pixel_id` | UUID | Pixel | PK, FK → pixels.id |
| `created_at` | TIMESTAMPTZ | Data de criação | Default: now() |

**RLS**: ✅ Habilitado - Usuários só veem pixels de seus próprios funis

**Índices**:
- `funnel_pixels_pkey` (funnel_id, pixel_id) - UNIQUE
- `funnel_pixels_pixel_id_idx` (pixel_id)

---

#### 6. `events`
Todos os eventos rastreados.

| Coluna | Tipo | Descrição | Constraints |
|--------|------|-----------|-------------|
| `id` | UUID | ID único | PK, Default: uuid_generate_v4() |
| `funnel_id` | UUID | Funil | FK → funnels.id, Nullable |
| `visitor_id` | TEXT | ID único do visitante | NOT NULL |
| `event_type` | TEXT | Tipo do evento | NOT NULL, CHECK: pageview|click|join|leave|join_request |
| `metadata` | JSONB | Dados adicionais | Default: '{}' |
| `created_at` | TIMESTAMPTZ | Data do evento | Default: now() |

**RLS**: ✅ Habilitado - Usuários veem eventos de seus funis OU eventos sem funnel_id (tracking externo)

**Índices**:
- `idx_events_visitor_id` (visitor_id)
- `idx_events_funnel_id` (funnel_id)
- `idx_events_event_type` (event_type)
- `idx_events_created_at` (created_at)
- `idx_events_metadata` (metadata) - GIN
- `events_dedup_idx` (visitor_id, event_type, created_at)

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
  "source": "telegram_webhook|server_api_invite|external_script",
  "telegram_user_id": 123456789,
  "telegram_username": "string",
  "chat_id": "string",
  "chat_title": "string",
  "invite_name": "v_visitor_id"
}
```

---

#### 7. `visitor_telegram_links`
Vinculação entre visitor_id (página) e telegram_user_id.

| Coluna | Tipo | Descrição | Constraints |
|--------|------|-----------|-------------|
| `id` | UUID | ID único | PK, Default: uuid_generate_v4() |
| `visitor_id` | TEXT | ID do visitante | NOT NULL |
| `telegram_user_id` | BIGINT | ID do usuário no Telegram | NOT NULL, Default: 0 |
| `telegram_username` | TEXT | Username no Telegram | Nullable |
| `funnel_id` | UUID | Funil | FK → funnels.id, Nullable |
| `bot_id` | UUID | Bot | FK → telegram_bots.id, Nullable |
| `linked_at` | TIMESTAMPTZ | Data da vinculação | Default: now() |
| `metadata` | JSONB | Dados adicionais | Default: '{}' |

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
  "linked_via": "dynamic_invite|pool_invite|/start",
  "requires_approval": false,
  "chat_id": "-1001234567890",
  "chat_title": "Meu Canal VIP"
}
```

---

#### 8. `domains`
Domínios personalizados para tracking externo.

| Coluna | Tipo | Descrição | Constraints |
|--------|------|-----------|-------------|
| `id` | UUID | ID único | PK, Default: uuid_generate_v4() |
| `user_id` | UUID | Usuário | FK → profiles.id, NOT NULL |
| `domain` | TEXT | Domínio (ex: meusite.com) | NOT NULL |
| `verified` | BOOLEAN | Domínio verificado | Default: false |
| `verification_token` | TEXT | Token de verificação | Nullable |
| `pixel_id` | UUID | Pixel primário (legacy) | FK → pixels.id, Nullable |
| `funnel_id` | UUID | Funil associado | FK → funnels.id, Nullable |
| `created_at` | TIMESTAMPTZ | Data de criação | Default: now() |

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

| Coluna | Tipo | Descrição | Constraints |
|--------|------|-----------|-------------|
| `domain_id` | UUID | Domínio | PK, FK → domains.id |
| `pixel_id` | UUID | Pixel | PK, FK → pixels.id |
| `created_at` | TIMESTAMPTZ | Data de criação | Default: now() |

**RLS**: ✅ Habilitado - Usuários só veem pixels de seus próprios domínios

**Índices**:
- `domain_pixels_pkey` (domain_id, pixel_id) - UNIQUE
- `domain_pixels_domain_id_idx` (domain_id)
- `domain_pixels_pixel_id_idx` (pixel_id)

---

#### 10. `capi_logs`
Logs de envio para Facebook CAPI.

| Coluna | Tipo | Descrição | Constraints |
|--------|------|-----------|-------------|
| `id` | UUID | ID único | PK, Default: gen_random_uuid() |
| `visitor_id` | TEXT | ID do visitante | Nullable |
| `funnel_id` | UUID | Funil | FK → funnels.id, Nullable |
| `event_name` | TEXT | Nome do evento | NOT NULL |
| `pixel_id` | TEXT | ID do pixel | Nullable |
| `status` | TEXT | success|error|skipped | NOT NULL |
| `request_payload` | JSONB | Payload enviado | Nullable |
| `response_payload` | JSONB | Resposta do Facebook | Nullable |
| `error_message` | TEXT | Mensagem de erro | Nullable |
| `created_at` | TIMESTAMPTZ | Data do log | Default: now() |

**RLS**: ✅ Habilitado - Usuários veem logs de seus próprios funis

**Índices**:
- `idx_capi_logs_visitor_id` (visitor_id)
- `idx_capi_logs_funnel_id` (funnel_id)
- `idx_capi_logs_status` (status)
- `idx_capi_logs_created_at` (created_at DESC)

---

#### 11. `subscriptions`
Assinaturas de usuários (integração com Cakto).

| Coluna | Tipo | Descrição | Constraints |
|--------|------|-----------|-------------|
| `id` | UUID | ID único | PK, Default: gen_random_uuid() |
| `user_id` | UUID | Usuário | FK → auth.users.id, NOT NULL, UNIQUE |
| `cakto_id` | TEXT | ID da assinatura no Cakto | UNIQUE, Nullable |
| `status` | TEXT | active|canceled|past_due|waiting_payment | NOT NULL |
| `plan_name` | TEXT | Nome do plano | Nullable |
| `amount` | NUMERIC | Valor | Nullable |
| `current_period_end` | TIMESTAMPTZ | Fim do período | Nullable |
| `created_at` | TIMESTAMPTZ | Data de criação | Default: now() |
| `updated_at` | TIMESTAMPTZ | Data de atualização | Default: now() |

**RLS**: ✅ Habilitado - Usuários só veem sua própria assinatura

**Índices**:
- `subscriptions_user_id_key` (user_id) - UNIQUE
- `subscriptions_cakto_id_key` (cakto_id) - UNIQUE

---

#### 12. `funnel_welcome_settings`
Configurações de mensagens de boas-vindas.

| Coluna | Tipo | Descrição | Constraints |
|--------|------|-----------|-------------|
| `funnel_id` | UUID | Funil | PK, FK → funnels.id |
| `is_active` | BOOLEAN | Ativo | Default: false |
| `message_text` | TEXT | Texto da mensagem | Nullable |
| `buttons_config` | JSONB | Configuração de botões | Default: '[]' |
| `image_url` | TEXT | URL da imagem | Nullable |
| `created_at` | TIMESTAMPTZ | Data de criação | Default: now() |
| `updated_at` | TIMESTAMPTZ | Data de atualização | Default: now() |

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

| Coluna | Tipo | Descrição | Constraints |
|--------|------|-----------|-------------|
| `id` | UUID | ID único | PK, Default: uuid_generate_v4() |
| `funnel_id` | UUID | Funil | FK → funnels.id, Nullable |
| `telegram_chat_id` | TEXT | ID do chat | NOT NULL |
| `telegram_user_name` | TEXT | Nome do usuário | Nullable |
| `direction` | TEXT | inbound|outbound | Nullable |
| `message_content` | TEXT | Conteúdo da mensagem | Nullable |
| `status` | TEXT | sent|received|failed | Default: 'sent' |
| `created_at` | TIMESTAMPTZ | Data do log | Default: now() |

**RLS**: ✅ Habilitado - Usuários veem logs de seus próprios funis

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
    "leaves": 0
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
- Suporta filtros por funil e pixel
- Inclui eventos de domínios externos (via metadata.domain_id)
- Usa CTEs para performance

---

#### `handle_new_user`

**Propósito**: Trigger function que cria perfil automaticamente quando usuário é criado.

**Trigger**: `auth.users` → `INSERT`

**Ação**: Cria registro em `profiles` com mesmo `id` do `auth.users`

---

### Triggers

1. **`handle_new_user`**: Cria perfil automaticamente ao criar usuário em `auth.users`

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

### Tracking Script Externo

O script `/api/tracking-script.js` pode ser incluído em landing pages externas:

```html
<script src="https://app.com/api/tracking-script.js?id={domain_id}"></script>
```

**Funcionalidades**:
- Inicializa Facebook Pixel (se configurado no domínio)
- Captura visitor_id (localStorage ou URL)
- Captura parâmetros Facebook e UTMs
- Decora links internos com parâmetros
- Envia eventos para `/api/track`
- Suporta slug forçado (se configurado no domínio)

---

## Autenticação e Segurança

### Autenticação

O sistema usa **Supabase Auth** com dois métodos:

1. **Email/Password**: Login tradicional
2. **Magic Link**: (Não implementado atualmente, mas suportado)

### Fluxo de Autenticação

```
1. Usuário acessa /login
2. Preenche email e senha
3. Sistema chama supabase.auth.signInWithPassword()
4. Supabase valida credenciais
5. Middleware atualiza sessão (cookies)
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

### Service Role Key

A `SUPABASE_SERVICE_ROLE_KEY` é usada apenas em:
- API Routes (server-side)
- Operações que precisam bypass RLS (ex: buscar funil público)

**⚠️ IMPORTANTE**: Nunca exponha a Service Role Key no client-side!

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

### Planos Disponíveis

| Plano | Preço | Domínios | Pixels | Canais | Funis | Leads/mês |
|-------|-------|----------|--------|--------|-------|-----------|
| **Starter** | R$ 97 | 2 | 2 | 1 | 5 | 20.000 |
| **Pro Scale** | R$ 197 | 4 | 4 | 2 | 10 | 100.000 |
| **Agency** | R$ 297 | 10 | 10 | 2 | Ilimitado | Ilimitado |

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
    .select("*", { count: 'exact', head: true })
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

| Variável | Tipo | Descrição | Obrigatório |
|----------|------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | URL do projeto Supabase | ✅ Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Chave anônima do Supabase | ✅ Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Chave de serviço (server-side) | ✅ Sim |
| `NEXT_PUBLIC_APP_URL` | Public | URL da aplicação | ✅ Sim |
| `CAKTO_WEBHOOK_SECRET` | Secret | Secret do webhook Cakto | ❌ Opcional |

---

## Pontos de Atenção e Melhorias

### ⚠️ Pontos de Atenção

1. **Webhook Handler**: Processa múltiplos pixels sequencialmente (Promise.all) - pode ser otimizado com rate limiting
2. **Deduplicação de Eventos**: Baseada em tempo (5 minutos) - pode melhorar com event_id único
3. **Fallback de Link**: Se falhar ao gerar link dinâmico, usa link estático (perde rastreamento único)
4. **Chat ID Manual**: Requer inserção manual do chat_id em alguns casos
5. **RLS em Events**: Permite leitura pública para eventos sem funnel_id (necessário para tracking externo)

### 🔧 Melhorias Futuras

#### Curto Prazo
- [ ] Implementar rate limiting no webhook handler
- [ ] Melhorar tratamento de erros na página de tracking
- [ ] Adicionar validação de bot_token antes de gerar link
- [ ] Implementar retry logic para CAPI
- [ ] Adicionar webhook secret para Telegram

#### Médio Prazo
- [ ] Pool de links pré-gerados (para performance)
- [ ] Dashboard de analytics avançado
- [ ] Exportação de relatórios (CSV/PDF)
- [ ] Notificações por email (novos leads)
- [ ] A/B testing de mensagens de boas-vindas

#### Longo Prazo
- [ ] Multi-tenant completo (organizações)
- [ ] API pública para integrações
- [ ] Webhooks customizados (postbacks)
- [ ] Integração com outras plataformas (Google Ads, TikTok)
- [ ] Machine Learning para otimização de conversão

### 📊 Performance

**Otimizações Implementadas**:
- ✅ Índices adequados em todas as tabelas
- ✅ GIN index em campos JSONB
- ✅ RPC function para métricas (agregação no banco)
- ✅ Promise.all para múltiplos pixels (paralelo)
- ✅ Deduplicação de eventos (evita duplicatas)

**Oportunidades de Melhoria**:
- Cache de configurações de funis (Redis)
- CDN para assets estáticos
- Compressão de payloads CAPI
- Batch processing de eventos

---

## Conclusão

O **TrackGram** é um sistema robusto e escalável que resolve efetivamente o problema de atribuição em campanhas para Telegram. A arquitetura serverless, combinada com RLS do Supabase e integração direta com APIs externas, garante segurança, performance e escalabilidade.

A documentação acima reflete o estado atual do sistema (Dezembro 2024) e deve ser atualizada conforme novas funcionalidades forem implementadas.

---

**Última atualização**: Dezembro 2024  
**Versão do Sistema**: 3.1+  
**Autor**: Análise Técnica Completa

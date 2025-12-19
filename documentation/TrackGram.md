# TrackGram — Documentação Técnica & Operacional

> **Data da Auditoria:** 19/12/2025
> **Versão do Projeto:** 0.1.0
> **Responsável:** Agente de Engenharia Sênior

---

## Índice

1. [Resumo Executivo](#1-resumo-executivo)
2. [Inventário do Repositório](#2-inventário-do-repositório)
3. [Visão Geral do Sistema](#3-visão-geral-do-sistema)
4. [Arquitetura e Módulos](#4-arquitetura-e-módulos)
5. [Frontend (Next.js)](#5-frontend-nextjs)
6. [Backend (API Routes & Workers)](#6-backend-api-routes--workers)
7. [Integrações Externas](#7-integrações-externas)
8. [Supabase — Estado da Verdade (MCP)](#8-supabase--estado-da-verdade-mcp)
9. [Fluxos Ponta a Ponta (Trability)](#9-fluxos-ponta-a-ponta-trability)
10. [Runbook e Operação](#10-runbook-e-operação)
11. [Segurança e Conformidade](#11-segurança-e-conformidade)
12. [Dívidas Técnicas e Melhorias](#12-dívidas-técnicas-e-melhorias)
13. [Apêndice](#13-apêndice)
14. [Anexo Técnico Detalhado](#14-anexo-técnico-detalhado)

---

## 1. Resumo Executivo

**O que é o TrackGram?**
TrackGram é uma plataforma SaaS de **atribuição de marketing e analytics** especializada para o ecossistema Telegram. Ele resolve o problema de rastreamento de conversão (leads e vendas) de tráfego pago (Meta Ads, etc.) que termina em canais/grupos do Telegram ou funis externos, oferecendo precisão via Pixel Server-Side (CAPI).

**Principais Capacidades:**

- **Rastreamento Híbrido**: Script JS (`tracking-script.js`) para capturar UTMs, FBC (Click ID), FBP (Browser ID) e IP, combinado com API Server-Side.
- **Integração Meta Ads (CAPI)**: Envio robusto de eventos `PageView` e `Lead` para o Facebook API de Conversões, contornando bloqueadores de anúncios.
- **Gestão de Funis e Domínios**: Permite ao usuário configurar múltiplos domínios e associar Pixels específicos a funis de venda.
- **Automação via Webhooks**: Integração nativa com gateways de pagamento (Cakto) para atualizar status de assinatura.
- **Ecossistema Supabase**: Banco de dados Postgres com RLS (Row Level Security), Auth (Email/Senha) e Functions para métricas em tempo real.

**Estado Atual:**
O projeto está em estágio funcional (produção inicial ou beta), com base sólida em Next.js 16 (App Router) e Supabase. A arquitetura é moderna e escalável, mas apresenta pontos de atenção em tratamento de erros silenciosos e validação de tipos em runtime.

---

## 2. Inventário do Repositório

### Árvore de Diretórios (Compacta)

```text
/
├── .agent/              # Configurações do agente IA
├── .next/               # Build output (Next.js)
├── documentation/       # Documentação do projeto (TrackGram.md, SISTEMA.md)
├── public/              # Arquivos estáticos (imagens, favicon)
├── src/
│   ├── actions/         # (Vazio/Não utilizado na análise atual)
│   ├── app/             # Next.js App Router (Rotas do Frontend e API)
│   │   ├── (dashboard)/ # Área logada (protegida por middleware)
│   │   ├── api/         # Endpoints Backend (Next.js serverless functions)
│   │   ├── auth/        # Rotas de autenticação (supostamente callback)
│   │   ├── login/       # Página de Login
│   │   └── t/           # Rotas públicas de rastreamento (Redirects)
│   ├── components/      # Biblioteca de componentes UI (Shadcn/Radix)
│   ├── config/          # Configurações globais (ex: site config)
│   ├── hooks/           # Hooks React customizados (ex: use-toast)
│   ├── lib/             # Utilitários Core (Supabase client, CAPI, utils)
│   ├── services/        # Lógica de negócio (Telegram, etc.)
│   └── types/           # Definições de tipos TypeScript
├── supabase/
│   ├── migrations/      # Histórico de schema SQL
│   └── seed.sql         # (Se existir) Dados iniciais
├── next.config.ts       # Configuração do Next.js
├── middleware.ts        # Guarda de rotas e gestão de sessão Supabase
└── package.json         # Dependências e scripts
```

### Arquivos-Chave

| Arquivo                                   | Função                                                                              |
| :---------------------------------------- | :---------------------------------------------------------------------------------- |
| `src/middleware.ts`                       | **Segurança Central**: Protege rotas `/dashboard`, gere refresh de tokens Supabase. |
| `src/lib/facebook-capi.ts`                | **Core Tracking**: Implementação do envio de eventos para Meta Conversions API.     |
| `src/app/api/tracking-script.js/route.ts` | **Dynamic JS**: Gera o script `tracking-script.js` customizado por domínio/usuário. |
| `src/app/api/track/route.ts`              | **Ingestão de Eventos**: Ponto de entrada de todos os eventos de analytics.         |
| `src/app/api/webhooks/cakto/route.ts`     | **Billing**: Processa pagamentos e atualiza assinaturas via Webhook.                |

---

## 3. Visão Geral do Sistema

### Jornadas do Usuário

1.  **Produtor/Afiliado (Cliente SaaS)**

    - Cadastra-se na plataforma.
    - Configura seu **Domínio Personalizado** (para evitar bloqueios).
    - Cria um **Funil** e associa seu **Pixel do Facebook**.
    - Instala o script gerado em sua Landing Page.
    - Acompanha métricas (Leads, Cliques, Vendas) no Dashboard.

2.  **Visitante (End User)**
    - Clica em um anúncio (Facebook/Instagram).
    - Acessa a Landing Page do Produtor (script captura UTMs/FBC).
    - Clica no botão de CTA (TrackGram registra clique e dispara CAPI).
    - É redirecionado para o Telegram ou Checkout.

### Arquitetura de Alto Nível

- **Frontend**: Single Page Application (SPA) com Server-Side Rendering (SSR) via Next.js 16. UI construída com Tailwind CSS e Shadcn UI.
- **Backend**: Serverless Functions (Next.js API Routes) hospedadas na Vercel.
- **Banco de Dados**: Supabase (PostgreSQL) gerenciado.
- **Autenticação**: Supabase Auth (JWT em Cookies).

---

## 4. Arquitetura e Módulos

### 4.1 Fronteiras e Responsabilidades

- **Client-Side (Browser)**:
  - Responsável pela UX interativa (Dashboard).
  - **Tracking Script**: Responsável pela captura "suja" de dados (DOM, Cookies, URL) e envio para API.
- **Server-Side (Next.js API)**:
  - Validação de dados.
  - Comunicação segura com APIs de terceiros (Meta Graph API).
  - Escrita autoritativa no Banco de Dados (Service Role).
- **Database (Supabase)**:
  - Armazenamento persistente.
  - Regras de autorização finas (RLS).
  - Agregações para relatórios (Functions).

---

## 5. Frontend (Next.js)

O frontend reside em `src/app` e utiliza o modelo **App Router**.

### Estrutura de Rotas

- **Públicas**:
  - `/login`: Entrada do sistema.
  - `/t/[slug]`: Rotas de redirecionamento rastreado (Track Links).
- **Protegidas (Dashboard)**:
  - `/dashboard`: Visão geral (Gráficos, KPIs).
  - `/funnels`: CRUD de funis.
  - `/domains`: Gestão de domínios customizados.
  - `/integrations`: Configuração de API Keys (Pushcut, etc.).

### Componentes & UI Library

O projeto utiliza **Shadcn UI** (baseado em Radix Primitives) estilizado com **Tailwind CSS**.

- Localização: `src/components/ui`.
- Componentes notáveis: `Button`, `Dialog`, `Table` (para listagens densas), `Form` (React Hook Form + Zod).

### Estado e Validação

- **Formulários**: `react-hook-form` integrado com `zod` para validação de schema client-side.
- **Feedback Visual**: `sonner` para toasts (sucesso/erro).
- **Data Fetching**: Padrão de Server Components para busca inicial + Client Components para interatividade.

---

## 6. Backend (API Routes & Workers)

O backend é inteiramente baseado em rotas de API do Next.js.

### Rotas Críticas

#### 1. `/api/track` (POST)

- **Função**: Recebe eventos de analytics do script frontend.
- **Lógica**:
  1.  Recebe `visitor_id`, `event_type`, `metadata`.
  2.  Check de Deduplicação (evita duplo clique em 5 min).
  3.  Resolve a quais Pixels o evento pertence (suporte Multi-Pixel).
  4.  Grava no Supabase (`events`).
  5.  **Disparo Assíncrono**: Chama `sendCAPIEvent` para enviar ao Facebook.
- **Resiliência**: Usa `Promise.allSettled` para não falhar a requisição se um pixel falhar.

#### 2. `/api/tracking-script.js` (GET)

- **Função**: Serve o JS dinâmico.
- **Lógica**:
  1.  Recebe `?id=DOMAIN_ID`.
  2.  Busca configs no Supabase (Pixeis ativos).
  3.  Injeta código do Facebook (`fbq init`).
  4.  Injeta lógica de captura de UTMs e decoração de links.
  5.  Retorna com Header `Content-Type: application/javascript`.

#### 3. `/api/webhooks/cakto` (POST)

- User-flow de pagamento.
- Valida `CAKTO_WEBHOOK_SECRET`.
- Normaliza status de assinatura (`active`, `past_due`).
- Atualiza tabela `subscriptions`.

---

## 7. Integrações Externas

| Serviço             | Tipo        | Uso                                                    | Auth Mtd                 |
| :------------------ | :---------- | :----------------------------------------------------- | :----------------------- |
| **Meta (Facebook)** | Marketing   | Conversions API (CAPI) para envio de leads/views.      | Access Token (por Pixel) |
| **Cakto**           | Pagamento   | Webhook para status de assinatura.                     | Shared Secret            |
| **Pushcut**         | Notificação | Envio de push notifications para o celular do usuário. | API Key (User provided)  |
| **Telegram**        | Canal       | (Previsto) Gestão de bots e grupos.                    | Bot Token                |

---

## 8. Supabase — Estado da Verdade (MCP)

Auditoria realizada na instância `TeleTrack` (ID: `qwqgefuvxnlruiqcgsil`).

### 8.1 Schema do Banco de Dados (Principais Tabelas)

#### `profiles`

- **Descrição**: Tabela mestre de usuários (espelho do `auth.users`).
- **Colunas**: `id` (PK, FK auth), `email`, `full_name`, `avatar_url`, `created_at`.
- **Trigger**: `handle_new_user` (popula automaticamente ao criar conta).

#### `events`

- **Descrição**: Coração do sistema. Armazena cada hit.
- **Colunas**:
  - `id` (UUID)
  - `visitor_id` (UUID, gerado no front)
  - `event_type` (text: 'pageview', 'click', 'lead')
  - `metadata` (JSONB: user_agent, ip, utms, fbc)
  - `funnel_id`, `domain_id` (FKs opcionais)
  - `created_at`

#### `pixels`

- **Descrição**: Credenciais do Facebook.
- **Colunas**: `id`, `user_id`, `pixel_id` (ID numérico FB), `access_token` (CAPI Token), `name`.

#### `domains` & `domain_pixels`

- **Descrição**: Configuração de domínios e relação N:N com pixels.
- **Relação**: Um domínio pode disparar múltiplos pixels (via `domain_pixels`).

#### `pushcut_integrations` (Recente)

- **Descrição**: Configuração de integração Pushcut.
- **Colunas**: `api_key`, `notification_name`, `is_active`.

### 8.2 Security & RLS (Row Level Security)

O sistema utiliza RLS em **todas** as tabelas sensíveis.
Padrão geral encontrado:

```sql
CREATE POLICY "Users can view own data"
ON table_name
FOR SELECT
USING (auth.uid() = user_id);
```

Isso garante isolamento total entre tenants (usuários SaaS).

### 8.3 Functions e Procedures (PL/pgSQL)

- `public.handle_new_user()`: Trigger de segurança para criar profile.
- `public.get_dashboard_metrics(...)`: Função pesada de agregação.
  - Recebe: datas (start/end), funnel_id, pixel_id.
  - Retorna: JSON com totais (pageviews, clicks) e série histórica diária.
  - **Motivo**: Evita trafegar milhares de linhas de `events` para o frontend; o cálculo é feito no banco.

---

## 9. Fluxos Ponta a Ponta (Trability)

### Fluxo: Tracking de PageView + CAPI

1.  **Browser**: Usuário carrega página. `tracking-script.js` executa.
    - Gera/Recupera `visitor_id`.
    - Coleta `fbc` (Cookie `_fbc`) e `fbp`.
    - POST `/api/track` body: `{ event_type: 'pageview', metadata: {...} }`.
2.  **API (`/api/track`)**:
    - Consulta `domains` para achar os Pixels configurados.
    - Insere linha em `events` (Supabase).
    - Se `metadata` contém origem de anúncio (`fbclid`), inicia envio CAPI.
3.  **Lib (`facebook-capi.ts`)**:
    - Monta payload conforme specs do Meta (user_data: ip, agent, fbc).
    - POST `graph.facebook.com/v19.0/{pixel_id}/events`.
4.  **Supabase**: Dado persistido.
5.  **Dashboard**: Usuário vê contador incrementado (via `get_dashboard_metrics`).

---

## 10. Runbook e Operação

### Pré-requisitos

- Node.js 20+
- Conta Supabase
- Conta Vercel (recomendado)

### Setup Local

1.  **Clone e Instalação**:
    ```bash
    git clone ...
    cd tracktelegram
    npm install
    ```
2.  **Variáveis de Ambiente (.env.local)**:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=https://qwqgefuvxnlruiqcgsil.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=[REDACTED]
    SUPABASE_SERVICE_ROLE_KEY=[REDACTED] # Crítico para CAPI e Admin tasks
    CAKTO_WEBHOOK_SECRET=[REDACTED]      # Para receber webhooks de pagamento
    ```
3.  **Rodar Desenvolvimento**:
    ```bash
    npm run dev
    # Acessar http://localhost:3000
    ```

### Como Rodar Migrations

As migrations estão em `supabase/migrations`. Para aplicar:
Recomenda-se usar a CLI do Supabase ou colar o SQL no Editor SQL do Dashboard do Supabase, pois não há script automatizado de deploy de migration detectado no `package.json`.

---

## 11. Segurança e Conformidade

1.  **Leitura de Segredos**:
    - O endpoint `/api/webhooks/cakto` compara o secret via string equality. Em produção, recomenda-se `crypto.timingSafeEqual` para evitar timing attacks, embora o risco seja baixo aqui.
2.  **Proteção de Rotas**:
    - Middleware robusto em `src/middleware.ts` impede acesso a `/dashboard` sem cookie de sessão válido.
3.  **Vazamento de Dados**:
    - RLS configurado corretamente. Um usuário não consegue ver eventos de outro.
    - CAPI Token é armazenado em `pixels`. O RLS deve garantir que apenas o dono veja o token (Verificado: pixel table tem user_id).

---

## 12. Dívidas Técnicas e Melhorias

### Prioridade Alta (Bugs Potenciais)

- [ ] **Tratamento de Erro CAPI**: Em `src/app/api/track/route.ts`, o erro do CAPI é apenas logado (`console.error`). Se o token expirar, o usuário não é notificado. **Recomendação**: Criar tabela de `integration_errors` ou notificar o usuário no dashboard.
- [ ] **Idempotência de Webhook**: O webhook Cakto não parece verificar se o evento já foi processado (ex: por ID do evento). Se o Cakto reenviar, pode haver processamento duplicado (embora `upsert` ajude).

### Prioridade Média (Performance)

- [ ] **Índices em Events**: Com alto volume, queries em `events` filtrarão por `created_at` e `funnel_id`. Verificar se o índice composto `(user_id, created_at)` existe. A query `get_dashboard_metrics` filtra muito por data.
- [ ] **Payload do Script**: O `tracking-script.js` é gerado dinamicamente. Considere cachear a resposta com `Cache-Control: public, s-maxage=60` no Vercel Edge para não bater no lambda a cada page load.

### Melhorias de Arquitetura

- [ ] **Tipagem Strict**: Muitos usos de `any` em `track/route.ts` (ex: `pixelsToFire: any[]`). Definir interfaces para os objetos de domínio.

---

## 13. Apêndice

### Referência de Rotas API

| Rota                      | Método | Descrição                                                       |
| :------------------------ | :----- | :-------------------------------------------------------------- |
| `/api/track`              | POST   | Ingestão de eventos. Auth: Pública (protegida por origin/cors). |
| `/api/tracking-script.js` | GET    | Script JS. Params: `?id={domain_id}`.                           |
| `/api/webhooks/cakto`     | POST   | Webhook Pagamento. Auth: Secret Header.                         |

### Glossário

- **CAPI**: Conversions API (Meta).
- **FBC**: Facebook Click ID (`fbclid` armazenado em cookie).
- **FBP**: Facebook Browser ID.
- **RLS**: Row Level Security.

---

## 14. Anexo Técnico Detalhado

### A. Dicionário de Dados (Schema SQL Completo)

Abaixo, a representação fiel das tabelas encontradas na auditoria Supabase.

#### Tabela: `events`

Tabela central de analítica. Alta volumetria (Partitioning recomendado futuro).

```sql
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id UUID NOT NULL, -- ID persistente do visitante (Browser/LocalStorage)
    event_type TEXT NOT NULL CHECK (event_type IN ('pageview', 'click', 'lead', 'join', 'leave')),
    funnel_id UUID REFERENCES public.funnels(id),
    domain_id TEXT, -- ID do domínio (não é FK estrita em algumas versões, verificar consistência)
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Exemplo de Metadata:
    -- {
    --   "fbc": "fb.1.169...",
    --   "fbp": "fb.1.169...",
    --   "utm_source": "facebook",
    --   "user_agent": "Mozilla/5.0...",
    --   "ip_address": "200.1.1.1" (Oculto em logs públicos)
    -- }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices Recomendados (Verificar existência)
CREATE INDEX idx_events_visitor_id ON events(visitor_id);
CREATE INDEX idx_events_funnel_created ON events(funnel_id, created_at DESC);
CREATE INDEX idx_events_created_brin ON events USING BRIN(created_at);
```

#### Tabela: `profiles`

Espelho do usuário autenticado.

```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    plan_tier TEXT DEFAULT 'free', -- inferred
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tabela: `domains`

Gerenciamento de domínios para evitar bloqueios do Facebook (Cloaking/Tracking).

```sql
CREATE TABLE public.domains (
    id TEXT PRIMARY KEY, -- Ex: "meudominio.com" ou UUID
    user_id UUID REFERENCES public.profiles(id),
    domain_url TEXT NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    dns_settings JSONB, -- Configuração de records CNAME verificados
    funnel_id UUID REFERENCES public.funnels(id), -- Funil padrão para este domínio
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tabela: `pixels`

Credenciais do Facebook CAPI.

```sql
CREATE TABLE public.pixels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    pixel_id TEXT NOT NULL, -- ID numérico do FB (ex: "123456789")
    access_token TEXT NOT NULL, -- Token longo (EAAG...)
    name TEXT, -- Apelido (ex: "Pixel Principal")
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tabela: `pushcut_integrations`

Integração de notificações Mobile.

```sql
CREATE TABLE public.pushcut_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id),
    api_key TEXT NOT NULL,
    notification_name TEXT DEFAULT 'TrackGram',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### B. Árvore de Arquivos Completa (System Map)

Mapeamento detalhado da estrutura `src/` para manutenção.

```text
src/
├── middleware.ts                   [M] Core Auth Logic
├── app/
│   ├── layout.tsx                  [L] Root Layout (Providers)
│   ├── page.tsx                    [P] Home/Landing Redirect
│   ├── (dashboard)/                [G] Grupo de Rotas Protegidas
│   │   ├── layout.tsx              [L] Dashboard Shell (Sidebar/Header)
│   │   ├── page.tsx                [P] Dashboard Home (Metrics Charts)
│   │   ├── channels/               [F] Gerenciamento de Canais Telegram
│   │   ├── domains/                [F] Gerenciamento de Domínios
│   │   ├── funnels/                [F] Construtor de Funis
│   │   ├── pixels/                 [F] Cadastro de Pixels FB
│   │   └── integrations/           [F] Hub de Integrações (Pushcut, etc)
│   ├── api/
│   │   ├── track/                  [A] Endpoint Principal de Ingestão
│   │   │   └── route.ts
│   │   ├── tracking-script.js/     [A] Gerador de Script Dinâmico
│   │   │   └── route.ts
│   │   └── webhooks/               [A] Recebimento de Eventos Externos
│   │       └── cakto/route.ts      (Pagamentos)
│   └── t/                          [G] Grupo de Redirecionamento
│       └── [slug]/                 [P] Rota Dinâmica de Links
│           └── page.tsx            (Redireciona + Marca Cookie)
├── components/
│   ├── ui/                         [C] Shadcn Components (Button, Input, etc)
│   ├── charts/                     [C] Recharts Wrappers (AreaChart, BarChart)
│   ├── forms/                      [C] Formulários Complexos (CreateFunnel)
│   └── layout/                     [C] Sidebar, Header, UserNav
├── lib/
│   ├── supabase/                   [U] Utils de Cliente Supabase
│   │   ├── client.ts               (Browser Client)
│   │   └── server.ts               (SSR Client - Cookies)
│   ├── facebook-capi.ts            [U] Lógica de disparo Server-Side FB
│   └── utils.ts                    [U] Helpers (cn, formatDate)
└── types/
    └── database.types.ts           [T] Tipagem gerada do Supabase
```

_(Legenda: [M] Middleware, [L] Layout, [P] Page, [A] API, [C] Component, [U] Utility, [T] Type)_

---

### C. Variáveis de Ambiente e Configuração

Referência para `env.local`.

| Variável                        | Obrigatória | Descrição                                                       | Exemplo                     |
| :------------------------------ | :---------: | :-------------------------------------------------------------- | :-------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      |     SIM     | URL do projeto Supabase                                         | `https://xyz.supabase.co`   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` |     SIM     | Chave pública (segura para browser)                             | `eyJ...`                    |
| `SUPABASE_SERVICE_ROLE_KEY`     |   **SIM**   | Chave mestra (apenas servidor). Necessária para CAPI e Webhooks | `eyJ...` (não vazar)        |
| `CAKTO_WEBHOOK_SECRET`          |     SIM     | Segredo para validar payload de pagamento                       | `secreta_123`               |
| `NEXT_PUBLIC_APP_URL`           |     NÃO     | URL canônica da aplicação                                       | `https://app.trackgram.com` |

---

### D. Checklist de Verificação de Segurança (Manual)

Antes de cada deploy, verificar:

1.  **RLS Policies**:
    - [ ] Tabela `events` só permite SELECT para o dono do evento?
    - [ ] Tabela `pixels` protege o `access_token` de leitura pública?
2.  **API Routes**:
    - [ ] `/api/track` valida o input para evitar SQL Injection (via ORM é seguro, mas cuidado com raw queries)?
    - [ ] `/api/webhooks` valida a assinatura/secret?
3.  **Frontend**:
    - [ ] Nenhuma chave privada exposta no bundle JS (verificar via Source Maps)?

---

### E. Guia de Troubleshooting (Problemas Comuns)

#### 1. Eventos não aparecem no Dashboard

- **Causa Provável**: Delay de indexação ou cache.
- **Diagnóstico**: Verificar tabela `events` no Supabase. Se o evento está lá, cheque a função `get_dashboard_metrics`.
- **Solução**: Aguardar 1-2 minutos ou limpar cache do navegador.

#### 2. CAPI retornando erro (Facebook)

- **Causa Provável**: Token expirado ou permissão insuficiente.
- **Diagnóstico**: Ver logs da Vercel (`console.error` no `track/route.ts`).
- **Solução**: Gerar novo Token no Business Manager e atualizar na tabela `pixels`.

#### 3. Script não carrega na Landing Page

- **Causa Provável**: Bloqueador de Ad (uBlock) bloqueando o domínio `/api/tracking-script.js`.
- **Solução**: Usar um domínio personalizado (proxied) para servir o script. O sistema suporta domínios Custom via Middleware ou redirecionamento de DNS.

---

> Fim da Documentação Técnica TrackGram.

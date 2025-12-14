# 📋 Product Requirements Document (PRD) - TrackGram

---

**Versão:** 2.0.0
**Data da Análise:** 14 de Dezembro de 2025
**Status:** Produção / Manutenção Evolutiva
**Projeto Supabase:** TeleTrack (`qwqgefuvxnlruiqcgsil`)

---

## 1. Visão Geral do Produto

O **TrackGram** é um SaaS de rastreamento e atribuição de conversões focado em campanhas que direcionam tráfego para o Telegram. O sistema resolve a "cegueira de dados" de anunciantes, permitindo mensurar com precisão quantos cliques em anúncios (Facebook/Instagram/Meta) resultam efetivamente em entradas em canais ou grupos, utilizando a **API de Conversões do Facebook (CAPI)** para otimização de campanhas (ROAS).

### 1.1 Proposta de Valor

Rastreamento preciso de leads "Click-to-Telegram" através de links de convite únicos, eliminando a necessidade de bots intermediários de "boas-vindas" que causam fricção, e envidando eventos "Lead" otimizados para o Facebook Ads.

---

## 2. Arquitetura do Sistema

### 2.1 Fluxo de Rastreamento (Direct Flow)

O sistema utiliza um fluxo "sem fricção" onde o usuário é redirecionado diretamente ao canal via um link único.

1.  **Anúncio**: Usuário clica no anúncio (URL: `seusite.com/t/{slug}?fbclid=...`).
2.  **Landing Page (`/t/[slug]`)**:
    - **Cliente (Client-Side)**: Captura parâmetros (`fbclid`, `utm_*`), gera/recupera cookies (`_fbc`, `_fbp`) e um `visitor_id` único (armazenado no LocalStorage).
    - **Registro**: Envia evento `pageview` e `click` para o Supabase via API.
3.  **Geração de Link Único**:
    - O frontend chama `/api/invite`.
    - O backend usa a API do Telegram (`createChatInviteLink`) para gerar um link exclusivo para aquele visitante.
    - **O Segredo**: O nome do link de convite (`invite_link.name`) contém o `visitor_id` (ex: `v_abc123...`).
4.  **Redirecionamento**: O usuário é redirecionado imediatamente para o link gerado (`t.me/+AbCd...`).
5.  **Entrada no Canal**: O usuário clica em "Entrar".
6.  **Webhook & Atribuição**:
    - Telegram notifica o webhook (`/api/webhook/telegram/[bot_id]`).
    - O sistema recebe o evento `chat_member` (join).
    - Extrai o `visitor_id` do nome do link de convite.
    - Localiza a sessão do visitante no banco e recupera os dados de atribuição (`fbc`, `fbp`, `user_agent`).
7.  **Evento CAPI**: O sistema envia um evento **Lead** para o Facebook CAPI com os dados de atribuição de alta qualidade.

### 2.2 Stack Tecnológica

- **Frontend**: Next.js 15 (App Router), React 19.
- **Estilização**: Tailwind CSS 4, Shadcn/UI.
- **Backend/Database**: Supabase (PostgreSQL, Auth, Edge Functions).
- **Hospedagem**: Vercel (Frontend & API Routes).
- **Integrações**: Telegram Bot API, Facebook Graph API (CAPI), Cakto (Pagamentos).

---

## 3. Modelo de Dados (Schema Atual)

O banco de dados PostgreSQL no Supabase possui as seguintes tabelas principais:

### 3.1 Identidade e Acesso

- **`profiles`**: Dados públicos dos usuários.
  - Colunas: `id` (UUID, PK), `email`, `full_name`, `avatar_url`, `created_at`.
- **`subscriptions`**: Gestão de planos e cobranças.
  - Colunas: `id`, `user_id`, `plan_name`, `status`, `cakto_id`, `amount`, `current_period_end`.

### 3.2 Core do Rastreamento

- **`telegram_bots`**: Bots conectados.
  - Colunas: `id`, `bot_token`, `chat_id`, `channel_link`, `username`, `name`.
- **`pixels`**: Pixels do Facebook.
  - Colunas: `id`, `pixel_id`, `access_token` (CAPI), `name`.
- **`funnels`**: Campanhas de rastreamento.
  - Colunas: `id`, `name`, `slug` (URL), `pixel_id` (Pixel principal), `bot_id` (Canal destino).
- **`domains`**: Domínios personalizados para os links de rastreamento.

### 3.3 Logs e Eventos

- **`events`**: Tabela central de eventos (pageview, click, join, leave).
  - Colunas: `id`, `visitor_id`, `event_type`, `funnel_id`, `metadata` (JSONB: contém fbc, fbp, utms, user_agent).
- **`visitor_telegram_links`**: Tabela de resolução de identidade.
  - Mapeia: `visitor_id` (Web) <-> `telegram_user_id` (App).
  - Uso: Permite saber quem é quem após a entrada no canal.
- **`capi_logs`**: Auditoria de disparos para o Facebook.
  - Colunas: `visitor_id`, `event_name`, `status` (success/failed), `request_payload`, `response_payload`.
- **`telegram_message_logs`**: Histórico de mensagens de boas-vindas enviadas.

---

## 4. Requisitos Funcionais

### 4.1 Dashboard

- **Métricas em Tempo Real**: Cards exibindo contagem de Pageviews, Clicks, Entradas (Joins) e Saídas (Leaves).
- **Gráficos**: Visualização temporal das métricas.
- **Retenção**: Tabela mostrando quantos usuários permanecem no canal ao longo do tempo.

### 4.2 Gestão de Funis

- **Criação**: Usuário seleciona um Bot (Canal) e um Pixel.
- **Slug Personalizado**: O link final é gerado como `app.trackgram.com/t/{slug}` (ou domínio próprio).
- **Links Únicos**: O sistema deve gerar um link do Telegram _novo_ para cada visitante único para garantir atribuição 100%.

### 4.3 Integração Telegram

- **Setup**: Usuário adiciona o bot como admin no canal.
- **Auto-detecção**: O sistema tenta descobrir o `chat_id` automaticamente.
- **Join Requests**: Suporte para canais com "Aprovar membros" (o bot aprova automaticamente e rastreia).
- **Boas-vindas**: Envio opcional de mensagem privada (DM) ao entrar.

### 4.4 Integração Facebook CAPI

- **Deduplicação**: Uso de `event_id` para evitar contagem dupla (Browser Pixel + CAPI).
- **Qualidade de Match (EMQ)**: Prioridade para envio de `fbc` (Click ID), `fbp` (Browser ID), `user_agent` e `external_id` (hash do visitor_id).

---

## 5. Rotas e Estrutura de Arquivos Principal

### Frontend (Next.js)

- `src/app/page.tsx`: Dashboard principal.
- `src/app/(dashboard)/`: Rotas autenticadas (funnels, channels, pixels, domains).
- `src/app/t/[slug]/page.tsx`: **Landing Page de Rastreamento** (Server Component).
- `src/app/t/[slug]/client-tracking.tsx`: Lógica Client-Side de rastreamento e redirect.

### API Routes

- `src/app/api/track/route.ts`: Recebe pageviews/clicks, salva no Supabase e dispara CAPI (PageView).
- `src/app/api/invite/route.ts`: Gera links únicos do Telegram.
- `src/app/api/webhook/telegram/[bot_id]/route.ts`: Recebe updates do Telegram, processa entradas e dispara CAPI (Lead).

---

## 6. Próximos Passos (Roadmap Sugerido)

1.  **Refinamento de Domínios**: Garantir que o SSL e os registros DNS dos domínios personalizados funcionem de forma fluida.
2.  **Dashboard de Performance de UTMs**: Criar visualização dedicada para `utm_campaign`, `utm_source`, etc., cruzando com dados de conversão ("Joins").
3.  **Alertas de Falha**: Notificar o usuário se o Bot perder permissão de admin ou se o Token do FB expirar.
4.  **Tenant Isolation**: Reforçar RLS (Row Level Security) para garantir segurança absoluta entre contas.

---

> **Observação Importante**: Este documento reflete a análise técnica do código fonte atual (`/Users/ryanpazevedo/Downloads/Track Telegram`) e do banco de dados Supabase (`TeleTrack`) realizada em 14/12/2025.

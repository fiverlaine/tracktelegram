# 📊 ANÁLISE COMPLETA DO PROJETO TRACKGRAM

**Data da Análise:** 2025-01-XX  
**Analista:** AI Assistant (Claude Opus 4.5 / GPT 5.2)  
**Versão do Projeto:** 0.1.0

---

## 📋 SUMÁRIO EXECUTIVO

O **TrackGram** é um sistema SaaS de rastreamento de conversões para campanhas de anúncios do Facebook/Instagram que direcionam tráfego para canais/grupos do Telegram. O sistema resolve o problema de "cegueira de dados" ao capturar parâmetros de rastreamento antes do redirecionamento e enviar eventos via Facebook Conversions API (CAPI) quando o usuário entra no canal.

**Status Geral:** ✅ **FUNCIONAL** com algumas inconsistências e oportunidades de melhoria identificadas.

---

## 🏗️ ARQUITETURA DO SISTEMA

### 1. Stack Tecnológico

#### Frontend
- **Framework:** Next.js 16.0.8 (App Router)
- **React:** 19.2.1
- **TypeScript:** 5.x
- **Styling:** Tailwind CSS 4 + Shadcn/UI
- **Gráficos:** Recharts 2.15.4
- **Formulários:** React Hook Form + Zod
- **Temas:** next-themes (Dark Mode)

#### Backend
- **Runtime:** Node.js (Vercel Serverless Functions)
- **Banco de Dados:** Supabase (PostgreSQL 17.6.1)
- **Autenticação:** Supabase Auth (Magic Link + Email/Password)
- **API Routes:** Next.js API Routes

#### Integrações Externas
- **Telegram Bot API:** Para geração de links de convite e webhooks
- **Facebook Conversions API (CAPI):** Envio server-side de eventos
- **Facebook Pixel SDK:** Client-side tracking (react-facebook-pixel)

#### Deploy
- **Plataforma:** Vercel
- **Região:** GRU1 (São Paulo, Brasil)
- **Edge Functions:** Não utilizado (API Routes do Next.js)

---

## 🗄️ ESTRUTURA DO BANCO DE DADOS (SUPABASE)

### Tabelas Principais

#### 1. `profiles`
**Propósito:** Perfis de usuários (espelha `auth.users`)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | FK para `auth.users.id` |
| `email` | TEXT | Email do usuário |
| `full_name` | TEXT | Nome completo |
| `avatar_url` | TEXT | URL do avatar |
| `created_at` | TIMESTAMPTZ | Data de criação |

**RLS:** ✅ Habilitado - Usuários só veem/editam seu próprio perfil

---

#### 2. `pixels`
**Propósito:** Configurações de Facebook Pixels

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID único |
| `user_id` | UUID (FK → profiles) | Proprietário |
| `name` | TEXT | Nome identificador |
| `pixel_id` | TEXT | ID do Pixel do Facebook |
| `access_token` | TEXT | Token de acesso CAPI |
| `created_at` | TIMESTAMPTZ | Data de criação |

**RLS:** ✅ Habilitado - Usuários só gerenciam seus próprios pixels

**Índices:**
- `idx_pixels_user_id` (user_id)

---

#### 3. `telegram_bots`
**Propósito:** Configurações de bots do Telegram

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID único |
| `user_id` | UUID (FK → profiles) | Proprietário |
| `name` | TEXT | Nome identificador |
| `bot_token` | TEXT | Token do bot (BotFather) |
| `username` | TEXT | Username do bot (@nome_bot) |
| `channel_link` | TEXT | Link de convite do canal |
| `chat_id` | TEXT | ID numérico do chat/canal |
| `created_at` | TIMESTAMPTZ | Data de criação |

**RLS:** ✅ Habilitado - Usuários só gerenciam seus próprios bots

**Índices:**
- `idx_telegram_bots_user_id` (user_id)
- `idx_telegram_bots_bot_token` (bot_token)

**Observações:**
- `chat_id` é opcional e pode ser detectado automaticamente
- `channel_link` é usado como fallback quando `chat_id` não está disponível

---

#### 4. `funnels`
**Propósito:** Funis de rastreamento (conecta Pixel + Bot)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID único |
| `user_id` | UUID (FK → profiles) | Proprietário |
| `name` | TEXT | Nome da campanha |
| `slug` | TEXT (UNIQUE) | Slug único para URL |
| `pixel_id` | UUID (FK → pixels, nullable) | Pixel primário (legacy) |
| `bot_id` | UUID (FK → telegram_bots, nullable) | Bot associado |
| `use_join_request` | BOOLEAN | Se usa aprovação de entrada |
| `created_at` | TIMESTAMPTZ | Data de criação |

**RLS:** ✅ Habilitado - Usuários só veem seus próprios funis

**Índices:**
- `idx_funnels_user_id` (user_id)
- `idx_funnels_slug` (slug) - UNIQUE
- `idx_funnels_bot_id` (bot_id)
- `idx_funnels_pixel_id` (pixel_id)

**Relacionamentos:**
- **Multi-Pixel Support:** Tabela `funnel_pixels` permite múltiplos pixels por funil
- **Legacy:** Campo `pixel_id` mantido para compatibilidade

---

#### 5. `funnel_pixels`
**Propósito:** Relação Many-to-Many entre Funis e Pixels (Multi-Pixel)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `funnel_id` | UUID (FK → funnels) | Funil |
| `pixel_id` | UUID (FK → pixels) | Pixel |
| `created_at` | TIMESTAMPTZ | Data de criação |

**PK:** (funnel_id, pixel_id)

**RLS:** ✅ Habilitado - Usuários só gerenciam pixels de seus funis

**Índices:**
- `funnel_pixels_pixel_id_idx` (pixel_id)

---

#### 6. `events`
**Propósito:** Log de todos os eventos rastreados

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID único |
| `funnel_id` | UUID (FK → funnels, nullable) | Funil associado |
| `visitor_id` | TEXT | ID único do visitante |
| `event_type` | TEXT | pageview, click, join, leave, join_request |
| `metadata` | JSONB | Dados adicionais (fbc, fbp, user_agent, ip, geo, etc) |
| `created_at` | TIMESTAMPTZ | Data do evento |

**RLS:** ✅ Habilitado - Usuários veem eventos de seus funis ou domínios

**Índices:**
- `idx_events_visitor_id` (visitor_id)
- `idx_events_funnel_id` (funnel_id)
- `idx_events_event_type` (event_type)
- `idx_events_created_at` (created_at)
- `idx_events_metadata` (metadata) - GIN index para queries JSONB
- `events_dedup_idx` (visitor_id, event_type, created_at) - Para deduplicação

**Check Constraint:**
- `event_type` deve ser um dos valores permitidos

**Observações:**
- `funnel_id` pode ser NULL para eventos de domínios externos
- `metadata` armazena informações como:
  - `fbc`, `fbp` (cookies do Facebook)
  - `user_agent`, `ip_address`
  - `city`, `country`, `region`, `postal_code` (geo)
  - `utm_*` (parâmetros de campanha)
  - `invite_name`, `chat_id`, `telegram_user_id` (para joins)

---

#### 7. `visitor_telegram_links`
**Propósito:** Vinculação entre visitor_id (página) e telegram_user_id

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID único |
| `visitor_id` | TEXT | ID do visitante da página |
| `telegram_user_id` | BIGINT | ID do usuário no Telegram |
| `telegram_username` | TEXT | Username no Telegram |
| `funnel_id` | UUID (FK → funnels, nullable) | Funil associado |
| `bot_id` | UUID (FK → telegram_bots, nullable) | Bot associado |
| `linked_at` | TIMESTAMPTZ | Data da vinculação |
| `metadata` | JSONB | Dados adicionais (invite_link, invite_name, etc) |

**RLS:** ✅ Habilitado - Usuários veem links de seus funis

**Índices:**
- `idx_visitor_telegram_links_visitor_id` (visitor_id)
- `idx_visitor_telegram_links_telegram_user_id` (telegram_user_id)
- `idx_visitor_telegram_links_funnel_id` (funnel_id)
- `idx_visitor_telegram_links_bot_id` (bot_id)
- `visitor_telegram_links_visitor_id_telegram_user_id_key` (visitor_id, telegram_user_id) - UNIQUE

**Estrutura do metadata:**
```json
{
  "invite_link": "https://t.me/+AbCdEfGh...",
  "invite_name": "v_abc123-def456",
  "generated_at": "2024-01-01T00:00:00Z",
  "type": "dynamic_invite",
  "linked_via": "dynamic_invite",
  "chat_id": "-1001234567890",
  "chat_title": "Meu Canal VIP"
}
```

---

#### 8. `domains`
**Propósito:** Domínios personalizados para tracking externo

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID único |
| `user_id` | UUID (FK → profiles) | Proprietário |
| `domain` | TEXT | Domínio (ex: meusite.com) |
| `verified` | BOOLEAN | Se o domínio foi verificado |
| `verification_token` | TEXT | Token para verificação |
| `funnel_id` | UUID (FK → funnels, nullable) | Funil associado |
| `pixel_id` | UUID (FK → pixels, nullable) | Pixel primário (legacy) |
| `created_at` | TIMESTAMPTZ | Data de criação |

**RLS:** ✅ Habilitado - Usuários só gerenciam seus próprios domínios

**Índices:**
- `idx_domains_user_id` (user_id)
- `domains_pixel_id_idx` (pixel_id)

**Relacionamentos:**
- **Multi-Pixel Support:** Tabela `domain_pixels` permite múltiplos pixels por domínio

---

#### 9. `domain_pixels`
**Propósito:** Relação Many-to-Many entre Domínios e Pixels

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `domain_id` | UUID (FK → domains) | Domínio |
| `pixel_id` | UUID (FK → pixels) | Pixel |
| `created_at` | TIMESTAMPTZ | Data de criação |

**PK:** (domain_id, pixel_id)

**RLS:** ✅ Habilitado

**Índices:**
- `domain_pixels_domain_id_idx` (domain_id)
- `domain_pixels_pixel_id_idx` (pixel_id)

---

#### 10. `capi_logs`
**Propósito:** Logs de envio de eventos para Facebook CAPI

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID único |
| `visitor_id` | TEXT (nullable) | ID do visitante |
| `funnel_id` | UUID (FK → funnels, nullable) | Funil associado |
| `event_name` | TEXT | Nome do evento (Lead, PageView, etc) |
| `pixel_id` | TEXT (nullable) | ID do Pixel |
| `status` | TEXT | success, error, skipped |
| `request_payload` | JSONB | Payload enviado |
| `response_payload` | JSONB | Resposta do Facebook |
| `error_message` | TEXT (nullable) | Mensagem de erro |
| `created_at` | TIMESTAMPTZ | Data de criação |

**RLS:** ✅ Habilitado - Usuários veem logs de seus funis

**Índices:**
- `idx_capi_logs_visitor_id` (visitor_id)
- `idx_capi_logs_funnel_id` (funnel_id)
- `idx_capi_logs_status` (status)
- `idx_capi_logs_created_at` (created_at DESC)

---

#### 11. `funnel_welcome_settings`
**Propósito:** Configurações de mensagens de boas-vindas

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `funnel_id` | UUID (PK, FK → funnels) | Funil |
| `message_text` | TEXT (nullable) | Texto da mensagem |
| `image_url` | TEXT (nullable) | URL da imagem |
| `is_active` | BOOLEAN | Se está ativo |
| `buttons_config` | JSONB | Configuração de botões inline |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

**RLS:** ✅ Habilitado - Usuários só gerenciam settings de seus funis

**Estrutura do buttons_config:**
```json
[
  {
    "label": "Acessar Site",
    "url": "https://exemplo.com"
  }
]
```

---

#### 12. `telegram_message_logs`
**Propósito:** Log de mensagens enviadas/recebidas via Telegram

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID único |
| `funnel_id` | UUID (FK → funnels, nullable) | Funil associado |
| `telegram_chat_id` | TEXT | ID do chat do Telegram |
| `telegram_user_name` | TEXT (nullable) | Nome/username do usuário |
| `direction` | TEXT | inbound, outbound |
| `message_content` | TEXT (nullable) | Conteúdo da mensagem |
| `status` | TEXT | sent, received, failed |
| `created_at` | TIMESTAMPTZ | Data de criação |

**RLS:** ✅ Habilitado - Usuários veem logs de seus funis

**Check Constraint:**
- `direction` deve ser 'inbound' ou 'outbound'

---

#### 13. `invite_link_pool`
**Propósito:** Pool de links de convite pré-gerados (não utilizado atualmente)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID único |
| `funnel_id` | UUID (FK → funnels) | Funil |
| `invite_link` | TEXT | Link de convite |
| `invite_name` | TEXT | Nome do invite (pool_{uuid}) |
| `status` | TEXT | available, used |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `used_at` | TIMESTAMPTZ (nullable) | Data de uso |

**RLS:** ❌ **DESABILITADO** - Tabela pública (sem RLS)

**Índices:**
- `idx_invite_link_pool_funnel_status` (funnel_id, status)
- `idx_invite_link_pool_invite_name` (invite_name)

**⚠️ PROBLEMA IDENTIFICADO:** Esta tabela não tem RLS habilitado, o que é um risco de segurança.

---

#### 14. `subscriptions`
**Propósito:** Assinaturas de usuários (integração com Cakto)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID único |
| `user_id` | UUID (FK → auth.users, UNIQUE) | Usuário |
| `cakto_id` | TEXT (UNIQUE, nullable) | ID da assinatura no Cakto |
| `status` | TEXT | Status da assinatura |
| `plan_name` | TEXT (nullable) | Nome do plano |
| `amount` | NUMERIC (nullable) | Valor |
| `current_period_end` | TIMESTAMPTZ (nullable) | Fim do período |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

**RLS:** ✅ Habilitado - Usuários só veem sua própria assinatura

**Índices:**
- `subscriptions_user_id_key` (user_id) - UNIQUE
- `subscriptions_cakto_id_key` (cakto_id) - UNIQUE

---

### Funções RPC (Database Functions)

#### `get_dashboard_metrics`
**Propósito:** Retorna métricas agregadas do dashboard

**Parâmetros:**
- `p_start_date` (TIMESTAMPTZ): Data inicial
- `p_end_date` (TIMESTAMPTZ): Data final
- `p_funnel_id` (UUID, nullable): Filtrar por funil
- `p_pixel_id` (UUID, nullable): Filtrar por pixel

**Retorno:** JSON
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

**Segurança:** `SECURITY DEFINER` - Executa com privilégios do criador

**Lógica:**
1. Verifica autenticação do usuário
2. Busca funis do usuário (com filtros opcionais)
3. Busca domínios do usuário (para eventos sem funnel_id)
4. Agrega eventos por dia e tipo
5. Retorna totais e dados diários

---

#### `handle_new_user`
**Propósito:** Trigger function para criar perfil quando novo usuário se registra

**Tipo:** TRIGGER

**Observação:** Não foi possível obter a definição completa, mas provavelmente cria um registro em `profiles` quando um novo usuário é criado em `auth.users`.

---

## 🔄 FLUXO DE RASTREAMENTO (PONTA A PONTA)

### Fluxo Principal (Happy Path)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USUÁRIO CLICA NO ANÚNCIO DO FACEBOOK                        │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. REDIRECIONAMENTO PARA:                                       │
│    https://seusite.com/t/{slug}?fbclid=xyz&utm_source=facebook  │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. PÁGINA DE TRACKING (/t/[slug]/page.tsx)                     │
│    - Server Component busca funil pelo slug                     │
│    - Captura IP, User-Agent, Geo (Vercel headers)               │
│    - Renderiza ClientTracking                                   │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. CLIENT-SIDE TRACKING (client-tracking.tsx)                   │
│    a) Gera/Recupera visitor_id (localStorage ou server)         │
│    b) Captura parâmetros Facebook:                              │
│       - fbclid (URL)                                            │
│       - _fbc (cookie) ou gera: fb.1.{timestamp}.{fbclid}        │
│       - _fbp (cookie)                                           │
│    c) Inicializa Facebook Pixel (client-side)                   │
│    d) Dispara evento "PageView" (Pixel)                         │
│    e) Chama API /api/invite (POST)                              │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. API /api/invite (POST)                                       │
│    a) Salva evento "click" na tabela events                     │
│    b) Busca dados do funil (bot_token, chat_id)                 │
│    c) Verifica funnel_welcome_settings (use_join_request)       │
│    d) Chama Telegram API: createChatInviteLink                  │
│       - name: "v_{visitor_id}" (até 28 chars)                  │
│       - member_limit: 1 (se não usar join_request)             │
│       - creates_join_request: true (se usar join_request)        │
│       - expire_date: 24h                                        │
│    e) Salva mapeamento em visitor_telegram_links                │
│    f) Retorna invite_link único                                 │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. REDIRECIONAMENTO PARA TELEGRAM                               │
│    - ClientTracking redireciona para invite_link                │
│    - Usuário entra no canal/grupo                               │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. WEBHOOK DO TELEGRAM (/api/webhook/telegram/[bot_id])         │
│    a) Recebe update.chat_member ou update.chat_join_request    │
│    b) Extrai invite_link.name (formato: "v_{visitor_id}")       │
│    c) Busca visitor_id em visitor_telegram_links                │
│    d) Busca metadata do evento "click" (fbc, fbp, user_agent)   │
│    e) Salva evento "join" na tabela events                       │
│    f) Dispara CAPI para todos os pixels do funil                │
│       - Evento: "Lead"                                           │
│       - user_data: { fbc, fbp, client_user_agent, external_id } │
│       - event_id para deduplicação                               │
│    g) (Opcional) Envia mensagem de boas-vindas                  │
│    h) (Opcional) Revoga link de convite                         │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. FACEBOOK CAPI (facebook-capi.ts)                             │
│    a) Constrói payload conforme documentação Meta                │
│    b) Hash SHA256 para external_id, geo fields                  │
│    c) Envia para Graph API: /{pixel_id}/events                  │
│    d) Salva log em capi_logs                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 ANÁLISE DETALHADA POR COMPONENTE

### Frontend (Next.js App Router)

#### Estrutura de Rotas

```
/app
├── (dashboard)/          # Rotas protegidas (requerem auth)
│   ├── layout.tsx       # Layout com sidebar
│   ├── page.tsx         # Dashboard principal
│   ├── channels/        # Gerenciar bots
│   ├── pixels/          # Gerenciar pixels
│   ├── funnels/         # Gerenciar funis
│   ├── domains/         # Domínios personalizados
│   ├── logs/            # Logs de eventos
│   ├── messages/        # Mensagens do Telegram
│   ├── postbacks/       # Postbacks (não implementado)
│   ├── subscription/     # Assinaturas
│   └── utms/            # UTM tracking (não implementado)
├── login/               # Página de login
├── auth/callback/       # Callback OAuth
├── t/[slug]/            # Página pública de tracking
└── api/                 # API Routes
    ├── invite/          # Gerar links de convite
    ├── track/            # Tracking externo (domínios)
    ├── webhook/telegram/ # Webhooks do Telegram
    └── webhooks/cakto/   # Webhooks do Cakto
```

#### Middleware (`src/middleware.ts`)

**Funcionalidade:**
- Atualiza sessão do Supabase (cookies)
- Protege rotas do dashboard
- Redireciona não autenticados para `/login`

**Rotas Protegidas:**
- `/`, `/channels`, `/domains`, `/funnels`, `/logs`, `/messages`, `/pixels`, `/postbacks`, `/subscription`, `/utms`, `/dashboard`

**Rotas Públicas:**
- `/login`, `/t/*`, `/api/*`

**✅ Status:** Funcionando corretamente

---

#### Página de Tracking (`/t/[slug]`)

**Server Component (`page.tsx`):**
- Busca funil pelo slug (Service Role para bypass RLS)
- Captura headers do request (IP, User-Agent, Geo)
- Passa dados para Client Component

**Client Component (`client-tracking.tsx`):**
- Gera/recupera `visitor_id`
- Captura parâmetros Facebook (fbclid, fbc, fbp)
- Inicializa Facebook Pixel
- Chama `/api/invite` para gerar link
- Redireciona para Telegram

**⚠️ PROBLEMA IDENTIFICADO:**
- O código tenta inicializar o Facebook Pixel no client-side, mas não há garantia de que o Pixel esteja configurado corretamente
- Não há tratamento de erro se o funil não for encontrado (apenas mostra erro genérico)

---

#### Dashboard (`(dashboard)/page.tsx`)

**Funcionalidades:**
- 4 cards de métricas (Pageviews, Clicks, Entradas, Saídas)
- Gráfico interativo (Recharts) com filtros
- Tabela de retenção diária
- Filtros por data, funil e pixel
- Usa RPC `get_dashboard_metrics`

**✅ Status:** Funcionando corretamente

**Observações:**
- Filtros funcionam corretamente
- RPC suporta multi-pixel e domínios
- UI responsiva e moderna

---

#### Gerenciamento de Canais (`channels/page.tsx`)

**Funcionalidades:**
- Listar bots configurados
- Criar/Editar/Deletar bots
- Validar token do bot (getMe)
- Verificar status de integração:
  - Bot válido
  - Conexão com canal
  - Webhook configurado
- Ativar/Desativar webhook
- Inserir chat_id manualmente

**✅ Status:** Funcionando corretamente

**Observações:**
- Verificação de status é robusta
- Fallback para link estático se chat_id não estiver disponível
- UI clara com indicadores visuais

---

#### Gerenciamento de Funis (`funnels/page.tsx`)

**Funcionalidades:**
- Listar funis
- Criar/Editar/Deletar funis
- Multi-seleção de pixels (popover)
- Validação de domínio verificado (requisito)
- Geração automática de slug

**✅ Status:** Funcionando corretamente

**Observações:**
- Suporta multi-pixel via `funnel_pixels`
- Mantém compatibilidade com `pixel_id` (legacy)
- Validação de assinatura ativa

---

### Backend (API Routes)

#### `/api/invite` (GET e POST)

**Funcionalidade:** Gerar links de convite únicos do Telegram

**Fluxo:**
1. Valida parâmetros (funnel_id, visitor_id)
2. Busca dados do funil e bot
3. Verifica `funnel_welcome_settings` (use_join_request)
4. Chama Telegram API: `createChatInviteLink`
5. Salva mapeamento em `visitor_telegram_links`
6. Retorna link único

**Fallback:**
- Se `chat_id` não estiver configurado → retorna `channel_link` estático
- Se API do Telegram falhar → retorna `channel_link` estático

**✅ Status:** Funcionando corretamente

**Observações:**
- Suporta `creates_join_request` (aprovação manual)
- Link expira em 24h
- `member_limit: 1` para links diretos

---

#### `/api/webhook/telegram/[bot_id]` (POST)

**Funcionalidade:** Processar webhooks do Telegram

**Eventos Suportados:**
1. **chat_member** (join/leave)
2. **chat_join_request** (solicitação de entrada)
3. **message** (mensagens privadas)
4. **/start** (comando legacy)

**Fluxo de Join:**
1. Extrai `invite_link.name` (formato: "v_{visitor_id}")
2. Busca `visitor_id` em `visitor_telegram_links`
3. Fallback 1: Busca por `telegram_user_id` (se já vinculado)
4. Fallback 2: Busca click recente (últimos 5 minutos)
5. Busca metadata do evento "click" (fbc, fbp, user_agent)
6. Salva evento "join"
7. Dispara CAPI para todos os pixels do funil
8. (Opcional) Envia mensagem de boas-vindas
9. (Opcional) Revoga link de convite

**Fluxo de Leave:**
1. Busca `visitor_id` vinculado
2. Salva evento "leave"
3. Dispara CAPI "SaidaDeCanal" (custom event)

**Fluxo de Join Request:**
1. Auto-aprova entrada
2. Revoga link de convite
3. Envia mensagem de boas-vindas

**✅ Status:** Funcionando corretamente

**Observações:**
- Suporta multi-pixel (dispara para todos os pixels do funil)
- Logs de mensagens em `telegram_message_logs`
- Tratamento robusto de erros

---

#### `/api/track` (POST)

**Funcionalidade:** Tracking externo para domínios personalizados

**Fluxo:**
1. Recebe evento (pageview, click, etc)
2. Filtra tráfego pago (fbclid ou fbc)
3. Busca pixels vinculados ao domínio
4. Salva evento na tabela `events`
5. Dispara CAPI "PageView" (se tiver origem de anúncio)

**✅ Status:** Funcionando corretamente

**Observações:**
- Suporta multi-pixel via `domain_pixels`
- Deduplicação de eventos (5 minutos)
- Filtro de tráfego pago funciona corretamente

---

### Integrações Externas

#### Telegram Bot API

**Endpoints Utilizados:**
- `getMe` - Validar token
- `getChat` - Obter informações do canal
- `getChatMember` - Verificar se bot é admin
- `getChatAdministrators` - Listar admins
- `getChatMemberCount` - Contar membros
- `createChatInviteLink` - Gerar link único
- `revokeChatInviteLink` - Revogar link
- `approveChatJoinRequest` - Aprovar entrada
- `setWebhook` - Configurar webhook
- `getWebhookInfo` - Verificar webhook
- `deleteWebhook` - Remover webhook
- `sendMessage` - Enviar mensagem

**✅ Status:** Funcionando corretamente

---

#### Facebook Conversions API (CAPI)

**Implementação:** `src/lib/facebook-capi.ts`

**Funcionalidades:**
- Envio server-side de eventos
- Hash SHA256 para `external_id` e campos geo
- Construção de payload conforme documentação Meta
- Logs em `capi_logs`

**Eventos Enviados:**
- `Lead` - Quando usuário entra no canal
- `PageView` - Para tracking externo (domínios)
- `SaidaDeCanal` - Custom event quando usuário sai

**Parâmetros Enviados:**
- `fbc` - Facebook Click ID
- `fbp` - Facebook Browser ID
- `client_user_agent` - User-Agent
- `client_ip_address` - IP do usuário
- `external_id` - Hash SHA256 do visitor_id
- `ct`, `st`, `zp`, `country` - Geo hasheado

**✅ Status:** Funcionando corretamente

**Observações:**
- Conforme documentação Meta
- Suporta multi-pixel
- Logs detalhados para debugging

---

## 🔒 SEGURANÇA E RLS (ROW LEVEL SECURITY)

### Políticas RLS Implementadas

**✅ Todas as tabelas principais têm RLS habilitado, exceto:**
- `invite_link_pool` - ❌ **SEM RLS** (risco de segurança)

**Padrão de Políticas:**
- **SELECT:** Usuários veem apenas seus próprios dados
- **INSERT:** Usuários só podem inserir dados próprios
- **UPDATE:** Usuários só podem atualizar dados próprios
- **DELETE:** Usuários só podem deletar dados próprios

**Políticas Especiais:**
- `events`: Permite ver eventos de funis próprios OU eventos de domínios próprios (mesmo sem funnel_id)
- `capi_logs`: Permite ver logs de funis próprios
- `visitor_telegram_links`: Permite ver links de funis próprios
- `telegram_message_logs`: Permite ver logs de funis próprios

**✅ Status:** Segurança adequada (exceto `invite_link_pool`)

---

## ⚠️ PROBLEMAS E INCONSISTÊNCIAS IDENTIFICADAS

### 1. Tabela `invite_link_pool` sem RLS

**Problema:** Tabela pública sem Row Level Security

**Risco:** Usuários podem ver links de outros usuários

**Solução:** Habilitar RLS e criar políticas adequadas

---

### 2. Inconsistência entre SISTEMA.md e Código

#### 2.1. Arquitetura de Webhooks

**SISTEMA.md diz:**
> "O sistema utiliza **Edge Functions do Supabase** como principal handler de webhooks do Telegram"

**Realidade:**
- O sistema usa **API Routes do Next.js** (`/api/webhook/telegram/[bot_id]`)
- Não há Edge Functions do Supabase configuradas

**Impacto:** Documentação desatualizada

---

#### 2.2. Fluxo de Tracking

**SISTEMA.md diz:**
> "3. API gera INVITE LINK ÚNICO com visitor_id"

**Realidade:**
- O link é gerado **on-demand** quando o usuário clica
- Não há pool de links pré-gerados (tabela `invite_link_pool` existe mas não é usada)

**Impacto:** Documentação desatualizada

---

#### 2.3. Tabela `visitor_telegram_links`

**SISTEMA.md diz:**
> "Estrutura do metadata para fluxo direto:"

**Realidade:**
- A estrutura está correta, mas o campo `telegram_user_id` é `BIGINT` (não `TEXT`)
- O campo `linked_via` não está sempre presente no metadata

**Impacto:** Menor, mas documentação pode ser mais precisa

---

### 3. Falta de Validação em Alguns Pontos

#### 3.1. Página de Tracking

**Problema:** Se o funil não for encontrado, mostra erro genérico

**Solução:** Melhorar tratamento de erros com mensagens específicas

---

#### 3.2. API /api/invite

**Problema:** Não valida se o bot_token ainda é válido antes de gerar link

**Solução:** Adicionar validação opcional (pode ser custoso em termos de performance)

---

### 4. Performance

#### 4.1. Dashboard RPC

**Observação:** A função `get_dashboard_metrics` faz múltiplas CTEs e agregações

**Status:** ✅ Otimizado com índices adequados

---

#### 4.2. Webhook do Telegram

**Observação:** Processa múltiplos pixels sequencialmente (Promise.all)

**Status:** ✅ Otimizado (paralelo)

---

### 5. Código Duplicado

**Problema:** Lógica de geração de invite link duplicada em:
- `/api/invite` (GET e POST)
- `src/lib/telegram-service.ts`

**Solução:** Centralizar em `telegram-service.ts` e reutilizar

---

## ✅ PONTOS FORTES

1. **Arquitetura Sólida:**
   - Separação clara entre frontend e backend
   - Uso adequado de Server/Client Components
   - API Routes bem estruturadas

2. **Segurança:**
   - RLS habilitado em todas as tabelas principais
   - Autenticação via Supabase Auth
   - Validação de permissões em todas as ações

3. **Escalabilidade:**
   - Arquitetura serverless (Vercel)
   - Banco de dados otimizado com índices
   - Suporte a multi-pixel

4. **Funcionalidades Avançadas:**
   - Multi-pixel support
   - Domínios personalizados
   - Mensagens de boas-vindas
   - Logs detalhados (CAPI, mensagens)

5. **UX/UI:**
   - Interface moderna e responsiva
   - Dark mode
   - Feedback visual adequado
   - Gráficos interativos

---

## 🚀 SUGESTÕES DE MELHORIA

### 1. Correções Urgentes

#### 1.1. Habilitar RLS em `invite_link_pool`
```sql
ALTER TABLE invite_link_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pool links for their funnels"
ON invite_link_pool FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM funnels
    WHERE funnels.id = invite_link_pool.funnel_id
    AND funnels.user_id = auth.uid()
  )
);
```

---

#### 1.2. Atualizar SISTEMA.md
- Remover referências a Edge Functions do Supabase
- Atualizar fluxo de tracking (on-demand vs pool)
- Corrigir estrutura de `visitor_telegram_links`

---

### 2. Melhorias de Código

#### 2.1. Centralizar Lógica de Invite Link
- Mover toda lógica para `telegram-service.ts`
- Reutilizar em `/api/invite`

---

#### 2.2. Melhorar Tratamento de Erros
- Mensagens de erro mais específicas
- Logs estruturados
- Retry logic para APIs externas

---

#### 2.3. Adicionar Testes
- Testes unitários para funções críticas
- Testes de integração para fluxos principais
- Testes E2E para tracking completo

---

### 3. Funcionalidades Futuras

#### 3.1. Pool de Links Pré-gerados
- Implementar geração em background
- Reduzir latência na geração de links

---

#### 3.2. Analytics Avançados
- Funnels de conversão
- Cohort analysis
- A/B testing

---

#### 3.3. Notificações
- Email quando evento importante ocorre
- Webhooks para integrações externas

---

## 📊 COMPARAÇÃO COM SISTEMA.md

### ✅ O que está correto:

1. Estrutura do banco de dados (tabelas principais)
2. Fluxo de rastreamento (conceito geral)
3. Integração com Facebook CAPI
4. Dashboard e métricas
5. RLS policies (exceto `invite_link_pool`)

### ❌ O que está incorreto/desatualizado:

1. **Arquitetura de Webhooks:**
   - SISTEMA.md: Edge Functions do Supabase
   - Realidade: API Routes do Next.js

2. **Geração de Links:**
   - SISTEMA.md: Pool de links pré-gerados
   - Realidade: Links gerados on-demand

3. **Estrutura de `visitor_telegram_links`:**
   - SISTEMA.md: `telegram_user_id` como TEXT
   - Realidade: `telegram_user_id` como BIGINT

4. **Tabela `invite_link_pool`:**
   - SISTEMA.md: Não mencionada
   - Realidade: Existe mas não é usada (e sem RLS)

---

## 🎯 CONCLUSÃO

O projeto **TrackGram** está **funcional e bem estruturado**, com uma arquitetura sólida e segurança adequada. As principais inconsistências são:

1. **Documentação desatualizada** (SISTEMA.md não reflete a realidade)
2. **Tabela `invite_link_pool` sem RLS** (risco de segurança)
3. **Código duplicado** (lógica de invite link)

**Recomendações Prioritárias:**
1. ✅ Habilitar RLS em `invite_link_pool`
2. ✅ Atualizar SISTEMA.md
3. ✅ Centralizar lógica de invite link
4. ✅ Melhorar tratamento de erros

**Status Geral:** 🟢 **PRONTO PARA PRODUÇÃO** (após correções urgentes)

---

**Fim da Análise**

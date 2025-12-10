# TrackGram - Sistema de Rastreamento para Telegram

## Visão Geral

O TrackGram é um sistema de rastreamento que resolve a **cegueira de dados em anúncios para Telegram**. O sistema rastreia cliques em anúncios e cruza esses dados com a entrada real do usuário em grupos/canais do Telegram, enviando eventos via API de Conversão (CAPI) para o Facebook Ads.

---

## Arquitetura do Sistema

### Fluxo de Rastreamento (v3.1 - CAPI Compliant)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              FLUXO DIRETO (SEM BOT INTERMEDIÁRIO) v3.1 - CAPI              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Facebook Ads → seusite.com/t/{slug}?fbclid=xyz                         │
│                                                                             │
│  2. Página captura: fbclid, fbc, fbp, User-Agent                           │
│     → Gera visitor_id → Salva evento "pageview" + "click"                  │
│     → Armazena: fbc, fbp, user_agent no metadata                           │
│                                                                             │
│  3. API gera INVITE LINK ÚNICO com visitor_id                              │
│     → createChatInviteLink(name: "v_{visitor_id}", member_limit: 1)        │
│                                                                             │
│  4. Usuário é redirecionado DIRETO para t.me/+XXXXX (link único)           │
│     → Entra no canal/grupo SEM precisar falar com bot                      │
│                                                                             │
│  5. Webhook detecta entrada + invite_link.name                              │
│     → Extrai visitor_id do nome do invite                                  │
│     → Busca click event → Recupera fbc, fbp, user_agent                    │
│     → Salva evento "join"                                                  │
│                                                                             │
│  6. ENVIA para Facebook CAPI como "Lead"                                   │
│     → user_data: { fbc, fbp, client_user_agent, external_id }             │
│     → event_id para deduplicação                                           │
│     → action_source: "website"                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Vantagens do Fluxo Direto

- ✅ **UX Superior**: Usuário vai direto para o canal, sem etapa extra do bot
- ✅ **Maior Conversão**: Menos fricção = mais entradas
- ✅ **Links Únicos**: Cada visitante recebe um link exclusivo
- ✅ **Atribuição Precisa**: Vinculação pelo nome do invite link
- ✅ **Fallback**: Se falhar, usa link estático como backup

---

## Estrutura do Banco de Dados (Supabase)

### Tabelas

#### `profiles`
Armazena os usuários do sistema.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | ID do usuário (FK para auth.users) |
| email | TEXT | Email do usuário |
| full_name | TEXT | Nome completo |
| avatar_url | TEXT | URL do avatar |
| created_at | TIMESTAMPTZ | Data de criação |

#### `pixels`
Configurações do Facebook Pixel.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | ID único |
| user_id | UUID | FK para profiles |
| name | TEXT | Nome identificador |
| pixel_id | TEXT | ID do Pixel do Facebook |
| access_token | TEXT | Token de acesso CAPI |
| created_at | TIMESTAMPTZ | Data de criação |

#### `telegram_bots`
Bots do Telegram configurados.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | ID único |
| user_id | UUID | FK para profiles |
| name | TEXT | Nome identificador |
| bot_token | TEXT | Token do bot (BotFather) |
| username | TEXT | Username do bot (@nome_bot) |
| channel_link | TEXT | Link de convite do canal |
| chat_id | TEXT | ID numérico do chat/canal (detectado automaticamente) |
| created_at | TIMESTAMPTZ | Data de criação |

#### `funnels`
Funis de rastreamento que conectam Pixel + Bot.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | ID único |
| user_id | UUID | FK para profiles |
| name | TEXT | Nome da campanha |
| slug | TEXT | Slug único para URL |
| pixel_id | UUID | FK para pixels |
| bot_id | UUID | FK para telegram_bots |
| created_at | TIMESTAMPTZ | Data de criação |

#### `events`
Todos os eventos rastreados.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | ID único |
| funnel_id | UUID | FK para funnels (nullable) |
| visitor_id | TEXT | ID único do visitante |
| event_type | TEXT | pageview, click, join, leave |
| metadata | JSONB | Dados adicionais |
| created_at | TIMESTAMPTZ | Data do evento |

#### `visitor_telegram_links`
Vinculação entre visitor_id (página) e telegram_user_id.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | ID único |
| visitor_id | TEXT | ID do visitante da página |
| telegram_user_id | BIGINT | ID do usuário no Telegram (0 até entrada) |
| telegram_username | TEXT | Username no Telegram |
| funnel_id | UUID | FK para funnels |
| bot_id | UUID | FK para telegram_bots |
| linked_at | TIMESTAMPTZ | Data da vinculação |
| metadata | JSONB | Dados adicionais (invite_link, invite_name, etc) |

**Estrutura do metadata para fluxo direto:**
```json
{
  "invite_link": "https://t.me/+AbCdEfGh...",
  "invite_name": "v_abc123-def456",
  "generated_at": "2024-01-01T00:00:00Z",
  "type": "dynamic_invite",
  "linked_via": "dynamic_invite"
}
```

---

## Componentes do Sistema

### Frontend (Next.js 15)

#### Páginas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `src/app/page.tsx` | Dashboard com métricas |
| `/login` | `src/app/login/page.tsx` | Login via Magic Link |
| `/channels` | `src/app/channels/page.tsx` | Gerenciar bots Telegram |
| `/pixels` | `src/app/pixels/page.tsx` | Gerenciar pixels Facebook |
| `/funnels` | `src/app/funnels/page.tsx` | Criar funis de rastreamento |
| `/domains` | `src/app/domains/page.tsx` | Domínios personalizados |
| `/t/[slug]` | `src/app/t/[slug]/page.tsx` | Página de tracking |

#### Componentes de Tracking

**`src/app/t/[slug]/client-tracking.tsx`**

Responsável por:
- Gerar/recuperar `visitor_id` único
- Capturar parâmetros do Facebook (fbclid, fbc, fbp)
- Registrar eventos `pageview` e `click`
- Redirecionar para o bot com o `visitor_id`

### Backend

#### API Route: `/api/invite`

Gera links de convite únicos do Telegram para cada visitante:

```
GET /api/invite?funnel_id=xxx&visitor_id=yyy

Resposta:
{
  "invite_link": "https://t.me/+AbCdEfGh...",
  "is_dynamic": true,
  "expires_in": "24h"
}
```

**Como funciona:**
1. Recebe `funnel_id` e `visitor_id`
2. Busca o `bot_token` e `chat_id` do funil
3. Chama `createChatInviteLink` da API do Telegram com:
   - `name`: `v_{visitor_id}` (até 32 chars)
   - `member_limit`: 1 (uso único)
   - `expire_date`: 24 horas
4. Salva mapeamento na tabela `visitor_telegram_links`
5. Retorna o link único

#### API Route: `/api/webhook/telegram/[bot_id]` (v3.0)

Responsável por processar webhooks do Telegram (roda como API Route do Next.js na Vercel):

1. **`chat_member` updates**: Detecta joins/leaves e extrai `invite_link.name`
2. **Atribuição por Invite**: Extrai `visitor_id` do nome do invite
3. **Comando `/start`**: (Legacy) Vincula via comando do bot
4. **Facebook CAPI**: Envia evento "Lead" para o Facebook
5. **Auto-approve**: Aprova automaticamente solicitações de entrada

---

## Configuração

### 1. Variáveis de Ambiente

#### Desenvolvimento (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://qwqgefuvxnlruiqcgsil.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Produção (Vercel)

Configure as seguintes variáveis no dashboard da Vercel:

| Variável | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qwqgefuvxnlruiqcgsil.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sua anon key do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sua service role key do Supabase |
| `NEXT_PUBLIC_APP_URL` | URL da sua aplicação (ex: `https://tracktelegram.vercel.app`) |

### 2. Configurar Bot do Telegram

1. Crie um bot com o @BotFather
2. Anote o token e username do bot
3. Crie um canal/grupo no Telegram
4. Adicione o bot como administrador do canal
5. Configure o bot no TrackGram

### 3. Ativar Webhook

Após configurar o bot, clique em "Ativar Rastreamento" na página de Canais.

O webhook é configurado automaticamente para apontar para a API Route do Next.js:
- URL: `https://sua-app.vercel.app/api/webhook/telegram/{bot_id}`

**IMPORTANTE**: Certifique-se de que a variável `NEXT_PUBLIC_APP_URL` está configurada corretamente na Vercel para que o webhook aponte para o domínio correto.

### 4. Configurar Pixel do Facebook

1. Crie um Pixel no Facebook Business Manager
2. Gere um Access Token para a API de Conversões
3. Adicione no TrackGram na página de Pixels

---

## API de Conversão do Facebook (CAPI)

O sistema envia eventos para o Facebook via Server-Side quando um usuário entra no canal. A implementação segue 100% as diretrizes do documento **"Guia Técnico: Implementando a Meta Conversions API (CAPI) em um SaaS com Integração ao Telegram"**.

### Evento Enviado: "Lead"

```json
{
  "data": [{
    "event_name": "Lead",
    "event_time": 1702123456,
    "event_id": "lead_1702123456_abc123",
    "action_source": "website",
    "event_source_url": "https://seusite.com/t/campanha",
    "user_data": {
      "fbc": "fb.1.1702123456.AbCdEfGhIj",
      "fbp": "fb.1.1702123456.1234567890",
      "client_user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "client_ip_address": "203.0.113.45",
      "external_id": "hashed_visitor_id_sha256"
    },
    "custom_data": {
      "telegram_user_id": 123456789,
      "telegram_username": "usuario",
      "chat_title": "Meu Canal VIP",
      "content_category": "telegram_group",
      "currency": "BRL",
      "value": 0
    }
  }]
}
```

### Event Match Quality (EMQ)

#### ⚠️ IMPORTANTE: Qualidade Baixa quando tráfego vem do Instagram

Se sua campanha usa **Instagram Reels, Stories ou Feed** como posicionamento, o `fbclid` **NÃO é enviado automaticamente**. Isso resulta em:
- `fbc: null` nos eventos
- Qualidade de match baixa (3-5/10)

**Solução**: O Meta recomenda enviar **parâmetros adicionais** para melhorar o match:

| Parâmetro | Descrição | Impacto no Match |
|-----------|-----------|------------------|
| `fbc` | Click ID do Facebook | ⭐⭐⭐⭐⭐ (Melhor) |
| `fbp` | Browser ID | ⭐⭐⭐ |
| `client_user_agent` | User-Agent | ⭐⭐ |
| `client_ip_address` | IP do usuário | ⭐⭐ |
| `email` (hasheado) | Email do usuário | ⭐⭐⭐⭐ |
| `phone` (hasheado) | Telefone | ⭐⭐⭐⭐ |

**Para melhorar o match sem fbclid:**
1. Coletar email/telefone na landing page antes do redirecionamento
2. Ou usar apenas posicionamentos de Facebook Ads (não Instagram) para garantir `fbclid`

Para melhorar a qualidade de correspondência, o sistema envia:

| Parâmetro | Descrição | Hash? |
|-----------|-----------|-------|
| `fbc` | Click ID do Facebook (capturado do fbclid) | ❌ Não |
| `fbp` | Browser ID do Facebook (gerado/recuperado) | ❌ Não |
| `client_user_agent` | User-Agent do navegador | ❌ Não |
| `client_ip_address` | IP do usuário (quando disponível) | ❌ Não |
| `external_id` | Hash SHA256 do visitor_id | ✅ Sim |

### Conformidade com o Documento Meta CAPI

✅ **Captura de fbclid da URL** → Formato: `fb.1.<timestamp>.<fbclid>`
✅ **Geração de _fbc e _fbp** → Cookies criados corretamente
✅ **createChatInviteLink** → `name=v_{visitor_id}`, `member_limit=1`
✅ **Webhook chat_member** → Extrai `invite_link.name`
✅ **event_id** → Gerado para deduplicação
✅ **client_user_agent** → Enviado para melhor EMQ
✅ **external_id hasheado** → SHA256 conforme documentação

---

## Fluxo de Atribuição

### 1. Atribuição Direta (Ideal)

Quando o usuário passa pelo bot com `/start {visitor_id}`:

```
click (visitor_id: abc123) → /start abc123 → join (telegram_user_id: 789)
                                    ↓
                    visitor_telegram_links: abc123 ↔ 789
                                    ↓
                        Busca click → Encontra funnel → Envia CAPI
```

### 2. Fallback (Sem bot intermediário)

Se o usuário for direto para o canal (sem passar pelo bot):
- Sistema tenta correlacionar por timing (clicks recentes)
- Atribuição menos precisa
- Evento salvo com `funnel_id: null`

---

## Métricas do Dashboard

### Cards de Métricas Principais

O dashboard exibe 4 cards principais com métricas em tempo real:

| Card | Métrica | Ícone | Footer Label | Cálculo |
|------|---------|-------|--------------|---------|
| Pageviews | Visualizações da página | Eye | "Conversão geral para Entradas" | COUNT(pageview) |
| Clicks na página | Cliques no botão | Zap | "Taxa de Cliques por Pageviews" | COUNT(click) |
| Entradas | Usuários que entraram | Users | "Taxa de Entradas por Cliques" | COUNT(join) |
| Saídas | Usuários que saíram | UserMinus | "Taxa de Retenção" | COUNT(leave) |

### Overview de Métricas (Gráfico Interativo)

O gráfico de linha permite visualizar a evolução diária das métricas com **botões interativos**:

- **Botões de Seleção**: Pageviews | Clicks | Entradas | Saídas
- **Visualização Dinâmica**: Ao clicar em um botão, o gráfico mostra apenas aquela métrica
- **Indicador Visual**: O botão selecionado fica destacado com underline roxo
- **Cores**:
  - Pageviews: Roxo (#8b5cf6)
  - Clicks: Azul (#3b82f6)
  - Entradas: Roxo (#8b5cf6)
  - Saídas: Vermelho (#ef4444)

### Tabela de Retenção Diária

Mostra os últimos 5 dias com:
- **Dia**: Data formatada (dd/MM)
- **Entradas**: Número de usuários que entraram
- **Saídas**: Número de usuários que saíram
- **Retenção**: Taxa calculada como `((joins - leaves) / joins) × 100`
  - Verde: Retenção ≥ 90%
  - Vermelho: Retenção < 90%
- **Destaque**: O dia mais recente tem fundo roxo claro

### Fórmulas de Cálculo

| Métrica | Fórmula |
|---------|---------|
| Conversão geral para Entradas | `(joins / pageviews) × 100` |
| Taxa de Cliques por Pageviews | `(clicks / pageviews) × 100` |
| Taxa de Entradas por Cliques | `(joins / clicks) × 100` |
| Taxa de Retenção | `((joins - leaves) / joins) × 100` |

---

## Arquitetura de Webhooks

O sistema utiliza **Edge Functions do Supabase** como principal handler de webhooks do Telegram, não a API Route da Vercel.

### URL do Webhook Telegram
```
https://qwqgefuvxnlruiqcgsil.supabase.co/functions/v1/telegram-webhook
```

### Versão Atual: v3.2 - CAPI + Logging
Funcionalidades:
- ✅ Processa eventos de entrada/saída do Telegram
- ✅ Extrai `visitor_id` do `invite_link.name`
- ✅ Envia eventos Lead para Facebook CAPI
- ✅ **Salva logs na tabela `capi_logs`** (corrigido em v3.2)
- ✅ Hash SHA256 para `external_id` conforme documentação Meta

---

## Troubleshooting

### Bot não está recebendo webhooks

1. Verifique se o webhook está ativo em "Canais"
2. Certifique-se de que a URL do webhook está correta (deve apontar para a API Route da Vercel)
3. Teste o endpoint: `GET https://sua-app.vercel.app/api/webhook/telegram/{bot_id}`
4. Verifique os logs da Vercel em: Dashboard > Functions > Logs

### "Conexão com o Canal - Não encontrada"

Este erro ocorre quando o sistema não consegue verificar se o bot é admin do canal. **Soluções:**

1. **Insira o ID do Canal manualmente**: Na página de Canais, digite o ID do canal no campo que aparece abaixo do status
2. **Como obter o ID do Canal**:
   - Encaminhe qualquer mensagem do canal para o bot [@getidsbot](https://t.me/getidsbot)
   - O bot irá retornar o ID no formato `-1002406299839`
   - Cole esse ID no campo de entrada
3. **Certifique-se que o bot é admin**: O bot precisa ter permissões de administrador no canal antes de inserir o ID

**Formato do ID:**
- Canais e supergrupos: Começam com `-100` (ex: `-1002406299839`)
- Grupos normais: Número negativo (ex: `-123456789`)

**Importante:** O ID é diferente do link de convite. O link `t.me/+abc123` não contém o ID numérico.

### Eventos não aparecem no dashboard

1. Verifique se o funil está configurado corretamente
2. Verifique os logs da função no Dashboard da Vercel (Functions > Logs)
3. Confirme que o bot é administrador do canal

### CAPI não está enviando

1. Verifique se o Pixel está configurado com Access Token
2. Verifique os logs no Dashboard da Vercel (Functions > Logs)
3. Teste o token no Facebook Graph API Explorer
4. Use o "Test Events" no Facebook Events Manager para verificar eventos em tempo real
5. Confira se a resposta contém `"events_received": 1`

### Como verificar se os eventos estão chegando ao Facebook

1. Acesse o **Gerenciador de Eventos** do Facebook
2. Selecione seu Pixel
3. Vá para a aba **"Testar Eventos"** (Test Events)
4. Execute um fluxo completo de teste no TrackGram
5. Os eventos devem aparecer em tempo real na interface

**Resposta de sucesso esperada:**
```json
{
  "events_received": 1,
  "messages": [],
  "fbtrace_id": "XYZ..."
}
```

**Dica:** Use o `test_event_code` do Facebook para testar sem afetar métricas de produção

---

## Estrutura de Arquivos

```
track-gram/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Dashboard
│   │   ├── login/page.tsx           # Login
│   │   ├── channels/page.tsx        # Bots Telegram
│   │   ├── pixels/page.tsx          # Pixels Facebook
│   │   ├── funnels/page.tsx         # Funis
│   │   ├── domains/page.tsx         # Domínios
│   │   └── t/[slug]/
│   │       ├── page.tsx             # Página tracking (Server)
│   │       └── client-tracking.tsx  # Componente tracking (Client)
│   ├── components/
│   │   ├── layout/
│   │   │   └── sidebar.tsx          # Menu lateral
│   │   ├── dashboard/
│   │   │   ├── metric-card.tsx      # Card de métrica
│   │   │   ├── overview-chart.tsx   # Gráfico
│   │   │   └── retention-table.tsx  # Tabela de retenção
│   │   └── ui/                      # Componentes Shadcn/UI
│   └── lib/
│       └── supabase/
│           └── client.ts            # Cliente Supabase
├── documentation/
│   └── SISTEMA.md                   # Esta documentação
└── package.json
```

---

## Tecnologias Utilizadas

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Shadcn/UI
- **Backend**: Supabase (PostgreSQL, Auth), Vercel API Routes
- **APIs**: Telegram Bot API, Facebook Conversions API
- **Hospedagem**: Vercel

## Deploy

O projeto está configurado para deploy na Vercel. Para fazer o deploy:

1. Faça push do código para o GitHub
2. Conecte o repositório na Vercel
3. Configure as variáveis de ambiente
4. Deploy automático será realizado

### URLs importantes após o deploy:

- **App**: `https://tracktelegram.vercel.app`
- **API Webhook**: `https://tracktelegram.vercel.app/api/webhook/telegram/{bot_id}`
- **Tracking**: `https://tracktelegram.vercel.app/t/{slug}`

---

## Próximas Melhorias (Roadmap)

- [ ] Domínios personalizados
- [ ] Mensagens automáticas pós-entrada
- [ ] Postbacks para integrações
- [ ] Relatórios avançados
- [ ] Multi-tenant (SaaS)
- [ ] Webhook secret para segurança


# Product Requirements Document (PRD) - TrackGram

## 1. Visão Geral do Produto

### 1.1 Problema

Anunciantes que utilizam o Telegram como canal de aquisição sofrem com a "cegueira de dados". As ferramentas tradicionais de analytics perdem o rastreamento no momento em que o usuário clica para abrir o aplicativo do Telegram, impedindo a atribuição correta de conversões e otimização de campanhas no Facebook Ads (Meta).

### 1.2 Solução

O TrackGram é um SaaS (Software as a Service) de rastreamento avançado que atua como middleware entre o anúncio e o canal do Telegram. Ele captura os parâmetros de rastreamento (fbclid, fbc, fbp, user_agent) antes do redirecionamento, gera links de convite únicos para cada visitante e utiliza um bot proprietário para detectar a entrada (join) no canal. Quando a entrada é confirmada, o sistema dispara um evento "Lead" via Facebook Conversions API (CAPI) com alta qualidade de correspondência (Event Match Quality - EMQ).

### 1.3 Proposta de Valor

- **Atribuição Precisa**: Saiba exatamente qual anúncio gerou cada membro do canal.
- **Otimização de ROI**: Alimente o algoritmo do Facebook com dados reais de conversão para baixar o custo por lead.
- **Fluxo sem Fricção**: Redirecionamento direto para o canal de forma transparente para o usuário final.

---

## 2. Público-Alvo

- Gestores de Tráfego e Performance.
- Infoprodutores que utilizam lançamentos ou perpétuos no Telegram.
- Afiliados profissionais (iGaming, Betting, SaaS).
- Donos de comunidades e canais pagos.

---

## 3. Requisitos Funcionais

### 3.1 Autenticação e Gestão de Conta

- **Login via Magic Link**: Sistema de autenticação sem senha utilizando Supabase Auth.
- **Multi-tenancy**: Isolamento de dados por usuário (RLS - Row Level Security).
- **Gestão de Perfil**: Edição de nome e avatar.

### 3.2 Dashboard e Analytics

- **Visão Geral**: Cards com métricas em tempo real:
  - Pageviews (Visitantes únicos no link intermediário).
  - Clicks (Cliques no botão de entrar/redirecionamento).
  - Entradas (Joins confirmados no Telegram).
  - Saídas (Leaves/Churn do canal).
- **Gráficos**: Evolução temporal das métricas (Pageviews vs Entradas).
- **Retenção**: Tabela de análise de cohort/retenção diária.
- **Filtros de Data**: Hoje, Ontem, 7 dias, 30 dias.

### 3.3 Gestão de Pixels e Rastreamento

- **Cadastro de Pixels**: Input para Pixel ID e Access Token (CAPI).
- **Validação**: Teste de conexão com a API do Facebook.

### 3.4 Gestão de Canais (Bots)

- **Cadastro de Bot**: Input do Token do Bot (@BotFather).
- **Validação de Admin**: Sistema verifica automaticamente se o bot é administrador do canal alvo.
- **Webhooks**: Configuração automática e gestão de webhooks do Telegram via Edge Functions.

### 3.5 Funis de Rastreamento

- **Criação de Funil**: Associação entre Pixel, Bot e Canal de Destino.
- **Links Únicos**: Geração de slug personalizado (ex: `trackgram.com/t/black-friday`).
- **Middleware de Rastreamento**:
  - Captura automática de parâmetros URL (`utm_*`, `fbclid`).
  - Geração de Cookies `_fbc` e `_fbp`.
  - Redirecionamento inteligente (Client-side tracking antes do redirect).

### 3.6 API Server-Side e Webhooks

- **Integração Telegram**: Processamento de updates `chat_member` (join/leave), `chat_join_request` e comandos.
- **Integração Meta CAPI**: Envio de eventos Server-Side com payload enriquecido para maximizar EMQ.
- **Deduplicação**: Uso de `event_id` único para evitar duplicidade de eventos.

---

## 4. Requisitos Não-Funcionais

### 4.1 Performance

- **Edge Functions**: Processamento de webhooks em Edge Network para baixa latência.
- **Redirect Rápido**: O tempo entre o clique e a abertura do Telegram deve ser minimizado.

### 4.2 Segurança

- **RLS (Row Level Security)**: Todas as tabelas protegidas, garantindo que usuários acessem apenas seus próprios dados.
- **Variáveis de Ambiente**: Chaves sensíveis (Service Role, API Keys) nunca expostas no cliente.
- **Proteção de Dados**: Hashing de dados sensíveis (PII) antes do envio para o Facebook (quando aplicável).

### 4.3 Escalabilidade

- Arquitetura Serverless (Next.js + Supabase) para escalar automaticamente com picos de tráfego.
- Banco de dados PostgreSQL otimizado para leitura e escrita de eventos.

---

## 5. Modelo de Dados (Supabase)

### 5.1 `profiles`

Tabela pública de usuários, espelhando `auth.users`.

- `id` (UUID, PK)
- `email` (Text)
- `full_name` (Text)
- `avatar_url` (Text)

### 5.2 `pixels`

Configurações de integração com Facebook.

- `id` (UUID, PK)
- `user_id` (FK profiles)
- `pixel_id` (Text)
- `access_token` (Text, Secure)

### 5.3 `telegram_bots`

Configurações de Bots do Telegram.

- `id` (UUID, PK)
- `user_id` (FK profiles)
- `bot_token` (Text, Secure)
- `username` (Text)
- `chat_id` (BigInt, ID do canal)

### 5.4 `funnels`

Configuração central da campanha.

- `id` (UUID, PK)
- `user_id` (FK profiles)
- `name` (Text)
- `slug` (Text, Unique)
- `pixel_id` (FK pixels)
- `bot_id` (FK telegram_bots)

### 5.5 `events`

Log analítico de interações.

- `id` (UUID, PK)
- `funnel_id` (FK funnels)
- `visitor_id` (Text, Unique Session ID)
- `event_type` (Enum: pageview, click, join, leave)
- `metadata` (JSONB: user_agent, ip, utms, fbc, fbp)
- `created_at` (Timestamp)

### 5.6 `visitor_telegram_links`

Tabela de correlação (De-Para) para atribuição.

- `visitor_id` (Text)
- `telegram_user_id` (BigInt)
- `invite_link` (Text, Link único gerado)
- `status` (Enum: pending, converted)

---

## 6. Arquitetura e Fluxo de Dados

### 6.1 Fluxo de Conversão (Happy Path)

1. **Visitante** clica no anúncio e acessa `/t/[slug]`.
2. **Client-Side**:
   - Captura `fbclid` da URL.
   - Gera `visitor_id` único.
   - Grava evento `pageview`.
   - Solicita link de convite único à API (`/api/invite`).
3. **API (/api/invite)**:
   - Chama Telegram API `createChatInviteLink` com nome `v_{visitor_id}`.
   - Retorna link único (ex: `t.me/+AbCd...`).
4. **Visitante** clica em "Entrar".
   - Grava evento `click`.
   - Redireciona para o link Telegram.
5. **Telegram**:
   - Usuário entra no canal.
   - Telegram envia webhook `chat_member` para o TrackGram.
6. **Webhook Handler**:
   - Recebe payload do Telegram.
   - Extrai `invite_link` usado.
   - Busca `visitor_id` associado ao link na tebela `visitor_telegram_links`.
   - Recupera metadados do visitante (`fbp`, `fbc`, `user_agent`).
   - Dispara evento `Lead` para Facebook CAPI.
   - Grava evento `join` no banco.

---

## 7. Interface e UX

### 7.1 Design System

- **Framework**: Tailwind CSS v4 + Shadcn/UI.
- **Tema**: Dark Mode predominante (fundo `zinc-950`, acentos `violet-600`).
- **Tipografia**: Inter ou Geist Sans.

### 7.2 Componentes Chave

- **Sidebar**: Navegação fixa à esquerda.
- **Metric Cards**: Cartões com ícone, valor grande e label descritivo.
- **Data Tables**: Tabelas com paginação e ações (editar/excluir).
- **Toasts**: Feedback visual para ações (Sucesso/Erro).

---

## 8. Integrações Externas

### 8.1 Telegram Bot API

- `getMe`: Validar token.
- `getChatAdministrators`: Validar permissões no canal.
- `createChatInviteLink`: Gerar links dinâmicos por visitante.
- `setWebhook`: Configurar URL de callback.

### 8.2 Facebook Graph API (CAPI)

- Endpoint: `https://graph.facebook.com/v19.0/{pixel_id}/events`
- Payload rigoroso seguindo guia de Melhores Práticas de CAPI para máxima pontuação de qualidade.

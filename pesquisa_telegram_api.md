# Pesquisa Completa: API de Bots do Telegram para TrackGram

## 📋 Índice
1. [Webhooks](#1-webhooks)
2. [Gerenciamento de Links de Convite](#2-gerenciamento-de-links-de-convite)
3. [Gerenciamento de Membros](#3-gerenciamento-de-membros)
4. [Envio de Mensagens](#4-envio-de-mensagens)
5. [Canais vs Grupos vs Supergrupos](#5-canais-vs-grupos-vs-supergrupos)
6. [APIs Avançadas](#6-apis-avançadas)
7. [Rate Limits e Limitações](#7-rate-limits-e-limitações)
8. [Funcionalidades Avançadas](#8-funcionalidades-avançadas)
9. [Notificações e Alertas](#9-notificações-e-alertas)
10. [Analytics e Métricas](#10-analytics-e-métricas)

---

## 1. WEBHOOKS

### 1.1 Conceito Básico
Webhooks permitem receber updates do Telegram enviando requisições HTTPS POST para sua URL. **Alternativa ao long-polling (getUpdates)** - são **mutuamente exclusivos**.

**Comportamento:**
- Telegram armazena updates por até **24 horas**
- Se a requisição falhar, Telegram tenta novamente por um tempo razoável
- Você recebe **objeto JSON Update** na requisição

### 1.2 Configuração
```bash
# Endpoint
POST https://api.telegram.org/bot<TOKEN>/setWebhook

# Parâmetros
{
  "url": "https://seu-servidor.com/webhook",           # OBRIGATÓRIO (HTTPS)
  "certificate": "<arquivo-certificado.pem>",          # Opcional - cert customizada
  "ip_address": "123.45.67.89",                        # Opcional - IP fixo
  "max_connections": 40,                                # Opcional (1-100, padrão 40)
  "allowed_updates": ["message", "chat_member"],       # Opcional - filtro de tipos
  "drop_pending_updates": false,                        # Opcional - descartar updates antigos
  "secret_token": "seu-token-secreto"                  # Opcional (1-256 chars)
}
```

### 1.3 Tipos de Updates (allowed_updates)
```
TODOS OS TIPOS DISPONÍVEIS:

📝 MENSAGENS:
  - "message"                    → Novas mensagens
  - "edited_message"             → Mensagens editadas
  - "channel_post"               → Novos posts em canal
  - "edited_channel_post"        → Posts editados em canal
  - "business_message"           → Mensagens de conta business
  - "edited_business_message"    → Mensagens business editadas
  - "deleted_business_messages"  → Mensagens business deletadas

👥 GERENCIAMENTO DE MEMBROS:
  - "my_chat_member"             → Bot foi add/removido do chat
  - "chat_member"                → Qualquer membro foi add/removido
  - "chat_join_request"          → Solicitação para entrar no chat (***IMPORTANTE PARA VOCÊ***)

🔔 NEGÓCIOS & MARKETING:
  - "message_reaction"           → Reação adicionada à mensagem
  - "message_reaction_count"     → Contagem de reações muda
  - "chat_boost"                 → Chat foi boosted
  - "removed_chat_boost"         → Boost foi removido

📱 QUERIES & INTERAÇÕES:
  - "callback_query"             → Botão pressionado (inline keyboard)
  - "inline_query"               → Query inline recebida
  - "chosen_inline_result"       → Resultado inline escolhido
  - "shipping_query"             → Query de envio (pagamentos)
  - "pre_checkout_query"         → Query pré-checkout (pagamentos)

🎮 OUTROS:
  - "poll"                       → Poll finalizada
  - "poll_answer"                → Voto em poll
  - "purchased_paid_media"       → Mídia paga foi comprada
  - "business_connection"        → Conexão business criada/removida
```

### 1.4 Dados Retornados - Objeto Update
```json
{
  "update_id": 123456789,
  
  // UM dos campos abaixo (mutuamente exclusivos):
  "message": { /* Message object */ },
  "edited_message": { /* Message object */ },
  "my_chat_member": { /* ChatMemberUpdated */ },
  "chat_member": { /* ChatMemberUpdated */ },
  "chat_join_request": { /* ChatJoinRequest */ },
  // ... etc
}
```

### 1.5 ChatMemberUpdated (Para Tracking de Entrada/Saída)
```json
{
  "update_id": 123456789,
  "chat_member": {
    "chat": {
      "id": -1001234567890,
      "type": "supergroup",
      "title": "Seu Grupo"
    },
    "from": {
      "id": 987654321,
      "is_bot": false,
      "first_name": "João",
      "last_name": "Silva",
      "username": "joaosilva"
    },
    "date": 1703001234,
    "old_chat_member": {
      "user": { "id": 987654321, ... },
      "status": "left"
    },
    "new_chat_member": {
      "user": { "id": 987654321, ... },
      "status": "member",
      "is_member": true
    },
    "invite_link": {
      "invite_link": "https://t.me/+ABC123xyz",
      "creator": { "id": ... },
      "creates_join_request": true,
      "is_primary": false,
      "is_revoked": false
    }
  }
}
```

### 1.6 ChatJoinRequest (Solicitações de Entrada)
```json
{
  "update_id": 123456789,
  "chat_join_request": {
    "chat": {
      "id": -1001234567890,
      "type": "supergroup",
      "title": "Seu Grupo"
    },
    "from": {
      "id": 987654321,
      "is_bot": false,
      "first_name": "João",
      "username": "joaosilva"
    },
    "user_chat_id": 987654321,
    "date": 1703001234,
    "bio": "Minha bio",
    "invite_link": {
      "invite_link": "https://t.me/+ABC123xyz",
      "expire_date": 1703001334
    }
  }
}
```

### 1.7 Validação do Secret Token
```
Se você setou secret_token, TODA requisição de webhook terá:

Header: X-Telegram-Bot-Api-Secret-Token: seu-token-secreto

Valide isso para garantir que a requisição vem mesmo do Telegram.
```

### 1.8 Webhook Info - Monitorar Status
```bash
GET https://api.telegram.org/bot<TOKEN>/getWebhookInfo

Response:
{
  "ok": true,
  "result": {
    "url": "https://seu-servidor.com/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "ip_address": "1.2.3.4",
    "last_error_date": 1703001234,
    "last_error_message": "Bad Request: message text is empty",
    "last_synchronization_error_date": 0,
    "max_connections": 40,
    "allowed_updates": ["message", "chat_member", "chat_join_request"]
  }
}
```

### 1.9 getUpdates vs Webhooks - Comparação
| Aspecto | getUpdates (Long Polling) | Webhooks |
|---------|---------------------------|----------|
| **Setup** | Mais simples | Requer HTTPS & domínio |
| **Latência** | Maior (timeout) | Menor (immediate) |
| **Scalabilidade** | Limitado | Melhor (múltiplas conexões) |
| **Confiabilidade** | Pull (seu controle) | Push (Telegram tenta entregar) |
| **Conexões simultâneas** | 1 | Até 100 (configurável) |
| **Custo servidor** | Menor | Maior |
| **Para TrackGram** | ❌ Não ideal | ✅ Recomendado |

### 1.10 Limitações Webhooks
- **Timeout resposta**: Telegram espera resposta HTTP em ~30 segundos
- **Tentativas de entrega**: Se falhar (status ≠ 2xx), Telegram tenta por tempo razoável
- **Máximo de conexões simultâneas**: 1-100 (você configura)
- **Updates antigos**: Se desligar webhook, updates se acumulam por 24h
- **Ordem não garantida**: Updates podem chegar fora de ordem (use update_id para ordenar)

---

## 2. GERENCIAMENTO DE LINKS DE CONVITE

### 2.1 Criar Link de Convite Único
```bash
POST https://api.telegram.org/bot<TOKEN>/createChatInviteLink

{
  "chat_id": -1001234567890,              # ID do grupo/supergrupo
  "name": "visitor_123_promo",            # Nome descritivo (0-32 chars)
  "expire_date": 1703087634,              # Unix timestamp (opcional)
  "member_limit": 1,                      # Máx de usuários (1-99999, opcional)
  "creates_join_request": true            # Requer aprovação? (opcional)
}

Response:
{
  "ok": true,
  "result": {
    "invite_link": "https://t.me/+ABC123xyz_defgh",
    "creator": { "id": BOT_ID, ... },
    "creates_join_request": true,
    "is_primary": false,
    "is_revoked": false,
    "name": "visitor_123_promo",
    "expire_date": 1703087634,
    "member_limit": 1,
    "pending_join_request_count": 0
  }
}
```

### 2.2 Editar Link de Convite
```bash
POST https://api.telegram.org/bot<TOKEN>/editChatInviteLink

{
  "chat_id": -1001234567890,
  "invite_link": "https://t.me/+ABC123xyz_defgh",
  "name": "visitor_123_updated",           # Novo nome (opcional)
  "expire_date": 1703174034,               # Novo expira em (opcional)
  "member_limit": 0,                       # Novo limite (0 = ilimitado)
  "creates_join_request": false
}
```

### 2.3 Revogar Link de Convite
```bash
POST https://api.telegram.org/bot<TOKEN>/revokeChatInviteLink

{
  "chat_id": -1001234567890,
  "invite_link": "https://t.me/+ABC123xyz_defgh"
}

Response: Retorna object ChatInviteLink com is_revoked: true
```

### 2.4 Exportar Link Principal
```bash
POST https://api.telegram.org/bot<TOKEN>/exportChatInviteLink

{
  "chat_id": -1001234567890
}

Response:
{
  "ok": true,
  "result": "https://t.me/+ABC123xyz_defgh"
}
```

### 2.5 Limitações de Links de Convite
| Limitação | Valor |
|-----------|-------|
| **Máx de caracteres no name** | 32 |
| **Máx de usuários por link** | 99,999 |
| **Mín de usuários por link** | 1 |
| **Tempo de expiração mín** | 30 segundos (do agora) |
| **Tempo de expiração máx** | 365 dias (do agora) |
| **Quantos links por chat** | Ilimitado |
| **Como rastrear qual link foi usado** | ❌ **NÃO HÁ API NATIVA** - Ver seção 2.6 |

### 2.6 ⭐ COMO RASTREAR QUAL LINK FOI USADO (Solução TrackGram)

**Problema:** Telegram NÃO fornece informação de qual link foi usado quando usuário entra.

**Solução:**

```javascript
// 1. Armazenar mapeamento no seu banco:
{
  invite_link: "https://t.me/+ABC123xyz",
  link_name: "visitor_123",
  visitor_id: "visitor_123",
  utm_params: "utm_source=fb&utm_campaign=april",
  created_at: timestamp,
  expires_at: timestamp
}

// 2. Quando receber chat_member update com status="member":
// a) Obtenha getChatMember do novo membro
// b) Procure no banco por um link "recente" (últimos 10 minutos)
// c) Se houver apenas 1 link ativo, é provavelmente aquele
// d) Envie para Facebook CAPI com esse ID como propriedade

// 3. MELHOR: Use creates_join_request=true + approveChatJoinRequest
//    Assim você tem controle total e sabe exatamente quando entrou

// 4. ALTERNATIVA: Envie mensagem privada pedindo referência
//    /start=ref_123 quando abre o link (Deep Linking)
```

### 2.7 Estrutura do Objeto ChatInviteLink
```json
{
  "invite_link": "https://t.me/+ABC123xyz_defgh",
  "creator": {
    "id": 123456789,
    "is_bot": true,
    "first_name": "TrackGramBot",
    "username": "trackgrambot"
  },
  "creates_join_request": false,
  "is_primary": false,
  "is_revoked": false,
  "name": "visitor_123_promo",
  "expire_date": 1703087634,
  "member_limit": 1,
  "pending_join_request_count": 5
}
```

---

## 3. GERENCIAMENTO DE MEMBROS

### 3.1 Aprovar Solicitação de Entrada (approveChatJoinRequest)
```bash
POST https://api.telegram.org/bot<TOKEN>/approveChatJoinRequest

{
  "chat_id": -1001234567890,
  "user_id": 987654321
}

Response:
{
  "ok": true,
  "result": true
}

❌ ERRO: user_id inválido ou já é membro
✅ SUCESSO: Usuário foi adicionado ao chat
```

### 3.2 Rejeitar Solicitação de Entrada (declineChatJoinRequest)
```bash
POST https://api.telegram.org/bot<TOKEN>/declineChatJoinRequest

{
  "chat_id": -1001234567890,
  "user_id": 987654321
}

Response:
{
  "ok": true,
  "result": true
}
```

### 3.3 Banir Membro (banChatMember)
```bash
POST https://api.telegram.org/bot<TOKEN>/banChatMember

{
  "chat_id": -1001234567890,
  "user_id": 987654321,
  "until_date": 1703087634,              # Opcional - Unix timestamp
  "revoke_messages": true                # Opcional - deletar msgs do user
}

Response: { "ok": true, "result": true }

⚠️ NOTA: Se until_date não informado, é ban permanente
⚠️ Ban por até 366 dias = permanente, menos que 30 seg = permanente
```

### 3.4 Desbanir Membro (unbanChatMember)
```bash
POST https://api.telegram.org/bot<TOKEN>/unbanChatMember

{
  "chat_id": -1001234567890,
  "user_id": 987654321,
  "only_if_banned": true                 # Opcional
}
```

### 3.5 Restringir Membro (restrictChatMember)
```bash
POST https://api.telegram.org/bot<TOKEN>/restrictChatMember

{
  "chat_id": -1001234567890,
  "user_id": 987654321,
  "permissions": {
    "can_send_messages": false,
    "can_send_media_messages": false,
    "can_send_polls": false,
    "can_send_other_messages": false,
    "can_add_web_page_previews": false,
    "can_change_info": false,
    "can_invite_users": false,
    "can_pin_messages": false
  },
  "use_independent_chat_permissions": false,
  "until_date": 1703087634              # Opcional
}

Permissions disponíveis:
  - can_send_messages                   (text, calls, etc)
  - can_send_media_messages             (photos, videos, etc)
  - can_send_polls                      (polls)
  - can_send_other_messages             (stickers, GIFs, etc)
  - can_add_web_page_previews           (link previews)
  - can_change_info                     (group title, photo, etc)
  - can_invite_users                    (add new members)
  - can_pin_messages                    (pin messages)
  - can_manage_topics                   (forum topics)
```

### 3.6 Obter Info de Membro (getChatMember)
```bash
GET https://api.telegram.org/bot<TOKEN>/getChatMember
  ?chat_id=-1001234567890
  &user_id=987654321

Response:
{
  "ok": true,
  "result": {
    "user": {
      "id": 987654321,
      "is_bot": false,
      "first_name": "João",
      "last_name": "Silva",
      "username": "joaosilva",
      "language_code": "pt"
    },
    "status": "member",  // creator, administrator, member, restricted, left, kicked
    "custom_title": "VIP",
    "is_member": true,
    "can_send_messages": true,
    "can_send_media_messages": true,
    "can_send_polls": true,
    "can_send_other_messages": true,
    "can_add_web_page_previews": true,
    "can_change_info": false,
    "can_invite_users": true,
    "can_pin_messages": false,
    "can_manage_topics": false,
    "can_send_audios": true,
    "can_send_documents": true,
    "can_send_photos": true,
    "can_send_videos": true,
    "can_send_video_notes": true,
    "can_send_voice_notes": true,
    "until_date": 0
  }
}

Possíveis status:
  - "creator"        → Criador do chat
  - "administrator"  → Admin
  - "member"         → Membro normal
  - "restricted"     → Restringido (não pode fazer certas coisas)
  - "left"           → Saiu
  - "kicked"         → Banido
```

### 3.7 Contar Membros (getChatMembersCount)
```bash
GET https://api.telegram.org/bot<TOKEN>/getChatMembersCount
  ?chat_id=-1001234567890

Response:
{
  "ok": true,
  "result": 1234
}
```

### 3.8 Obter Administradores (getChatAdministrators)
```bash
GET https://api.telegram.org/bot<TOKEN>/getChatAdministrators
  ?chat_id=-1001234567890

Response:
{
  "ok": true,
  "result": [
    {
      "user": { "id": ..., "is_bot": false, "first_name": "Admin 1" },
      "status": "administrator",
      "custom_title": "Moderador",
      "can_be_edited": false,
      "can_manage_chat": true,
      "can_delete_messages": true,
      "can_manage_video_chats": true,
      "can_restrict_members": true,
      "can_promote_members": true,
      "can_change_info": true,
      "can_invite_users": true,
      "can_post_stories": true,
      "can_edit_stories": true,
      "can_delete_stories": true,
      "can_manage_topics": true
    }
  ]
}
```

### 3.9 Promoter/Rebaixar Admin (promoteChatMember / demoteChatMember)
```bash
# Promover
POST https://api.telegram.org/bot<TOKEN>/promoteChatMember

{
  "chat_id": -1001234567890,
  "user_id": 987654321,
  "can_change_info": true,
  "can_post_messages": true,
  "can_edit_messages": true,
  "can_delete_messages": true,
  "can_manage_video_chats": true,
  "can_restrict_members": true,
  "can_promote_members": true,
  "can_manage_chat": true,
  "can_invite_users": true,
  "is_anonymous": false
}

# Rebaixar
POST https://api.telegram.org/bot<TOKEN>/demoteChatMember

{
  "chat_id": -1001234567890,
  "user_id": 987654321
}
```

### 3.10 Permissões do Bot - O que Precisa para TrackGram?
```
Para approveChatJoinRequest:  ✅ can_invite_users
Para banChatMember:          ✅ can_restrict_members
Para restrictChatMember:     ✅ can_restrict_members
Para getChatMember:          ✅ Ser admin (recomendado)
Para enviar msg privada:     ✅ User iniciou conversa com bot

⚠️ Seu bot DEVE SER ADMIN do chat/grupo com as permissões necessárias!
```

---

## 4. ENVIO DE MENSAGENS

### 4.1 Estrutura Básica sendMessage
```bash
POST https://api.telegram.org/bot<TOKEN>/sendMessage

{
  "chat_id": 987654321,                          # ID do user ou -1001234567890 do grupo
  "text": "Olá João! Bem-vindo ao grupo!",
  "parse_mode": "MarkdownV2",                    # HTML, Markdown, MarkdownV2, ou none
  "disable_web_page_preview": false,
  "disable_notification": false,                # true = mensagem silenciosa
  "protect_content": false,
  "reply_to_message_id": 123,                   # Opcional - responder a msg
  "allow_user_without_premium": true,
  "reply_markup": { /* keyboard */ }            # Opcional - botões
}

Response:
{
  "ok": true,
  "result": {
    "message_id": 456,
    "date": 1703001234,
    "chat": { "id": 987654321, ... },
    "text": "Olá João! Bem-vindo ao grupo!"
  }
}
```

### 4.2 Formatação - MarkdownV2
```
Escape esses caracteres: _ * [ ] ( ) ~ ` > # + - = | { } . !

*bold \*text*
_italic \*text_
__underline__
~strikethrough~
||spoiler||
*bold _italic bold ~italic bold strikethrough ||italic bold strikethrough spoiler||~ __underline italic bold___ bold*
[inline URL](http://www.example.com/)
[inline mention of a user](tg://user?id=123456789)
`inline fixed-width code`
```
pre-formatted fixed-width code block
```
>Block quote
>>Nested block quote

EXEMPLO:
"*João*, bem\-vindo ao [nosso grupo](https://t.me/seugrupo)"
```

### 4.3 Formatação - HTML
```html
<b>bold</b>
<strong>bold</strong>
<i>italic</i>
<em>italic</em>
<u>underline</u>
<ins>underline</ins>
<s>strikethrough</s>
<strike>strikethrough</strike>
<del>strikethrough</del>
<span class="tg-spoiler">spoiler</span>
<b>bold <i>italic bold <s>italic bold strikethrough <u>underline italic bold strikethrough</u></s></i></b>
<a href="http://www.example.com/">inline URL</a>
<a href="tg://user?id=123456789">inline mention of a user</a>
<code>inline fixed-width code</code>
<pre>pre-formatted fixed-width code block</pre>
<pre><code class="language-python">pre-formatted fixed-width code block written in the Python programming language</code></pre>
<blockquote>Block quote</blockquote>
<blockquote expandable>Expandable block quote</blockquote>

EXEMPLO:
"<b>João</b>, bem-vindo ao <a href='https://t.me/seugrupo'>nosso grupo</a>"
```

### 4.4 Inline Keyboard (Botões em Linha)
```json
{
  "chat_id": 987654321,
  "text": "Escolha uma opção:",
  "reply_markup": {
    "inline_keyboard": [
      [
        { "text": "Opção 1", "callback_data": "opt_1" },
        { "text": "Opção 2", "callback_data": "opt_2" }
      ],
      [
        { "text": "Link", "url": "https://google.com" }
      ],
      [
        { "text": "Web App", "web_app": { "url": "https://seu-site.com/app" } }
      ],
      [
        { "text": "Chamar Bot", "switch_inline_query": "search term" }
      ]
    ]
  }
}

callback_data: até 64 bytes de dados arbitrários
               Você recebe via callback_query update
```

### 4.5 Reply Keyboard (Teclado Customizado)
```json
{
  "chat_id": 987654321,
  "text": "Escolha uma opção:",
  "reply_markup": {
    "keyboard": [
      [{ "text": "Opção 1" }, { "text": "Opção 2" }],
      [{ "text": "Opção 3" }]
    ],
    "resize_keyboard": true,
    "one_time_keyboard": true,
    "selective": false
  }
}

Botões podem ter:
  - "text": string (obrigatório)
  - "request_contact": true (pede número do usuário)
  - "request_location": true (pede localização)
  - "request_poll": { "type": "quiz" } (pede poll)
  - "web_app": { "url": "..." } (abre web app)
```

### 4.6 Remover Teclado
```json
{
  "chat_id": 987654321,
  "text": "Teclado removido",
  "reply_markup": {
    "remove_keyboard": true
  }
}
```

### 4.7 Editar Mensagem (editMessageText)
```bash
POST https://api.telegram.org/bot<TOKEN>/editMessageText

{
  "chat_id": 987654321,
  "message_id": 456,
  "text": "Novo texto",
  "parse_mode": "MarkdownV2",
  "reply_markup": { /* novo keyboard */ }
}

Ou usar inline_message_id para editar mensagens inline
```

### 4.8 Deletar Mensagem (deleteMessage)
```bash
POST https://api.telegram.org/bot<TOKEN>/deleteMessage

{
  "chat_id": 987654321,
  "message_id": 456
}

⚠️ Pode deletar até 48 horas depois (grupos)
⚠️ Apenas mensagens do bot ou se bot é admin
```

### 4.9 Copy Message (forwardar sem indicar original)
```bash
POST https://api.telegram.org/bot<TOKEN>/copyMessage

{
  "chat_id": 987654321,
  "from_chat_id": 123456789,
  "message_id": 456,
  "caption": "Legenda adicional",
  "parse_mode": "MarkdownV2"
}
```

### 4.10 Rate Limits para Mensagens
| Limite | Valor |
|--------|-------|
| **Broadcast (bulk)** | 30 msg/seg (ilimitado com Paid Broadcasts por 0.1 Stars/msg extra) |
| **Chat privado** | ~100 msg/min (não oficial) |
| **Grupo** | 20 msg/min (não oficial) |
| **Taxa de requisiçõesAPI** | ~30 requisições/seg (aproximado) |
| **Tamanho máx de texto** | 4096 chars por mensagem |
| **Mensagens em massa** | Spread over 8-12 horas para evitar 429 errors |

---

## 5. CANAIS vs GRUPOS vs SUPERGRUPOS

### 5.1 Diferenças Técnicas

| Aspecto | Grupo | Supergrupo | Canal |
|---------|-------|-----------|-------|
| **Tipo** | "group" | "supergroup" | "channel" |
| **Max membros** | ~200 | Ilimitado | Ilimitado |
| **Tópicos (fóruns)** | ❌ | ✅ | ❌ |
| **ID negativo** | Negativo simples | `-100` + número | `-100` + número |
| **Bot pode postar** | Sim | Sim | ❌ (apenas via owner) |
| **Reações** | ✅ | ✅ | ✅ |
| **Histórico acessível** | ✅ | ✅ | ✅ |
| **Usuários veem lista** | Sim (se privado, admin vê) | Sim (públicos são abertos) | Membros silenciosos |
| **2FA obrigatória** | Não | Não | ❌ Admin precisa de 2FA |
| **Que é melhor para TrackGram** | ❌ | ✅ | ⚠️ Depende |

### 5.2 Como Identificar Type no Update
```json
{
  "chat": {
    "id": -1001234567890,
    "type": "supergroup",  // "private", "group", "supergroup", "channel"
    "title": "Meu Supergrupo"
  }
}
```

### 5.3 Limitações Específicas

#### Grupos Normais ("group")
```
- Max ~200 membros antes de migração automática
- Sem tópicos/fóruns
- Migrações: Se crescer além de 200, vira supergroup
- API change: ID muda (use migrate_to_chat_id)
```

#### Supergrupos ("supergroup")
```
✅ Tudo funciona (joins, tracking, etc)
✅ ID com "-100" permite operações avançadas
✅ Recomendado para TrackGram
```

#### Canais ("channel")
```
❌ Bot NÃO pode postar sozinho (precisa de aprovação owner)
❌ Bot NÃO pode receber join requests
❌ Usuários são "subscritos" silenciosamente
❌ Pouco rastreamento de usuários

⚠️ Apenas se você quiser "broadcast" unidirecional
```

### 5.4 Migração Grupo → Supergrupo
```json
// No update, você receberá:
{
  "message": {
    "migrate_to_chat_id": -1001234567890,
    "migrate_from_chat_id": -123456789
  }
}

// Você DEVE:
1. Atualizar seu banco: -123456789 → -1001234567890
2. Usar novo ID para todas as operações futuras
3. Links antigos do grupo velho não funcionam mais
```

---

## 6. APIs AVANÇADAS

### 6.1 Bot API vs TDLib vs MTProto

| API | Casos de Uso | Linguagem | Facilidade |
|-----|-------------|-----------|-----------|
| **Bot API** | Bots para grupos, envio de msgs | HTTP REST | ✅ Fácil |
| **TDLib** | Clientes customizados, automação | C++, CLI | ⚠️ Médio |
| **MTProto** | Controle total, clientes | Qualquer | ❌ Difícil |

**Para TrackGram: Use Bot API (é o que você está fazendo)**

### 6.2 Telegram Login Widget (Para Website)
```html
<!-- Seu website pode usar login do Telegram -->
<script async src="https://telegram.org/js/telegram-widget.js?22" 
        data-telegram-login="SEU_BOT_USERNAME"
        data-size="large"
        data-onauth="onTelegramAuth(user)"
        data-request-access="write"></script>

<script>
function onTelegramAuth(user) {
  console.log('Usuário autenticado:', user);
  // user.id, user.first_name, user.username, user.photo_url, etc
  // Enviar para seu servidor para verificar assinatura
}
</script>
```

**Validação no servidor:**
```python
import hashlib
import hmac

def verify_telegram_auth(auth_data, bot_token):
    check_hash = auth_data.pop('hash')
    data_check_string = '\n'.join([
        f'{k}={v}' for k, v in sorted(auth_data.items())
    ])
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    computed_hash = hmac.new(
        secret_key, 
        data_check_string.encode(), 
        hashlib.sha256
    ).hexdigest()
    return computed_hash == check_hash
```

### 6.3 Telegram Passport (Documentos de ID)
```
❌ NÃO RECOMENDADO para TrackGram
⚠️ Requer dados sensíveis (documentos de identidade)
⚠️ Complexo para implementar
✅ Apenas se você absolutamente precisa de KYC/AML
```

### 6.4 Payments API (Aceitando Pagamentos)
```bash
POST https://api.telegram.org/bot<TOKEN>/sendInvoice

{
  "chat_id": 987654321,
  "title": "Assinatura Premium",
  "description": "Acesso ao TrackGram por 1 mês",
  "payload": "premium_1month",
  "provider_token": "sua-stripe-key",  # Stripe, Sberbank, etc
  "currency": "BRL",
  "prices": [
    { "label": "Assinatura", "amount": 9900 }  # em centavos
  ]
}

// Telegram envia pre_checkout_query update
// Você valida e responde com answerPreCheckoutQuery
```

**Para TrackGram:** ✅ Possível para monetização

### 6.5 Web Apps / Mini Apps (Aplicações HTML5)
```json
{
  "chat_id": 987654321,
  "text": "Abra meu dashboard:",
  "reply_markup": {
    "inline_keyboard": [
      [
        {
          "text": "Abrir TrackGram Dashboard",
          "web_app": {
            "url": "https://seu-site.com/trackgram-dashboard"
          }
        }
      ]
    ]
  }
}
```

**Seu HTML5 app pode:**
- Receber dados do bot (via query params)
- Enviar dados de volta (Telegram.WebApp.sendData)
- Acessar user info do Telegram
- Não precisa de autenticação (Telegram já valida)

```javascript
// No seu mini app (JavaScript):
window.Telegram.WebApp.ready();

// Enviar dados de volta:
window.Telegram.WebApp.sendData(JSON.stringify({
  "visitor_id": "visitor_123",
  "conversion": true
}));

// Fechar:
window.Telegram.WebApp.close();
```

### 6.6 Deep Linking (Links com Parâmetros)
```
Formatos:
  tg://resolve?domain=NOMEDOBOT&start=PARAMETRO
  https://t.me/NOMEDOBOT?start=PARAMETRO

Você recebe em:
  /start PARAMETRO

Casos de Uso:
  - https://t.me/trackgrambot?start=visitor_123
  - Usuário clica → bot recebe:
    {
      "message": {
        "text": "/start visitor_123",
        "entities": [{ "type": "bot_command", ... }]
      }
    }

IMPORTANTE PARA TRACKING:
  1. Crie link único: https://t.me/seu_bot?start=visitor_{id}
  2. Rastreie no /start: extraia visitor_id
  3. Armazene: visitante entrou via referência X
  4. Quando entrar no grupo: associe ao tracking anterior
```

---

## 7. RATE LIMITS E LIMITAÇÕES

### 7.1 Limites de Mensagens

```
BROADCASTS (envio em massa):
  - Free tier: 30 msg/segundo
  - Paid (com Telegram Stars): até 1000 msg/seg
  - Custo: 0.1 Stars por mensagem acima do free tier
  - Requer: mín 10,000 Stars em account + 100k monthly active users

GRUPOS/CHATS:
  - ~20 msg/minuto por grupo (não oficial)
  - ~100 msg/minuto por usuário em DM (não oficial)

SINGLE MESSAGE:
  - Máximo: 4096 caracteres
  - Máximo media: 20 MB (arquivo)
  - Máximo inline keyboard: 300 botões

CALLBACKS:
  - Responda em até ~30 segundos
  - Se não responder, "hourglass" aparece para user
```

### 7.2 Limites de Webhooks

```
CONNECTIONS:
  - Máximo simultâneas: 1-100 (você configura max_connections)
  - Default: 40 conexões simultâneas
  - Se receber >100 updates/seg, aumentar max_connections

TIMEOUT:
  - Telegram espera resposta em ~30 segundos
  - Se demorar, próxima tentativa será schedulada
  - Sempre retorne 200 OK rapidamente!

RETRY:
  - Se falhar (status ≠ 2xx), Telegram tenta novamente
  - Tenta por tempo razoável (horas)
  - Depois descarta updates não entregues

UPDATES:
  - Armazenados por 24 horas
  - Se desligar webhook, updates se acumulam
  - Se ligar novo webhook, pode receber antigos
  - Usar drop_pending_updates=true ao setWebhook
```

### 7.3 Limites de File Upload/Download

```
UPLOAD:
  - Máximo: 512 MB por arquivo
  - Via URL: Telegram faz download, não há limite direto

DOWNLOAD:
  - Máximo: 20 MB por arquivo
  - Você faz download via getFile

FILE TYPES:
  - Document: qualquer tipo
  - Photo: até 10 MB
  - Video: até 50 MB
  - Audio: até 50 MB
```

### 7.4 Limites de Inline Keyboards

```
BOTÕES POR MENSAGEM: 300 máximo
COLS POR LINHA: Sem limite oficial (mas 5-10 recomendado)
LINHAS: Sem limite oficial
TAMANHO DO TEXT: 64 caracteres por botão
CALLBACK_DATA: 64 bytes

MELHOR PRÁTICA:
  - Max 2-3 colunas
  - Max 5-10 linhas
  - Menos de 20 botões visíveis de uma vez
```

### 7.5 Como Lidar com 429 (Too Many Requests)

```
ERROR:
  "ok": false,
  "error_code": 429,
  "description": "Too Many Requests: retry after 23",
  "parameters": { "retry_after": 23 }

RESPOSTA:
  1. Leia retry_after (em segundos)
  2. Aguarde esse tempo
  3. Tente novamente

PREVENÇÃO:
  - Implementar fila de requisições (queue)
  - Usar Semaphore para limitar requisições simultâneas
  - Spread broadcasts over 8-12 horas
  - Para muitos usuários, usar Paid Broadcasts
```

### 7.6 Quotas de API

```
Dados do Telegram (não oficial, baseado em experiência):
  - ~30 requisições/segundo por bot (estimado)
  - ~1000 requisições/minuto por bot
  - Depois disso: rate limiting aumenta delays

SOLUÇÃO PARA ALTA VOLUME:
  1. Host seu próprio Bot API server (telegram-bot-api)
  2. Sem limites de requisição
  3. Requer conhecimento técnico
  4. Open source em GitHub
```

---

## 8. FUNCIONALIDADES AVANÇADAS

### 8.1 Comandos do Bot

```
/start - Iniciar bot (recebe com parâmetros via deep linking)
/help - Ajuda
/settings - Configurações

ESTRUTURA NO UPDATE:
{
  "message": {
    "text": "/start visitor_123",
    "entities": [
      {
        "type": "bot_command",
        "offset": 0,
        "length": 6
      }
    ]
  }
}
```

### 8.2 Inline Queries (@search)

```
Usuário digita: @seubot termo_busca

Você recebe:
{
  "update_id": 123,
  "inline_query": {
    "id": "abc123",
    "from": { "id": 987654321, ... },
    "query": "termo_busca",
    "offset": ""
  }
}

Você responde com answerInlineQuery:
{
  "inline_query_id": "abc123",
  "results": [
    {
      "type": "article",
      "id": "1",
      "title": "Resultado 1",
      "input_message_content": {
        "message_text": "Conteúdo"
      },
      "description": "Descrição curta"
    }
  ]
}
```

### 8.3 Queries de Callback (@botão)

```
Usuário clica botão com callback_data: "opt_1"

Você recebe:
{
  "update_id": 123,
  "callback_query": {
    "id": "xyz789",
    "from": { "id": 987654321, ... },
    "chat_instance": "123456",
    "data": "opt_1",
    "message": { /* message object */ }
  }
}

Você responde com answerCallbackQuery:
{
  "callback_query_id": "xyz789",
  "text": "Você escolheu opção 1!",
  "show_alert": false  // true = popup, false = toast
}
```

### 8.4 Polling (Enquetes)

```
CRIAR POLL:
POST /sendPoll

{
  "chat_id": -1001234567890,
  "question": "Qual é sua cor favorita?",
  "options": ["Vermelho", "Azul", "Verde"],
  "is_anonymous": false,
  "type": "quiz",  // ou "regular"
  "correct_option_id": 0,  // Para quiz
  "allows_multiple_answers": true
}

RECEBER RESPOSTAS:
{
  "update_id": 123,
  "poll_answer": {
    "poll_id": "poll123",
    "user": { "id": 987654321, ... },
    "option_ids": [0, 2]  // Índices das opções escolhidas
  }
}
```

### 8.5 Reactions (Reações a Mensagens)

```
PARA RASTREAR REAÇÕES:

1. SetWebhook com "message_reaction" em allowed_updates
2. Receba updates:
{
  "update_id": 123,
  "message_reaction": {
    "chat": { "id": ..., "type": "supergroup" },
    "message_id": 456,
    "user": { "id": 987654321, ... },
    "actor_chat_id": null,
    "old_reaction": [],
    "new_reaction": [
      {
        "type": "emoji",
        "emoji": "👍"
      }
    ],
    "date": 1703001234
  }
}
```

### 8.6 Business Accounts (Contas de Negócios)

```
ESTRUTURA:
{
  "business_connection_id": "conn123",
  "business_message": {
    "text": "Mensagem de negócio",
    "from": { ... },
    "date": 1703001234
  }
}

PARA TRACKGRAM:
- Se bot conectado à conta business, pode receber msgs de lá
- Separado de chats normais
- Permite separar customer support do tracking
```

### 8.7 Reações em Massa (Message Reaction Count)

```
RECEBER STATS DE REAÇÕES:

{
  "update_id": 123,
  "message_reaction_count": {
    "chat": { "id": -1001234567890, "type": "supergroup" },
    "message_id": 456,
    "date": 1703001234,
    "reactions": [
      {
        "type": "emoji",
        "emoji": "👍",
        "count": 42
      },
      {
        "type": "emoji",
        "emoji": "❤️",
        "count": 15
      }
    ]
  }
}

⚠️ IMPORTANTE: Chega com delay (minutos)
⚠️ Apenas se chat é anônimo (reactions não rastreadas por user)
```

### 8.8 Topics/Fóruns (Supergrupos)

```
CRIAR TOPIC:
POST /createForumTopic

{
  "chat_id": -1001234567890,
  "name": "Sugestões de Features",
  "icon_color": 16711680,  // Cor em RGB
  "icon_custom_emoji_id": null
}

RESPOSTAS NO TOPIC:
{
  "message": {
    "message_thread_id": 123,  // ID do topic
    "is_topic_message": true,
    "text": "Mensagem no topic"
  }
}

ENVIAR NO TOPIC:
{
  "chat_id": -1001234567890,
  "message_thread_id": 123,
  "text": "Resposta no topic"
}
```

---

## 9. NOTIFICAÇÕES E ALERTAS

### 9.1 Silenciar Notificações

```json
{
  "chat_id": 987654321,
  "text": "Mensagem silenciosa (não emite som)",
  "disable_notification": true
}

RESULTADO:
- User recebe mensagem
- Sem som/vibração
- Sem notificação push visível
- Apenas aparece no chat
```

### 9.2 Notificações Push Efetivas

```
DICAS:
1. Use text curto e descritivo
2. Evie ALL CAPS (parece spam)
3. Personalize com nome do user
4. Envie em horário apropriado
5. Não envie >1 notificação/hora por user
6. Use disable_notification para alertas menos críticos

EXEMPLO BOM:
"João, seu link de acesso expirou em 5 minutos"

EXEMPLO RUIM:
"CLIQUE AQUI AGORA!!! OFERTA LIMITADA!!!"
```

### 9.3 Som Personalizado (Não suportado via API)

```
❌ Bot API NÃO permite definir sons customizados
❌ Apenas notificações padrão do Telegram

ALTERNATIVA:
- User configura manualmente em Telegram Settings
- Bot pode notar em grupo (menção, poll, etc)
```

### 9.4 Prioridade de Notificação (Não suportado via API)

```
❌ Bot API NÃO permite setar prioridade

✅ ALTERNATIVA:
- Usar @username menção (mais visível)
- Enviar no início do dia
- Usar formatação com BOLD
```

---

## 10. ANALYTICS E MÉTRICAS

### 10.1 API Nativa de Analytics
```
❌ NÃO EXISTE

Telegram NÃO fornece API de analytics para bots
Você DEVE rastrear manualmente
```

### 10.2 Implementar Seu Próprio Analytics (Para TrackGram)

```javascript
// 1. Log cada evento em banco:
{
  "event_type": "chat_member",
  "user_id": 987654321,
  "chat_id": -1001234567890,
  "action": "joined",  // joined, left, kicked
  "link_used": "visitor_123_promo",
  "timestamp": 1703001234,
  "source": "invite_link_name"
}

// 2. Quando user clica botão:
{
  "event_type": "callback_query",
  "user_id": 987654321,
  "action": "clicked_opt_1",
  "timestamp": 1703001234
}

// 3. Quando message é recebida:
{
  "event_type": "message",
  "user_id": 987654321,
  "chat_id": -1001234567890,
  "message_type": "text",  // photo, video, etc
  "timestamp": 1703001234
}
```

### 10.3 Rastrear Visualizações de Mensagens

```
❌ Bot API NÃO fornece contagem de visualizações

⚠️ Approximações possíveis:
1. Contar reações (users que viram)
2. Contar replies
3. Contar forwards
4. Usar Mini App + analytics própria

EXEMPLO COM WEB APP:
- Envie link para web app
- Web app carrega → você registra view
- User interage → você registra evento
- Web app fecha → você registra saída
```

### 10.4 Estatísticas de Chat/Grupo

```
MÉTODOS DISPONÍVEIS:

getChatMembersCount:
  → Retorna total de membros

getChatAdministrators:
  → Lista todos os admins

getChatMember:
  → Info de um membro específico

❌ NÃO TEM:
  - Estatísticas de crescimento
  - Histórico de members over time
  - Taxa de churn
  - Engagement metrics

✅ VOCÊ DEVE:
  - Cron job que chama getChatMembersCount periodicamente
  - Armazenar em banco
  - Calcular métricas próprias
```

### 10.5 Dashboard de Análise Recomendado

```
DADOS A RASTREAR:

visitors_events:
  - visitor_id
  - invite_link_name
  - click_date
  - join_date (null se não entrou)
  - left_date (null se ainda membro)
  - fbc_pixel_id
  - utm_params

chat_events:
  - event_id
  - update_id
  - user_id
  - chat_id
  - event_type (joined, left, message, callback)
  - event_data (JSON)
  - timestamp

conversions:
  - user_id
  - visitor_id
  - conversion_date
  - conversion_type
  - fbc_params
  - facebook_event_id

QUERIES ÚTEIS:
- SELECT COUNT(*) FROM visitors_events WHERE join_date IS NOT NULL
  → Taxa de conversão (visitors que entraram)

- SELECT COUNT(DISTINCT user_id) FROM chat_events WHERE event_type = 'message'
  → Engagement (quem enviou mensagens)

- SELECT AVG(DATEDIFF(join_date, click_date))
  → Tempo médio até entrada
```

---

## 📌 RESUMO EXECUTIVO PARA TRACKGRAM

### Setup Recomendado:
```
1. ✅ Webhooks (em vez de long-polling)
   - Mais rápido e confiável
   - max_connections = 50-100 (depende de volume)
   - allowed_updates = ["message", "chat_member", "chat_join_request"]

2. ✅ Links únicos por visitante
   - createChatInviteLink + member_limit=1 + creates_join_request=true
   - Store em banco: (invite_link, visitor_id, utm_params)

3. ✅ Join Requests (obrigatória aprovação)
   - creates_join_request=true nos links
   - approveChatJoinRequest quando aprovar
   - Controle total sobre quem entra

4. ✅ Analytics própria
   - Log cada chat_member update
   - Log cada message
   - Integre com Facebook CAPI

5. ✅ Mensagens bem-vindo
   - Use sendMessage + parse_mode=MarkdownV2
   - Personalize com nome do usuário
   - Include link para seu dashboard
```

### Fluxo Ideal:
```
1. Visitante clica link em anúncio
   → https://t.me/seu_bot?start=visitor_123&utm_source=fb
   → Se nunca iniciou bot, vê botão START

2. Visitante clica link de convite
   → https://t.me/+ABC123xyz (criado com creates_join_request=true)
   → Telegram abre chat, pede "Request to Join"

3. Bot recebe chat_join_request update
   → Bot checa visitor_123 no banco
   → Bot aprova com approveChatJoinRequest

4. Visitor entra (chat_member update com status="member")
   → Bot registra entrada
   → Bot envia boas-vindas personalizada
   → Bot envia Facebook CAPI conversion

5. (Opcional) Visitor pode interagir
   → Clica botões (callback_query)
   → Envia mensagens (message update)
   → Bot registra todas as interações

6. Analytics
   → Visitas → Solicitações de entrada → Aprovações → Entregas → Conversões
```

### Limitações a Lembrar:
```
❌ Telegram NÃO fornece:
   - Qual link exato foi usado (precisa de workaround)
   - Analytics de viewers
   - Timestamps de quando viu mensagem
   - IP/device do user

✅ Você PODE:
   - Rastrear cada ação em banco
   - Integrar com Facebook CAPI
   - Usar Deep Linking (start parameters)
   - Enviar em massa (30 msg/seg, ou mais com pagamento)
   - Automatizar aprovações de requests
```

---

## 🔗 LINKS OFICIAIS

- **Bot API Oficial**: https://core.telegram.org/bots/api
- **Bot FAQ**: https://core.telegram.org/bots/faq
- **Webhooks Guide**: https://core.telegram.org/bots/webhooks
- **Mini Apps**: https://core.telegram.org/bots/webapps
- **Deep Linking**: https://core.telegram.org/api/links
- **Telegram Login**: https://core.telegram.org/widgets/login
- **Bot API Source (Self-hosted)**: https://github.com/tdlib/telegram-bot-api

---

## 📝 NOTAS FINAIS

1. **Rate Limiting**: Sempre implemente retry logic com exponential backoff
2. **Idempotência**: Telegram pode enviar updates duplicados - guarde update_id
3. **Segurança**: Valide secret_token se configurado
4. **Escalabilidade**: Se >1000 mensagens/minuto, considere Bot API self-hosted
5. **Compliance**: Respeite LGPD/GDPR - permita delete de dados dos usuários
6. **Documentação**: Telegram atualiza API frequentemente - check @BotNews

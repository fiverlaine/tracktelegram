
1. Contexto e Objetivo do Projeto
Você é um Engenheiro de Software Full Stack Sênior especialista em AdTech e APIs de redes sociais.
Eu quero construir um SaaS chamado "TrackGram" (clone do Track4You).
O objetivo do sistema é: Resolver a cegueira de dados em anúncios para Telegram. O sistema deve rastrear cliques em anúncios e cruzar esses dados com a entrada real do usuário em grupos do Telegram, enviando esses eventos via API de Conversão (CAPI) para o Facebook Ads.
2. Stack Tecnológica Preferida
Frontend: Next.js 14+ (App Router), React, Tailwind CSS.
Componentes UI: Shadcn/UI (para os cards, tabelas e formulários modernos).
Ícones: Lucide React.
Backend/Database: Supabase (PostgreSQL, Auth e Edge Functions para os webhooks).
Telegram Bot API.
3. Estrutura Visual e UX (Estilo Lovable)
O design deve ser "Dark Mode" por padrão, com acentos em roxo e neon (Cyberpunk clean), similar à referência do Track4You.
Páginas Principais:
Dashboard (Home):
4 Cards grandes no topo: Pageviews, Clicks na Página (Botão), Entradas (Conversão Real), Saídas (Churn).
Gráfico de linha temporal mostrando evolução de entradas x saídas.
Filtro de data no topo (Hoje, Ontem, Últimos 7 dias).
Meus Domínios: CRUD para adicionar domínios (ex: track.meusite.com).
Pixels: Formulário para salvar Pixel ID e Access Token do Facebook.
Canais (Telegram Bots):
Input para o Token do Bot (criado no BotFather).
Botão para "Validar Bot" e listar os grupos onde ele é admin.
Funis (O Coração do App):
Criação de links de rastreamento.
O usuário seleciona: Qual Pixel usar + Qual Canal de destino.
O sistema gera uma URL única intermediária.
4. Regras de Negócio e Lógica de Rastreamento (Backend)
Esta é a parte crítica. A lógica deve funcionar assim:
O Link (Middleware): Quando o lead clica no link gerado pelo sistema:
Registra PageView no banco.
Dispara evento PageView para o Facebook CAPI.
Exibe uma "Pre-sell page" simples com um botão "Entrar no Grupo".
O Clique: Quando clica no botão:
Registra Click no banco.
Gera um hash_id único para esse usuário.
Redireciona para o link do Telegram (t.me/seugrupo) passando parâmetros se possível, ou apenas aguarda a detecção.
A Conversão (Bot):
O Bot do Telegram (Webhooks) detecta o evento chat_join_request ou new_chat_member.
O backend cruza o horário/IP (fingerprinting básico) ou identificador para atribuir a conversão.
Ação: Envia o evento Lead ou CompleteRegistration para o Facebook CAPI contendo os dados do usuário.
A Saída:
Se o Bot detecta left_chat_member, registra a saída e atualiza as métricas de retenção.

5. Passo a Passo para Desenvolvimento (Cursor Composer)
Por favor, não gere todo o código de uma vez. Vamos por etapas. Comece executando o Passo 1 até passo 3:
Passo 1: Setup e UI do Dashboard
Crie a estrutura do projeto Next.js com Tailwind e Shadcn. Configure o Layout com uma Sidebar lateral (Menu: Dashboard, Domínios, Pixels, Canais, Funis). Crie a tela de Dashboard com dados "mockados" (fictícios) apenas para visualizar o design (Cards de métricas e Gráficos).
Passo 2: Modelagem de Dados (Supabase/SQL)
Gere o script SQL para criar as tabelas necessárias:
users (auth)
pixels (facebook tokens)
telegram_bots (bot tokens)
funnels (configurações de link)
events (tabela de log para pageviews, clicks, joins, leaves).
Passo 3: CRUD de Configurações
Implemente as telas de cadastro de Pixels e Bots do Telegram.
Passo 4: Lógica do Bot e Webhooks
Implemente a API Route que receberá os updates do Telegram (Webhook) para detectar quando alguém entra ou sai do grupo.
Ao escrever o código, foque na robustez da API de Conversão do Facebook, garantindo que o payload de dados (User Agent, IP, fbp, fbc) seja tratado corretamente para maximizar o "Event Match Quality".

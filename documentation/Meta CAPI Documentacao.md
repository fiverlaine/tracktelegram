# Guia Técnico: Implementando a Meta Conversions API (CAPI) em um SaaS com Integração ao Telegram

## Visão Geral do Fluxo

Este guia detalha como integrar a **Meta Conversions API (CAPI)** em uma
aplicação SaaS para rastrear conversões de usuários vindos de anúncios
do Facebook até a entrada em um grupo ou canal no Telegram. O fluxo que
implementaremos é o seguinte:

1.  **Clique no Anúncio e Acesso à Landing Page:** Um usuário clica em
    um anúncio no Facebook e é direcionado a uma página do seu site
    (landing page) que recebe parâmetros de URL como `fbclid` (Facebook
    Click ID).
2.  **Captura de Identificadores na Página:** A landing page coleta
    identificadores do usuário -- incluindo `fbclid` (da URL), cookies
    do Facebook Pixel (`_fbc` e `_fbp`) e o **User-Agent** do navegador
    -- e gera um identificador único interno (chamado **visitor_id**)
    para esse visitante.
3.  **Registro de Eventos Iniciais:** O servidor registra eventos
    iniciais como **PageView** (visualização de página) e um **Click**
    (por exemplo, o clique do usuário em um botão de cadastro/convite na
    página). Esses eventos são associados ao _visitor_id_.
4.  **Geração de Convite Único do Telegram:** Quando o usuário solicita
    ingresso no Telegram (por exemplo, clicando em um botão \"Entrar no
    grupo Telegram\"), o sistema gera um link de convite único via API
    do Telegram. Esse link é criado com o método `createChatInviteLink`
    do Bot API, usando o _visitor_id_ como nome do convite e limitando o
    uso a 1 pessoa.
5.  **Ingresso no Grupo/Canal:** O usuário é redirecionado para o link
    de convite e entra automaticamente no grupo ou canal do Telegram
    através desse convite único.
6.  **Webhook de Entrada no Telegram:** O bot do Telegram, através de um
    webhook configurado, detecta que um novo membro entrou no grupo. O
    update recebido contém o objeto `invite_link` indicando qual convite
    foi usado. O sistema extrai o _visitor_id_ do campo
    `invite_link.name` (que inserimos no momento da criação) e registra
    um evento de conversão **\"join\"** (entrada no grupo) para aquele
    visitante.
7.  **Envio do Evento de Conversão à Meta (Facebook):** O servidor então
    envia esse evento \"join\" para a Meta Conversions API,
    classificando-o como um evento **Lead** (pois a entrada no grupo é
    considerada uma conversão/lead) com todos os parâmetros necessários
    (nome do evento, timestamp, dados do usuário para matching, etc.).

Ao final desse fluxo, a Meta deverá receber um evento de conversão
(Lead) associando aquele usuário à campanha/anúncio clicado
originalmente, permitindo atribuição adequada.

Nos tópicos a seguir, explicaremos detalhadamente cada etapa, incluindo
conceitos importantes, configuração de credenciais, captura de dados,
integração com a API do Telegram e envio de eventos pela CAPI, com
exemplos de código e melhores práticas de segurança e privacidade.

## O que é a Meta Conversions API e por que usá-la

A **Meta Conversions API (CAPI)** é uma interface de API
server-to-server que permite enviar eventos de conversão diretamente do
seu servidor para os servidores do Facebook (Meta), em vez de (ou em
complemento a) enviar esses eventos pelo navegador do usuário via Pixel.
Diferentemente do Pixel tradicional (que é executado no cliente, sujeito
a bloqueios de cookies, limitações de navegador e ad blockers), a CAPI
proporciona um meio **mais confiável e controlado** de transmitir
eventos, melhorando a qualidade e a quantidade de dados de conversão
recebidos pelo
Facebook[\[1\]](https://help.adnabu.com/pt-br/article/como-obter-um-token-de-acesso-do-seu-pixel-do-facebook-que-utiliza-a-api-de-conversoes-8giuct/#:~:text=A%20API%20de%20Convers%C3%B5es%20nos,Saiba%20mais).
Em resumo:

- **Confiabilidade e Precisão:** Eventos enviados do servidor não sofrem
  perdas devidas a bloqueadores de script ou restrições de cookies de
  terceiros. Isso aumenta a taxa de correspondência e a precisão na
  atribuição de eventos a campanhas, mesmo em cenários como o iOS 14+
  (que limita tracking no cliente). Conforme a documentação, a CAPI
  ajuda a **"rastrear e criar uma conexão mais confiável com o Facebook
  e maximizar a eficiência dos eventos do seu
  site"**[\[1\]](https://help.adnabu.com/pt-br/article/como-obter-um-token-de-acesso-do-seu-pixel-do-facebook-que-utiliza-a-api-de-conversoes-8giuct/#:~:text=A%20API%20de%20Convers%C3%B5es%20nos,Saiba%20mais).
  Em outras palavras, ela melhora a **Event Match Quality (EMQ)**, pois
  permite incluir dados adicionais do usuário (como Click ID,
  email/telefone hasheados, etc.) que ajudam o Facebook a encontrar o
  usuário correto que realizou a conversão.
- **Controle Total dos Dados:** Com a CAPI, os dados trafegam
  diretamente do seu backend para o Facebook, sob seu controle. Você
  pode **garantir a privacidade**, fazendo hashing de informações
  pessoais antes do envio e enviando apenas o que for necessário,
  cumprindo normas como LGPD/GDPR. Também pode validar e enriquecer os
  dados (por exemplo, adicionando o Facebook Click ID capturado) para
  melhorar o matching.
- **Resiliência a Mudanças de Plataforma:** À medida que navegadores
  impõem restrições (ITP, fim de third-party cookies, etc.), a CAPI
  garante que você **não dependa apenas de cookies do navegador** para
  atribuir conversões. Por exemplo, o parâmetro `fbclid` presente na URL
  do anúncio pode ser aproveitado no servidor para vincular cliques de
  anúncios a conversões, via CAPI, contornando limitações do lado
  cliente[\[2\]](https://www.reddit.com/r/PPC/comments/185ylfo/facebook_tracking_solutions_using_fbclid/#:~:text=Finally%2C%20while%20the%20FBCLID%20is,parameters%20for%20your%20core%20tracking)[\[3\]](https://www.reddit.com/r/PPC/comments/185ylfo/facebook_tracking_solutions_using_fbclid/#:~:text=The%20closest%20official%20use%20is,EMQ).
- **Atribuição Melhorada:** Ao enviar eventos com identificadores como
  `fbc` (Facebook Click ID cookie derivado do fbclid) e `fbp` (Facebook
  Browser ID cookie), o Facebook consegue atribuir aquela conversão a um
  clique específico no anúncio e a um perfil de usuário, elevando a
  qualidade da atribuição. O parâmetro `fbclid` em si não é enviado
  diretamente, mas ele é usado para gerar os cookies **\_fbc** e
  **\_fbp** que a CAPI
  utiliza[\[3\]](https://www.reddit.com/r/PPC/comments/185ylfo/facebook_tracking_solutions_using_fbclid/#:~:text=The%20closest%20official%20use%20is,EMQ).
  De fato, o `fbclid` é automaticamente anexado pelo Facebook aos links
  de anúncios e é **utilizado internamente pelo Meta para criar os
  cookies** `fbc` **(Facebook Click) e** `fbp` **(Facebook Browser)**,
  que **podem (e devem) ser enviados via Conversions API para melhorar o
  match dos
  eventos**[\[3\]](https://www.reddit.com/r/PPC/comments/185ylfo/facebook_tracking_solutions_using_fbclid/#:~:text=The%20closest%20official%20use%20is,EMQ).

Em resumo, usar a CAPI em conjunto com (ou no lugar de) o Pixel do
Facebook **aumenta a confiabilidade do tracking e preserva a
visibilidade de conversões** que de outra forma poderiam ser perdidas.
Isso é especialmente importante para eventos fora do site (como a
entrada em um grupo Telegram) que o Pixel não consegue capturar
diretamente. A CAPI permitirá informar esses eventos ao Facebook,
fechando o loop da atribuição.

## Obtendo o Pixel ID e o Token de Acesso da API de Conversões

Para usar a Conversions API, você precisará de duas informações
essenciais do lado da Meta:

- **ID do Pixel:** identificador único do seu Pixel do Facebook (um
  número). Esse Pixel deve estar associado à conta de negócio/projeto
  onde você quer registrar os eventos.
- **Token de Acesso (Access Token) da API de Conversões:** uma chave
  secreta que autentica as requisições do seu servidor ao endpoint do
  Pixel. Esse token é gerado no gerenciador de eventos do Facebook.

**Passo a passo para obter o Pixel ID e o Token:**

1.  Acesse o **Gerenciador de Eventos** do Facebook (Facebook Events
    Manager) dentro do seu Gerenciador de Negócios. Navegue até **Fontes
    de Dados** e selecione o Pixel desejado (ou crie um novo Pixel se
    ainda não tiver um). Você verá o **ID do Pixel** listado nas
    configurações -- geralmente é um número longo. Copie esse ID e
    guarde-o.
2.  Ainda nas configurações do Pixel selecionado, role até a seção **API
    de Conversões**. Clique em **Configurar manualmente** (Setup
    Manually). Em seguida, haverá um botão para **\"Gerar token de
    acesso\"** (Access Token). Clique para gerar um token. (Se o
    Facebook oferecer opções como usar **Dataset Quality API**, você
    pode gerar com ou sem, conforme necessário -- se não tiver certeza,
    gere sem essa opção para simplicidade.)
3.  Copie o token gerado e guarde-o em local seguro. **Atenção:** esse
    token concede acesso para enviar eventos ao seu Pixel, portanto
    trate-o como uma senha secreta. Não exponha o token publicamente
    (por exemplo, nunca o coloque em código front-end). Armazene-o no
    backend, preferencialmente via variáveis de ambiente ou um cofre de
    segredos.
4.  Opcional: Ainda no Gerenciador de Eventos, pode ser útil anotar o
    **ID de teste de eventos** (Test Event Code) caso queira testar a
    integração antes de ir a produção. Esse código de teste permite
    verificar eventos em tempo real na aba _\"Teste de Eventos\"_ do
    Gerenciador de Eventos, sem que eles sejam atribuídos às campanhas.

Agora você tem o **Pixel ID** e o **Access Token** necessários. Por
exemplo, suponha que seu Pixel ID seja `1234567890` e o token seja
`EAAB...`. Vamos utilizá-los ao construir as requisições para a CAPI.

## Estruturação dos Eventos: PageView, Click e Join (Lead)

Antes de mergulhar na implementação prática, é importante definir
**quais eventos serão registrados e enviados** ao Facebook, e como
iremos representá-los:

- **PageView:** representa a visualização da página de destino (landing
  page) pelo usuário ao clicar no anúncio. Esse é um evento padrão do
  Pixel do Facebook, geralmente registrado automaticamente pelo Pixel.
  No nosso contexto, podemos registrar esse evento no servidor para ter
  uma confirmação server-side e eventualmente enviar via CAPI também
  (embora muitas implementações confiem apenas no Pixel para PageView).
- **Click (Convite Telegram):** representa o momento em que o usuário
  clica no botão/ação no seu site para se juntar ao grupo Telegram.
  Podemos considerar esse um evento intermediário no funil. Podemos
  tratá-lo como um evento personalizado (por exemplo,
  \"ClickInviteTelegram\") ou simplesmente logá-lo internamente.
  Dependendo da necessidade de análise, poderíamos enviar esse evento
  via CAPI como um evento customizado para medir quantos usuários
  clicaram para entrar (embora não seja obrigatório para atribuição
  final).
- **Join (Lead):** representa a conversão final quando o usuário
  efetivamente entra no grupo ou canal Telegram. Vamos mapear este
  evento para o evento padrão **Lead** do Facebook, pois indica que um
  potencial cliente demonstrou interesse significativo (no caso,
  ingressou no canal de comunicação da empresa). Esse evento \"Lead\"
  será enviado via CAPI com os parâmetros adequados. Não há como o Pixel
  rastrear isso diretamente (pois ocorre fora do site), então a CAPI é
  essencial aqui.

**Relação entre eventos internos e eventos Facebook:**

- _Evento interno \"pageview\"_ → **Facebook Event \"PageView\"** (pode
  ser enviado pelo Pixel e/ou CAPI).
- _Evento interno \"click\"_ → **Facebook Event personalizado** (ex.:
  \"ClickInvite\") ou pode não ser enviado, usado só para lógica
  interna.
- _Evento interno \"join\"_ → **Facebook Event \"Lead\"** (enviado via
  CAPI).

No mínimo, garantiremos o envio do **Lead** via CAPI, pois é o mais
importante para medir conversões. O PageView e possivelmente o clique
podem ser enviados também, mas se o Pixel Web já estiver instalado, o
PageView já seria capturado no navegador. Entretanto, abordaremos como
capturá-los no servidor para complementar os dados (e habilitar
deduplicação caso envie via CAPI também).

**Deduplicação de eventos:** Caso você opte por enviar, por exemplo,
PageView tanto pelo Pixel quanto via CAPI, é recomendável incluir um
identificador de evento (`event_id`) único em ambas as instâncias para o
Facebook não contar duas vezes o mesmo evento. Assim, manteríamos um
`event_id` comum entre o Pixel e a CAPI para o mesmo PageView. Para o
evento Lead, não há duplicata no Pixel (pois o Pixel não sabe desse
evento), então não precisamos nos preocupar com duplicação nesse caso.

Agora que definimos isso, vamos à implementação prática de cada parte do
fluxo.

## Capturando e Persistindo Parâmetros do Facebook (fbclid, \_fbc, \_fbp, User-Agent, IP)

A etapa 1 e 2 do fluxo ocorrem quando o usuário chega na _landing page_
após clicar no anúncio do Facebook. Nesse momento, precisamos capturar
os identificadores que permitirão conectar esse visitante à campanha de
origem quando formos enviar o evento de conversão.

Os principais dados a capturar são:

- **fbclid:** Query parameter automaticamente anexado pelo Facebook ao
  URL quando o clique vem de um anúncio. É um identificador único
  daquele clique no anúncio (Facebook Click ID). Exemplo de URL:
  `https://seudominio.com/pagina?fbclid=IwAR0...`. Vamos extrair esse
  valor da URL.
- **\_fbp (Facebook Browser ID):** Cookie do Facebook Pixel que
  identifica o navegador/visitante. Geralmente tem formato
  `fb.1.<timestamp>.<random>` -- por exemplo:
  `fb.1.1697570916.1111100000`. Se o Pixel do Facebook estiver instalado
  na página e configurado para first-party cookies, esse cookie é gerado
  automaticamente no primeiro carregamento da página. Podemos acessar
  esse valor via JavaScript no cliente ou via o header \"Cookie\" no
  servidor (caso a requisição inicial já contenha cookies do Pixel).
- **\_fbc (Facebook Click ID cookie):** Cookie do Facebook Pixel que
  armazena o fbclid da primeira visita do usuário ao site. Ele só é
  criado se houver um `fbclid` na URL e normalmente tem formato
  `fb.1.<timestamp>.<fbclid>`[\[4\]](https://stackoverflow.com/questions/67201385/how-does-facebook-convert-fbclid-to-fbc#:~:text=If%20you%20don%27t%20have%20the,milliseconds%2C%20and%20the%20fbclid%20value).
  Exemplo: `fb.1.1697570916234.IwAR0...`. Nem sempre esse cookie estará
  presente automaticamente -- depende de o Pixel script ter rodado e
  criado-o. Se não tivermos o cookie `_fbc` disponível, nós mesmos
  podemos construí-lo usando o fbclid capturado e o timestamp
  atual[\[4\]](https://stackoverflow.com/questions/67201385/how-does-facebook-convert-fbclid-to-fbc#:~:text=If%20you%20don%27t%20have%20the,milliseconds%2C%20and%20the%20fbclid%20value).
  (Observação: devemos _somente_ gerar `fbc` se realmente houver um
  fbclid indicando que o tráfego veio de anúncio; caso contrário, não
  invente um fbc -- envie apenas fbp ou outros
  dados[\[5\]](https://watsspace.com/blog/meta-conversions-api-fbc-and-fbp-parameters/#:~:text=%2A%20fbc%3A%20%2F%5Efb.1.d%7B13%7D.%5BA,Standardize%20how%20you%20generate%20event_ids)).
- **User-Agent:** O agente de usuário do navegador, obtido via
  `navigator.userAgent` no front-end ou via header `User-Agent` na
  requisição HTTP do cliente. Este dado é importante para enviar no
  `user_data` da CAPI, pois ajuda o Facebook a identificar o dispositivo
  do usuário para correspondência (é recomendado enviar
  `client_user_agent`).
- **Endereço IP:** Semelhante ao User-Agent, o IP do usuário também
  ajuda no matching (campo `client_ip_address` na CAPI). Podemos obtê-lo
  no servidor a partir da requisição (ex.: em Node, `req.ip` ou
  inspecionando cabeçalhos). Tenha cautela se seu servidor estiver atrás
  de um proxy ou load balancer -- pode ser necessário usar cabeçalhos
  como `X-Forwarded-For` para pegar o IP real.

Além desses dados para o Facebook, também iremos **gerar um**
`visitor_id` **interno** para identificar esse visitante através do
funil. Esse ID pode ser, por exemplo, um UUID v4 ou um ID numérico
sequencial do seu banco de dados, ou mesmo um hash aleatório. O
importante é que seja único por visitante (pelo menos por sessão de
conversão) e que consigamos incluir esse ID no link do Telegram e depois
reconhecê-lo quando o usuário entrar no grupo.

**Implementação da captura (exemplo em Node.js):**

Suponha que sua landing page acione uma rota no backend (por exemplo, um
endpoint Express) ou você esteja usando Next.js API routes, etc. No
momento em que o usuário chega, o servidor pode capturar os dados da
query e dos headers:

    app.get('/landing-page', (req, res) => {
        const fbclid = req.query.fbclid || null;
        const userAgent = req.get('User-Agent') || '';
        const ip = req.ip || req.connection.remoteAddress;

        // Se o Pixel do Facebook estiver rodando, ele pode ter criado cookies _fbc e _fbp
        const cookies = req.headers.cookie ? req.headers.cookie : '';
        // Função auxiliar para extrair valor de um cookie específico:
        function getCookieValue(name, cookieHeader) {
          const match = cookieHeader.match(new RegExp('(^|;)\\s*' + name + '=([^;]+)'));
          return match ? decodeURIComponent(match[2]) : null;
        }
        let fbpCookie = getCookieValue('_fbp', cookies);
        let fbcCookie = getCookieValue('_fbc', cookies);

        // Se não houver cookie _fbc mas temos fbclid, construímos o fbc:
        if (!fbcCookie && fbclid) {
          const timestamp = Date.now();
          fbcCookie = `fb.1.${timestamp}.${fbclid}`;
        }

        // Gerar um visitor_id único (pode usar libs como uuid, aqui simplificado):
        const visitorId = generateUniqueId(); // sua função para gerar ID

        // Persistir esses dados no banco ou armazenamento desejado
        saveVisitorData({
           visitor_id: visitorId,
           fbclid: fbclid,
           fbp: fbpCookie,
           fbc: fbcCookie,
           user_agent: userAgent,
           ip_address: ip,
           first_page_view_time: Date.now()
        });

        // Registrar evento PageView no servidor (opcionalmente enviar resposta pixel ou redirecionar)
        logEvent({ visitor_id: visitorId, event: 'pageview', timestamp: Date.now() });

        // ... aqui você poderia renderizar a página ou retornar um HTML que utiliza esses dados ...
        res.render('landing-page', { visitorId }); // Por exemplo, envia o visitorId ao front-end para usos posteriores
    });

> **Observação:** Se a sua aplicação for single-page (SPA) ou o
> front-end fizer chamadas à API separadas, você pode precisar capturar
> o `fbclid` no front-end (via `window.location.search`) e então
> enviá-lo ao backend em uma requisição para salvar. Mas o princípio é o
> mesmo: garantir que o backend receba o fbclid e gere fbc/fbp. Em
> aplicações tradicionais (Multi-Page) como acima, o servidor já recebe
> o fbclid na primeira requisição GET.

No código acima, vimos que se não existe `_fbc` cookie, mas temos o
parâmetro `fbclid`, criamos o valor de `fbc` concatenando
`"fb.1." + <timestamp_em_ms> + "." + <fbclid>`[\[4\]](https://stackoverflow.com/questions/67201385/how-does-facebook-convert-fbclid-to-fbc#:~:text=If%20you%20don%27t%20have%20the,milliseconds%2C%20and%20the%20fbclid%20value).
Esse é o formato esperado pela Meta caso você precise enviar o fbc
manualmente. Confirmando: segundo a documentação, _\"se você não tem o
Pixel instalado ou o cookie \_fbc disponível, então o valor de fbc é a
combinação da versão, índice de domínio, timestamp UNIX em milissegundos
e o valor
fbclid\"_[\[4\]](https://stackoverflow.com/questions/67201385/how-does-facebook-convert-fbclid-to-fbc#:~:text=If%20you%20don%27t%20have%20the,milliseconds%2C%20and%20the%20fbclid%20value).

Após capturar e armazenar os identificadores, também registramos
internamente um evento \"pageview\". Nesse exemplo, usamos uma função
fictícia `logEvent` para salvar no banco ou em memória. Isso pode
alimentar estatísticas próprias ou servir para caso queira enviar esse
evento via CAPI também.

**Visitor ID:** O _visitor_id_ gerado é salvo junto com esses dados. Ele
será fundamental para os próximos passos, pois será usado como **ponte
entre o mundo web e o Telegram** -- iremos inseri-lo no link de convite
e recuperá-lo depois no webhook do Telegram.

## Registro do Evento de Clique (CTA para Telegram)

Ainda na landing page, provavelmente há um **Call To Action (CTA)** para
o usuário prosseguir e entrar no seu grupo ou canal do Telegram -- por
exemplo, um botão \"Entrar no grupo Telegram\". Quando o usuário clicar
nesse botão, podemos registrar um evento de \"click\" no backend.

Se sua página for renderizada no servidor, você pode fazer esse botão
ser um link que aponta para um endpoint que gera o convite. Se for uma
SPA, o click pode chamar uma função JavaScript que faz uma requisição
AJAX ao backend para gerar o link do Telegram.

De qualquer forma, no backend, ao lidar com essa ação, faça algo como:

    app.post('/generate-telegram-link', async (req, res) => {
        const visitorId = req.body.visitorId; // assumindo que foi enviado pelo front
        // (Você poderia também identificar o usuário via sessão ou token, etc.)
        logEvent({ visitor_id: visitorId, event: 'click_invite', timestamp: Date.now() });

        // (Aqui entraremos na lógica de gerar o link de convite do Telegram, descrita a seguir)
    });

O importante é registrar que o visitante com _visitor_id_ X clicou para
entrar no Telegram. Esse evento (`click_invite`) pode ser persistido. Em
alguns casos, você poderia inclusive mandar esse evento ao Facebook como
um evento customizado via CAPI, mas vamos focar no principal (Lead). O
registro do clique serve mais para fins de auditoria interna ou funil, e
para acionar a geração do convite.

## Gerando um Link de Convite Único no Telegram via API

Agora entramos no passo crítico 4: **gerar um link de convite do
Telegram que seja único para aquele visitante**. Usaremos a **Telegram
Bot API** para isso, através do método
[`createChatInviteLink`](https://core.telegram.org/bots/api#createchatinvitelink).

**Pré-requisitos:** - Você deve ter um **bot do Telegram** configurado
(criado via @BotFather) e adicionar esse bot como **administrador** do
grupo ou canal no qual deseja que os usuários entrem. O bot precisa ter
permissão de convidar usuários (permite gerenciar links de convite).

- Tenha o **TOKEN** HTTP API do seu bot (fornecido pelo BotFather).
- Tenha o **ID ou @username do chat** do Telegram (grupo ou canal) para
  o qual criar o convite. Você pode obter o ID adicionando o bot ao grupo
  e usando API, ou através de ferramentas. Suponha que temos `CHAT_ID`
  definido (pode ser um número tipo `-1001234567890` para grupo ou
  `@nomeDoCanal` para canal público).

Vamos criar o link via API. O método `createChatInviteLink` nos permite
especificar: - `chat_id`: o identificador do chat (nosso grupo ou
canal). - `name`: um nome para o link (opcional, até 32 caracteres).
Vamos usar este campo para colocar nosso _visitor_id_, pois quando
alguém usar esse link, o Telegram vai nos devolver qual link (pelo nome)
foi
usado[\[6\]](https://docs.python-telegram-bot.org/en/v21.7/telegram.chatinvitelink.html#:~:text=). -
`member_limit`: limite de usuários que podem usar o link. Colocaremos
`1` para torná-lo de uso
único[\[7\]](https://medium.com/@cyri113/telegram-web-app-unique-invites-dc0607bcc024#:~:text=const%20bot%20%3D%20new%20Bot%28String%28process,catch%20%28e%29)[\[8\]](https://core.telegram.org/bots/api#chatmemberupdated#:~:text=member_limit%20Integer%20Optional%20The%20maximum,True%2C%20member_limit%20can%27t%20be%20specified). -
(Opcional `expire_date`: poderíamos definir um timestamp para o link
expirar, se quisermos que convites fiquem válidos por tempo limitado.
Não obrigatório.) - Não vamos usar `creates_join_request` porque
queremos entrada direta, não um pedido de aprovação (deixar false).

**Exemplo de geração de link (Node.js usando fetch/axios):**

    const BOT_TOKEN = '<seu_bot_token>';
    const CHAT_ID = <ID_DO_GRUPO>;  // ex: -1001234567890

    async function createInvite(visitorId) {
        const apiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/createChatInviteLink`;
        const payload = {
            chat_id: CHAT_ID,
            name: visitorId,        // embedding visitor id
            member_limit: 1         // one-time use link
        };
        const resp = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (data.ok) {
            return data.result.invite_link; // URL do convite
        } else {
            throw new Error(`Erro ao criar link: ${data.description}`);
        }
    }

Esse código faz uma chamada HTTP à Bot API do Telegram. Se for
bem-sucedido, `data.result` será um objeto `ChatInviteLink` contendo
campos como `invite_link` (a URL do convite em si), `creator`,
`creates_join_request` etc., incluindo o campo `name` igual ao que
enviamos (o
visitor_id)[\[6\]](https://docs.python-telegram-bot.org/en/v21.7/telegram.chatinvitelink.html#:~:text=).
O campo `invite_link` é o que precisamos enviar de volta ao usuário.

**Exemplo de uso dentro do endpoint:**

Continuando o endpoint `/generate-telegram-link` do exemplo anterior:

    app.post('/generate-telegram-link', async (req, res) => {
        const visitorId = req.body.visitorId;
        logEvent({ visitor_id: visitorId, event: 'click_invite', timestamp: Date.now() });

        try {
            const inviteUrl = await createInvite(visitorId);
            // Podemos retornar esse link para o front-end
            res.json({ invite_link: inviteUrl });
        } catch (e) {
            console.error(e);
            res.status(500).send('Failed to create invite link');
        }
    });

No front-end, você pode então pegar o `invite_link` retornado (por
exemplo, `https://t.me/+" alguma coisa`) e redirecionar o usuário para
ele. Como demonstrado em um tutorial, o link pode ser simplesmente
colocado em um `<a href="invite_link">Entrar no grupo</a>` para que o
usuário clique e
vá[\[9\]](https://medium.com/@cyri113/telegram-web-app-unique-invites-dc0607bcc024#:~:text=),
ou você pode fazer `window.location = invite_link` via JavaScript para
redirecioná-lo automaticamente.

**Detalhes importantes:** - **Link de uso único:** definindo
`member_limit: 1`, assim que _um_ usuário usar o link e entrar no grupo,
ele se tornará inválido para outros. Isso impede que o link seja
compartilhado e reutilizado por múltiplas pessoas, garantindo que cada
link está atrelado a um único visitante (e consequentemente a um único
fbclid).

- **Nome do convite:** estamos usando `name = visitorId`. Segundo a API,
  podemos usar até 32 caracteres para
  nome[\[10\]](https://core.telegram.org/bots/api#chatmemberupdated#:~:text=chat_id%20Integer%20or%20String%20Yes,joining%20the%20chat%20via%20the).
  Certifique-se que seu visitor_id não ultrapasse isso. Se você usar um
  UUID completo, ele tem 36 caracteres, então pode ser preciso abreviar
  (talvez usar um hash base64url de 16 bytes = 22 caracteres, por
  exemplo). O nome não é visível para usuários finais, mas **poderá ser
  visto por administradores do grupo ao listarem links de convite
  ativos**, e será devolvido no webhook. Portanto, **não coloque
  informações pessoais nesse nome** -- use apenas o identificador interno
  anônimo.
- **Bot admin:** Lembrando, o bot precisa ser admin no chat. A
  documentação enfatiza: _\"The bot must be an administrator in the chat
  for this to work and must have the appropriate administrator
  rights.\"_[\[11\]](https://core.telegram.org/bots/api#chatmemberupdated#:~:text=Use%20this%20method%20to%20create,invite%20link%20as%20ChatInviteLink%20object).
  Se o bot não for admin ou não tiver permissão de adicionar usuários, a
  chamada irá falhar.

Após gerar o link e enviar ao usuário, este provavelmente clicará e será
levado para o Telegram (seja app ou web) e ingressará no chat.

## Redirecionando o Usuário para o Telegram

No momento em que retornamos o `invite_link` para o cliente, temos que
efetivamente levar o usuário a usá-lo. Existem algumas considerações
práticas aqui:

- Se você retornou via AJAX, no JavaScript do front-end você pode fazer
  algo como:

<!-- -->

- fetch('/generate-telegram-link', { method: 'POST', body: JSON.stringify({ visitorId }) })
  .then(res => res.json())
  .then(data => {
  window.location.href = data.invite_link;
  });

  Isso causará um redirecionamento do navegador do usuário para a URL do
  Telegram. Essa URL geralmente começa com `https://t.me/` ou
  `https://t.me/joinchat/` ou similar, dependendo do tipo de grupo. Ao
  acessá-la, se o usuário tiver o app Telegram instalado, será oferecido
  para abrir no app; senão, abrirá a versão web do Telegram solicitando
  login.

<!-- -->

- Se sua página era server-side, você poderia até redirecionar do
  servidor (HTTP 302 para o link do Telegram) em vez de retornar JSON.
  Mas cuidado: se gerar o link no mesmo request inicial, talvez você não
  tenha o visitor_id ainda salvo. Por isso, muitas implementações optam
  por gerar via AJAX quando o usuário clica, para ter certeza que o
  visitor_id está disponível. Uma alternativa seria gerar o convite
  antecipadamente (por exemplo, logo após o PageView, já gerar um link
  para aquele visitor e embutir a URL no botão). Isso também
  funcionaria, mas geraria convites que nem todos serão usados (se o
  visitante não clicar, fica um convite criado à toa -- você poderia
  revogar convites não usados após um tempo, se quiser).

Nesta altura, assumindo que o usuário clicou e foi para o Telegram, o
processo sai momentaneamente do seu sistema. Precisamos agora esperar
pela notificação do Telegram de que o usuário entrou no chat.

## Criando um Webhook para Escutar Entradas no Grupo (Telegram Bot Webhook)

Para que nosso sistema seja informado quando alguém entra no grupo via
nosso convite, usaremos o mecanismo de **updates** do Telegram Bot API.
Existem duas formas: _webhook_ (o Telegram envia uma requisição ao seu
servidor) ou _polling_ (seu bot fica perguntando de tempos em tempos).
Webhook é mais eficiente e recomendado em produção.

**Configuração do webhook:** Você chamará a API do Telegram para definir
um webhook para o seu bot. Um exemplo de chamada (via GET) seria:

    https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<seu_dominio>/webhook/telegram&allowed_updates=["chat_member"]

- `url`: a URL do seu servidor que receberá as updates. Deve ser HTTPS
  (obrigatório) e preferencialmente confiável.
- `allowed_updates`: por padrão, o Telegram manda várias tipos de update
  (mensagens, etc.). Podemos restringir para receber apenas o
  necessário. No nosso caso, as entradas no grupo virão como tipo
  **chat_member** (atualização de status de membro). Então passamos
  `["chat_member"]` para dizer que só queremos essas. Isso é importante
  para receber **invite_link** nos
  dados[\[12\]](https://stackoverflow.com/questions/77720606/how-can-i-get-the-chat-invite-link-through-which-a-member-joins-in-node-telegram#:~:text=,i%20thought%20this%20method%20was).
- Certifique-se de que seu bot tenha permissão adequada: **o bot precisa
  ser administrador do grupo** (como já citado) _e_ você deve
  especificar explicitamente que quer updates de tipo chat_member, caso
  contrário não as
  receberá[\[12\]](https://stackoverflow.com/questions/77720606/how-can-i-get-the-chat-invite-link-through-which-a-member-joins-in-node-telegram#:~:text=,i%20thought%20this%20method%20was).
  De acordo com a documentação: _\"The bot must explicitly specify
  \'chat_member\' in the list of allowed_updates to receive these
  updates.\"_ e _\"The bot must be an admin in the
  chat\"_[\[12\]](https://stackoverflow.com/questions/77720606/how-can-i-get-the-chat-invite-link-through-which-a-member-joins-in-node-telegram#:~:text=,i%20thought%20this%20method%20was).

Depois de configurar o webhook, toda vez que um usuário entrar ou sair
do grupo, ou houver alteração de status de membros, seu endpoint
receberá um JSON com o objeto de update.

**Exemplo de implementação do webhook (Node/Express):**

    app.post('/webhook/telegram', (req, res) => {
        const update = req.body;
        // Confirma ao Telegram que recebemos (importante responder 200 OK rapidamente)
        res.sendStatus(200);

        // Verificamos se é um update de tipo chat_member
        if (update.chat_member) {
            const chatMemberUpdate = update.chat_member;
            // Informações úteis:
            const newMember = chatMemberUpdate.new_chat_member;
            const inviteLink = chatMemberUpdate.invite_link;

            if (newMember && newMember.status === 'member' && inviteLink) {
                // Um usuário entrou no chat via um invite link
                const visitorId = inviteLink.name; // recuperamos o visitor_id que inserimos
                console.log(`Usuário ingressou via invite. visitor_id = ${visitorId}`);
                // Registrar evento "join"
                logEvent({ visitor_id: visitorId, event: 'join', timestamp: Date.now() });
                // (Opcional: podemos guardar o ID de usuário Telegram e infos, se precisar)
                saveTelegramJoin({ visitor_id: visitorId, telegram_user_id: newMember.user.id, first_name: newMember.user.first_name });
                // Acionar envio para Facebook CAPI (Lead)
                sendLeadEventToMeta(visitorId);
            }
        }
    });

No código acima: - Respondemos imediatamente com status 200 ao webhook
do Telegram (isso é necessário; se demorar ou falhar, o Telegram irá
reenviar ou eventualmente desabilitar o webhook). - Verificamos se o
update tem `chat_member`. Esse objeto `chat_member` contém: -
`new_chat_member`: o novo status do membro. Quando alguém entra, esse
campo geralmente traz status \"member\" e os detalhes do usuário que
entrou. - `old_chat_member`: o status anterior (provavelmente \"left\"
ou inexistente para alguém que não estava). - `invite_link`: se a pessoa
entrou por um link de convite (e não por busca ou adicionada
manualmente), esse campo estará presente e terá o objeto ChatInviteLink
correspondente ao link
usado[\[13\]](https://core.telegram.org/bots/api#chatmemberupdated#:~:text=invite_link%20ChatInviteLink%20Optional,link%20and%20being%20approved%20by). -
Checamos que `new_chat_member.status === 'member'` para ter certeza que
é um evento de entrada confirmada (e não apenas mudança de algum
privilégio). - **Extraímos o visitor_id:** graças a termos colocado o
_visitor_id_ no campo name do invite link ao criá-lo, aqui podemos
recuperar `inviteLink.name` que deve conter exatamente aquele ID
único[\[14\]](https://core.telegram.org/bots/api#chatmemberupdated#:~:text=match%20at%20L5315%20invite_link%20String,when%20the%20link%20will%20expire).
Assim sabemos _quem_ (qual visitante do site) corresponde a esse
ingresso. - Registramos o evento \"join\" internamente associando ao
visitor_id (e possivelmente armazenamos informações do usuário Telegram
que chegou, embora para a CAPI isso não seja necessário). - Finalmente,
chamamos uma função `sendLeadEventToMeta(visitorId)` que irá preparar os
dados e enviar o evento Lead para o Facebook via Conversions API.

> **Importante:** O Telegram somente inclui `invite_link` nas
> atualizações de entrada **para grupos privados** ou links de grupos
> privados. Se o seu grupo for público (possuía @username público),
> alguns desenvolvedores relataram que o `invite_link` pode vir como
> null mesmo que o usuário tenha usado um
> link[\[15\]](https://github.com/tdlib/telegram-bot-api/issues/428#:~:text=Hi,be%20updated%2C%20I%27d%20be%20grateful).
> Portanto, para garantir, mantenha o grupo como privado (sem username
> público) para essa estratégia -- assim você sempre receberá o
> identificador do link usado.

**Alternativa com frameworks:** Em vez de implementar manualmente via
Express, você pode usar bibliotecas como **Telegraf** (Node.js) ou
**python-telegram-bot**. Por exemplo, usando Telegraf:

    const { Telegraf } = require('telegraf');
    const bot = new Telegraf(BOT_TOKEN);
    bot.on('chat_member', (ctx) => {
        const inviteLink = ctx.chatMember.invite_link;
        if (inviteLink) {
           const visitorId = inviteLink.name;
           // ... (mesma lógica de salvar evento e enviar Lead)
        }
    });
    // Inicie o bot com webhook (exemplo):
    bot.launch({
        webhook: {
           domain: 'https://seu.dominio',
           path: '/webhook/telegram',
           port: process.env.PORT
        },
        allowedUpdates: ['chat_member']
    });

Esse snippet aproveita o Telegraf para lidar com parsing. Note o uso de
`allowedUpdates: ['chat_member']` e que o bot deve estar
admin[\[12\]](https://stackoverflow.com/questions/77720606/how-can-i-get-the-chat-invite-link-through-which-a-member-joins-in-node-telegram#:~:text=,i%20thought%20this%20method%20was).
O funcionamento interno é semelhante.

## Mapeando o invite_link.name para o visitor_id {#mapeando-o-invite_link.name-para-o-visitor_id}

Conforme descrito, o _invite_link.name_ carrega nosso **visitor_id**.
Então quando recebemos no webhook: - Pegamos
`visitorId = invite_link.name`. - Consultamos nosso armazenamento onde,
na etapa inicial, salvamos os dados do visitante sob esse ID. Lá teremos
o `fbc`, `fbp`, etc. associados. - Podemos então montar o evento de
conversão com todos os dados correspondentes.

Portanto, o mapeamento é direto: **invite_link.name = visitor_id**. Por
exemplo, se o visitor_id era \"abc123\", criamos o link com name
\"abc123\". No webhook, ao ver invite_link.name \"abc123\", vamos buscar
os dados do visitante \"abc123\" que armazenamos no passo 2 (quando ele
estava na página web).

> Dica: É prudente também marcar esse link como _usado_ no seu sistema
> assim que o join acontecer, caso você esteja guardando convites
> gerados. O Telegram já impede reuso pelo próprio `member_limit=1`, mas
> registrar que \"visitor_id X já ingressou\" pode evitar qualquer
> duplicidade de envio. Também, se por algum motivo alguém entrasse sem
> passar pelo seu link (por exemplo, um admin adicionou manualmente),
> `invite_link` seria null e você poderia não enviar evento ou marcá-lo
> diferente.

Agora que temos o visitor_id e seus dados, vamos enviar o evento Lead
para o Facebook.

## Enviando o Evento \"Lead\" para a Meta CAPI

Para enviar eventos à Meta Conversions API, faremos uma requisição HTTP
POST para o endpoint do Pixel, incluindo nosso evento no formato JSON
esperado. O endpoint geral é:

    https://graph.facebook.com/<VERSÃO_API>/<PIXEL_ID>/events?access_token=<TOKEN>

- `<VERSÃO_API>`: use uma versão atual da Graph API, por exemplo `v18.0`
  ou a mais recente.
- `<PIXEL_ID>`: o ID do seu Pixel (obtido anteriormente).
- `access_token=<TOKEN>`: passe o token de acesso gerado para a CAPI.

O corpo da requisição será um JSON contendo um array de eventos em um
campo \"data\". Podemos enviar múltiplos eventos de uma vez, mas aqui
enviaremos um de cada vez. Cada evento é um objeto com vários campos. O
mínimo recomendado inclui: - `event_name`: nome do evento (no nosso
caso, `"Lead"`).

- `event_time`: timestamp UNIX (em segundos) do momento do evento. Use o
  horário do join detectado (ex.: Date.now()/1000 arredondado).
- `event_id` (opcional mas útil para deduplicação): um ID único do
  evento. No caso do Lead, não temos duplicata via Pixel, mas podemos usar
  o próprio visitor_id ou gerar um UUID para identificar este envio. O
  Facebook usa isso para deduplicar caso receba o mesmo event_id via Pixel
  e CAPI.
- `user_data`: um objeto contendo dados do usuário para
  correspondência: - Aqui colocaremos `fbc` e `fbp` (se disponíveis) que
  extraímos/persistimos anteriormente. Esses são identificadores primários
  para o Facebook associar o evento ao usuário/click
  correto[\[3\]](https://www.reddit.com/r/PPC/comments/185ylfo/facebook_tracking_solutions_using_fbclid/#:~:text=The%20closest%20official%20use%20is,EMQ). -
  `fbc`: valor do cookie \_fbc ou gerado (que inclui fbclid) -- deve
  iniciar com \"fb.1.\" e conter o
  fbclid[\[4\]](https://stackoverflow.com/questions/67201385/how-does-facebook-convert-fbclid-to-fbc#:~:text=If%20you%20don%27t%20have%20the,milliseconds%2C%20and%20the%20fbclid%20value). -
  `fbp`: valor do cookie \_fbp (identificador do navegador) -- inicia com
  \"fb.1.\" e um identificador aleatório. - `client_user_agent`: o
  User-Agent do navegador.
- `client_ip_address`: o IP do usuário. - Qualquer outro dado
  disponível: se tivéssemos email, telefone do usuário, poderíamos incluir
  hasheados em campos como `em`, `ph`. No nosso fluxo, não coletamos esses
  PII, então deixaremos em branco. (Não envie campos vazios; apenas não os
  inclua se não tiver dados.) - Podemos incluir também `external_id` se
  quisermos passar nosso visitor_id ou algum ID interno. O Facebook pode
  usar external_id para fins de reconciliação de dados (e para você
  rastrear resultados), mas não é um match key tão forte quanto fbc/fbp. É
  opcional. - `action_source`: fonte da ação, normalmente `"website"`
  neste caso, já que a conversão se originou de um evento web. (Mesmo a
  entrada sendo no Telegram, consideramos que foi resultado de uma ação
  iniciada no site, então website é adequado. Poderia argumentar \"app\"
  se fosse dentro de um app, mas não é.)
- `event_source_url`: URL da página onde a ação aconteceu. Para
  PageView/Click faz sentido preencher com a URL da landing page. Para o
  Lead (join Telegram), poderíamos omitir ou enviar a URL da landing page
  original (pois foi lá que iniciou). Esse campo é usado mais para
  verificações e debug. No exemplo vamos omitir ou usar a landing page URL
  que temos armazenada (se armazenamos).

Vamos construir e enviar usando Node (poderia ser Python `requests` da
mesma forma):

    const fetch = require('node-fetch');

    async function sendLeadEventToMeta(visitorId) {
        // Buscar os dados do visitante no armazenamento pelo visitorId
        const visitorData = getVisitorData(visitorId);
        if (!visitorData) {
           console.error("Dados do visitante não encontrados para ID:", visitorId);
           return;
        }
        const pixelId = process.env.FB_PIXEL_ID;
        const accessToken = process.env.FB_ACCESS_TOKEN;

        // Preparar o payload do evento
        const event = {
           event_name: "Lead",
           event_time: Math.floor(Date.now() / 1000),
           user_data: {
             // incluir apenas se existir e válidos
             fbc: visitorData.fbc || undefined,
             fbp: visitorData.fbp || undefined,
             client_user_agent: visitorData.user_agent || undefined,
             client_ip_address: visitorData.ip_address || undefined
           },
           action_source: "website"
           // event_id: visitorId // se quiser usar visitorId para deduplicação (único por evento)
           // event_source_url: visitorData.landing_page || undefined
        };
        const payload = {
           data: [ event ]
        };

        const url = `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.events_received) {
                console.log("Evento Lead enviado com sucesso. Resposta:", result);
            } else if (result.error) {
                console.error("Erro do Facebook CAPI:", result.error.message, result.error);
            }
        } catch (err) {
            console.error("Erro de requisição ao Facebook:", err);
        }
    }

No código acima montamos o objeto `event` seguindo a estrutura
necessária. Um exemplo de JSON enviado seria equivalente a:

    {
      "data": [{
        "event_name": "Lead",
        "event_time": 1697574501,
        "user_data": {
          "fbc": "fb.1.1697570916234.IwAR0abcd1234...",
          "fbp": "fb.1.1697570916.1111100000",
          "client_user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
          "client_ip_address": "203.0.113.45"
        },
        "action_source": "website"
      }]
    }

Enviamos esse payload para o endpoint do Pixel com o access_token na
query string. Alternativamente, poderíamos incluir
`"access_token": "<token>"` dentro do JSON em vez de query param, como
no exemplo em PHP a seguir, ambos
funcionam[\[16\]](https://satisfiction.com/php-code-for-sending-simple-events-to-meta-conversion-api/#:~:text=,%3D%3E%20%24fbp)[\[17\]](https://satisfiction.com/php-code-for-sending-simple-events-to-meta-conversion-api/#:~:text=,%3D%3E%20%24access_token):

> **Exemplo de payload (PHP)**:  
> `php $data = array( "data" => array( array( "event_name" => "AddToCart", "event_time" => time(), "user_data" => array( "client_ip_address" => $ip, "client_user_agent" => $browser, "em" => $email, "ph" => $phone, "fbc" => $fbc, "fbp" => $fbp ), "custom_data" => array( ... ), "action_source" => "website", "event_source_url" => $url ) ), "access_token" => $access_token );`[\[16\]](https://satisfiction.com/php-code-for-sending-simple-events-to-meta-conversion-api/#:~:text=,%3D%3E%20%24fbp)[\[17\]](https://satisfiction.com/php-code-for-sending-simple-events-to-meta-conversion-api/#:~:text=,%3D%3E%20%24access_token)

No nosso caso, troque \"AddToCart\" por \"Lead\", e estamos omitindo
campos de PII (`em`, `ph`) por não termos. O resto é similar.

**Verificação de sucesso:** O Facebook CAPI retornará um JSON com algo
como `{"events_received": 1, "messages": [], "fbtrace_id": "XYZ"}` se
deu tudo certo. Sempre verifique a resposta e trate erros (ex: token
inválido, problemas de formato dos dados, etc.). Durante
desenvolvimento, use o **Test Events** no Events Manager: lá você pode
usar um `test_event_code` (adicione `&test_event_code=TEST123` na URL ou
campo no JSON) e ver os eventos chegando quase em tempo real para
validação, sem impactar métricas de produção.

**Obs:** Não esqueça de que o evento **Lead** deve estar configurado nas
suas conversões/meta no gerenciador de anúncios para ser utilizado em
otimização ou contabilização de resultados. \"Lead\" é um evento padrão
do Facebook (Standard Event), então geralmente já é reconhecido
automaticamente; caso contrário, você pode marcá-lo como personalizado e
treinar a campanha para otimizar por ele.

Até aqui, cobrimos o ciclo completo: do clique ao envio de conversão.

## Considerações de Segurança e Privacidade

Implementar tracking de conversões envolve lidar com dados
potencialmente sensíveis. Abaixo, algumas práticas recomendadas:

- **Proteja seu Access Token:** Armazene-o de forma segura (em variáveis
  de ambiente no servidor, serviços de secret management, etc.). Nunca
  exponha o token no front-end ou em código público. Restrinja o acesso
  ao código ou logs onde ele aparece e rotacione-o se suspeitar que foi
  comprometido[\[18\]](https://watsspace.com/blog/meta-conversions-api-fbc-and-fbp-parameters/#:~:text=%2A%20Integrity%3A%20Use%20server,and%20secure%20flags%20where%20applicable)[\[19\]](https://watsspace.com/blog/meta-conversions-api-fbc-and-fbp-parameters/#:~:text=,and%20secure%20flags%20where%20applicable).
  Lembre que quem tiver esse token pode enviar eventos ao seu Pixel
  indevidamente.
- **Use HTTPS sempre:** Tanto para receber o webhook do Telegram
  (obrigatório) quanto para enviar dados ao Facebook. Isso evita
  interceptação dos dados dos usuários (e o Facebook só aceita CAPI via
  HTTPS
  mesmo)[\[18\]](https://watsspace.com/blog/meta-conversions-api-fbc-and-fbp-parameters/#:~:text=%2A%20Integrity%3A%20Use%20server,and%20secure%20flags%20where%20applicable).
- **Não enviar dados pessoais em texto puro:** A política do Facebook
  exige que campos pessoais identificáveis (PII) como email, telefone,
  nomes, CPF etc, sejam enviados **hash (SHA-256)** na CAPI. No nosso
  fluxo não capturamos nada disso, apenas identificadores anônimos,
  então estamos ok. Se no futuro você enviar email ou telefone, aplique
  hashing antes. **Não hasheie** os identificadores `fbc` e `fbp` --
  eles **devem ser enviados em texto simples conforme
  gerados**[\[20\]](https://watsspace.com/blog/meta-conversions-api-fbc-and-fbp-parameters/#:~:text=rates,such%20as%20email%20or%20phone).
  Esses valores não são considerados PII pelo Facebook, mas sim
  _pseudônimos_ para matching técnico.
- **Envie fbc/fbp somente quando aplicável:** Se o usuário não veio de
  um anúncio (ou seja, não há fbclid), não crie um fbc fictício. Você
  pode enviar apenas fbp, ou nenhum desses se não
  disponíveis[\[5\]](https://watsspace.com/blog/meta-conversions-api-fbc-and-fbp-parameters/#:~:text=%2A%20fbc%3A%20%2F%5Efb.1.d%7B13%7D.%5BA,Standardize%20how%20you%20generate%20event_ids)[\[21\]](https://watsspace.com/blog/meta-conversions-api-fbc-and-fbp-parameters/#:~:text=rates,party).
  No caso de eventos sem origem paga, o Pixel/CAPI ainda pode casar pelo
  fbp ou outros parâmetros (email, etc.). No nosso caso, todos no fluxo
  têm fbclid, então enviamos ambos.
- **Consentimento e transparência:** Certifique-se de estar em
  conformidade com leis de privacidade (LGPD, GDPR). Por exemplo, tenha
  um banner de cookies/privacidade informando o uso de tracking e
  obtenha consentimento do usuário antes de coletar e enviar dados se
  legalmente requerido. A Meta inclusive tem campos específicos para
  marcar eventos como tendo consentimento limitado ou não, mas isso foge
  ao escopo deste guia.
- **Armazenamento mínimo:** Guarde os dados (fbclid, fbp, fbc, IP, UA)
  apenas pelo tempo necessário para realizar a conversão e enviar aos
  destinos. Não exponha esses IDs em relatórios públicos. Lembre-se que,
  mesmo que não identifiquem diretamente uma pessoa, eles são dados de
  tracking. A recomendação é tratá-los como informações sensíveis:
  restrinja acesso a quem precisa e descarte após uso (por exemplo,
  poderia limpar fbclid/fbc do banco após X dias, mantendo talvez só
  contagens agregadas).
- **Segurança do Telegram:** O _visitor_id_ colocado no nome do invite
  link só é visível para administradores do grupo e para o bot. Ainda
  assim, certifique-se que ele não contenha informação pessoal (como
  falado). Use um identificador opaco. Além disso, caso seu grupo tenha
  vários administradores, esteja ciente de que eles podem ver a lista de
  links de convite ativos e seus nomes -- que no caso serão os IDs. Em
  geral, isso não é problemático se os IDs são anônimos, mas é bom ter
  ciência.
- **Resiliência e Logs:** Implemente lógica para lidar com falhas
  intermitentes. Ex: se o envio ao Facebook falhar por algum motivo
  (rede ou erro 500), pode guardar o evento e tentar reenviar mais
  tarde. Mas evite reenviar indefinidamente para não duplicar
  conversões. Use logs para auditar: logue quando um invite link foi
  criado para um visitor_id, quando um join foi detectado e quando um
  evento foi enviado à CAPI, junto com as respostas. Assim você pode
  depurar casos em que a Meta não registrar o Lead (verificar Event
  Match Quality diagnostic no Events Manager).
- **Limitando dados no Telegram:** O Telegram enviará pelo webhook
  informações do usuário que entrou (nome, id etc). Se você não precisa
  desses dados além de correlacionar a conversão, não armazene-os
  desnecessariamente. Talvez só guarde o ID Telegram se planeja usar
  futuramente (ex: associar no CRM), mas mantenha seguro.

Seguindo essas práticas, você terá uma implementação mais segura e
respeitosa da privacidade, ao mesmo tempo em que usufrui dos benefícios
da Conversions API para otimização de anúncios.

## Referências Úteis (Documentação Oficial)

Para aprofundamento e esclarecimento de qualquer dúvida, consulte as
documentações oficiais da Meta e do Telegram relacionadas a esse tema:

- **Meta for Developers -- Conversions API (Visão Geral):** Documentação
  oficial da Meta sobre a Conversions API, explicando conceitos, como
  construir requisições e parâmetros suportados. _Link:_
  <https://developers.facebook.com/docs/marketing-api/conversions-api>
- **Meta -- Parâmetros de Informações do Cliente (User Data):** Lista e
  descrição dos campos que podem ser enviados em `user_data` (como fbp,
  fbc, emails hasheados, etc.), incluindo formato esperado de `fbc` e
  `fbp`. _Link:_ [Facebook Developers: Customer Information
  Parameters](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters)[\[3\]](https://www.reddit.com/r/PPC/comments/185ylfo/facebook_tracking_solutions_using_fbclid/#:~:text=The%20closest%20official%20use%20is,EMQ)[\[22\]](https://www.reddit.com/r/PPC/comments/185ylfo/facebook_tracking_solutions_using_fbclid/#:~:text=,am%20unsure%20which%20Zapier%2FFB%20wants)
- **Meta -- Parâmetros \_fbp e \_fbc:** Guia específico explicando o que
  são os parâmetros \_fbp e \_fbc, como obtê-los ou gerá-los, e boas
  práticas de
  uso[\[4\]](https://stackoverflow.com/questions/67201385/how-does-facebook-convert-fbclid-to-fbc#:~:text=If%20you%20don%27t%20have%20the,milliseconds%2C%20and%20the%20fbclid%20value).
  _Link:_ [Facebook Developers: fbp and fbc
  Parameters](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc)
- **Telegram Bot API -- createChatInviteLink:** Detalhamento do método
  para criar links de convite via Bot. Inclui descrição dos parâmetros
  (chat_id, name, expire_date, member_limit, etc) e comportamento.
  _Link:_ [Core Telegram API:
  createChatInviteLink](https://core.telegram.org/bots/api#createChatInviteLink)[\[23\]](https://core.telegram.org/bots/api#chatmemberupdated#:~:text=Parameter%20Type%20Required%20Description%20chat_id,99999)
- **Telegram Bot API -- Updates (ChatMemberUpdated):** Descrição do
  objeto de update de chat_member, incluindo o campo `invite_link`
  presente quando usuários entram via
  convite[\[13\]](https://core.telegram.org/bots/api#chatmemberupdated#:~:text=invite_link%20ChatInviteLink%20Optional,link%20and%20being%20approved%20by).
  _Link:_ [Core Telegram API:
  ChatMemberUpdated](https://core.telegram.org/bots/api#chatmemberupdated)
- **Telegram Bot API -- Webhooks:** Guia de como configurar webhooks
  para bots. _Link:_ [Core Telegram API:
  setWebhook](https://core.telegram.org/bots/api#setwebhook) (veja
  parâmetros allowed_updates).
- **Stack Overflow -- Obtendo invite_link no update:** Discussão sobre
  como receber o `invite_link` de um novo membro e a necessidade de
  allowed_updates e admin. _Referência:_ _"The bot must be an
  administrator in the chat and must explicitly specify \'chat_member\'
  in allowed_updates to receive these
  updates."_[\[12\]](https://stackoverflow.com/questions/77720606/how-can-i-get-the-chat-invite-link-through-which-a-member-joins-in-node-telegram#:~:text=,i%20thought%20this%20method%20was).
- **Meta Business Help Center -- Evento Lead:** Informações sobre o
  evento padrão \"Lead\" e como ele é usado em otimização de anúncios.
  _Link:_ [Facebook Business: Standard Events -
  Lead](https://www.facebook.com/business/help/351616968103583?id=1205376682832142).

Com essas referências e os passos detalhados neste guia, você terá os
recursos necessários para implementar e verificar com sucesso a Meta
Conversions API integrada ao Telegram no seu SaaS. Boa implementação e
bons resultados!!

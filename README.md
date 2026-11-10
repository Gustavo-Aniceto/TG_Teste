# 🍽️ G&O Restaurante — Cardápio Digital

Sistema de **cardápio digital** para restaurante, com pedidos por **delivery** ou **na mesa**
(via QR Code), envio do pedido pelo **WhatsApp** e **pagamento online pelo Mercado Pago**.

> Trabalho de Graduação — **Fatec Guarulhos**
> Desenvolvido por **Gustavo Aniceto** e **Otavio Barreiro**, sob supervisão do professor **Marco Assis**.

---

## 📑 Sumário

- [Funcionalidades](#-funcionalidades)
- [Tecnologias](#-tecnologias)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Fluxo do pedido](#-fluxo-do-pedido)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação e execução](#-instalação-e-execução)
- [Configurando o Mercado Pago](#-configurando-o-mercado-pago)
- [Testando um pagamento](#-testando-um-pagamento)
- [Variáveis de ambiente](#-variáveis-de-ambiente)
- [Colocando em produção (deploy)](#-colocando-em-produção-deploy)
- [Como o pagamento funciona](#-como-o-pagamento-funciona)
- [API do servidor](#-api-do-servidor)
- [Personalização](#-personalização)
- [Testes automatizados](#-testes-automatizados)
- [Problemas comuns](#-problemas-comuns)
- [Autores](#-autores)

---

## ✨ Funcionalidades

O sistema tem **duas versões** do cardápio, que compartilham o mesmo menu:

| Versão | Pasta | Para quê | Dados pedidos ao cliente |
|---|---|---|---|
| **Delivery** | `online/` | Pedido para entrega em casa | CEP (preenchimento automático via ViaCEP), endereço, número, bairro, cidade, UF e complemento |
| **Presencial** | `presencial/` | Pedido feito na mesa, acessado pelo QR Code | Número da mesa e nome do cliente |

Recursos:

- 📋 **Cardápio por categorias**: Tradicionais, Burgers, Pizzas, Churrascos, Bebidas e Sobremesas (botão "Ver mais" em cada uma).
- 🛒 **Carrinho de compras**: adicionar, aumentar ou diminuir quantidades e remover itens, com o total calculado na hora.
- 💾 **Carrinho salvo no navegador** (`localStorage`): o pedido não se perde ao recarregar a página nem ao voltar do Mercado Pago.
- 📍 **Busca de endereço pelo CEP** (API ViaCEP) na versão delivery.
- 💳 **Pagamento online com Mercado Pago** (Checkout Pro): cartão de crédito/débito, Pix, boleto e saldo Mercado Pago.
- 💬 **Envio do pedido pelo WhatsApp** do restaurante: com o comprovante do pagamento, ou com pagamento na entrega / no caixa.
- 📅 **Reserva de mesa** (versão delivery), enviada pelo WhatsApp, com validação de data e horário (14:00 às 23:59).
- 📱 **Layout responsivo** para celular, tablet e computador.

---

## 🛠️ Tecnologias

**Front-end**
- HTML5, CSS3 e JavaScript
- [jQuery 1.12](https://jquery.com/)
- [Bootstrap 4](https://getbootstrap.com/)
- [Font Awesome](https://fontawesome.com/) (ícones)
- [Animate.css](https://animate.style/) + [WOW.js](https://wowjs.uk/) (animações)
- [ViaCEP](https://viacep.com.br/) (consulta de CEP)

**Back-end (pagamento)**
- [Node.js](https://nodejs.org/) 18+
- [Express](https://expressjs.com/)
- [SDK oficial do Mercado Pago para Node.js](https://github.com/mercadopago/sdk-nodejs)
- [dotenv](https://github.com/motdotla/dotenv)

---

## 📁 Estrutura do projeto

```
TG_Teste/
├── online/                    # Versão DELIVERY
│   ├── index.html
│   ├── css/
│   │   ├── main.css           # Estilos principais
│   │   └── responsivo.css     # Ajustes para celular/tablet
│   ├── js/
│   │   ├── dados.js           # Itens do cardápio (MENU)
│   │   ├── app.js             # Cardápio, carrinho, etapas e reserva
│   │   └── mercadopago.js     # Botão de pagamento e retorno do Mercado Pago
│   ├── img/                   # Logo, ícones e fotos dos pratos
│   └── fonts/
│
├── presencial/                # Versão NA MESA (mesma estrutura do online/)
│
├── server/                    # Servidor Node.js (necessário para o pagamento)
│   ├── index.js               # Inicia o servidor e o SDK do Mercado Pago
│   ├── app.js                 # Rotas da API e arquivos estáticos
│   ├── pagamento.js           # Validação do carrinho e montagem da preferência
│   └── cardapio.js            # Lê o cardápio (dados.js) no servidor
│
├── test/
│   └── pagamento.test.js      # Testes automatizados do servidor
│
├── .env.example               # Modelo das configurações (copiar para .env)
├── package.json
└── README.md
```

---

## 🔄 Fluxo do pedido

```
 Cardápio ──► Etapa 1: Carrinho ──► Etapa 2: Endereço / Mesa ──► Etapa 3: Resumo
                                                                    │
                                    ┌───────────────────────────────┴───────────────┐
                                    ▼                                               ▼
                     💳 Pagar com Mercado Pago                       💬 Pedir pelo WhatsApp
                                    │                              (paga na entrega / no caixa)
                                    ▼
                   Paga no site do Mercado Pago
                                    │
                                    ▼
          Volta ao site ► "Pagamento aprovado!" ► Envia o pedido
          ao WhatsApp do restaurante com o número do pagamento
```

---

## ✅ Pré-requisitos

- **Node.js 18 ou superior**: baixe a versão LTS em <https://nodejs.org>
- **Git** (opcional, para clonar o projeto): <https://git-scm.com>
- Uma **conta no Mercado Pago**: <https://www.mercadopago.com.br>

Para confirmar se o Node está instalado:

```bash
node -v
```

---

## 🚀 Instalação e execução

**1. Clone o repositório**

```bash
git clone https://github.com/Gustavo-Aniceto/TG_Teste.git
```

```bash
cd TG_Teste
```

**2. Instale as dependências**

```bash
npm install
```

**3. Crie o arquivo de configuração** a partir do modelo

Windows:

```bash
copy .env.example .env
```

Linux / macOS:

```bash
cp .env.example .env
```

Depois abra o `.env` e preencha o `MP_ACCESS_TOKEN` (veja a próxima seção).

**4. Inicie o servidor**

```bash
npm start
```

**5. Acesse no navegador**

- Delivery: <http://localhost:3000/online/>
- Presencial: <http://localhost:3000/presencial/>

> 💡 Durante o desenvolvimento, `npm run dev` reinicia o servidor sozinho a cada alteração.

> ℹ️ Também dá para abrir o `index.html` direto no navegador, sem o servidor. O cardápio,
> o carrinho e o WhatsApp funcionam normalmente, mas **o botão do Mercado Pago não aparece**,
> porque o pagamento depende do servidor.

---

## 💳 Configurando o Mercado Pago

1. Acesse o painel de desenvolvedores: <https://www.mercadopago.com.br/developers/panel/app>
2. Clique em **Criar aplicação**:
   - Nome: por exemplo, `G&O Restaurante`
   - Tipo de solução: **Pagamentos online**
   - Produto: **Checkout Pro**
3. Abra a aplicação criada e vá em **Credenciais de teste**.
4. Copie o **Access Token** e cole no `.env`:

   ```env
   MP_ACCESS_TOKEN=cole_aqui_o_access_token_de_teste
   MP_SANDBOX=true
   ```

5. Reinicie o servidor (`Ctrl + C` e depois `npm start`).

> 🔒 **Nunca** coloque o Access Token no código do site nem envie o `.env` para o GitHub.
> O `.gitignore` já ignora esse arquivo.

---

## 🧪 Testando um pagamento

1. No painel do Mercado Pago, vá em **Contas de teste** e crie um usuário **Comprador**.
2. No site, monte um pedido, avance até o **Resumo** e clique em **Pagar com Mercado Pago**.
3. Abra o checkout numa **janela anônima** e entre com o **usuário comprador de teste**.
   Com a sua própria conta o pagamento não funciona, porque ninguém pode pagar a si mesmo.
4. Use um cartão de teste:

   | Bandeira | Número | CVV | Validade |
   |---|---|---|---|
   | Mastercard | `5031 4332 1540 6351` | `123` | `11/30` |
   | Visa | `4235 6477 2802 5682` | `123` | `11/30` |

   No **nome do titular**, escreva o resultado que você quer simular:

   | Nome do titular | Resultado |
   |---|---|
   | `APRO` | Pagamento aprovado |
   | `OTHE` | Recusado por erro geral |
   | `CONT` | Pagamento pendente |
   | `FUND` | Recusado por saldo insuficiente |

   CPF: `12345678909`

5. Depois de pagar, clique em **Voltar ao site**. Deve aparecer **"Pagamento aprovado! 🎉"** e o
   botão **Enviar pedido ao restaurante**, que abre o WhatsApp com o pedido e o ID do pagamento.

Mais cartões de teste: [documentação do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/test/cards).

---

## ⚙️ Variáveis de ambiente

Configuradas no arquivo `.env` (local) ou no painel da hospedagem (produção):

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `MP_ACCESS_TOKEN` | ✅ para o pagamento | — | Access Token do Mercado Pago. Sem ele, o botão de pagamento fica oculto. |
| `MP_SANDBOX` | ❌ | `false` | `true` abre o checkout de **testes**. Use `false` em produção. |
| `PUBLIC_URL` | ✅ em produção | `http://localhost:3000` | Endereço público do site, **sem barra no final**. |
| `PORT` | ❌ | `3000` | Porta do servidor. A maioria das hospedagens define sozinha. |
| `MP_WEBHOOK_SECRET` | ❌ (recomendado) | — | Assinatura secreta do webhook, usada para validar as notificações. |
| `VALOR_ENTREGA` | ❌ | `0` | Taxa de entrega do delivery, em reais (ex.: `7.50`). Não vale para o presencial. |

---

## 🌐 Colocando em produção (deploy)

O site precisa de uma hospedagem que **rode Node.js**. GitHub Pages **não serve**, porque só
hospeda páginas estáticas. Algumas opções: [Render](https://render.com) (tem plano gratuito),
[Railway](https://railway.app) ou uma VPS.

### Exemplo com o Render

1. Crie uma conta no Render e clique em **New → Web Service**.
2. Conecte o repositório do GitHub.
3. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Em **Environment**, cadastre as variáveis:
   ```env
   MP_ACCESS_TOKEN=APP_USR-...        # token de PRODUÇÃO
   MP_SANDBOX=false
   PUBLIC_URL=https://seu-app.onrender.com
   VALOR_ENTREGA=0
   ```
5. Faça o deploy e acesse `https://seu-app.onrender.com/online/`.

### Checklist de produção

- [ ] Trocar o token de **teste** pelo de **produção**, que fica em *Credenciais de produção* no painel.
- [ ] `MP_SANDBOX=false`.
- [ ] `PUBLIC_URL` com o endereço **https** real. Com https, o Mercado Pago **volta sozinho para o site** depois do pagamento e envia as notificações.
- [ ] Cadastrar o webhook no painel do Mercado Pago (**Suas integrações → Webhooks**):
  - URL: `https://SEU-SITE/api/pagamento/webhook`
  - Evento: **Pagamentos**
  - Copiar a **assinatura secreta** para `MP_WEBHOOK_SECRET`
- [ ] Atualizar o número do WhatsApp (`CELULAR_EMPRESA`).
- [ ] Gerar um novo **QR Code** apontando para `https://SEU-SITE/presencial/` e substituir `presencial/img/QRcode.png`.

---

## 🔐 Como o pagamento funciona

```
Navegador                        Servidor (Node/Express)                 Mercado Pago
    │ POST /api/pagamento/preferencia    │                                       │
    │  { modo, carrinho:[{id,qntd}],     │  busca os preços em js/dados.js       │
    │    entrega }                       │  cria a preferência ────────────────► │
    │ ◄──────────── { url } ──────────── │                                       │
    │ redireciona para o checkout ─────────────────────────────────────────────► │
    │ ◄─────── volta: ?pagamento=sucesso&payment_id=123 ──────────────────────── │
    │ GET /api/pagamento/status/123 ───► │  consulta o pagamento ──────────────► │
    │ ◄────── { status: "approved" } ─── │                                       │
    │ mostra a confirmação + botão do WhatsApp com o comprovante                 │
    │                                    │ ◄──── webhook (notificação) ───────── │
```

Pontos de segurança:

- **O preço é sempre calculado no servidor**, a partir de `js/dados.js`. O navegador envia apenas
  o `id` e a quantidade dos itens, então ninguém consegue mudar o valor pelo DevTools.
- **O status do pagamento é confirmado no servidor**. O site não confia no parâmetro da URL.
- As **notificações (webhook)** têm a assinatura validada quando `MP_WEBHOOK_SECRET` está configurado.
- Cada pedido recebe um código único (`DELIV-...` para delivery e `MESA-...` para presencial),
  enviado ao Mercado Pago como `external_reference`. Os dados de entrega ou da mesa vão no `metadata`
  do pagamento e aparecem no painel do Mercado Pago.

---

## 📡 API do servidor

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/` | Redireciona para `/online/` |
| `GET` | `/online/`, `/presencial/` | Páginas do cardápio |
| `GET` | `/api/config` | Informa se o Mercado Pago está ativo e o valor da entrega |
| `POST` | `/api/pagamento/preferencia` | Cria o pagamento e devolve a URL do checkout |
| `GET` | `/api/pagamento/status/:id` | Consulta o status de um pagamento |
| `POST` | `/api/pagamento/webhook` | Recebe as notificações do Mercado Pago |

Exemplo de requisição para criar o pagamento:

```json
POST /api/pagamento/preferencia
{
  "modo": "online",
  "carrinho": [
    { "id": "trad-feijoada-completa", "qntd": 2 },
    { "id": "trad-curau-de-milho", "qntd": 1 }
  ],
  "entrega": {
    "cep": "07000-000", "endereco": "Rua das Flores", "numero": "10",
    "bairro": "Centro", "cidade": "Guarulhos", "uf": "SP", "complemento": ""
  }
}
```

Resposta:

```json
{
  "id": "123456789-abcd-...",
  "url": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
  "referencia": "DELIV-MWAT0DQP-5A84D2",
  "total": 190
}
```

Na versão presencial, `"modo": "presencial"` e `"entrega": { "mesa": "7", "nome": "Maria" }`.

---

## 🎨 Personalização

### Número do WhatsApp do restaurante
Em `online/js/app.js` **e** `presencial/js/app.js`:

```js
var CELULAR_EMPRESA = '5511958705804'; // 55 + DDD + número, só dígitos
```

### Itens do cardápio
Edite `js/dados.js`. Cada item segue este formato:

```js
{
    "id": "trad-feijoada-completa",            // único em TODO o cardápio
    "img": "./img/cardapio/steaks/OIP.jpg",
    "name": "Feijoada Completa",
    "dsc": "Feijão, carnes, couve",
    "price": 80
}
```

> ⚠️ **Importante:**
> - O `id` precisa ser **único no cardápio inteiro**, não só na categoria. O servidor se recusa a
>   iniciar se encontrar IDs repetidos.
> - Mantenha `online/js/dados.js` e `presencial/js/dados.js` **iguais**. O servidor lê os preços de `online/js/dados.js`.
> - Cada categoria mostra 8 itens e mais 4 no "Ver mais" (até 12 por categoria).

### Taxa de entrega
Defina `VALOR_ENTREGA` no `.env` (ex.: `VALOR_ENTREGA=7.50`). A taxa aparece no total e é cobrada no Mercado Pago.

### Horário de reserva
A validação fica na função `validarReserva()` em `online/js/app.js` (hoje: das 14:00 às 23:59).

### Cores
As cores ficam nas variáveis do início de `css/main.css`:

```css
:root {
    --color-primary: #ffbf00;
    --color-secondary: #fff2cc;
    /* ... */
}
```

---

## 🧪 Testes automatizados

```bash
npm test
```

Os testes usam um Mercado Pago **simulado**, então não precisam de credenciais nem de internet. Eles cobrem:

- Cardápio sem IDs duplicados e igual nas duas versões
- Cálculo do total usando os preços do servidor (ignorando preços enviados pelo navegador)
- Rejeição de carrinho vazio, item inexistente e quantidades inválidas
- Criação da preferência (delivery, presencial, taxa de entrega e modo sandbox)
- Tratamento de erros (sem token, modo inválido, falha no Mercado Pago)
- Consulta de status do pagamento
- Validação da assinatura do webhook
- Entrega das páginas estáticas

---

## 🩺 Problemas comuns

| Problema | Causa / Solução |
|---|---|
| O botão **"Pagar com Mercado Pago"** não aparece | O site foi aberto direto pelo arquivo (`file://`) em vez de `http://localhost:3000`, ou o `MP_ACCESS_TOKEN` não está no `.env`. Veja se o terminal mostra o aviso *"MP_ACCESS_TOKEN não definido"*. |
| *"Não foi possível iniciar o pagamento"* | Token inválido ou expirado, ou falta de internet. O erro detalhado aparece no terminal do servidor. |
| Erro ao pagar no checkout de teste | Use uma **janela anônima** com o **usuário comprador de teste**, não a sua conta real. |
| Depois de pagar, não volta sozinho para o site | Normal em `localhost`: clique em **Voltar ao site**. O retorno automático só funciona com `PUBLIC_URL` em **https**. |
| *"Não conseguimos confirmar o pagamento"* | O token usado na consulta é de outra conta ou ambiente (teste × produção). |
| `npm` não é reconhecido | Instale o Node.js e abra um terminal novo. |
| `Error: listen EADDRINUSE :::3000` | A porta 3000 já está em uso. Feche o outro processo ou use `PORT=3001` no `.env`. |
| O servidor não inicia: *"ID duplicado no cardápio"* | Dois itens em `dados.js` têm o mesmo `id`. Troque um deles. |
| O CEP não preenche o endereço | A API ViaCEP pode estar fora do ar. Preencha manualmente. |

---

## 👥 Autores

| | |
|---|---|
| **Gustavo Aniceto** | Desenvolvimento |
| **Otavio Barreiro** | Desenvolvimento |
| **Prof. Marco Assis** | Orientação |

**Fatec Guarulhos** — Faculdade de Tecnologia de Guarulhos

---

<p align="center">G&O Restaurante © Todos os direitos reservados</p>

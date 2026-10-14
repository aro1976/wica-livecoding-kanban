# Kanban Board distribuído na AWS, construído com Kiro

Aplicação de quadro Kanban (TODO, DOING, DONE) distribuída na AWS, com autenticação, atualização em tempo real e votação ao vivo estilo planning poker. O projeto foi construído do zero conversando com o **Kiro** (IA agêntica), e serviu de base para o live coding apresentado no **WICA 2026 (Workshop de Informática e Computação Aplicada), UNICSUL**.

> Live Coding: Utilização de IA Agêntica para Desenvolvimento de Aplicações Distribuídas na AWS.

## Demo da apresentação

Os slides da palestra estão em [`docs/wica-livecoding-kanban.pptx`](docs/wica-livecoding-kanban.pptx).

## Funcionalidades

- **Quadro Kanban** com três colunas (TODO, DOING, DONE) e cards que só avançam (TODO para DOING para DONE), via drag-and-drop.
- **Autenticação** com cadastro próprio, verificação por e-mail, login, logout e troca de senha (Amazon Cognito).
- **Tempo real** por WebSocket: toda criação ou movimentação de card é propagada a todos os clientes conectados, sem polling.
- **Votação ao vivo (planning poker)**: um admin abre a sessão, o quadro trava para todos, cada participante distribui 15 estrelas entre os cards de TODO, e ao revelar os totais aparecem e a coluna se reordena pelo placar.
- **MCP server**: expõe a aplicação como ferramentas, permitindo operar o board e a votação por linguagem natural a partir do próprio Kiro.

## Arquitetura

```
Usuários
   |
CloudFront (CDN + HTTPS, domínio próprio)
   |-- default  -> S3 (SPA React)
   |-- /api/*    -> API Gateway (REST) -> Cognito (JWT authorizer) -> Lambda -> DynamoDB

WebSocket API Gateway
   |-- $connect / $disconnect -> Lambda -> DynamoDB (conexões)
   +-- broadcast de todas as mudanças para os clientes conectados
```

- **DynamoDB single-table**: cards, sessões de votação, votos e conexões WebSocket na mesma tabela, organizados por chave (PK/SK).
- **Serverless de ponta a ponta**: Lambda, DynamoDB, Cognito e API Gateway, todos gerenciados e sob demanda (pay-per-request).

## Stack

- **Frontend**: React + Vite + TypeScript + shadcn/ui (base-ui) + @dnd-kit + amazon-cognito-identity-js
- **Backend**: AWS Lambda (Node.js 20) + API Gateway (REST e WebSocket) + DynamoDB + Cognito
- **Infraestrutura**: AWS CDK (TypeScript)
- **Dev local**: Express envolvendo o handler Lambda, com repositórios in-memory (sem AWS)
- **Testes**: Vitest
- **MCP**: @modelcontextprotocol/sdk

## Estrutura do projeto

```
backend/     API, handlers Lambda, repositórios (in-memory e DynamoDB), WebSocket
frontend/    SPA React (Vite), componentes do board, auth e votação
infra/       stack AWS CDK (DynamoDB, Lambda, API Gateway, Cognito, S3, CloudFront, Route53)
mcp/         MCP server com as ferramentas de card e votação
docs/         slides da apresentação do WICA (PDF)
```

## Desenvolvimento local

Pré-requisitos: Node.js 20+ e npm.

```bash
# Instalar dependências
cd backend && npm install
cd ../frontend && npm install

# Terminal 1: backend (porta 3001, in-memory, sem auth)
cd backend && npm run dev

# Terminal 2: frontend (porta 5173)
cd frontend && npm run dev
```

Abra http://localhost:5173. Em modo local, o backend usa um store em memória e dispensa o Cognito.

### Testes

```bash
cd backend && npm test
```

## Deploy na AWS

Requer AWS CLI configurado e AWS CDK instalado.

```bash
# Build do frontend
cd frontend && npm run build

# Deploy da infraestrutura
cd ../infra && npx cdk deploy
```

O deploy é em duas passadas (two-pass): o primeiro cria o Cognito; copie os IDs gerados (UserPoolId e ClientId) para `frontend/.env`, refaça o build e implante de novo para publicar o frontend com os valores corretos.

Variáveis do frontend (`frontend/.env`):

```
VITE_USER_POOL_ID=...
VITE_USER_POOL_CLIENT_ID=...
VITE_WS_URL=wss://.../ws
```

### Usuário admin (votação)

Só membros do grupo `admin` no Cognito podem iniciar, revelar e resetar sessões de votação. Após o deploy, adicione seu usuário ao grupo:

```bash
aws cognito-idp admin-add-user-to-group \
  --user-pool-id <UserPoolId> \
  --username <seu-email> \
  --group-name admin
```

## Sobre o Kiro

O projeto foi construído por vibe coding com o Kiro, apoiado em quatro pilares:

- **Spec**: requisitos, design e tarefas de cada funcionalidade, escritos e aprovados antes de codar.
- **Steering**: contexto persistente do projeto (produto, tech, deploy), relido em toda conversa.
- **Knowledge base**: conhecimento de referência que ancora o agente e reduz alucinação.
- **Skills**: capacidades reutilizáveis acionadas sob demanda, incluindo o MCP para operar a aplicação.

## Autor

Alessandro Ramos de Oliveira, CloudDog
[linkedin.com/in/aro1976](https://www.linkedin.com/in/aro1976/)

## Licença

MIT.

# Kanban MCP

MCP server que expõe o Kanban Board (WICA2026) como ferramentas, permitindo listar, criar, mover, reordenar e excluir cards por linguagem natural, sem usar a tela.

Autentica no Cognito com um usuário de serviço e chama a API REST deployada diretamente (sem camada intermediária).

## Ferramentas disponíveis

- `list_cards` — lista todos os cards agrupados por coluna (TODO, DOING, DONE).
- `create_card(text)` — cria um novo card em TODO.
- `move_card(cardId)` — avança o card para a próxima coluna da sequência (TODO → DOING → DONE).
- `reorder_card(cardId, sortKey)` — define a posição do card dentro da coluna atual.
- `delete_card(cardId)` — remove um card permanentemente.

## Configuração

### 1. Build

```bash
cd mcp
npm install
npm run build
```

### 2. Variáveis de ambiente

Copie `.env.example` e preencha com os valores reais:

```
KANBAN_USER_POOL_ID=us-east-1_bnK1iS6L3
KANBAN_USER_POOL_CLIENT_ID=l1jp11g73ol4npvs46unamn11
KANBAN_MCP_USERNAME=<e-mail do usuário de serviço no Cognito>
KANBAN_MCP_PASSWORD=<senha do usuário de serviço>
KANBAN_API_URL=https://ftmb9myus3.execute-api.us-east-1.amazonaws.com/prod
```

O usuário de serviço precisa existir no Cognito User Pool com senha permanente definida (ex: via `aws cognito-idp admin-create-user` + `admin-set-user-password`).

### 3. Conectar no Kiro

Adicione ao arquivo de configuração MCP do Kiro (ex: `~/.kiro/settings/mcp.json` ou configuração de workspace):

```json
{
  "mcpServers": {
    "kanban": {
      "command": "node",
      "args": ["/caminho/absoluto/para/Wica2026/mcp/dist/server.js"],
      "env": {
        "KANBAN_USER_POOL_ID": "us-east-1_bnK1iS6L3",
        "KANBAN_USER_POOL_CLIENT_ID": "l1jp11g73ol4npvs46unamn11",
        "KANBAN_MCP_USERNAME": "<e-mail do usuário de serviço>",
        "KANBAN_MCP_PASSWORD": "<senha do usuário de serviço>",
        "KANBAN_API_URL": "https://ftmb9myus3.execute-api.us-east-1.amazonaws.com/prod"
      }
    }
  }
}
```

Depois de salvar a configuração, reinicie o Kiro (ou recarregue os MCP servers) para que as ferramentas `list_cards`, `create_card`, `move_card`, `reorder_card` e `delete_card` fiquem disponíveis na conversa.

## Desenvolvimento local

```bash
npm run dev
```

Lê as mesmas variáveis de ambiente listadas acima; `tsx` executa `src/server.ts` diretamente, sem precisar buildar.

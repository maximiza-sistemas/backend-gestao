# Gas Distributor - Backend

API REST para sistema de gestão de distribuidora de gás

## Tecnologias
- Node.js
- Express
- TypeScript
- PostgreSQL

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

## Build para Produção

```bash
npm run build
```

## Configuração

Crie um arquivo `.env` baseado no `.env.example`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gas_distributor
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
JWT_SECRET=sua_chave_secreta
PORT=3000
NODE_ENV=production
```

## Migrations

```bash
npm run migrate
```

## Deploy (EasyPanel)

1. Configure um novo serviço "Docker" ou "Nixpacks"
2. Aponte para este repositório
3. Build command: `npm run build`
4. Start command: `npm start`
5. Configure as variáveis de ambiente do banco

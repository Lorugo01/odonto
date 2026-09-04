# Dentista

SaaS odontológico no mesmo desenho do ERP Globaltec: apenas `backend/` (NestJS + Prisma) e `frontend/` (Vite + React + Tailwind). O app mobile (`apps/` / Expo) foi removido por enquanto.

## Subir

Na raiz do projeto:

```bash
npm install --prefix backend
npm install --prefix frontend
npm run db:setup
npm run dev
```

Isso sobe **API + front** juntos. O script libera as portas `3000` e `5173` antes de iniciar (e de novo no Ctrl+C), evitando o erro de porta ocupada no Windows com o Nest `--watch`.

- Front: http://localhost:5173 (proxy `/api` → :3000)
- API: http://localhost:3000
- Só API: `npm run dev:backend`
- Só front: `npm run dev:frontend`
- Liberar portas manualmente: `npm run free:ports`
- Postgres Docker: porta **5433**

## Logins (senha `senha123`)

- `admin@sorriso.com`
- `dentista@sorriso.com`
- `recepcao@sorriso.com`
- `paciente@email.com`

# Dentista

SaaS odontológico no mesmo desenho do ERP Globaltec: apenas `backend/` (NestJS + Prisma) e `frontend/` (Vite + React + Tailwind). O app mobile (`apps/` / Expo) foi removido por enquanto.

## Subir

```bash
docker compose up -d
cd backend && npm install && npx prisma generate && npx prisma migrate deploy && npm run prisma:seed && npm run start:dev
cd frontend && npm install && npm run dev
```

- Front: http://localhost:5173 (proxy `/api` → :3000)
- API: http://localhost:3000
- Postgres Docker: porta **5433**

## Logins (senha `senha123`)

- `admin@sorriso.com`
- `dentista@sorriso.com`
- `recepcao@sorriso.com`
- `paciente@email.com`

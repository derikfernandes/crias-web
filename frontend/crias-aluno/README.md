# Crias — App do aluno

Player web: login (telefone + instituição + senha), UI estilo conversa e conteúdo
por `stage_type` via API (`next-content` / `advance`).

Produção: `https://www.crias.ai/` (raiz; `/aluno` redireciona para `/`). Gestão em `/gestao/`.

```bash
npm install
npm run dev -w crias-aluno
```

Variável opcional: `VITE_API_BASE_URL` (vazio = mesma origem / proxy Vite).

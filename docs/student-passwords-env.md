# Senhas individuais do aluno — variáveis de ambiente

Configure na Vercel (Preview + Production) **antes** de usar a tela Master ou o script de geração.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `STUDENT_PASSWORD_KEY` | Sim (Master / script) | Chave AES-256 (32 bytes) em **base64** ou **hex** (64 chars). Usada só no servidor para cifrar/decifrar senhas (`password_encrypted`). Gere com: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `MASTER_ADMIN_EMAILS` | Recomendada | CSV de e-mails Master (ex.: `derik@…,thiago@…`). Alternativa: marcar `is_master: true` em `admin_users`. |
| `VITE_MASTER_ADMIN_EMAILS` | Recomendada (gestão) | Mesmo CSV que `MASTER_ADMIN_EMAILS`, para o menu “Senhas (Master)” no frontend. |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` | Já existente | Service account (API + script). |
| `STUDENT_PASSWORD_AUDIT_COLLECTION` | Não | Default `student_password_audit`. |
| `MASTER_SCRIPT_ACTOR_EMAIL` | Não | E-mail gravado na auditoria do script CLI (default `script@local`). |

## Script (dry-run → real)

```bash
# Dry-run Instituto Sol (não grava)
STUDENT_PASSWORD_KEY=… \
FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON=@./sa.json \
node scripts/generate-student-passwords.mjs --school "Instituto Sol" --dry-run

# Gerar de verdade + CSV
STUDENT_PASSWORD_KEY=… \
FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON=@./sa.json \
node scripts/generate-student-passwords.mjs --school "Instituto Sol" --out senhas-instituto-sol.csv

# Sobrescrever existentes (cuidado)
… --school "Instituto Sol" --force --out senhas.csv
```

Não rode bulk em produção sem dry-run. Login legado (ex. `s1766` / `@Marina12`) continua válido via `password_hash` scrypt.

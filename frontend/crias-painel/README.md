# crias-painel (compatibilidade Vercel)

O app agora vive em `frontend/crias-gestao`. Esta pasta existe só porque o
projeto Vercel legado `crias-painel` usa `frontend/crias-painel` como Root
Directory: o build roda na raiz do monorepo e copia `./dist` para cá.

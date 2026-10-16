# Relatório v1.1: entrada e carregamento (regras 1.1.37 e 1.1.38)

## Aplicado
- **Entrada do Aluno** (`src/pages/LoginPage.tsx`, `src/styles/crias-v1-0.css`): cabeçalho do site crias.org fixo (64px, logo para https://www.crias.org na mesma aba, só botão de tema), símbolo pulsando de 72px acima da caixa (wordmark removido), rodapé com LinkedIn e Instagram (nova aba) e "© Crias Tecnologia LTDA · 48.188.712/0001-02", malha 3D só entre cabeçalho e rodapé. Logo troca pelo `src` conforme o tema. Login, campos e botão Entrar sem mudança de lógica.
- **Símbolo leve** (`crias-symbol-192.png`, 37 KB): `CriasSymbol.tsx` (Aluno) e `BootSymbol` (Gestão, antes SVG). O brilho só aparece depois do `onLoad` (ou `img.complete`). Animação de 2,4 s com parado em movimento reduzido.
- **index.html** dos dois apps: preload do símbolo; no Aluno também dos dois logos do site e fonte Barlow.
- Arquivos novos em `public/` (Aluno: logos do site e símbolo 192; Gestão: símbolo 192).
- Documentos do design atualizados: `CLAUDE.md`, `INTERFACE.md`, `DECISOES.md`, protótipos (e versões offline). Prompt do pacote em `docs/PROMPT-CLAUDE-CODE-entrada.md`.

## Diferenças em relação ao protótipo
- Não existe tela de carregamento no `index.html` antes do React, então não há o que trocar ali. O mínimo de 1,1 s e a saída de 0,4 s na abertura não foram criados (o app não tem essa tela hoje).
- `crias-symbol.png` (1000×1000) continua só nos usos fora de carregamento e como ícone do iOS.

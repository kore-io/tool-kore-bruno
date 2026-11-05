# tool-kore-bruno

Coleções do [Bruno](https://www.usebruno.com/) para chamar as APIs do Kore, em arquivos
`.bru` versionados (ADR "Bruno como ferramenta de teste de chamadas de API").

## Como usar

1. No Bruno, **Open Collection** e escolha esta pasta.
2. Escolha o ambiente: **Local**, **Homologação** ou **Produção**.
3. Preencha as variáveis **secret** do ambiente (`loginEmail`, `loginCode`, `loginToken`).
   O valor fica só na sua máquina: o Bruno não grava segredo no arquivo do ambiente.

| Ambiente    | `baseUrl`                         | `appOrigin`                       |
| ----------- | --------------------------------- | --------------------------------- |
| Local       | `http://localhost:3000`           | `http://localhost:5173`           |
| Homologação | `https://api-homolog.kore.com.br` | `https://app-homolog.kore.com.br` |
| Produção    | `https://api.kore.com.br`         | `https://app.kore.com.br`         |

O `appOrigin` vai no cabeçalho `Origin` das escritas: a API recusa escrita com sessão sem
uma origem permitida (`403 ORIGIN_NOT_ALLOWED`). No Local, o `mailpitUrl` aponta para o
Mailpit do compose da API, onde chegam os e-mails de código.

## Segredos

Nada que autentica vai para o git (ADR "Convenção de ambientes e segredos nas collections
do Bruno"): e-mail de login, código, token do botão do e-mail e cookie de sessão. Variável
nova que autentica entra em `vars:secret`, nunca em `vars`.

## Branches

Só `main` (o repositório não faz deploy); cada mudança numa `feature/59-<assunto>` saindo
de `main`, em Conventional Commits.

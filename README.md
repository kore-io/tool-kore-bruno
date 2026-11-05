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

## Rodar pelo terminal

Com o [CLI do Bruno](https://docs.usebruno.com/bru-cli/overview) (`@usebruno/cli` 4.x), na
raiz do repositório:

```sh
# Local: API, worker e Mailpit do api-kore-api de pé; o código vem do Mailpit sozinho.
bru run --env Local --env-var loginEmail=voce@kore.local --exclude-tags=manual

# Homologação e produção: sem as chamadas que só existem no Local; o código vai por variável.
bru run --env "Homologação" --env-var loginEmail=… --env-var loginCode=… --exclude-tags=manual,local
```

Tags: `manual` (o botão do e-mail, que vale no lugar do código) e `local` (o provedor de
desenvolvimento do Google).

## Segredos

Nada que autentica vai para o git (ADR "Convenção de ambientes e segredos nas collections
do Bruno"): e-mail de login, código, token do botão do e-mail e cookie de sessão. Variável
nova que autentica entra em `vars:secret`, nunca em `vars`.

## Branches

Só `main` (o repositório não faz deploy); cada mudança numa `feature/59-<assunto>` saindo
de `main`, em Conventional Commits.

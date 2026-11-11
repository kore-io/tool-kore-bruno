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
# Um e-mail novo por rodada: cada pessoa é dona de um casamento só (RN06 do Cadastro).
bru run --env Local --env-var loginEmail=voce+$(date +%s)@kore.local --exclude-tags=manual

# Homologação e produção: sem as chamadas que só existem no Local; o código vai por variável.
bru run --env "Homologação" --env-var loginEmail=… --env-var loginCode=… --exclude-tags=manual,local
```

A rodada completa faz 86 pedidos, abaixo do limite geral de 100 por minuto por IP; duas
rodadas seguidas no mesmo minuto recebem `429 RATE_LIMITED`: espere um minuto entre elas. Os
convidados criados têm e-mail `@exemplo.kore.local` (decisão 181).

Tags: `manual` (o botão do e-mail, que vale no lugar do código, e a indicação de um
indicador de verdade, com `--env-var referralCode=…`) e `local` (o provedor de
desenvolvimento do Google e o Sair logo antes dele: fora do Local, sem o Google, a sessão
do código segue até o fim).

A ordem da rodada: Saúde → Entrar e sair → Indicação → Cadastro do casamento (cria o
casamento de `loginEmail`) → Convites de acesso (convida, reenvia e cancela o convite do
parceiro) → Aceite de convites (lê, tenta aceitar sendo dona e recusa) → Perfis e
colaboradores (o /me completo, o perfil ativo e quem tem acesso) → **Fase 1, com a sessão da
dona:** Grupos e convidados (cria, lista, edita, move e regenera o link) → Tags (cria, edita,
aplica e filtra) → Lixeira (manda e restaura convidado, grupo e tag) → Importação (Colar a
lista e a planilha de `arquivos/convidados-modelo.xlsx`) → Exportação (Excel e PDF) → Conta →
Aceite pelo parceiro (entra com o e-mail convidado, aceita, vira dono e sai). O endereço do site e os
e-mails do parceiro são gerados a cada rodada. Os tokens dos convites e o código do
parceiro vêm do Mailpit, então essas chamadas têm a tag `local`.

## Segredos

Nada que autentica vai para o git (ADR "Convenção de ambientes e segredos nas collections
do Bruno"): e-mail de login, código, token do botão do e-mail e cookie de sessão. Variável
nova que autentica entra em `vars:secret`, nunca em `vars`.

## Branches

Só `main` (o repositório não faz deploy); cada mudança numa `feature/<card>-<assunto>` saindo
de `main`, em Conventional Commits.

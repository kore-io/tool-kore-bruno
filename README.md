# tool-kore-bruno

Coleções do [Bruno](https://www.usebruno.com/) para chamar as APIs do Kore, em arquivos
`.bru` versionados (ADR "Bruno como ferramenta de teste de chamadas de API").

## Como usar

1. No Bruno, **Open Collection** e escolha esta pasta.
2. Escolha o ambiente: **Local**, **Homologação** ou **Produção**.
3. Preencha as variáveis **secret** do ambiente (`loginEmail`, `loginCode`, `loginToken`).
   O valor fica só na sua máquina: o Bruno não grava segredo no arquivo do ambiente.

| Ambiente    | `baseUrl`                         | `appOrigin`                       | `siteOrigin`                  |
| ----------- | --------------------------------- | --------------------------------- | ----------------------------- |
| Local       | `http://localhost:3000`           | `http://localhost:5173`           | `http://localhost:5174`       |
| Homologação | `https://api-homolog.kore.com.br` | `https://app-homolog.kore.com.br` | `https://homolog.kore.com.br` |
| Produção    | `https://api.kore.com.br`         | `https://app.kore.com.br`         | `https://kore.com.br`         |

O `appOrigin` vai no cabeçalho `Origin` das escritas: a API recusa escrita com sessão sem
uma origem permitida (`403 ORIGIN_NOT_ALLOWED`). O `siteOrigin` é a origem do site do casal,
usada nas rotas do site (`/v1/sites/*`, `/v1/public/*` e o simulador): a API só dá CORS e só
aceita escrita da origem do site nessas rotas (Site público RN07). No Local, o `mailpitUrl` aponta para o
Mailpit do compose da API, onde chegam os e-mails de código.

## Rodar pelo terminal

Com o [CLI do Bruno](https://docs.usebruno.com/bru-cli/overview) (`@usebruno/cli` 4.x), na
raiz do repositório:

```sh
# Local: API, worker e Mailpit do api-kore-api de pé; o código vem do Mailpit sozinho.
# Um e-mail novo por rodada: cada pessoa é dona de um casamento só (RN06 do Cadastro).
bru run --env Local --env-var loginEmail=voce+$(date +%s)@kore.local --exclude-tags=manual --delay 700

# Homologação e produção: sem as chamadas que só existem no Local; o código vai por variável.
bru run --env "Homologação" --env-var loginEmail=… --env-var loginCode=… --exclude-tags=manual,local --delay 700
```

A rodada completa faz 189 pedidos, acima do limite geral de 100 por minuto por IP: o
`--delay 700` (milissegundos entre os pedidos) a deixa em cerca de 2 minutos e meio, abaixo do
limite. Sem o `--delay`, o fim da rodada recebe `429 RATE_LIMITED`. Os convidados criados têm
e-mail `@exemplo.kore.local` (decisão 181).

Tags: `manual` (o botão do e-mail, que vale no lugar do código, e a indicação de um
indicador de verdade, com `--env-var referralCode=…`) e `local` (o provedor de
desenvolvimento do Google e o Sair logo antes dele: fora do Local, sem o Google, a sessão
do código segue até o fim; a métrica do simulador, que só existe com `SIMULATOR_ENABLED`,
ligada só no Local até o PO liberar; e a publicação por Cortesia, com o que depende do site
publicado (envios, QR, Confirmar presença e músicas), porque `COURTESY_PUBLICATION_ENABLED`
só pode ser ligada no Local; e o cadastro de cerimonialista, com tudo o que depende do
perfil dela (Link de indicação, Meus casamentos, Modelos, as Notificações da cerimonialista e
a assinatura no casamento que ela criou), porque `PLANNER_SIGNUP_ENABLED` também só pode ser
ligada no Local).

A ordem da rodada: Saúde → Entrar e sair → Indicação → Cadastro do casamento (cria o
casamento de `loginEmail`) → Convites de acesso (convida, reenvia e cancela o convite do
parceiro) → Aceite de convites (lê, tenta aceitar sendo dona e recusa) → Perfis e
colaboradores (o /me completo, o perfil ativo e quem tem acesso) → **Fase 1, com a sessão da
dona:** Grupos e convidados (cria, lista, edita, move e regenera o link) → Tags (cria, edita,
aplica e filtra) → Lixeira (manda e restaura convidado, grupo e tag) → Importação (Colar a
lista e a planilha de `arquivos/convidados-modelo.xlsx`) → Exportação (Excel e PDF) → **Fase 2:** Imagens do site (autoriza, envia direto ao
armazenamento a `arquivos/foto-do-ensaio.jpg` e confirma) → Editor do site (Dados básicos,
endereço, Aparência e seções) → Site público (o rascunho, que responde `SITE_DRAFT`, a prévia
do link e o link do grupo) → Pré-visualização (o rascunho como grupo e como visitante, pela
prévia) → Simule o site → **Fases 4 e 5:** Publicação por Cortesia (os limites da data de
saída do ar e a publicação) → Prazo de resposta → Mensagens prontas (edita e restaura o
convite) → Pergunta de música → Envios (cria a Família Duarte, lê a fila com a URL do WhatsApp,
marca o envio e baixa o QR) → Confirmar presença (abre o link do grupo, a prévia que não
grava e tira o cookie da prévia do jar, responde pelo grupo e a versão velha) → Respostas
pelo casal (o Painel com a versão e o histórico, alterar a resposta e a fila do lembrete) →
Músicas (a lista e o Excel para o DJ) → Dashboard → Notificações (o sino, a central, ler
todas, as preferências e o push deste aparelho) → **Fase 6, com a dona que vira também
cerimonialista:** Cadastro da cerimonialista (o perfil da Prado Assessoria, o nome com site
recusado e a troca de perfil) → Link de indicação → Meus casamentos (cria Fernanda e João, lê
a lista e o detalhe, convida o casal, cria e exclui outro casamento) → Modelos (texto e FAQ,
renomear, filtrar e excluir) → Notificações da cerimonialista (a central e o sino com
`scope=planner`, ler todas e a preferência geral) → Assinatura (o Editor de Fernanda e João
com a Prado Assessoria, que ela não muda; a dona volta ao perfil de casal e esconde a
assinatura do seu site) → Conta →
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

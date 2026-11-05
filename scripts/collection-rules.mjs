// Regras da coleção (ADR "Convenção de ambientes e segredos nas collections do Bruno"):
// todo .bru tem de ser lido pelo parser oficial do Bruno, e nada que autentica pode ir
// para o git com valor (e-mail de login, código, token, cookie de sessão).
import { bruToEnvJsonV2, bruToJsonV2, collectionBruToJson } from '@usebruno/lang';

/** Nomes de variável que autenticam: só podem existir em vars:secret. */
const SENSITIVE_NAME = /(email|code|token|cookie|session|password|secret|key)/i;

/** Cabeçalhos que carregam credencial: só com {{variável}}. */
const SENSITIVE_HEADERS = new Set(['cookie', 'authorization']);

/** Campos de corpo e de query que carregam credencial: só com {{variável}}. */
const SENSITIVE_FIELDS = new Set(['email', 'code', 'token', 'state']);

const TEMPLATE_ONLY = /^\{\{[\w.-]+\}\}$/;

/** Expressão sobre a resposta, em vars:post-response (ex.: res.body.token). */
const RESPONSE_EXPRESSION = /^res(\.|\()/;

const isSensitiveField = (name) => SENSITIVE_FIELDS.has(name) || SENSITIVE_NAME.test(name);

/** Pares chave=valor da query escrita na própria URL. */
function urlQuery({ url }) {
  const query = (url ?? '').split('?')[1]?.split('#')[0] ?? '';
  return query
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const [name, ...rest] = pair.split('=');
      return { name: decodeURIComponent(name), value: decodeURIComponent(rest.join('=')) };
    });
}

/** Que tipo de arquivo .bru é, pelo caminho. */
export function kindOf({ path }) {
  if (path.startsWith('environments/')) return 'environment';
  if (path === 'collection.bru' || path.endsWith('/folder.bru')) return 'folder';
  return 'request';
}

function parse({ kind, text }) {
  if (kind === 'environment') return bruToEnvJsonV2(text);
  if (kind === 'folder') return collectionBruToJson(text);
  return bruToJsonV2(text);
}

function environmentProblems({ json }) {
  const problems = [];
  for (const variable of json.variables ?? []) {
    if (variable.secret && variable.value) {
      problems.push(`variável secret "${variable.name}" com valor no arquivo`);
    }
    if (!variable.secret && SENSITIVE_NAME.test(variable.name)) {
      problems.push(`variável "${variable.name}" autentica e tem de estar em vars:secret`);
    }
  }
  return problems;
}

function requestProblems({ json, text }) {
  const problems = [];
  for (const header of json.headers ?? []) {
    if (SENSITIVE_HEADERS.has(header.name.toLowerCase()) && !TEMPLATE_ONLY.test(header.value)) {
      problems.push(`cabeçalho "${header.name}" com valor literal (use uma variável secret)`);
    }
  }
  const params = [...(json.params ?? []), ...urlQuery({ url: json.http?.url })];
  const reported = new Set();
  for (const param of params) {
    if (
      isSensitiveField(param.name) &&
      !TEMPLATE_ONLY.test(param.value) &&
      !reported.has(param.name)
    ) {
      reported.add(param.name);
      problems.push(`parâmetro "${param.name}" com valor literal (use uma variável secret)`);
    }
  }
  for (const variable of json.vars?.req ?? []) {
    if (SENSITIVE_NAME.test(variable.name) && !TEMPLATE_ONLY.test(variable.value)) {
      problems.push(
        `vars:pre-request "${variable.name}" com valor literal (use uma variável secret)`,
      );
    }
  }
  for (const variable of json.vars?.res ?? []) {
    const value = String(variable.value);
    if (
      SENSITIVE_NAME.test(variable.name) &&
      !TEMPLATE_ONLY.test(value) &&
      !RESPONSE_EXPRESSION.test(value)
    ) {
      problems.push(
        `vars:post-response "${variable.name}" com valor literal (use res.… ou uma variável secret)`,
      );
    }
  }
  const body = json.body?.json;
  if (body) {
    let parsed;
    try {
      // As variáveis {{...}} ficam entre aspas no JSON, então o corpo é JSON válido.
      parsed = JSON.parse(body);
    } catch {
      problems.push('corpo JSON inválido');
    }
    for (const [field, value] of Object.entries(parsed ?? {})) {
      if (
        SENSITIVE_FIELDS.has(field) &&
        (typeof value !== 'string' || !TEMPLATE_ONLY.test(value))
      ) {
        problems.push(`campo "${field}" do corpo com valor literal (use uma variável secret)`);
      }
    }
  }
  if (/kore_session=/.test(text)) problems.push('cookie de sessão literal no arquivo');
  return problems;
}

/** Problemas de um arquivo .bru: erro de sintaxe ou segredo versionado. */
export function checkFile({ path, text }) {
  const kind = kindOf({ path });
  let json;
  try {
    json = parse({ kind, text });
  } catch (error) {
    return [`sintaxe: ${String(error.message).split('\n')[0]}`];
  }
  if (kind === 'environment') return environmentProblems({ json });
  if (kind === 'request') return requestProblems({ json, text });
  return [];
}

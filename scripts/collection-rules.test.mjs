import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkFile, kindOf } from './collection-rules.mjs';

const env = (body) => ({ path: 'environments/Local.bru', text: body });
const request = (body) => ({ path: 'api-kore-api/auth/x.bru', text: body });

describe('tipo do arquivo pelo caminho', () => {
  it('ambiente, pasta/coleção e requisição', () => {
    assert.equal(kindOf({ path: 'environments/Local.bru' }), 'environment');
    assert.equal(kindOf({ path: 'collection.bru' }), 'folder');
    assert.equal(kindOf({ path: 'api-kore-api/folder.bru' }), 'folder');
    assert.equal(kindOf({ path: 'api-kore-api/me/me.bru' }), 'request');
  });
});

describe('ambientes (segredos)', () => {
  it('aceita secret sem valor e variáveis comuns', () => {
    const text = 'vars {\n  baseUrl: http://localhost:3000\n}\nvars:secret [\n  loginCode\n]\n';
    assert.deepEqual(checkFile(env(text)), []);
  });

  it('recusa variável que autentica fora de vars:secret', () => {
    const text = 'vars {\n  baseUrl: x\n  loginCode: 123456\n}\n';
    assert.deepEqual(checkFile(env(text)), [
      'variável "loginCode" autentica e tem de estar em vars:secret',
    ]);
  });

  it('recusa erro de sintaxe', () => {
    const [problem] = checkFile(env('vars {\n  baseUrl: x\n'));
    assert.match(problem, /^sintaxe:/);
  });
});

describe('requisições (segredos)', () => {
  const post = (body, extra = '') =>
    `post {\n  url: {{baseUrl}}/v1/x\n  body: json\n  auth: none\n}\n${extra}\nbody:json {\n  ${body}\n}\n`;

  it('aceita corpo com variáveis', () => {
    assert.deepEqual(
      checkFile(request(post('{ "email": "{{loginEmail}}", "code": "{{loginCode}}" }'))),
      [],
    );
  });

  it('recusa código e e-mail literais no corpo', () => {
    assert.deepEqual(checkFile(request(post('{ "email": "ana@exemplo.com", "code": "123456" }'))), [
      'campo "email" do corpo com valor literal (use uma variável secret)',
      'campo "code" do corpo com valor literal (use uma variável secret)',
    ]);
  });

  it('recusa Cookie literal e o cookie de sessão em qualquer lugar', () => {
    const text = post('{}', 'headers {\n  Cookie: kore_session=abc\n}\n');
    assert.deepEqual(checkFile(request(text)), [
      'cabeçalho "Cookie" com valor literal (use uma variável secret)',
      'cookie de sessão literal no arquivo',
    ]);
  });

  it('recusa token literal escrito na URL, sem bloco params:query', () => {
    const text =
      'get {\n  url: {{baseUrl}}/v1/me?token=abcdef0123\n  body: none\n  auth: none\n}\n';
    assert.deepEqual(checkFile(request(text)), [
      'parâmetro "token" com valor literal (use uma variável secret)',
    ]);
  });

  it('aceita variável na query da URL', () => {
    const text =
      'get {\n  url: {{baseUrl}}/x?state={{googleState}}&origin=none\n  body: none\n  auth: none\n}\n';
    assert.deepEqual(checkFile(request(text)), []);
  });

  it('recusa segredo literal em vars:pre-request e aceita expressão da resposta em vars:post-response', () => {
    const text =
      'get {\n  url: {{baseUrl}}/x\n  body: none\n  auth: none\n}\n\nvars:pre-request {\n  sessionToken: abc123\n}\n\nvars:post-response {\n  loginCode: res.body.code\n  sessionKey: abc\n}\n';
    assert.deepEqual(checkFile(request(text)), [
      'vars:pre-request "sessionToken" com valor literal (use uma variável secret)',
      'vars:post-response "sessionKey" com valor literal (use res.… ou uma variável secret)',
    ]);
  });

  it('recusa token literal na query', () => {
    const text =
      'get {\n  url: {{baseUrl}}/x?token=abc\n  body: none\n  auth: none\n}\n\nparams:query {\n  token: abc\n}\n';
    assert.deepEqual(checkFile(request(text)), [
      'parâmetro "token" com valor literal (use uma variável secret)',
    ]);
  });
});

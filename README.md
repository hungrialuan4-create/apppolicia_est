# POLÍCIA BRASIL

Aplicativo privado sobre carreiras policiais: salários, concursos, notícias, estudos, gráficos, calculadora de carreira, favoritos e painel administrativo.

**Stack:** React + TypeScript + Vite + Tailwind CSS + Recharts + Supabase (PostgreSQL, Auth, Row Level Security, Edge Functions).

> **Estado atual:** o código foi escrito, mas **ainda não foi compilado nem executado**, porque o ambiente onde foi criado não permite instalar pacotes nem acessar um Supabase real. Ao rodar `npm install && npm run build` pela primeira vez, é possível aparecer pequenos erros de tipo para corrigir.

## O que já funciona (quando conectado ao Supabase)

| Requisito | Como está feito |
|---|---|
| Login, cadastro, recuperar senha, permanecer conectado | Supabase Auth (senhas com hash bcrypt, sessões com JWT). "Permanecer conectado" escolhe `localStorage` ou `sessionStorage`. |
| Acesso privado | Todas as tabelas têm RLS: só usuários **aprovados** leem; só **admin** escreve. |
| Bloquear novos cadastros | `app_settings.allow_signups = false` (padrão) + lista `allowed_emails`. Um trigger recusa cadastros não autorizados. O **primeiro** usuário cadastrado vira administrador. |
| Dashboard | Contagens reais, relógio, últimas notícias e atualizações salariais, gráfico. |
| Salários | Busca instantânea, filtros (estado, esfera, instituição, faixa), ordenação, fonte, data e situação em cada registro. |
| Notícias e concursos | Prioridade PRF → PF → PM-GO → PC-GO → Polícia Penal-GO → Científica-GO → demais. Notificação em tempo real para notícias "importantes". |
| Estudos | 13 disciplinas, questões (múltipla escolha e CEBRASPE), níveis, simulados, gabarito comentado, histórico de desempenho. |
| Gráficos | Os 5 pedidos, todos calculados do banco. |
| Calculadora de carreira | Instituição → cargo → progressão, só com dados cadastrados. |
| Favoritos | Instituições, concursos, notícias, disciplinas e questões. |
| Admin | CRUD de instituições, salários, progressão, histórico anual, concursos, notícias, disciplinas, conteúdo, questões; usuários e permissões; abrir/fechar cadastros; logs e histórico de alterações (trigger de auditoria). |
| Rotinas automáticas | Edge Functions `sync-news` (notícias por RSS) e `check-sources` (verifica se os links das fontes estão no ar). |

## Regra dos dados (importante)

Nenhum salário foi inventado. O banco inicial (`0002_seed.sql`) traz só o que foi encontrado em pesquisa na web em 11/11/2026:

- **PRF, PF** (valores de 2026): vêm de portais de concursos (fontes secundárias) e estão como **"Em verificação"**. Confira na tabela do MGI / Portal da Transparência / edital e mude para "Confirmado" no painel admin. Há divergência entre fontes (por exemplo, alguns sites somam auxílio-alimentação).
- **PC-GO e PM-GO**: valores do **edital de 2022**, marcados como **"Desatualizado"**.
- **Todas as demais instituições** (27 UFs x PM, PC e Polícia Penal, mais PF, PRF, Polícia Penal Federal e Polícia Técnico-Científica-GO) estão cadastradas **sem salário** e aparecem como **"Dados não confirmados"**.
- **Não incluídos:** Guardas Municipais, Polícia Legislativa e as demais polícias científicas estaduais. Cadastre pelo painel admin.

**A atualização automática não lê valores salariais sozinha.** Diários oficiais e portais de transparência não têm um formato único, e extrair valores automaticamente sem erro seria arriscado. A rotina `check-sources` confere se os links continuam acessíveis; quem confirma o valor é o administrador. Para automatizar um estado específico, a estrutura já está pronta: escreva uma nova Edge Function que leia aquela fonte e grave em `salary_records` com `status = 'em_verificacao'`.

As notícias vêm do RSS do Google Notícias (busca por termos). Cada item guarda título, veículo e link original; **o resumo fica vazio** até o administrador preencher.

As 6 questões incluídas são exemplos autorais. O conteúdo de aulas, resumos, apostilas e mapas mentais está **vazio**: insira pelo painel admin.

## Instalação

1. **Crie um projeto** em https://supabase.com (plano gratuito serve).
2. **Banco:** no *SQL Editor*, execute em ordem `supabase/migrations/0001_schema.sql` e `0002_seed.sql` (ou use `supabase db push`).
3. **Auth:** em *Authentication → Providers → Email* deixe e-mail e senha ativos. Em *Authentication → URL Configuration*, ponha a URL do site (e `http://localhost:5173` para testes). Para o link de recuperação funcionar, inclua `/redefinir-senha` nas Redirect URLs.
4. **Variáveis:** copie `.env.example` para `.env.local` e preencha com a URL e a chave **anon** (*Settings → API*). Nunca use a chave `service_role` no front-end.
5. **Rodar:**
   ```bash
   npm install
   npm run dev
   ```
6. **Primeiro acesso:** abra o app e use **Solicitar cadastro**. O primeiro usuário vira **administrador**. Depois disso os cadastros ficam bloqueados; autorize e-mails em *Admin → Acesso*.
7. **Rotinas automáticas (opcional):**
   ```bash
   supabase login && supabase link --project-ref <PROJECT_REF>
   supabase secrets set CRON_SECRET=<texto-longo-aleatorio>
   supabase functions deploy sync-news --no-verify-jwt
   supabase functions deploy check-sources --no-verify-jwt
   ```
   Depois renomeie `supabase/migrations/0003_cron.sql.example` para `.sql`, troque `<PROJECT_REF>` e `<CRON_SECRET>` e execute. Sem isso, o administrador ainda pode usar **Atualizar agora** (Notícias) e **Verificar fontes** (Admin → Salários).
8. **Publicar:** `npm run build` gera `dist/`, que pode ir para Vercel, Netlify ou Cloudflare Pages (configure as duas variáveis `VITE_...` lá e uma regra de reescrita de todas as rotas para `index.html`).

## Estrutura

```
src/
  auth/AuthProvider.tsx   sessão, perfil, login/cadastro/recuperação
  components/             Layout (menu lateral + inferior no celular), Logo, ui
  hooks/useFavorites.ts
  lib/                    cliente Supabase, formatação, prioridade de notícias
  pages/                  Dashboard, Salaries, News, Study, Charts, CareerCalc, Favorites, Admin
supabase/
  migrations/             schema + RLS + auditoria, dados iniciais, agendamento (exemplo)
  functions/              sync-news, check-sources, _shared/auth.ts
```

## Segurança

- Senhas: gerenciadas pelo Supabase Auth (hash bcrypt); o app nunca vê a senha em texto no banco.
- RLS ativo em todas as tabelas; o front-end usa só a chave `anon`.
- Edge Functions aceitam apenas um administrador logado ou o segredo `CRON_SECRET`.
- Logs: `audit_log` (quem mudou o quê, antes e depois) e `sync_logs` (rotinas).
- Recomendado em produção: ativar confirmação de e-mail, CAPTCHA e MFA no Supabase.

## Próximos passos sugeridos

- Confirmar os valores "Em verificação" e cadastrar os demais estados.
- Cadastrar conteúdo de estudo e mais questões (importação CSV seria uma boa adição).
- Conectores por estado para leitura de diários oficiais.
- Tema claro opcional e PWA (instalável no celular).

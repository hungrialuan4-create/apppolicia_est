-- POLÍCIA BRASIL — dados iniciais
-- REGRA: nenhum valor abaixo foi inventado. Cada salário traz a fonte consultada, a data de referência
-- e a situação. Valores vindos de portais de notícias/cursinhos estão como 'em_verificacao' (precisam ser
-- conferidos no Portal da Transparência, tabela do MGI ou Diário Oficial) e valores de editais antigos
-- estão como 'desatualizado'. O que não está aqui aparece no app como "Dados não confirmados".

-- ============ INSTITUIÇÕES ============
insert into institutions (name, acronym, kind, sphere, state, official_site) values
  ('Polícia Federal', 'PF', 'PF', 'federal', null, 'https://www.gov.br/pf'),
  ('Polícia Rodoviária Federal', 'PRF', 'PRF', 'federal', null, 'https://www.gov.br/prf'),
  ('Polícia Penal Federal', 'PPF', 'PP', 'federal', null, null)
on conflict do nothing;

with ufs(uf) as (
  select unnest(array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'])
)
insert into institutions (name, acronym, kind, sphere, state)
select 'Polícia Militar - ' || uf, 'PM-' || uf, 'PM', case when uf = 'DF' then 'distrital' else 'estadual' end, uf from ufs
union all
select 'Polícia Civil - ' || uf, 'PC-' || uf, 'PC', case when uf = 'DF' then 'distrital' else 'estadual' end, uf from ufs
union all
select 'Polícia Penal - ' || uf, 'PP-' || uf, 'PP', case when uf = 'DF' then 'distrital' else 'estadual' end, uf from ufs
on conflict do nothing;

-- Goiás (prioridade do usuário): Polícia Científica. Demais estados: cadastrar pelo painel admin quando aplicável.
insert into institutions (name, acronym, kind, sphere, state) values
  ('Polícia Técnico-Científica - GO', 'PTC-GO', 'CIENTIFICA', 'estadual', 'GO')
on conflict do nothing;

-- ============ SALÁRIOS (somente o que foi encontrado em fontes) ============
-- PRF — Policial Rodoviário Federal
insert into salary_records (institution_id, role_title, rank_class, salary_initial, salary_final, education, status, reference_date, source_name, source_url, notes)
select id, 'Policial Rodoviário Federal', 'Terceira Classe, Padrão I (inicial) até Especial III (topo)', 12253.84, 23000.00,
  'Nível superior em qualquer área + CNH categoria B ou superior', 'em_verificacao', date '2026-05-01',
  'Aprova Concursos (fonte secundária) — confirmar na tabela do MGI / Portal da Transparência',
  'https://www.aprovaconcursos.com.br/noticias/concurso-prf/',
  'Valor de maio/2026 após a última parcela da Lei 14.875/2024. Sem benefícios incluídos. Outras fontes divulgam valores diferentes quando somam auxílios.'
from institutions where acronym = 'PRF';

-- PF — Agente / Escrivão / Papiloscopista
insert into salary_records (institution_id, role_title, rank_class, salary_initial, salary_final, education, workload, status, reference_date, source_name, source_url, notes)
select id, 'Agente de Polícia Federal', 'Terceira Classe (inicial)', 14710.10, null,
  'Nível superior em qualquer área', '40 horas semanais', 'em_verificacao', date '2026-05-01',
  'Aprova Concursos / Gran Cursos (fontes secundárias) — confirmar no edital e na tabela do MGI',
  'https://www.aprovaconcursos.com.br/noticias/?p=162056',
  'Valor vigente a partir de 2026 segundo o edital 2025 (R$ 14.164,81 em 2025). Escrivão e Papiloscopista têm a mesma remuneração inicial.'
from institutions where acronym = 'PF';

insert into salary_records (institution_id, role_title, rank_class, salary_initial, salary_final, education, workload, status, reference_date, source_name, source_url, notes)
select id, 'Delegado de Polícia Federal', 'Inicial', 27831.70, null,
  'Bacharelado em Direito + 3 anos de atividade jurídica ou policial', '40 horas semanais', 'em_verificacao', date '2026-05-01',
  'Gran Cursos (fonte secundária) — confirmar no edital e na tabela do MGI',
  'https://blog.grancursosonline.com.br/concurso-policia-federal',
  'Valor a partir de maio/2026 (R$ 26.800,00 em 2025). Perito Criminal Federal tem a mesma remuneração inicial.'
from institutions where acronym = 'PF';

-- PC-GO — valores do edital de 2022 (desatualizados)
insert into salary_records (institution_id, role_title, rank_class, salary_initial, salary_final, education, workload, status, reference_date, source_name, source_url, notes)
select id, 'Agente de Polícia', '3ª Classe', 6353.13, null,
  'Nível superior', '40 horas semanais', 'desatualizado', date '2022-08-26',
  'Governo de Goiás — edital 006/2022',
  'https://goias.gov.br/administracao/abertas-as-inscricoes-para-concurso-publico-da-policia-civil-do-estado-de-goias/',
  'Subsídio do edital de 2022. Escrivão e Papiloscopista de 3ª Classe têm o mesmo valor. Há reajustes posteriores a confirmar em fonte oficial.'
from institutions where acronym = 'PC-GO';

insert into salary_records (institution_id, role_title, rank_class, salary_initial, salary_final, education, status, reference_date, source_name, source_url, notes)
select id, 'Delegado de Polícia Substituto', 'Inicial', 23811.22, null,
  'Bacharelado em Direito', 'desatualizado', date '2022-08-26',
  'Governo de Goiás — edital 008/2022',
  'https://goias.gov.br/administracao/?p=12224',
  'Subsídio do edital de 2022. Há reajustes posteriores a confirmar em fonte oficial.'
from institutions where acronym = 'PC-GO';

-- PM-GO — edital de 2022 (desatualizado)
insert into salary_records (institution_id, role_title, rank_class, salary_initial, salary_final, education, workload, status, reference_date, source_name, source_url, notes)
select id, 'Soldado Combatente', 'Soldado de 2ª Classe', 6353.13, null,
  'Nível superior em qualquer área', 'Mínimo de 42 horas semanais', 'desatualizado', date '2022-04-08',
  'JC Concursos / Gran Cursos (fontes secundárias) — edital 002/2022',
  'https://jcconcursos.com.br/noticia/concursos/concurso-pm-go-inscricao-soldado-94783',
  'O edital 2022 informa faixa de R$ 6.353,13 a R$ 13.901,60 para o conjunto dos cargos (Soldado, Cadete, Tenente). O teto do Soldado não foi confirmado.'
from institutions where acronym = 'PM-GO';

-- ============ PROGRESSÃO (calculadora) ============
insert into career_steps (salary_record_id, step_order, step_label, amount, source_url)
select r.id, s.ord, s.label, s.amt, 'https://www.aprovaconcursos.com.br/noticias/concurso-prf/'
from salary_records r
join institutions i on i.id = r.institution_id and i.acronym = 'PRF'
cross join (values (1,'Terceira Classe, Padrão I',12253.84),(2,'Segunda Classe, Padrão I',14764.25),(3,'Primeira Classe, Padrão I',17244.77),(4,'Classe Especial, Padrão III',23000.00)) as s(ord,label,amt);

insert into career_steps (salary_record_id, step_order, step_label, amount, source_url)
select r.id, s.ord, s.label, s.amt, 'https://www.aprovaconcursos.com.br/noticias/?p=162056'
from salary_records r
join institutions i on i.id = r.institution_id and i.acronym = 'PF' and r.role_title = 'Agente de Polícia Federal'
cross join (values (1,'Terceira Classe (inicial)',14710.10),(2,'Segunda Classe',16761.16)) as s(ord,label,amt);

-- ============ CONCURSOS (fontes secundárias, não verificados) ============
insert into contests (institution_id, title, status, vacancies, organizer, state, notes, source_url, reference_date, verified)
select id, 'PRF — Policial Rodoviário Federal e Agente Administrativo', 'previsto', 533, null, null,
  'Pedido de 269 vagas para PRF e 264 para Agente Administrativo em análise. Sem edital publicado nem data prevista.',
  'https://www.aprovaconcursos.com.br/noticias/concurso-prf/', date '2026-06-01', false
from institutions where acronym = 'PRF';

insert into contests (institution_id, title, status, vacancies, organizer, state, notes, source_url, reference_date, verified)
select id, 'Polícia Federal 2025 — Agente, Escrivão, Papiloscopista, Perito e Delegado', 'em_andamento', 1000, 'Cebraspe', null,
  'Edital publicado em 2025; convocações de aprovados em andamento.',
  'https://www.aprovaconcursos.com.br/noticias/?p=162056', date '2026-03-20', false
from institutions where acronym = 'PF';

insert into contests (institution_id, title, status, vacancies, organizer, state, notes, source_url, reference_date, verified)
select id, 'PM-GO — novo concurso em discussão', 'previsto', null, null, 'GO',
  'Segundo o comando-geral, a realização de novo concurso está sendo discutida. Sem pedido formal confirmado.',
  'https://www.estrategiaconcursos.com.br/blog/?p=35904', date '2026-01-01', false
from institutions where acronym = 'PM-GO';

-- ============ DISCIPLINAS ============
insert into subjects (name, slug, sort_order) values
  ('Língua Portuguesa', 'portugues', 1),
  ('Matemática', 'matematica', 2),
  ('Raciocínio Lógico', 'raciocinio-logico', 3),
  ('Informática', 'informatica', 4),
  ('Direito Constitucional', 'dir-constitucional', 5),
  ('Direito Administrativo', 'dir-administrativo', 6),
  ('Direito Penal', 'dir-penal', 7),
  ('Direito Processual Penal', 'dir-processual-penal', 8),
  ('Legislação Especial', 'legislacao-especial', 9),
  ('Direitos Humanos', 'direitos-humanos', 10),
  ('Legislação de Trânsito', 'legislacao-transito', 11),
  ('Física', 'fisica', 12),
  ('Ética no Serviço Público', 'etica', 13)
on conflict do nothing;

-- Questões autorais de exemplo (conteúdo seguro e conferido). Complete pelo painel administrativo.
insert into questions (subject_id, topic, style, difficulty, statement, options, correct_index, explanation, source)
select s.id, q.topic, q.style, q.diff, q.stmt, q.opts::jsonb, q.ans, q.expl, 'Exemplo autoral'
from (values
  ('matematica','Equações','multipla_escolha','facil','Se 3x + 5 = 20, o valor de x é:','["3","4","5","6"]',2,'3x = 15, logo x = 5.'),
  ('raciocinio-logico','Negação de proposições','multipla_escolha','medio','A negação da proposição "Todo policial é concursado" é:','["Nenhum policial é concursado","Algum policial não é concursado","Todo policial não é concursado","Algum policial é concursado"]',1,'A negação de "todo A é B" é "algum A não é B".'),
  ('informatica','Arquivos','multipla_escolha','facil','Qual extensão de arquivo é a padrão atual de planilhas do Microsoft Excel?',' ["docx","pptx","xlsx","pdf"]',2,'.xlsx é o formato padrão de planilhas do Excel desde a versão 2007.'),
  ('dir-penal','Princípios','multipla_escolha','facil','O art. 1º do Código Penal ("Não há crime sem lei anterior que o defina") consagra o princípio da:','["Legalidade","Insignificância","Culpabilidade","Territorialidade"]',0,'É o princípio da legalidade (ou reserva legal), também previsto no art. 5º, XXXIX, da Constituição.'),
  ('dir-constitucional','Segurança pública (art. 144)','cebraspe','medio','A Polícia Rodoviária Federal é órgão permanente, organizado e mantido pela União e estruturado em carreira, destinado, na forma da lei, ao patrulhamento ostensivo das rodovias federais.','["Certo","Errado"]',0,'Corresponde ao art. 144, § 2º, da Constituição Federal.'),
  ('dir-constitucional','Segurança pública (art. 144)','cebraspe','medio','Segundo a Constituição Federal, as polícias civis são dirigidas por delegados de polícia de carreira e incumbem-lhes, ressalvada a competência da União, as funções de polícia judiciária e a apuração de infrações penais, exceto as militares.','["Certo","Errado"]',0,'Corresponde ao art. 144, § 4º, da Constituição Federal.')
) as q(slug, topic, style, diff, stmt, opts, ans, expl)
join subjects s on s.slug = q.slug;

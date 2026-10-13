import { Link } from 'react-router-dom'
import type { DocPageViewProps } from '../types/docPageView'

export type { DocPageViewProps } from '../types/docPageView'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

type DocEndpoint = {
  id: string
  method: HttpMethod
  path: string
  title: string
  description: string
  auth: boolean
  pathParams?: { name: string; type: string; description: string }[]
  queryParams?: {
    name: string
    type: string
    required: boolean
    description: string
    example?: string
  }[]
  bodyFields?: {
    name: string
    type: string
    required: boolean
    description: string
    example?: string
  }[]
  bodyExample?: string
  responses: { code: string; description: string }[]
}

const INSTITUTION_ENDPOINTS: DocEndpoint[] = [
  {
    id: 'post-institution',
    method: 'POST',
    path: '/institution/',
    title: 'Criar nova instituição',
    description:
      'Cria uma nova instituição no sistema. Envie um JSON no corpo da requisição com os dados cadastrais.',
    auth: true,
    bodyFields: [
      {
        name: 'name',
        type: 'string',
        required: true,
        description: 'Nome da instituição de ensino.',
        example: 'Escola Alpha',
      },
      {
        name: 'type',
        type: 'string',
        required: true,
        description: 'Categoria: escola, cursinho, plataforma, etc.',
        example: 'escola',
      },
      {
        name: 'document',
        type: 'string',
        required: true,
        description: 'Identificador oficial (CNPJ, registro ou documento interno).',
        example: '12.345.678/0001-90',
      },
      {
        name: 'email',
        type: 'string',
        required: true,
        description: 'E-mail de contato da instituição.',
        example: 'contato@escolaalpha.edu.br',
      },
      {
        name: 'phone',
        type: 'string',
        required: true,
        description: 'Telefone de contato (formato livre ou E.164).',
        example: '+55 11 99999-0000',
      },
    ],
    bodyExample: `{
  "name": "Escola Alpha",
  "type": "escola",
  "document": "12.345.678/0001-90",
  "email": "contato@escolaalpha.edu.br",
  "phone": "+55 11 99999-0000"
}`,
    responses: [
      { code: '200', description: 'Instituição criada com sucesso (resposta padrão).' },
      { code: '201', description: 'Criado — recurso disponível no corpo ou no cabeçalho Location.' },
      { code: '400', description: 'Dados inválidos ou campos obrigatórios ausentes.' },
      { code: '401', description: 'Não autenticado — token ausente ou inválido.' },
    ],
  },
  {
    id: 'get-institution-list',
    method: 'GET',
    path: '/institution/',
    title: 'Listar todas as instituições',
    description:
      'Retorna a lista completa de instituições cadastradas, em geral com todos os campos do modelo.',
    auth: true,
    responses: [
      { code: '200', description: 'Lista de instituições (array JSON).' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-institution-simple',
    method: 'GET',
    path: '/institution/simple',
    title: 'Listar instituições (formato simplificado)',
    description:
      'Retorna uma lista reduzida de instituições (por exemplo, apenas id, nome e tipo), útil para selects e telas leves.',
    auth: true,
    responses: [
      { code: '200', description: 'Lista simplificada (estrutura definida pelo backend).' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-institution-id',
    method: 'GET',
    path: '/institution/{id}',
    title: 'Buscar instituição por ID',
    description: 'Obtém os dados de uma única instituição a partir do identificador único.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'Identificador único da instituição no sistema.',
      },
    ],
    responses: [
      { code: '200', description: 'Objeto da instituição encontrada.' },
      { code: '404', description: 'Instituição não encontrada para o id informado.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'put-institution-id',
    method: 'PUT',
    path: '/institution/{id}',
    title: 'Atualizar instituição',
    description:
      'Substitui ou atualiza os dados da instituição indicada pelo id. O corpo segue o mesmo formato de criação (total ou parcial, conforme contrato do backend).',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'Identificador da instituição a ser atualizada.',
      },
    ],
    bodyFields: [
      {
        name: 'name',
        type: 'string',
        required: false,
        description: 'Novo nome (se enviado).',
      },
      {
        name: 'type',
        type: 'string',
        required: false,
        description: 'Novo tipo (se enviado).',
      },
      {
        name: 'document',
        type: 'string',
        required: false,
        description: 'Novo documento (se enviado).',
      },
      {
        name: 'email',
        type: 'string',
        required: false,
        description: 'Novo e-mail (se enviado).',
      },
      {
        name: 'phone',
        type: 'string',
        required: false,
        description: 'Novo telefone (se enviado).',
      },
    ],
    bodyExample: `{
  "name": "Escola Alpha — Unidade Centro",
  "email": "novoemail@escolaalpha.edu.br"
}`,
    responses: [
      { code: '200', description: 'Instituição atualizada com sucesso.' },
      { code: '400', description: 'Payload inválido.' },
      { code: '404', description: 'Instituição não encontrada.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'delete-institution-id',
    method: 'DELETE',
    path: '/institution/{id}',
    title: 'Deletar instituição',
    description:
      'Remove permanentemente o registro da instituição. Operação irreversível; confirme regras de negócio no backend.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'Identificador da instituição a ser removida.',
      },
    ],
    responses: [
      { code: '200', description: 'Exclusão concluída (ou 204 No Content, conforme API).' },
      { code: '404', description: 'Instituição não encontrada.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
]

const STUDENT_ENDPOINTS: DocEndpoint[] = [
  {
    id: 'post-student-identify',
    method: 'POST',
    path: '/student/identify',
    title: 'Identificar aluno (login do player)',
    description:
      'Login MVP do app aluno: telefone normalizado + código da instituição (`institution_id`). Retorna o aluno ativo correspondente.',
    auth: false,
    bodyFields: [
      {
        name: 'phone_number',
        type: 'string',
        required: true,
        description: 'Telefone do aluno (dígitos; formatação é removida).',
        example: '5512999990000',
      },
      {
        name: 'institution_code',
        type: 'string',
        required: true,
        description: 'Código da instituição (mesmo valor de institution_id).',
        example: 'inst_1',
      },
    ],
    bodyExample: `{
  "phone_number": "5512999990000",
  "institution_code": "inst_1"
}`,
    responses: [
      { code: '200', description: 'Aluno identificado (status ok).' },
      { code: '404', description: 'Aluno ou instituição não encontrados.' },
      { code: '403', description: 'Aluno ou instituição inativos.' },
      { code: '400', description: 'Payload inválido.' },
    ],
  },
  {
    id: 'get-student-list',
    method: 'GET',
    path: '/student/',
    title: 'Listar alunos (com filtros)',
    description:
      'Retorna a lista de alunos. Use query params para filtrar por `institution_id`, `school_level`, `school_grade`, `student_level` e `active`.',
    auth: true,
    queryParams: [
      {
        name: 'institution_id',
        type: 'string',
        required: false,
        description: 'Filtra alunos pertencentes à instituição.',
      },
      {
        name: 'school_level',
        type: '"fundamental" | "médio"',
        required: false,
        description: 'Nível escolar do aluno (ex.: fundamental, médio).',
      },
      {
        name: 'school_grade',
        type: 'string',
        required: false,
        description:
          'Série/ano do aluno (ex.: "7º ano", "2º ano"). Não confundir com `student_level`. Valores comuns: `fundamental` → "1º ano" ... "9º ano"; `médio` → "1º ano" ... "3º ano".',
      },
      {
        name: 'student_level',
        type: '1 | 2 | 3',
        required: false,
        description:
          'Nível pedagógico atual. Se não preencher no cadastro, o backend usa default `2` (intermediário).',
      },
      {
        name: 'active',
        type: 'boolean',
        required: false,
        description: 'Filtra apenas alunos ativos/inativos.',
      },
    ],
    responses: [
      { code: '200', description: 'Lista de alunos (array JSON).' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-student-simple',
    method: 'GET',
    path: '/student/simple',
    title: 'Listar alunos (formato simplificado)',
    description:
      'Versão reduzida do endpoint de listagem, útil para selects e telas leves.',
    auth: true,
    queryParams: [
      {
        name: 'institution_id',
        type: 'string',
        required: false,
        description: 'Filtra alunos pertencentes à instituição.',
      },
      {
        name: 'school_level',
        type: '"fundamental" | "médio"',
        required: false,
        description: 'Nível escolar do aluno (ex.: fundamental, médio).',
      },
      {
        name: 'school_grade',
        type: 'string',
        required: false,
        description:
          'Série/ano do aluno (ex.: "7º ano", "2º ano"). Não confundir com `student_level`. Valores comuns: `fundamental` → "1º ano" ... "9º ano"; `médio` → "1º ano" ... "3º ano".',
      },
      {
        name: 'student_level',
        type: '1 | 2 | 3',
        required: false,
        description: 'Nível pedagógico atual do aluno (1, 2 ou 3).',
      },
      {
        name: 'active',
        type: 'boolean',
        required: false,
        description: 'Filtra apenas alunos ativos/inativos.',
      },
    ],
    responses: [
      { code: '200', description: 'Lista simplificada (campos reduzidos).' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-student-id',
    method: 'GET',
    path: '/student/{id}',
    title: 'Buscar aluno por ID',
    description: 'Obtém os dados de um aluno a partir do identificador único.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'Identificador único do aluno no sistema.',
      },
    ],
    responses: [
      { code: '200', description: 'Objeto do aluno encontrado.' },
      { code: '404', description: 'Aluno não encontrado para o id informado.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-student-phone',
    method: 'GET',
    path: '/student/{phone_number}',
    title: 'Buscar aluno por phone_number',
    description:
      'Obtém os dados de um aluno a partir do telefone (phone_number). A busca é feita pelos dígitos; caracteres não numéricos são removidos pelo backend.',
    auth: true,
    pathParams: [
      {
        name: 'phone_number',
        type: 'string',
        description:
          'Telefone do aluno. Quando usado no path, a rota captura apenas dígitos.',
      },
    ],
    responses: [
      { code: '200', description: 'Objeto do aluno encontrado.' },
      { code: '404', description: 'Aluno não encontrado para o telefone informado.' },
      { code: '400', description: 'Telefone inválido (sem dígitos).' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'post-student',
    method: 'POST',
    path: '/student/',
    title: 'Criar novo aluno',
    description:
      'Cria um novo aluno vinculado a uma instituição. Campos importantes: `school_level`/`school_grade` representam a série/ano escolar; `student_level` representa o nível pedagógico atual e é independente deles. Se `student_level` não for enviado, o backend assume default `2` (intermediário).',
    auth: true,
    bodyFields: [
      {
        name: 'institution_id',
        type: 'string',
        required: true,
        description: 'ID da instituição de ensino do aluno.',
        example: 'inst_abc123',
      },
      {
        name: 'name',
        type: 'string',
        required: true,
        description: 'Nome completo do aluno.',
        example: 'João da Silva',
      },
      {
        name: 'phone_number',
        type: 'string',
        required: true,
        description:
          'Telefone de contato. O backend/painel salva apenas números (remove `+`, espaços, hífen, parênteses etc.).',
        example: '+55 11 99999-0000',
      },
      {
        name: 'school_level',
        type: '"fundamental" | "médio"',
        required: true,
        description:
          'Nível escolar. Use "fundamental" ou "médio" (equivalente a ensino médio).',
        example: 'fundamental',
      },
      {
        name: 'school_grade',
        type: 'string',
        required: true,
        description:
          'Série/ano escolar (ex.: "7º ano"). Não confundir com `student_level`. Valores comuns: `fundamental` → "1º ano" ... "9º ano"; `médio` → "1º ano" ... "3º ano".',
        example: '7º ano',
      },
      {
        name: 'student_level',
        type: '1 | 2 | 3',
        required: false,
        description:
          'Nível pedagógico atual (1, 2, 3). Default quando não preenchido: `2`.',
        example: '1',
      },
      {
        name: 'active',
        type: 'boolean',
        required: false,
        description:
          'Indica se o aluno está ativo. Se não enviar, o backend usa `true`.',
        example: 'true',
      },
    ],
    bodyExample: `{
  "institution_id": "inst_abc123",
  "name": "João da Silva",
  "phone_number": "+55 11 99999-0000",
  "school_level": "fundamental",
  "school_grade": "7º ano",
  "student_level": 1,
  "active": true
}
{
  "institution_id": "inst_abc123",
  "name": "Maria Souza",
  "phone_number": "+55 11 98888-0000",
  "school_level": "fundamental",
  "school_grade": "7º ano",
  "active": true
  // student_level omitido -> default 2 (intermediário)
}
{
  "institution_id": "inst_abc123",
  "name": "Carlos Pereira",
  "phone_number": "+55 11 97777-0000",
  "school_level": "fundamental",
  "school_grade": "7º ano",
  "student_level": 3,
  "active": true
}
{
  "institution_id": "inst_abc123",
  "name": "Ana Oliveira",
  "phone_number": "+55 11 96666-0000",
  "school_level": "médio",
  "school_grade": "1º ano",
  "student_level": 1,
  "active": true
}
{
  "institution_id": "inst_abc123",
  "name": "Pedro Santos",
  "phone_number": "+55 11 95555-0000",
  "school_level": "médio",
  "school_grade": "1º ano",
  "student_level": 2,
  "active": true
}
{
  "institution_id": "inst_abc123",
  "name": "Bruna Costa",
  "phone_number": "+55 11 94444-0000",
  "school_level": "médio",
  "school_grade": "1º ano",
  "student_level": 3,
  "active": true
}`,
    responses: [
      { code: '201', description: 'Criado — aluno disponível no corpo.' },
      { code: '400', description: 'Dados inválidos ou campos obrigatórios ausentes.' },
      { code: '401', description: 'Não autenticado — token ausente ou inválido.' },
    ],
  },
  {
    id: 'put-student-id',
    method: 'PUT',
    path: '/student/{id}',
    title: 'Atualizar aluno',
    description:
      'Atualiza campos do aluno indicado pelo `id`. O corpo pode ser parcial: envie somente os campos que deseja alterar.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'Identificador do aluno a ser atualizado.',
      },
    ],
    bodyFields: [
      {
        name: 'institution_id',
        type: 'string',
        required: false,
        description: 'Pode re-vincular o aluno a outra instituição (se regra permitir).',
      },
      {
        name: 'name',
        type: 'string',
        required: false,
        description: 'Novo nome do aluno.',
      },
      {
        name: 'phone_number',
        type: 'string',
        required: false,
        description:
          'Novo telefone do aluno. O backend/painel salva apenas dígitos (remove caracteres não numéricos).',
      },
      {
        name: 'school_level',
        type: '"fundamental" | "médio"',
        required: false,
        description: 'Atualiza o nível escolar.',
      },
      {
        name: 'school_grade',
        type: 'string',
        required: false,
        description: 'Atualiza a série/ano escolar.',
      },
      {
        name: 'student_level',
        type: '1 | 2 | 3',
        required: false,
        description: 'Atualiza o nível pedagógico atual.',
      },
      {
        name: 'active',
        type: 'boolean',
        required: false,
        description: 'Ativa/desativa o aluno.',
      },
    ],
    responses: [
      { code: '200', description: 'Aluno atualizado com sucesso.' },
      { code: '400', description: 'Payload inválido.' },
      { code: '404', description: 'Aluno não encontrado.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'delete-student-id',
    method: 'DELETE',
    path: '/student/{id}',
    title: 'Deletar aluno',
    description:
      'Remove o aluno com exclusão em cascade dos registros dependentes (`student_trails`, `conversation_logs`, `exercise_attempts`). Operação irreversível. Se o aluno já não existir, os dependentes ainda são limpos e a resposta é 204.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'Identificador do aluno a ser removido.',
      },
    ],
    responses: [
      {
        code: '204',
        description:
          'Exclusão concluída (No Content), inclusive quando só havia dependentes órfãos.',
      },
      { code: '400', description: 'id ausente.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
]

const TRAIL_ENDPOINTS: DocEndpoint[] = [
  {
    id: 'get-trail-list',
    method: 'GET',
    path: '/trails/',
    title: 'Listar trilhas (com filtros)',
    description:
      'Retorna a lista de trilhas. Use query params para filtrar por `institution_id` e `active`.',
    auth: true,
    queryParams: [
      {
        name: 'institution_id',
        type: 'string',
        required: false,
        description: 'Filtra trilhas pertencentes à instituição.',
      },
      {
        name: 'active',
        type: 'boolean',
        required: false,
        description: 'Filtra apenas trilhas ativas/inativas.',
      },
    ],
    responses: [
      { code: '200', description: 'Lista de trilhas (array JSON).' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-trail-simple',
    method: 'GET',
    path: '/trails/simple',
    title: 'Listar trilhas (formato simplificado)',
    description:
      'Versão reduzida da listagem, útil para selects e telas leves.',
    auth: true,
    queryParams: [
      {
        name: 'institution_id',
        type: 'string',
        required: false,
        description: 'Filtra trilhas pertencentes à instituição.',
      },
      {
        name: 'active',
        type: 'boolean',
        required: false,
        description: 'Filtra apenas trilhas ativas/inativas.',
      },
    ],
    responses: [
      { code: '200', description: 'Lista simplificada (campos reduzidos).' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-trail-id',
    method: 'GET',
    path: '/trails/{id}',
    title: 'Buscar trilha por ID',
    description:
      'Obtém os dados de uma única trilha a partir do identificador único.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'Identificador único da trilha no sistema.',
      },
    ],
    responses: [
      { code: '200', description: 'Objeto da trilha encontrado.' },
      { code: '404', description: 'Trilha não encontrada para o id informado.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'post-trail',
    method: 'POST',
    path: '/trails/',
    title: 'Criar nova trilha',
    description:
      'Cria uma nova trilha com os campos macro. `default_total_steps_per_stage` é opcional e o backend usa default `8` quando não enviado.',
    auth: true,
    bodyFields: [
      {
        name: 'institution_id',
        type: 'string',
        required: true,
        description: 'ID da instituição dona da trilha.',
        example: 'inst_abc123',
      },
      {
        name: 'name',
        type: 'string',
        required: true,
        description: 'Nome/identificador da trilha.',
        example: 'Trilha de Matemática Básica',
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        description: 'Descrição geral da trilha.',
        example: 'Visão macro do conteúdo e objetivos...',
      },
      {
        name: 'subject',
        type: 'string',
        required: true,
        description: 'Matéria ou tema principal da trilha.',
        example: 'Matemática',
      },
      {
        name: 'default_total_steps_per_stage',
        type: 'number (inteiro)',
        required: false,
        description:
          'Valor padrão de passos por stage (o backend usa `8` se omitido).',
        example: '8',
      },
      {
        name: 'active',
        type: 'boolean',
        required: false,
        description: 'Indica se a trilha está ativa no sistema.',
        example: 'true',
      },
    ],
    responses: [
      { code: '201', description: 'Trilha criada com sucesso.' },
      { code: '400', description: 'Dados inválidos ou campos obrigatórios ausentes.' },
      { code: '401', description: 'Não autenticado — token ausente ou inválido.' },
    ],
  },
  {
    id: 'put-trail-id',
    method: 'PUT',
    path: '/trails/{id}',
    title: 'Atualizar trilha',
    description:
      'Atualiza campos da trilha indicada pelo `id`. O corpo pode ser parcial.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'Identificador da trilha a ser atualizada.',
      },
    ],
    bodyFields: [
      {
        name: 'institution_id',
        type: 'string',
        required: false,
        description:
          'Não permitido após criação (imutável). Enviar este campo retorna erro.',
      },
      { name: 'name', type: 'string', required: false, description: 'Novo nome da trilha.' },
      { name: 'description', type: 'string', required: false, description: 'Nova descrição geral.' },
      { name: 'subject', type: 'string', required: false, description: 'Novo tema/matéria principal.' },
      {
        name: 'default_total_steps_per_stage',
        type: 'number (inteiro)',
        required: false,
        description: 'Novo valor padrão de passos por stage.',
      },
      {
        name: 'active',
        type: 'boolean',
        required: false,
        description: 'Ativa/desativa a trilha.',
      },
    ],
    responses: [
      { code: '200', description: 'Trilha atualizada com sucesso.' },
      { code: '400', description: 'Payload inválido.' },
      { code: '404', description: 'Trilha não encontrada.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'delete-trail-id',
    method: 'DELETE',
    path: '/trails/{id}',
    title: 'Deletar trilha',
    description:
      'Remove a trilha com exclusão em cascade dos registros dependentes (`trail_stage_questions`, `trail_stages`, `student_trails`, `conversation_logs`). Operação irreversível.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'Identificador da trilha a ser removida.',
      },
    ],
    responses: [
      { code: '204', description: 'Exclusão concluída (No Content).' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
]

const TRAIL_STAGE_ENDPOINTS: DocEndpoint[] = [
  {
    id: 'get-trail-stage-list',
    method: 'GET',
    path: '/trail_stages/',
    title: 'Listar stages (com filtros)',
    description:
      'Retorna a lista de stages. Use query params para filtrar por `trail_id`, `active` e `is_released`.',
    auth: true,
    queryParams: [
      {
        name: 'trail_id',
        type: 'string',
        required: false,
        description: 'Filtra stages pertencentes à trilha.',
      },
      {
        name: 'active',
        type: 'boolean',
        required: false,
        description: 'Filtra apenas stages ativas/inativas.',
      },
      {
        name: 'is_released',
        type: 'boolean',
        required: false,
        description: 'Filtra apenas stages liberadas/não liberadas.',
      },
    ],
    responses: [
      { code: '200', description: 'Lista de stages (array JSON).' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-trail-stage-simple',
    method: 'GET',
    path: '/trail_stages/simple',
    title: 'Listar stages (formato simplificado)',
    description: 'Versão reduzida da listagem.',
    auth: true,
    queryParams: [
      {
        name: 'trail_id',
        type: 'string',
        required: false,
        description: 'Filtra stages pertencentes à trilha.',
      },
    ],
    responses: [
      { code: '200', description: 'Lista simplificada.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-trail-stage-id',
    method: 'GET',
    path: '/trail_stages/{id}',
    title: 'Buscar stage por ID',
    description: 'Obtém os dados de um único stage.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'Identificador do stage (docId).',
      },
    ],
    responses: [
      { code: '200', description: 'Objeto do stage encontrado.' },
      { code: '404', description: 'Stage não encontrado.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-trail-stage-by-trail-and-number',
    method: 'GET',
    path: '/trail_stages/',
    title: 'Buscar stage por trail_id e stage_number',
    description:
      'Obtém um único stage quando ambos os query params estão presentes. Equivale ao documento com id determinístico `{trail_id}_stage_{stage_number}`. O parâmetro `simple=1` também se aplica.',
    auth: true,
    queryParams: [
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
        example: 'trail_001',
      },
      {
        name: 'stage_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Número do stage (>= 1), único dentro da trilha.',
        example: '1',
      },
    ],
    responses: [
      { code: '200', description: 'Objeto do stage (mesmo formato do GET por id).' },
      { code: '400', description: 'trail_id ausente ou stage_number inválido.' },
      { code: '404', description: 'Nenhum stage com esse par na trilha.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'post-trail-stage',
    method: 'POST',
    path: '/trail_stages/',
    title: 'Criar novo stage',
    description:
      'Cria um novo stage de uma trilha. `is_released` inicia como `false` e `active` inicia como `true`.',
    auth: true,
    bodyFields: [
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha a que o stage pertence.',
        example: 'trail_001',
      },
      {
        name: 'stage_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Número sequencial do stage (começa em 1). Deve ser único dentro da mesma trail.',
        example: '1',
      },
      {
        name: 'title',
        type: 'string',
        required: true,
        description: 'Nome do stage.',
        example: 'Frações básicas',
      },
      {
        name: 'stage_type',
        type: '"ai" | "fixed" | "exercise"',
        required: true,
        description:
          'Tipo do stage (player do aluno). Com `fixed` ou `exercise`, `prompt` deve ser null ou omitido.',
        example: 'ai',
      },
      {
        name: 'prompt',
        type: 'string | null',
        required: true,
        description:
          'Prompt base. Obrigatório (string não vazia) quando `stage_type` é `ai`; deve ser `null` para `fixed` e `exercise`.',
        example: 'Explique o conteúdo de forma simples…',
      },
    ],
    responses: [
      { code: '201', description: 'Stage criado com sucesso.' },
      { code: '400', description: 'Dados inválidos ou conflito de stage_number.' },
      { code: '401', description: 'Não autenticado — token ausente ou inválido.' },
    ],
  },
  {
    id: 'put-trail-stage-id',
    method: 'PUT',
    path: '/trail_stages/{id}',
    title: 'Atualizar stage',
    description: 'Atualiza campos do stage. `stage_number` e `trail_id` não são suportados para mudança.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'Identificador do stage a ser atualizado.',
      },
    ],
    bodyFields: [
      {
        name: 'title',
        type: 'string',
        required: false,
        description: 'Novo título do stage.',
      },
      {
        name: 'stage_type',
        type: '"ai" | "fixed" | "exercise"',
        required: false,
        description:
          'Novo tipo do stage. Se mudar para `fixed` ou `exercise`, o servidor grava `prompt` como null.',
      },
      {
        name: 'prompt',
        type: 'string | null',
        required: false,
        description:
          'Novo prompt. Com `stage_type` `ai` deve ser texto não vazio quando enviado; com `fixed`/`exercise` use null.',
      },
      {
        name: 'is_released',
        type: 'boolean',
        required: false,
        description: 'Define se o stage está liberado para os alunos.',
      },
      {
        name: 'active',
        type: 'boolean',
        required: false,
        description: 'Define se o stage está ativo no sistema.',
      },
    ],
    responses: [
      { code: '200', description: 'Stage atualizado com sucesso.' },
      { code: '400', description: 'Payload inválido.' },
      { code: '404', description: 'Stage não encontrado.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'delete-trail-stage-id',
    method: 'DELETE',
    path: '/trail_stages/{id}',
    title: 'Deletar stage',
    description: 'Remove permanentemente o stage.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'Identificador do stage a ser removido.',
      },
    ],
    responses: [
      { code: '204', description: 'Exclusão concluída (No Content).' },
      { code: '404', description: 'Stage não encontrado.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
]

const TRAIL_STAGE_QUESTION_ENDPOINTS: DocEndpoint[] = [
  {
    id: 'get-trail-stage-question-max',
    method: 'GET',
    path: '/trail_stage_questions/',
    title: 'Obter maior question_number do stage',
    description:
      'Use `action=max` com `trail_id` e `stage_number`. Retorna `max_question_number`, `next_question_number` e `total_questions` (aceita filtros opcionais `active` e `is_released`).',
    auth: true,
    queryParams: [
      {
        name: 'action',
        type: 'string',
        required: true,
        description: 'Valor fixo: `max`.',
        example: 'max',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
      },
      {
        name: 'stage_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Número do stage.',
      },
      {
        name: 'active',
        type: 'boolean',
        required: false,
        description: 'Opcional: calcula o maior apenas entre questões ativas/inativas.',
      },
      {
        name: 'is_released',
        type: 'boolean',
        required: false,
        description: 'Opcional: calcula o maior apenas entre questões liberadas/não liberadas.',
      },
    ],
    responses: [
      {
        code: '200',
        description:
          'Ex.: `{ trail_id, stage_number, max_question_number, next_question_number, total_questions }`.',
      },
      { code: '400', description: 'trail_id ou stage_number ausentes/inválidos para action=max.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-trail-stage-question-list',
    method: 'GET',
    path: '/trail_stage_questions/',
    title: 'Listar questões de um stage',
    description:
      'Retorna questões ordenadas por `question_number` quando `trail_id` e `stage_number` são informados. Opcional: `active` (filtra ativas/inativas), `simple=1`.',
    auth: true,
    queryParams: [
      {
        name: 'trail_id',
        type: 'string',
        required: false,
        description:
          'ID da trilha — obrigatório com `stage_number` para listar ou com `question_number` para item único.',
      },
      {
        name: 'stage_number',
        type: 'number (inteiro)',
        required: false,
        description: 'Número do stage (obrigatório para listar / buscar por tríade).',
      },
      {
        name: 'question_number',
        type: 'number (inteiro)',
        required: false,
        description:
          'Se informado junto com trail_id e stage_number, retorna uma única questão (em vez da lista).',
      },
      {
        name: 'active',
        type: 'boolean',
        required: false,
        description: 'Filtra apenas questões ativas ou inativas.',
      },
      {
        name: 'is_released',
        type: 'boolean',
        required: false,
        description: 'Filtra questões liberadas ou não liberadas para o aluno.',
      },
      {
        name: 'simple',
        type: 'string',
        required: false,
        description: 'Use `1` para omitir timestamps no payload.',
      },
      {
        name: 'id',
        type: 'string',
        required: false,
        description: 'ID do documento Firestore (alternativa à lista ou à tríade trail/stage/question).',
      },
    ],
    responses: [
      { code: '200', description: 'Lista ou um único objeto JSON (sempre inclui is_released).' },
      { code: '400', description: 'Parâmetros insuficientes ou inválidos.' },
      { code: '404', description: 'Questão não encontrada.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-trail-stage-question-simple',
    method: 'GET',
    path: '/trail_stage_questions/simple',
    title: 'Atalho simple=1',
    description: 'Mesmas consultas que a rota base, com corpo reduzido (sem timestamps).',
    auth: true,
    queryParams: [
      {
        name: 'trail_id',
        type: 'string',
        required: false,
        description: 'Ver rota principal.',
      },
    ],
    responses: [{ code: '200', description: 'Dados conforme filtros.' }],
  },
  {
    id: 'get-trail-stage-question-id',
    method: 'GET',
    path: '/trail_stage_questions/{id}',
    title: 'Buscar questão por ID do documento',
    description:
      'O `id` segue o padrão `{trail_id}_stage_{stage_number}_q_{question_number}`.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'Document ID na collection `trail_stage_questions`.',
      },
    ],
    responses: [
      { code: '200', description: 'Objeto da questão.' },
      { code: '404', description: 'Não encontrado.' },
    ],
  },
  {
    id: 'post-trail-stage-question',
    method: 'POST',
    path: '/trail_stage_questions/',
    title: 'Criar questão / etapa',
    description:
      'Opcionalmente envie `is_released` (boolean). Se omitido, vale `true` só para `question_number === 1`, senão `false`. `active` inicia como `true`. O servidor usa `trail_stages.stage_type` para validar correção. Não envie `question_type` nem `prompt`.',
    auth: true,
    bodyFields: [
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
        example: 'trail_001',
      },
      {
        name: 'stage_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Número do stage (>= 1); o documento deve existir em trail_stages.',
        example: '1',
      },
      {
        name: 'question_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Ordem da questão dentro do stage (>= 1).',
        example: '5',
      },
      {
        name: 'title',
        type: 'string',
        required: true,
        description: 'Nome da etapa (ex.: Contexto, Exercício 1).',
      },
      {
        name: 'content',
        type: 'string',
        required: true,
        description: 'Texto principal / enunciado.',
      },
      {
        name: 'correct_option',
        type: 'string | null',
        required: false,
        description: 'Obrigatório (não-null) se trail_stages.stage_type for exercise; senão deve ser omitido ou null.',
        example: 'A',
      },
      {
        name: 'options',
        type: 'array | null',
        required: false,
        description: 'Alternativas de múltipla escolha; null se não aplicável.',
      },
      {
        name: 'explanation',
        type: 'string | null',
        required: false,
        description: 'Explicação opcional (ex.: feedback pós-resposta).',
      },
      {
        name: 'is_released',
        type: 'boolean',
        required: false,
        description:
          'Se omitido: true só quando question_number === 1; caso contrário false.',
        example: 'true',
      },
    ],
    bodyExample: `{
  "trail_id": "trail_001",
  "stage_number": 1,
  "question_number": 5,
  "title": "Exercício 1",
  "content": "Qual fração representa metade de uma pizza?",
  "correct_option": "A",
  "options": [
    { "key": "A", "text": "1/2" },
    { "key": "B", "text": "1/3" }
  ],
  "explanation": "Metade corresponde a 1/2.",
  "is_released": true
}`,
    responses: [
      { code: '201', description: 'Criado (corpo com dados da questão).' },
      { code: '400', description: 'Stage ausente, validação ou JSON inválido.' },
      { code: '409', description: 'Conflito: question_number já existe no stage.' },
    ],
  },
  {
    id: 'put-trail-stage-question-id',
    method: 'PUT',
    path: '/trail_stage_questions/{id}',
    title: 'Atualizar questão',
    description:
      'Atualização parcial. Não altere trail_id, stage_number nem question_number. Revalida usando o `stage_type` atual do `trail_stages`. Remove campos legados `question_type` e `prompt` do documento se existirem.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'ID do documento.',
      },
    ],
    bodyFields: [
      {
        name: 'title',
        type: 'string',
        required: false,
        description: 'Novo título.',
      },
      {
        name: 'content',
        type: 'string',
        required: false,
        description: 'Novo conteúdo.',
      },
      {
        name: 'correct_option',
        type: 'string | null',
        required: false,
        description: 'Conforme trail_stages.stage_type (exercise vs demais).',
      },
      {
        name: 'options',
        type: 'array | null',
        required: false,
        description: 'Lista de alternativas ou null.',
      },
      {
        name: 'explanation',
        type: 'string | null',
        required: false,
        description: 'Texto ou null.',
      },
      {
        name: 'active',
        type: 'boolean',
        required: false,
        description: 'Use false para desativar sem apagar o documento.',
      },
      {
        name: 'is_released',
        type: 'boolean',
        required: false,
        description: 'Liberação para o aluno acessar esta etapa.',
      },
    ],
    responses: [
      { code: '200', description: '{ ok: true, id } — documento atualizado (is_released persistido).' },
      { code: '400', description: 'Payload inválido ou campos de identidade no body.' },
      { code: '404', description: 'Não encontrado.' },
    ],
  },
  {
    id: 'put-trail-stage-question-deactivate',
    method: 'PUT',
    path: '/trail_stage_questions/{id}?deactivate=1',
    title: 'Desativar questão (sem deletar)',
    description:
      'Atalho: query `deactivate=1` e corpo JSON vazio `{}`. Equivale a `active: false`.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'ID do documento.',
      },
    ],
    queryParams: [
      {
        name: 'deactivate',
        type: 'string',
        required: true,
        description: 'Deve ser `1`.',
      },
    ],
    responses: [
      { code: '200', description: '{ ok: true, id, active: false }' },
      { code: '400', description: 'Corpo não vazio quando deactivate=1.' },
      { code: '404', description: 'Não encontrado.' },
    ],
  },
  {
    id: 'delete-trail-stage-question',
    method: 'DELETE',
    path: '/trail_stage_questions/{id}',
    title: 'DELETE não suportado',
    description:
      'A API não remove documentos desta collection; use desativação (`active: false`).',
    auth: true,
    pathParams: [
      { name: 'id', type: 'string', description: '—' },
    ],
    responses: [{ code: '405', description: 'Método não permitido.' }],
  },
]

const STUDENT_TRAIL_ENDPOINTS: DocEndpoint[] = [
  {
    id: 'get-student-trail-next-content',
    method: 'GET',
    path: '/student_trails/next-content',
    title: 'Próximo conteúdo (player)',
    description:
      'Retorna o conteúdo na posição atual do aluno, com checagem de is_released/active. Usado pelo app web do aluno.',
    auth: false,
    queryParams: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
      },
    ],
    responses: [
      {
        code: '200',
        description:
          'status ok (conteúdo), blocked, completed, inactive_student ou inactive_trail.',
      },
      { code: '404', description: 'Aluno, trilha ou vínculo não encontrado.' },
    ],
  },
  {
    id: 'post-student-trail-advance',
    method: 'POST',
    path: '/student_trails/advance',
    title: 'Avançar progresso (player)',
    description:
      'Aplica a grade canônica (stage → question) e atualiza student_trails. A lógica de progressão fica na API.',
    auth: false,
    bodyFields: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
        example: 's1',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
        example: 't1',
      },
    ],
    bodyExample: `{
  "student_id": "s1",
  "trail_id": "t1"
}`,
    responses: [
      {
        code: '200',
        description:
          'status ok com next_stage_number / next_question_number / completed, ou blocked/completed.',
      },
      { code: '404', description: 'Aluno, trilha ou vínculo não encontrado.' },
    ],
  },
  {
    id: 'get-student-trail-position',
    method: 'GET',
    path: '/student_trails/',
    title: 'Buscar posição atual do aluno em uma trilha',
    description:
      'Retorna o estado atual do aluno dentro de uma trilha (stage, questão e status) a partir de `student_id` + `trail_id`.',
    auth: true,
    queryParams: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno (campo student_id na collection student_trails).',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha pedagógica.',
      },
    ],
    responses: [
      {
        code: '200',
        description:
          'Objeto com stage/questão/status atuais, além de timestamps (started_at, completed_at, last_interaction_at, created_at, updated_at).',
      },
      { code: '400', description: 'Parâmetros obrigatórios ausentes.' },
      { code: '404', description: 'Progresso não encontrado para student_id + trail_id.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'post-student-trail',
    method: 'POST',
    path: '/student_trails/',
    title: 'Criar progresso de aluno em uma trilha',
    description:
      'Cria um registro na collection `student_trails` para controlar o estado atual do aluno em uma trilha específica. Apenas um registro por combinação student_id + trail_id.',
    auth: true,
    bodyFields: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
        example: 'stu_001',
      },
      {
        name: 'institution_id',
        type: 'string',
        required: true,
        description: 'ID da instituição à qual o aluno pertence.',
        example: 'inst_001',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha pedagógica.',
        example: 'trail_001',
      },
      {
        name: 'current_stage_number',
        type: 'number (inteiro)',
        required: false,
        description: 'Stage atual (default 1 quando omitido).',
        example: '1',
      },
      {
        name: 'current_question_number',
        type: 'number (inteiro)',
        required: false,
        description: 'Questão atual dentro do stage (default 1 quando omitido).',
        example: '1',
      },
      {
        name: 'status',
        type: '"not_started" | "in_progress" | "completed" | "blocked"',
        required: false,
        description:
          'Estado da jornada do aluno na trilha. Default `not_started` quando omitido.',
        example: 'in_progress',
      },
    ],
    bodyExample: `{
  "student_id": "stu_001",
  "institution_id": "inst_001",
  "trail_id": "trail_001",
  "current_stage_number": 1,
  "current_question_number": 1,
  "status": "in_progress"
}`,
    responses: [
      {
        code: '201',
        description:
          'Progresso criado com sucesso (apenas estado atual; histórico detalhado é salvo em outras collections).',
      },
      {
        code: '409',
        description:
          'Já existe um registro de progresso para a combinação student_id + trail_id.',
      },
      { code: '400', description: 'Payload inválido ou campos obrigatórios ausentes.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'put-student-trail-advance-question',
    method: 'PUT',
    path: '/student_trails/?action=advance_question',
    title: 'Avançar para a próxima questão',
    description:
      'Incrementa `current_question_number` do aluno em uma trilha. Se o status estiver `not_started`, passa para `in_progress` e preenche `started_at` se ainda estiver null.',
    auth: true,
    queryParams: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
      },
      {
        name: 'action',
        type: 'string',
        required: true,
        description: 'Deve ser "advance_question".',
      },
    ],
    responses: [
      {
        code: '200',
        description:
          'Objeto com posição atualizada (stage, questão e status). `last_interaction_at` é atualizado.',
      },
      {
        code: '400',
        description:
          'Parâmetros inválidos ou tentativa de avançar quando o status está `completed` ou `blocked`.',
      },
      { code: '404', description: 'Progresso não encontrado para student_id + trail_id.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'put-student-trail-advance-stage',
    method: 'PUT',
    path: '/student_trails/?action=advance_stage',
    title: 'Avançar para o próximo stage',
    description:
      'Incrementa `current_stage_number` e mantém `current_question_number` como está. Mesma regra de status/started_at do avanço de questão.',
    auth: true,
    queryParams: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
      },
      {
        name: 'action',
        type: 'string',
        required: true,
        description: 'Deve ser "advance_stage".',
      },
    ],
    responses: [
      {
        code: '200',
        description:
          'Objeto com novo stage atual; `current_question_number` inalterado. `last_interaction_at` é atualizado.',
      },
      {
        code: '400',
        description:
          'Parâmetros inválidos ou tentativa de avançar quando o status está `completed` ou `blocked`.',
      },
      { code: '404', description: 'Progresso não encontrado.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'put-student-trail-mark-last-interaction',
    method: 'PUT',
    path: '/student_trails/?action=mark_last_interaction',
    title: 'Marcar última interação',
    description:
      'Apenas atualiza `last_interaction_at` (e `updated_at`) do registro de progresso.',
    auth: true,
    queryParams: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
      },
      {
        name: 'action',
        type: 'string',
        required: true,
        description: 'Deve ser "mark_last_interaction".',
      },
    ],
    responses: [
      { code: '200', description: '{ ok: true } — sucesso.' },
      { code: '404', description: 'Progresso não encontrado.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'put-student-trail-complete',
    method: 'PUT',
    path: '/student_trails/?action=complete',
    title: 'Concluir trilha para o aluno',
    description:
      'Define `status = "completed"`, preenche `completed_at` e atualiza `last_interaction_at`.',
    auth: true,
    queryParams: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
      },
      {
        name: 'action',
        type: 'string',
        required: true,
        description: 'Deve ser "complete".',
      },
    ],
    responses: [
      { code: '200', description: '{ ok: true, status: "completed" }.' },
      { code: '404', description: 'Progresso não encontrado.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'put-student-trail-block',
    method: 'PUT',
    path: '/student_trails/?action=block',
    title: 'Bloquear trilha para o aluno',
    description:
      'Define `status = "blocked"`. Pode ser usado para interromper a jornada do aluno na trilha quando houver algum impedimento.',
    auth: true,
    queryParams: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
      },
      {
        name: 'action',
        type: 'string',
        required: true,
        description: 'Deve ser "block".',
      },
    ],
    responses: [
      { code: '200', description: '{ ok: true, status: "blocked" }.' },
      { code: '404', description: 'Progresso não encontrado.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'put-student-trail-update-status',
    method: 'PUT',
    path: '/student_trails/?action=update_status',
    title: 'Atualizar status manualmente',
    description:
      'Permite forçar o status da trilha do aluno para qualquer um dos valores válidos, respeitando as regras de timestamps (started_at/completed_at).',
    auth: true,
    queryParams: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
      },
      {
        name: 'action',
        type: 'string',
        required: true,
        description: 'Deve ser "update_status".',
      },
    ],
    bodyFields: [
      {
        name: 'status',
        type: '"not_started" | "in_progress" | "completed" | "blocked"',
        required: true,
        description: 'Novo status desejado.',
        example: 'blocked',
      },
    ],
    responses: [
      { code: '200', description: '{ ok: true, status: "<novo_status>" }.' },
      { code: '400', description: 'Status inválido.' },
      { code: '404', description: 'Progresso não encontrado.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'put-student-trail-update-position',
    method: 'PUT',
    path: '/student_trails/?action=update_position',
    title: 'Ajustar manualmente stage/questão atuais',
    description:
      'Atualiza diretamente `current_stage_number` e/ou `current_question_number` para correções pontuais, sem alterar o histórico de conversas.',
    auth: true,
    queryParams: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
      },
      {
        name: 'action',
        type: 'string',
        required: true,
        description: 'Deve ser "update_position".',
      },
    ],
    bodyFields: [
      {
        name: 'current_stage_number',
        type: 'number (inteiro)',
        required: false,
        description: 'Novo stage atual (>= 1).',
        example: '2',
      },
      {
        name: 'current_question_number',
        type: 'number (inteiro)',
        required: false,
        description: 'Nova questão atual (>= 1).',
        example: '3',
      },
    ],
    responses: [
      { code: '200', description: '{ ok: true } — posição atualizada.' },
      {
        code: '400',
        description:
          'Nenhum campo enviado ou valores inválidos (menores que 1).',
      },
      { code: '404', description: 'Progresso não encontrado.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
]

const EXERCISE_ATTEMPT_ENDPOINTS: DocEndpoint[] = [
  {
    id: 'post-exercise-attempt',
    method: 'POST',
    path: '/exercise_attempts/',
    title: 'Registrar tentativa de exercício',
    description:
      'Cria um registro em `exercise_attempts` para uma questão do tipo exercise. A API busca a questão em `trail_stage_questions`, copia `correct_option`, calcula `is_correct`, define `score` (1 ou 0) e incrementa `attempt_number` para a combinação student_id + trail_id + stage_number + question_number. Questões com `annulled: true` não aceitam tentativa.',
    auth: true,
    bodyFields: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
        example: 'stu_001',
      },
      {
        name: 'institution_id',
        type: 'string',
        required: true,
        description: 'ID da instituição do aluno.',
        example: 'inst_001',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha pedagógica.',
        example: 'trail_001',
      },
      {
        name: 'stage_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Stage onde está a questão (>= 1).',
        example: '2',
      },
      {
        name: 'question_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Número da questão dentro do stage (>= 1).',
        example: '5',
      },
      {
        name: 'student_answer',
        type: 'string',
        required: true,
        description:
          'Resposta enviada pelo aluno. Pode ser a letra da alternativa (ex.: "A") ou um valor aberto (ex.: "1/2").',
        example: 'A',
      },
      {
        name: 'feedback',
        type: 'string | null',
        required: false,
        description:
          'Mensagem de feedback opcional definida pelo backend/painel (ex.: "Resposta correta!", "Quase, revise o conceito de fração.").',
      },
    ],
    bodyExample: `{
  "student_id": "stu_001",
  "institution_id": "inst_001",
  "trail_id": "trail_001",
  "stage_number": 2,
  "question_number": 5,
  "student_answer": "A",
  "feedback": "Resposta correta!"
}`,
    responses: [
      {
        code: '201',
        description:
          'Tentativa registrada com sucesso. Retorna id, is_correct, score (1 ou 0) e attempt_number (número da tentativa).',
      },
      {
        code: '400',
        description: 'Payload inválido ou campos obrigatórios ausentes.',
      },
      {
        code: '404',
        description:
          'Questão não encontrada em trail_stage_questions com os parâmetros informados.',
      },
      {
        code: '409',
        description:
          'Questão não é do tipo exercise, está sem correct_option configurado, ou está anulada.',
      },
    ],
  },
  {
    id: 'get-exercise-attempts-by-student',
    method: 'GET',
    path: '/exercise_attempts/?student_id={student_id}',
    title: 'Listar tentativas por aluno',
    description:
      'Lista todas as tentativas de exercícios de um aluno (qualquer trilha/questão), ordenadas por attempted_at (mais antigas primeiro).',
    auth: true,
    queryParams: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
      },
    ],
    responses: [
      {
        code: '200',
        description:
          'Array de documentos de exercise_attempts contendo histórico completo de tentativas do aluno.',
      },
      { code: '400', description: 'Parâmetros inválidos.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-exercise-attempts-by-question',
    method: 'GET',
    path: '/exercise_attempts/?trail_id={trail_id}&stage_number={stage_number}&question_number={question_number}',
    title: 'Listar tentativas por questão',
    description:
      'Lista todas as tentativas registradas para uma questão específica (qualquer aluno), ordenadas por attempt_number (1, 2, 3, ...). Útil para análise pedagógica da questão.',
    auth: true,
    queryParams: [
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
      },
      {
        name: 'stage_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Stage da questão.',
      },
      {
        name: 'question_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Número da questão dentro do stage.',
      },
    ],
    responses: [
      {
        code: '200',
        description:
          'Array de exercise_attempts para a questão informada (cada item com student_id, is_correct, score, feedback, attempt_number, timestamps etc.).',
      },
      { code: '400', description: 'Parâmetros inválidos.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-exercise-attempt-count',
    method: 'GET',
    path: '/exercise_attempts/?action=count&student_id={student_id}&trail_id={trail_id}&stage_number={stage_number}&question_number={question_number}',
    title: 'Contar tentativas de um aluno em uma questão',
    description:
      'Retorna quantas tentativas já foram registradas pelo aluno em uma questão específica. Útil para regras de limite de tentativas ou desbloqueio de avanço.',
    auth: true,
    queryParams: [
      {
        name: 'action',
        type: 'string',
        required: true,
        description: 'Deve ser "count".',
      },
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
      },
      {
        name: 'stage_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Stage da questão.',
      },
      {
        name: 'question_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Número da questão.',
      },
    ],
    responses: [
      {
        code: '200',
        description:
          'Objeto com attempt_count (inteiro) para os parâmetros informados.',
      },
      { code: '400', description: 'Parâmetros obrigatórios ausentes ou inválidos.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-exercise-attempt-last',
    method: 'GET',
    path: '/exercise_attempts/?action=last&student_id={student_id}&trail_id={trail_id}&stage_number={stage_number}&question_number={question_number}',
    title: 'Obter última tentativa do aluno na questão',
    description:
      'Retorna apenas a tentativa mais recente (maior attempt_number) do aluno em uma questão específica. Útil para saber se o aluno acertou por último e qual feedback recebeu.',
    auth: true,
    queryParams: [
      {
        name: 'action',
        type: 'string',
        required: true,
        description: 'Deve ser "last".',
      },
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
      },
      {
        name: 'stage_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Stage da questão.',
      },
      {
        name: 'question_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Número da questão.',
      },
    ],
    responses: [
      {
        code: '200',
        description:
          'Documento único de exercise_attempts representando a última tentativa do aluno na questão.',
      },
      {
        code: '404',
        description:
          'Nenhuma tentativa encontrada para a combinação informada.',
      },
      { code: '400', description: 'Parâmetros inválidos.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
]

const CONVERSATION_LOG_ENDPOINTS: DocEndpoint[] = [
  {
    id: 'post-conversation-log',
    method: 'POST',
    path: '/conversation_logs/',
    title: 'Criar log de conversa',
    description:
      'Cria um registro de histórico na collection `conversation_logs` para cada mensagem trocada na sessão do aluno. No momento do POST, o servidor grava automaticamente `created_at` (timestamp do Firestore) e `created_at_brasilia` (string com data/hora atual em America/Sao_Paulo, formato `YYYY-MM-DDTHH:mm:ss`). Não é necessário (nem recomendado) enviar `created_at_brasilia` no body.',
    auth: true,
    bodyFields: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
        example: 'stu_001',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha pedagógica em que a interação ocorreu.',
        example: 'trail_001',
      },
      {
        name: 'stage_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Número do stage em que a interação ocorreu (>= 1).',
        example: '1',
      },
      {
        name: 'question_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Número da questão dentro do stage (>= 1).',
        example: '2',
      },
      {
        name: 'sender',
        type: '"system" | "student"',
        required: true,
        description: 'Quem enviou a mensagem (sistema/agente ou aluno).',
        example: 'system',
      },
      {
        name: 'message_text',
        type: 'string',
        required: true,
        description: 'Texto bruto da mensagem.',
        example: 'Agora vamos para a introdução do conteúdo.',
      },
      {
        name: 'institution_id',
        type: 'string | null',
        required: false,
        description:
          'ID da instituição, opcional, para facilitar filtros futuros (pode ser null).',
        example: 'inst_001',
      },
      {
        name: 'message_type',
        type: '"text" | "instruction" | "exercise" | "feedback" | null',
        required: false,
        description:
          'Classificação opcional da mensagem (texto genérico, instrução, exercício, feedback).',
        example: 'instruction',
      },
      {
        name: 'metadata',
        type: 'object | null',
        required: false,
        description:
          'Objeto opcional para metadados extras (ex.: nome do bloco de fluxo, canal, resultado de validação).',
        example: '{ "flow_block": "enviar_introducao" }',
      },
    ],
    bodyExample: `{
  "student_id": "stu_001",
  "trail_id": "trail_001",
  "stage_number": 1,
  "question_number": 2,
  "sender": "system",
  "message_text": "Agora vamos para a introdução do conteúdo.",
  "institution_id": "inst_001",
  "message_type": "instruction",
  "metadata": {
    "flow_block": "enviar_introducao"
  }
}`,
    responses: [
      {
        code: '201',
        description:
          'Log criado com sucesso. A resposta inclui `created_at_brasilia` (já preenchido) e `created_at` null até o cliente ler o documento (server timestamp).',
      },
      { code: '400', description: 'Payload inválido ou campos obrigatórios ausentes.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-conversation-log-by-id',
    method: 'GET',
    path: '/conversation_logs/{id}',
    title: 'Buscar log de conversa por ID',
    description: 'Obtém um único registro de conversa a partir do ID do documento.',
    auth: true,
    pathParams: [
      {
        name: 'id',
        type: 'string',
        description: 'ID do documento na collection `conversation_logs`.',
      },
    ],
    responses: [
      {
        code: '200',
        description:
          'Objeto do log de conversa, incluindo timestamps e metadados (se existirem).',
      },
      { code: '404', description: 'Log não encontrado.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-conversation-logs-by-student',
    method: 'GET',
    path: '/conversation_logs/',
    title: 'Listar histórico por aluno',
    description:
      'Retorna todos os logs de conversa de um aluno (todas as trilhas), ordenados por created_at ascendente.',
    auth: true,
    queryParams: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno cujos logs serão listados.',
      },
    ],
    responses: [
      { code: '200', description: 'Array de logs em ordem cronológica.' },
      { code: '400', description: 'Parâmetro student_id ausente.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-conversation-logs-by-student-and-trail',
    method: 'GET',
    path: '/conversation_logs/',
    title: 'Listar histórico por aluno e trilha',
    description:
      'Retorna apenas os logs de conversa de um aluno dentro de uma trilha específica.',
    auth: true,
    queryParams: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
      },
    ],
    responses: [
      { code: '200', description: 'Array de logs filtrados por aluno + trilha.' },
      { code: '400', description: 'Parâmetros obrigatórios ausentes.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-conversation-logs-by-student-trail-stage',
    method: 'GET',
    path: '/conversation_logs/',
    title: 'Listar histórico por aluno, trilha e stage',
    description:
      'Filtra o histórico de um aluno para uma trilha e um stage específicos (útil para auditoria de um trecho da jornada).',
    auth: true,
    queryParams: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: true,
        description: 'ID da trilha.',
      },
      {
        name: 'stage_number',
        type: 'number (inteiro)',
        required: true,
        description: 'Número do stage.',
      },
    ],
    responses: [
      { code: '200', description: 'Array de logs para o stage informado.' },
      { code: '400', description: 'Parâmetros obrigatórios ausentes ou inválidos.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
  {
    id: 'get-conversation-logs-recent',
    method: 'GET',
    path: '/conversation_logs/',
    title: 'Buscar histórico recente (últimas N mensagens)',
    description:
      'Retorna os últimos N registros de conversa de um aluno (opcionalmente filtrados por trilha), ordenados por created_at desc.',
    auth: true,
    queryParams: [
      {
        name: 'student_id',
        type: 'string',
        required: true,
        description: 'ID do aluno.',
      },
      {
        name: 'trail_id',
        type: 'string',
        required: false,
        description:
          'Opcional — se enviado, o filtro é feito também por essa trilha. Caso contrário, retorna de todas.',
      },
      {
        name: 'recent',
        type: 'string',
        required: true,
        description: 'Deve ser "1" para ativar o modo de histórico recente.',
      },
      {
        name: 'limit',
        type: 'number (inteiro)',
        required: false,
        description:
          'Quantidade máxima de registros (default 100, máximo 500 quando enviado).',
      },
    ],
    responses: [
      {
        code: '200',
        description:
          'Array com os últimos N registros, ordenados do mais recente para o mais antigo.',
      },
      { code: '400', description: 'Parâmetros inválidos ou ausentes.' },
      { code: '401', description: 'Não autenticado.' },
    ],
  },
]

const METHOD_EXPLAIN: Record<HttpMethod, string> = {
  GET: 'Consulta — lê dados do servidor sem alterar o estado do recurso (idempotente).',
  POST: 'Criação — envia um corpo (body) para criar um novo recurso; gera um novo id no servidor.',
  PUT: 'Atualização — envia o recurso (ou campos) para substituir/atualizar o registro identificado na URL.',
  DELETE: 'Exclusão — remove o recurso identificado na URL.',
}

export function DocPageView({
  baseUrl,
  appOrigin,
  showDefaultBaseHint,
}: DocPageViewProps) {
  return (
    <>
      <header className="admin__header">
        <h1>Documentação da API</h1>
        <p className="admin__lede">
          Referência dos endpoints REST dos recursos{' '}
          <strong>Institution</strong>, <strong>Student</strong>, <strong>Trails</strong>,{' '}
          <strong>Trail stages</strong>, <strong>Trail stage questions</strong>,{' '}
          <strong>Student trails</strong>, <strong>Conversation logs</strong> e{' '}
          <strong>Exercise attempts</strong>{' '}
          (instituições, alunos, trilhas, stages, questões, progresso de trilhas,
          histórico de conversa e tentativas de exercícios). Cada
          bloco indica o <strong>método HTTP</strong>, o <strong>caminho</strong>, o
          que a rota faz e os parâmetros ou corpo esperados.
        </p>
        <p className="admin__lede muted">
          <strong>Painel (esta interface) em produção:</strong>{' '}
          <a href={appOrigin} target="_blank" rel="noreferrer">
            {appOrigin}
          </a>
          . Todas as variáveis <code>VITE_*</code> vão no <code>.env</code> local ou
          em <strong>Settings → Environment Variables</strong> na Vercel (não dependem
          de <code>localhost</code>).
        </p>
        <p className="doc__base">
          <span className="doc__base-label">Base URL da API</span>
          <code className="doc__base-value">{baseUrl}</code>
          {showDefaultBaseHint ? (
            <span className="muted doc__base-hint">
              Padrão: mesmo host do app na Vercel. Se a API REST estiver em outro domínio,
              defina <code>VITE_API_BASE_URL</code> no <code>.env</code> ou na Vercel.
            </span>
          ) : null}
        </p>
        <p className="admin__actions">
          <Link className="btn btn--ghost" to="/">
            ← Voltar ao início
          </Link>
        </p>
      </header>

      <section className="panel doc__methods-legend">
        <h2>Métodos HTTP</h2>
        <ul className="doc__legend-list">
          {(Object.keys(METHOD_EXPLAIN) as HttpMethod[]).map((m) => (
            <li key={m}>
              <span className={`doc-method doc-method--${m.toLowerCase()}`}>
                {m}
              </span>
              <span>{METHOD_EXPLAIN[m]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel doc__section">
        <h2>Institution — endpoints</h2>
        <p className="doc__section-intro muted">
          Rotas agrupadas por recurso. Ícone de cadeado indica que o backend pode
          exigir autenticação (por exemplo, cabeçalho{' '}
          <code>Authorization: Bearer &lt;token&gt;</code>).
        </p>

        <div className="doc__endpoints">
          {INSTITUTION_ENDPOINTS.map((ep) => (
            <details key={ep.id} className="doc-endpoint">
              <summary className="doc-endpoint__summary">
                <span
                  className={`doc-method doc-method--${ep.method.toLowerCase()}`}
                >
                  {ep.method}
                </span>
                <code className="doc-endpoint__path">{ep.path}</code>
                <span className="doc-endpoint__title">{ep.title}</span>
                {ep.auth ? (
                  <span
                    className="doc-endpoint__lock"
                    title="Pode exigir autenticação"
                    aria-label="Autenticação"
                  >
                    <LockIcon />
                  </span>
                ) : null}
              </summary>

              <div className="doc-endpoint__body">
                <p className="doc-endpoint__desc">{ep.description}</p>

                <p className="doc-endpoint__fullurl">
                  <span className="muted">URL completa de exemplo:</span>{' '}
                  <code>
                    {ep.method} {baseUrl}
                    {ep.path.replace('{id}', '{id}')}
                  </code>
                </p>

                {ep.pathParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Parâmetros de path</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.pathParams.map((p) => (
                          <tr key={p.name}>
                            <td>
                              <code>{p.name}</code>
                            </td>
                            <td>{p.type}</td>
                            <td>{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.queryParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Query</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.queryParams.map((q) => (
                          <tr key={q.name}>
                            <td>
                              <code>{q.name}</code>
                            </td>
                            <td>{q.type}</td>
                            <td>{q.required ? 'Sim' : 'Não'}</td>
                            <td>{q.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.bodyFields?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Corpo da requisição (JSON)</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Campo</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.bodyFields.map((f) => (
                          <tr key={f.name}>
                            <td>
                              <code>{f.name}</code>
                            </td>
                            <td>{f.type}</td>
                            <td>{f.required ? 'Sim' : 'Não'}</td>
                            <td>
                              {f.description}
                              {f.example ? (
                                <span className="doc-example">
                                  {' '}
                                  Ex.: <code>{f.example}</code>
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ep.bodyExample ? (
                      <pre className="doc-pre" tabIndex={0}>
                        <code>{ep.bodyExample}</code>
                      </pre>
                    ) : null}
                  </div>
                ) : null}

                <div className="doc-block">
                  <h3 className="doc-block__title">Respostas</h3>
                  <ul className="doc-responses">
                    {ep.responses.map((r) => (
                      <li key={r.code}>
                        <span
                          className={`doc-code doc-code--${r.code.startsWith('2') ? 'ok' : r.code.startsWith('4') ? 'client' : 'other'}`}
                        >
                          {r.code}
                        </span>
                        {r.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="panel doc__section">
        <h2>Exercise attempts — endpoints</h2>
        <p className="doc__section-intro muted">
          Collection <code>exercise_attempts</code>: histórico de tentativas de resposta
          dos alunos em questões do tipo <code>exercise</code> dentro das trilhas
          pedagógicas. Cada tentativa é um documento independente — não há sobrescrita,
          permitindo análise fina de acertos, erros, número de tentativas e evolução.
        </p>

        <div className="doc__endpoints">
          {EXERCISE_ATTEMPT_ENDPOINTS.map((ep) => (
            <details key={ep.id} className="doc-endpoint">
              <summary className="doc-endpoint__summary">
                <span
                  className={`doc-method doc-method--${ep.method.toLowerCase()}`}
                >
                  {ep.method}
                </span>
                <code className="doc-endpoint__path">{ep.path}</code>
                <span className="doc-endpoint__title">{ep.title}</span>
                {ep.auth ? (
                  <span
                    className="doc-endpoint__lock"
                    title="Pode exigir autenticação"
                    aria-label="Autenticação"
                  >
                    <LockIcon />
                  </span>
                ) : null}
              </summary>

              <div className="doc-endpoint__body">
                <p className="doc-endpoint__desc">{ep.description}</p>

                <p className="doc-endpoint__fullurl">
                  <span className="muted">URL completa de exemplo:</span>{' '}
                  <code>
                    {ep.method} {baseUrl}
                    {ep.path.replace('{id}', '{id}')}
                  </code>
                </p>

                {ep.pathParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Parâmetros de path</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.pathParams.map((p) => (
                          <tr key={p.name}>
                            <td>
                              <code>{p.name}</code>
                            </td>
                            <td>{p.type}</td>
                            <td>{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.queryParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Query</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.queryParams.map((q) => (
                          <tr key={q.name}>
                            <td>
                              <code>{q.name}</code>
                            </td>
                            <td>{q.type}</td>
                            <td>{q.required ? 'Sim' : 'Não'}</td>
                            <td>{q.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.bodyFields?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Corpo da requisição (JSON)</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Campo</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.bodyFields.map((f) => (
                          <tr key={f.name}>
                            <td>
                              <code>{f.name}</code>
                            </td>
                            <td>{f.type}</td>
                            <td>{f.required ? 'Sim' : 'Não'}</td>
                            <td>
                              {f.description}
                              {f.example ? (
                                <span className="doc-example">
                                  {' '}
                                  Ex.: <code>{f.example}</code>
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ep.bodyExample ? (
                      <pre className="doc-pre" tabIndex={0}>
                        <code>{ep.bodyExample}</code>
                      </pre>
                    ) : null}
                  </div>
                ) : null}

                <div className="doc-block">
                  <h3 className="doc-block__title">Respostas</h3>
                  <ul className="doc-responses">
                    {ep.responses.map((r) => (
                      <li key={r.code}>
                        <span
                          className={`doc-code doc-code--${r.code.startsWith('2') ? 'ok' : r.code.startsWith('4') ? 'client' : 'other'}`}
                        >
                          {r.code}
                        </span>
                        {r.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="panel doc__section">
        <h2>Student (Aluno) — endpoints</h2>
        <p className="doc__section-intro muted">
          Rotas para cadastrar e gerenciar alunos vinculados a instituições.
          `student_level` é independente de `school_grade` (ano/série escolar).
        </p>

        <div className="doc__endpoints">
          {STUDENT_ENDPOINTS.map((ep) => (
            <details key={ep.id} className="doc-endpoint">
              <summary className="doc-endpoint__summary">
                <span
                  className={`doc-method doc-method--${ep.method.toLowerCase()}`}
                >
                  {ep.method}
                </span>
                <code className="doc-endpoint__path">{ep.path}</code>
                <span className="doc-endpoint__title">{ep.title}</span>
                {ep.auth ? (
                  <span
                    className="doc-endpoint__lock"
                    title="Pode exigir autenticação"
                    aria-label="Autenticação"
                  >
                    <LockIcon />
                  </span>
                ) : null}
              </summary>

              <div className="doc-endpoint__body">
                <p className="doc-endpoint__desc">{ep.description}</p>

                <p className="doc-endpoint__fullurl">
                  <span className="muted">URL completa de exemplo:</span>{' '}
                  <code>
                    {ep.method} {baseUrl}
                    {ep.path.replace('{id}', '{id}')}
                  </code>
                </p>

                {ep.pathParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Parâmetros de path</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.pathParams.map((p) => (
                          <tr key={p.name}>
                            <td>
                              <code>{p.name}</code>
                            </td>
                            <td>{p.type}</td>
                            <td>{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.queryParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Query</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.queryParams.map((q) => (
                          <tr key={q.name}>
                            <td>
                              <code>{q.name}</code>
                            </td>
                            <td>{q.type}</td>
                            <td>{q.required ? 'Sim' : 'Não'}</td>
                            <td>{q.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.bodyFields?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Corpo da requisição (JSON)</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Campo</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.bodyFields.map((f) => (
                          <tr key={f.name}>
                            <td>
                              <code>{f.name}</code>
                            </td>
                            <td>{f.type}</td>
                            <td>{f.required ? 'Sim' : 'Não'}</td>
                            <td>
                              {f.description}
                              {f.example ? (
                                <span className="doc-example">
                                  {' '}
                                  Ex.: <code>{f.example}</code>
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ep.bodyExample ? (
                      <pre className="doc-pre" tabIndex={0}>
                        <code>{ep.bodyExample}</code>
                      </pre>
                    ) : null}
                  </div>
                ) : null}

                <div className="doc-block">
                  <h3 className="doc-block__title">Respostas</h3>
                  <ul className="doc-responses">
                    {ep.responses.map((r) => (
                      <li key={r.code}>
                        <span
                          className={`doc-code doc-code--${r.code.startsWith('2') ? 'ok' : r.code.startsWith('4') ? 'client' : 'other'}`}
                        >
                          {r.code}
                        </span>
                        {r.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="panel doc__section">
        <h2>Trails — endpoints</h2>
        <p className="doc__section-intro muted">
          Rotas para cadastrar e gerenciar trilhas com campos macro.
        </p>

        <div className="doc__endpoints">
          {TRAIL_ENDPOINTS.map((ep) => (
            <details key={ep.id} className="doc-endpoint">
              <summary className="doc-endpoint__summary">
                <span
                  className={`doc-method doc-method--${ep.method.toLowerCase()}`}
                >
                  {ep.method}
                </span>
                <code className="doc-endpoint__path">{ep.path}</code>
                <span className="doc-endpoint__title">{ep.title}</span>
                {ep.auth ? (
                  <span
                    className="doc-endpoint__lock"
                    title="Pode exigir autenticação"
                    aria-label="Autenticação"
                  >
                    <LockIcon />
                  </span>
                ) : null}
              </summary>

              <div className="doc-endpoint__body">
                <p className="doc-endpoint__desc">{ep.description}</p>

                <p className="doc-endpoint__fullurl">
                  <span className="muted">URL completa de exemplo:</span>{' '}
                  <code>
                    {ep.method} {baseUrl}
                    {ep.path.replace('{id}', '{id}')}
                  </code>
                </p>

                {ep.pathParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Parâmetros de path</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.pathParams.map((p) => (
                          <tr key={p.name}>
                            <td>
                              <code>{p.name}</code>
                            </td>
                            <td>{p.type}</td>
                            <td>{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.queryParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Query</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.queryParams.map((q) => (
                          <tr key={q.name}>
                            <td>
                              <code>{q.name}</code>
                            </td>
                            <td>{q.type}</td>
                            <td>{q.required ? 'Sim' : 'Não'}</td>
                            <td>{q.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.bodyFields?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Corpo da requisição (JSON)</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Campo</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.bodyFields.map((f) => (
                          <tr key={f.name}>
                            <td>
                              <code>{f.name}</code>
                            </td>
                            <td>{f.type}</td>
                            <td>{f.required ? 'Sim' : 'Não'}</td>
                            <td>
                              {f.description}
                              {f.example ? (
                                <span className="doc-example">
                                  {' '}
                                  Ex.: <code>{f.example}</code>
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ep.bodyExample ? (
                      <pre className="doc-pre" tabIndex={0}>
                        <code>{ep.bodyExample}</code>
                      </pre>
                    ) : null}
                  </div>
                ) : null}

                <div className="doc-block">
                  <h3 className="doc-block__title">Respostas</h3>
                  <ul className="doc-responses">
                    {ep.responses.map((r) => (
                      <li key={r.code}>
                        <span
                          className={`doc-code doc-code--${r.code.startsWith('2') ? 'ok' : r.code.startsWith('4') ? 'client' : 'other'}`}
                        >
                          {r.code}
                        </span>
                        {r.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="panel doc__section">
        <h2>Trail stages — endpoints</h2>
        <p className="doc__section-intro muted">
          Rotas para cadastrar e gerenciar stages de trilhas pedagógicas.
        </p>

        <div className="doc__endpoints">
          {TRAIL_STAGE_ENDPOINTS.map((ep) => (
            <details key={ep.id} className="doc-endpoint">
              <summary className="doc-endpoint__summary">
                <span
                  className={`doc-method doc-method--${ep.method.toLowerCase()}`}
                >
                  {ep.method}
                </span>
                <code className="doc-endpoint__path">{ep.path}</code>
                <span className="doc-endpoint__title">{ep.title}</span>
                {ep.auth ? (
                  <span
                    className="doc-endpoint__lock"
                    title="Pode exigir autenticação"
                    aria-label="Autenticação"
                  >
                    <LockIcon />
                  </span>
                ) : null}
              </summary>

              <div className="doc-endpoint__body">
                <p className="doc-endpoint__desc">{ep.description}</p>

                <p className="doc-endpoint__fullurl">
                  <span className="muted">URL completa de exemplo:</span>{' '}
                  <code>
                    {ep.method} {baseUrl}
                    {ep.path.replace('{id}', '{id}')}
                  </code>
                </p>

                {ep.pathParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Parâmetros de path</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.pathParams.map((p) => (
                          <tr key={p.name}>
                            <td>
                              <code>{p.name}</code>
                            </td>
                            <td>{p.type}</td>
                            <td>{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.queryParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Query</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.queryParams.map((q) => (
                          <tr key={q.name}>
                            <td>
                              <code>{q.name}</code>
                            </td>
                            <td>{q.type}</td>
                            <td>{q.required ? 'Sim' : 'Não'}</td>
                            <td>{q.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.bodyFields?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Corpo da requisição (JSON)</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Campo</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.bodyFields.map((f) => (
                          <tr key={f.name}>
                            <td>
                              <code>{f.name}</code>
                            </td>
                            <td>{f.type}</td>
                            <td>{f.required ? 'Sim' : 'Não'}</td>
                            <td>{f.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div className="doc-block">
                  <h3 className="doc-block__title">Respostas</h3>
                  <ul className="doc-responses">
                    {ep.responses.map((r) => (
                      <li key={r.code}>
                        <span
                          className={`doc-code doc-code--${r.code.startsWith('2') ? 'ok' : r.code.startsWith('4') ? 'client' : 'other'}`}
                        >
                          {r.code}
                        </span>
                        {r.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="panel doc__section">
        <h2>Trail stage questions — endpoints</h2>
        <p className="doc__section-intro muted">
          Collection <code>trail_stage_questions</code>: só o conteúdo sequencial das
          etapas (título, texto, correção quando o stage for exercício). Comportamento (
          <code>stage_type</code>, <code>prompt</code>) fica em <code>trail_stages</code>.
          A API valida contra o <code>stage_type</code> do stage referenciado.
        </p>

        <div className="doc__endpoints">
          {TRAIL_STAGE_QUESTION_ENDPOINTS.map((ep) => (
            <details key={ep.id} className="doc-endpoint">
              <summary className="doc-endpoint__summary">
                <span
                  className={`doc-method doc-method--${ep.method.toLowerCase()}`}
                >
                  {ep.method}
                </span>
                <code className="doc-endpoint__path">{ep.path}</code>
                <span className="doc-endpoint__title">{ep.title}</span>
                {ep.auth ? (
                  <span
                    className="doc-endpoint__lock"
                    title="Pode exigir autenticação"
                    aria-label="Autenticação"
                  >
                    <LockIcon />
                  </span>
                ) : null}
              </summary>

              <div className="doc-endpoint__body">
                <p className="doc-endpoint__desc">{ep.description}</p>

                <p className="doc-endpoint__fullurl">
                  <span className="muted">URL completa de exemplo:</span>{' '}
                  <code>
                    {ep.method} {baseUrl}
                    {ep.path.replace('{id}', '{id}')}
                  </code>
                </p>

                {ep.pathParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Parâmetros de path</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.pathParams.map((p) => (
                          <tr key={p.name}>
                            <td>
                              <code>{p.name}</code>
                            </td>
                            <td>{p.type}</td>
                            <td>{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.queryParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Query</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.queryParams.map((q) => (
                          <tr key={q.name}>
                            <td>
                              <code>{q.name}</code>
                            </td>
                            <td>{q.type}</td>
                            <td>{q.required ? 'Sim' : 'Não'}</td>
                            <td>{q.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.bodyFields?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Corpo da requisição (JSON)</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Campo</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.bodyFields.map((f) => (
                          <tr key={f.name}>
                            <td>
                              <code>{f.name}</code>
                            </td>
                            <td>{f.type}</td>
                            <td>{f.required ? 'Sim' : 'Não'}</td>
                            <td>
                              {f.description}
                              {f.example ? (
                                <span className="doc-example">
                                  {' '}
                                  Ex.: <code>{f.example}</code>
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ep.bodyExample ? (
                      <pre className="doc-pre" tabIndex={0}>
                        <code>{ep.bodyExample}</code>
                      </pre>
                    ) : null}
                  </div>
                ) : null}

                <div className="doc-block">
                  <h3 className="doc-block__title">Respostas</h3>
                  <ul className="doc-responses">
                    {ep.responses.map((r) => (
                      <li key={r.code}>
                        <span
                          className={`doc-code doc-code--${r.code.startsWith('2') ? 'ok' : r.code.startsWith('4') ? 'client' : 'other'}`}
                        >
                          {r.code}
                        </span>
                        {r.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="panel doc__section">
        <h2>Student trails — endpoints</h2>
        <p className="doc__section-intro muted">
          Collection <code>student_trails</code>: estado atual do aluno em cada trilha
          pedagógica (stage, questão e status). Esta collection é a fonte de verdade
          para o player saber onde continuar a jornada — o histórico detalhado de
          conversa/exercícios fica em outras collections.
        </p>

        <div className="doc__endpoints">
          {STUDENT_TRAIL_ENDPOINTS.map((ep) => (
            <details key={ep.id} className="doc-endpoint">
              <summary className="doc-endpoint__summary">
                <span
                  className={`doc-method doc-method--${ep.method.toLowerCase()}`}
                >
                  {ep.method}
                </span>
                <code className="doc-endpoint__path">{ep.path}</code>
                <span className="doc-endpoint__title">{ep.title}</span>
                {ep.auth ? (
                  <span
                    className="doc-endpoint__lock"
                    title="Pode exigir autenticação"
                    aria-label="Autenticação"
                  >
                    <LockIcon />
                  </span>
                ) : null}
              </summary>

              <div className="doc-endpoint__body">
                <p className="doc-endpoint__desc">{ep.description}</p>

                <p className="doc-endpoint__fullurl">
                  <span className="muted">URL completa de exemplo:</span>{' '}
                  <code>
                    {ep.method} {baseUrl}
                    {ep.path.replace('{id}', '{id}')}
                  </code>
                </p>

                {ep.pathParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Parâmetros de path</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.pathParams.map((p) => (
                          <tr key={p.name}>
                            <td>
                              <code>{p.name}</code>
                            </td>
                            <td>{p.type}</td>
                            <td>{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.queryParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Query</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.queryParams.map((q) => (
                          <tr key={q.name}>
                            <td>
                              <code>{q.name}</code>
                            </td>
                            <td>{q.type}</td>
                            <td>{q.required ? 'Sim' : 'Não'}</td>
                            <td>{q.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.bodyFields?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Corpo da requisição (JSON)</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Campo</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.bodyFields.map((f) => (
                          <tr key={f.name}>
                            <td>
                              <code>{f.name}</code>
                            </td>
                            <td>{f.type}</td>
                            <td>{f.required ? 'Sim' : 'Não'}</td>
                            <td>
                              {f.description}
                              {f.example ? (
                                <span className="doc-example">
                                  {' '}
                                  Ex.: <code>{f.example}</code>
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div className="doc-block">
                  <h3 className="doc-block__title">Respostas</h3>
                  <ul className="doc-responses">
                    {ep.responses.map((r) => (
                      <li key={r.code}>
                        <span
                          className={`doc-code doc-code--${r.code.startsWith('2') ? 'ok' : r.code.startsWith('4') ? 'client' : 'other'}`}
                        >
                          {r.code}
                        </span>
                        {r.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="panel doc__section">
        <h2>Conversation logs — endpoints</h2>
        <p className="doc__section-intro muted">
          Collection <code>conversation_logs</code>: histórico imutável das interações
          de sessão do aluno (mensagens enviadas/recebidas, stage,
          questão e metadados). Esta collection não guarda o estado atual da trilha —
          apenas o histórico, para auditoria, debug e análises.
        </p>

        <div className="doc__endpoints">
          {CONVERSATION_LOG_ENDPOINTS.map((ep) => (
            <details key={ep.id} className="doc-endpoint">
              <summary className="doc-endpoint__summary">
                <span
                  className={`doc-method doc-method--${ep.method.toLowerCase()}`}
                >
                  {ep.method}
                </span>
                <code className="doc-endpoint__path">{ep.path}</code>
                <span className="doc-endpoint__title">{ep.title}</span>
                {ep.auth ? (
                  <span
                    className="doc-endpoint__lock"
                    title="Pode exigir autenticação"
                    aria-label="Autenticação"
                  >
                    <LockIcon />
                  </span>
                ) : null}
              </summary>

              <div className="doc-endpoint__body">
                <p className="doc-endpoint__desc">{ep.description}</p>

                <p className="doc-endpoint__fullurl">
                  <span className="muted">URL completa de exemplo:</span>{' '}
                  <code>
                    {ep.method} {baseUrl}
                    {ep.path.replace('{id}', '{id}')}
                  </code>
                </p>

                {ep.pathParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Parâmetros de path</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.pathParams.map((p) => (
                          <tr key={p.name}>
                            <td>
                              <code>{p.name}</code>
                            </td>
                            <td>{p.type}</td>
                            <td>{p.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.queryParams?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Query</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.queryParams.map((q) => (
                          <tr key={q.name}>
                            <td>
                              <code>{q.name}</code>
                            </td>
                            <td>{q.type}</td>
                            <td>{q.required ? 'Sim' : 'Não'}</td>
                            <td>{q.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {ep.bodyFields?.length ? (
                  <div className="doc-block">
                    <h3 className="doc-block__title">Corpo da requisição (JSON)</h3>
                    <table className="doc-table">
                      <thead>
                        <tr>
                          <th>Campo</th>
                          <th>Tipo</th>
                          <th>Obrigatório</th>
                          <th>Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ep.bodyFields.map((f) => (
                          <tr key={f.name}>
                            <td>
                              <code>{f.name}</code>
                            </td>
                            <td>{f.type}</td>
                            <td>{f.required ? 'Sim' : 'Não'}</td>
                            <td>
                              {f.description}
                              {f.example ? (
                                <span className="doc-example">
                                  {' '}
                                  Ex.: <code>{f.example}</code>
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ep.bodyExample ? (
                      <pre className="doc-pre" tabIndex={0}>
                        <code>{ep.bodyExample}</code>
                      </pre>
                    ) : null}
                  </div>
                ) : null}

                <div className="doc-block">
                  <h3 className="doc-block__title">Respostas</h3>
                  <ul className="doc-responses">
                    {ep.responses.map((r) => (
                      <li key={r.code}>
                        <span
                          className={`doc-code doc-code--${r.code.startsWith('2') ? 'ok' : r.code.startsWith('4') ? 'client' : 'other'}`}
                        >
                          {r.code}
                        </span>
                        {r.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>
    </>
  )
}

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

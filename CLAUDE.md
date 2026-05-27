# MEUDOC.APP — Contexto do Projeto

## O que é
Assistente de documentos brasileiro. Não é só cofre de documentos — é um guia completo de burocracia. Organiza documentos, alerta vencimentos e orienta o usuário passo a passo para tirar ou renovar qualquer documento brasileiro.

## Público-alvo
Mulheres 25-40 anos que gerenciam documentos da família inteira (marido, filhos, pais idosos).

## Modelo de negócio
- **Grátis:** armazenamento de documentos + alertas de vencimento
- **Premium:** assistente IA que guia na burocracia (como tirar/renovar cada documento)

---

## Stack Técnica

### Frontend
- HTML/CSS/JS puro (sem framework)
- Fontes: Sora (títulos) + DM Sans (corpo) via Google Fonts
- Identidade visual: Navy #0B1F3A, Laranja #F76E2A, Azul #1560BD

### Backend / Banco de dados
- **Supabase**
  - URL: `https://gwepkpbtcwvgxfgqhymb.supabase.co`
  - Chave pública: `sb_publishable_0NiRNQMNyhdaX4LDEwNq8A_QkWpzM8J`
  - ⚠️ NUNCA usar a chave secreta no frontend
  - RLS ativado em todas as tabelas

### Deploy
- **Vercel**
  - URL de produção: `meudoc-app.vercel.app`
  - Deploy automático: push no GitHub → Vercel atualiza sozinho
  - Sem configuração adicional necessária

### Repositório
- **GitHub:** `emanuelcontatocomercial1-sys/Meudoc.app`
- Branch principal: `main`

### IA / OCR
- **Anthropic API** — modelo `claude-sonnet-4-20250514`
- Uso: OCR de documentos (foto → extração automática de dados)
- Status: créditos pendentes — implementação estruturada, aguardando ativação

---

## Estrutura de Arquivos

```
Meudoc.app/
├── index.html          # Landing page principal
├── login.html          # Autenticação (Supabase Auth) ✅
├── dashboard.html      # Painel principal com dados reais ✅
├── documentos.html     # CRUD de documentos + OCR ✅
├── alertas.html        # Central de alertas automáticos ✅
├── perfil.html         # Perfil do usuário (pendente Supabase)
├── agendamentos.html   # Agendamentos (pendente Supabase)
├── waitlist.html       # Landing page de pré-lançamento ✅
└── api/
    └── chat.js         # Endpoint do assistente IA
```

---

## Tabelas Supabase

### `profiles`
| Campo | Tipo |
|-------|------|
| id | uuid (FK auth.users) |
| nome | text |
| sobrenome | text |
| email | text |
| telefone | text |
| cpf | text |
| data_nascimento | date |
| cep | text |
| cidade | text |
| estado | text |
| endereco | text |
| plano | text |
| created_at | timestamptz |

### `documentos`
| Campo | Tipo |
|-------|------|
| id | uuid |
| user_id | uuid (FK profiles) |
| nome | text |
| tipo | text |
| categoria | text |
| numero | text |
| orgao_emissor | text |
| data_emissao | date |
| data_vencimento | date |
| observacoes | text |
| created_at | timestamptz |

### `alertas`
| Campo | Tipo |
|-------|------|
| id | uuid |
| user_id | uuid |
| documento_id | uuid |
| titulo | text |
| descricao | text |
| tipo | text |
| lido | boolean |
| created_at | timestamptz |

### `agendamentos`
| Campo | Tipo |
|-------|------|
| id | uuid |
| user_id | uuid |
| orgao | text |
| servico | text |
| data_agendamento | date |
| horario | text |
| local | text |
| protocolo | text |
| status | text |
| created_at | timestamptz |

### `waitlist`
| Campo | Tipo |
|-------|------|
| id | uuid |
| email | text (unique) |
| created_at | timestamptz |

---

## Status das Páginas

| Página | Status | Observação |
|--------|--------|------------|
| `login.html` | ✅ Funcionando | Auth real Supabase |
| `dashboard.html` | ✅ Funcionando | Dados reais do usuário |
| `documentos.html` | ✅ Funcionando | CRUD + OCR estruturado |
| `alertas.html` | ✅ Funcionando | Alertas automáticos por vencimento |
| `waitlist.html` | ✅ Funcionando | Captura e-mails no Supabase |
| `perfil.html` | ⏳ Pendente | Precisa conectar ao Supabase |
| `agendamentos.html` | ⏳ Pendente | Precisa conectar ao Supabase |
| `index.html` | ⏳ Revisar | Landing page principal |

---

## O que falta para o MVP completo

1. **`perfil.html`** — conectar ao Supabase (salvar nome, CPF, cidade, etc.)
2. **`agendamentos.html`** — conectar ao Supabase (CRUD real)
3. **Créditos Anthropic** — ativar OCR por foto
4. **Alertas por e-mail** — integrar Resend ou SendGrid
5. **Domínio próprio** — conectar `meudoc.app` no Vercel

---

## Regras de desenvolvimento

- Sempre verificar sessão Supabase no topo de cada página protegida
- Redirecionar para `login.html` se não houver sessão ativa
- Nunca expor chave secreta do Supabase no frontend
- Manter identidade visual consistente (cores, fontes, componentes)
- Testar no mobile antes de considerar pronto (público principal usa celular)
- Confirmar com Emanuel antes de mudar arquitetura ou stack

---

## Identidade Visual

```css
--navy:    #0B1F3A  /* fundo principal */
--orange:  #F76E2A  /* destaque / CTA */
--blue:    #1560BD  /* links / info */
--sky:     #E8F2FF  /* fundo claro */
--green:   #00B37E  /* sucesso */
--red:     #E53935  /* erro / urgente */
--white:   #FFFFFF
--off:     #F7F9FC  /* fundo pages */
--gray:    #8A99B0  /* textos secundários */
```

Fontes: `Sora` (títulos, peso 700-900) + `DM Sans` (corpo, peso 300-500)

---

## Tagline
> "Seus documentos. Sempre em dia."

## Instagram
- Handle: `@meudocapp`
- Link da bio: `meudoc-app.vercel.app/waitlist`
- 3 carrosséis criados e prontos para postar

---

## Contato do projeto
- Desenvolvedor: Emanuel Silva
- GitHub: `emanuelcontatocomercial1-sys`

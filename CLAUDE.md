# MCP Hub Aziendale — MVP Implementation Guide

## Obiettivo

Costruire un MCP Gateway multi-tenant aziendale che centralizza il contesto di ogni progetto cliente e lo espone ai tool AI (Claude, Cursor, Copilot) tramite protocollo MCP. Un singolo NestJS server serve risorse MCP dinamiche per progetto, un pannello Next.js permette ai team leader di gestire tutto.

---

## Stack Tecnologico

| Componente | Tecnologia | Versione |
|---|---|---|
| Backend / MCP Server | NestJS | 11 |
| Frontend Admin | Next.js + shadcn/ui + Tailwind | 15 |
| ORM | TypeORM | latest |
| Database | PostgreSQL | 16 |
| MCP SDK | @modelcontextprotocol/sdk | latest |
| Infra | Docker Compose | v2 |
| Auth MVP | Mock middleware (predisposto per Azure AD) | - |
| Package Manager | pnpm | latest |

---

## Struttura Monorepo

```
mcp-hub/
├── apps/
│   ├── gateway/                    # NestJS 11 — API REST + MCP Server
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── entities/
│   │   │   │   ├── project.entity.ts
│   │   │   │   ├── document.entity.ts
│   │   │   │   ├── project-tool.entity.ts
│   │   │   │   ├── project-prompt.entity.ts
│   │   │   │   ├── user.entity.ts
│   │   │   │   ├── project-member.entity.ts
│   │   │   │   └── audit-log.entity.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── mock-auth.guard.ts       # Guard che legge X-Mock-User-Email
│   │   │   │   │   ├── roles.guard.ts           # Guard basato su ruoli
│   │   │   │   │   ├── roles.decorator.ts       # @Roles('team_leader', 'admin')
│   │   │   │   │   └── current-user.decorator.ts # @CurrentUser() decorator
│   │   │   │   ├── project/
│   │   │   │   │   ├── project.module.ts
│   │   │   │   │   ├── project.controller.ts
│   │   │   │   │   ├── project.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── create-project.dto.ts
│   │   │   │   │       └── update-project.dto.ts
│   │   │   │   ├── document/
│   │   │   │   │   ├── document.module.ts
│   │   │   │   │   ├── document.controller.ts
│   │   │   │   │   ├── document.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── create-document.dto.ts
│   │   │   │   │       └── update-document.dto.ts
│   │   │   │   ├── tool/
│   │   │   │   │   ├── tool.module.ts
│   │   │   │   │   ├── tool.controller.ts
│   │   │   │   │   ├── tool.service.ts
│   │   │   │   │   ├── handlers/
│   │   │   │   │   │   ├── tool-handler.interface.ts
│   │   │   │   │   │   ├── http-proxy.handler.ts
│   │   │   │   │   │   └── static-response.handler.ts
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── create-tool.dto.ts
│   │   │   │   │       └── update-tool.dto.ts
│   │   │   │   ├── prompt/
│   │   │   │   │   ├── prompt.module.ts
│   │   │   │   │   ├── prompt.controller.ts
│   │   │   │   │   ├── prompt.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── create-prompt.dto.ts
│   │   │   │   │       └── update-prompt.dto.ts
│   │   │   │   ├── member/
│   │   │   │   │   ├── member.module.ts
│   │   │   │   │   ├── member.controller.ts
│   │   │   │   │   ├── member.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   │       └── add-member.dto.ts
│   │   │   │   └── audit/
│   │   │   │       ├── audit.module.ts
│   │   │   │       ├── audit.service.ts
│   │   │   │       └── audit.controller.ts
│   │   │   ├── mcp/
│   │   │   │   ├── mcp.module.ts
│   │   │   │   ├── mcp-server.service.ts         # Core MCP logic
│   │   │   │   ├── mcp-sse.controller.ts          # SSE transport endpoint
│   │   │   │   ├── mcp-stdio.ts                   # Stdio entrypoint (separate bin)
│   │   │   │   ├── resource-provider.service.ts    # Serve documenti come MCP Resources
│   │   │   │   ├── tool-provider.service.ts        # Serve tools come MCP Tools
│   │   │   │   └── prompt-provider.service.ts      # Serve prompts come MCP Prompts
│   │   │   ├── common/
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts
│   │   │   │   └── interceptors/
│   │   │   │       └── audit.interceptor.ts        # Intercetta e logga automaticamente
│   │   │   └── config/
│   │   │       ├── database.config.ts
│   │   │       └── app.config.ts
│   │   ├── Dockerfile
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   └── package.json
│   │
│   └── admin/                      # Next.js 15 — Admin Panel
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── (auth)/
│       │   │   └── login/
│       │   │       └── page.tsx              # Mock login: dropdown selezione utente
│       │   └── (dashboard)/
│       │       ├── layout.tsx                # Sidebar + header layout
│       │       ├── page.tsx                  # Dashboard: lista progetti
│       │       └── projects/
│       │           ├── new/
│       │           │   └── page.tsx          # Form creazione progetto
│       │           └── [slug]/
│       │               ├── page.tsx          # Overview progetto
│       │               ├── documents/
│       │               │   └── page.tsx      # Lista + editor markdown
│       │               ├── tools/
│       │               │   └── page.tsx      # Lista + form tool
│       │               ├── prompts/
│       │               │   └── page.tsx      # Lista + editor template
│       │               ├── members/
│       │               │   └── page.tsx      # Gestione membri
│       │               └── audit/
│       │                   └── page.tsx      # Audit log viewer
│       ├── components/
│       │   ├── ui/                           # shadcn/ui components
│       │   ├── layout/
│       │   │   ├── sidebar.tsx
│       │   │   └── header.tsx
│       │   ├── projects/
│       │   │   ├── project-card.tsx
│       │   │   └── project-form.tsx
│       │   ├── documents/
│       │   │   ├── document-list.tsx
│       │   │   └── markdown-editor.tsx
│       │   ├── tools/
│       │   │   ├── tool-list.tsx
│       │   │   └── tool-form.tsx
│       │   ├── prompts/
│       │   │   ├── prompt-list.tsx
│       │   │   └── prompt-editor.tsx
│       │   └── members/
│       │       └── member-list.tsx
│       ├── lib/
│       │   ├── api.ts                        # Fetch wrapper verso Gateway
│       │   └── auth.ts                       # Mock session helpers
│       ├── Dockerfile
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── docker-compose.yml
├── .env.example
├── pnpm-workspace.yaml
├── package.json                              # Root workspace config
└── README.md
```

---

## Data Model — TypeORM Entities

### Project

```typescript
// apps/gateway/src/entities/project.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

export enum ProjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 500, nullable: true })
  mcpEndpointUrl: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => Document, (doc) => doc.project)
  documents: Document[];

  @OneToMany(() => ProjectTool, (tool) => tool.project)
  tools: ProjectTool[];

  @OneToMany(() => ProjectPrompt, (prompt) => prompt.project)
  prompts: ProjectPrompt[];

  @OneToMany(() => ProjectMember, (member) => member.project)
  members: ProjectMember[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Document

```typescript
// apps/gateway/src/entities/document.entity.ts
export enum DocumentCategory {
  ARCHITECTURE = 'architecture',
  API = 'api',
  CONVENTION = 'convention',
  README = 'readme',
  OTHER = 'other',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 100 })
  slug: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: DocumentCategory, default: DocumentCategory.OTHER })
  category: DocumentCategory;

  @Column({ type: 'int', default: 1 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### ProjectTool

```typescript
// apps/gateway/src/entities/project-tool.entity.ts
export enum HandlerType {
  HTTP_PROXY = 'http_proxy',
  STATIC_RESPONSE = 'static_response',
}

@Entity('project_tools')
export class ProjectTool {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.tools, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  inputSchema: Record<string, any>;

  @Column({ type: 'enum', enum: HandlerType, default: HandlerType.STATIC_RESPONSE })
  handlerType: HandlerType;

  @Column({ type: 'jsonb', default: {} })
  handlerConfig: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### ProjectPrompt

```typescript
// apps/gateway/src/entities/project-prompt.entity.ts
@Entity('project_prompts')
export class ProjectPrompt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.prompts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  template: string;

  @Column({ type: 'jsonb', default: [] })
  arguments: Array<{ name: string; description: string; required: boolean }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### User

```typescript
// apps/gateway/src/entities/user.entity.ts
export enum UserRole {
  ADMIN = 'admin',
  TEAM_LEADER = 'team_leader',
  DEVELOPER = 'developer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 255 })
  displayName: string;

  @Column({ length: 255, nullable: true })
  azureOid: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.DEVELOPER })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;
}
```

### ProjectMember

```typescript
// apps/gateway/src/entities/project-member.entity.ts
export enum MemberRole {
  OWNER = 'owner',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

@Entity('project_members')
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  projectId: string;

  @ManyToOne(() => Project, (project) => project.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: MemberRole, default: MemberRole.MEMBER })
  role: MemberRole;

  @CreateDateColumn()
  createdAt: Date;
}
```

### AuditLog

```typescript
// apps/gateway/src/entities/audit-log.entity.ts
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  projectId: string;

  @Column({ length: 100 })
  action: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;
}
```

---

## API REST — Specifiche Complete

Tutti gli endpoint sono sotto il prefisso `/api`. Tutte le risposte sono JSON. L'autenticazione è via header `X-Mock-User-Email`.

### Projects

```
GET    /api/projects                → Lista progetti accessibili dall'utente
GET    /api/projects/:slug          → Dettaglio progetto (con conteggi docs/tools/prompts)
POST   /api/projects                → Crea progetto (body: { name, slug, description })
PUT    /api/projects/:slug          → Aggiorna progetto
DELETE /api/projects/:slug          → Soft delete (isActive = false)
```

Il service deve verificare che l'utente sia membro del progetto (o admin) per GET, e owner per PUT/DELETE. POST auto-crea una membership con ruolo `owner`.

### Documents

```
GET    /api/projects/:slug/documents              → Lista documenti del progetto
GET    /api/projects/:slug/documents/:docSlug      → Singolo documento con contenuto
POST   /api/projects/:slug/documents               → Crea documento (body: { title, slug, content, category })
PUT    /api/projects/:slug/documents/:docSlug       → Aggiorna (incrementa version automaticamente)
DELETE /api/projects/:slug/documents/:docSlug       → Elimina documento
```

### Tools

```
GET    /api/projects/:slug/tools                → Lista tools
GET    /api/projects/:slug/tools/:toolId        → Singolo tool
POST   /api/projects/:slug/tools                → Crea tool (body: { name, description, inputSchema, handlerType, handlerConfig })
PUT    /api/projects/:slug/tools/:toolId        → Aggiorna tool
DELETE /api/projects/:slug/tools/:toolId        → Elimina tool
```

### Prompts

```
GET    /api/projects/:slug/prompts              → Lista prompts
GET    /api/projects/:slug/prompts/:promptId    → Singolo prompt
POST   /api/projects/:slug/prompts              → Crea prompt (body: { name, description, template, arguments })
PUT    /api/projects/:slug/prompts/:promptId    → Aggiorna prompt
DELETE /api/projects/:slug/prompts/:promptId    → Elimina prompt
```

### Members

```
GET    /api/projects/:slug/members              → Lista membri con user info
POST   /api/projects/:slug/members              → Aggiungi membro (body: { email, role })
PUT    /api/projects/:slug/members/:userId      → Cambia ruolo
DELETE /api/projects/:slug/members/:userId       → Rimuovi membro
```

### Audit

```
GET    /api/projects/:slug/audit                → Log paginato (query: ?page=1&limit=50)
GET    /api/audit                                → Log globale (solo admin)
```

### Users (utility)

```
GET    /api/users/me                            → Profilo utente corrente
GET    /api/users                               → Lista utenti (per autocomplete membri)
```

---

## Mock Auth — Implementazione

### MockAuthGuard

```typescript
// apps/gateway/src/modules/auth/mock-auth.guard.ts
// Questo guard:
// 1. Legge header "X-Mock-User-Email" dalla request
// 2. Cerca l'utente nel DB per email
// 3. Se non trovato → 401 Unauthorized
// 4. Se trovato → inietta user nella request (request.user = userEntity)
// 5. È registrato come APP_GUARD globale nell'AuthModule
```

### RolesGuard

```typescript
// apps/gateway/src/modules/auth/roles.guard.ts
// Questo guard:
// 1. Legge i ruoli richiesti dal decorator @Roles()
// 2. Per ruoli globali (admin, team_leader): controlla user.role
// 3. Per ruoli di progetto (owner, member, viewer): cerca ProjectMember per user+project
// 4. Il project slug viene preso da request.params.slug
```

### Decorator CurrentUser

```typescript
// apps/gateway/src/modules/auth/current-user.decorator.ts
// createParamDecorator che restituisce request.user
// Uso: @CurrentUser() user: User nei controller
```

### Seed Data

All'avvio, se la tabella users è vuota, il seed crea automaticamente:

```typescript
const seedUsers = [
  { email: 'admin@mcphub.local', displayName: 'Admin User', role: UserRole.ADMIN },
  { email: 'leader@mcphub.local', displayName: 'Team Leader', role: UserRole.TEAM_LEADER },
  { email: 'dev@mcphub.local', displayName: 'Developer', role: UserRole.DEVELOPER },
];
```

---

## MCP Server — Implementazione Core

### Architettura

Il modulo `mcp/` è il cuore del sistema. Usa `@modelcontextprotocol/sdk` per implementare il protocollo MCP completo.

### MCP Server Service

```typescript
// apps/gateway/src/mcp/mcp-server.service.ts
// Questo service:
// 1. Crea un'istanza McpServer dalla SDK
// 2. Registra handler per:
//    - listResources → chiama ResourceProvider
//    - readResource  → chiama ResourceProvider
//    - listTools     → chiama ToolProvider
//    - callTool      → chiama ToolProvider
//    - listPrompts   → chiama PromptProvider
//    - getPrompt     → chiama PromptProvider
// 3. Il projectSlug viene determinato dal contesto di sessione
// 4. Se nessun progetto selezionato, espone meta-tools:
//    - "list-my-projects": lista i progetti accessibili dall'utente
//    - "select-project": imposta il progetto corrente per la sessione
```

### Resource Provider

```typescript
// apps/gateway/src/mcp/resource-provider.service.ts
// - listResources(projectSlug): query DB → documenti del progetto
//   Ritorna array di { uri: "mcphub://projects/{slug}/docs/{docSlug}", name, description, mimeType: "text/markdown" }
// - readResource(uri): parse URI → trova documento → ritorna content markdown
```

### Tool Provider

```typescript
// apps/gateway/src/mcp/tool-provider.service.ts
// - listTools(projectSlug): query DB → project_tools del progetto
//   Ritorna array di { name, description, inputSchema }
// - callTool(projectSlug, toolName, args):
//   1. Trova ProjectTool nel DB
//   2. In base a handlerType:
//      - HTTP_PROXY: fetch verso handlerConfig.url con method/headers/body da config
//      - STATIC_RESPONSE: ritorna handlerConfig.response direttamente
//   3. Logga l'invocazione nell'AuditLog
```

### Prompt Provider

```typescript
// apps/gateway/src/mcp/prompt-provider.service.ts
// - listPrompts(projectSlug): query DB → project_prompts del progetto
//   Ritorna array di { name, description, arguments }
// - getPrompt(projectSlug, promptName, args):
//   1. Trova ProjectPrompt nel DB
//   2. Sostituisce {{placeholder}} nel template con i valori da args
//   3. Ritorna il prompt compilato come messages array MCP
```

### SSE Transport Controller

```typescript
// apps/gateway/src/mcp/mcp-sse.controller.ts
// Endpoint: GET /mcp/sse?project={slug}
// 1. Autentica utente (stesso mock auth via header)
// 2. Verifica accesso al progetto
// 3. Crea una sessione SSE con SSEServerTransport dalla SDK
// 4. Collega il transport al McpServer
// 5. Il projectSlug viene passato nel contesto di sessione

// Endpoint: POST /mcp/messages
// Riceve i messaggi dal client MCP e li smista alla sessione corretta
```

### Stdio Entrypoint

```typescript
// apps/gateway/src/mcp/mcp-stdio.ts
// Entrypoint separato (non parte del NestJS HTTP server)
// Avviabile con: node dist/mcp/mcp-stdio.js --project=<slug> --user=<email>
// 1. Legge args da CLI
// 2. Crea StdioServerTransport dalla SDK
// 3. Bootstrappa un mini-contesto NestJS (solo DB + services necessari)
// 4. Collega il transport al McpServer con progetto fisso
```

---

## Admin Panel — Next.js Specifiche

### Configurazione

- Next.js 15 con App Router
- shadcn/ui per i componenti UI
- Tailwind CSS per styling
- Fetch API verso `http://gateway:3001/api` (configurabile via env)

### Autenticazione Mock

La pagina `/login` mostra un dropdown con gli utenti seed. La selezione salva l'email in un cookie `mock-user-email`. Il layout wrapper legge questo cookie e lo passa come header `X-Mock-User-Email` in tutte le fetch verso il gateway.

### API Client

```typescript
// apps/admin/lib/api.ts
// Wrapper fetch che:
// 1. Legge il cookie mock-user-email
// 2. Aggiunge header X-Mock-User-Email
// 3. Prefissa tutte le URL con GATEWAY_URL
// 4. Gestisce errori 401 → redirect a /login
```

### Pagine

**Dashboard (`/`)**: Griglia di card progetto. Ogni card mostra: nome, slug, conteggio docs/tools/prompts, stato active/inactive, data ultimo aggiornamento. Bottone "Nuovo Progetto". Filtro per stato.

**Nuovo Progetto (`/projects/new`)**: Form con campi: nome (auto-genera slug), descrizione. Submit chiama POST /api/projects. Redirect a dettaglio progetto.

**Dettaglio Progetto (`/projects/[slug]`)**: Layout con tab navigation: Overview, Documents, Tools, Prompts, Members, Audit. Overview mostra stats riassuntive e info MCP connection (endpoint SSE da copiare, configurazione stdio).

**Documents Tab**: Tabella documenti con colonne: titolo, categoria, versione, ultima modifica. Bottone "Aggiungi Documento". Click su riga → editor markdown a schermo pieno (usa un textarea con preview markdown, oppure un componente react-markdown). Salvataggio chiama PUT.

**Tools Tab**: Tabella tools con colonne: nome, handler type, descrizione. Bottone "Aggiungi Tool". Form modale: nome, descrizione, handler type (dropdown), input schema (JSON editor/textarea), handler config (JSON editor/textarea).

**Prompts Tab**: Tabella prompts. Form modale con: nome, descrizione, template (textarea grande), arguments (editor array di oggetti { name, description, required }).

**Members Tab**: Tabella membri con colonne: nome, email, ruolo, data aggiunta. Bottone "Aggiungi Membro" con autocomplete email. Dropdown inline per cambiare ruolo. Bottone rimuovi.

**Audit Tab**: Tabella cronologica: timestamp, utente, azione, metadata (JSON espandibile). Paginazione.

---

## Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mcphub
      POSTGRES_USER: mcphub
      POSTGRES_PASSWORD: mcphub_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mcphub"]
      interval: 5s
      timeout: 5s
      retries: 5

  gateway:
    build:
      context: .
      dockerfile: apps/gateway/Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      DATABASE_NAME: mcphub
      DATABASE_USER: mcphub
      DATABASE_PASSWORD: mcphub_dev
      PORT: 3001
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./apps/gateway/src:/app/src  # Hot reload in dev

  admin:
    build:
      context: .
      dockerfile: apps/admin/Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_GATEWAY_URL: http://localhost:3001
    depends_on:
      - gateway

volumes:
  pgdata:
```

---

## Regole di Implementazione

### Generali

1. Usa `class-validator` e `class-transformer` per validazione DTO in NestJS
2. Ogni entity ha `@CreateDateColumn()` e `@UpdateDateColumn()` (tranne AuditLog che ha solo timestamp)
3. Le relazioni OneToMany usano `{ onDelete: 'CASCADE' }` dove appropriato
4. I slug devono essere validati: lowercase, solo lettere/numeri/trattini, regex: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`
5. Errori: usa le built-in NestJS exceptions (NotFoundException, ForbiddenException, ConflictException per slug duplicati)
6. TypeORM synchronize: true nell'MVP (no migrations per semplicità)

### MCP

1. Usa `@modelcontextprotocol/sdk` versione latest — importa `McpServer`, `SSEServerTransport`, `StdioServerTransport`
2. Le URI delle resources seguono il pattern: `mcphub://projects/{projectSlug}/docs/{docSlug}`
3. I nomi dei tools MCP sono prefissati col progetto: `{projectSlug}--{toolName}` per evitare collisioni
4. Il tool speciale `list-my-projects` non è prefissato ed è sempre disponibile quando nessun progetto è selezionato
5. Ogni operazione MCP (read resource, call tool, get prompt) viene loggata nell'AuditLog

### Frontend

1. Usa `fetch` nativo (no axios) nel wrapper `lib/api.ts`
2. Componenti server per le pagine, client components solo dove serve interattività
3. Usa `shadcn/ui` per: Button, Card, Table, Dialog, Input, Textarea, Select, Badge, Tabs, DropdownMenu, Toast
4. Loading states con skeleton/spinner di shadcn
5. Gestione errori con toast notifications

---

## File di Configurazione

### .env.example

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=mcphub
DATABASE_USER=mcphub
DATABASE_PASSWORD=mcphub_dev

# Gateway
PORT=3001

# Admin
NEXT_PUBLIC_GATEWAY_URL=http://localhost:3001
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
```

---

## Comandi di Avvio

```bash
# Primo avvio
pnpm install
docker compose up -d postgres
pnpm --filter gateway run start:dev
pnpm --filter admin run dev

# Oppure tutto con Docker
docker compose up --build

# Test MCP con Claude Desktop — aggiungi a claude_desktop_config.json:
{
  "mcpServers": {
    "mcp-hub": {
      "command": "node",
      "args": ["apps/gateway/dist/mcp/mcp-stdio.js", "--project=demo-project", "--user=dev@mcphub.local"]
    }
  }
}
```

---

## Seed Data per Demo

Al primo avvio, oltre agli utenti, il seed crea un progetto demo:

```typescript
// Progetto demo
const demoProject = {
  name: 'Progetto Demo - E-Commerce',
  slug: 'demo-ecommerce',
  description: 'Progetto dimostrativo per testare MCP Hub',
};

// Documenti demo
const demoDocs = [
  {
    title: 'Architettura Backend',
    slug: 'architettura-backend',
    category: 'architecture',
    content: `# Architettura Backend\n\n## Stack\n- NestJS 11\n- PostgreSQL 16\n- Redis per caching\n\n## Moduli\n- Auth: JWT + refresh token\n- Products: CRUD + search\n- Orders: state machine\n- Payments: Stripe integration\n\n## Convenzioni\n- Controller → Service → Repository pattern\n- DTO validation con class-validator\n- Swagger auto-generato\n`,
  },
  {
    title: 'API Reference',
    slug: 'api-reference',
    category: 'api',
    content: `# API Reference\n\n## Base URL\nhttps://api.demo-ecommerce.internal/v1\n\n## Authentication\nBearer token JWT nel header Authorization.\n\n## Endpoints\n### Products\n- GET /products — Lista prodotti (paginata)\n- GET /products/:id — Dettaglio prodotto\n- POST /products — Crea prodotto (admin)\n\n### Orders\n- POST /orders — Crea ordine\n- GET /orders/:id — Dettaglio ordine\n- PATCH /orders/:id/status — Aggiorna stato\n`,
  },
];

// Tool demo
const demoTool = {
  name: 'get-api-status',
  description: 'Controlla lo stato delle API del progetto e-commerce',
  inputSchema: { type: 'object', properties: {}, required: [] },
  handlerType: HandlerType.STATIC_RESPONSE,
  handlerConfig: { response: { status: 'healthy', uptime: '99.9%', lastDeploy: '2026-03-20T10:00:00Z' } },
};

// Prompt demo
const demoPrompt = {
  name: 'code-review',
  description: 'Template per code review nel contesto del progetto e-commerce',
  template: 'Sei un senior developer che lavora sul progetto demo e-commerce. Fai una code review del seguente codice, considerando le convenzioni del progetto (Controller → Service → Repository, class-validator per DTO, Swagger annotations).\n\nFile: {{filename}}\n\n```{{language}}\n{{code}}\n```\n\nFornisci feedback su: correttezza, aderenza alle convenzioni, performance, sicurezza.',
  arguments: [
    { name: 'filename', description: 'Nome del file in review', required: true },
    { name: 'language', description: 'Linguaggio di programmazione', required: true },
    { name: 'code', description: 'Codice da revieware', required: true },
  ],
};
```

---

## Ordine di Implementazione

Segui questo ordine per minimizzare blocchi e avere feedback incrementale:

### Step 1 — Scaffolding
1. Init monorepo pnpm + workspace
2. `nest new gateway` dentro apps/
3. `npx create-next-app@latest admin` dentro apps/
4. Docker Compose con solo PostgreSQL
5. TypeORM config con connessione a PostgreSQL
6. Tutte le entities (copia dal data model sopra)
7. Verifica: `docker compose up postgres` + `pnpm --filter gateway run start:dev` → tabelle create automaticamente

### Step 2 — Auth Mock
1. Implementa MockAuthGuard, RolesGuard, decorators
2. Registra MockAuthGuard come APP_GUARD globale
3. Crea seed service che popola utenti all'avvio
4. Verifica: `curl -H "X-Mock-User-Email: admin@mcphub.local" http://localhost:3001/api/users/me`

### Step 3 — CRUD Projects + Members
1. ProjectModule con controller/service/DTOs
2. MemberModule con controller/service/DTOs
3. POST /api/projects crea automaticamente la membership owner
4. GET /api/projects filtra per membership dell'utente (admin vede tutto)
5. Verifica: crea progetto, aggiungi membro, verifica permessi

### Step 4 — CRUD Documents, Tools, Prompts
1. DocumentModule — tutti gli endpoint con versioning automatico
2. ToolModule — tutti gli endpoint
3. PromptModule — tutti gli endpoint
4. AuditModule — service per logging, controller per query
5. Audit interceptor globale che logga automaticamente le operazioni
6. Verifica: popola il progetto demo con seed data

### Step 5 — MCP Server
1. Installa `@modelcontextprotocol/sdk`
2. Implementa ResourceProvider, ToolProvider, PromptProvider
3. Implementa McpServerService con tutti gli handler
4. Implementa SSE controller con endpoint /mcp/sse
5. Implementa Stdio entrypoint separato
6. Verifica: configura Claude Desktop con stdio, testa `list-my-projects`, seleziona progetto, leggi documento

### Step 6 — Admin Panel
1. Setup shadcn/ui + Tailwind
2. Implementa mock login
3. Implementa API client wrapper
4. Layout con sidebar
5. Dashboard con lista progetti
6. Form nuovo progetto
7. Pagina dettaglio con tutte le tab
8. Editor markdown per documenti
9. Form per tools e prompts
10. Member management
11. Audit log viewer
12. Verifica: flusso completo da login a creazione progetto con docs/tools/prompts

### Step 7 — Integration Testing
1. Test completo: crea progetto da admin panel → connetti Claude Desktop via stdio → l'AI vede docs/tools/prompts
2. Test SSE con Cursor o Claude Desktop in modalità HTTP
3. Verifica audit log registra tutte le operazioni
4. Seed data demo funzionante out of the box
5. README con istruzioni complete

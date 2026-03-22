import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { Document, DocumentCategory } from '../../entities/document.entity';
import { ProjectTool, HandlerType } from '../../entities/project-tool.entity';
import { ProjectPrompt } from '../../entities/project-prompt.entity';
import { ProjectMember, MemberRole } from '../../entities/project-member.entity';

const seedUsers = [
  { email: 'admin@mcphub.local', displayName: 'Admin User', role: UserRole.ADMIN },
  { email: 'leader@mcphub.local', displayName: 'Team Leader', role: UserRole.TEAM_LEADER },
  { email: 'dev@mcphub.local', displayName: 'Developer', role: UserRole.DEVELOPER },
];

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(ProjectTool)
    private readonly toolRepository: Repository<ProjectTool>,
    @InjectRepository(ProjectPrompt)
    private readonly promptRepository: Repository<ProjectPrompt>,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
  ) {}

  async onApplicationBootstrap() {
    const userCount = await this.userRepository.count();
    if (userCount > 0) {
      return;
    }

    this.logger.log('Seeding database...');

    const users = await this.userRepository.save(seedUsers);
    const admin = users.find((u) => u.role === UserRole.ADMIN)!;
    const leader = users.find((u) => u.role === UserRole.TEAM_LEADER)!;
    const dev = users.find((u) => u.role === UserRole.DEVELOPER)!;
    this.logger.log(`Seeded ${users.length} users`);

    // ── Project 1: SWOP Platform ──
    const swop = await this.projectRepository.save({
      name: 'SWOP — Trading Platform',
      slug: 'swop',
      description: 'Piattaforma di trading multi-asset con matching engine, risk management e settlement in tempo reale.',
      createdById: leader.id,
    });

    await this.memberRepository.save([
      { projectId: swop.id, userId: leader.id, role: MemberRole.OWNER },
      { projectId: swop.id, userId: dev.id, role: MemberRole.MEMBER },
      { projectId: swop.id, userId: admin.id, role: MemberRole.MEMBER },
    ]);

    await this.documentRepository.save([
      {
        projectId: swop.id,
        title: 'Architettura Sistema',
        slug: 'architettura',
        category: DocumentCategory.ARCHITECTURE,
        content: `# Architettura SWOP

## Overview
Sistema di trading multi-asset composto da microservizi event-driven.

## Stack
- **API Gateway**: Kong + custom plugins
- **Order Service**: Go 1.22, gRPC
- **Matching Engine**: Rust, in-memory order book con persistent WAL
- **Risk Engine**: Python 3.12, calcolo margini in real-time
- **Settlement Service**: Java 21, integrazione con clearing house
- **Market Data**: Elixir/OTP, streaming WebSocket
- **Database**: PostgreSQL 16 (orders, positions), TimescaleDB (market data), Redis (cache + pub/sub)
- **Message Broker**: Apache Kafka 3.7, schema registry Avro
- **Infra**: Kubernetes 1.29 su AWS EKS, Terraform

## Flusso Ordine
1. Client → API Gateway → Order Service (validazione)
2. Order Service → Kafka \`orders.new\` → Matching Engine
3. Matching Engine match → Kafka \`trades.executed\`
4. Risk Engine consuma trade → aggiorna margini → Kafka \`risk.margin-call\` (se necessario)
5. Settlement Service consuma trade → T+2 settlement

## Convenzioni
- Tutti i servizi espongono health check su \`/healthz\` e \`/readyz\`
- Logging strutturato JSON (correlationId in ogni log)
- Ogni servizio ha il proprio schema DB, no shared database
- API versioning: \`/v1/\`, \`/v2/\`
- Feature flags via LaunchDarkly
`,
      },
      {
        projectId: swop.id,
        title: 'API Reference — Order Service',
        slug: 'api-orders',
        category: DocumentCategory.API,
        content: `# Order Service API

## Base URL
\`https://api.swop.internal/v1\`

## Authentication
Bearer token JWT (RS256). Scopes richiesti per endpoint.

## Endpoints

### Orders
- \`POST /orders\` — Piazza ordine (scope: \`trading:write\`)
  - Body: \`{ symbol, side: "buy"|"sell", type: "limit"|"market", quantity, price?, timeInForce: "GTC"|"IOC"|"FOK" }\`
  - Response: \`{ orderId, status, createdAt }\`
- \`GET /orders/:id\` — Stato ordine (scope: \`trading:read\`)
- \`DELETE /orders/:id\` — Cancella ordine (scope: \`trading:write\`)
- \`GET /orders?status=open&symbol=AAPL\` — Lista ordini con filtri

### Positions
- \`GET /positions\` — Posizioni aperte (scope: \`portfolio:read\`)
- \`GET /positions/:symbol\` — Dettaglio posizione

### Account
- \`GET /account/balance\` — Saldo disponibile e margine
- \`GET /account/pnl?from=2026-01-01&to=2026-03-22\` — P&L nel periodo

## Rate Limits
- 50 req/s per utente autenticato
- 10 ordini/s per account

## WebSocket
\`wss://ws.swop.internal/v1/stream\`
- Subscribe: \`{ "action": "subscribe", "channels": ["orderbook.AAPL", "trades.AAPL"] }\`
- Heartbeat ogni 30s
`,
      },
      {
        projectId: swop.id,
        title: 'Convenzioni Codice',
        slug: 'convenzioni',
        category: DocumentCategory.CONVENTION,
        content: `# Convenzioni Codice — SWOP

## Go (Order Service)
- Package naming: singolare, lowercase (\`order\`, \`trade\`, non \`orders\`)
- Error handling: wrap con \`fmt.Errorf("op: %w", err)\`, mai panic in production
- Context: sempre primo parametro, propagato ovunque
- Testing: table-driven tests, \`testify/assert\` per assertions
- Protobuf: definizioni in \`/proto\`, generazione con \`buf\`

## Rust (Matching Engine)
- No \`unwrap()\` in production code, usa \`anyhow::Result\`
- Order book: \`BTreeMap<Price, VecDeque<Order>>\` per bid/ask
- Benchmarks obbligatori per hot path (\`criterion\`)

## Python (Risk Engine)
- Type hints ovunque, mypy strict
- Pandas per calcoli batch, numpy per calcoli real-time
- Pydantic v2 per validazione input
- pytest + hypothesis per property-based testing

## Generale
- Commit messages: Conventional Commits (\`feat:\`, \`fix:\`, \`perf:\`)
- PR: almeno 1 approval, CI verde, no force push su main
- Branch naming: \`feat/SWOP-123-descrizione\`, \`fix/SWOP-456-bug\`
- Secrets: mai nel codice, sempre da Vault o env vars
`,
      },
      {
        projectId: swop.id,
        title: 'Runbook Incident Response',
        slug: 'runbook-incidents',
        category: DocumentCategory.OTHER,
        content: `# Runbook — Incident Response

## Severity Levels
- **SEV1**: Trading halt, perdita dati, breach sicurezza → response 5min, war room immediato
- **SEV2**: Degradazione performance >50%, matching delays >100ms → response 15min
- **SEV3**: Feature non funzionante, errori intermittenti → response 1h
- **SEV4**: Cosmetico, logging mancante → next sprint

## Matching Engine Down
1. Verificare pod status: \`kubectl get pods -n matching -l app=matching-engine\`
2. Check WAL corruption: \`kubectl exec -it <pod> -- /app/wal-check\`
3. Se WAL corrotto → restore da ultimo snapshot: \`kubectl apply -f k8s/matching-restore-job.yaml\`
4. Se OOM → scale verticale: \`kubectl patch deploy matching-engine -p '{"spec":{"template":{"spec":{"containers":[{"name":"engine","resources":{"limits":{"memory":"16Gi"}}}]}}}}'\`
5. Notifica trading desk: canale Slack #swop-trading-ops

## Kafka Consumer Lag
1. Check lag: \`kafka-consumer-groups --describe --group <service>-group\`
2. Se lag > 10k: scale consumers \`kubectl scale deploy <service> --replicas=5\`
3. Se lag non cala: verificare errori nei log \`kubectl logs -l app=<service> --tail=100\`

## Database Failover
1. Patroni gestisce failover automatico PostgreSQL
2. Verificare: \`patronictl list\`
3. Se split-brain: \`patronictl switchover --leader <node>\`
`,
      },
    ]);

    // SWOP Tools
    await this.toolRepository.save([
      {
        projectId: swop.id,
        name: 'get-system-status',
        description: 'Ritorna lo stato di salute di tutti i microservizi SWOP (matching engine, order service, risk engine, settlement)',
        inputSchema: { type: 'object', properties: {}, required: [] },
        handlerType: HandlerType.STATIC_RESPONSE,
        handlerConfig: {
          response: {
            services: {
              'order-service': { status: 'healthy', latencyP99: '12ms', version: '2.4.1' },
              'matching-engine': { status: 'healthy', latencyP99: '0.3ms', ordersPerSec: 45000, version: '1.8.0' },
              'risk-engine': { status: 'healthy', latencyP99: '8ms', marginsCalculated: 128400, version: '3.1.2' },
              'settlement-service': { status: 'healthy', pendingSettlements: 342, version: '1.5.0' },
              'market-data': { status: 'healthy', activeStreams: 1240, symbolsTracked: 8500, version: '2.0.3' },
            },
            kafka: { status: 'healthy', brokers: 5, topics: 23, totalLag: 145 },
            database: { status: 'healthy', connections: '48/200', replicationLag: '0.2ms' },
            lastChecked: '2026-03-22T10:30:00Z',
          },
        },
      },
      {
        projectId: swop.id,
        name: 'get-order-book',
        description: 'Ritorna il top-of-book (migliori 5 livelli bid/ask) per un simbolo. Utile per capire la liquidità corrente.',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Simbolo del titolo (es. AAPL, MSFT, TSLA)' },
          },
          required: ['symbol'],
        },
        handlerType: HandlerType.STATIC_RESPONSE,
        handlerConfig: {
          response: {
            symbol: 'AAPL',
            timestamp: '2026-03-22T10:30:15.123Z',
            bids: [
              { price: 178.52, quantity: 500 },
              { price: 178.50, quantity: 1200 },
              { price: 178.48, quantity: 800 },
              { price: 178.45, quantity: 3000 },
              { price: 178.40, quantity: 1500 },
            ],
            asks: [
              { price: 178.55, quantity: 400 },
              { price: 178.58, quantity: 900 },
              { price: 178.60, quantity: 1100 },
              { price: 178.65, quantity: 2500 },
              { price: 178.70, quantity: 800 },
            ],
            spread: 0.03,
            midPrice: 178.535,
          },
        },
      },
      {
        projectId: swop.id,
        name: 'get-portfolio-summary',
        description: 'Ritorna il riepilogo del portafoglio di un account: posizioni aperte, P&L, margine utilizzato.',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'string', description: 'ID account (default: account demo)' },
          },
          required: [],
        },
        handlerType: HandlerType.STATIC_RESPONSE,
        handlerConfig: {
          response: {
            accountId: 'ACC-001',
            balance: 1250000.00,
            marginUsed: 187500.00,
            marginAvailable: 1062500.00,
            unrealizedPnl: 34250.75,
            realizedPnlToday: 12800.50,
            positions: [
              { symbol: 'AAPL', side: 'long', quantity: 1000, avgPrice: 175.20, currentPrice: 178.53, pnl: 3330.00 },
              { symbol: 'MSFT', side: 'long', quantity: 500, avgPrice: 420.10, currentPrice: 425.80, pnl: 2850.00 },
              { symbol: 'TSLA', side: 'short', quantity: 200, avgPrice: 180.50, currentPrice: 172.30, pnl: 1640.00 },
              { symbol: 'NVDA', side: 'long', quantity: 300, avgPrice: 875.00, currentPrice: 963.50, pnl: 26550.00 },
              { symbol: 'AMZN', side: 'short', quantity: 150, avgPrice: 185.20, currentPrice: 186.50, pnl: -195.00 },
            ],
            openOrders: 7,
          },
        },
      },
      {
        projectId: swop.id,
        name: 'get-recent-trades',
        description: 'Ritorna le ultime operazioni eseguite su un simbolo con prezzo, quantità e timestamp.',
        inputSchema: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Simbolo del titolo' },
            limit: { type: 'number', description: 'Numero di trades (default 10, max 50)' },
          },
          required: ['symbol'],
        },
        handlerType: HandlerType.STATIC_RESPONSE,
        handlerConfig: {
          response: {
            symbol: 'AAPL',
            trades: [
              { id: 'T-90001', price: 178.55, quantity: 100, side: 'buy', timestamp: '2026-03-22T10:30:14.891Z' },
              { id: 'T-90002', price: 178.53, quantity: 250, side: 'sell', timestamp: '2026-03-22T10:30:14.452Z' },
              { id: 'T-90003', price: 178.54, quantity: 500, side: 'buy', timestamp: '2026-03-22T10:30:13.998Z' },
              { id: 'T-90004', price: 178.52, quantity: 150, side: 'sell', timestamp: '2026-03-22T10:30:13.120Z' },
              { id: 'T-90005', price: 178.56, quantity: 300, side: 'buy', timestamp: '2026-03-22T10:30:12.777Z' },
            ],
          },
        },
      },
      {
        projectId: swop.id,
        name: 'get-risk-metrics',
        description: 'Ritorna le metriche di rischio correnti: VaR, exposure, concentration, margini.',
        inputSchema: {
          type: 'object',
          properties: {
            accountId: { type: 'string', description: 'ID account (default: account demo)' },
          },
          required: [],
        },
        handlerType: HandlerType.STATIC_RESPONSE,
        handlerConfig: {
          response: {
            accountId: 'ACC-001',
            timestamp: '2026-03-22T10:30:00Z',
            var95: 42500.00,
            var99: 68200.00,
            maxDrawdown: -15200.00,
            sharpeRatio: 1.85,
            grossExposure: 785000.00,
            netExposure: 612000.00,
            concentrationRisk: {
              topHolding: { symbol: 'NVDA', weight: 0.37 },
              top3Weight: 0.78,
              sectorConcentration: { Technology: 0.82, Consumer: 0.18 },
            },
            marginUtilization: 0.15,
            liquidityScore: 'A',
            alerts: [
              { level: 'warning', message: 'NVDA concentration >35% del portafoglio' },
            ],
          },
        },
      },
      {
        projectId: swop.id,
        name: 'get-kafka-consumer-lag',
        description: 'Ritorna il consumer lag di tutti i consumer group Kafka. Utile per diagnosticare ritardi nel processing.',
        inputSchema: { type: 'object', properties: {}, required: [] },
        handlerType: HandlerType.STATIC_RESPONSE,
        handlerConfig: {
          response: {
            consumerGroups: [
              { group: 'matching-engine-group', topics: ['orders.new'], totalLag: 0, status: 'stable' },
              { group: 'risk-engine-group', topics: ['trades.executed'], totalLag: 12, status: 'stable' },
              { group: 'settlement-group', topics: ['trades.executed'], totalLag: 145, status: 'catching-up' },
              { group: 'market-data-group', topics: ['market.ticks'], totalLag: 3, status: 'stable' },
              { group: 'audit-logger-group', topics: ['orders.new', 'trades.executed', 'risk.margin-call'], totalLag: 890, status: 'lagging' },
            ],
            timestamp: '2026-03-22T10:30:00Z',
          },
        },
      },
    ]);

    // SWOP Prompts
    await this.promptRepository.save([
      {
        projectId: swop.id,
        name: 'code-review',
        description: 'Code review nel contesto SWOP con focus su performance, sicurezza e convenzioni del progetto',
        template: `Sei un senior developer del team SWOP Trading Platform. Fai una code review del seguente codice considerando:

1. **Convenzioni SWOP**: error handling (wrap errors in Go, no unwrap in Rust), logging strutturato, context propagation
2. **Performance**: questo codice è nel hot path del trading? Se sì, valuta latenza e allocazioni
3. **Sicurezza**: validazione input, SQL injection, race conditions
4. **Testing**: suggerisci test cases, inclusi edge cases finanziari (overflow decimali, ordini con quantità 0, ecc.)

File: {{filename}}

\`\`\`{{language}}
{{code}}
\`\`\`

Fornisci feedback actionable con snippet di codice corretto dove necessario.`,
        arguments: [
          { name: 'filename', description: 'Path del file', required: true },
          { name: 'language', description: 'Linguaggio (go, rust, python, java)', required: true },
          { name: 'code', description: 'Codice da revieware', required: true },
        ],
      },
      {
        projectId: swop.id,
        name: 'incident-analysis',
        description: 'Analisi di un incidente con root cause analysis e action items',
        template: `Sei il lead SRE del team SWOP. Analizza il seguente incidente e produci un report strutturato.

## Descrizione Incidente
{{description}}

## Log / Metriche
{{logs}}

Produci:
1. **Timeline** degli eventi
2. **Root Cause Analysis** (5 whys)
3. **Impact Assessment** (utenti impattati, trades persi/ritardati, esposizione finanziaria)
4. **Mitigation** immediata applicata o da applicare
5. **Action Items** con priorità e owner suggerito
6. **Preventive Measures** per evitare recurrence`,
        arguments: [
          { name: 'description', description: 'Descrizione dell\'incidente', required: true },
          { name: 'logs', description: 'Log ed errori rilevanti', required: true },
        ],
      },
      {
        projectId: swop.id,
        name: 'api-design',
        description: 'Progettazione API endpoint per un nuovo feature SWOP',
        template: `Sei l'API architect di SWOP. Progetta gli endpoint REST per la seguente feature, rispettando le convenzioni del progetto:

- Versioning: /v1/
- Auth: Bearer JWT con scopes
- Rate limiting per endpoint
- Pagination: cursor-based
- Error format: { "code": "...", "message": "...", "details": {} }

## Feature richiesta
{{feature}}

## Contesto aggiuntivo
{{context}}

Produci:
1. **Endpoint list** con method, path, scopes richiesti
2. **Request/Response schemas** (JSON)
3. **Error cases** specifici
4. **Rate limits** suggeriti
5. **Kafka events** emessi (topic, schema Avro)`,
        arguments: [
          { name: 'feature', description: 'Descrizione della feature', required: true },
          { name: 'context', description: 'Contesto tecnico aggiuntivo', required: false },
        ],
      },
    ]);

    this.logger.log('Seed complete: SWOP project with docs, tools, prompts');
  }
}

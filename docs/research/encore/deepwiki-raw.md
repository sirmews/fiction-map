# Page: Introduction to Encore

# Introduction to Encore

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [README.md](README.md)
- [docs/go/overview.md](docs/go/overview.md)
- [docs/menu.cue](docs/menu.cue)
- [docs/platform/introduction.md](docs/platform/introduction.md)
- [docs/platform/overview.md](docs/platform/overview.md)
- [docs/ts/concepts/benefits.md](docs/ts/concepts/benefits.md)
- [docs/ts/overview.md](docs/ts/overview.md)

</details>



## Purpose and Scope

This document introduces the Encore backend development platform, covering its core architecture, philosophy, and three main components. Encore is an open source framework for building cloud-native backend applications using declarative infrastructure, consisting of backend frameworks (`Encore.ts` and `Encore.go`), local development tooling, and an optional cloud platform for infrastructure automation.

For detailed information about specific runtime systems, see [Core Runtime Systems](#2). For developer tooling specifics, see [Developer Tools](#4). For cloud platform features, see the Encore Cloud documentation.

## Core Philosophy: Declarative Infrastructure

Encore's fundamental approach centers on **declarative infrastructure** - defining backend resources as type-safe objects directly in application code rather than through separate configuration files. This philosophy eliminates the traditional separation between application logic and infrastructure configuration.

```typescript
// Infrastructure defined as code objects
export const signups = new Topic<SignupEvent>("signups", {
    deliveryGuarantee: "at-least-once",
});

export const userDB = new SQLDatabase("users", {
    migrations: "./migrations",
});
```

The framework uses static analysis to parse application code and extract both logical architecture and infrastructure requirements, then automatically generates boilerplate code and orchestrates the necessary infrastructure for each environment.

Sources: [README.md:57-62]()

## System Architecture Overview

Encore consists of three interconnected layers that work together to provide an end-to-end development experience:

### High-Level System Components

```mermaid
graph TB
    subgraph "Backend Frameworks"
        EncoreTS[Encore.ts<br/>TypeScript Framework]
        EncoreGO[Encore.go<br/>Go Framework]
    end
    
    subgraph "Development Environment"
        CLI[encore CLI<br/>Command Interface]
        Daemon[encore daemon<br/>Local Server]
        DevDash[Development Dashboard<br/>Web UI + AI]
    end
    
    subgraph "Runtime Core"
        RustGateway[API Gateway<br/>Rust Implementation] 
        JSRuntime[JavaScript Runtime<br/>NAPI Bindings]
        GoRuntime[Go Runtime<br/>Native Integration]
    end
    
    subgraph "Infrastructure Layer"
        LocalInfra[Local Infrastructure<br/>Docker + PostgreSQL + NSQ]
        CloudInfra[Cloud Infrastructure<br/>AWS/GCP Services]
    end
    
    subgraph "Optional Platform"
        EncoreCloud[Encore Cloud<br/>DevOps Automation]
        WebPlatform[Web Platform<br/>Infrastructure Management]
    end
    
    CLI --> Daemon
    EncoreTS --> JSRuntime
    EncoreGO --> GoRuntime
    JSRuntime --> RustGateway
    GoRuntime --> RustGateway
    Daemon --> DevDash
    Daemon --> LocalInfra
    RustGateway --> LocalInfra
    RustGateway --> CloudInfra
    CLI --> EncoreCloud
    EncoreCloud --> WebPlatform
    WebPlatform --> CloudInfra
```

Sources: [README.md:6-8](), High-level diagrams from ecosystem overview

### Core Runtime Architecture with Code Entities

```mermaid
graph TD
    subgraph "Application Layer"
        TSApp["TypeScript Application<br/>.ts files"]
        GoApp["Go Application<br/>.go files"]
    end
    
    subgraph "Parser Layer"
        TSParser["TypeScript Parser<br/>Rust Implementation"]
        GoParser["Go Parser<br/>Protocol Buffers"]
        MetaData["meta.Data<br/>Protocol Buffer Schema"]
    end
    
    subgraph "Runtime Core"
        APIGateway["API Gateway<br/>HTTP/WebSocket Proxy"]
        SQLDBCore["SQL Database Manager<br/>Connection Pooling"]
        TraceCore["Tracing Engine<br/>trace.Request"]
        PubSubCore["Pub/Sub Engine<br/>NSQ/GCP/SNS Integration"]
    end
    
    subgraph "Language Bindings"
        NAPIBindings["NAPI Bindings<br/>Rust ↔ JavaScript"]
        PValueSystem["PValue Type System<br/>Serialization Layer"]
        GoBindings["Go Runtime Bindings<br/>Direct Integration"]
    end
    
    subgraph "Infrastructure Services"
        PostgreSQL["PostgreSQL<br/>Local + Cloud"]
        NSQLocal["NSQ<br/>Local Message Queue"]
        CloudPubSub["Cloud Pub/Sub<br/>GCP/AWS SNS-SQS"]
    end
    
    TSApp --> TSParser
    GoApp --> GoParser
    TSParser --> MetaData
    GoParser --> MetaData
    TSParser --> NAPIBindings
    NAPIBindings --> PValueSystem
    PValueSystem --> APIGateway
    GoApp --> GoBindings
    GoBindings --> APIGateway
    
    APIGateway --> SQLDBCore
    APIGateway --> TraceCore
    APIGateway --> PubSubCore
    
    SQLDBCore --> PostgreSQL
    PubSubCore --> NSQLocal
    PubSubCore --> CloudPubSub
```

Sources: Core Runtime Architecture diagram, [README.md:57-59]()

## The Three Main Components

### 1. Backend Frameworks (Encore.ts and Encore.go)

The backend frameworks provide declarative APIs for defining infrastructure resources using language-native syntax:

| Framework | Language | Key Features |
|-----------|----------|--------------|
| Encore.ts | TypeScript | High-performance Rust runtime, NAPI bindings, 100% Node.js compatibility |
| Encore.go | Go | Native Go integration, minimal framework overhead, built-in concurrency |

**Common Infrastructure Primitives:**

- **Services**: Microservice definitions with automatic service discovery
- **APIs**: Type-safe endpoints with automatic validation and documentation  
- **Databases**: SQL database definitions with automatic migration management
- **Pub/Sub**: Message queues with type-safe event definitions
- **Cron Jobs**: Scheduled tasks with declarative timing configuration
- **Object Storage**: Cloud storage buckets with unified API across providers
- **Caching**: Distributed caching with automatic key management

Sources: [README.md:6](), [docs/ts/overview.md:23](), [docs/go/overview.md:23]()

### 2. Local Development Environment

The development environment centers around the `encore` CLI and `encore daemon`, which orchestrate local infrastructure and provide development tools:

#### CLI Commands and Daemon Integration

```mermaid
graph LR
    subgraph "Developer Interface"
        CLICommands["encore run<br/>encore test<br/>encore gen client<br/>encore app create"]
    end
    
    subgraph "Daemon Services"  
        gRPCAPI["gRPC Daemon API<br/>Development Services"]
        RunManager["Run Manager<br/>App Lifecycle"]
        DBProxy["Database Proxy<br/>PostgreSQL Protocol"]
        TraceStore["Trace Store<br/>Request Monitoring"]
    end
    
    subgraph "Local Infrastructure"
        DockerContainers["Docker Containers<br/>PostgreSQL + NSQ"]
        LocalDBs["Local Databases<br/>Per-Service Isolation"]
        LocalQueues["Local Message Queues<br/>NSQ Implementation"]
    end
    
    subgraph "Development Tools"
        WebDashboard["Development Dashboard<br/>localhost:9400"]
        AIFeatures["AI Assistant<br/>Code Generation"]
        ServiceCatalog["Service Catalog<br/>API Documentation"]
        ArchDiagrams["Architecture Diagrams<br/>Auto-generated"]
    end
    
    CLICommands --> gRPCAPI
    gRPCAPI --> RunManager
    gRPCAPI --> DBProxy
    gRPCAPI --> TraceStore
    RunManager --> DockerContainers
    DBProxy --> LocalDBs
    TraceStore --> WebDashboard
    WebDashboard --> AIFeatures
    WebDashboard --> ServiceCatalog
    WebDashboard --> ArchDiagrams
```

Sources: Development workflow diagram, [README.md:163-173]()

### 3. Optional Cloud Platform (Encore Cloud)

Encore Cloud provides automated infrastructure provisioning and DevOps processes while maintaining that applications have no runtime dependencies on the platform:

#### Infrastructure Automation Pipeline

| Component | Purpose | Implementation |
|-----------|---------|----------------|
| **Platform API** | Infrastructure orchestration | REST/WebSocket API for cloud resource management |
| **GitHub Integration** | CI/CD automation | Automatic deployments on git push |
| **Preview Environments** | Pull request testing | Temporary cloud environments per PR |
| **Infrastructure Tracking** | Resource visibility | Complete inventory of provisioned resources |
| **Cost Monitoring** | Expense management | Cloud cost tracking and optimization |

Sources: [README.md:191-227](), [docs/platform/introduction.md:21-38]()

## Code-to-Infrastructure Mapping

Encore's static analysis system creates a direct mapping between code constructs and infrastructure resources:

### TypeScript Framework Mapping

```typescript
// Service definition maps to microservice deployment
export const userService = service("user");

// API definition maps to HTTP endpoint + load balancer rules  
export const getUser = api(
  { expose: true, method: "GET", path: "/user/:id" },
  async ({ id }: { id: string }) => { /* implementation */ }
);

// Database definition maps to PostgreSQL instance + connection pool
export const userDB = new SQLDatabase("users", {
  migrations: "./migrations"
});

// Topic definition maps to Pub/Sub infrastructure (NSQ/GCP/SNS)
export const signups = new Topic<SignupEvent>("signups", {
  deliveryGuarantee: "at-least-once"
});
```

### Go Framework Mapping

```go
// Service comment maps to microservice deployment
package user

// API comment maps to HTTP endpoint + routing rules
//encore:api public path=/user/:id
func GetUser(ctx context.Context, id string) (*User, error) {
    // implementation
}

// Database variable maps to PostgreSQL instance
var userDB = sqldb.NewDatabase("users", sqldb.DatabaseConfig{
    Migrations: "./migrations",
})

// Topic variable maps to Pub/Sub infrastructure  
var Signups = pubsub.NewTopic[*SignupEvent]("signups", pubsub.TopicConfig{
    DeliveryGuarantee: pubsub.AtLeastOnce,
})
```

Sources: [README.md:67-101](), [README.md:103-138]()

## Multi-Environment Consistency

Encore ensures the same application code runs consistently across all environments through its unified runtime architecture:

| Environment | Infrastructure Backend | Orchestration |
|-------------|----------------------|---------------|
| **Local Development** | Docker containers (PostgreSQL, NSQ) | `encore daemon` |
| **Testing** | Isolated test infrastructure | Automatic provisioning per test |
| **Preview** | Temporary cloud resources | Encore Cloud automation |
| **Production** | Cloud-native services (RDS, Cloud Run, etc.) | Cloud provider APIs |

The `encore daemon` serves as the local orchestrator, while the Rust-based API gateway provides consistent request handling and infrastructure integration across all environments.

Sources: [README.md:59-61](), [README.md:167-168]()

## Development Workflow Integration

Encore integrates with standard development workflows while providing enhanced tooling:

1. **Code Analysis**: Static analysis extracts API schemas and infrastructure requirements
2. **Local Orchestration**: `encore daemon` manages local infrastructure lifecycle  
3. **Live Reloading**: Automatic application restart on code changes
4. **Distributed Tracing**: Request tracing across service boundaries
5. **AI-Assisted Development**: Code generation and architecture suggestions
6. **Automatic Documentation**: API docs and architecture diagrams generated from code

The development dashboard at `localhost:9400` provides a unified interface for monitoring application behavior, viewing traces, exploring APIs, and accessing AI-powered development assistance.

Sources: [README.md:156-189](), [docs/ts/overview.md:25-29]()

---

# Page: System Overview

# System Overview

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [README.md](README.md)
- [docs/go/overview.md](docs/go/overview.md)
- [docs/menu.cue](docs/menu.cue)
- [docs/platform/introduction.md](docs/platform/introduction.md)
- [docs/platform/overview.md](docs/platform/overview.md)
- [docs/ts/concepts/benefits.md](docs/ts/concepts/benefits.md)
- [docs/ts/overview.md](docs/ts/overview.md)

</details>



This document provides a high-level overview of Encore's system architecture, covering the core components and their interactions within the framework. Encore is an open source framework for creating type-safe distributed systems with declarative infrastructure, supporting both TypeScript and Go backend development.

For detailed architectural patterns and design principles, see [Architecture Overview](#1.2). For information about specific runtime components, see [Core Runtime Systems](#2).

## Core Framework Architecture

Encore consists of multiple interconnected systems that work together to provide a seamless development experience from local development to cloud deployment. The framework is built around language-specific backend frameworks that integrate with shared developer tools and runtime systems.

```mermaid
graph TB
    subgraph "Backend Frameworks"
        EncoreTS["Encore.ts Framework"]
        EncoreGo["Encore.go Framework"]
    end
    
    subgraph "Developer Tools"
        CLI["encore CLI"]
        Daemon["encore daemon"]
        Dashboard["Development Dashboard"]
        TSParser["TypeScript Parser"]
        GoParser["Go Parser"]
    end
    
    subgraph "Runtime Systems"
        JSRuntime["JavaScript Runtime<br/>(Node.js + Rust)"]
        GoRuntime["Go Runtime"]
        Gateway["API Gateway<br/>(Pingora-based)"]
        SQLProxy["SQL Proxy System"]
    end
    
    subgraph "Infrastructure"
        LocalInfra["Local Infrastructure<br/>(Docker containers)"]
        CloudInfra["Cloud Infrastructure<br/>(AWS/GCP)"]
        EncoreCloud["Encore Cloud Platform"]
    end
    
    EncoreTS --> CLI
    EncoreGo --> CLI
    CLI --> Daemon
    Daemon --> Dashboard
    EncoreTS --> TSParser
    EncoreGo --> GoParser
    
    Daemon --> JSRuntime
    Daemon --> GoRuntime
    Daemon --> Gateway
    Daemon --> SQLProxy
    
    JSRuntime --> LocalInfra
    GoRuntime --> LocalInfra
    Gateway --> LocalInfra
    SQLProxy --> LocalInfra
    
    EncoreCloud --> CloudInfra
    Daemon --> EncoreCloud
```

**Core Framework Components:**
- **Backend Frameworks**: Language-specific frameworks (`encore.dev/api`, `encore.dev/pubsub`, etc.) that provide declarative infrastructure primitives
- **CLI**: Primary developer interface (`encore` command) for application lifecycle management
- **Daemon**: Local orchestration service that manages infrastructure and application runtime
- **Parsers**: Static analysis tools that extract application metadata from source code

Sources: [README.md:1-336](), [docs/ts/overview.md:1-98](), [docs/go/overview.md:1-98]()

## Developer Tools Stack

The developer tools provide an integrated development experience with automatic infrastructure management, real-time observability, and AI-assisted development capabilities.

```mermaid
graph LR
    subgraph "CLI Commands"
        AppCreate["encore app create"]
        Run["encore run"] 
        Test["encore test"]
        Gen["encore gen client"]
        Build["encore build docker"]
    end
    
    subgraph "Daemon Services"
        AppManager["Application Manager"]
        InfraManager["Infrastructure Manager"]
        TraceCollector["Trace Collector"]
        MetaBuilder["Metadata Builder"]
    end
    
    subgraph "Dashboard Features"
        APIExplorer["API Explorer"]
        TraceViewer["Trace Viewer"]
        ServiceCatalog["Service Catalog"]
        FlowDiagram["Architecture Flow"]
        AIAssistant["AI System Design"]
    end
    
    subgraph "Code Analysis"
        TSParser2["TypeScript Parser<br/>(Rust-based)"]
        GoParser2["Go AST Parser"]
        UsageResolver["Usage Resolver"]
        TypeChecker["Schema Validator"]
    end
    
    AppCreate --> AppManager
    Run --> InfraManager
    Test --> InfraManager
    Gen --> MetaBuilder
    Build --> MetaBuilder
    
    AppManager --> TSParser2
    AppManager --> GoParser2
    InfraManager --> UsageResolver
    MetaBuilder --> TypeChecker
    
    TraceCollector --> TraceViewer
    MetaBuilder --> APIExplorer
    MetaBuilder --> ServiceCatalog
    MetaBuilder --> FlowDiagram
    Dashboard --> AIAssistant
```

**Key Developer Tools:**
- **CLI Interface**: Commands for application creation, running, testing, and deployment
- **Local Daemon**: Background service managing infrastructure provisioning and application lifecycle
- **Development Dashboard**: Web UI providing API exploration, tracing, and system visualization
- **Static Analysis**: Code parsers that extract API definitions, service dependencies, and infrastructure requirements

Sources: [docs/menu.cue:1-1307](), [README.md:157-178]()

## Runtime and Execution Architecture

Encore's runtime systems handle request processing, service communication, and infrastructure integration with high performance and type safety.

```mermaid
graph TB
    subgraph "Request Processing"
        HTTPClient["HTTP Clients"]
        Gateway2["Pingora Gateway"]
        Router["Request Router"]
        Middleware["Middleware Chain"]
    end
    
    subgraph "Application Runtime"
        JSApp["Node.js Application<br/>(+ Rust Runtime)"]
        GoApp["Go Application<br/>(Native Runtime)"]
        ServiceRegistry["Service Registry"]
        APIHandler["API Handlers"]
    end
    
    subgraph "Data Layer"
        SQLProxy2["SQL Proxy"]
        PostgreSQL["PostgreSQL Databases"]
        PubSubSystem["Pub/Sub System<br/>(NSQ/Cloud)"]
        ObjectStorage["Object Storage<br/>(Local/Cloud)"]
    end
    
    subgraph "Observability"
        TracingSystem["Distributed Tracing"]
        MetricsCollector["Metrics Collection"]
        LogAggregator["Log Aggregation"]
    end
    
    HTTPClient --> Gateway2
    Gateway2 --> Router
    Router --> Middleware
    Middleware --> JSApp
    Middleware --> GoApp
    
    JSApp --> ServiceRegistry
    GoApp --> ServiceRegistry
    ServiceRegistry --> APIHandler
    
    APIHandler --> SQLProxy2
    APIHandler --> PubSubSystem
    APIHandler --> ObjectStorage
    SQLProxy2 --> PostgreSQL
    
    JSApp --> TracingSystem
    GoApp --> TracingSystem
    TracingSystem --> MetricsCollector
    MetricsCollector --> LogAggregator
```

**Runtime Components:**
- **API Gateway**: High-performance request routing and protocol handling using Pingora
- **Language Runtimes**: Native Go runtime and enhanced Node.js runtime with Rust core
- **Service Registry**: Inter-service communication and discovery system
- **Data Layer**: SQL proxy, pub/sub messaging, and object storage integrations
- **Observability Stack**: Distributed tracing, metrics collection, and structured logging

Sources: [README.md:22-43](), [docs/ts/concepts/benefits.md:17-43]()

## Infrastructure and Deployment Pipeline

Encore supports both local development infrastructure and cloud deployment through automated infrastructure provisioning and containerized deployments.

```mermaid
graph TD
    subgraph "Source and Build"
        SourceCode["Application Source<br/>(Go/TypeScript)"]
        CodeGen["Code Generation<br/>(Clients, Schemas)"]
        DockerBuilder["Docker Image Builder"]
        Artifacts["Build Artifacts"]
    end
    
    subgraph "Local Infrastructure"
        DockerCompose["Docker Services"]
        LocalDB["PostgreSQL Containers"]
        LocalPubSub["NSQ Message Queue"]
        LocalStorage["Local Object Storage"]
    end
    
    subgraph "Cloud Infrastructure"
        AWSServices["AWS Services<br/>(Fargate, RDS, SQS)"]
        GCPServices["GCP Services<br/>(Cloud Run, SQL, Pub/Sub)"]
        K8sCluster["Kubernetes Clusters<br/>(EKS, GKE)"]
    end
    
    subgraph "Deployment Pipeline"
        GitHubActions["GitHub Actions"]
        ReleaseBuilder["Release Builder<br/>(make-release.go)"]
        ContainerRegistry["Container Registry"]
        InfraProvisioner["Infrastructure Provisioner"]
    end
    
    SourceCode --> CodeGen
    CodeGen --> DockerBuilder
    DockerBuilder --> Artifacts
    
    Artifacts --> DockerCompose
    DockerCompose --> LocalDB
    DockerCompose --> LocalPubSub
    DockerCompose --> LocalStorage
    
    Artifacts --> GitHubActions
    GitHubActions --> ReleaseBuilder
    ReleaseBuilder --> ContainerRegistry
    ContainerRegistry --> InfraProvisioner
    
    InfraProvisioner --> AWSServices
    InfraProvisioner --> GCPServices
    InfraProvisioner --> K8sCluster
```

**Infrastructure Components:**
- **Local Development**: Docker-based infrastructure with PostgreSQL, NSQ, and local storage
- **Code Generation**: Automated client library and schema generation from application metadata
- **Build Pipeline**: Docker image creation and multi-platform artifact generation
- **Cloud Provisioning**: Automated infrastructure management on AWS, GCP, and Kubernetes
- **Deployment Automation**: CI/CD integration with GitHub Actions and release management

Sources: [README.md:153-227](), [docs/platform/introduction.md:21-88](), [docs/platform/overview.md:1-90]()

## System Integration and Data Flow

The complete system operates through a unified metadata-driven approach where application code serves as the single source of truth for infrastructure requirements and API definitions.

```mermaid
graph LR
    subgraph "Development Flow"
        DevCode["Developer Code<br/>(API definitions, services)"]
        StaticAnalysis["Static Analysis<br/>(Parser + Type Checker)"]
        AppMetadata["Application Metadata<br/>(Protocol Buffers)"]
    end
    
    subgraph "Runtime Generation"
        ClientGen2["Client Generation"]
        InfraGen["Infrastructure Config"]
        WrapperGen["Runtime Wrappers"]
        SchemaGen2["API Schemas"]
    end
    
    subgraph "Deployment Targets"
        LocalEnv["Local Environment"]
        PreviewEnv["Preview Environments"]
        ProductionEnv["Production Environment"]
    end
    
    DevCode --> StaticAnalysis
    StaticAnalysis --> AppMetadata
    
    AppMetadata --> ClientGen2
    AppMetadata --> InfraGen
    AppMetadata --> WrapperGen
    AppMetadata --> SchemaGen2
    
    ClientGen2 --> LocalEnv
    InfraGen --> LocalEnv
    ClientGen2 --> PreviewEnv
    InfraGen --> PreviewEnv
    ClientGen2 --> ProductionEnv
    InfraGen --> ProductionEnv
```

**Key Integration Points:**
- **Metadata Pipeline**: Static analysis extracts structured metadata from source code
- **Code Generation**: Automated generation of client libraries, infrastructure configurations, and runtime wrappers
- **Environment Parity**: Same application code deployed across local, preview, and production environments
- **Infrastructure as Code**: Declarative infrastructure definitions embedded in application code

Sources: [README.md:55-64](), [docs/platform/introduction.md:27-37]()

---

# Page: Architecture Overview

# Architecture Overview

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [README.md](README.md)
- [docs/go/overview.md](docs/go/overview.md)
- [docs/menu.cue](docs/menu.cue)
- [docs/platform/introduction.md](docs/platform/introduction.md)
- [docs/platform/overview.md](docs/platform/overview.md)
- [docs/ts/concepts/benefits.md](docs/ts/concepts/benefits.md)
- [docs/ts/overview.md](docs/ts/overview.md)
- [go.mod](go.mod)
- [go.sum](go.sum)
- [runtimes/core/src/api/call.rs](runtimes/core/src/api/call.rs)
- [runtimes/core/src/api/gateway/mod.rs](runtimes/core/src/api/gateway/mod.rs)
- [runtimes/core/src/api/gateway/router.rs](runtimes/core/src/api/gateway/router.rs)
- [runtimes/core/src/api/manager.rs](runtimes/core/src/api/manager.rs)
- [runtimes/core/src/api/mod.rs](runtimes/core/src/api/mod.rs)
- [runtimes/core/src/api/server.rs](runtimes/core/src/api/server.rs)
- [runtimes/js/encore.dev/internal/api/mod.ts](runtimes/js/encore.dev/internal/api/mod.ts)
- [runtimes/js/encore.dev/mod.ts](runtimes/js/encore.dev/mod.ts)
- [runtimes/js/src/pvalue.rs](runtimes/js/src/pvalue.rs)
- [runtimes/js/src/runtime.rs](runtimes/js/src/runtime.rs)
- [tsparser/src/builder/codegen.rs](tsparser/src/builder/codegen.rs)
- [tsparser/src/builder/templates/catalog/auth/auth_ts.handlebars](tsparser/src/builder/templates/catalog/auth/auth_ts.handlebars)
- [tsparser/src/builder/templates/catalog/clients/endpoints_d_ts.handlebars](tsparser/src/builder/templates/catalog/clients/endpoints_d_ts.handlebars)
- [tsparser/src/builder/templates/catalog/clients/endpoints_js.handlebars](tsparser/src/builder/templates/catalog/clients/endpoints_js.handlebars)
- [tsparser/src/builder/templates/catalog/clients/endpoints_testing_js.handlebars](tsparser/src/builder/templates/catalog/clients/endpoints_testing_js.handlebars)

</details>



This document provides a comprehensive overview of the Encore framework's architecture, covering the core runtime systems, language-specific integrations, and development tools that enable building distributed backend applications. The architecture is designed around a multi-language approach with a shared Rust-based core runtime that provides high-performance infrastructure services.

For information about specific primitives and APIs, see [API Definition and Handlers](#3.3). For details about the CLI interface and developer tools, see [CLI Interface](#4.1) and [Developer Dashboard](#4.2).

## System Architecture Overview

Encore's architecture is built around a core runtime written in Rust that provides infrastructure services, with language-specific runtimes for Go and TypeScript/JavaScript that integrate with this core. The system includes development tools, code generation, and deployment capabilities.

### Core Architecture Diagram

```mermaid
graph TB
    subgraph "Development Tools"
        CLI["Encore CLI"]
        Daemon["Encore Daemon"]
        Dashboard["Development Dashboard"]
        TSParser["TypeScript Parser"]
    end
    
    subgraph "Core Runtime (Rust)"
        CoreRuntime["encore_runtime_core::Runtime"]
        APIManager["api::Manager"]
        Gateway["api::gateway::Gateway"]
        ServiceRegistry["api::call::ServiceRegistry"]
        SQLProxy["sql proxy"]
        PubSubCore["pubsub core"]
    end
    
    subgraph "Language Runtimes"
        JSRuntime["JavaScript Runtime<br/>(Node.js + Rust)"]
        GoRuntime["Go Runtime<br/>(Native Go)"]
    end
    
    subgraph "Application Code"
        TSApp["TypeScript App"]
        GoApp["Go App"]
    end
    
    subgraph "Infrastructure"
        PostgreSQL["PostgreSQL"]
        Redis["Redis/Cache"]
        PubSubBackend["NSQ/Cloud PubSub"]
        Storage["Object Storage"]
    end
    
    CLI --> Daemon
    Daemon --> CoreRuntime
    TSParser --> CodeGen["Code Generation"]
    CodeGen --> TSApp
    
    JSRuntime --> CoreRuntime
    GoRuntime --> CoreRuntime
    
    TSApp --> JSRuntime
    GoApp --> GoRuntime
    
    APIManager --> Gateway
    APIManager --> ServiceRegistry
    
    CoreRuntime --> PostgreSQL
    CoreRuntime --> Redis
    CoreRuntime --> PubSubBackend
    CoreRuntime --> Storage
    
    Dashboard --> Daemon
```

Sources: [README.md:45-62](), [runtimes/core/src/api/manager.rs:48-60](), [runtimes/js/src/runtime.rs:23-25]()

## Core Runtime Components

The core runtime is implemented in Rust and provides the foundational infrastructure services that all Encore applications depend on. It's designed for high performance and handles cross-cutting concerns like authentication, service discovery, and infrastructure integration.

### Runtime Manager and Service Coordination

The `api::Manager` serves as the central coordinator for all runtime services:

```mermaid
graph TB
    Manager["api::Manager"]
    
    subgraph "Managed Components"
        GatewayMap["HashMap<EncoreName, Gateway>"]
        ServiceReg["Arc<ServiceRegistry>"]
        APIServer["Option<server::Server>"]
        HealthZ["healthz::Handler"]
        PubSubReg["pubsub::PushHandlerRegistry"]
    end
    
    subgraph "Configuration"
        ManagerConfig["ManagerConfig"]
        EnvData["runtime::Environment"]
        MetaData["meta::Data"]
        Secrets["secrets::Manager"]
    end
    
    Manager --> GatewayMap
    Manager --> ServiceReg
    Manager --> APIServer
    Manager --> HealthZ
    Manager --> PubSubReg
    
    ManagerConfig --> Manager
    EnvData --> ManagerConfig
    MetaData --> ManagerConfig
    Secrets --> ManagerConfig
```

Sources: [runtimes/core/src/api/manager.rs:48-60](), [runtimes/core/src/api/manager.rs:28-46]()

### API Gateway and Request Processing

The `api::gateway::Gateway` handles incoming HTTP requests and routes them to appropriate services:

```mermaid
graph LR
    subgraph "Gateway Components"
        Gateway["gateway::Gateway"]
        Router["router::Router"]
        CorsConfig["CorsHeadersConfig"]
        AuthHandler["auth::Authenticator"]
    end
    
    subgraph "Request Processing"
        RequestFilter["request_filter()"]
        UpstreamPeer["upstream_peer()"]
        UpstreamReqFilter["upstream_request_filter()"]
        ResponseFilter["response_filter()"]
    end
    
    subgraph "Routing"
        MainRouter["matchit::Router<MethodRoute>"]
        FallbackRouter["matchit::Router<MethodRoute>"]
        Target["router::Target"]
    end
    
    Gateway --> Router
    Gateway --> CorsConfig
    Gateway --> AuthHandler
    
    Gateway --> RequestFilter
    Gateway --> UpstreamPeer
    Gateway --> UpstreamReqFilter
    Gateway --> ResponseFilter
    
    Router --> MainRouter
    Router --> FallbackRouter
    Router --> Target
```

Sources: [runtimes/core/src/api/gateway/mod.rs:35-48](), [runtimes/core/src/api/gateway/router.rs:8-18]()

## Language Runtime Integration

Encore supports multiple programming languages through language-specific runtimes that integrate with the core Rust runtime.

### JavaScript/TypeScript Runtime Architecture

The JavaScript runtime combines Node.js for executing application code with Rust for infrastructure operations:

```mermaid
graph TB
    subgraph "JavaScript Runtime Layer"
        Runtime["Runtime (NAPI)"]
        APIRoute["APIRoute"]
        SQLDatabase["SQLDatabase"]
        PubSubTopic["PubSubTopic"]
        Gateway["Gateway"]
    end
    
    subgraph "Core Integration"
        CoreRuntime["encore_runtime_core::Runtime"]
        APIManager["api().manager()"]
        SQLManager["sqldb()"]
        PubSubManager["pubsub()"]
    end
    
    subgraph "Node.js Application"
        AppCode["Application Code"]
        Handlers["Endpoint Handlers"]
        Services["Service Logic"]
    end
    
    Runtime --> CoreRuntime
    APIRoute --> APIManager
    SQLDatabase --> SQLManager
    PubSubTopic --> PubSubManager
    
    AppCode --> Runtime
    Handlers --> APIRoute
    Services --> SQLDatabase
    Services --> PubSubTopic
```

Sources: [runtimes/js/src/runtime.rs:22-25](), [runtimes/js/src/runtime.rs:95-110]()

### Go Runtime Integration

The Go runtime provides native Go integration with the core services:

```mermaid
graph TB
    subgraph "Go Runtime"
        GoApp["Go Application"]
        EncoreAPI["encore.dev APIs"]
        SQLClient["SQL Client"]
        PubSubClient["PubSub Client"]
    end
    
    subgraph "Core Runtime Bridge"
        RuntimeBridge["Runtime Bridge"]
        ServiceCalls["Service Calls"]
        InfraCalls["Infrastructure Calls"]
    end
    
    subgraph "Core Services"
        CoreRuntime["Core Runtime"]
        ServiceRegistry["Service Registry"]
        InfraServices["Infrastructure Services"]
    end
    
    GoApp --> EncoreAPI
    EncoreAPI --> RuntimeBridge
    SQLClient --> RuntimeBridge
    PubSubClient --> RuntimeBridge
    
    RuntimeBridge --> ServiceCalls
    RuntimeBridge --> InfraCalls
    
    ServiceCalls --> ServiceRegistry
    InfraCalls --> InfraServices
    ServiceRegistry --> CoreRuntime
    InfraServices --> CoreRuntime
```

Sources: [go.mod:10](), [runtimes/go:233]()

## Service Discovery and Communication

The `ServiceRegistry` manages service locations and handles inter-service communication:

### Service Registry Architecture

```mermaid
graph TB
    subgraph "ServiceRegistry Components"
        ServiceRegistry["call::ServiceRegistry"]
        EndpointMap["Arc<EndpointMap>"]
        BaseURLs["HashMap<EncoreName, String>"]
        HTTPClient["reqwest::Client"]
        ServiceAuth["HashMap<EncoreName, Arc<ServiceAuthMethod>>"]
    end
    
    subgraph "Service Discovery"
        ServiceDiscovery["pb::ServiceDiscovery"]
        OwnAddress["own_address: Option<&str>"]
        HostedServices["Hosted<EncoreName>"]
    end
    
    subgraph "Communication"
        APICall["api_call()"]
        StreamConnect["connect_stream()"]
        WebSocketClient["WebSocketClient"]
    end
    
    ServiceRegistry --> EndpointMap
    ServiceRegistry --> BaseURLs
    ServiceRegistry --> HTTPClient
    ServiceRegistry --> ServiceAuth
    
    ServiceDiscovery --> ServiceRegistry
    OwnAddress --> ServiceRegistry
    HostedServices --> ServiceRegistry
    
    ServiceRegistry --> APICall
    ServiceRegistry --> StreamConnect
    ServiceRegistry --> WebSocketClient
```

Sources: [runtimes/core/src/api/call.rs:28-36](), [runtimes/core/src/api/call.rs:38-50]()

## Request Flow Architecture

The following diagram shows how requests flow through the Encore system:

### End-to-End Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as "gateway::Gateway"
    participant Router as "router::Router"
    participant ServiceRegistry as "ServiceRegistry"
    participant RuntimeHandler as "Runtime Handler"
    participant AppCode as "Application Code"
    participant Infrastructure
    
    Client->>Gateway: "HTTP Request"
    Gateway->>Gateway: "request_filter()"
    Gateway->>Router: "route_to_service()"
    Router->>Router: "find MethodRoute"
    Gateway->>ServiceRegistry: "service_base_url()"
    Gateway->>Gateway: "upstream_peer()"
    Gateway->>Gateway: "upstream_request_filter()"
    Gateway->>RuntimeHandler: "Forward Request"
    RuntimeHandler->>AppCode: "Call Handler"
    AppCode->>Infrastructure: "Database/PubSub Calls"
    Infrastructure-->>AppCode: "Response"
    AppCode-->>RuntimeHandler: "Response"
    RuntimeHandler-->>Gateway: "HTTP Response"
    Gateway->>Gateway: "response_filter()"
    Gateway-->>Client: "HTTP Response"
```

Sources: [runtimes/core/src/api/gateway/mod.rs:154-193](), [runtimes/core/src/api/gateway/mod.rs:195-275]()

## Code Generation and Build Pipeline

Encore uses static analysis and code generation to provide type-safe infrastructure and development tools.

### TypeScript Code Generation Pipeline

```mermaid
graph TB
    subgraph "Source Analysis"
        TSSource["TypeScript Source"]
        TSParser["tsparser"]
        ASTAnalysis["AST Analysis"]
        ResourceParsing["Resource Parsing"]
    end
    
    subgraph "Metadata Generation"
        AppDesc["AppDesc"]
        ServiceMeta["Service Metadata"]
        EndpointMeta["Endpoint Metadata"]
        InfraMeta["Infrastructure Metadata"]
    end
    
    subgraph "Code Generation"
        Templates["Handlebars Templates"]
        ClientGen["Client Generation"]
        EntrypointGen["Entrypoint Generation"]
        TypeGen["Type Generation"]
    end
    
    subgraph "Generated Outputs"
        ServiceMain["service/main.ts"]
        GatewayMain["gateway/main.ts"]
        ClientFiles["endpoints.js/endpoints.d.ts"]
        AuthTypes["auth.ts"]
    end
    
    TSSource --> TSParser
    TSParser --> ASTAnalysis
    ASTAnalysis --> ResourceParsing
    
    ResourceParsing --> AppDesc
    AppDesc --> ServiceMeta
    AppDesc --> EndpointMeta
    AppDesc --> InfraMeta
    
    ServiceMeta --> Templates
    EndpointMeta --> Templates
    Templates --> ClientGen
    Templates --> EntrypointGen
    Templates --> TypeGen
    
    ClientGen --> ClientFiles
    EntrypointGen --> ServiceMain
    EntrypointGen --> GatewayMain
    TypeGen --> AuthTypes
```

Sources: [tsparser/src/builder/codegen.rs:46-57](), [tsparser/src/builder/codegen.rs:85-122](), [tsparser/src/builder/templates/catalog/clients/endpoints_js.handlebars:1-33]()

### Generated Code Structure

The code generation produces several types of files:

| File Type | Template | Purpose |
|-----------|----------|---------|
| Service Entrypoints | `service/main.ts` | Service initialization and handler registration |
| Gateway Entrypoints | `gateway/main.ts` | Gateway configuration and routing |
| API Clients | `endpoints.js` | Type-safe service clients |
| Type Definitions | `endpoints.d.ts` | TypeScript type definitions |
| Authentication | `auth.ts` | Authentication type integration |
| Testing Support | `endpoints_testing.js` | Test handler registration |

Sources: [tsparser/src/builder/codegen.rs:207-218](), [tsparser/src/builder/codegen.rs:238-249]()

## Infrastructure Integration Layer

Encore abstracts infrastructure services through a consistent interface that works across different cloud providers and local development.

### Infrastructure Service Mapping

```mermaid
graph TB
    subgraph "Encore Abstractions"
        SQLDatabase["SQLDatabase"]
        PubSubTopic["PubSubTopic"]
        ObjectBucket["Bucket"]
        SecretManager["Secret"]
        CacheService["Cache"]
    end
    
    subgraph "Local Development"
        PostgreSQLLocal["PostgreSQL (Docker)"]
        NSQLocal["NSQ"]
        LocalStorage["Local Storage"]
        EnvSecrets["Environment Variables"]
        RedisLocal["Redis (Docker)"]
    end
    
    subgraph "Cloud Providers"
        CloudSQL["Cloud SQL / RDS"]
        CloudPubSub["Cloud Pub/Sub / SNS+SQS"]
        CloudStorage["GCS / S3"]
        CloudSecrets["Secret Manager / Secrets Manager"]
        CloudCache["Memorystore / ElastiCache"]
    end
    
    SQLDatabase --> PostgreSQLLocal
    SQLDatabase --> CloudSQL
    
    PubSubTopic --> NSQLocal
    PubSubTopic --> CloudPubSub
    
    ObjectBucket --> LocalStorage
    ObjectBucket --> CloudStorage
    
    SecretManager --> EnvSecrets
    SecretManager --> CloudSecrets
    
    CacheService --> RedisLocal
    CacheService --> CloudCache
```

Sources: [README.md:106-138](), [README.md:200-208](), [runtimes/js/src/runtime.rs:95-120]()

---

# Page: Core Runtime Systems

# Core Runtime Systems

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [cli/cmd/encore/gen.go](cli/cmd/encore/gen.go)
- [cli/daemon/daemon.go](cli/daemon/daemon.go)
- [cli/daemon/debug.go](cli/daemon/debug.go)
- [cli/daemon/export/export.go](cli/daemon/export/export.go)
- [cli/daemon/run.go](cli/daemon/run.go)
- [cli/daemon/run/check.go](cli/daemon/run/check.go)
- [cli/daemon/run/exec_script.go](cli/daemon/run/exec_script.go)
- [cli/daemon/run/run.go](cli/daemon/run/run.go)
- [cli/daemon/run/tests.go](cli/daemon/run/tests.go)
- [cli/daemon/userfacing.go](cli/daemon/userfacing.go)
- [e2e-tests/app_test.go](e2e-tests/app_test.go)
- [e2e-tests/echo_app_test.go](e2e-tests/echo_app_test.go)
- [e2e-tests/testdata/echo/echo/encore.gen.cue](e2e-tests/testdata/echo/echo/encore.gen.cue)
- [e2e-tests/testscript_test.go](e2e-tests/testscript_test.go)
- [pkg/errinsrc/internal/cuelocation.go](pkg/errinsrc/internal/cuelocation.go)
- [pkg/errinsrc/srcrender_test.go](pkg/errinsrc/srcrender_test.go)
- [proto/encore/daemon/daemon.pb.go](proto/encore/daemon/daemon.pb.go)
- [proto/encore/daemon/daemon.proto](proto/encore/daemon/daemon.proto)
- [proto/encore/daemon/daemon_grpc.pb.go](proto/encore/daemon/daemon_grpc.pb.go)

</details>



This document covers the core runtime systems that power Encore applications during local development and execution. These systems orchestrate application lifecycle management, process execution, configuration management, and infrastructure coordination.

For information about the daemon service that coordinates these runtime systems, see [Daemon Service](#2.1). For details about API gateway and request processing, see [API Gateway and Request Processing](#2.2). For specifics about application execution mechanics, see [Application Execution](#2.3).

## Runtime Architecture Overview

The Encore runtime systems consist of several interconnected components that work together to execute and manage applications:

```mermaid
graph TB
    subgraph "CLI Layer"
        CLI["CLI Commands"]
    end
    
    subgraph "Daemon Layer"
        Server["daemon.Server"]
        RunMgr["run.Manager"]
    end
    
    subgraph "Execution Layer"
        Run["run.Run"]
        ProcGroup["run.ProcGroup"]
        ConfigGen["RuntimeConfigGenerator"]
    end
    
    subgraph "Infrastructure Layer"
        ResourceMgr["infra.ResourceManager"]
        SvcProxy["svcproxy.SvcProxy"]
        DBCluster["Database Clusters"]
        PubSub["PubSub Systems"]
        Redis["Redis Servers"]
    end
    
    subgraph "Application Layer"
        AppProcess["Application Processes"]
        Gateway["API Gateway Processes"]
    end
    
    CLI --> Server
    Server --> RunMgr
    RunMgr --> Run
    Run --> ProcGroup
    Run --> ConfigGen
    Run --> ResourceMgr
    ResourceMgr --> SvcProxy
    ResourceMgr --> DBCluster
    ResourceMgr --> PubSub
    ResourceMgr --> Redis
    ProcGroup --> AppProcess
    ProcGroup --> Gateway
```

Sources: [cli/daemon/daemon.go:42-61](), [cli/daemon/run/run.go:50-69](), [cli/daemon/run/infra]()

The runtime architecture follows a layered approach where each layer has specific responsibilities:

| Layer | Components | Responsibilities |
|-------|------------|------------------|
| CLI Layer | `CLI Commands` | User interface for runtime operations |
| Daemon Layer | `daemon.Server`, `run.Manager` | Coordination and lifecycle management |
| Execution Layer | `run.Run`, `run.ProcGroup`, `RuntimeConfigGenerator` | Process execution and configuration |
| Infrastructure Layer | `infra.ResourceManager`, various infrastructure services | Resource provisioning and management |
| Application Layer | Application and gateway processes | Actual running application code |

## Application Lifecycle Management

The application lifecycle is managed through the `run.Manager` and individual `run.Run` instances. Each running application goes through several phases:

```mermaid
graph TD
    Start["mgr.Start()"] --> Parse["Parse Application"]
    Parse --> InfraStart["Start Infrastructure"]
    InfraStart --> Compile["Compile Application"]
    Compile --> GenConfig["Generate Runtime Config"]
    GenConfig --> StartProc["Start Process Group"]
    StartProc --> Serve["Serve HTTP Requests"]
    
    Serve --> Reload["Reload (on changes)"]
    Reload --> Parse
    
    Serve --> Stop["Stop Application"]
    Stop --> Cleanup["Cleanup Resources"]
    
    subgraph "Build Phase"
        Parse
        Compile
    end
    
    subgraph "Runtime Phase"
        GenConfig
        StartProc
        Serve
    end
    
    subgraph "Infrastructure Phase"
        InfraStart
        Cleanup
    end
```

Sources: [cli/daemon/run/run.go:149-204](), [cli/daemon/run/run.go:324-496]()

The `run.Run` struct represents a single instance of a running application and contains:

- **ID**: Unique identifier for the run instance
- **App**: Reference to the application being run  
- **ResourceManager**: Manages infrastructure dependencies
- **SvcProxy**: Service proxy for inter-service communication
- **Builder**: Language-specific builder implementation
- **ProcGroup**: Manages the actual OS processes

Sources: [cli/daemon/run/run.go:50-69]()

## Process Execution Models

Encore supports two different process execution models depending on the application structure:

```mermaid
graph TB
    subgraph "Single Process Model"
        SingleBinary["Single Binary"]
        SingleGateway["Built-in Gateway"]
        SingleServices["All Services"]
        
        SingleBinary --> SingleGateway
        SingleBinary --> SingleServices
    end
    
    subgraph "Multi-Process Model"
        ServiceA["Service A Process"]
        ServiceB["Service B Process"]
        GatewayProc["Gateway Process"]
        
        GatewayProc --> ServiceA
        GatewayProc --> ServiceB
    end
    
    subgraph "Configuration"
        ConfigGen["RuntimeConfigGenerator"]
        AllInOne["AllInOneProc()"]
        PerService["ProcPerService()"]
        
        ConfigGen --> AllInOne
        ConfigGen --> PerService
    end
    
    AllInOne --> SingleBinary
    PerService --> ServiceA
    PerService --> ServiceB
    PerService --> GatewayProc
```

Sources: [cli/daemon/run/run.go:563-646](), [cli/daemon/run/run.go:821-826]()

The choice between execution models is determined by the `isSingleProc()` function, which checks if there's only one build output with one entrypoint. The `RuntimeConfigGenerator` handles configuration for both models:

- **Single Process**: Uses `AllInOneProc()` to generate unified configuration
- **Multi-Process**: Uses `ProcPerService()` to generate per-service configurations

Sources: [cli/daemon/run/run.go:821-826](), [cli/daemon/run/run.go:563-584](), [cli/daemon/run/run.go:586-646]()

## Configuration and Environment Management

The runtime configuration system generates environment variables and configuration data that applications need to run properly:

```mermaid
graph LR
    subgraph "Configuration Sources"
        Secrets["Application Secrets"]
        ServiceConfigs["Service Configs"]
        InfraConfig["Infrastructure Config"]
        EnvVars["Environment Variables"]
    end
    
    subgraph "Configuration Generation"
        ConfigGen["RuntimeConfigGenerator"]
        ProcConfig["ProcConfig"]
        ProcEnvs["ProcEnvs()"]
    end
    
    subgraph "Configuration Targets"
        AppEnv["Application Environment"]
        Gateway["Gateway Environment"]
        Services["Service Environments"]
    end
    
    Secrets --> ConfigGen
    ServiceConfigs --> ConfigGen
    InfraConfig --> ConfigGen
    EnvVars --> ConfigGen
    
    ConfigGen --> ProcConfig
    ProcConfig --> ProcEnvs
    
    ProcEnvs --> AppEnv
    ProcEnvs --> Gateway
    ProcEnvs --> Services
```

Sources: [cli/daemon/run/run.go:430-447](), [cli/daemon/run/run.go:571-580](), [cli/daemon/run/run.go:748-773]()

The `RuntimeConfigGenerator` creates different configuration profiles based on the execution context:

- **Development Environment**: Local database connections, debug settings
- **Test Environment**: Test-specific configurations and isolated resources  
- **Script Execution**: Minimal configuration for running scripts

Sources: [cli/daemon/run/tests.go:194-210](), [cli/daemon/run/exec_script.go:188-201]()

## Infrastructure Coordination

The runtime systems coordinate with various infrastructure services through the `infra.ResourceManager`:

```mermaid
graph TB
    subgraph "Resource Manager"
        ResourceMgr["infra.ResourceManager"]
        StartServices["StartRequiredServices()"]
        StopAll["StopAll()"]
    end
    
    subgraph "Infrastructure Services"
        DBCluster["Database Clusters"]
        NSQ["NSQ PubSub"]
        Redis["Redis Server"]
        Objects["Object Storage"]
    end
    
    subgraph "Service Discovery"
        SvcProxy["svcproxy.SvcProxy"]
        Namespace["namespace.Namespace"]
    end
    
    subgraph "Application Dependencies"
        ParseMeta["Application Metadata"]
        Jobs["Async Jobs"]
    end
    
    ParseMeta --> StartServices
    StartServices --> DBCluster
    StartServices --> NSQ
    StartServices --> Redis
    StartServices --> Objects
    
    ResourceMgr --> SvcProxy
    ResourceMgr --> Namespace
    
    Jobs --> StartServices
    StopAll --> DBCluster
    StopAll --> NSQ
    StopAll --> Redis
```

Sources: [cli/daemon/run/run.go:162-163](), [cli/daemon/run/run.go:399](), [cli/daemon/run/run.go:210-212]()

The infrastructure coordination follows an asynchronous model where services are started concurrently:

1. **Metadata Parsing**: Extract infrastructure requirements from application metadata
2. **Async Job Scheduling**: Start infrastructure services in parallel using `optracker.NewAsyncBuildJobs`
3. **Service Registration**: Register services with the service proxy for discovery
4. **Configuration Generation**: Create service-specific configurations
5. **Process Startup**: Start application processes with proper infrastructure connections

Sources: [cli/daemon/run/run.go:336-442](), [cli/daemon/run/tests.go:162-170]()

## Request Flow Through Runtime Systems

HTTP requests flow through multiple layers of the runtime system before reaching application code:

```mermaid
sequenceDiagram
    participant Client
    participant HTTPServer as "HTTP Server"
    participant Run as "run.Run"
    participant ProcGroup as "run.ProcGroup"
    participant Gateway as "Gateway Process"
    participant Service as "Service Process"
    
    Client->>HTTPServer: "HTTP Request"
    HTTPServer->>Run: "ServeHTTP()"
    Run->>ProcGroup: "ProxyReq()"
    ProcGroup->>Gateway: "Forward Request"
    Gateway->>Service: "Route to Service"
    Service->>Gateway: "Service Response"
    Gateway->>ProcGroup: "Gateway Response"
    ProcGroup->>Run: "Process Response"
    Run->>HTTPServer: "HTTP Response"
    HTTPServer->>Client: "Response"
```

Sources: [cli/daemon/run/run.go:288](), [e2e-tests/echo_app_test.go:117-120]()

The runtime system provides several testing and debugging capabilities:

- **Health Checks**: Built-in `/__encore/healthz` endpoint for service health monitoring
- **Test Integration**: Special test headers like `TestHeaderDisablePlatformAuth` for testing scenarios
- **Log Streaming**: Real-time log streaming through the daemon's stream logging system

Sources: [e2e-tests/app_test.go:132-145](), [e2e-tests/testscript_test.go:154-156](), [cli/daemon/daemon.go:248-344]()

The core runtime systems provide a robust foundation for developing, testing, and running Encore applications with automatic infrastructure management, flexible deployment models, and comprehensive development tooling.

---

# Page: Daemon Service

# Daemon Service

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [cli/cmd/encore/app/create.go](cli/cmd/encore/app/create.go)
- [cli/cmd/encore/app/create_form.go](cli/cmd/encore/app/create_form.go)
- [cli/cmd/encore/app/create_test.go](cli/cmd/encore/app/create_test.go)
- [cli/cmd/encore/app/initialize.go](cli/cmd/encore/app/initialize.go)
- [cli/cmd/encore/build.go](cli/cmd/encore/build.go)
- [cli/cmd/encore/daemon/daemon.go](cli/cmd/encore/daemon/daemon.go)
- [cli/cmd/encore/gen.go](cli/cmd/encore/gen.go)
- [cli/daemon/daemon.go](cli/daemon/daemon.go)
- [e2e-tests/echo_app_test.go](e2e-tests/echo_app_test.go)
- [e2e-tests/testdata/echo/echo/encore.gen.cue](e2e-tests/testdata/echo/echo/encore.gen.cue)
- [e2e-tests/testscript_test.go](e2e-tests/testscript_test.go)
- [internal/env/env.go](internal/env/env.go)
- [internal/version/version.go](internal/version/version.go)
- [pkg/eerror/stack.go](pkg/eerror/stack.go)
- [pkg/errinsrc/internal/cuelocation.go](pkg/errinsrc/internal/cuelocation.go)
- [pkg/errinsrc/srcrender_test.go](pkg/errinsrc/srcrender_test.go)
- [proto/encore/daemon/daemon.pb.go](proto/encore/daemon/daemon.pb.go)
- [proto/encore/daemon/daemon.proto](proto/encore/daemon/daemon.proto)
- [proto/encore/daemon/daemon_grpc.pb.go](proto/encore/daemon/daemon_grpc.pb.go)

</details>



The Encore Daemon Service is the central orchestrator for local development environments in the Encore framework. It acts as a persistent background service that coordinates multiple subsystems including application runtime, database management, infrastructure services, and developer tooling. The daemon provides a unified gRPC interface for CLI commands and manages the lifecycle of local development infrastructure.

For information about application execution and runtime management, see [Application Execution](#2.3). For details about the CLI interface that communicates with the daemon, see [CLI Interface](#4.1).

## Architecture Overview

The daemon follows a multi-listener architecture where different services are exposed on separate TCP ports. The core daemon process manages multiple subsystems through a central coordination layer.

```mermaid
graph TB
    subgraph "Daemon Process"
        DaemonCore["Daemon struct<br/>(daemon.go:97-125)"]
        
        subgraph "Network Listeners"
            UnixSocket["Unix Socket<br/>encored.sock"]
            RuntimePort["Runtime HTTP<br/>:9600"]
            DBProxyPort["DB Proxy<br/>:9500"] 
            DashPort["Dashboard<br/>:9400"]
            DebugPort["Debug pprof<br/>:9700"]
            ObjectsPort["Object Storage<br/>:9800"]
            MCPPort["MCP SSE<br/>:9900"]
        end
        
        subgraph "Core Managers"
            AppsManager["Apps Manager<br/>apps.Manager"]
            RunManager["Run Manager<br/>run.Manager"]
            ClusterManager["Cluster Manager<br/>sqldb.ClusterManager"]
            SecretManager["Secret Manager<br/>secret.Manager"]
            NSManager["Namespace Manager<br/>namespace.Manager"]
            MCPManager["MCP Manager<br/>mcp.Manager"]
        end
        
        subgraph "Storage & State"
            EncoreDB["EncoreDB<br/>SQLite"]
            TraceStore["Trace Store<br/>trace2.Store"]
        end
    end
    
    CLI["Encore CLI"] --> UnixSocket
    Browser["Browser"] --> DashPort
    Apps["Running Apps"] --> RuntimePort
    DBClients["DB Clients"] --> DBProxyPort
    
    DaemonCore --> AppsManager
    DaemonCore --> RunManager
    DaemonCore --> ClusterManager
    DaemonCore --> SecretManager
    DaemonCore --> NSManager
    DaemonCore --> MCPManager
    
    AppsManager --> EncoreDB
    NSManager --> EncoreDB
    RunManager --> TraceStore
```

Sources: [cli/cmd/encore/daemon/daemon.go:97-125](), [cli/cmd/encore/daemon/daemon.go:127-184]()

## Core Components

### Daemon Struct and Initialization

The `Daemon` struct serves as the central coordinator, containing network listeners and manager instances for each subsystem:

| Component | Type | Purpose |
|-----------|------|---------|
| `Daemon` | `*net.UnixListener` | gRPC API endpoint for CLI communication |
| `Runtime` | `*retryingTCPListener` | HTTP server for application runtime |
| `DBProxy` | `*retryingTCPListener` | Database proxy for local/remote DB access |
| `Dash` | `*retryingTCPListener` | Web-based developer dashboard |
| `Debug` | `*retryingTCPListener` | pprof debugging endpoints |
| `Apps` | `*apps.Manager` | Application lifecycle management |
| `RunMgr` | `*run.Manager` | Process execution and monitoring |
| `ClusterMgr` | `*sqldb.ClusterManager` | Database cluster coordination |

Sources: [cli/cmd/encore/daemon/daemon.go:97-125]()

### Network Service Architecture

The daemon exposes multiple network services, each handling specific responsibilities:

```mermaid
graph LR
    subgraph "Client Connections"
        CLI["CLI Commands"]
        WebBrowser["Web Browser"]
        RunningApp["Running Applications"]
        DBTools["Database Tools"]
    end
    
    subgraph "Daemon Listeners"
        UnixGRPC["Unix Socket<br/>gRPC Server<br/>daemon.Server"]
        RuntimeHTTP["Runtime HTTP<br/>engine.Server"]
        DashHTTP["Dashboard HTTP<br/>dash.Server"]
        ProxyTCP["DB Proxy TCP<br/>ClusterMgr.ServeProxy"]
        DebugHTTP["Debug HTTP<br/>pprof handlers"]
        ObjectHTTP["Object Storage<br/>PublicBucketServer"]
        MCPSSE["MCP SSE<br/>MCPMgr.Serve"]
    end
    
    CLI --> UnixGRPC
    WebBrowser --> DashHTTP
    RunningApp --> RuntimeHTTP
    DBTools --> ProxyTCP
    WebBrowser --> DebugHTTP
    RunningApp --> ObjectHTTP
    WebBrowser --> MCPSSE
```

Sources: [cli/cmd/encore/daemon/daemon.go:186-194](), [cli/cmd/encore/daemon/daemon.go:252-297]()

## gRPC Service Interface

The daemon exposes its functionality through a comprehensive gRPC interface defined in the `Daemon` service. The main command categories include:

### Application Lifecycle Commands

| RPC Method | Request Type | Response Type | Purpose |
|------------|--------------|---------------|---------|
| `Run` | `RunRequest` | `stream CommandMessage` | Start application with live reload |
| `Test` | `TestRequest` | `stream CommandMessage` | Execute test suites |
| `Check` | `CheckRequest` | `stream CommandMessage` | Validate application code |
| `ExecScript` | `ExecScriptRequest` | `stream CommandMessage` | Run one-off scripts |
| `Export` | `ExportRequest` | `stream CommandMessage` | Build deployment artifacts |

### Code Generation Commands

| RPC Method | Request Type | Response Type | Purpose |
|------------|--------------|---------------|---------|
| `GenClient` | `GenClientRequest` | `GenClientResponse` | Generate API clients |
| `GenWrappers` | `GenWrappersRequest` | `GenWrappersResponse` | Generate runtime wrappers |

### Infrastructure Management

| RPC Method | Request Type | Response Type | Purpose |
|------------|--------------|---------------|---------|
| `DBConnect` | `DBConnectRequest` | `DBConnectResponse` | Get database connection DSN |
| `DBProxy` | `DBProxyRequest` | `stream CommandMessage` | Start database proxy |
| `DBReset` | `DBResetRequest` | `stream CommandMessage` | Reset database state |

Sources: [proto/encore/daemon/daemon.proto:9-55]()

## Subsystem Coordination

### Manager Initialization and Dependencies

The daemon initializes its subsystems in a specific order to handle dependencies correctly:

```mermaid
graph TD
    DaemonInit["Daemon.init()"] --> NetworkSetup["Setup Network Listeners"]
    NetworkSetup --> DBInit["Open EncoreDB<br/>(SQLite)"]
    DBInit --> AppsInit["Initialize Apps Manager"]
    AppsInit --> NSInit["Initialize Namespace Manager"] 
    NSInit --> SecretInit["Initialize Secret Manager"]
    SecretInit --> ClusterInit["Initialize ClusterMgr<br/>(sqldb.ClusterManager)"]
    ClusterInit --> ObjectsInit["Initialize ObjectsMgr"]
    ObjectsInit --> TraceInit["Initialize Trace Store"]
    TraceInit --> RunInit["Initialize RunMgr"]
    RunInit --> MCPInit["Initialize MCPMgr"]
    MCPInit --> ServerInit["Initialize daemon.Server"]
    ServerInit --> RegisterHandlers["Register Deletion Handlers"]
    
    NSInit --> ClusterInit
    NSInit --> RunInit
    NSInit --> ObjectsInit
```

Sources: [cli/cmd/encore/daemon/daemon.go:127-184]()

### Command Streaming and Process Management

The daemon uses streaming gRPC responses for long-running commands like `Run` and `Test`. The `streamLog` type coordinates output between multiple managers:

```mermaid
sequenceDiagram
    participant CLI
    participant DaemonServer
    participant StreamLog
    participant RunManager
    participant Process
    
    CLI->>DaemonServer: Run(RunRequest)
    DaemonServer->>StreamLog: Create streamLog
    DaemonServer->>RunManager: Start process
    RunManager->>Process: Execute application
    
    loop Process Output
        Process->>RunManager: stdout/stderr
        RunManager->>StreamLog: Write output
        StreamLog->>CLI: CommandMessage{Output}
    end
    
    Process->>RunManager: Exit
    RunManager->>StreamLog: Exit code
    StreamLog->>CLI: CommandMessage{Exit}
```

Sources: [cli/daemon/daemon.go:280-344]()

## Database and Storage Management

The daemon manages persistent state through SQLite and coordinates database access for applications:

### Database Schema and Migrations

The daemon maintains its own SQLite database for storing application metadata, namespace information, and configuration. Database migrations are handled automatically:

```mermaid
graph TB
    subgraph "Daemon Database (SQLite)"
        AppTable["apps table<br/>(apps.Manager)"]
        NSTable["namespaces table<br/>(namespace.Manager)"]
        TraceTable["traces table<br/>(trace2.Store)"]
        MigrationTable["schema_migrations<br/>(golang-migrate)"]
    end
    
    subgraph "Migration System"
        EmbeddedMigrations["Embedded migrations<br/>(migrations/*.sql)"]
        MigrationRunner["golang-migrate<br/>runner"]
    end
    
    EmbeddedMigrations --> MigrationRunner
    MigrationRunner --> MigrationTable
    
    AppTable --> EncoreDB
    NSTable --> EncoreDB
    TraceTable --> EncoreDB
    MigrationTable --> EncoreDB
```

Sources: [cli/cmd/encore/daemon/daemon.go:314-344](), [cli/cmd/encore/daemon/daemon.go:346-404]()

### Application Database Coordination

The daemon coordinates database access for running applications through the `ClusterManager`:

```mermaid
graph TB
    subgraph "Application Database Flow"
        App["Running Application"]
        DBProxy["DB Proxy<br/>(:9500)"]
        ClusterMgr["sqldb.ClusterManager"]
        
        subgraph "Database Backends"
            DockerDB["Docker PostgreSQL<br/>(local development)"]
            ExternalDB["External PostgreSQL<br/>(ENCORE_SQLDB_HOST)"]
        end
    end
    
    App --> DBProxy
    DBProxy --> ClusterMgr
    ClusterMgr --> DockerDB
    ClusterMgr --> ExternalDB
    
    NSMgr["Namespace Manager"] --> ClusterMgr
    SecretMgr["Secret Manager"] --> ClusterMgr
```

Sources: [cli/cmd/encore/daemon/daemon.go:140-156]()

## Lifecycle and Error Handling

### Daemon Startup and Shutdown

The daemon implements graceful startup and shutdown with proper resource cleanup:

```mermaid
stateDiagram-v2
    [*] --> Starting
    Starting --> Initializing: runMain()
    Initializing --> Listening: d.serve()
    Listening --> Running: All services started
    
    Running --> Shutdown: Signal/Error
    Shutdown --> Cleanup: d.closeAll()
    Cleanup --> [*]: Exit
    
    Starting --> Error: Init failure
    Initializing --> Error: Setup failure
    Error --> Cleanup: handleBailout
    Cleanup --> [*]: Fatal exit
```

The daemon monitors for Unix socket changes to detect when it should shut down, allowing for daemon replacement during updates.

Sources: [cli/cmd/encore/daemon/daemon.go:72-94](), [cli/cmd/encore/daemon/daemon.go:440-448](), [cli/cmd/encore/daemon/daemon.go:406-438]()

---

# Page: API Gateway and Request Processing

# API Gateway and Request Processing

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [runtimes/core/src/api/auth/local.rs](runtimes/core/src/api/auth/local.rs)
- [runtimes/core/src/api/call.rs](runtimes/core/src/api/call.rs)
- [runtimes/core/src/api/endpoint.rs](runtimes/core/src/api/endpoint.rs)
- [runtimes/core/src/api/error.rs](runtimes/core/src/api/error.rs)
- [runtimes/core/src/api/gateway/mod.rs](runtimes/core/src/api/gateway/mod.rs)
- [runtimes/core/src/api/gateway/router.rs](runtimes/core/src/api/gateway/router.rs)
- [runtimes/core/src/api/manager.rs](runtimes/core/src/api/manager.rs)
- [runtimes/core/src/api/mod.rs](runtimes/core/src/api/mod.rs)
- [runtimes/core/src/api/server.rs](runtimes/core/src/api/server.rs)
- [runtimes/core/src/trace/eventbuf.rs](runtimes/core/src/trace/eventbuf.rs)
- [runtimes/core/src/trace/protocol.rs](runtimes/core/src/trace/protocol.rs)
- [runtimes/js/encore.dev/api/error.ts](runtimes/js/encore.dev/api/error.ts)
- [runtimes/js/encore.dev/api/mod.ts](runtimes/js/encore.dev/api/mod.ts)
- [runtimes/js/encore.dev/internal/api/mod.ts](runtimes/js/encore.dev/internal/api/mod.ts)
- [runtimes/js/encore.dev/mod.ts](runtimes/js/encore.dev/mod.ts)
- [runtimes/js/src/error.rs](runtimes/js/src/error.rs)
- [runtimes/js/src/log.rs](runtimes/js/src/log.rs)
- [runtimes/js/src/pvalue.rs](runtimes/js/src/pvalue.rs)
- [runtimes/js/src/runtime.rs](runtimes/js/src/runtime.rs)
- [tsparser/src/builder/codegen.rs](tsparser/src/builder/codegen.rs)
- [tsparser/src/builder/templates/catalog/auth/auth_ts.handlebars](tsparser/src/builder/templates/catalog/auth/auth_ts.handlebars)
- [tsparser/src/builder/templates/catalog/clients/endpoints_d_ts.handlebars](tsparser/src/builder/templates/catalog/clients/endpoints_d_ts.handlebars)
- [tsparser/src/builder/templates/catalog/clients/endpoints_js.handlebars](tsparser/src/builder/templates/catalog/clients/endpoints_js.handlebars)
- [tsparser/src/builder/templates/catalog/clients/endpoints_testing_js.handlebars](tsparser/src/builder/templates/catalog/clients/endpoints_testing_js.handlebars)
- [tsparser/src/legacymeta/mod.rs](tsparser/src/legacymeta/mod.rs)
- [tsparser/src/parser/resources/apis/api.rs](tsparser/src/parser/resources/apis/api.rs)
- [tsparser/src/parser/usageparser/mod.rs](tsparser/src/parser/usageparser/mod.rs)

</details>



This document covers Encore's API Gateway system and how HTTP requests are processed, routed, and forwarded to backend services. The gateway serves as the entry point for external traffic, handling authentication, CORS, routing, and proxying requests to appropriate upstream services.

For information about how individual API endpoints are defined and handled within services, see [API Definition and Handlers](#3.3). For details about the overall application execution environment, see [Application Execution](#2.3).

## Gateway Architecture

The Encore API Gateway is built on Cloudflare's Pingora HTTP proxy framework and serves as a reverse proxy that routes external requests to internal services. The gateway is implemented as a separate component from the API server that handles direct service-to-service communication.

```mermaid
graph TB
    subgraph "External Clients"
        Browser["Web Browser"]
        Mobile["Mobile App"]
        API["API Client"]
    end
    
    subgraph "Gateway Layer"
        Gateway["Gateway<br/>(Pingora-based)"]
        Router["Router<br/>(matchit)"]
        CORS["CorsHeadersConfig"]
        AuthHandler["auth::Authenticator"]
    end
    
    subgraph "Service Registry"
        ServiceRegistry["ServiceRegistry"]
        ServiceDiscovery["ServiceDiscovery"]
    end
    
    subgraph "Backend Services"
        ServiceA["Service A<br/>(:8081)"]
        ServiceB["Service B<br/>(:8082)"]
        ServiceC["Service C<br/>(:8083)"]
    end
    
    Browser --> Gateway
    Mobile --> Gateway
    API --> Gateway
    
    Gateway --> Router
    Gateway --> CORS
    Gateway --> AuthHandler
    Gateway --> ServiceRegistry
    
    ServiceRegistry --> ServiceDiscovery
    
    Router --> ServiceA
    Router --> ServiceB
    Router --> ServiceC
```

The main gateway component is the `Gateway` struct which implements the Pingora `ProxyHttp` trait to handle HTTP proxy functionality.

Sources: [runtimes/core/src/api/gateway/mod.rs:35-48](), [runtimes/core/src/api/manager.rs:58-61]()

## Request Processing Pipeline

Request processing follows a structured pipeline through several Pingora filter methods. Each stage handles specific aspects of the request lifecycle:

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant Router
    participant Auth as "auth::Authenticator"
    participant ServiceRegistry
    participant Upstream as "Backend Service"
    
    Client->>Gateway: "HTTP Request"
    
    Note over Gateway: "request_filter()"
    Gateway->>Gateway: "Check healthz endpoint"
    Gateway->>Gateway: "Handle OPTIONS (CORS preflight)"
    
    Note over Gateway: "upstream_peer()"
    Gateway->>Router: "route_to_service(method, path)"
    Router-->>Gateway: "Target{service_name, requires_auth}"
    Gateway->>ServiceRegistry: "service_base_url(service_name)"
    ServiceRegistry-->>Gateway: "upstream URL"
    Gateway->>Gateway: "Create HttpPeer"
    
    Note over Gateway: "upstream_request_filter()"
    Gateway->>Gateway: "Prepend base path"
    Gateway->>Gateway: "Set X-Forwarded-* headers"
    Gateway->>Auth: "authenticate(request)"
    Auth-->>Gateway: "AuthResponse"
    Gateway->>Gateway: "Add request metadata"
    
    Gateway->>Upstream: "Proxy request"
    Upstream-->>Gateway: "Response"
    
    Note over Gateway: "response_filter()"
    Gateway->>Gateway: "Apply CORS headers"
    
    Gateway-->>Client: "HTTP Response"
```

The pipeline implements these key stages:

1. **`request_filter`** - Handles special endpoints like health checks and CORS preflight requests
2. **`upstream_peer`** - Determines which backend service should handle the request
3. **`upstream_request_filter`** - Modifies the request before forwarding (auth, headers, metadata)
4. **`response_filter`** - Processes the response before returning to client
5. **`fail_to_proxy`** - Handles error cases with appropriate HTTP status codes

Sources: [runtimes/core/src/api/gateway/mod.rs:154-426]()

## Routing System

The routing system maps incoming HTTP requests to backend services using a two-tier router structure implemented with the `matchit` crate for efficient path matching.

```mermaid
graph TB
    subgraph "Router Structure"
        Router["router::Router"]
        MainRouter["main: matchit::Router<MethodRoute>"]
        FallbackRouter["fallback: matchit::Router<MethodRoute>"]
    end
    
    subgraph "MethodRoute"
        GET["get: Option<Target>"]
        POST["post: Option<Target>"]
        PUT["put: Option<Target>"]
        DELETE["delete: Option<Target>"]
        OTHER["head, options, trace, patch..."]
    end
    
    subgraph "Target"
        ServiceName["service_name: EncoreName"]
        RequiresAuth["requires_auth: bool"]
    end
    
    Router --> MainRouter
    Router --> FallbackRouter
    MainRouter --> MethodRoute
    FallbackRouter --> MethodRoute
    MethodRoute --> GET
    MethodRoute --> POST
    MethodRoute --> PUT
    MethodRoute --> DELETE
    MethodRoute --> OTHER
    GET --> Target
    POST --> Target
    PUT --> Target
    DELETE --> Target
    OTHER --> Target
    Target --> ServiceName
    Target --> RequiresAuth
```

The router handles:

- **Path Matching**: Uses `matchit` for efficient radix tree-based path matching with parameter extraction
- **Method Routing**: Each path can handle different HTTP methods with different target services
- **Fallback Routes**: Separate router for catch-all patterns and trailing slash redirection
- **TSR Support**: Trailing slash redirection for paths that support it

Path registration occurs during gateway initialization, where endpoints from the `PathSet` are converted into router entries with their supported HTTP methods.

Sources: [runtimes/core/src/api/gateway/router.rs:8-64](), [runtimes/core/src/api/paths.rs]()

## Authentication and Authorization

The gateway integrates with Encore's authentication system to validate requests before proxying them to backend services. Authentication is handled through the `auth::Authenticator` component.

```mermaid
graph TB
    subgraph "Authentication Flow"
        Request["Incoming Request"]
        AuthCheck["auth_handler.authenticate()"]
        Decision{"Authentication Required?"}
        AuthResult{"Auth Success?"}
        Proxy["Proxy to Service"]
        Error401["Return 401 Unauthenticated"]
    end
    
    subgraph "AuthResponse Types"
        Authenticated["Authenticated{auth_uid, auth_data}"]
        Unauthenticated["Unauthenticated{error}"]
    end
    
    subgraph "Request Metadata"
        CallMeta["CallMeta::parse_with_caller()"]
        AuthUID["auth_user_id: Option<String>"]
        AuthData["auth_data: Option<PValues>"]
    end
    
    Request --> Decision
    Decision -->|"endpoint.requires_auth = true"| AuthCheck
    Decision -->|"endpoint.requires_auth = false"| Proxy
    AuthCheck --> AuthResult
    AuthResult -->|"AuthResponse::Authenticated"| Authenticated
    AuthResult -->|"AuthResponse::Unauthenticated"| Unauthenticated
    Authenticated --> CallMeta
    Unauthenticated --> Error401
    CallMeta --> AuthUID
    CallMeta --> AuthData
    AuthUID --> Proxy
    AuthData --> Proxy
```

The authentication process:

1. **Auth Requirement Check**: The router target indicates if authentication is required
2. **Authentication Execution**: If required, the gateway calls the configured auth handler
3. **Response Processing**: Auth success provides user ID and auth data; failure returns 401
4. **Metadata Injection**: Authentication information is added to request headers for the upstream service

Authentication data and user information are encoded into request metadata that gets forwarded to the target service.

Sources: [runtimes/core/src/api/gateway/mod.rs:398-422](), [runtimes/core/src/api/auth/mod.rs]()

## Service Discovery and Upstream Selection

The gateway uses a `ServiceRegistry` to determine where to proxy requests based on the target service identified by the router.

```mermaid
graph TB
    subgraph "Service Discovery"
        Router["Router.route_to_service()"]
        Target["Target{service_name}"]
        ServiceRegistry["ServiceRegistry"]
        BaseUrls["base_urls: HashMap<EncoreName, String>"]
        ServiceAuth["service_auth: HashMap<EncoreName, Arc<ServiceAuthMethod>>"]
    end
    
    subgraph "Upstream Resolution"
        BaseUrl["service_base_url()"]
        UrlParse["Url::parse()"]
        SocketAddrs["url.socket_addrs()"]
        HttpPeer["HttpPeer::new()"]
    end
    
    subgraph "Special Cases"
        PubSubProxy["PubSub Push Proxy<br/>/__encore/pubsub/push/*"]
        OwnAPI["Own API Address<br/>/__encore/*"]
        ExternalService["External Service"]
    end
    
    Router --> Target
    Target --> ServiceRegistry
    ServiceRegistry --> BaseUrls
    ServiceRegistry --> ServiceAuth
    
    BaseUrls --> BaseUrl
    BaseUrl --> UrlParse
    UrlParse --> SocketAddrs
    SocketAddrs --> HttpPeer
    
    ServiceRegistry --> PubSubProxy
    ServiceRegistry --> OwnAPI
    ServiceRegistry --> ExternalService
```

The upstream selection process:

1. **Service Resolution**: Router provides the target service name from path matching
2. **URL Lookup**: ServiceRegistry maps service names to base URLs from service discovery
3. **Address Resolution**: Base URLs are resolved to socket addresses for connection
4. **Peer Creation**: HttpPeer objects are created for Pingora to proxy the request

Special routing cases:
- **PubSub Push**: Routes `/__encore/pubsub/push/*` to appropriate service based on subscription mapping
- **Own API**: Routes `/__encore/*` to the local API server when available
- **Service-to-Service**: Routes regular API calls between services

Sources: [runtimes/core/src/api/gateway/mod.rs:195-275](), [runtimes/core/src/api/call.rs:28-97]()

## Response Processing

The gateway processes responses from upstream services before returning them to clients, primarily handling CORS headers and error formatting.

```mermaid
graph LR
    subgraph "Response Pipeline"
        UpstreamResp["Upstream Response"]
        ResponseFilter["response_filter()"]
        CORSHeaders["Apply CORS Headers"]
        ErrorHandler["fail_to_proxy()"]
        ClientResp["Client Response"]
    end
    
    subgraph "Error Handling"
        APIError["api::Error"]
        ExternalError["ExternalError"]
        ErrorResponse["HTTP Error Response"]
    end
    
    subgraph "CORS Processing"
        CorsConfig["CorsHeadersConfig"]
        RequestHeaders["Origin, Method Headers"]
        ResponseHeaders["Access-Control-* Headers"]
    end
    
    UpstreamResp --> ResponseFilter
    ResponseFilter --> CORSHeaders
    CORSHeaders --> CorsConfig
    CorsConfig --> RequestHeaders
    RequestHeaders --> ResponseHeaders
    ResponseHeaders --> ClientResp
    
    UpstreamResp -->|"Error"| ErrorHandler
    ErrorHandler --> APIError
    APIError --> ExternalError
    ExternalError --> ErrorResponse
    ErrorResponse --> ClientResp
```

Key response processing features:

- **CORS Header Application**: The `CorsHeadersConfig` applies appropriate CORS headers based on request origin and method
- **Error Formatting**: API errors are formatted as JSON responses with appropriate HTTP status codes
- **Trace ID Injection**: Response headers include trace information for request tracking
- **Content Processing**: Responses maintain original content while adding necessary gateway headers

The gateway preserves upstream response content while adding necessary headers for browser compatibility and debugging.

Sources: [runtimes/core/src/api/gateway/mod.rs:277-293](), [runtimes/core/src/api/gateway/mod.rs:427-492](), [runtimes/core/src/api/cors/mod.rs]()

---

# Page: Application Execution

# Application Execution

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [cli/daemon/debug.go](cli/daemon/debug.go)
- [cli/daemon/export/export.go](cli/daemon/export/export.go)
- [cli/daemon/run.go](cli/daemon/run.go)
- [cli/daemon/run/check.go](cli/daemon/run/check.go)
- [cli/daemon/run/exec_script.go](cli/daemon/run/exec_script.go)
- [cli/daemon/run/run.go](cli/daemon/run/run.go)
- [cli/daemon/run/tests.go](cli/daemon/run/tests.go)
- [cli/daemon/userfacing.go](cli/daemon/userfacing.go)
- [e2e-tests/app_test.go](e2e-tests/app_test.go)

</details>



This document covers how Encore applications are executed at runtime, including the startup process, process management, runtime configuration, and infrastructure integration. For information about the build and compilation process, see [Release and Build Process](#6.2). For details about the API gateway and request routing, see [API Gateway and Request Processing](#2.2).

## Purpose and Scope

The application execution system is responsible for starting, managing, and monitoring running Encore applications in the local development environment. This includes parsing application code, starting required infrastructure services, compiling the application, generating runtime configuration, and managing one or more OS processes that serve the application. The system supports both single-process and multi-process execution models, live reloading during development, and integration with various infrastructure components like databases and message queues.

## Core Execution Model

The application execution system is built around several key components that work together to manage the application lifecycle:

```mermaid
graph TB
    subgraph "Execution Management"
        Manager["Manager<br/>Central orchestrator"]
        Run["Run<br/>Running app instance"]
        ProcGroup["ProcGroup<br/>OS process manager"]
    end
    
    subgraph "Infrastructure"
        ResourceManager["ResourceManager<br/>Infrastructure services"]
        SvcProxy["SvcProxy<br/>Service communication"]
        NS["Namespace<br/>Isolation boundary"]
    end
    
    subgraph "Configuration"
        RuntimeConfigGenerator["RuntimeConfigGenerator<br/>Runtime config"]
        Builder["Builder<br/>Language-specific"]
        ParseResult["ParseResult<br/>App metadata"]
    end
    
    subgraph "Processes"
        AllInOneProc["AllInOneProc<br/>Single process"]
        ServiceProcs["ServiceProcs<br/>Per-service processes"]
        GatewayProcs["GatewayProcs<br/>Gateway processes"]
    end
    
    Manager --> Run
    Run --> ProcGroup
    Run --> ResourceManager
    Run --> SvcProxy
    Run --> NS
    
    RuntimeConfigGenerator --> ParseResult
    Builder --> ParseResult
    
    ProcGroup --> AllInOneProc
    ProcGroup --> ServiceProcs
    ProcGroup --> GatewayProcs
    
    ResourceManager --> NS
```

**Application Execution Architecture**

The `Run` struct represents a single running application instance and contains all the necessary components for execution management.

Sources: [cli/daemon/run/run.go:50-69]()

## Application Startup Process

The application startup process follows a well-defined sequence that ensures all dependencies are available before the application begins serving requests:

```mermaid
sequenceDiagram
    participant CLI as "CLI/Daemon"
    participant Manager as "Manager"
    participant Run as "Run"
    participant Builder as "Builder"
    participant ResourceManager as "ResourceManager"
    participant ProcGroup as "ProcGroup"
    participant HTTP as "HTTP Server"
    
    CLI->>Manager: "Start(ctx, StartParams)"
    Manager->>Run: "Create Run instance"
    Manager->>Run: "start(listener, tracker)"
    
    Run->>Run: "buildAndStart(ctx, tracker, false)"
    Run->>Builder: "Parse(parseParams)"
    Builder-->>Run: "ParseResult with metadata"
    
    Run->>ResourceManager: "StartRequiredServices(jobs, meta)"
    ResourceManager-->>Run: "Infrastructure ready"
    
    Run->>Builder: "ServiceConfigs(configParams)"
    Builder-->>Run: "Service configurations"
    
    Run->>Builder: "Compile(compileParams)"
    Builder-->>Run: "CompileResult with outputs"
    
    Run->>ProcGroup: "StartProcGroup(params)"
    ProcGroup->>ProcGroup: "Configure processes"
    ProcGroup->>ProcGroup: "Start OS processes"
    ProcGroup-->>Run: "Running processes"
    
    Run->>HTTP: "Create HTTP server with h2c"
    HTTP->>HTTP: "Start serving on listener"
    
    Run-->>Manager: "Running application"
```

**Application Startup Sequence**

The startup process is orchestrated by the `buildAndStart` method which coordinates parsing, infrastructure setup, compilation, and process creation.

Sources: [cli/daemon/run/run.go:325-497](), [cli/daemon/run/run.go:149-204]()

## Process Management

Encore applications can run in either single-process or multi-process mode, depending on the application structure and build outputs:

```mermaid
graph TB
    subgraph "Process Models"
        SingleProc["Single Process Model<br/>isSingleProc(outputs)"]
        MultiProc["Multi Process Model<br/>Process per service"]
    end
    
    subgraph "Single Process"
        AllInOne["AllInOneProc<br/>All services + gateways"]
        SingleBinary["Single Binary<br/>outputs[0].entrypoints[0]"]
    end
    
    subgraph "Multi Process"
        ServiceProc1["Service Process<br/>NewProcForService()"]
        ServiceProc2["Service Process<br/>NewProcForService()"]
        GatewayProc["Gateway Process<br/>NewProcForGateway()"]
    end
    
    subgraph "Process Configuration"
        ProcConfig["ProcConfig<br/>Per-process config"]
        ProcEnvs["Environment Variables<br/>ConfigGen.ProcEnvs()"]
        RuntimeConfig["Runtime Configuration<br/>AllInOneProc() or ProcPerService()"]
    end
    
    SingleProc --> AllInOne
    AllInOne --> SingleBinary
    
    MultiProc --> ServiceProc1
    MultiProc --> ServiceProc2
    MultiProc --> GatewayProc
    
    ProcConfig --> ProcEnvs
    RuntimeConfig --> ProcConfig
```

**Process Management Models**

The system determines the execution model based on the build outputs using the `isSingleProc` function, which checks if there's only one output with one entrypoint.

Sources: [cli/daemon/run/run.go:563-646](), [cli/daemon/run/run.go:821-827]()

## Runtime Configuration Generation

The runtime configuration system generates the necessary environment variables and configuration files for each process:

```mermaid
graph TB
    subgraph "Configuration Generator"
        RuntimeConfigGenerator["RuntimeConfigGenerator<br/>Central config generator"]
        AppMetadata["App Metadata<br/>parse.Meta"]
        InfraManager["Infrastructure Manager<br/>Database connections"]
    end
    
    subgraph "Configuration Types"
        AllInOneConfig["AllInOneProc()<br/>Single process config"]
        ServiceConfigs["ProcPerService()<br/>Multi-process configs"]
        TestConfig["ForTests()<br/>Test environment"]
    end
    
    subgraph "Generated Output"
        ProcEnvs["ProcEnvs<br/>Environment variables"]
        ListenAddr["Listen Addresses<br/>Port configuration"]
        AuthKey["Authentication Keys<br/>Inter-service auth"]
        Gateways["Gateway Configuration<br/>BaseURL + hostnames"]
        Secrets["Secret Values<br/>Application secrets"]
    end
    
    RuntimeConfigGenerator --> AppMetadata
    RuntimeConfigGenerator --> InfraManager
    
    RuntimeConfigGenerator --> AllInOneConfig
    RuntimeConfigGenerator --> ServiceConfigs
    RuntimeConfigGenerator --> TestConfig
    
    AllInOneConfig --> ProcEnvs
    ServiceConfigs --> ProcEnvs
    TestConfig --> ProcEnvs
    
    ProcEnvs --> ListenAddr
    ProcEnvs --> AuthKey
    ProcEnvs --> Gateways
    ProcEnvs --> Secrets
```

**Runtime Configuration Generation Flow**

The `RuntimeConfigGenerator` creates process-specific configurations based on application metadata and infrastructure requirements.

Sources: [cli/daemon/run/run.go:542-555](), [cli/daemon/run/run.go:785-799]()

## Live Reloading

The application execution system supports live reloading during development, allowing code changes to be applied without restarting the entire development environment:

```mermaid
sequenceDiagram
    participant Watcher as "File Watcher"
    participant Run as "Run"
    participant OldProc as "Old ProcGroup"
    participant NewProc as "New ProcGroup"
    participant Listeners as "Event Listeners"
    
    Watcher->>Run: "Code change detected"
    Run->>Run: "Reload()"
    Run->>Run: "buildAndStart(ctx, nil, true)"
    
    Note over Run: "Parse, compile, and configure new process"
    
    Run->>NewProc: "StartProcGroup(params)"
    NewProc->>NewProc: "Start new processes"
    NewProc-->>Run: "New processes ready"
    
    Run->>Run: "proc.Swap(newProcess)"
    Run->>OldProc: "Close()"
    OldProc->>OldProc: "Graceful shutdown"
    
    Run->>Listeners: "OnReload(run)"
    Listeners-->>Run: "Reload complete"
```

**Live Reload Process**

The reload process creates a new `ProcGroup` with updated code while gracefully shutting down the old processes.

Sources: [cli/daemon/run/run.go:244-257](), [cli/daemon/run/run.go:477-481]()

## Infrastructure Integration

The application execution system integrates with various infrastructure components through the `ResourceManager`:

```mermaid
graph TB
    subgraph "Resource Management"
        ResourceManager["ResourceManager<br/>Infrastructure orchestrator"]
        ClusterMgr["ClusterMgr<br/>Database clusters"]
        ObjectsMgr["ObjectsMgr<br/>Object storage"]
        PublicBuckets["PublicBuckets<br/>Public object storage"]
    end
    
    subgraph "Infrastructure Services"
        PostgreSQL["PostgreSQL<br/>SQL databases"]
        NSQ["NSQ<br/>Message queues"]
        Redis["Redis<br/>Cache layer"]
        LocalStorage["Local Storage<br/>Development files"]
    end
    
    subgraph "Configuration"
        DBConnections["Database Connections<br/>Connection strings"]
        QueueConfig["Queue Configuration<br/>NSQ settings"]
        CacheConfig["Cache Configuration<br/>Redis settings"]
        StorageConfig["Storage Configuration<br/>Bucket settings"]
    end
    
    ResourceManager --> ClusterMgr
    ResourceManager --> ObjectsMgr
    ResourceManager --> PublicBuckets
    
    ClusterMgr --> PostgreSQL
    ResourceManager --> NSQ
    ResourceManager --> Redis
    ObjectsMgr --> LocalStorage
    
    PostgreSQL --> DBConnections
    NSQ --> QueueConfig
    Redis --> CacheConfig
    LocalStorage --> StorageConfig
```

**Infrastructure Integration Architecture**

The `ResourceManager` coordinates all infrastructure services required by the application, starting them as needed based on the application metadata.

Sources: [cli/daemon/run/run.go:163](), [cli/daemon/run/run.go:399]()

## Testing and Script Execution

The execution system provides specialized modes for running tests and executing scripts within the application context:

### Test Execution

```mermaid
graph LR
    subgraph "Test Execution"
        TestParams["TestParams<br/>Test configuration"]
        TestSpec["TestSpec<br/>Command specification"]
        ResourceManager["ResourceManager<br/>Test infrastructure"]
        TestEnv["Test Environment<br/>Isolated execution"]
    end
    
    TestParams --> TestSpec
    TestSpec --> ResourceManager
    ResourceManager --> TestEnv
```

**Test Execution Flow**

Tests run in an isolated environment with their own infrastructure setup and configuration.

Sources: [cli/daemon/run/tests.go:38-59](), [cli/daemon/run/tests.go:114-230]()

### Script Execution

```mermaid
graph LR
    subgraph "Script Execution"
        ExecScriptParams["ExecScriptParams<br/>Script configuration"]
        MainPkg["MainPkg<br/>Package to execute"]
        ScriptBuild["Build Process<br/>Compile script"]
        ScriptRun["Script Execution<br/>Run with app context"]
    end
    
    ExecScriptParams --> MainPkg
    MainPkg --> ScriptBuild
    ScriptBuild --> ScriptRun
```

**Script Execution Flow**

Scripts are executed within the full application context, including access to databases and other infrastructure.

Sources: [cli/daemon/run/exec_script.go:61-237]()

## HTTP Server and Request Handling

The execution system sets up an HTTP server with HTTP/2 cleartext support to handle incoming requests:

```mermaid
graph TB
    subgraph "HTTP Layer"
        HTTPServer["HTTP Server<br/>Standard Go server"]
        H2CHandler["h2c.NewHandler<br/>HTTP/2 cleartext support"]
        RunHandler["Run HTTP Handler<br/>Application request handler"]
    end
    
    subgraph "Process Communication"
        ProcGroup["ProcGroup<br/>Running processes"]
        ProxyReq["ProxyReq<br/>Request forwarding"]
        ServiceEndpoints["Service Endpoints<br/>Individual service ports"]
    end
    
    HTTPServer --> H2CHandler
    H2CHandler --> RunHandler
    RunHandler --> ProcGroup
    ProcGroup --> ProxyReq
    ProxyReq --> ServiceEndpoints
```

**HTTP Server Architecture**

The HTTP server uses h2c (HTTP/2 cleartext) to enable gRPC communication while maintaining compatibility with regular HTTP requests.

Sources: [cli/daemon/run/run.go:285-300]()

---

# Page: Language Support

# Language Support

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [go.mod](go.mod)
- [go.sum](go.sum)
- [runtimes/core/src/api/auth/local.rs](runtimes/core/src/api/auth/local.rs)
- [runtimes/core/src/api/endpoint.rs](runtimes/core/src/api/endpoint.rs)
- [runtimes/core/src/api/error.rs](runtimes/core/src/api/error.rs)
- [runtimes/core/src/trace/eventbuf.rs](runtimes/core/src/trace/eventbuf.rs)
- [runtimes/core/src/trace/protocol.rs](runtimes/core/src/trace/protocol.rs)
- [runtimes/js/encore.dev/api/error.ts](runtimes/js/encore.dev/api/error.ts)
- [runtimes/js/encore.dev/api/mod.ts](runtimes/js/encore.dev/api/mod.ts)
- [runtimes/js/src/error.rs](runtimes/js/src/error.rs)
- [runtimes/js/src/log.rs](runtimes/js/src/log.rs)
- [tsparser/src/legacymeta/mod.rs](tsparser/src/legacymeta/mod.rs)
- [tsparser/src/parser/resources/apis/api.rs](tsparser/src/parser/resources/apis/api.rs)
- [tsparser/src/parser/usageparser/mod.rs](tsparser/src/parser/usageparser/mod.rs)

</details>



This document describes how Encore supports multiple programming languages with unified infrastructure and shared runtime components. It covers the architecture and implementation of language-specific parsers, type systems, and resource binding mechanisms that enable TypeScript and Go applications to integrate seamlessly with Encore's runtime.

For information about the runtime systems that execute these languages, see [Core Runtime Systems](#2). For details about API endpoint definitions and handlers, see [API Definition and Handlers](#3.3).

## Language Architecture Overview

Encore implements a multi-language architecture where different language frontends compile to a shared runtime infrastructure. Each supported language has its own parser and type system integration while producing compatible metadata and runtime bindings.

### Supported Languages

| Language | Runtime | Parser Location | Framework Package |
|----------|---------|-----------------|-------------------|
| TypeScript | JavaScript (Node.js + Rust) | `tsparser/` | `encore.dev/api` |
| Go | Native Go | Built-in Go tooling | `encore.dev` |

### Language Integration Architecture

```mermaid
graph TD
    subgraph "Language Frontends"
        TSApp["TypeScript Application<br/>(.ts files)"]
        GoApp["Go Application<br/>(.go files)"]
    end
    
    subgraph "Language-Specific Parsing"
        TSParser["TypeScript Parser<br/>(tsparser/src/parser/)"]
        GoParser["Go Parser<br/>(Built-in Go AST)"]
    end
    
    subgraph "Metadata Generation"
        MetaBuilder["MetaBuilder<br/>(tsparser/src/legacymeta/mod.rs)"]
        ProtoBuf["Protocol Buffers<br/>(meta.Data)"]
    end
    
    subgraph "Shared Runtime"
        JSRuntime["JavaScript Runtime<br/>(NAPI + Rust Core)"]
        GoRuntime["Go Runtime<br/>(Native)"]
        APIGateway["API Gateway<br/>(Rust Core)"]
    end
    
    TSApp --> TSParser
    GoApp --> GoParser
    TSParser --> MetaBuilder
    GoParser --> MetaBuilder
    MetaBuilder --> ProtoBuf
    
    ProtoBuf --> JSRuntime
    ProtoBuf --> GoRuntime
    JSRuntime --> APIGateway
    GoRuntime --> APIGateway
```

Sources: [tsparser/src/legacymeta/mod.rs:26-38](), [tsparser/src/parser/parser.rs:31-46](), [go.mod:231-233]()

## TypeScript Framework Integration

The TypeScript integration is built around a comprehensive parser system that analyzes TypeScript AST nodes to extract Encore-specific resources and generate runtime metadata.

### TypeScript Parser Architecture

```mermaid
graph TD
    subgraph "Module Loading"
        ModuleLoader["ModuleLoader<br/>(module_loader.rs)"]
        SWCParser["SWC Parser<br/>(swc_ecma_parser)"]
        FileSet["FileSet<br/>(fileset.rs)"]
    end
    
    subgraph "Resource Parsing"
        PassOneParser["PassOneParser<br/>(resourceparser/mod.rs)"]
        APIParser["ENDPOINT_PARSER<br/>(apis/api.rs:176)"]
        SQLDBParser["SQLDB_PARSER<br/>(infra/sqldb.rs:86)"]
        ServiceParser["SERVICE_PARSER<br/>(apis/service.rs:35)"]
    end
    
    subgraph "Type System"
        TypeChecker["TypeChecker<br/>(types/mod.rs)"]
        ObjectResolver["Object Resolution<br/>(types/object.rs)"]
    end
    
    subgraph "Usage Analysis"
        UsageResolver["UsageResolver<br/>(usageparser/mod.rs:84)"]
        UsageVisitor["UsageVisitor<br/>(usageparser/mod.rs:302)"]
    end
    
    ModuleLoader --> SWCParser
    ModuleLoader --> FileSet
    ModuleLoader --> PassOneParser
    PassOneParser --> APIParser
    PassOneParser --> SQLDBParser
    PassOneParser --> ServiceParser
    PassOneParser --> TypeChecker
    TypeChecker --> ObjectResolver
    PassOneParser --> UsageResolver
    UsageResolver --> UsageVisitor
```

Sources: [tsparser/src/parser/module_loader.rs:30-44](), [tsparser/src/parser/resourceparser/mod.rs:24-30](), [tsparser/src/parser/usageparser/mod.rs:84-89]()

### Resource Reference Parsing

The TypeScript parser uses a `ReferenceParser` trait to identify and parse Encore resources from TypeScript code:

```mermaid
graph LR
    subgraph "Reference Types"
        APIEndpoint["APIEndpointLiteral<br/>(apis/api.rs:421)"]
        SQLDatabase["NamedClassResource<br/>(parseutil.rs:21)"]
        Service["ServiceLiteral<br/>(apis/service.rs:83)"]
    end
    
    subgraph "Parsing Pipeline"
        TrackedNames["TrackedNames<br/>(parseutil.rs)"]
        IterReferences["iter_references<br/>(parseutil.rs)"]
        ReferenceParser["ReferenceParser::parse_resource_reference<br/>(parseutil.rs:11)"]
    end
    
    TrackedNames --> IterReferences
    IterReferences --> ReferenceParser
    ReferenceParser --> APIEndpoint
    ReferenceParser --> SQLDatabase
    ReferenceParser --> Service
```

Sources: [tsparser/src/parser/resources/parseutil.rs:11-19](), [tsparser/src/parser/resources/apis/api.rs:421-428](), [tsparser/src/parser/resources/apis/service.rs:83-89]()

## Go Framework Integration

Go applications integrate with Encore through the `encore.dev` package and rely on Go's built-in AST parsing and reflection capabilities. The Go runtime is replaced with Encore's runtime at `./runtimes/go`.

### Go Package Structure

The Go integration uses the following key packages:

- `encore.dev/api` - API endpoint definitions
- `encore.dev/storage/sqldb` - SQL database integration  
- `encore.dev/service` - Service definitions
- `encore.dev/auth` - Authentication handlers

### Go Runtime Replacement

```mermaid
graph LR
    subgraph "Go Module"
        GoMod["go.mod<br/>module encr.dev"]
        EncoreDevDep["encore.dev v1.1.0"]
        RuntimeReplace["replace encore.dev => ./runtimes/go<br/>(go.mod:233)"]
    end
    
    subgraph "Runtime Implementation"
        GoRuntime["./runtimes/go<br/>(Native Go Runtime)"]
        CoreIntegration["Core Runtime Integration<br/>(Rust FFI)"]
    end
    
    GoMod --> EncoreDevDep
    EncoreDevDep --> RuntimeReplace
    RuntimeReplace --> GoRuntime
    GoRuntime --> CoreIntegration
```

Sources: [go.mod:10](), [go.mod:231-233]()

## Unified API Definition System

Both TypeScript and Go applications define APIs using similar patterns that are parsed into a common `EndpointEncoding` representation.

### Cross-Language API Representation

```mermaid
graph TD
    subgraph "Language-Specific Definitions"
        TSEndpoint["api.endpoint(config, handler)<br/>(TypeScript)"]
        GoEndpoint["//encore:api annotations<br/>(Go)"]
    end
    
    subgraph "Common Encoding"
        EndpointEncoding["EndpointEncoding<br/>(apis/encoding.rs:17)"]
        RequestEncoding["RequestEncoding<br/>(apis/encoding.rs:77)"]
        ResponseEncoding["ResponseEncoding<br/>(apis/encoding.rs:85)"]
        PathEncoding["Path<br/>(respath/mod.rs)"]
    end
    
    subgraph "Runtime Registration"
        MetaData["meta::v1::Data<br/>(legacymeta/mod.rs:46)"]
        RPCDefinition["meta::v1::Rpc<br/>(legacymeta/mod.rs:177)"]
    end
    
    TSEndpoint --> EndpointEncoding
    GoEndpoint --> EndpointEncoding
    EndpointEncoding --> RequestEncoding
    EndpointEncoding --> ResponseEncoding
    EndpointEncoding --> PathEncoding
    EndpointEncoding --> MetaData
    MetaData --> RPCDefinition
```

Sources: [tsparser/src/parser/resources/apis/encoding.rs:17-41](), [tsparser/src/legacymeta/mod.rs:177-210](), [tsparser/src/parser/resources/apis/api.rs:176-400]()

### API Method and Path Handling

The system supports multiple HTTP methods and dynamic path parameters across both languages:

```mermaid
graph LR
    subgraph "Method Support"
        Methods["Methods enum<br/>(apis/api.rs:54)"]
        MethodsAll["Methods::All"]
        MethodsSome["Methods::Some(Vec<Method>)"]
    end
    
    subgraph "Path Processing"
        PathParser["Path::parse<br/>(respath/mod.rs)"]
        PathSegments["PathSegment types<br/>Literal, Param, Wildcard"]
        PathRewriting["rewrite_path_types<br/>(encoding.rs)"]
    end
    
    Methods --> MethodsAll
    Methods --> MethodsSome
    PathParser --> PathSegments
    PathSegments --> PathRewriting
```

Sources: [tsparser/src/parser/resources/apis/api.rs:54-81](), [tsparser/src/parser/resources/apis/encoding.rs:501-589]()

## Type System and Code Generation

Encore maintains a unified type system that can represent types from both TypeScript and Go, enabling cross-language client generation and runtime type checking.

### Type Resolution Architecture

```mermaid
graph TD
    subgraph "Type Checking"
        TypeChecker["TypeChecker<br/>(types/mod.rs)"]
        ResolveState["ResolveState<br/>(types/object.rs)"]
        ObjectKind["ObjectKind<br/>(types/object.rs:66)"]
    end
    
    subgraph "Type Representations"
        TypeEnum["Type enum<br/>(types/typ.rs)"]
        BasicTypes["Basic, Interface, Named<br/>(types/typ.rs)"]
        CustomTypes["Custom, Union, Array<br/>(types/typ.rs)"]
    end
    
    subgraph "Schema Generation"
        SchemaBuilder["SchemaBuilder<br/>(legacymeta/schema.rs)"]
        WireSpec["WireSpec<br/>(types/mod.rs)"]
    end
    
    TypeChecker --> ResolveState
    ResolveState --> ObjectKind
    TypeChecker --> TypeEnum
    TypeEnum --> BasicTypes
    TypeEnum --> CustomTypes
    TypeChecker --> SchemaBuilder
    SchemaBuilder --> WireSpec
```

Sources: [tsparser/src/parser/types/mod.rs:20-50](), [tsparser/src/parser/types/object.rs:66-75](), [tsparser/src/legacymeta/schema.rs:1-30]()

## Resource and Usage Resolution

The system tracks how resources are used across modules to generate proper dependency graphs and runtime bindings.

### Usage Tracking System

```mermaid
graph TD
    subgraph "Usage Detection"
        UsageExpr["UsageExpr<br/>(usageparser/mod.rs:17)"]
        UsageExprKind["UsageExprKind<br/>FieldAccess, MethodCall, Callee"]
        UsageVisitor["UsageVisitor<br/>(usageparser/mod.rs:302)"]
    end
    
    subgraph "Resource Binding"
        BindToScan["BindToScan<br/>(usageparser/mod.rs:287)"]
        BindKind["BindKind<br/>Create, Reference"]
        ResourceOrPath["ResourceOrPath<br/>(bind.rs)"]
    end
    
    subgraph "Usage Types"
        CallEndpoint["CallEndpointUsage<br/>(apis/api.rs:404)"]
        PublishTopic["PublishUsage<br/>(pubsub_topic.rs)"]
        AccessDatabase["AccessDatabaseUsage<br/>(sqldb.rs)"]
    end
    
    UsageVisitor --> UsageExpr
    UsageExpr --> UsageExprKind
    UsageExpr --> BindToScan
    BindToScan --> BindKind
    BindToScan --> ResourceOrPath
    UsageExpr --> CallEndpoint
    UsageExpr --> PublishTopic
    UsageExpr --> AccessDatabase
```

Sources: [tsparser/src/parser/usageparser/mod.rs:17-49](), [tsparser/src/parser/usageparser/mod.rs:226-231](), [tsparser/src/parser/resources/apis/api.rs:404-407]()

### Cross-Module Import Resolution

The parser resolves imports and tracks resource usage across module boundaries:

```mermaid
graph LR
    subgraph "Import Resolution"
        ModuleLoader["ModuleLoader::resolve_import<br/>(module_loader.rs:124)"]
        ImportSpecifier["ast::ImportSpecifier<br/>(Named, Default, Namespace)"]
    end
    
    subgraph "External Binds"
        ExternalBinds["external_binds_to_scan_for<br/>(usageparser/mod.rs:130)"]
        InternalBinds["internal_binds_to_scan_for<br/>(usageparser/mod.rs:206)"]
    end
    
    subgraph "Usage Scanning"
        ScanUsageExprs["scan_usage_exprs<br/>(usageparser/mod.rs:116)"]
        ResolveUsage["resolve_usage<br/>(usageparser/mod.rs:241)"]
    end
    
    ModuleLoader --> ImportSpecifier
    ImportSpecifier --> ExternalBinds
    ExternalBinds --> ScanUsageExprs
    InternalBinds --> ScanUsageExprs
    ScanUsageExprs --> ResolveUsage
```

Sources: [tsparser/src/parser/module_loader.rs:124-128](), [tsparser/src/parser/usageparser/mod.rs:130-203](), [tsparser/src/parser/usageparser/mod.rs:241-284]()

---

# Page: Go Framework Integration

# Go Framework Integration

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [go.mod](go.mod)
- [go.sum](go.sum)

</details>



This document covers how Go applications integrate with the Encore runtime system, including the Go framework structure, runtime integration points, and execution flow. For information about TypeScript framework integration, see [TypeScript Framework](#3.2). For details about API definition patterns across languages, see [API Definition and Handlers](#3.3).

## Go Runtime Architecture

The Encore Go framework provides a native Go runtime that integrates seamlessly with the Encore platform. The Go runtime is implemented as a local module within the Encore repository and provides the core APIs and runtime integration for Go-based Encore applications.

```mermaid
graph TB
    subgraph "Go Application Layer"
        UserApp["User Go Application"]
        EncoreAPIs["encore.dev APIs"]
        UserHandlers["HTTP Handlers"]
    end
    
    subgraph "Encore Go Runtime"
        RuntimeCore["Runtime Core"]
        APIRegistry["API Registry"]
        ServiceLoader["Service Loader"]
        ConfigManager["Config Manager"]
    end
    
    subgraph "Encore Daemon Integration"
        DaemonComm["Daemon Communication"]
        MetadataProvider["Metadata Provider"]
        RuntimeManager["Runtime Manager"]
    end
    
    subgraph "Infrastructure Integration"
        DatabaseClient["Database Client"]
        TracingClient["Tracing Client"]
        PubSubClient["PubSub Client"]
        SecretsClient["Secrets Client"]
    end
    
    UserApp --> EncoreAPIs
    EncoreAPIs --> RuntimeCore
    UserHandlers --> APIRegistry
    
    RuntimeCore --> DaemonComm
    APIRegistry --> MetadataProvider
    ServiceLoader --> RuntimeManager
    
    RuntimeCore --> DatabaseClient
    RuntimeCore --> TracingClient
    RuntimeCore --> PubSubClient
    RuntimeCore --> SecretsClient
    
    DaemonComm --> DatabaseClient
    DaemonComm --> TracingClient
```

**Sources:** [go.mod:232-233]()

## Module Structure and Dependencies

The Go framework is structured as a replaceable module within the Encore repository. The main application module `encr.dev` depends on `encore.dev v1.1.0`, which is replaced with the local implementation located in the `runtimes/go` directory.

| Component | Module Path | Purpose |
|-----------|-------------|---------|
| Main Module | `encr.dev` | Encore CLI and core systems |
| Go Runtime | `encore.dev` | Go framework APIs and runtime |
| Local Implementation | `./runtimes/go` | Local Go runtime implementation |

The Go runtime requires Go 1.23.0 or later and integrates with various infrastructure components through dedicated client libraries for databases, messaging, and observability.

**Sources:** [go.mod:1-5](), [go.mod:10](), [go.mod:232-233]()

## Runtime Integration Flow

The Go application integration follows a specific lifecycle managed by the Encore daemon. This flow ensures proper initialization, service registration, and runtime coordination.

```mermaid
sequenceDiagram
    participant Daemon as "Encore Daemon"
    participant GoRuntime as "Go Runtime"
    participant UserApp as "User Application"
    participant Infrastructure as "Infrastructure Services"
    
    Daemon->>GoRuntime: "Initialize runtime"
    GoRuntime->>GoRuntime: "Load configuration"
    GoRuntime->>UserApp: "Call init functions"
    
    UserApp->>GoRuntime: "Register services via encore.dev APIs"
    GoRuntime->>Daemon: "Report service metadata"
    
    Daemon->>Infrastructure: "Provision databases, secrets, etc."
    Infrastructure-->>Daemon: "Connection details"
    
    Daemon->>GoRuntime: "Provide infrastructure config"
    GoRuntime->>UserApp: "Initialize infrastructure clients"
    
    UserApp-->>GoRuntime: "Application ready"
    GoRuntime-->>Daemon: "Runtime ready"
    
    loop "Request Processing"
        Daemon->>GoRuntime: "HTTP request"
        GoRuntime->>UserApp: "Route to handler"
        UserApp-->>GoRuntime: "Response"
        GoRuntime-->>Daemon: "HTTP response"
    end
```

**Sources:** [go.mod:42-44](), [go.mod:52](), [go.mod:58-59]()

## Key Integration Components

### Database Integration

The Go runtime integrates with PostgreSQL databases through the `pgx` driver ecosystem, providing connection pooling and transaction management. The runtime coordinates with the daemon to establish database connections and manage schema migrations.

```mermaid
graph LR
    subgraph "Go Application"
        AppCode["Application Code"]
        EncoreDB["encore.dev/storage/sqldb"]
    end
    
    subgraph "Database Layer"
        PGXDriver["pgx/v5 Driver"]
        ConnPool["Connection Pool"]
        MigrationRunner["Migration Runner"]
    end
    
    subgraph "Infrastructure"
        PostgreSQL["PostgreSQL Instance"]
        MigrationFiles["SQL Migration Files"]
    end
    
    AppCode --> EncoreDB
    EncoreDB --> PGXDriver
    PGXDriver --> ConnPool
    ConnPool --> PostgreSQL
    
    MigrationRunner --> MigrationFiles
    MigrationRunner --> PostgreSQL
```

### Message Queue Integration

The Go runtime provides PubSub capabilities through NSQ integration, enabling asynchronous message processing and inter-service communication.

### Observability Integration

The runtime includes built-in tracing and logging capabilities that integrate with the Encore observability stack, providing distributed tracing and structured logging out of the box.

**Sources:** [go.mod:42-44](), [go.mod:52](), [go.mod:58-59](), [go.mod:67-68]()

## Runtime Dependencies

The Go runtime leverages several key dependencies to provide its functionality:

| Dependency | Version | Purpose |
|------------|---------|---------|
| `github.com/jackc/pgx/v5` | v5.7.4 | PostgreSQL driver and connection management |
| `github.com/lib/pq` | v1.10.9 | PostgreSQL driver utilities |
| `github.com/nsqio/go-nsq` | v1.1.0 | NSQ message queue client |
| `github.com/rs/zerolog` | v1.34.0 | Structured logging |
| `github.com/gorilla/mux` | v1.8.1 | HTTP routing |
| `github.com/golang-migrate/migrate/v4` | v4.15.2 | Database migration management |

The runtime is designed to work seamlessly with the Encore daemon, which orchestrates the overall application lifecycle and coordinates infrastructure provisioning.

**Sources:** [go.mod:7-92]()

---

# Page: TypeScript Framework

# TypeScript Framework

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [runtimes/core/src/api/auth/local.rs](runtimes/core/src/api/auth/local.rs)
- [runtimes/core/src/api/endpoint.rs](runtimes/core/src/api/endpoint.rs)
- [runtimes/core/src/api/error.rs](runtimes/core/src/api/error.rs)
- [runtimes/core/src/trace/eventbuf.rs](runtimes/core/src/trace/eventbuf.rs)
- [runtimes/core/src/trace/protocol.rs](runtimes/core/src/trace/protocol.rs)
- [runtimes/go/storage/sqldb/db.go](runtimes/go/storage/sqldb/db.go)
- [runtimes/js/encore.dev/api/error.ts](runtimes/js/encore.dev/api/error.ts)
- [runtimes/js/encore.dev/api/mod.ts](runtimes/js/encore.dev/api/mod.ts)
- [runtimes/js/src/error.rs](runtimes/js/src/error.rs)
- [runtimes/js/src/log.rs](runtimes/js/src/log.rs)
- [tsparser/src/app/mod.rs](tsparser/src/app/mod.rs)
- [tsparser/src/builder/parse.rs](tsparser/src/builder/parse.rs)
- [tsparser/src/legacymeta/mod.rs](tsparser/src/legacymeta/mod.rs)
- [tsparser/src/legacymeta/schema.rs](tsparser/src/legacymeta/schema.rs)
- [tsparser/src/parser/resources/apis/api.rs](tsparser/src/parser/resources/apis/api.rs)
- [tsparser/src/parser/resources/apis/encoding.rs](tsparser/src/parser/resources/apis/encoding.rs)
- [tsparser/src/parser/types/mod.rs](tsparser/src/parser/types/mod.rs)
- [tsparser/src/parser/types/snapshots/encore_tsparser__parser__types__tests__resolve_types@basic.ts.snap](tsparser/src/parser/types/snapshots/encore_tsparser__parser__types__tests__resolve_types@basic.ts.snap)
- [tsparser/src/parser/types/snapshots/encore_tsparser__parser__types__tests__resolve_types@extends.ts.snap](tsparser/src/parser/types/snapshots/encore_tsparser__parser__types__tests__resolve_types@extends.ts.snap)
- [tsparser/src/parser/types/snapshots/encore_tsparser__parser__types__tests__resolve_types@infer.txt.snap](tsparser/src/parser/types/snapshots/encore_tsparser__parser__types__tests__resolve_types@infer.txt.snap)
- [tsparser/src/parser/types/snapshots/encore_tsparser__parser__types__tests__resolve_types@validation.ts.snap](tsparser/src/parser/types/snapshots/encore_tsparser__parser__types__tests__resolve_types@validation.ts.snap)
- [tsparser/src/parser/types/testdata/basic.ts](tsparser/src/parser/types/testdata/basic.ts)
- [tsparser/src/parser/types/typ.rs](tsparser/src/parser/types/typ.rs)
- [tsparser/src/parser/types/type_resolve.rs](tsparser/src/parser/types/type_resolve.rs)
- [tsparser/src/parser/types/type_string.rs](tsparser/src/parser/types/type_string.rs)
- [tsparser/src/parser/types/validation.rs](tsparser/src/parser/types/validation.rs)
- [tsparser/src/parser/types/visitor.rs](tsparser/src/parser/types/visitor.rs)
- [tsparser/src/parser/usageparser/mod.rs](tsparser/src/parser/usageparser/mod.rs)

</details>



The TypeScript Framework is Encore's comprehensive TypeScript parser, type checker, and metadata extraction system. It analyzes TypeScript applications to discover Encore resources (APIs, databases, services, etc.), resolve complex TypeScript types, and generate metadata for the runtime system. The framework serves as the bridge between TypeScript source code and Encore's runtime infrastructure.

For information about Go language support, see [Go Framework Integration](#3.1). For details about API endpoint handling across both languages, see [API Definition and Handlers](#3.3).

## Overview and Architecture

The TypeScript framework consists of several interconnected systems that work together to parse, analyze, and extract metadata from TypeScript applications:

```mermaid
graph TB
    subgraph "Input Processing"
        TSSource["TypeScript Source Files"]
        SWC["SWC Parser<br/>AST Generation"]
        ModLoader["ModuleLoader<br/>Import Resolution"]
    end
    
    subgraph "Type System"
        TypeChecker["TypeChecker<br/>Type Resolution"]
        TypeResolver["Ctx<br/>Type Context"]
        TypeValidation["Validation System<br/>Runtime Constraints"]
    end
    
    subgraph "Resource Discovery"
        ResourceParsers["Resource Parsers<br/>API, DB, Service"]
        BindSystem["Bind System<br/>Object References"]
        UsageAnalysis["Usage Analysis<br/>Call Graph"]
    end
    
    subgraph "Code Generation"
        SchemaBuilder["SchemaBuilder<br/>Protocol Buffers"]
        ClientGen["Client Generation<br/>TypeScript/Go/OpenAPI"]
        MetaData["Metadata Generation<br/>Runtime Configuration"]
    end
    
    TSSource --> SWC
    SWC --> ModLoader
    ModLoader --> TypeChecker
    TypeChecker --> TypeResolver
    TypeResolver --> TypeValidation
    
    ModLoader --> ResourceParsers
    ResourceParsers --> BindSystem
    BindSystem --> UsageAnalysis
    
    TypeChecker --> SchemaBuilder
    ResourceParsers --> SchemaBuilder
    SchemaBuilder --> ClientGen
    SchemaBuilder --> MetaData
```

**TypeScript Framework Core Architecture**

Sources: [tsparser/src/parser/parser.rs:1-287](), [tsparser/src/parser/types/type_resolve.rs:1-84](), [tsparser/src/parser/module_loader.rs:1-104]()

## Module Loading and Import Resolution

The `ModuleLoader` handles TypeScript module loading, import resolution, and AST generation using the SWC parser:

```mermaid
graph LR
    subgraph "Module Resolution"
        FileSystem["File System<br/>.ts, .tsx files"]
        ImportResolver["Import Resolver<br/>Node.js + Custom"]
        EncoreAliases["Encore Aliases<br/>~encore/clients"]
    end
    
    subgraph "Parsing Pipeline"
        SWCLexer["SWC Lexer<br/>TypeScript Syntax"]
        SWCParser["SWC Parser<br/>AST Generation"]
        IdentResolver["Identifier Resolver<br/>Scope Analysis"]
    end
    
    subgraph "Module Cache"
        ModuleCache["Module Cache<br/>by_path HashMap"]
        UniverseModule["Universe Module<br/>Built-in Types"]
        ClientsModule["Generated Clients<br/>encore.gen/clients"]
    end
    
    FileSystem --> ImportResolver
    ImportResolver --> EncoreAliases
    EncoreAliases --> SWCLexer
    SWCLexer --> SWCParser
    SWCParser --> IdentResolver
    IdentResolver --> ModuleCache
    ModuleCache --> UniverseModule
    ModuleCache --> ClientsModule
```

**Module Loading Architecture**

The system supports special Encore-specific module paths like `~encore/clients` and `~encore/auth` that resolve to generated modules containing service clients and authentication handlers.

Sources: [tsparser/src/parser/module_loader.rs:124-192](), [tsparser/src/parser/module_loader.rs:229-263]()

## TypeScript Type System

The framework implements a sophisticated TypeScript type checker that handles advanced language features:

```mermaid
graph TB
    subgraph "Type Resolution Context"
        TypeChecker["TypeChecker<br/>resolve_type, concrete, underlying"]
        Ctx["Ctx<br/>state, module, type_params"]
        ResolveState["ResolveState<br/>module resolution state"]
        TypeParams["type_params<br/>Generic Constraints"]
    end
    
    subgraph "Core Type System"
        Type["Type enum<br/>Basic | Array | Interface | Union"]
        Basic["Basic enum<br/>String | Number | Boolean | Date"]
        Interface["Interface<br/>fields, index, call"]
        Union["Union<br/>types vector"]
    end
    
    subgraph "Advanced Features"
        Generic["Generic enum<br/>TypeParam | Conditional | Mapped"]
        Conditional["Conditional<br/>check_type, extends_type, true_type, false_type"]
        Mapped["Mapped<br/>in_type, value_type, optional"]
        Index["Index<br/>source, index"]
    end
    
    subgraph "Type Operations"
        KeyofOperation["keyof<br/>Type property enumeration"]
        IndexAccess["IndexAccess<br/>T[K] resolution"]
        TypeIntersection["intersect<br/>Type combination"]
        TypeSimplification["simplify_union<br/>Type optimization"]
    end
    
    TypeChecker --> Ctx
    Ctx --> ResolveState
    ResolveState --> TypeParams
    
    Ctx --> Type
    Type --> Basic
    Type --> Interface
    Type --> Union
    
    Type --> Generic
    Generic --> Conditional
    Generic --> Mapped
    Generic --> Index
    
    Ctx --> KeyofOperation
    KeyofOperation --> IndexAccess
    IndexAccess --> TypeIntersection
    TypeIntersection --> TypeSimplification
```

**TypeScript Type System Implementation**

The `TypeChecker` uses a `Ctx` resolution context to handle complex type operations. The `Type` enum encompasses all TypeScript types, with specialized handling for `Generic` types including `Conditional`, `Mapped`, and indexed access patterns. The system supports advanced operations like `keyof`, type intersection, and union simplification.

Sources: [tsparser/src/parser/types/type_resolve.rs:23-93](), [tsparser/src/parser/types/typ.rs:17-126](), [tsparser/src/parser/types/type_resolve.rs:274-484]()

## Resource Discovery and Parsing

Encore resources are discovered through a multi-pass parsing system that identifies API endpoints, databases, services, and other infrastructure components:

```mermaid
graph LR
    subgraph "Resource Types"
        APIEndpoint["api.endpoint()<br/>HTTP APIs"]
        SQLDatabase["SQLDatabase<br/>Postgres DBs"]
        PubSubTopic["Topic<br/>Message Queues"]
        ServiceDef["Service<br/>Service Declaration"]
        AuthHandler["AuthHandler<br/>Authentication"]
        Gateway["Gateway<br/>API Gateway"]
    end
    
    subgraph "Parser Framework"
        TrackedNames["TrackedNames<br/>Package Tracking"]
        ReferenceParser["ReferenceParser<br/>AST Traversal"]
        BindSystem["BindSystem<br/>Object References"]
        ResourceParser["ResourceParser<br/>Type-specific Logic"]
    end
    
    subgraph "Configuration"
        LitParser["LitParser<br/>Config Extraction"]
        EndpointConfig["EndpointConfig<br/>HTTP Options"]
        DatabaseConfig["DatabaseConfig<br/>Migration Paths"]
        ValidationRules["Validation Rules<br/>Runtime Constraints"]
    end
    
    APIEndpoint --> TrackedNames
    SQLDatabase --> TrackedNames
    PubSubTopic --> TrackedNames
    ServiceDef --> TrackedNames
    
    TrackedNames --> ReferenceParser
    ReferenceParser --> BindSystem
    BindSystem --> ResourceParser
    
    ResourceParser --> LitParser
    LitParser --> EndpointConfig
    LitParser --> DatabaseConfig
    LitParser --> ValidationRules
```

**Resource Discovery Architecture**

The system uses package tracking to identify imports from Encore modules like `encore.dev/api` and `encore.dev/storage/sqldb`, then parses their usage to extract resource definitions.

Sources: [tsparser/src/parser/resources/apis/api.rs:176-401](), [tsparser/src/parser/resources/infra/sqldb.rs:86-201](), [tsparser/src/parser/resources/parseutil.rs:1-19]()

## API Endpoint Processing

API endpoints undergo sophisticated processing to extract HTTP routing, request/response schemas, and wire format specifications:

```mermaid
graph TB
    subgraph "Endpoint Definition"
        APICall["api.endpoint({...}, handler)"]
        Config["EndpointConfig<br/>path, method, auth"]
        Handler["Handler Function<br/>Request/Response Types"]
        TypeParams["Type Parameters<br/>Request<T>, Response<R>"]
    end
    
    subgraph "Parsing Structure"
        APIEndpointLiteral["APIEndpointLiteral<br/>Parsed AST Node"]
        EndpointKind["EndpointKind<br/>Typed | Raw | TypedStream | StaticAssets"]
        ParameterType["ParameterType<br/>Stream | Single | None"]
        TrackedNames["TrackedNames<br/>encore.dev/api tracking"]
    end
    
    subgraph "Encoding Analysis"
        PathParams["Path Parameters<br/>/users/:id"]
        RequestEncoding["RequestEncoding<br/>methods, params"]
        ResponseEncoding["ResponseEncoding<br/>params"]
        WireSpecs["Wire Specifications<br/>Header(), Query(), Cookie()"]
    end
    
    subgraph "HTTP Processing"
        MethodRouting["HTTP Methods<br/>GET, POST, PUT, DELETE"]
        PathRewriting["Path Rewriting<br/>:param to {param}"]
        ValidationRules["Validation Rules<br/>Runtime Constraints"]
        StaticAssets["StaticAssets<br/>dir, not_found"]
    end
    
    APICall --> Config
    Config --> Handler
    Handler --> TypeParams
    
    TypeParams --> APIEndpointLiteral
    APIEndpointLiteral --> EndpointKind
    EndpointKind --> ParameterType
    ParameterType --> TrackedNames
    
    TrackedNames --> PathParams
    PathParams --> RequestEncoding
    RequestEncoding --> ResponseEncoding
    ResponseEncoding --> WireSpecs
    
    WireSpecs --> MethodRouting
    MethodRouting --> PathRewriting
    PathRewriting --> ValidationRules
    ValidationRules --> StaticAssets
```

**API Endpoint Processing Pipeline**

The system uses `ENDPOINT_PARSER` to process API definitions through multiple phases. The `APIEndpointLiteral` structure captures the parsed endpoint with its `EndpointKind` (Typed, Raw, TypedStream, or StaticAssets), while `RequestEncoding` and `ResponseEncoding` structures handle parameter encoding for different HTTP methods.

Sources: [tsparser/src/parser/resources/apis/api.rs:177-402](), [tsparser/src/parser/resources/apis/api.rs:423-457](), [tsparser/src/parser/resources/apis/encoding.rs:77-127]()

## Schema Generation and Metadata

The framework generates Protocol Buffer schemas and metadata for runtime consumption:

```mermaid
graph LR
    subgraph "Type Analysis"
        TypeChecker["TypeChecker<br/>Type Resolution"]
        InterfaceFields["Interface Fields<br/>Property Analysis"]
        WireLocations["Wire Locations<br/>Header, Query, Body"]
        ValidationExprs["Validation Expressions<br/>Runtime Rules"]
    end
    
    subgraph "Schema Building"
        SchemaBuilder["SchemaBuilder<br/>new, typ, transform_request"]
        BuilderCtx["BuilderCtx<br/>builder, decl_id"]
        FieldTransform["Field Transform<br/>interface, named, literal"]
        DeclRegistry["obj_to_decl<br/>HashMap<ObjectId, u32>"]
    end
    
    subgraph "Schema Types"
        SchemaType["schema::Type<br/>typ, validation"]
        SchemaStruct["schema::Struct<br/>fields"]
        SchemaField["schema::Field<br/>name, typ, optional, wire"]
        SchemaNamed["schema::Named<br/>id, type_arguments"]
    end
    
    subgraph "Output Formats"
        MetaData["v1::Data<br/>Protocol Buffer schema"]
        MetaBuilder["MetaBuilder<br/>services, resources, metadata"]
        SchemaDecl["schema::Decl<br/>id, name, type, loc"]
        ComputeMeta["compute_meta<br/>Final metadata generation"]
    end
    
    TypeChecker --> InterfaceFields
    InterfaceFields --> WireLocations
    WireLocations --> ValidationExprs
    
    ValidationExprs --> SchemaBuilder
    SchemaBuilder --> BuilderCtx
    BuilderCtx --> FieldTransform
    FieldTransform --> DeclRegistry
    
    DeclRegistry --> SchemaType
    SchemaType --> SchemaStruct
    SchemaStruct --> SchemaField
    SchemaField --> SchemaNamed
    
    SchemaNamed --> MetaData
    MetaData --> MetaBuilder
    MetaBuilder --> SchemaDecl
    SchemaDecl --> ComputeMeta
```

**Schema Generation Pipeline**

The `SchemaBuilder` transforms TypeScript types into Protocol Buffer schemas through `BuilderCtx`. It maintains a declaration registry (`obj_to_decl`) for named types and generates `schema::Type` structures that are eventually compiled into `v1::Data` metadata by `compute_meta`.

Sources: [tsparser/src/legacymeta/schema.rs:23-82](), [tsparser/src/legacymeta/schema.rs:84-196](), [tsparser/src/legacymeta/mod.rs:26-38]()

## Wire Format Specifications

Encore provides special wire format types that control how data is encoded in HTTP requests and responses:

```mermaid
graph TB
    subgraph "Wire Spec Types"
        HeaderSpec["Header<T, 'name'><br/>HTTP Headers"]
        QuerySpec["Query<T, 'name'><br/>Query Parameters"]
        CookieSpec["Cookie<T, 'name'><br/>HTTP Cookies"]
        AttributeSpec["Attribute<T, 'name'><br/>PubSub Attributes"]
    end
    
    subgraph "Type Processing"
        WireSpecParser["Wire Spec Parser<br/>Type Analysis"]
        NameOverride["Name Override<br/>Field Renaming"]
        ValidationWrap["Validation Wrapper<br/>Constraint Application"]
        UnderlyingType["Underlying Type<br/>Base Type Extraction"]
    end
    
    subgraph "Schema Output"
        StructTags["Struct Tags<br/>encore:optional"]
        WireLocation["Wire Location<br/>header, query, cookie"]
        FieldMapping["Field Mapping<br/>JSON to Wire Name"]
        ValidationConstraints["Validation Constraints<br/>Runtime Rules"]
    end
    
    HeaderSpec --> WireSpecParser
    QuerySpec --> WireSpecParser
    CookieSpec --> WireSpecParser
    AttributeSpec --> WireSpecParser
    
    WireSpecParser --> NameOverride
    NameOverride --> ValidationWrap
    ValidationWrap --> UnderlyingType
    
    UnderlyingType --> StructTags
    StructTags --> WireLocation
    WireLocation --> FieldMapping
    FieldMapping --> ValidationConstraints
```

**Wire Format Specification Processing**

Sources: [tsparser/src/parser/resources/apis/encoding.rs:287-375](), [tsparser/src/parser/types/typ.rs:93-119](), [tsparser/src/legacymeta/schema.rs:273-375]()

## Usage Analysis and Call Graph

The framework analyzes how resources are used throughout the application to build dependency graphs:

```mermaid
graph LR
    subgraph "Usage Detection"
        UsageVisitor["UsageVisitor<br/>AST Traversal"]
        BindToScan["BindToScan<br/>bound_name, selector, bind"]
        UsageExpr["UsageExpr<br/>range, bind, kind"]
        UsageExprKind["UsageExprKind<br/>MethodCall | FieldAccess | Callee"]
    end
    
    subgraph "Expression Classification"
        MethodCall["MethodCall<br/>resource.method()"]
        FieldAccess["FieldAccess<br/>resource.field"]
        TemplateCall["TemplateCall<br/>resource.tpl`string`"]
        CallArg["CallArg<br/>func(resource)"]
    end
    
    subgraph "Usage Resolution"
        UsageResolver["UsageResolver<br/>scan_usage_exprs"]
        ResolveUsageData["ResolveUsageData<br/>module, type_checker, expr"]
        Usage["Usage<br/>CallEndpoint | PublishTopic | AccessDatabase"]
        ResourceUsage["Resource Usage<br/>Operation tracking"]
    end
    
    subgraph "Dependency Graph"
        ServiceDeps["Service Dependencies<br/>Cross-service Calls"]
        ResourceDeps["Resource Dependencies<br/>DB, Topics, Buckets"]
        UsageMetadata["Usage Metadata<br/>Operations, Permissions"]
        CallGraph["Call Graph<br/>Application Flow"]
    end
    
    UsageVisitor --> BindToScan
    BindToScan --> UsageExpr
    UsageExpr --> UsageExprKind
    
    UsageExprKind --> MethodCall
    MethodCall --> FieldAccess
    FieldAccess --> TemplateCall
    TemplateCall --> CallArg
    
    CallArg --> UsageResolver
    UsageResolver --> ResolveUsageData
    ResolveUsageData --> Usage
    Usage --> ResourceUsage
    
    ResourceUsage --> ServiceDeps
    ServiceDeps --> ResourceDeps
    ResourceDeps --> UsageMetadata
    UsageMetadata --> CallGraph
```

**Usage Analysis System**

The system uses `UsageResolver` to scan modules for resource usage through `UsageVisitor` AST traversal. Each usage is captured as a `UsageExpr` with a specific `UsageExprKind` (MethodCall, FieldAccess, Callee, etc.), and then resolved into typed `Usage` instances for dependency tracking.

Sources: [tsparser/src/parser/usageparser/mod.rs:95-297](), [tsparser/src/parser/usageparser/mod.rs:314-491](), [tsparser/src/parser/usageparser/mod.rs:19-53]()

## Integration with Runtime Systems

The TypeScript framework generates metadata that integrates with Encore's runtime components:

```mermaid
graph TB
    subgraph "TypeScript Framework Output"
        MetaData["meta.Data<br/>Protocol Buffer Schema"]
        ServiceMeta["Service Metadata<br/>Endpoints, Dependencies"]
        ResourceMeta["Resource Metadata<br/>Databases, Topics"]
        SchemaDefs["Schema Definitions<br/>Type Declarations"]
    end
    
    subgraph "Runtime Integration"
        APIGateway["API Gateway<br/>HTTP Routing"]
        JSRuntime["JavaScript Runtime<br/>NAPI Bindings"]
        SQLManager["SQL Manager<br/>Connection Pooling"]
        TraceSystem["Trace System<br/>Request Tracking"]
    end
    
    subgraph "Code Generation"
        ClientGen["Client Generation<br/>Service Clients"]
        TypeGeneration["Type Generation<br/>Interface Definitions"]
        OpenAPIGen["OpenAPI Generation<br/>Documentation"]
        ValidationGen["Validation Generation<br/>Runtime Rules"]
    end
    
    MetaData --> ServiceMeta
    ServiceMeta --> ResourceMeta
    ResourceMeta --> SchemaDefs
    
    SchemaDefs --> APIGateway
    APIGateway --> JSRuntime
    JSRuntime --> SQLManager
    SQLManager --> TraceSystem
    
    MetaData --> ClientGen
    ClientGen --> TypeGeneration
    TypeGeneration --> OpenAPIGen
    OpenAPIGen --> ValidationGen
```

**Runtime Integration Architecture**

The framework serves as the bridge between TypeScript source code and Encore's polyglot runtime, ensuring type safety and consistency across the entire system.

Sources: [tsparser/src/legacymeta/mod.rs:49-584](), [tsparser/src/app/mod.rs:67-81](), [tsparser/src/builder/parse.rs:28-46]()

---

# Page: API Definition and Handlers

# API Definition and Handlers

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [runtimes/core/src/api/auth/local.rs](runtimes/core/src/api/auth/local.rs)
- [runtimes/core/src/api/call.rs](runtimes/core/src/api/call.rs)
- [runtimes/core/src/api/endpoint.rs](runtimes/core/src/api/endpoint.rs)
- [runtimes/core/src/api/error.rs](runtimes/core/src/api/error.rs)
- [runtimes/core/src/api/gateway/mod.rs](runtimes/core/src/api/gateway/mod.rs)
- [runtimes/core/src/api/gateway/router.rs](runtimes/core/src/api/gateway/router.rs)
- [runtimes/core/src/api/manager.rs](runtimes/core/src/api/manager.rs)
- [runtimes/core/src/api/mod.rs](runtimes/core/src/api/mod.rs)
- [runtimes/core/src/api/server.rs](runtimes/core/src/api/server.rs)
- [runtimes/core/src/trace/eventbuf.rs](runtimes/core/src/trace/eventbuf.rs)
- [runtimes/core/src/trace/protocol.rs](runtimes/core/src/trace/protocol.rs)
- [runtimes/js/encore.dev/api/error.ts](runtimes/js/encore.dev/api/error.ts)
- [runtimes/js/encore.dev/api/mod.ts](runtimes/js/encore.dev/api/mod.ts)
- [runtimes/js/encore.dev/internal/api/mod.ts](runtimes/js/encore.dev/internal/api/mod.ts)
- [runtimes/js/encore.dev/mod.ts](runtimes/js/encore.dev/mod.ts)
- [runtimes/js/src/error.rs](runtimes/js/src/error.rs)
- [runtimes/js/src/log.rs](runtimes/js/src/log.rs)
- [runtimes/js/src/pvalue.rs](runtimes/js/src/pvalue.rs)
- [runtimes/js/src/runtime.rs](runtimes/js/src/runtime.rs)
- [tsparser/src/builder/codegen.rs](tsparser/src/builder/codegen.rs)
- [tsparser/src/builder/templates/catalog/auth/auth_ts.handlebars](tsparser/src/builder/templates/catalog/auth/auth_ts.handlebars)
- [tsparser/src/builder/templates/catalog/clients/endpoints_d_ts.handlebars](tsparser/src/builder/templates/catalog/clients/endpoints_d_ts.handlebars)
- [tsparser/src/builder/templates/catalog/clients/endpoints_js.handlebars](tsparser/src/builder/templates/catalog/clients/endpoints_js.handlebars)
- [tsparser/src/builder/templates/catalog/clients/endpoints_testing_js.handlebars](tsparser/src/builder/templates/catalog/clients/endpoints_testing_js.handlebars)
- [tsparser/src/legacymeta/mod.rs](tsparser/src/legacymeta/mod.rs)
- [tsparser/src/parser/resources/apis/api.rs](tsparser/src/parser/resources/apis/api.rs)
- [tsparser/src/parser/usageparser/mod.rs](tsparser/src/parser/usageparser/mod.rs)

</details>



This document covers how API endpoints are defined in source code and how they are processed and handled at runtime in the Encore framework. It explains the lifecycle from API definition in TypeScript source files through parsing, metadata generation, handler registration, and request processing.

For information about the TypeScript parser system and language analysis, see [TypeScript Framework](#3.2). For details about the API gateway infrastructure and routing, see [API Gateway and Request Processing](#2.2).

## API Definition in TypeScript

Encore APIs are defined using the `api` function from the `encore.dev/api` package. The function takes configuration options and a handler function.

### Basic API Structure

The core API definition uses the `api` function with `APIOptions`:

```typescript
api(options: APIOptions, fn: HandlerFunction)
```

The `APIOptions` interface defines endpoint configuration including HTTP methods, paths, authentication requirements, and exposure settings. Key options include:

- `method`: HTTP method(s) to match (`Method | Method[] | "*"`)
- `path`: Request path pattern with parameter support
- `expose`: Whether the endpoint is publicly accessible
- `auth`: Whether authentication is required
- `bodyLimit`: Maximum request body size
- `tags`: Endpoint tags for filtering
- `sensitive`: Whether to redact details from traces

**API Definition Flow**
```mermaid
graph TD
    TS["TypeScript Source"] --> APIDEF["api() function call"]
    APIDEF --> CONFIG["APIOptions config"]
    APIDEF --> HANDLER["Handler function"]
    CONFIG --> METHOD["HTTP methods"]
    CONFIG --> PATH["URL path pattern"]
    CONFIG --> AUTH["Auth requirements"]
    CONFIG --> EXPOSE["Public exposure"]
    HANDLER --> TYPED["Typed handler"]
    HANDLER --> RAW["Raw handler"]
    HANDLER --> STREAM["Stream handler"]
```

Sources: [runtimes/js/encore.dev/api/mod.ts:59-111](), [runtimes/js/encore.dev/api/mod.ts:152-173]()

### Handler Types

Encore supports multiple handler types through different API variations:

1. **Typed Handlers**: Regular functions with typed parameters and responses
2. **Raw Handlers**: Direct HTTP request/response handling via `api.raw()`
3. **Stream Handlers**: Bidirectional streaming via `api.streamInOut()`, `api.streamIn()`, `api.streamOut()`
4. **Static Assets**: File serving via `api.static()`

The parsing logic identifies these different handler types and generates appropriate metadata for each.

Sources: [runtimes/js/encore.dev/api/mod.ts:177-320](), [tsparser/src/parser/resources/apis/api.rs:459-476]()

## API Parsing and Metadata Generation

The TypeScript parser analyzes source code to extract API definitions and generate metadata for runtime use.

### Resource Parser Pipeline

The API endpoint parser (`ENDPOINT_PARSER`) processes TypeScript modules to identify API definitions:

**API Parsing Pipeline**
```mermaid
graph TD
    MODULE["TypeScript Module"] --> SCAN["Scan for api() calls"]
    SCAN --> EXTRACT["Extract APIEndpointLiteral"]
    EXTRACT --> CONFIG["Parse APIOptions"]
    EXTRACT --> HANDLER["Analyze handler function"]
    CONFIG --> PATH["Process path pattern"]
    CONFIG --> METHODS["Determine HTTP methods"]
    HANDLER --> TYPES["Extract parameter/response types"]
    TYPES --> ENCODING["Generate EndpointEncoding"]
    ENCODING --> RESOURCE["Create Endpoint resource"]
    RESOURCE --> BIND["Register resource bind"]
```

The parser creates `APIEndpointLiteral` structures containing:
- Configuration span and parsed options
- Handler function binding information
- Endpoint kind (Typed, Raw, Stream, or StaticAssets)
- Service name and documentation

Sources: [tsparser/src/parser/resources/apis/api.rs:177-403](), [tsparser/src/parser/resources/apis/api.rs:422-430]()

### Endpoint Resource Generation

For each parsed API, the system creates an `Endpoint` resource with encoding information:

```rust
pub struct Endpoint {
    pub range: Range,
    pub name: String,
    pub service_name: String,
    pub encoding: EndpointEncoding,
    // ... configuration fields
}
```

The encoding contains HTTP method mappings, path patterns, and schema information for request/response handling.

Sources: [tsparser/src/parser/resources/apis/api.rs:30-52](), [tsparser/src/parser/resources/apis/encoding.rs]()

## Runtime Handler Registration

At runtime, parsed API metadata is used to register handlers with the Encore runtime system.

### Handler Registration Flow

**Runtime Handler Registration**
```mermaid
graph TD
    META["Endpoint Metadata"] --> SERVER["API Server"]
    META --> REGISTRY["Service Registry"]
    SERVER --> ROUTER["Axum Router"]
    ROUTER --> ROUTES["HTTP Routes"]
    ROUTES --> HANDLER["EndpointHandler"]
    HANDLER --> SCHEMA["Request Schema"]
    HANDLER --> AUTH["Auth Validation"]
    HANDLER --> BUSINESS["Business Logic"]
    REGISTRY --> DISCOVERY["Service Discovery"]
    DISCOVERY --> CALLS["Inter-service Calls"]
```

The runtime creates `EndpointHandler` instances that wrap the actual business logic with:
- Request parsing and validation
- Authentication and authorization
- Tracing and observability
- Error handling and response formatting

Sources: [runtimes/core/src/api/endpoint.rs:405-432](), [runtimes/core/src/api/server.rs:42-134]()

### Endpoint Handler Structure

Each endpoint is handled by an `EndpointHandler` containing:

- `endpoint`: Arc reference to endpoint metadata
- `handler`: Boxed handler implementation
- `shared`: Shared data (tracer, auth validators, schemas)

The handler implements the `axum::Handler` trait for integration with the Axum web framework.

Sources: [runtimes/core/src/api/endpoint.rs:405-409](), [runtimes/core/src/api/endpoint.rs:734-741]()

## Request Processing Flow

When a request arrives, it goes through several processing stages before reaching the business logic.

### Gateway to Handler Flow

**Request Processing Pipeline**
```mermaid
graph TD
    CLIENT["HTTP Client"] --> GATEWAY["Pingora Gateway"]
    GATEWAY --> ROUTER["Gateway Router"]
    ROUTER --> UPSTREAM["Upstream Service"]
    UPSTREAM --> AXUM["Axum Server"]
    AXUM --> ENDPOINT["EndpointHandler"]
    ENDPOINT --> PARSE["Request Parsing"]
    PARSE --> AUTH["Authentication"]
    AUTH --> VALIDATE["Schema Validation"]
    VALIDATE --> BUSINESS["Business Handler"]
    BUSINESS --> RESPONSE["Response Encoding"]
    RESPONSE --> CLIENT
```

The gateway performs initial routing and forwards requests to the appropriate service instances. The receiving service then processes the request through its endpoint handlers.

Sources: [runtimes/core/src/api/gateway/mod.rs:195-275](), [runtimes/core/src/api/endpoint.rs:559-700]()

### Request Parsing and Validation

The `EndpointHandler.parse_request()` method extracts and validates request data:

1. **Method Validation**: Ensures the HTTP method matches endpoint configuration
2. **Schema Resolution**: Finds the appropriate request schema for the method
3. **Authentication**: Validates platform and service-level authentication
4. **Payload Extraction**: Parses path parameters, query strings, headers, cookies, and body
5. **Request Construction**: Creates a `model::Request` with all extracted data

The parsed request includes tracing information, authentication data, and structured payload data ready for business logic processing.

Sources: [runtimes/core/src/api/endpoint.rs:435-557](), [runtimes/core/src/api/endpoint.rs:469-497]()

## Code Generation for Client Libraries

Encore generates client libraries that provide typed interfaces for calling APIs.

### Client Generation Process

**Client Code Generation**
```mermaid
graph TD
    ENDPOINTS["Parsed Endpoints"] --> CODEGEN["Code Generator"]
    CODEGEN --> TEMPLATES["Handlebars Templates"]
    TEMPLATES --> DTYPES["TypeScript Definitions"]
    TEMPLATES --> JSIMPL["JavaScript Implementation"]
    TEMPLATES --> TESTING["Test Implementations"]
    DTYPES --> CATALOG["Client Catalog"]
    JSIMPL --> CATALOG
    TESTING --> CATALOG
    CATALOG --> IMPORT["Import in User Code"]
```

The code generator creates three main files for each service:
- `.d.ts` files with TypeScript type definitions
- `.js` files with runtime implementation
- `_testing.js` files for test environments

Sources: [tsparser/src/builder/codegen.rs:250-336](), [tsparser/src/builder/templates/catalog/clients/endpoints_d_ts.handlebars]()

### Generated Client Interface

Generated clients provide functions that match the original API signatures but add call options:

```typescript
// For typed endpoints
declare const myEndpoint: WithCallOpts<typeof myEndpoint_handler>;

// For streaming endpoints  
export function streamEndpoint(
  data: HandshakeData,
  opts?: CallOpts
): Promise<StreamInOut<Request, Response>>;
```

The generated code handles:
- Parameter passing and response typing
- Stream interface wrapping for WebSocket connections
- Test environment routing to local handlers
- Call options for authentication and tracing

Sources: [tsparser/src/builder/templates/catalog/clients/endpoints_d_ts.handlebars:36-87](), [tsparser/src/builder/templates/catalog/clients/endpoints_js.handlebars:7-32]()

### Test Handler Registration

In test environments, the generated clients automatically register handlers locally rather than making network calls:

```javascript
export async function myEndpoint(params, opts) {
    if (process.env.NODE_ENV === "test") {
        return TEST_ENDPOINTS.myEndpoint(params, opts);
    }
    return apiCall("service", "endpoint", params, opts);
}
```

Test implementations import the actual handler functions and register them with the test runtime before making the call.

Sources: [tsparser/src/builder/templates/catalog/clients/endpoints_testing_js.handlebars:10-32](), [runtimes/js/src/runtime.rs:187-198]()

---

# Page: Developer Tools

# Developer Tools

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [cli/cmd/encore/check.go](cli/cmd/encore/check.go)
- [cli/cmd/encore/db.go](cli/cmd/encore/db.go)
- [cli/cmd/encore/main.go](cli/cmd/encore/main.go)
- [cli/cmd/encore/run.go](cli/cmd/encore/run.go)
- [cli/cmd/encore/test.go](cli/cmd/encore/test.go)
- [cli/daemon/dash/ai/assembler.go](cli/daemon/dash/ai/assembler.go)
- [cli/daemon/dash/ai/client.go](cli/daemon/dash/ai/client.go)
- [cli/daemon/dash/ai/codegen.go](cli/daemon/dash/ai/codegen.go)
- [cli/daemon/dash/ai/conv.go](cli/daemon/dash/ai/conv.go)
- [cli/daemon/dash/ai/manager.go](cli/daemon/dash/ai/manager.go)
- [cli/daemon/dash/ai/overlay.go](cli/daemon/dash/ai/overlay.go)
- [cli/daemon/dash/ai/parser.go](cli/daemon/dash/ai/parser.go)
- [cli/daemon/dash/ai/sql.go](cli/daemon/dash/ai/sql.go)
- [cli/daemon/dash/ai/types.go](cli/daemon/dash/ai/types.go)
- [cli/daemon/dash/apiproxy/apiproxy.go](cli/daemon/dash/apiproxy/apiproxy.go)
- [cli/daemon/dash/dash.go](cli/daemon/dash/dash.go)
- [cli/daemon/dash/server.go](cli/daemon/dash/server.go)
- [v2/codegen/rewrite/rewrite.go](v2/codegen/rewrite/rewrite.go)
- [v2/codegen/rewrite/rewrite_test.go](v2/codegen/rewrite/rewrite_test.go)

</details>



This document provides an overview of the developer tools available in the Encore platform. These tools facilitate the development, testing, debugging, and monitoring of Encore applications. For infrastructure components, see [Infrastructure Components](#5), and for information about the application lifecycle, see [Application Lifecycle](#6).

## CLI Command Interface

The primary way developers interact with Encore is through the `encore` command-line interface, which provides various commands for managing applications.

```mermaid
graph TB
    subgraph "CLI Commands"
        cmd_encore["encore command"]
        cmd_run["run - Execute local application"]
        cmd_test["test - Run application tests"]
        cmd_check["check - Verify application syntax"]
        cmd_app["app - Manage applications"]
        cmd_config["config - Manage configuration"]
        cmd_secrets["secrets - Manage application secrets"]
        cmd_namespace["namespace - Manage namespaces"]
    end
    
    cmd_encore --> cmd_run
    cmd_encore --> cmd_test
    cmd_encore --> cmd_check
    cmd_encore --> cmd_app
    cmd_encore --> cmd_config
    cmd_encore --> cmd_secrets
    cmd_encore --> cmd_namespace
```

Sources: [cli/cmd/encore/main.go:1-81](), [cli/cmd/encore/run.go:1-153](), [cli/cmd/encore/test.go:1-208](), [cli/cmd/encore/check.go:1-61]()

### Core Commands

| Command | Description | Primary Options |
|---------|-------------|----------------|
| `run` | Executes the application locally with hot-reloading | `--watch`, `--port`, `--debug`, `--browser` |
| `test` | Runs application tests | `--trace`, `--codegen-debug`, `--no-color` |
| `check` | Verifies application syntax and checks for errors | `--codegen-debug`, `--tests` |

### Command Execution Flow

The following diagram illustrates how commands flow through the system:

```mermaid
sequenceDiagram
    participant Dev as "Developer"
    participant CLI as "encore command"
    participant Daemon as "Daemon Service"
    participant RunMgr as "Run Manager"
    participant AppMgr as "Apps Manager"
    participant NS as "Namespace Manager"
    
    Dev->>CLI: encore run
    CLI->>Daemon: setupDaemon(ctx)
    CLI->>Daemon: Run(RunRequest)
    Daemon->>AppMgr: Track(appRoot)
    Daemon->>NS: GetActive(ctx, app)
    Daemon->>RunMgr: Run(...)
    RunMgr-->>Daemon: Stream output
    Daemon-->>CLI: Stream output
    CLI-->>Dev: Display output
```

Sources: [cli/cmd/encore/run.go:78-149](), [cli/daemon/daemon.go:58-244]()

## Developer Dashboard

The Developer Dashboard provides a web-based interface for interacting with Encore applications. It presents information about application status, traces, endpoints, and provides AI-assisted development capabilities.

```mermaid
graph TB
    subgraph "Developer Dashboard Architecture"
        dash["dash.Server"]
        wsHandler["WebSocket Handler"]
        rpcAPI["JSON-RPC API"]
        uiProxy["UI Proxy"]
        apiProxy["API Proxy"]
    end
    
    subgraph "Core Services"
        appsMgr["Apps Manager"]
        runMgr["Run Manager"]
        nsMgr["Namespace Manager"]
        traceStore["Trace Store"]
        aiMgr["AI Manager"]
    end
    
    dash --> wsHandler
    dash --> uiProxy
    dash --> apiProxy
    wsHandler --> rpcAPI
    
    rpcAPI --> appsMgr
    rpcAPI --> runMgr
    rpcAPI --> nsMgr
    rpcAPI --> traceStore
    rpcAPI --> aiMgr
```

Sources: [cli/daemon/dash/server.go:1-203](), [cli/daemon/dash/dash.go:1-1182]()

### Dashboard Features

The Dashboard exposes various functionalities through its JSON-RPC API:

| Feature Category | Methods | Description |
|------------------|---------|-------------|
| Application Management | `list-apps`, `status` | List applications and view their status |
| Tracing | `traces/list`, `traces/get`, `traces/clear` | View and manage application traces |
| API Testing | `api-call` | Make test API calls to endpoints |
| Database | `db-migration-status` | View database migration status |
| Development | `editors/list`, `editors/open` | Interact with code editors |
| AI Features | `ai/*` methods | Access AI-assisted development features |

Sources: [cli/daemon/dash/dash.go:87-568]()

### Dashboard Server Initialization

The Dashboard server is initialized in the daemon startup process:

```mermaid
sequenceDiagram
    participant Daemon as "Daemon"
    participant DashServer as "dash.Server"
    participant AIManager as "ai.Manager"
    participant TraceStore as "trace2.Store"
    participant RunManager as "run.Manager"
    
    Daemon->>+DashServer: NewServer(appsMgr, runMgr, nsMgr, tr, dashPort)
    DashServer->>AIManager: NewAIManager()
    DashServer->>RunManager: AddListener(server)
    DashServer->>TraceStore: Listen(server.traceCh)
    DashServer->>DashServer: go listenTraces()
    DashServer-->>-Daemon: Return server
    Daemon->>Daemon: http.Serve(dash, dashServer)
```

Sources: [cli/daemon/dash/server.go:31-62](), [cli/cmd/encore/daemon/daemon.go:264-268]()

## AI-Assisted Development

Encore provides AI-assisted development capabilities through the AI Manager, which integrates with external AI services to generate code, suggest API designs, and more.

```mermaid
graph TB
    subgraph "AI System Components"
        aiManager["ai.Manager"]
        aiClient["AI GraphQL Client"]
        endpointAssembler["endpointsAssembler"]
        codeGen["Code Generator"]
        codeParser["Code Parser"]
        sqlParser["SQL Schema Parser"]
    end
    
    subgraph "External Services"
        graphqlAPI["Encore AI GraphQL API"]
    end
    
    aiManager --> aiClient
    aiClient --> graphqlAPI
    graphqlAPI --> aiClient
    aiManager --> endpointAssembler
    aiManager --> codeGen
    aiManager --> codeParser
    aiManager --> sqlParser
```

Sources: [cli/daemon/dash/ai/manager.go:1-92](), [cli/daemon/dash/ai/client.go:1-154](), [cli/daemon/dash/ai/assembler.go:1-279]()

### AI Feature Flow

The following diagram illustrates the process flow for AI-assisted system design:

```mermaid
sequenceDiagram
    participant Dev as "Developer"
    participant Dashboard as "Developer Dashboard"
    participant Handler as "dash.handler"
    participant AIManager as "ai.Manager"
    participant AIClient as "GraphQL Client"
    participant EPAssembler as "Endpoints Assembler"
    
    Dev->>Dashboard: Request system design
    Dashboard->>Handler: ai/propose-system-design
    Handler->>AIManager: ProposeSystemDesign(...)
    AIManager->>AIClient: startAITask(...)
    AIClient->>AIManager: Stream AI responses
    AIManager->>EPAssembler: Process updates
    EPAssembler->>AIManager: Return assembled endpoints
    AIManager->>Handler: Stream updates
    Handler->>Dashboard: Render updates
    Dashboard->>Dev: Display proposed design
```

Sources: [cli/daemon/dash/dash.go:343-396](), [cli/daemon/dash/ai/manager.go:23-34]()

### AI Features

The AI Manager provides the following capabilities:

| Feature | Method | Description |
|---------|--------|-------------|
| System Design Proposal | `ProposeSystemDesign` | Generate system design from text prompt |
| Design Modification | `ModifySystemDesign` | Modify existing system design |
| Endpoint Definition | `DefineEndpoints` | Generate API endpoint definitions |
| Code Analysis | `ParseCode` | Analyze existing code for endpoints |
| Code Generation | `UpdateCode` | Generate or update code from designs |
| File Preview | `PreviewFiles` | Preview generated code before saving |
| File Creation | `WriteFiles` | Create files from generated code |

Sources: [cli/daemon/dash/ai/manager.go:23-92]()

## Tracing and Observability

Encore provides built-in tracing capabilities that allow developers to monitor and debug their applications.

```mermaid
graph TB
    subgraph "Tracing Components"
        traceStore["trace2.Store"]
        traceRecorder["trace2.Recorder"]
        traceCh["traceCh channel"]
        dashHandler["dash.handler (traces/*)"]
    end
    
    subgraph "Dashboard"
        traceViewer["Trace Viewer UI"]
        wsNotifier["WebSocket Notifier"]
    end
    
    traceRecorder --> traceStore
    traceStore --> traceCh
    traceCh --> wsNotifier
    dashHandler --> traceStore
    wsNotifier --> traceViewer
```

Sources: [cli/daemon/dash/dash.go:200-262](), [cli/daemon/dash/server.go:59-60](), [cli/daemon/dash/server.go:649-674]()

### Trace API Methods

The Dashboard provides the following methods for interacting with traces:

| Method | Handler Function | Description |
|--------|-----------------|-------------|
| `traces/list` | [cli/daemon/dash/dash.go:211-238]() | List traces for an application |
| `traces/get` | [cli/daemon/dash/dash.go:240-258]() | Get details for a specific trace |
| `traces/clear` | [cli/daemon/dash/dash.go:202-210]() | Clear traces for an application |

### Trace Event Flow

```mermaid
sequenceDiagram
    participant App as "Running Application"
    participant Recorder as "trace2.Recorder"
    participant Store as "trace2.Store"
    participant Server as "dash.Server"
    participant Dashboard as "Developer Dashboard"
    
    App->>Recorder: Record trace event
    Recorder->>Store: Store event
    Store->>Server: Send to traceCh
    Server->>Server: listenTraces()
    Server->>Dashboard: notify("trace/new")
    Dashboard->>Dashboard: Update UI
```

Sources: [cli/daemon/dash/server.go:649-674]()

## Editor Integration

Encore integrates with code editors to allow developers to open and edit files directly from the Developer Dashboard.

```mermaid
graph TB
    subgraph "Editor Integration Components"
        dashHandler["dash.handler (editors/*)"]
        editorFinder["editors.Resolve"]
        editorLauncher["editors.LaunchExternalEditor"]
    end
    
    subgraph "Supported Editors"
        vscode["Visual Studio Code"]
        intellij["IntelliJ"]
        goland["GoLand"]
        other["Other Editors"]
    end
    
    dashHandler --> editorFinder
    dashHandler --> editorLauncher
    editorLauncher --> vscode
    editorLauncher --> intellij
    editorLauncher --> goland
    editorLauncher --> other
```

Sources: [cli/daemon/dash/dash.go:524-567]()

### Editor Integration Methods

| Method | Description |
|--------|-------------|
| `editors/list` | Lists available code editors |
| `editors/open` | Opens a file in the selected editor |

The editor integration enables a seamless workflow by allowing developers to navigate from traces, API calls, or other dashboard features directly to the relevant code in their preferred editor.

Sources: [cli/daemon/dash/dash.go:524-567]()

## Integration Between Tools

The Developer Tools are designed to work together seamlessly. The following diagram illustrates the relationship between the CLI, Dashboard, and other components:

```mermaid
graph TB
    subgraph "Developer Tools Integration"
        cli["encore command"]
        daemon["Daemon Service"]
        dashboard["Developer Dashboard"]
        runner["Run Manager"]
        tracer["Trace System"]
        ai["AI Assistant"]
    end
    
    cli -- "starts/connects to" --> daemon
    cli -- "opens" --> dashboard
    dashboard -- "communicates via WebSocket" --> daemon
    daemon -- "manages" --> runner
    runner -- "generates" --> tracer
    dashboard -- "displays" --> tracer
    dashboard -- "uses" --> ai
```

Sources: [cli/cmd/encore/daemon/daemon.go:1-650](), [cli/daemon/dash/server.go:1-203]()

This integration allows developers to use whatever interface they prefer - whether it's the command line or the graphical dashboard - while still having access to all of Encore's development features.

---

# Page: CLI Interface

# CLI Interface

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [cli/cmd/encore/app/create.go](cli/cmd/encore/app/create.go)
- [cli/cmd/encore/app/create_form.go](cli/cmd/encore/app/create_form.go)
- [cli/cmd/encore/app/create_test.go](cli/cmd/encore/app/create_test.go)
- [cli/cmd/encore/app/initialize.go](cli/cmd/encore/app/initialize.go)
- [cli/cmd/encore/build.go](cli/cmd/encore/build.go)
- [cli/cmd/encore/check.go](cli/cmd/encore/check.go)
- [cli/cmd/encore/daemon/daemon.go](cli/cmd/encore/daemon/daemon.go)
- [cli/cmd/encore/db.go](cli/cmd/encore/db.go)
- [cli/cmd/encore/main.go](cli/cmd/encore/main.go)
- [cli/cmd/encore/run.go](cli/cmd/encore/run.go)
- [cli/cmd/encore/test.go](cli/cmd/encore/test.go)
- [internal/env/env.go](internal/env/env.go)
- [internal/version/version.go](internal/version/version.go)
- [pkg/eerror/stack.go](pkg/eerror/stack.go)

</details>



This document covers the technical architecture and implementation of Encore's command-line interface (CLI). It focuses on the code structure, command organization, and integration patterns used to build the `encore` CLI tool.

For information about the underlying daemon service that the CLI communicates with, see [Daemon Service](#2.1). For details about application creation workflows, see [Application Creation](#6.1).

## CLI Architecture Overview

The Encore CLI is built using the Cobra command framework and follows a modular command registration pattern. The CLI serves as the primary interface for developers to interact with Encore applications and integrates heavily with the Encore daemon for runtime operations.

```mermaid
graph TB
    subgraph "CLI Entry Point"
        main["main.go"]
        rootCmd["root.Cmd"]
    end
    
    subgraph "Command Packages"
        appPkg["app package"]
        configPkg["config package"] 
        k8sPkg["k8s package"]
        namespacePkg["namespace package"]
        secretsPkg["secrets package"]
    end
    
    subgraph "Core Commands"
        runCmd["runCmd (run.go)"]
        testCmd["testCmd (test.go)"]
        dbCmd["dbCmd (db.go)"]
        buildCmd["buildCmd (build.go)"]
        checkCmd["checkCmd (check.go)"]
    end
    
    subgraph "Daemon Integration"
        daemonSetup["setupDaemon()"]
        daemonpb["daemonpb gRPC client"]
        streamOutput["cmdutil.StreamCommandOutput()"]
    end
    
    main --> rootCmd
    rootCmd --> appPkg
    rootCmd --> configPkg
    rootCmd --> k8sPkg
    rootCmd --> namespacePkg
    rootCmd --> secretsPkg
    
    rootCmd --> runCmd
    rootCmd --> testCmd
    rootCmd --> dbCmd
    rootCmd --> buildCmd
    rootCmd --> checkCmd
    
    runCmd --> daemonSetup
    testCmd --> daemonSetup
    dbCmd --> daemonSetup
    buildCmd --> daemonSetup
    checkCmd --> daemonSetup
    
    daemonSetup --> daemonpb
    daemonpb --> streamOutput
```

Sources: [cli/cmd/encore/main.go:14-20](), [cli/cmd/encore/main.go:23](), [cli/cmd/encore/run.go:48-76]()

## Command Registration Pattern

The CLI uses Go's init() functions and blank imports to automatically register commands. Each command package registers itself when imported, following a plugin-like architecture.

| Package | Commands | Purpose |
|---------|----------|---------|
| `app` | `create`, `init`, `link` | Application lifecycle management |
| `config` | Configuration management | Environment and deployment settings |
| `k8s` | Kubernetes integration | Container orchestration |
| `namespace` | Namespace management | Multi-tenancy and isolation |
| `secrets` | Secret management | Secure credential handling |

The root command structure is defined in the `root` package, with individual commands adding themselves to the command tree during package initialization.

Sources: [cli/cmd/encore/main.go:14-20](), [cli/cmd/encore/main.go:22-23]()

## Core Command Implementations

### Application Execution Commands

#### `encore run`

The `runCmd` handles local application execution with live-reload capabilities. It communicates with the daemon to orchestrate the runtime environment.

```mermaid
graph LR
    runCmd["runCmd"] --> setupDaemon["setupDaemon()"]
    runCmd --> parseFlags["Parse Flags"]
    parseFlags --> listenAddr["Determine Listen Address"]
    parseFlags --> debugMode["Set Debug Mode"]
    parseFlags --> browserMode["Set Browser Mode"]
    
    setupDaemon --> daemonRun["daemon.Run()"]
    listenAddr --> daemonRun
    debugMode --> daemonRun
    browserMode --> daemonRun
    
    daemonRun --> streamOutput["StreamCommandOutput()"]
```

Key flags and options:
- `--watch` / `-w`: Enable live-reload (default: true)
- `--port` / `-p`: Specify port (default: 4000)  
- `--listen`: Custom listen address
- `--debug`: Debug mode with breakpoints
- `--browser`: Browser opening behavior

Sources: [cli/cmd/encore/run.go:48-76](), [cli/cmd/encore/run.go:79-149]()

#### `encore test`

The `testCmd` provides testing capabilities with support for both Go and TypeScript applications. It uses different execution paths based on the detected application type.

For TypeScript applications, it uses `daemon.TestSpec()` to get the test command specification, then executes the test runner directly. For Go applications, it uses `daemon.Test()` to run tests through the daemon with additional Encore-specific setup.

Sources: [cli/cmd/encore/test.go:24-78](), [cli/cmd/encore/test.go:80-148]()

#### `encore check`

The `checkCmd` performs compile-time validation without executing the application. It supports additional debugging options for Encore's code generation process.

Sources: [cli/cmd/encore/check.go:20-35](), [cli/cmd/encore/check.go:37-60]()

### Database Management Commands

The `dbCmd` provides a comprehensive set of database operations through several subcommands:

| Subcommand | Purpose | Key Flags |
|------------|---------|-----------|
| `reset` | Reset database schemas | `--all`, `--test`, `--shadow` |
| `shell` | Connect via psql | `--env`, `--write`, `--admin` |
| `proxy` | Create proxy tunnel | `--port`, `--env` |
| `conn-uri` | Get connection string | `--test`, `--shadow` |

The database commands use a role-based access system with different privilege levels (read, write, admin, superuser) and support multiple cluster types (run, test, shadow).

Sources: [cli/cmd/encore/db.go:23-26](), [cli/cmd/encore/db.go:51-82](), [cli/cmd/encore/db.go:86-182]()

### Build and Export Commands

The `buildCmd` provides Docker image generation capabilities through the `docker` subcommand. It supports cross-compilation and configurable base images.

```mermaid
graph TD
    buildCmd["buildCmd"] --> dockerBuildCmd["docker subcommand"]
    dockerBuildCmd --> parseParams["Parse Build Parameters"]
    parseParams --> targetOS["Set Target OS/Arch"]
    parseParams --> baseImage["Set Base Image"]  
    parseParams --> services["Select Services/Gateways"]
    
    targetOS --> daemonExport["daemon.Export()"]
    baseImage --> daemonExport
    services --> daemonExport
    
    daemonExport --> dockerParams["DockerExportParams"]
    dockerParams --> streamBuild["Stream Build Output"]
```

Build parameters include:
- Target OS and architecture
- Base Docker image selection
- CGO enablement
- Service and gateway filtering
- Push vs local tagging

Sources: [cli/cmd/encore/build.go:32-76](), [cli/cmd/encore/build.go:93-150]()

## Application Creation Workflow

The application creation system provides both CLI and interactive modes for creating new Encore applications.

### Command Structure

```mermaid
graph TB
    appCreate["encore app create"] --> hasArgs{"Has name/template args?"}
    hasArgs -->|Yes| directCreate["Direct Creation"]
    hasArgs -->|No| interactiveForm["Interactive Form"]
    
    interactiveForm --> selectTemplate["selectTemplate()"]
    selectTemplate --> languageSelect["Language Selection"]
    languageSelect --> templateSelect["Template Selection"] 
    templateSelect --> nameInput["Name Input"]
    
    directCreate --> createApp["createApp()"]
    nameInput --> createApp
    
    createApp --> validateName["validateName()"]
    createApp --> downloadTemplate["Download Template"]
    createApp --> platformSetup["Platform Setup"]
    createApp --> daemonCreate["daemon.CreateApp()"]
```

The interactive form system uses the Bubble Tea framework to provide a rich terminal UI with language selection, template browsing, and name validation.

Sources: [cli/cmd/encore/app/create.go:118-337](), [cli/cmd/encore/app/create_form.go:435-556]()

### Template System

The template system supports both built-in templates and remote GitHub repositories. Templates are categorized by language (Go/TypeScript) and complexity level.

Key components:
- `templateItem` struct for template metadata
- `loadTemplates()` for fetching remote template lists
- `parseTemplate()` for GitHub URL parsing
- `github.ExtractTree()` for template downloading

Sources: [cli/cmd/encore/app/create_form.go:39-48](), [cli/cmd/encore/app/create_form.go:682-697]()

## Daemon Integration Architecture

The CLI integrates with the Encore daemon through gRPC for most operations. The daemon provides the core runtime orchestration, while the CLI serves as the user interface.

```mermaid
graph LR
    subgraph "CLI Process"
        cmdutil["cmdutil package"]
        setupDaemon["setupDaemon()"]
        grpcClient["gRPC Client"]
    end
    
    subgraph "Daemon Process" 
        daemonSocket["encored.sock"]
        daemonServer["daemon.Server"]
        runManager["run.Manager"]
        clusterManager["sqldb.ClusterManager"]
    end
    
    subgraph "Runtime Services"
        runtime["Runtime Server"]
        dbProxy["DB Proxy"] 
        dashboard["Dashboard"]
        tracing["Trace Store"]
    end
    
    setupDaemon --> grpcClient
    grpcClient --> daemonSocket
    daemonSocket --> daemonServer
    
    daemonServer --> runManager
    daemonServer --> clusterManager
    
    runManager --> runtime
    clusterManager --> dbProxy
    daemonServer --> dashboard
    daemonServer --> tracing
```

### Communication Patterns

1. **Socket Communication**: CLI connects to daemon via Unix socket at `~/.cache/encore/encored.sock`
2. **Streaming Operations**: Long-running operations (run, test, build) use gRPC streaming for real-time output
3. **Output Processing**: `cmdutil.StreamCommandOutput()` handles output conversion and formatting
4. **Error Handling**: gRPC status codes map to appropriate CLI exit codes

Sources: [cli/cmd/encore/daemon/daemon.go:196-223](), [cli/cmd/encore/run.go:116-149]()

### Daemon Service Integration

The daemon provides multiple service endpoints that the CLI leverages:

| Service | Port Range | Purpose |
|---------|------------|---------|
| gRPC API | Unix Socket | Command execution and control |
| Runtime | 9600+ | Application runtime proxy |
| DB Proxy | 9500+ | Database connection proxy |
| Dashboard | 9400+ | Development web interface |
| Debug | 9700+ | pprof debugging endpoints |

The daemon automatically handles port allocation and service lifecycle management, while the CLI provides the user-facing command interface.

Sources: [cli/cmd/encore/daemon/daemon.go:127-135](), [cli/cmd/encore/daemon/daemon.go:186-297]()

---

# Page: Developer Dashboard

# Developer Dashboard

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [cli/daemon/dash/ai/assembler.go](cli/daemon/dash/ai/assembler.go)
- [cli/daemon/dash/ai/client.go](cli/daemon/dash/ai/client.go)
- [cli/daemon/dash/ai/codegen.go](cli/daemon/dash/ai/codegen.go)
- [cli/daemon/dash/ai/conv.go](cli/daemon/dash/ai/conv.go)
- [cli/daemon/dash/ai/manager.go](cli/daemon/dash/ai/manager.go)
- [cli/daemon/dash/ai/overlay.go](cli/daemon/dash/ai/overlay.go)
- [cli/daemon/dash/ai/parser.go](cli/daemon/dash/ai/parser.go)
- [cli/daemon/dash/ai/sql.go](cli/daemon/dash/ai/sql.go)
- [cli/daemon/dash/ai/types.go](cli/daemon/dash/ai/types.go)
- [cli/daemon/dash/apiproxy/apiproxy.go](cli/daemon/dash/apiproxy/apiproxy.go)
- [cli/daemon/dash/dash.go](cli/daemon/dash/dash.go)
- [cli/daemon/dash/server.go](cli/daemon/dash/server.go)
- [v2/codegen/rewrite/rewrite.go](v2/codegen/rewrite/rewrite.go)
- [v2/codegen/rewrite/rewrite_test.go](v2/codegen/rewrite/rewrite_test.go)

</details>



The Developer Dashboard is a web-based development interface that provides real-time application monitoring, AI-assisted system design, distributed tracing, and API testing capabilities. It serves as the primary GUI for developers working with Encore applications during local development.

For information about the command-line interface, see [CLI Interface](#4.1). For details about tracing data collection and storage, see [Tracing and Observability](#4.4).

## System Architecture

The Developer Dashboard consists of a local HTTP server that proxies requests to the Encore Cloud dashboard frontend while providing WebSocket-based real-time communication for local application data.

```mermaid
graph TB
    subgraph "Dashboard Server"
        Server["Server<br/>(server.go)"]
        Handler["handler<br/>(dash.go)"]
        WSConn["WebSocket Connection<br/>(jsonrpc2.Conn)"]
    end
    
    subgraph "Proxy Layers"
        DashProxy["dashproxy<br/>(Remote Frontend)"]
        APIProxy["apiproxy<br/>(GraphQL API)"]
    end
    
    subgraph "Core Managers"
        AppsMgr["apps.Manager"]
        RunMgr["run.Manager"]
        TraceMgr["trace2.Store"]
        AIMgr["ai.Manager"]
    end
    
    subgraph "Client"
        Browser["Web Browser"]
        Frontend["Dashboard Frontend"]
    end
    
    Browser --> Server
    Server --> DashProxy
    Server --> APIProxy
    Server --> WSConn
    WSConn --> Handler
    Handler --> AppsMgr
    Handler --> RunMgr
    Handler --> TraceMgr
    Handler --> AIMgr
    
    style Server fill:#e1f5fe
    style Handler fill:#fff3e0
    style AIMgr fill:#f3e5f5
```

*Sources: [cli/daemon/dash/server.go:64-77](), [cli/daemon/dash/dash.go:36-43]()*

## WebSocket Communication Protocol

The dashboard uses JSON-RPC 2.0 over WebSocket for real-time communication between the frontend and the local daemon. The WebSocket endpoint is served at `/__encore` and handles various method calls and notifications.

```mermaid
sequenceDiagram
    participant Frontend as "Dashboard Frontend"
    participant WSConn as "WebSocket Connection"
    participant Handler as "handler.Handle()"
    participant RunMgr as "run.Manager"
    participant TraceMgr as "trace2.Store"
    
    Frontend->>WSConn: Connect to /__encore
    WSConn->>Handler: JSON-RPC method calls
    
    Handler->>RunMgr: FindRunByAppID()
    RunMgr-->>Handler: Run instance
    
    Handler->>TraceMgr: List(query)
    TraceMgr-->>Handler: Trace events
    
    Handler-->>WSConn: JSON-RPC response
    WSConn-->>Frontend: Real-time data
    
    RunMgr->>WSConn: Process notifications
    TraceMgr->>WSConn: New trace events
```

*Sources: [cli/daemon/dash/server.go:91-120](), [cli/daemon/dash/dash.go:82-567]()*

### Key RPC Methods

The `handler.Handle()` method supports numerous RPC methods for different dashboard features:

| Method | Purpose | Key Parameters |
|--------|---------|----------------|
| `list-apps` | List all available applications | None |
| `status` | Get application runtime status | `appID` |
| `traces/list` | Retrieve trace summaries | `appID`, `messageID`, `testTraces` |
| `traces/get` | Get detailed trace events | `appID`, `traceID` |
| `api-call` | Execute API calls for testing | `run.ApiCallParams` |
| `ai/propose-system-design` | Generate AI system design | `appID`, `prompt` |
| `editors/open` | Open files in external editors | `appID`, `editor`, `file` |

*Sources: [cli/daemon/dash/dash.go:92-567]()*

## AI-Assisted Development

The dashboard integrates AI capabilities for system design and code generation through the `ai.Manager` component.

```mermaid
graph LR
    subgraph "AI Workflow"
        ProposeDesign["ai.Manager.ProposeSystemDesign()"]
        ModifyDesign["ai.Manager.ModifySystemDesign()"]
        DefineEndpoints["ai.Manager.DefineEndpoints()"]
        ParseCode["ai.Manager.ParseCode()"]
        WriteFiles["ai.Manager.WriteFiles()"]
    end
    
    subgraph "AI Types"
        Service["ai.Service"]
        Endpoint["ai.Endpoint"]
        AITask["ai.AITask"]
        AINotification["ai.AINotification"]
    end
    
    subgraph "Code Generation"
        Overlays["overlay system"]
        ServicePaths["servicePaths"]
        CodeGen["generateSrcFiles()"]
    end
    
    ProposeDesign --> Service
    ModifyDesign --> Service
    DefineEndpoints --> Endpoint
    ParseCode --> Overlays
    WriteFiles --> CodeGen
    
    Service --> ServicePaths
    Endpoint --> ServicePaths
    AITask --> AINotification
```

*Sources: [cli/daemon/dash/ai/manager.go:17-92](), [cli/daemon/dash/ai/types.go:80-98]()*

### AI Service Structure

The AI system models services and endpoints using structured types:

```mermaid
classDiagram
    class Service {
        +string ID
        +string Name
        +string Doc
        +[]Endpoint Endpoints
        +GetName() string
        +GetEndpoints() []Endpoint
        +GraphQL() ServiceInput
    }
    
    class Endpoint {
        +string ID
        +string Name
        +string Doc
        +string Method
        +VisibilityType Visibility
        +PathSegments Path
        +string RequestType
        +string ResponseType
        +[]Error Errors
        +[]Type Types
        +string EndpointSource
        +string TypeSource
        +Render() string
    }
    
    class PathSegment {
        +SegmentType Type
        +string Value
        +SegmentValueType ValueType
        +string Doc
    }
    
    Service --> Endpoint
    Endpoint --> PathSegment
```

*Sources: [cli/daemon/dash/ai/types.go:80-98](), [cli/daemon/dash/ai/types.go:41-72]()*

## Application Status Monitoring

The dashboard provides real-time monitoring of application status through the `appStatus` structure and various event listeners.

```mermaid
graph TB
    subgraph "Status Data Flow"
        AppInstance["apps.Instance"]
        RunInstance["run.Run"]
        StatusBuilder["buildAppStatus()"]
        AppStatus["appStatus struct"]
    end
    
    subgraph "Event Listeners"
        OnStart["Server.OnStart()"]
        OnReload["Server.OnReload()"]
        OnStop["Server.OnStop()"]
        OnError["Server.OnError()"]
    end
    
    subgraph "Notifications"
        ProcessStart["process/start"]
        ProcessReload["process/reload"]
        ProcessStop["process/stop"]
        ProcessError["process/compile-error"]
    end
    
    AppInstance --> StatusBuilder
    RunInstance --> StatusBuilder
    StatusBuilder --> AppStatus
    
    OnStart --> ProcessStart
    OnReload --> ProcessReload
    OnStop --> ProcessStop
    OnError --> ProcessError
    
    style AppStatus fill:#e8f5e8
    style ProcessStart fill:#fff3e0
```

*Sources: [cli/daemon/dash/dash.go:766-814](), [cli/daemon/dash/dash.go:617-678]()*

### Application Status Structure

The `appStatus` type encapsulates all runtime information about an application:

| Field | Type | Description |
|-------|------|-------------|
| `Running` | `bool` | Whether the application is currently running |
| `AppID` | `string` | Application identifier |
| `PlatformID` | `string` | Platform-specific identifier |
| `AppRoot` | `string` | Root directory of the application |
| `PID` | `string` | Process ID of running instance |
| `Meta` | `json.RawMessage` | Serialized metadata |
| `Addr` | `string` | Listen address |
| `APIEncoding` | `*encoding.APIEncoding` | API encoding information |
| `Compiling` | `bool` | Whether compilation is in progress |
| `CompileError` | `string` | Compilation error message |

*Sources: [cli/daemon/dash/dash.go:740-752]()*

## Trace Integration

The dashboard integrates with the distributed tracing system to provide real-time trace visualization and analysis.

```mermaid
sequenceDiagram
    participant TraceStore as "trace2.Store"
    participant Server as "dash.Server"
    participant WSConn as "WebSocket Connection"
    participant Frontend as "Dashboard Frontend"
    
    TraceStore->>Server: NewSpanEvent via traceCh
    Server->>Server: listenTraces()
    
    alt Has active clients
        Server->>Server: protoEncoder.Marshal(span)
        Server->>WSConn: notify("trace/new", data)
        WSConn->>Frontend: Real-time trace data
    else No clients
        Server->>Server: Skip marshaling
    end
    
    Frontend->>WSConn: "traces/list" RPC
    WSConn->>TraceStore: List(query)
    TraceStore-->>WSConn: SpanSummary list
    WSConn-->>Frontend: Trace summaries
    
    Frontend->>WSConn: "traces/get" RPC
    WSConn->>TraceStore: Get(appID, traceID)
    TraceStore-->>WSConn: TraceEvent list
    WSConn-->>Frontend: Detailed trace
```

*Sources: [cli/daemon/dash/dash.go:587-612](), [cli/daemon/dash/dash.go:206-253]()*

## Code Generation and File Management

The AI system uses an overlay filesystem to manage generated code before writing it to disk.

```mermaid
graph TB
    subgraph "Code Generation Pipeline"
        Services["[]ai.Service"]
        Overlays["overlays struct"]
        ServicePaths["servicePaths"]
        CodeGen["generateSrcFiles()"]
        WriteFiles["writeFiles()"]
    end
    
    subgraph "Overlay System"
        OverlayFS["overlay filesystem"]
        EndpointOverlay["endpoint overlay"]
        TypesOverlay["types overlay"]
        ToSrcFile["toSrcFile()"]
    end
    
    subgraph "File Operations"
        PreviewFiles["PreviewFiles()"]
        UpdateCode["UpdateCode()"]
        ParseCode["ParseCode()"]
    end
    
    Services --> ServicePaths
    ServicePaths --> Overlays
    Overlays --> OverlayFS
    OverlayFS --> EndpointOverlay
    OverlayFS --> TypesOverlay
    ToSrcFile --> CodeGen
    CodeGen --> WriteFiles
    
    Overlays --> PreviewFiles
    Overlays --> UpdateCode
    Overlays --> ParseCode
```

*Sources: [cli/daemon/dash/ai/codegen.go:177-230](), [cli/daemon/dash/ai/overlay.go:194-343]()*

### Service Path Management

The `servicePaths` structure manages the mapping between service names and file system paths:

```mermaid
classDiagram
    class servicePaths {
        +map[string]paths.RelSlash relPaths
        +paths.FS root
        +paths.Mod module
        +IsNew(svc string) bool
        +PkgPath(svc string) paths.Pkg
        +FileName(svc, name string) paths.FS
        +RelFileName(svc, name string) paths.RelSlash
    }
    
    class overlay {
        +paths.FS path
        +Endpoint endpoint
        +Service service
        +CodeType codeType
        +[]byte content
        +token.Position headerOffset
        +Reader() io.ReadCloser
    }
    
    servicePaths --> overlay
```

*Sources: [cli/daemon/dash/ai/overlay.go:24-84](), [cli/daemon/dash/ai/overlay.go:107-163]()*

## Browser Integration and Editor Support

The dashboard provides integration with external editors and automatic browser launching.

```mermaid
graph LR
    subgraph "Browser Management"
        OnStart["Server.OnStart()"]
        BrowserMode["run.BrowserMode"]
        BrowserOpen["browser.Open()"]
    end
    
    subgraph "Editor Integration"
        EditorsList["editors/list RPC"]
        EditorsOpen["editors/open RPC"]
        EditorFind["editors.Find()"]
        LaunchEditor["editors.LaunchExternalEditor()"]
    end
    
    subgraph "File Operations"
        AppRoot["app.Root()"]
        FilePath["filepath.Join()"]
        FileValidation["filepath.IsLocal()"]
    end
    
    OnStart --> BrowserMode
    BrowserMode --> BrowserOpen
    
    EditorsList --> EditorFind
    EditorsOpen --> FileValidation
    FileValidation --> FilePath
    FilePath --> LaunchEditor
    
    style BrowserOpen fill:#e1f5fe
    style LaunchEditor fill:#fff3e0
```

*Sources: [cli/daemon/dash/dash.go:617-635](), [cli/daemon/dash/dash.go:520-564]()*

The Developer Dashboard serves as the central hub for Encore application development, combining real-time monitoring, AI-assisted development, and comprehensive debugging tools in a unified web interface.

---

# Page: AI-Assisted Development

# AI-Assisted Development

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [cli/daemon/dash/ai/assembler.go](cli/daemon/dash/ai/assembler.go)
- [cli/daemon/dash/ai/client.go](cli/daemon/dash/ai/client.go)
- [cli/daemon/dash/ai/codegen.go](cli/daemon/dash/ai/codegen.go)
- [cli/daemon/dash/ai/conv.go](cli/daemon/dash/ai/conv.go)
- [cli/daemon/dash/ai/manager.go](cli/daemon/dash/ai/manager.go)
- [cli/daemon/dash/ai/overlay.go](cli/daemon/dash/ai/overlay.go)
- [cli/daemon/dash/ai/parser.go](cli/daemon/dash/ai/parser.go)
- [cli/daemon/dash/ai/sql.go](cli/daemon/dash/ai/sql.go)
- [cli/daemon/dash/ai/types.go](cli/daemon/dash/ai/types.go)
- [cli/daemon/dash/apiproxy/apiproxy.go](cli/daemon/dash/apiproxy/apiproxy.go)
- [cli/daemon/dash/dash.go](cli/daemon/dash/dash.go)
- [cli/daemon/dash/server.go](cli/daemon/dash/server.go)
- [v2/codegen/rewrite/rewrite.go](v2/codegen/rewrite/rewrite.go)
- [v2/codegen/rewrite/rewrite_test.go](v2/codegen/rewrite/rewrite_test.go)

</details>



This document covers the AI-powered development assistance features integrated into Encore's local developer dashboard. The AI system helps developers design system architectures, generate API endpoints, and write boilerplate code through natural language prompts and real-time streaming updates.

For information about the broader developer dashboard functionality, see [Developer Dashboard](#4.2). For details about CLI commands and interface, see [CLI Interface](#4.1).

## AI System Architecture

The AI-assisted development system operates as a service within the daemon that communicates with Encore's cloud platform to provide intelligent code generation capabilities.

```mermaid
graph TB
    subgraph "Local Developer Environment"
        DashHandler["handler struct<br/>cli/daemon/dash/dash.go"]
        AIManager["ai.Manager<br/>Manager struct"]
        GraphQLClient["graphql.SubscriptionClient<br/>AI task coordination"]
        Overlays["overlays struct<br/>Virtual file system"]
        ServicePaths["servicePaths<br/>Path management"]
    end
    
    subgraph "Encore Cloud Platform"
        GraphQLAPI["GraphQL Subscription API<br/>conf.WSBaseURL"]
        AIModels["AI Models<br/>System design generation"]
    end
    
    subgraph "Local File System"
        GeneratedFiles["Generated .go files<br/>Service packages"]
        MetaData["Application metadata<br/>meta.Data"]
    end
    
    DashHandler -->|"ai/propose-system-design<br/>ai/modify-system-design<br/>ai/define-endpoints"| AIManager
    AIManager -->|"startAITask[Query]"| GraphQLClient
    GraphQLClient -->|"WebSocket subscription"| GraphQLAPI
    GraphQLAPI -->|"AIStreamMessage updates"| GraphQLClient
    GraphQLClient -->|"AINotification"| AIManager
    AIManager -->|"Stream notifications"| DashHandler
    
    AIManager --> ServicePaths
    AIManager --> Overlays
    ServicePaths -->|"RelFileName()<br/>PkgPath()"| Overlays
    Overlays -->|"writeFiles()<br/>generateSrcFiles()"| GeneratedFiles
    AIManager -->|"GetMeta()"| MetaData
    
    GraphQLAPI --> AIModels
    AIModels --> GraphQLAPI
```

**Sources**: [cli/daemon/dash/ai/manager.go:17-91](), [cli/daemon/dash/dash.go:339-497](), [cli/daemon/dash/ai/client.go:61-138](), [cli/daemon/dash/ai/overlay.go:170-343]()

## AI Manager and Task Coordination

The `ai.Manager` serves as the central coordinator for all AI-assisted development operations, managing task lifecycle and communication between the dashboard and cloud services.

```mermaid
graph LR
    subgraph "AI Manager Core"
        Manager["ai.Manager"]
        TaskCoordinator["AITask Coordination"]
        NotificationHandler["AI Notification Handler"]
    end
    
    subgraph "AI Operations"
        ProposeDesign["ProposeSystemDesign"]
        ModifyDesign["ModifySystemDesign"] 
        DefineEndpoints["DefineEndpoints"]
        ParseCode["ParseCode"]
        UpdateCode["UpdateCode"]
        WriteFiles["WriteFiles"]
        PreviewFiles["PreviewFiles"]
    end
    
    subgraph "Cloud Communication"
        GraphQLClient["GraphQL Subscription Client"]
        StreamingUpdates["Real-time Streaming"]
        ErrorHandling["Error Code Mapping"]
    end
    
    Manager --> TaskCoordinator
    Manager --> NotificationHandler
    
    Manager --> ProposeDesign
    Manager --> ModifyDesign
    Manager --> DefineEndpoints
    Manager --> ParseCode
    Manager --> UpdateCode
    Manager --> WriteFiles
    Manager --> PreviewFiles
    
    TaskCoordinator --> GraphQLClient
    GraphQLClient --> StreamingUpdates
    StreamingUpdates --> NotificationHandler
    ErrorHandling --> NotificationHandler
```

**Sources**: [cli/daemon/dash/ai/manager.go:17-91](), [cli/daemon/dash/ai/client.go:81-154](), [cli/daemon/dash/dash.go:339-497]()

## AI Task Lifecycle and Streaming

AI operations in Encore follow a task-based model with real-time streaming updates delivered through WebSocket connections.

```mermaid
sequenceDiagram
    participant Dashboard as "Developer Dashboard"
    participant Daemon as "Encore Daemon"
    participant AIManager as "ai.Manager"
    participant GraphQL as "GraphQL Client"
    participant Platform as "Encore Platform"
    
    Dashboard->>Daemon: JSON-RPC Request (ai/propose-system-design)
    Daemon->>AIManager: ProposeSystemDesign()
    AIManager->>GraphQL: startAITask() with GraphQL subscription
    GraphQL->>Platform: GraphQL subscription query
    
    Platform-->>GraphQL: Streaming updates (ServiceUpdate, EndpointUpdate, etc.)
    GraphQL-->>AIManager: AINotification messages
    AIManager-->>Daemon: Stream notifications via notifier callback
    Daemon-->>Dashboard: WebSocket notification (ai/propose-system-design/stream)
    
    Note over Platform: Task completion
    Platform-->>GraphQL: Final update with finished: true
    GraphQL-->>AIManager: Completion notification
    AIManager-->>Daemon: Task completion
    Daemon-->>Dashboard: Final notification
```

**Sources**: [cli/daemon/dash/dash.go:339-391](), [cli/daemon/dash/ai/client.go:90-138](), [cli/daemon/dash/ai/types.go:115-129]()

## Virtual File Overlay System

The AI system uses a sophisticated virtual file overlay system that allows in-memory editing and validation of generated code before writing to disk.

```mermaid
graph TB
    subgraph "Virtual File Management"
        ServicePaths["servicePaths struct<br/>Service-to-path mapping"]
        Overlays["overlays struct<br/>Virtual file system"]
        OverlayFiles["overlay struct<br/>Individual virtual files"]
    end
    
    subgraph "File Operations"
        RelFileName["RelFileName()<br/>Generate unique filenames"]
        ToSrcFile["toSrcFile()<br/>Wrap code in package"]
        ReadFile["ReadFile()<br/>Virtual file reading"]
        PkgOverlay["PkgOverlay()<br/>Package loader overlay"]
    end
    
    subgraph "Code Processing"
        TypeRender["Type.Render()<br/>Go struct generation"]
        EndpointRender["Endpoint.Render()<br/>API function generation"]
        ImportProcessor["imports.Process()<br/>Auto-import resolution"]
        AddFuncBodies["addMissingFuncBodies()<br/>Panic placeholders"]
    end
    
    subgraph "Validation Pipeline"
        ASTParser["parser.ParseFile()<br/>Go AST parsing"]
        PackagesLoad["packages.Load()<br/>Type checking"]
        ErrorCollection["perr.List<br/>Error aggregation"]
    end
    
    ServicePaths -->|"newServicePaths()"| Overlays
    Overlays -->|"add(Service, Endpoint)"| OverlayFiles
    
    RelFileName --> ToSrcFile
    ToSrcFile --> TypeRender
    ToSrcFile --> EndpointRender
    TypeRender --> ImportProcessor
    EndpointRender --> ImportProcessor
    ImportProcessor --> AddFuncBodies
    
    OverlayFiles --> ReadFile
    ReadFile --> PkgOverlay
    PkgOverlay --> ASTParser
    ASTParser --> PackagesLoad
    PackagesLoad --> ErrorCollection
```

**Sources**: [cli/daemon/dash/ai/overlay.go:85-343](), [cli/daemon/dash/ai/codegen.go:232-298](), [cli/daemon/dash/ai/parser.go:118-417]()

## Code Generation Pipeline

The code generation system transforms AI-generated structured data into valid Go source code through the virtual overlay system.

```mermaid
graph TD
    subgraph "AI Stream Processing"
        StreamUpdates["AIStreamMessage<br/>Real-time updates"]
        EndpointAssembler["endpointsAssembler<br/>Update aggregation"]
        PartialEndpoint["partialEndpoint<br/>Incremental state"]
    end
    
    subgraph "Code Rendering"
        TypeRenderer["Type.Render()<br/>Go struct generation"]
        EndpointRenderer["Endpoint.Render()<br/>encore:api functions"]
        PathRenderer["PathSegments.Render()<br/>HTTP path generation"]
        DocRenderer["renderDocList()<br/>Comment generation"]
    end
    
    subgraph "Source Generation"
        GenerateSrcFiles["generateSrcFiles()<br/>All service files"]
        WriteFiles["writeFiles()<br/>Disk persistence"]
        UpdateCode["updateCode()<br/>In-place modification"]
        PreviewFiles["PreviewFiles()<br/>Preview without writing"]
    end
    
    StreamUpdates --> EndpointAssembler
    EndpointAssembler --> PartialEndpoint
    PartialEndpoint --> TypeRenderer
    PartialEndpoint --> EndpointRenderer
    
    EndpointRenderer --> PathRenderer
    EndpointRenderer --> DocRenderer
    TypeRenderer --> GenerateSrcFiles
    EndpointRenderer --> GenerateSrcFiles
    
    GenerateSrcFiles --> WriteFiles
    GenerateSrcFiles --> UpdateCode
    GenerateSrcFiles --> PreviewFiles
```

**Sources**: [cli/daemon/dash/ai/codegen.go:177-418](), [cli/daemon/dash/ai/assembler.go:147-278](), [cli/daemon/dash/ai/types.go:121-175]()

## Real-time Update Assembly

The endpoint assembler processes streaming AI updates and maintains coherent endpoint structures as updates arrive through the `endpointsAssembler` system.

```mermaid
graph TB
    subgraph "Update Stream Processing"
        AIStreamMessage["AIStreamMessage<br/>GraphQL subscription"]
        TaskMessage["TaskMessage<br/>Union type dispatch"]
        EndpointAssemblerHandler["newEndpointAssemblerHandler()<br/>Update processor"]
    end
    
    subgraph "Update Type Handling"
        ServiceUpdate["ServiceUpdate<br/>Name, Doc"]
        EndpointUpdate["EndpointUpdate<br/>Method, Path, Visibility"]
        TypeUpdate["TypeUpdate<br/>Struct definitions"]
        TypeFieldUpdate["TypeFieldUpdate<br/>Field properties"]
        ErrorUpdate["ErrorUpdate<br/>Error codes"]
        PathParamUpdate["PathParamUpdate<br/>Path documentation"]
    end
    
    subgraph "State Management"
        EndpointsAssembler["endpointsAssembler<br/>eps map[string]*partialEndpoint"]
        PartialEndpoint["partialEndpoint<br/>service + endpoint state"]
        UpsertMethods["upsertEndpoint()<br/>upsertType()<br/>upsertField()<br/>upsertError()<br/>upsertPathParam()"]
    end
    
    subgraph "Output Generation"
        Notification["notification()<br/>Render to LocalEndpointUpdate"]
        EndpointSource["endpoint.EndpointSource<br/>Generated function code"]
        TypeSource["endpoint.TypeSource<br/>Generated struct code"]
        DashboardSync["Dashboard real-time sync"]
    end
    
    AIStreamMessage --> TaskMessage
    TaskMessage --> EndpointAssemblerHandler
    
    EndpointAssemblerHandler --> ServiceUpdate
    EndpointAssemblerHandler --> EndpointUpdate
    EndpointAssemblerHandler --> TypeUpdate
    EndpointAssemblerHandler --> TypeFieldUpdate
    EndpointAssemblerHandler --> ErrorUpdate
    EndpointAssemblerHandler --> PathParamUpdate
    
    ServiceUpdate --> EndpointsAssembler
    EndpointUpdate --> EndpointsAssembler
    TypeUpdate --> EndpointsAssembler
    TypeFieldUpdate --> EndpointsAssembler
    ErrorUpdate --> EndpointsAssembler
    PathParamUpdate --> EndpointsAssembler
    
    EndpointsAssembler --> PartialEndpoint
    PartialEndpoint --> UpsertMethods
    UpsertMethods --> Notification
    
    Notification --> EndpointSource
    Notification --> TypeSource
    EndpointSource --> DashboardSync
    TypeSource --> DashboardSync
```

**Sources**: [cli/daemon/dash/ai/assembler.go:147-278](), [cli/daemon/dash/ai/client.go:16-48](), [cli/daemon/dash/ai/types.go:131-222]()

## Code Parsing and Validation

The parsing system validates generated code and extracts structured endpoint information for integration with Encore's metadata system.

```mermaid
graph TB
    subgraph "Input Sources"
        Services["Service Definitions<br/>[]Service with code"]
        AppInstance["apps.Instance<br/>Application context"]
        Overlays["Virtual File Overlays<br/>Generated code"]
    end
    
    subgraph "Parser Components"
        ParseContext["parsectx.Context<br/>Parser configuration"]
        PkgLoader["pkginfo.Package Loader<br/>Go package loading"]
        SchemaParser["schema.NewParser<br/>Type analysis"]
        APIParser["apis.Parser<br/>Endpoint parsing"]
    end
    
    subgraph "Validation Pipeline"
        ASTParser["AST Parsing<br/>go/parser"]
        TypeChecker["Type Checking<br/>packages.Load"]
        ErrorList["perr.List<br/>Error collection"]
        ValidationError["ValidationError<br/>Dashboard errors"]
    end
    
    subgraph "Output"
        SyncResult["SyncResult<br/>Parsed services + errors"]
        StructuredData["Structured Endpoint Data<br/>Updated Service objects"]
    end
    
    Services --> ParseContext
    AppInstance --> ParseContext
    Overlays --> ParseContext
    
    ParseContext --> PkgLoader
    ParseContext --> SchemaParser
    ParseContext --> APIParser
    
    PkgLoader --> ASTParser
    SchemaParser --> ASTParser
    APIParser --> ASTParser
    
    ASTParser --> TypeChecker
    TypeChecker --> ErrorList
    ErrorList --> ValidationError
    
    APIParser --> StructuredData
    ValidationError --> SyncResult
    StructuredData --> SyncResult
```

**Sources**: [cli/daemon/dash/ai/parser.go:118-287](), [cli/daemon/dash/ai/overlay.go:266-309](), [cli/daemon/dash/ai/types.go:223-249]()

## Dashboard Integration

The AI system integrates with the developer dashboard through JSON-RPC endpoints handled by the `handler` struct in the daemon.

```mermaid
graph LR
    subgraph "WebSocket Communication"
        DashboardClient["Developer Dashboard<br/>WebSocket client"]
        JSONRPCConn["jsonrpc2.Conn<br/>WebSocket transport"]
        HandlerStruct["handler struct<br/>RPC method dispatch"]
    end
    
    subgraph "AI Manager Operations"
        ProposeDesign["ProposeSystemDesign()<br/>Initial architecture"]
        ModifyDesign["ModifySystemDesign()<br/>Design iteration"]
        DefineEndpoints["DefineEndpoints()<br/>Detailed endpoints"]
        ParseCode["ParseCode()<br/>Code validation"]
        UpdateCode["UpdateCode()<br/>Code modification"]
        PreviewFiles["PreviewFiles()<br/>File preview"]
        WriteFiles["WriteFiles()<br/>File persistence"]
    end
    
    subgraph "Streaming Responses"
        StreamNotify["rpc.Notify()<br/>Stream notifications"]
        AINotification["AINotification<br/>Update messages"]
        LocalEndpointUpdate["LocalEndpointUpdate<br/>Real-time sync"]
    end
    
    DashboardClient -->|"JSON-RPC requests"| JSONRPCConn
    JSONRPCConn -->|"Handle()"| HandlerStruct
    
    HandlerStruct -->|"ai/propose-system-design"| ProposeDesign
    HandlerStruct -->|"ai/modify-system-design"| ModifyDesign
    HandlerStruct -->|"ai/define-endpoints"| DefineEndpoints
    HandlerStruct -->|"ai/parse-code"| ParseCode
    HandlerStruct -->|"ai/update-code"| UpdateCode
    HandlerStruct -->|"ai/preview-files"| PreviewFiles
    HandlerStruct -->|"ai/write-files"| WriteFiles
    
    ProposeDesign --> StreamNotify
    ModifyDesign --> StreamNotify
    DefineEndpoints --> StreamNotify
    StreamNotify --> AINotification
    AINotification --> LocalEndpointUpdate
    LocalEndpointUpdate --> DashboardClient
```

### AI Operation Endpoints

| JSON-RPC Method | Manager Function | Parameters | Response Type |
|-----------------|------------------|------------|---------------|
| `ai/propose-system-design` | `ProposeSystemDesign()` | `app_id`, `prompt` | `session_id`, `subscription_id` |
| `ai/modify-system-design` | `ModifySystemDesign()` | `app_id`, `session_id`, `prompt`, `proposed` | `subscription_id` |
| `ai/define-endpoints` | `DefineEndpoints()` | `app_id`, `session_id`, `prompt`, `proposed` | `subscription_id` |
| `ai/parse-code` | `ParseCode()` | `app_id`, `services` | `SyncResult` |
| `ai/update-code` | `UpdateCode()` | `app_id`, `services`, `overwrite` | `SyncResult` |
| `ai/preview-files` | `PreviewFiles()` | `app_id`, `services` | `PreviewFilesResponse` |
| `ai/write-files` | `WriteFiles()` | `app_id`, `services` | `WriteFilesResponse` |
| `ai/parse-sql-schema` | SQL schema parsing | `app_id` | `bool` |

**Sources**: [cli/daemon/dash/dash.go:339-519](), [cli/daemon/dash/ai/manager.go:23-91](), [cli/daemon/dash/server.go:90-120]()

## Type System and Data Structures

The AI system uses a rich type system to represent services, endpoints, and code structures consistently across all operations.

```mermaid
classDiagram
    class Service {
        +ID: string
        +Name: string
        +Doc: string
        +Endpoints: []*Endpoint
        +GetName() string
        +GetEndpoints() []*Endpoint
        +GraphQL() ServiceInput
    }
    
    class Endpoint {
        +ID: string
        +Name: string
        +Doc: string
        +Method: string
        +Visibility: VisibilityType
        +Path: PathSegments
        +RequestType: string
        +ResponseType: string
        +Errors: []*Error
        +Types: []*Type
        +Language: string
        +TypeSource: string
        +EndpointSource: string
        +Auth() bool
        +Render() string
    }
    
    class Type {
        +Name: string
        +Doc: string
        +Fields: []*TypeField
        +Render() string
    }
    
    class TypeField {
        +Name: string
        +WireName: string
        +Type: string
        +Location: apienc.WireLoc
        +Doc: string
    }
    
    class PathSegment {
        +Type: SegmentType
        +Value: *string
        +ValueType: *SegmentValueType
        +Doc: string
        +DocItem() (string, string)
    }
    
    Service ||--o{ Endpoint
    Endpoint ||--o{ Type
    Endpoint ||--o{ PathSegment
    Type ||--o{ TypeField
```

**Sources**: [cli/daemon/dash/ai/types.go:80-249](), [cli/daemon/dash/ai/codegen.go:74-128]()

## Error Handling and Validation

The AI system provides comprehensive error handling and validation feedback to developers through structured error reporting.

```mermaid
graph LR
    subgraph "Error Sources"
        ParseErrors["Go Parser Errors<br/>Syntax errors"]
        TypeErrors["Type Checker Errors<br/>Type mismatches"]
        ValidationErrors["Custom Validation<br/>Business logic errors"]
    end
    
    subgraph "Error Processing"
        ErrInSrc["errinsrc.ErrInSrc<br/>Source location errors"]
        PerrList["perr.List<br/>Error collection"]
        ErrorMapper["validationError()<br/>Error transformation"]
    end
    
    subgraph "Error Output"
        ValidationError["ValidationError<br/>Dashboard format"]
        SyncResult["SyncResult<br/>Services + errors"]
        DashboardDisplay["Dashboard Error Display"]
    end
    
    ParseErrors --> ErrInSrc
    TypeErrors --> ErrInSrc
    ValidationErrors --> ErrInSrc
    
    ErrInSrc --> PerrList
    PerrList --> ErrorMapper
    
    ErrorMapper --> ValidationError
    ValidationError --> SyncResult
    SyncResult --> DashboardDisplay
```

**Sources**: [cli/daemon/dash/ai/overlay.go:266-309](), [cli/daemon/dash/ai/types.go:228-249](), [cli/daemon/dash/ai/parser.go:145-153]()

# AI-Assisted Development

This document covers the AI-powered development assistance features integrated into Encore's local developer dashboard. The AI system helps developers design system architectures, generate API endpoints, and write boilerplate code through natural language prompts and real-time streaming updates.

For information about the broader developer dashboard functionality, see [Developer Dashboard](#4.2). For details about CLI commands and interface, see [CLI Interface](#4.1).

## AI System Architecture

The AI-assisted development system operates as a service within the daemon that communicates with Encore's cloud platform to provide intelligent code generation capabilities.

```mermaid
graph TB
    subgraph "Local Developer Environment"
        Dashboard["Developer Dashboard<br/>WebSocket Client"]
        AIManager["ai.Manager<br/>Task Coordination"]
        CodeGen["Code Generation<br/>Pipeline"]
        Parser["Code Parser<br/>Validation"]
    end
    
    subgraph "Encore Cloud Platform"
        GraphQLAPI["GraphQL API<br/>AI Service"]
        AIModels["AI Models<br/>Code Generation"]
    end
    
    subgraph "Local File System"
        SourceFiles["Generated Source Files<br/>.go files"]
        Overlays["Virtual File Overlays<br/>In-memory editing"]
    end
    
    Dashboard -->|"JSON-RPC over WebSocket"| AIManager
    AIManager -->|"GraphQL Subscriptions"| GraphQLAPI
    GraphQLAPI -->|"Streaming Updates"| AIManager
    AIManager -->|"Real-time Notifications"| Dashboard
    
    AIManager --> CodeGen
    AIManager --> Parser
    CodeGen --> Overlays
    Parser --> Overlays
    Overlays --> SourceFiles
    
    GraphQLAPI --> AIModels
    AIModels --> GraphQLAPI
```

**Sources**: [cli/daemon/dash/ai/manager.go:1-91](), [cli/daemon/dash/dash.go:36-43](), [cli/daemon/dash/server.go:42-55]()

## AI Manager and Task Coordination

The `ai.Manager` serves as the central coordinator for all AI-assisted development operations, managing task lifecycle and communication between the dashboard and cloud services.

```mermaid
graph LR
    subgraph "AI Manager Core"
        Manager["ai.Manager"]
        TaskCoordinator["AITask Coordination"]
        NotificationHandler["AI Notification Handler"]
    end
    
    subgraph "AI Operations"
        ProposeDesign["ProposeSystemDesign"]
        ModifyDesign["ModifySystemDesign"] 
        DefineEndpoints["DefineEndpoints"]
        ParseCode["ParseCode"]
        UpdateCode["UpdateCode"]
        WriteFiles["WriteFiles"]
        PreviewFiles["PreviewFiles"]
    end
    
    subgraph "Cloud Communication"
        GraphQLClient["GraphQL Subscription Client"]
        StreamingUpdates["Real-time Streaming"]
        ErrorHandling["Error Code Mapping"]
    end
    
    Manager --> TaskCoordinator
    Manager --> NotificationHandler
    
    Manager --> ProposeDesign
    Manager --> ModifyDesign
    Manager --> DefineEndpoints
    Manager --> ParseCode
    Manager --> UpdateCode
    Manager --> WriteFiles
    Manager --> PreviewFiles
    
    TaskCoordinator --> GraphQLClient
    GraphQLClient --> StreamingUpdates
    StreamingUpdates --> NotificationHandler
    ErrorHandling --> NotificationHandler
```

**Sources**: [cli/daemon/dash/ai/manager.go:17-91](), [cli/daemon/dash/ai/client.go:81-154](), [cli/daemon/dash/dash.go:339-497]()

## AI Task Lifecycle and Streaming

AI operations in Encore follow a task-based model with real-time streaming updates delivered through WebSocket connections.

```mermaid
sequenceDiagram
    participant Dashboard as "Developer Dashboard"
    participant Daemon as "Encore Daemon"
    participant AIManager as "ai.Manager"
    participant GraphQL as "GraphQL Client"
    participant Platform as "Encore Platform"
    
    Dashboard->>Daemon: JSON-RPC Request (ai/propose-system-design)
    Daemon->>AIManager: ProposeSystemDesign()
    AIManager->>GraphQL: startAITask() with GraphQL subscription
    GraphQL->>Platform: GraphQL subscription query
    
    Platform-->>GraphQL: Streaming updates (ServiceUpdate, EndpointUpdate, etc.)
    GraphQL-->>AIManager: AINotification messages
    AIManager-->>Daemon: Stream notifications via notifier callback
    Daemon-->>Dashboard: WebSocket notification (ai/propose-system-design/stream)
    
    Note over Platform: Task completion
    Platform-->>GraphQL: Final update with finished: true
    GraphQL-->>AIManager: Completion notification
    AIManager-->>Daemon: Task completion
    Daemon-->>Dashboard: Final notification
```

**Sources**: [cli/daemon/dash/dash.go:339-391](), [cli/daemon/dash/ai/client.go:90-138](), [cli/daemon/dash/ai/types.go:115-129]()

## Code Generation Pipeline

The code generation system transforms AI-generated structured data into valid Go source code through a multi-stage pipeline.

```mermaid
graph TD
    subgraph "Input Processing"
        AIUpdates["AI Stream Updates<br/>ServiceUpdate, EndpointUpdate, TypeUpdate"]
        Assembler["Endpoint Assembler<br/>partialEndpoint assembly"]
        Validation["Input Validation<br/>Field validation"]
    end
    
    subgraph "Code Generation"
        TypeRenderer["Type.Render()<br/>Struct generation"]
        EndpointRenderer["Endpoint.Render()<br/>API function generation"]
        SourceBuilder["toSrcFile()<br/>Package wrapping"]
        ImportProcessor["goimports<br/>Import resolution"]
    end
    
    subgraph "File Management"
        ServicePaths["servicePaths<br/>Path resolution"]
        Overlays["Virtual Overlays<br/>In-memory files"]
        FileWriter["writeFiles()<br/>Disk persistence"]
    end
    
    AIUpdates --> Assembler
    Assembler --> Validation
    Validation --> TypeRenderer
    Validation --> EndpointRenderer
    
    TypeRenderer --> SourceBuilder
    EndpointRenderer --> SourceBuilder
    SourceBuilder --> ImportProcessor
    
    ImportProcessor --> ServicePaths
    ServicePaths --> Overlays
    Overlays --> FileWriter
```

**Sources**: [cli/daemon/dash/ai/codegen.go:177-418](), [cli/daemon/dash/ai/assembler.go:147-278](), [cli/daemon/dash/ai/overlay.go:170-343]()

## Real-time Update Assembly

The endpoint assembler processes streaming AI updates and maintains coherent endpoint structures as updates arrive.

```mermaid
graph LR
    subgraph "Stream Processing"
        Updates["AI Stream Updates"]
        TypeChecker["Update Type Detection"]
        StateManager["Endpoint State Management"]
    end
    
    subgraph "Update Types"
        ServiceUpd["ServiceUpdate"]
        EndpointUpd["EndpointUpdate"] 
        TypeUpd["TypeUpdate"]
        FieldUpd["TypeFieldUpdate"]
        ErrorUpd["ErrorUpdate"]
        ParamUpd["PathParamUpdate"]
    end
    
    subgraph "Assembly Logic"
        UpsertEndpoint["upsertEndpoint()"]
        UpsertType["upsertType()"]
        UpsertField["upsertField()"]
        UpsertError["upsertError()"]
        UpsertParam["upsertPathParam()"]
    end
    
    subgraph "Output Generation"
        PartialEndpoint["partialEndpoint"]
        Notification["LocalEndpointUpdate"]
        RealTimeSync["Dashboard Sync"]
    end
    
    Updates --> TypeChecker
    TypeChecker --> ServiceUpd
    TypeChecker --> EndpointUpd
    TypeChecker --> TypeUpd
    TypeChecker --> FieldUpd
    TypeChecker --> ErrorUpd
    TypeChecker --> ParamUpd
    
    EndpointUpd --> UpsertEndpoint
    TypeUpd --> UpsertType
    FieldUpd --> UpsertField
    ErrorUpd --> UpsertError
    ParamUpd --> UpsertParam
    
    UpsertEndpoint --> PartialEndpoint
    UpsertType --> PartialEndpoint
    UpsertField --> PartialEndpoint
    UpsertError --> PartialEndpoint
    UpsertParam --> PartialEndpoint
    
    PartialEndpoint --> Notification
    Notification --> RealTimeSync
```

**Sources**: [cli/daemon/dash/ai/assembler.go:14-278](), [cli/daemon/dash/ai/types.go:170-222]()

## Code Parsing and Validation

The parsing system validates generated code and extracts structured endpoint information for integration with Encore's metadata system.

```mermaid
graph TB
    subgraph "Input Sources"
        Services["Service Definitions<br/>[]Service with code"]
        AppInstance["apps.Instance<br/>Application context"]
        Overlays["Virtual File Overlays<br/>Generated code"]
    end
    
    subgraph "Parser Components"
        ParseContext["parsectx.Context<br/>Parser configuration"]
        PkgLoader["pkginfo.Package Loader<br/>Go package loading"]
        SchemaParser["schema.NewParser<br/>Type analysis"]
        APIParser["apis.Parser<br/>Endpoint parsing"]
    end
    
    subgraph "Validation Pipeline"
        ASTParser["AST Parsing<br/>go/parser"]
        TypeChecker["Type Checking<br/>packages.Load"]
        ErrorList["perr.List<br/>Error collection"]
        ValidationError["ValidationError<br/>Dashboard errors"]
    end
    
    subgraph "Output"
        SyncResult["SyncResult<br/>Parsed services + errors"]
        StructuredData["Structured Endpoint Data<br/>Updated Service objects"]
    end
    
    Services --> ParseContext
    AppInstance --> ParseContext
    Overlays --> ParseContext
    
    ParseContext --> PkgLoader
    ParseContext --> SchemaParser
    ParseContext --> APIParser
    
    PkgLoader --> ASTParser
    SchemaParser --> ASTParser
    APIParser --> ASTParser
    
    ASTParser --> TypeChecker
    TypeChecker --> ErrorList
    ErrorList --> ValidationError
    
    APIParser --> StructuredData
    ValidationError --> SyncResult
    StructuredData --> SyncResult
```

**Sources**: [cli/daemon/dash/ai/parser.go:118-287](), [cli/daemon/dash/ai/overlay.go:266-309](), [cli/daemon/dash/ai/types.go:223-249]()

## Dashboard Integration

The AI system integrates with the developer dashboard through JSON-RPC endpoints that handle various AI operations.

| Endpoint | Purpose | Parameters | Response |
|----------|---------|------------|----------|
| `ai/propose-system-design` | Generate initial system architecture | `app_id`, `prompt` | `session_id`, `subscription_id` |
| `ai/modify-system-design` | Modify existing system design | `app_id`, `session_id`, `prompt`, `proposed` | `subscription_id` |
| `ai/define-endpoints` | Generate detailed endpoint definitions | `app_id`, `session_id`, `prompt`, `proposed` | `subscription_id` |
| `ai/parse-code` | Parse and validate generated code | `app_id`, `services` | `SyncResult` |
| `ai/update-code` | Update code with new definitions | `app_id`, `services`, `overwrite` | `SyncResult` |
| `ai/preview-files` | Preview generated files | `app_id`, `services` | `PreviewFilesResponse` |
| `ai/write-files` | Write files to disk | `app_id`, `services` | `WriteFilesResponse` |

**Sources**: [cli/daemon/dash/dash.go:339-519](), [cli/daemon/dash/ai/manager.go:23-91]()

## Type System and Data Structures

The AI system uses a rich type system to represent services, endpoints, and code structures consistently across all operations.

```mermaid
classDiagram
    class Service {
        +ID: string
        +Name: string
        +Doc: string
        +Endpoints: []*Endpoint
        +GetName() string
        +GetEndpoints() []*Endpoint
        +GraphQL() ServiceInput
    }
    
    class Endpoint {
        +ID: string
        +Name: string
        +Doc: string
        +Method: string
        +Visibility: VisibilityType
        +Path: PathSegments
        +RequestType: string
        +ResponseType: string
        +Errors: []*Error
        +Types: []*Type
        +Language: string
        +TypeSource: string
        +EndpointSource: string
        +Auth() bool
        +Render() string
    }
    
    class Type {
        +Name: string
        +Doc: string
        +Fields: []*TypeField
        +Render() string
    }
    
    class TypeField {
        +Name: string
        +WireName: string
        +Type: string
        +Location: apienc.WireLoc
        +Doc: string
    }
    
    class PathSegment {
        +Type: SegmentType
        +Value: *string
        +ValueType: *SegmentValueType
        +Doc: string
        +DocItem() (string, string)
    }
    
    Service ||--o{ Endpoint
    Endpoint ||--o{ Type
    Endpoint ||--o{ PathSegment
    Type ||--o{ TypeField
```

**Sources**: [cli/daemon/dash/ai/types.go:80-249](), [cli/daemon/dash/ai/codegen.go:74-128]()

## Error Handling and Validation

The AI system provides comprehensive error handling and validation feedback to developers through structured error reporting.

```mermaid
graph LR
    subgraph "Error Sources"
        ParseErrors["Go Parser Errors<br/>Syntax errors"]
        TypeErrors["Type Checker Errors<br/>Type mismatches"]
        ValidationErrors["Custom Validation<br/>Business logic errors"]
    end
    
    subgraph "Error Processing"
        ErrInSrc["errinsrc.ErrInSrc<br/>Source location errors"]
        PerrList["perr.List<br/>Error collection"]
        ErrorMapper["validationError()<br/>Error transformation"]
    end
    
    subgraph "Error Output"
        ValidationError["ValidationError<br/>Dashboard format"]
        SyncResult["SyncResult<br/>Services + errors"]
        DashboardDisplay["Dashboard Error Display"]
    end
    
    ParseErrors --> ErrInSrc
    TypeErrors --> ErrInSrc
    ValidationErrors --> ErrInSrc
    
    ErrInSrc --> PerrList
    PerrList --> ErrorMapper
    
    ErrorMapper --> ValidationError
    ValidationError --> SyncResult
    SyncResult --> DashboardDisplay
```

**Sources**: [cli/daemon/dash/ai/overlay.go:266-309](), [cli/daemon/dash/ai/types.go:228-249](), [cli/daemon/dash/ai/parser.go:145-153]()

---

# Page: Tracing and Observability

# Tracing and Observability

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [cli/daemon/engine/trace/trace.go](cli/daemon/engine/trace/trace.go)
- [proto/encore/engine/trace/trace.pb.go](proto/encore/engine/trace/trace.pb.go)
- [proto/encore/engine/trace/trace.proto](proto/encore/engine/trace/trace.proto)
- [proto/encore/parser/meta/v1/meta.pb.go](proto/encore/parser/meta/v1/meta.pb.go)
- [proto/encore/parser/meta/v1/meta.pb.ts](proto/encore/parser/meta/v1/meta.pb.ts)
- [proto/encore/parser/meta/v1/meta.proto](proto/encore/parser/meta/v1/meta.proto)
- [proto/encore/parser/schema/v1/schema.pb.go](proto/encore/parser/schema/v1/schema.pb.go)
- [v2/app/legacymeta/legacymeta.go](v2/app/legacymeta/legacymeta.go)

</details>



This document covers Encore's distributed tracing and observability systems that capture, parse, store, and correlate runtime execution traces with application metadata. The tracing system provides detailed insights into request flows, database operations, RPC calls, and other runtime events across Encore applications.

For information about application lifecycle management and build processes, see [Application Lifecycle](#6). For database integration specifics, see [Database Integration](#5.1).

## System Architecture

The tracing and observability system consists of three main components: trace collection and parsing, metadata correlation, and storage/retrieval systems.

### Core Components

```mermaid
graph TB
    subgraph "Application Runtime"
        App["Running Encore App"]
        TraceWriter["Binary Trace Writer"]
    end
    
    subgraph "Daemon Trace System"
        Parser["traceParser"]
        Store["trace.Store"]
        Meta["TraceMeta"]
    end
    
    subgraph "Metadata System"
        AppMeta["meta.Data"]
        TraceNodes["TraceNode[]"]
        SymTable["sym.Table"]
    end
    
    subgraph "Storage"
        TraceMap["traces map[string][]*TraceMeta"]
        RequestMap["requestIDMapping map[string]*Request"]
    end
    
    App --> TraceWriter
    TraceWriter --> Parser
    Parser --> Meta
    Meta --> Store
    Store --> TraceMap
    Store --> RequestMap
    AppMeta --> TraceNodes
    SymTable --> Parser
```

Sources: [cli/daemon/engine/trace/trace.go:37-53](), [proto/encore/engine/trace/trace.proto:9-64]()

### Request Flow Processing

```mermaid
sequenceDiagram
    participant Runtime as "App Runtime"
    participant Parser as "traceParser"
    participant Store as "trace.Store"  
    participant Metadata as "meta.Data"
    participant Dashboard as "Dev Dashboard"
    
    Runtime->>Parser: Binary trace data
    Parser->>Parser: Parse events (RequestStart, QueryStart, etc.)
    Parser->>Store: TraceMeta with Request[]
    Store->>Store: Update traces map by appID
    Store->>Store: Update requestIDMapping
    Metadata->>Store: TraceNode correlation
    Store->>Dashboard: Live trace updates via channels
```

Sources: [cli/daemon/engine/trace/trace.go:110-135](), [cli/daemon/engine/trace/trace.go:61-88]()

## Trace Data Model

The trace data model centers around `Request` spans containing hierarchical `Event` structures that capture detailed runtime information.

### Core Data Structures

| Type | Purpose | Key Fields |
|------|---------|------------|
| `TraceMeta` | Trace wrapper with app context | `ID`, `Reqs []*Request`, `App`, `EnvID` |
| `Request` | Individual request/span | `TraceId`, `SpanId`, `Events`, `Type` |
| `Event` | Runtime events within requests | `RPCCall`, `DBQuery`, `HTTPCall`, `LogMessage` |
| `TraceNode` | Source code correlation | `filepath`, `start_pos`, `end_pos`, `context` |

Sources: [cli/daemon/engine/trace/trace.go:28-35](), [proto/encore/engine/trace/trace.proto:14-64]()

### Request Types and Event Hierarchy

```mermaid
graph TD
    Request["Request (trace span)"]
    Request --> RPC["RPC Request"]
    Request --> AUTH["AUTH Request"] 
    Request --> PUBSUB["PUBSUB_MSG Request"]
    
    RPC --> RPCCall["RPCCall Event"]
    RPC --> DBTx["DBTransaction Event"]
    RPC --> HTTPCall["HTTPCall Event"]
    RPC --> LogMsg["LogMessage Event"]
    
    DBTx --> DBQuery["DBQuery Event"]
    
    RPCCall --> ChildSpan["Child Request Span"]
    HTTPCall --> HTTPEvents["HTTPTraceEvent[]"]
    
    HTTPEvents --> DNS["DNS_START/DNS_DONE"]
    HTTPEvents --> TLS["TLS_HANDSHAKE_*"]
    HTTPEvents --> CONN["GET_CONN/GOT_CONN"]
```

Sources: [proto/encore/engine/trace/trace.proto:59-63](), [proto/encore/engine/trace/trace.proto:66-79](), [proto/encore/engine/trace/trace.proto:190-205]()

## Trace Collection and Parsing

The tracing system processes binary trace data through a versioned parser that handles different trace protocol versions and event types.

### Parser Architecture

The `traceParser` processes binary trace data using a state machine approach:

```mermaid
graph LR
    BinaryData["Binary Trace Data"]
    Reader["traceReader"]
    Parser["traceParser"]
    
    BinaryData --> Reader
    Reader --> Parser
    
    Parser --> RequestStart["requestStart()"]
    Parser --> RequestEnd["requestEnd()"]
    Parser --> QueryStart["queryStart()"]
    Parser --> QueryEnd["queryEnd()"]
    Parser --> CallStart["callStart()"]
    Parser --> CallEnd["callEnd()"]
    
    RequestStart --> RequestMap["reqMap[spanID]"]
    QueryStart --> QueryMap["queryMap[queryID]"]
    CallStart --> CallMap["callMap[callID]"]
```

Sources: [cli/daemon/engine/trace/trace.go:146-162](), [cli/daemon/engine/trace/trace.go:164-197]()

### Event Processing by Version

The parser handles multiple trace protocol versions:

```mermaid
graph TD
    ParseEvent["parseEvent()"]
    ParseEvent --> V3Check{"version >= 3?"}
    V3Check -->|Yes| ParseV3["parseEventV3()"]
    V3Check -->|No| ParseV1["parseEventV1()"]
    
    ParseV3 --> RequestStart["trace.RequestStart"]
    ParseV3 --> GoStart["trace.GoStart"] 
    ParseV3 --> TxStart["trace.TxStart"]
    ParseV3 --> QueryStart["trace.QueryStart"]
    ParseV3 --> HTTPStart["trace.HTTPCallStart"]
    ParseV3 --> LogMessage["trace.LogMessage"]
    ParseV3 --> CacheOp["trace.CacheOpStart"]
```

Sources: [cli/daemon/engine/trace/trace.go:201-255](), [cli/daemon/engine/trace/trace.go:257-289]()

## Metadata and Source Correlation

The metadata system correlates runtime traces with source code locations through `TraceNode` structures that map execution events to specific code positions.

### TraceNode Types and Context

```mermaid
graph TB
    TraceNode["TraceNode"]
    TraceNode --> Location["File Position (filepath, line, col)"]
    TraceNode --> Context["Execution Context"]
    
    Context --> RPCDef["RPCDefNode (endpoint definition)"]
    Context --> RPCCall["RPCCallNode (RPC invocation)"]
    Context --> StaticCall["StaticCallNode (SQLDB, RLOG calls)"]
    Context --> AuthDef["AuthHandlerDefNode"]
    Context --> PubSubDef["PubSubTopicDefNode"]
    Context --> ServiceInit["ServiceInitNode"]
    Context --> Middleware["MiddlewareDefNode"]
    Context --> CacheKeyspace["CacheKeyspaceDefNode"]
```

Sources: [proto/encore/parser/meta/v1/meta.proto:143-220](), [v2/app/legacymeta/legacymeta.go:527-529]()

### Metadata Integration

The legacy metadata builder correlates trace nodes with application components:

```mermaid
graph LR
    AppDesc["app.Desc"]
    Builder["legacymeta.builder"]
    MetaData["meta.Data"]
    TraceNodes["TraceNodes"]
    
    AppDesc --> Builder
    Builder --> MetaData
    Builder --> TraceNodes
    
    TraceNodes --> EndpointNodes["addEndpoint()"]
    TraceNodes --> AuthNodes["addAuthHandler()"]  
    TraceNodes --> MiddlewareNodes["addMiddleware()"]
    TraceNodes --> ServiceNodes["addServiceStruct()"]
    TraceNodes --> SubNodes["addSub()"]
    
    MetaData --> Packages["Package.TraceNodes"]
```

Sources: [v2/app/legacymeta/legacymeta.go:43-54](), [v2/app/legacymeta/legacymeta.go:527-529]()

## Storage and Retrieval

The trace storage system manages trace data in memory with automatic cleanup and provides real-time access for development tools.

### Store Operations

The `Store` type provides thread-safe access to trace data:

```mermaid
graph TB
    Store["trace.Store"]
    Store --> Storage["Memory Storage"]
    Store --> Listeners["Live Listeners"]
    Store --> Retrieval["Trace Retrieval"]
    
    Storage --> TraceMap["traces map[string][]*TraceMeta"]
    Storage --> RequestMap["requestIDMapping map[string]*Request"]
    
    Listeners --> Channels["map[chan<- *TraceMeta]struct{}"]
    
    Retrieval --> List["List(appID) []*TraceMeta"]
    Retrieval --> GetRoot["GetRootTrace(traceID) *Request"]
    
    Store --> Cleanup["Automatic cleanup (100 trace limit)"]
```

Sources: [cli/daemon/engine/trace/trace.go:37-53](), [cli/daemon/engine/trace/trace.go:61-88](), [cli/daemon/engine/trace/trace.go:103-108]()

### Live Trace Broadcasting

The store broadcasts new traces to registered listeners for real-time observability:

```go
// Store operation from trace.go:61-88
func (st *Store) Store(ctx context.Context, tr *TraceMeta) error {
    // Update storage maps
    // Broadcast to listeners without blocking
    for ch := range st.ln {
        select {
        case ch <- tr:
        default: // Don't block on slow consumers
        }
    }
}
```

Sources: [cli/daemon/engine/trace/trace.go:61-88](), [cli/daemon/engine/trace/trace.go:55-59]()

---

# Page: Infrastructure Components

# Infrastructure Components

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [Cargo.lock](Cargo.lock)
- [Cargo.toml](Cargo.toml)
- [cli/daemon/dash/dash_test.go](cli/daemon/dash/dash_test.go)
- [cli/daemon/db.go](cli/daemon/db.go)
- [cli/daemon/run/infra/infra.go](cli/daemon/run/infra/infra.go)
- [cli/daemon/sqldb/cluster.go](cli/daemon/sqldb/cluster.go)
- [cli/daemon/sqldb/db.go](cli/daemon/sqldb/db.go)
- [cli/daemon/sqldb/docker/docker.go](cli/daemon/sqldb/docker/docker.go)
- [cli/daemon/sqldb/driver.go](cli/daemon/sqldb/driver.go)
- [cli/daemon/sqldb/external/external.go](cli/daemon/sqldb/external/external.go)
- [cli/daemon/sqldb/manager.go](cli/daemon/sqldb/manager.go)
- [cli/daemon/sqldb/migrate.go](cli/daemon/sqldb/migrate.go)
- [cli/daemon/sqldb/proxy.go](cli/daemon/sqldb/proxy.go)
- [cli/daemon/sqldb/utils.go](cli/daemon/sqldb/utils.go)
- [runtimes/core/Cargo.toml](runtimes/core/Cargo.toml)
- [runtimes/core/src/sqldb/client.rs](runtimes/core/src/sqldb/client.rs)
- [runtimes/core/src/sqldb/manager.rs](runtimes/core/src/sqldb/manager.rs)
- [runtimes/core/src/sqldb/mod.rs](runtimes/core/src/sqldb/mod.rs)
- [runtimes/core/src/sqldb/transaction.rs](runtimes/core/src/sqldb/transaction.rs)
- [runtimes/core/src/sqldb/val.rs](runtimes/core/src/sqldb/val.rs)
- [runtimes/js/Cargo.toml](runtimes/js/Cargo.toml)
- [runtimes/js/encore.dev/api/stream.ts](runtimes/js/encore.dev/api/stream.ts)
- [runtimes/js/encore.dev/internal/appinit/mod.ts](runtimes/js/encore.dev/internal/appinit/mod.ts)
- [runtimes/js/encore.dev/storage/sqldb/database.ts](runtimes/js/encore.dev/storage/sqldb/database.ts)
- [runtimes/js/src/lib.rs](runtimes/js/src/lib.rs)
- [runtimes/js/src/sqldb.rs](runtimes/js/src/sqldb.rs)
- [tsparser/litparser-derive/src/lib.rs](tsparser/litparser-derive/src/lib.rs)

</details>



This document covers the infrastructure components that power Encore applications, including database systems, storage, caching, and connection management. These components provide the foundational services that applications use for data persistence, communication, and resource management.

For information about the core runtime systems that orchestrate these components, see [Core Runtime Systems](#2). For details about application-level APIs that use these infrastructure components, see [API Definition and Handlers](#3.3).

## Overview

Encore's infrastructure components are organized into several key subsystems:

- **SQL Database Infrastructure**: PostgreSQL clusters with connection pooling, migrations, and proxy systems
- **Object Storage**: Bucket-based storage for files and binary data  
- **Message Queuing**: PubSub systems for asynchronous communication
- **Caching**: Redis-based caching infrastructure
- **Connection Management**: Proxies and pools for efficient resource utilization

```mermaid
graph TD
    subgraph "Infrastructure Components"
        SQLDBMgr["SQLDatabase Manager"]
        ObjectsMgr["Objects Manager"] 
        PubSubMgr["PubSub Manager"]
        CacheMgr["Cache Manager"]
        SecretsMgr["Secrets Manager"]
    end
    
    subgraph "SQL Database System"
        ClusterMgr["ClusterManager"]
        DBProxy["Database Proxy"]
        ConnectionPool["Connection Pool"]
        MigrationSys["Migration System"]
    end
    
    subgraph "Runtime Integration"
        ResourceMgr["ResourceManager"]
        InfraConfig["Infrastructure Config"]
        RuntimeCore["Runtime Core"]
    end
    
    SQLDBMgr --> ClusterMgr
    ClusterMgr --> DBProxy
    ClusterMgr --> ConnectionPool
    ClusterMgr --> MigrationSys
    
    ResourceMgr --> SQLDBMgr
    ResourceMgr --> ObjectsMgr
    ResourceMgr --> PubSubMgr
    ResourceMgr --> CacheMgr
    ResourceMgr --> SecretsMgr
    
    RuntimeCore --> ResourceMgr
    InfraConfig --> ResourceMgr
```

**Infrastructure Component Architecture**

Sources: [cli/daemon/run/infra/infra.go:1-102](), [runtimes/core/src/sqldb/manager.rs:1-57](), [cli/daemon/sqldb/manager.go:1-49]()

## SQL Database Infrastructure

### Database Cluster Management

The `ClusterManager` is the central component that manages PostgreSQL database clusters across different environments and namespaces.

```mermaid
graph TD
    ClusterManager["ClusterManager"]
    
    subgraph "Cluster Types"
        RunCluster["Run Cluster"]
        TestCluster["Test Cluster"] 
        ShadowCluster["Shadow Cluster"]
    end
    
    subgraph "Database Drivers"
        DockerDriver["Docker Driver"]
        ExternalDriver["External Driver"]
    end
    
    subgraph "Individual Databases"
        DB1["Database: users"]
        DB2["Database: orders"]
        DB3["Database: analytics"]
    end
    
    ClusterManager --> RunCluster
    ClusterManager --> TestCluster
    ClusterManager --> ShadowCluster
    
    RunCluster --> DockerDriver
    TestCluster --> DockerDriver
    ShadowCluster --> ExternalDriver
    
    RunCluster --> DB1
    RunCluster --> DB2
    TestCluster --> DB3
```

**SQL Database Cluster Architecture**

The `ClusterManager` creates and manages clusters based on `ClusterID` which combines namespace and cluster type:

| Component | Purpose | Key Types |
|-----------|---------|-----------|
| `ClusterManager` | Orchestrates database clusters | `ClusterID`, `ClusterType` |
| `Cluster` | Individual database cluster instance | `Running`, `Stopped`, `NotFound` |
| `DB` | Individual database within a cluster | Migration state, connection info |
| `Driver` | Abstracts cluster operations | `DockerDriver`, `ExternalDriver` |

Sources: [cli/daemon/sqldb/cluster.go:26-53](), [cli/daemon/sqldb/manager.go:34-49](), [cli/daemon/sqldb/db.go:25-48]()

### Database Connection System

```mermaid
graph LR
    Application["Application Code"]
    SQLDatabase["SQLDatabase Class"]
    
    subgraph "Connection Layer"
        DatabaseImpl["DatabaseImpl"]
        ConnectionPool["bb8::Pool"]
        PooledConn["PooledConnection"]
    end
    
    subgraph "Proxy Layer"  
        DBProxy["Database Proxy"]
        ProxyManager["ProxyManager"]
        ClientBouncer["ClientBouncer"]
    end
    
    subgraph "Backend"
        PostgreSQL["PostgreSQL Server"]
    end
    
    Application --> SQLDatabase
    SQLDatabase --> DatabaseImpl
    DatabaseImpl --> ConnectionPool
    ConnectionPool --> PooledConn
    
    Application -.-> DBProxy
    DBProxy --> ProxyManager
    ProxyManager --> ClientBouncer
    ClientBouncer --> PostgreSQL
    
    PooledConn --> PostgreSQL
```

**Database Connection Architecture**

The connection system provides two paths:
1. **Direct connections** through connection pools for high-performance access
2. **Proxy connections** for development tools and external access

Key components include:

- `Pool`: Connection pool implementation using `bb8` library
- `DatabaseImpl`: Core database configuration and connection management  
- `ProxyManager`: Handles proxy connections with authentication
- `ClientBouncer`: Routes connections to appropriate database backends

Sources: [runtimes/core/src/sqldb/client.rs:17-49](), [runtimes/core/src/sqldb/manager.rs:198-232](), [cli/daemon/sqldb/proxy.go:20-48]()

### Migration System

The migration system handles database schema evolution through a metadata-driven approach:

```mermaid
graph TD
    MetadataSource["MetadataSource"]
    MigrationReader["MigrationReader"]
    
    subgraph "Migration Readers"
        OsReader["OsMigrationReader"] 
        ZipReader["ZipFSMigrationReader"]
    end
    
    subgraph "Migration Process"
        LoadMigrations["Load Applied Migrations"]
        ValidateSeq["Validate Sequence"]
        RunMigration["Run Migration"]
        MarkComplete["Mark Complete"]
    end
    
    subgraph "Database Tables"
        SchemaMigrations["schema_migrations"]
    end
    
    MetadataSource --> MigrationReader
    MigrationReader --> OsReader
    MigrationReader --> ZipReader
    
    MetadataSource --> LoadMigrations
    LoadMigrations --> ValidateSeq
    ValidateSeq --> RunMigration
    RunMigration --> MarkComplete
    MarkComplete --> SchemaMigrations
```

**Database Migration System**

Key migration components:

| Component | Purpose |
|-----------|---------|
| `MetadataSource` | Manages migration metadata and sequencing |
| `MigrationReader` | Abstracts migration file reading (OS vs ZIP) |
| `NonSequentialMigrator` | Handles non-sequential migration numbering |
| `schema_migrations` | Tracks applied migrations and dirty state |

Sources: [cli/daemon/sqldb/migrate.go:23-135](), [cli/daemon/sqldb/db.go:252-310]()

## TypeScript Database Interface

The TypeScript interface provides a high-level API for database operations:

```mermaid
graph TD
    subgraph "TypeScript API"
        SQLDatabase_TS["SQLDatabase"]
        Transaction_TS["Transaction"]
        Connection_TS["Connection"]
        BaseQueryExecutor["BaseQueryExecutor"]
    end
    
    subgraph "Query Methods"
        Query["query()"]
        QueryAll["queryAll()"]
        QueryRow["queryRow()"]
        Exec["exec()"]
        RawQuery["rawQuery()"]
    end
    
    subgraph "Runtime Bridge"
        RuntimeSQLDB["runtime.SQLDatabase"]
        RuntimeTx["runtime.Transaction"] 
        RuntimeConn["runtime.SQLConn"]
    end
    
    SQLDatabase_TS --> BaseQueryExecutor
    Transaction_TS --> BaseQueryExecutor
    Connection_TS --> BaseQueryExecutor
    
    BaseQueryExecutor --> Query
    BaseQueryExecutor --> QueryAll
    BaseQueryExecutor --> QueryRow
    BaseQueryExecutor --> Exec
    BaseQueryExecutor --> RawQuery
    
    SQLDatabase_TS --> RuntimeSQLDB
    Transaction_TS --> RuntimeTx
    Connection_TS --> RuntimeConn
```

**TypeScript Database API Structure**

The TypeScript interface supports:
- **Template literal queries** with automatic parameterization
- **Transaction management** with `AsyncDisposable` support
- **Connection pooling** through `acquire()` method
- **Streaming results** via async generators

Sources: [runtimes/js/encore.dev/storage/sqldb/database.ts:42-380]()

## Connection Pooling and Management

### Pool Configuration

```mermaid
graph LR
    subgraph "Pool Config"
        PoolConfig["PoolConfig"]
        MinConns["min_conns: u32"]
        MaxConns["max_conns: u32"]
    end
    
    subgraph "Pool Implementation"
        BB8Pool["bb8::Pool"]
        ConnectionMgr["PostgresConnectionManager"]
        ErrorSink["RustLoggerSink"]
    end
    
    subgraph "Connection Lifecycle"
        Acquire["acquire()"]
        Query["query()"]
        Release["release()"]
    end
    
    PoolConfig --> BB8Pool
    ConnectionMgr --> BB8Pool
    ErrorSink --> BB8Pool
    
    BB8Pool --> Acquire
    Acquire --> Query
    Query --> Release
```

**Connection Pool Management**

Pool configuration includes:
- **Size limits**: `min_conns` and `max_conns` settings
- **Error handling**: Custom error sink for connection failures
- **TLS support**: Integration with `postgres_native_tls`

Sources: [runtimes/core/src/sqldb/client.rs:24-69](), [runtimes/core/src/sqldb/manager.rs:129-144]()

## Query Processing and Value Conversion

### Row Value Handling

The system handles complex type conversion between application types and PostgreSQL types:

```mermaid
graph TD
    subgraph "Application Types"
        PValue["PValue"]
        RowValue["RowValue"]
        Primitive["Primitive"]
    end
    
    subgraph "PostgreSQL Types"
        PGTEXT["TEXT/VARCHAR"]
        PGJSON["JSON/JSONB"]
        PGARRAY["ARRAY"]
        PGUUID["UUID"]
        PGINET["INET/CIDR"]
        PGVECTOR["vector (pgvector)"]
    end
    
    subgraph "Conversion Layer"
        ToSQL["ToSql trait"]
        FromSQL["FromSql trait"]
        TypeChecker["Type checker"]
    end
    
    PValue --> ToSQL
    RowValue --> ToSQL
    ToSQL --> PGTEXT
    ToSQL --> PGJSON
    ToSQL --> PGARRAY
    ToSQL --> PGUUID
    ToSQL --> PGINET
    ToSQL --> PGVECTOR
    
    PGTEXT --> FromSQL
    PGJSON --> FromSQL
    PGARRAY --> FromSQL
    FromSQL --> RowValue
    FromSQL --> PValue
    
    TypeChecker --> ToSQL
    TypeChecker --> FromSQL
```

**SQL Type Conversion System**

The type system supports:
- **JSON/JSONB** conversion for complex objects
- **Array types** for PostgreSQL arrays
- **UUID** handling with string conversion fallback
- **Network types** (INET/CIDR) for IP addresses
- **Vector types** for AI/ML applications (pgvector extension)

Sources: [runtimes/core/src/sqldb/val.rs:23-475]()

## Resource Management Integration

### Infrastructure Coordination

The `ResourceManager` coordinates all infrastructure components:

```mermaid
graph TD
    ResourceManager["ResourceManager"]
    
    subgraph "Infrastructure Types"
        SQLDBType["SQLDB"]
        ObjectsType["Objects"] 
        PubSubType["PubSub"]
        CacheType["Cache"]
    end
    
    subgraph "Managers"
        SQLMgr["sqlMgr: ClusterManager"]
        ObjectsMgr["objectsMgr: ClusterManager"]
        PubSubSrv["PubSub Server"]
        RedisSrv["Redis Server"]
    end
    
    subgraph "Configuration"
        AppConfig["Application Config"]
        EnvConfig["Environment Config"]
        NamespaceConfig["Namespace Config"]
    end
    
    ResourceManager --> SQLDBType
    ResourceManager --> ObjectsType
    ResourceManager --> PubSubType
    ResourceManager --> CacheType
    
    SQLDBType --> SQLMgr
    ObjectsType --> ObjectsMgr
    PubSubType --> PubSubSrv
    CacheType --> RedisSrv
    
    AppConfig --> ResourceManager
    EnvConfig --> ResourceManager
    NamespaceConfig --> ResourceManager
```

**Resource Management Coordination**

The `ResourceManager` provides:
- **Lifecycle management** for starting/stopping infrastructure services
- **Namespace isolation** for multi-tenant scenarios  
- **Environment configuration** for different deployment targets
- **Dependency coordination** between infrastructure components

Sources: [cli/daemon/run/infra/infra.go:45-102](), [cli/daemon/run/infra/infra.go:94-102]()

## External Database Integration

For production deployments, Encore supports external database clusters:

| Configuration | Local Development | Production |
|---------------|-------------------|------------|
| **Driver** | `DockerDriver` | `ExternalDriver` |
| **Host** | `127.0.0.1:random_port` | Configured endpoint |
| **Credentials** | Generated locally | From secrets manager |
| **SSL/TLS** | Disabled | Required |
| **Connection Limits** | Development defaults | Production tuned |

The external driver provides connection to managed PostgreSQL services while maintaining the same API surface.

Sources: [cli/daemon/sqldb/external/external.go:12-44](), [cli/daemon/sqldb/driver.go:15-70]()

---

# Page: Database Integration

# Database Integration

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [Cargo.lock](Cargo.lock)
- [Cargo.toml](Cargo.toml)
- [cli/daemon/dash/dash_test.go](cli/daemon/dash/dash_test.go)
- [cli/daemon/db.go](cli/daemon/db.go)
- [cli/daemon/run/infra/infra.go](cli/daemon/run/infra/infra.go)
- [cli/daemon/sqldb/cluster.go](cli/daemon/sqldb/cluster.go)
- [cli/daemon/sqldb/db.go](cli/daemon/sqldb/db.go)
- [cli/daemon/sqldb/docker/docker.go](cli/daemon/sqldb/docker/docker.go)
- [cli/daemon/sqldb/driver.go](cli/daemon/sqldb/driver.go)
- [cli/daemon/sqldb/external/external.go](cli/daemon/sqldb/external/external.go)
- [cli/daemon/sqldb/manager.go](cli/daemon/sqldb/manager.go)
- [cli/daemon/sqldb/migrate.go](cli/daemon/sqldb/migrate.go)
- [cli/daemon/sqldb/proxy.go](cli/daemon/sqldb/proxy.go)
- [cli/daemon/sqldb/utils.go](cli/daemon/sqldb/utils.go)
- [docs/go/primitives/database-troubleshooting.md](docs/go/primitives/database-troubleshooting.md)
- [docs/ts/primitives/databases.md](docs/ts/primitives/databases.md)
- [runtimes/core/Cargo.toml](runtimes/core/Cargo.toml)
- [runtimes/core/src/sqldb/client.rs](runtimes/core/src/sqldb/client.rs)
- [runtimes/core/src/sqldb/manager.rs](runtimes/core/src/sqldb/manager.rs)
- [runtimes/core/src/sqldb/mod.rs](runtimes/core/src/sqldb/mod.rs)
- [runtimes/core/src/sqldb/transaction.rs](runtimes/core/src/sqldb/transaction.rs)
- [runtimes/core/src/sqldb/val.rs](runtimes/core/src/sqldb/val.rs)
- [runtimes/js/Cargo.toml](runtimes/js/Cargo.toml)
- [runtimes/js/encore.dev/api/stream.ts](runtimes/js/encore.dev/api/stream.ts)
- [runtimes/js/encore.dev/internal/appinit/mod.ts](runtimes/js/encore.dev/internal/appinit/mod.ts)
- [runtimes/js/encore.dev/storage/sqldb/database.ts](runtimes/js/encore.dev/storage/sqldb/database.ts)
- [runtimes/js/src/lib.rs](runtimes/js/src/lib.rs)
- [runtimes/js/src/sqldb.rs](runtimes/js/src/sqldb.rs)
- [tsparser/litparser-derive/src/lib.rs](tsparser/litparser-derive/src/lib.rs)

</details>



This document covers Encore's SQL database integration system, which provides automatic provisioning, connection management, type safety, and migration handling for PostgreSQL databases across Go and TypeScript runtimes. The system handles both local development environments using Docker and cloud deployments with managed database services.

For information about specific database usage patterns in applications, see [Using SQL databases](#5.1). For details about code generation and client libraries, see [Client Generation](#5.2).

## Architecture Overview

Encore's database integration consists of several interconnected components that work together to provide a seamless database experience across different environments and runtimes.

### System Component Diagram

```mermaid
graph TB
    subgraph "Application Layer"
        TSApp["TypeScript Application"]
        GoApp["Go Application"]
    end
    
    subgraph "Runtime Layer"
        TSRuntime["JS Runtime<br/>SQLDatabase class"]
        CoreRuntime["Core Runtime<br/>sqldb::Manager"]
        Pool["Connection Pool<br/>bb8::Pool"]
    end
    
    subgraph "Daemon Layer"
        ClusterManager["ClusterManager"]
        DBInstance["DB struct"]
        Cluster["Cluster struct"]
        Proxy["Database Proxy<br/>ServeProxy"]
    end
    
    subgraph "Driver Layer"
        DockerDriver["Docker Driver"]
        ExternalDriver["External Driver"]
    end
    
    subgraph "Infrastructure"
        DockerDB["PostgreSQL Container"]
        CloudDB["Cloud PostgreSQL"]
    end
    
    TSApp --> TSRuntime
    GoApp --> CoreRuntime
    TSRuntime --> CoreRuntime
    CoreRuntime --> Pool
    Pool --> Proxy
    
    Proxy --> ClusterManager
    ClusterManager --> Cluster
    Cluster --> DBInstance
    
    ClusterManager --> DockerDriver
    ClusterManager --> ExternalDriver
    
    DockerDriver --> DockerDB
    ExternalDriver --> CloudDB
```

Sources: [runtimes/js/encore.dev/storage/sqldb/database.ts:265-310](), [runtimes/core/src/sqldb/manager.rs:15-102](), [cli/daemon/sqldb/cluster.go:26-53](), [cli/daemon/sqldb/db.go:25-48](), [cli/daemon/sqldb/proxy.go:20-48]()

## Database Clusters and Management

The database integration system organizes databases into clusters, with each cluster containing multiple individual databases. This design allows for efficient resource management and isolation.

### Cluster Management Structure

```mermaid
graph TB
    subgraph "ClusterManager"
        CM["ClusterManager struct"]
        ClusterMap["clusters map[clusterKey]*Cluster"]
        BackendKeyData["backendKeyData map[uint32]*Cluster"]
    end
    
    subgraph "Cluster Components"
        ClusterStruct["Cluster struct"]
        ClusterID["ClusterID{NS, Type}"]
        EncoreRoles["EncoreRoles[]Role"]
        DBsMap["dbs map[string]*DB"]
    end
    
    subgraph "Database Instance"
        DBStruct["DB struct"]
        EncoreName["EncoreName string"]
        DriverName["driverName string"]
        Ready["ready chan struct{}"]
    end
    
    subgraph "Cluster Types"
        RunCluster["Run (development)"]
        TestCluster["Test (testing)"]
        ShadowCluster["Shadow (migrations)"]
    end
    
    CM --> ClusterMap
    CM --> BackendKeyData
    ClusterMap --> ClusterStruct
    ClusterStruct --> ClusterID
    ClusterStruct --> EncoreRoles
    ClusterStruct --> DBsMap
    DBsMap --> DBStruct
    DBStruct --> EncoreName
    DBStruct --> DriverName
    DBStruct --> Ready
    
    ClusterID --> RunCluster
    ClusterID --> TestCluster
    ClusterID --> ShadowCluster
```

Sources: [cli/daemon/sqldb/manager.go:34-49](), [cli/daemon/sqldb/cluster.go:26-53](), [cli/daemon/sqldb/db.go:25-48]()

### Role-Based Access Control

The system implements a sophisticated role-based access control system with different permission levels:

| Role Type | Permissions | Username Pattern |
|-----------|-------------|------------------|
| `RoleSuperuser` | Full database admin | `postgres` |
| `RoleAdmin` | Database creation, schema changes | `encore-admin` |
| `RoleWrite` | Read/write data operations | `encore-write` |
| `RoleRead` | Read-only data access | `encore-read` |

Sources: [cli/daemon/sqldb/cluster.go:425-440](), [cli/daemon/sqldb/cluster.go:161-194]()

## Type System and Value Conversion

Encore provides seamless type conversion between application types and SQL types through a sophisticated value conversion system.

### Value Type Hierarchy

```mermaid
graph TB
    subgraph "Application Types"
        TSPrimitive["TypeScript Primitive"]
        GoPrimitive["Go Primitive"]
        JSBuffer["Buffer/Uint8Array"]
    end
    
    subgraph "Runtime Types"
        PValue["PValue enum"]
        RowValue["RowValue enum"]
    end
    
    subgraph "SQL Types"
        PostgresTypes["PostgreSQL Types<br/>TEXT, INT4, JSONB, UUID, etc."]
    end
    
    subgraph "PValue Variants"
        PVNull["PValue::Null"]
        PVBool["PValue::Bool"]
        PVString["PValue::String"]
        PVNumber["PValue::Number"]
        PVDateTime["PValue::DateTime"]
        PVArray["PValue::Array"]
        PVObject["PValue::Object"]
    end
    
    subgraph "RowValue Variants"
        RVPVal["RowValue::PVal"]
        RVBytes["RowValue::Bytes"]
        RVUuid["RowValue::Uuid"]
        RVInet["RowValue::Inet"]
        RVCidr["RowValue::Cidr"]
    end
    
    TSPrimitive --> PValue
    GoPrimitive --> PValue
    JSBuffer --> RowValue
    
    PValue --> PVNull
    PValue --> PVBool
    PValue --> PVString
    PValue --> PVNumber
    PValue --> PVDateTime
    PValue --> PVArray
    PValue --> PVObject
    
    RowValue --> RVPVal
    RowValue --> RVBytes
    RowValue --> RVUuid
    RowValue --> RVInet
    RowValue --> RVCidr
    
    RVPVal --> PValue
    PValue --> PostgresTypes
    RowValue --> PostgresTypes
```

Sources: [runtimes/core/src/sqldb/val.rs:10-17](), [runtimes/core/src/sqldb/val.rs:61-309](), [runtimes/core/src/sqldb/val.rs:351-475]()

### Type Conversion Implementation

The `ToSql` and `FromSql` trait implementations handle bidirectional conversion between Encore types and PostgreSQL types. Key conversion patterns include:

- **JSON Types**: `PValue` structures serialize to `JSONB`/`JSON` columns
- **UUID Handling**: String UUIDs convert to native `UUID` type or remain as text
- **Network Types**: CIDR and INET types have dedicated handling
- **Array Support**: Nested arrays and PostgreSQL array types
- **Vector Extensions**: Support for pgvector extension types

Sources: [runtimes/core/src/sqldb/val.rs:23-59](), [runtimes/core/src/sqldb/val.rs:311-349]()

## Connection Handling and Pooling

The system uses a multi-layered connection management approach with connection pooling, transaction support, and proxy routing.

### Connection Pool Architecture

```mermaid
graph TB
    subgraph "Application Layer"
        TSQuery["db.query`SELECT * FROM users`"]
        GoQuery["db.Query(ctx, query, args...)"]
    end
    
    subgraph "Runtime Pool Management"
        PoolStruct["Pool struct"]
        BB8Pool["bb8::Pool<PostgresConnectionManager>"]
        PoolConfig["PoolConfig{min_conns, max_conns}"]
    end
    
    subgraph "Connection Lifecycle"
        GetConn["pool.get()"]
        PooledConn["PooledConnection"]
        Transaction["Transaction struct"]
        Cursor["Cursor/AsyncIterator"]
    end
    
    subgraph "Database Proxy"
        ProxyConn["ProxyConn"]
        StartupData["StartupData{username, password, database}"]
        PostgresProtocol["PostgreSQL Wire Protocol"]
    end
    
    TSQuery --> PoolStruct
    GoQuery --> PoolStruct
    PoolStruct --> BB8Pool
    PoolStruct --> PoolConfig
    
    BB8Pool --> GetConn
    GetConn --> PooledConn
    PooledConn --> Transaction
    PooledConn --> Cursor
    
    PooledConn --> ProxyConn
    ProxyConn --> StartupData
    StartupData --> PostgresProtocol
```

Sources: [runtimes/core/src/sqldb/client.rs:19-48](), [runtimes/core/src/sqldb/manager.rs:129-144](), [cli/daemon/sqldb/proxy.go:54-62]()

### Query Execution Flow

The query execution follows a consistent pattern across both TypeScript and Go runtimes:

1. **Query Preparation**: Template literals or parameterized queries are parsed
2. **Connection Acquisition**: Pool provides a connection from `bb8::Pool`
3. **Parameter Binding**: Values convert to `RowValue` types
4. **Proxy Routing**: Requests route through the database proxy
5. **Result Streaming**: Results return as `Cursor` or async iterators

Sources: [runtimes/js/encore.dev/storage/sqldb/database.ts:60-74](), [runtimes/core/src/sqldb/client.rs:49-100]()

## Migration System

Encore provides an automated database migration system that handles schema evolution across different environments.

### Migration Processing Pipeline

```mermaid
graph TB
    subgraph "Migration Sources"
        OsMigrationReader["OsMigrationReader"]
        MetadataSource["MetadataSource"]
        MigrationFiles["*.up.sql files"]
    end
    
    subgraph "Migration Metadata"
        DBMigration["meta.DBMigration"]
        MigrationNumber["Number uint64"]
        MigrationFilename["Filename string"]
    end
    
    subgraph "Migration Execution"
        RunMigration["RunMigration()"]
        PostgresDriver["postgres.Driver"]
        MigrateInstance["migrate.Instance"]
        SchemaMigrations["schema_migrations table"]
    end
    
    subgraph "Migration Types"
        Sequential["Sequential (default)"]
        NonSequential["Non-sequential (optional)"]
    end
    
    MigrationFiles --> OsMigrationReader
    OsMigrationReader --> MetadataSource
    MetadataSource --> DBMigration
    DBMigration --> MigrationNumber
    DBMigration --> MigrationFilename
    
    DBMigration --> RunMigration
    RunMigration --> PostgresDriver
    PostgresDriver --> MigrateInstance
    MigrateInstance --> SchemaMigrations
    
    RunMigration --> Sequential
    RunMigration --> NonSequential
```

Sources: [cli/daemon/sqldb/migrate.go:26-46](), [cli/daemon/sqldb/migrate.go:321-386](), [cli/daemon/sqldb/db.go:252-310]()

### Migration File Processing

Migration files follow a strict naming convention and processing order:

- **File Format**: `{number}_{description}.up.sql`
- **Sequential Processing**: Migrations apply in numeric order
- **Error Handling**: Failed migrations set dirty flag and require manual intervention
- **Version Tracking**: `schema_migrations` table tracks applied versions

Sources: [docs/ts/primitives/databases.md:67-77](), [cli/daemon/sqldb/migrate.go:91-103]()

## Local Development Integration

For local development, Encore automatically provisions PostgreSQL databases using Docker containers with sophisticated lifecycle management.

### Docker Driver Implementation

```mermaid
graph TB
    subgraph "Docker Management"
        DockerDriver["docker.Driver"]
        ImageExists["ImageExists()"]
        PullImage["PullImage()"]
        ContainerCreate["docker run postgres"]
    end
    
    subgraph "Container Configuration"
        ContainerNames["containerNames()"]
        VolumeNames["clusterVolumeNames()"]
        EnvVars["POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB"]
        PortMapping["Port 5432 mapping"]
    end
    
    subgraph "Lifecycle States"
        NotFound["sqldb.NotFound"]
        Stopped["sqldb.Stopped"]
        Running["sqldb.Running"]
    end
    
    subgraph "Storage Options"
        Memfs["In-memory (tests)"]
        Volume["Docker volume (persistent)"]
    end
    
    DockerDriver --> ImageExists
    ImageExists --> PullImage
    PullImage --> ContainerCreate
    
    ContainerCreate --> ContainerNames
    ContainerCreate --> VolumeNames
    ContainerCreate --> EnvVars
    ContainerCreate --> PortMapping
    
    DockerDriver --> NotFound
    DockerDriver --> Stopped
    DockerDriver --> Running
    
    ContainerCreate --> Memfs
    ContainerCreate --> Volume
```

Sources: [cli/daemon/sqldb/docker/docker.go:23-170](), [cli/daemon/sqldb/docker/docker.go:172-282]()

### Container Naming and Isolation

The Docker driver implements a sophisticated naming scheme to isolate different cluster types and namespaces:

- **Run Clusters**: `encore-sqldb-{app}-run-{namespace}`
- **Test Clusters**: `encore-sqldb-{app}-test-{namespace}`
- **Shadow Clusters**: `encore-sqldb-{app}-shadow-{namespace}`

This ensures complete isolation between different development scenarios and prevents data contamination.

Sources: [cli/daemon/sqldb/docker/docker.go:316-337]()

## Database Proxy System

The database proxy provides a transparent layer that handles authentication, connection routing, and protocol translation between applications and database clusters.

### Proxy Connection Flow

```mermaid
graph TB
    subgraph "Client Connection"
        ClientConn["Client Connection"]
        StartupMessage["PostgreSQL Startup Message"]
        AuthRequest["Authentication Request"]
    end
    
    subgraph "Proxy Processing"
        ProxyConn["ProxyConn()"]
        SetupClient["pgproxy.SetupClient()"]
        PasswordLookup["LookupPassword()"]
        ClusterResolution["Cluster Resolution"]
    end
    
    subgraph "Backend Connection"
        BackendConn["Backend Connection"]
        SetupServer["pgproxy.SetupServer()"]
        AuthenticateClient["AuthenticateClient()"]
        SteadyState["CopySteadyState()"]
    end
    
    subgraph "Authentication Modes"
        EncoreAuth["encore username + cluster password"]
        AppAuth["app-slug username + local/test password"]
    end
    
    ClientConn --> StartupMessage
    StartupMessage --> AuthRequest
    AuthRequest --> ProxyConn
    
    ProxyConn --> SetupClient
    SetupClient --> PasswordLookup
    PasswordLookup --> ClusterResolution
    
    ClusterResolution --> BackendConn
    BackendConn --> SetupServer
    SetupServer --> AuthenticateClient
    AuthenticateClient --> SteadyState
    
    PasswordLookup --> EncoreAuth
    PasswordLookup --> AppAuth
```

Sources: [cli/daemon/sqldb/proxy.go:54-277](), [cli/daemon/sqldb/proxy.go:20-48]()

### Connection String Generation

The proxy system generates connection strings that route through the local proxy server, enabling transparent connection management:

```
postgresql://app-id:cluster-password@127.0.0.1:{proxy-port}/database-name?sslmode=disable
```

This pattern allows applications to connect using standard PostgreSQL drivers while benefiting from Encore's management features.

Sources: [cli/daemon/db.go:154-156](), [runtimes/core/src/sqldb/manager.rs:315-317]()

---

# Page: Client Generation

# Client Generation

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [e2e-tests/testdata/echo_client/js/client.js](e2e-tests/testdata/echo_client/js/client.js)
- [e2e-tests/testdata/echo_client/ts/client.ts](e2e-tests/testdata/echo_client/ts/client.ts)
- [internal/gocodegen/marshalling.go](internal/gocodegen/marshalling.go)

</details>



This document covers Encore's automatic API client generation system, which analyzes application source code and generates type-safe client libraries in multiple languages for consuming Encore APIs. For information about the metadata extraction and schema generation that drives client generation, see [Metadata and Code Generation](#5.3).

## Purpose and Scope

The client generation system automatically creates fully-featured API client libraries from parsed Encore application metadata. These generated clients provide type-safe interfaces for calling Encore APIs, handling authentication, streaming, error handling, and environment targeting. The system supports TypeScript, JavaScript, and Go client generation, with each client tailored to the language's conventions and ecosystem.

## System Overview

The client generation pipeline transforms parsed application metadata into language-specific client libraries that developers can install and use to call Encore APIs from external applications.

```mermaid
graph TD
    subgraph "Source Analysis"
        AppSource["Application Source Code"]
        Parser["Encore Parser"]
        Metadata["Application Metadata"]
    end
    
    subgraph "Client Generation Pipeline"
        Generator["Client Generator"]
        TSGen["TypeScript Generator"]
        JSGen["JavaScript Generator"] 
        GoGen["Go Generator"]
    end
    
    subgraph "Generated Clients"
        TSClient["client.ts"]
        JSClient["client.js"]
        GoClient["client.go"]
    end
    
    subgraph "Client Features"
        Auth["Authentication"]
        Streaming["WebSocket Streaming"]
        ErrorHandling["Structured Errors"]
        Environments["Environment Targeting"]
    end
    
    AppSource --> Parser
    Parser --> Metadata
    Metadata --> Generator
    Generator --> TSGen
    Generator --> JSGen
    Generator --> GoGen
    
    TSGen --> TSClient
    JSGen --> JSClient
    GoGen --> GoClient
    
    TSClient --> Auth
    TSClient --> Streaming
    TSClient --> ErrorHandling
    TSClient --> Environments
    
    JSClient --> Auth
    JSClient --> Streaming
    JSClient --> ErrorHandling
    JSClient --> Environments
```

Sources: [e2e-tests/testdata/echo_client/ts/client.ts:1-100](), [e2e-tests/testdata/echo_client/js/client.js:1-50](), [internal/gocodegen/marshalling.go:1-50]()

## Generated Client Architecture

Generated clients follow a consistent architectural pattern across languages, with a main `Client` class that aggregates individual service clients.

```mermaid
graph TD
    subgraph "Main Client"
        Client["Client"]
        BaseClient["BaseClient"]
        ClientOptions["ClientOptions"]
    end
    
    subgraph "Service Clients"
        CacheService["cache.ServiceClient"]
        EchoService["echo.ServiceClient"]
        TestService["test.ServiceClient"]
        ValidationService["validation.ServiceClient"]
    end
    
    subgraph "Core Features"
        Fetcher["Custom Fetcher"]
        AuthGenerator["AuthDataGenerator"]
        RequestInit["RequestInit Options"]
    end
    
    subgraph "API Methods"
        GetList["GetList()"]
        BasicEcho["BasicEcho()"]
        StreamAPI["StreamInOut<>"]
        RawEndpoint["RawEndpoint()"]
    end
    
    Client --> BaseClient
    Client --> CacheService
    Client --> EchoService
    Client --> TestService
    Client --> ValidationService
    
    BaseClient --> Fetcher
    BaseClient --> AuthGenerator
    BaseClient --> RequestInit
    
    CacheService --> GetList
    EchoService --> BasicEcho
    EchoService --> StreamAPI
    TestService --> RawEndpoint
```

Sources: [e2e-tests/testdata/echo_client/ts/client.ts:32-78](), [e2e-tests/testdata/echo_client/js/client.js:32-50]()

## Environment and Authentication Support

Generated clients include sophisticated environment targeting and authentication capabilities built into the `BaseClient` class.

### Environment Targeting

| Function | Purpose | Example |
|----------|---------|---------|
| `Local` | Local development | `http://localhost:4000` |
| `Environment(name)` | Named cloud environment | `https://prod-myapp.encr.app` |
| `PreviewEnv(pr)` | Preview environment | `https://pr123-myapp.encr.app` |

### Authentication Integration

The client automatically handles authentication through the `AuthDataGenerator` system, which can be either static auth data or a function that dynamically generates auth tokens.

```mermaid
graph LR
    subgraph "Authentication Flow"
        AuthGen["AuthDataGenerator"]
        AuthData["AuthParams"]
        Headers["Request Headers"]
        Query["Query Parameters"]
    end
    
    subgraph "Auth Components"
        AuthHeader["Header"]
        AuthInt["AuthInt"]
        Authorization["Authorization"]
        QueryAuth["Query[]"]
        NewAuth["NewAuth"]
    end
    
    AuthGen --> AuthData
    AuthData --> Headers
    AuthData --> Query
    
    AuthData --> AuthHeader
    AuthData --> AuthInt
    AuthData --> Authorization
    AuthData --> QueryAuth
    AuthData --> NewAuth
    
    Headers --> APICall["API Request"]
    Query --> APICall
```

Sources: [e2e-tests/testdata/echo_client/ts/client.ts:1072-1102](), [e2e-tests/testdata/echo_client/js/client.js:800-830]()

## Request Processing and Marshalling

The client generation system includes sophisticated request/response processing with automatic marshalling between different data formats.

### Data Type Marshalling

The `MarshallingCodeGenerator` handles conversion between string-based HTTP parameters and typed language constructs:

| Builtin Type | From String Method | To String Method |
|--------------|-------------------|------------------|
| `STRING` | `ToString()` | `FromString()` |
| `BOOL` | `ToBool()` | `FromBool()` |
| `UUID` | `ToUUID()` | `FromUUID()` |
| `TIME` | `ToTime()` | `FromTime()` |
| `USER_ID` | `ToUserID()` | `FromUserID()` |
| `JSON` | `ToJSON()` | `FromJSON()` |

### Request Construction

Generated API methods automatically handle complex request construction, separating parameters into appropriate HTTP components:

```mermaid
graph TD
    subgraph "Request Parameters"
        Params["Method Parameters"]
        PathParams["Path Parameters"]
        HeaderParams["Header Parameters"]
        QueryParams["Query Parameters"]
        BodyParams["Body Parameters"]
    end
    
    subgraph "HTTP Request Construction"
        URL["URL Builder"]
        HeaderBuilder["Header Builder"]
        QueryBuilder["Query Builder"]
        BodyBuilder["JSON Body Builder"]
    end
    
    subgraph "Generated Request"
        HTTPRequest["HTTP Request"]
        FinalURL["Final URL"]
        FinalHeaders["Final Headers"]
        FinalBody["Final Body"]
    end
    
    Params --> PathParams
    Params --> HeaderParams
    Params --> QueryParams
    Params --> BodyParams
    
    PathParams --> URL
    HeaderParams --> HeaderBuilder
    QueryParams --> QueryBuilder
    BodyParams --> BodyBuilder
    
    URL --> FinalURL
    HeaderBuilder --> FinalHeaders
    QueryBuilder --> FinalURL
    BodyBuilder --> FinalBody
    
    FinalURL --> HTTPRequest
    FinalHeaders --> HTTPRequest
    FinalBody --> HTTPRequest
```

Sources: [e2e-tests/testdata/echo_client/ts/client.ts:419-458](), [internal/gocodegen/marshalling.go:173-301]()

## Streaming API Support

Generated clients include full support for WebSocket-based streaming APIs with three distinct streaming patterns:

### Streaming Classes

| Class | Purpose | Usage |
|-------|---------|-------|
| `StreamInOut<Request, Response>` | Bidirectional streaming | Real-time communication |
| `StreamIn<Response>` | Server-to-client streaming | Live data feeds |
| `StreamOut<Request, Response>` | Client-to-server streaming | Data upload with response |

### WebSocket Integration

```mermaid
graph TD
    subgraph "WebSocket Connection"
        WSConnection["WebSocketConnection"]
        Protocols["encore-ws protocol"]
        HeaderEncoding["Base64 Header Encoding"]
    end
    
    subgraph "Stream Classes"
        StreamInOut["StreamInOut"]
        StreamIn["StreamIn"]
        StreamOut["StreamOut"]
    end
    
    subgraph "Message Handling"
        Buffer["Message Buffer"]
        AsyncIterator["AsyncIterator Interface"]
        UpdateHandlers["Update Handlers"]
    end
    
    WSConnection --> Protocols
    WSConnection --> HeaderEncoding
    
    WSConnection --> StreamInOut
    WSConnection --> StreamIn
    WSConnection --> StreamOut
    
    StreamInOut --> Buffer
    StreamIn --> Buffer
    StreamOut --> UpdateHandlers
    
    Buffer --> AsyncIterator
    UpdateHandlers --> AsyncIterator
```

Sources: [e2e-tests/testdata/echo_client/ts/client.ts:854-1014](), [e2e-tests/testdata/echo_client/js/client.js:613-764]()

## Error Handling System

Generated clients include comprehensive structured error handling through the `APIError` class and `ErrCode` enumeration.

### Error Structure

The `APIError` class provides structured error information:
- `status`: HTTP status code
- `code`: Encore-specific error code
- `message`: Human-readable error message
- `details`: Additional error context

### Error Code Categories

| Category | Codes | Purpose |
|----------|-------|---------|
| Client Errors | `InvalidArgument`, `NotFound`, `PermissionDenied` | Request issues |
| Server Errors | `Internal`, `Unavailable`, `DeadlineExceeded` | Service issues |
| Auth Errors | `Unauthenticated` | Authentication failures |
| Data Errors | `DataLoss`, `FailedPrecondition` | Data integrity issues |

Sources: [e2e-tests/testdata/echo_client/ts/client.ts:1261-1507](), [e2e-tests/testdata/echo_client/js/client.js:981-1223]()

## Integration with Encore Runtime

The client generation system integrates seamlessly with Encore's development and deployment workflow:

```mermaid
graph LR
    subgraph "Development Flow"
        DevApp["Encore Application"]
        LocalRuntime["Local Runtime"]
        DevDashboard["Developer Dashboard"]
    end
    
    subgraph "Client Generation"
        MetaExtract["Metadata Extraction"]
        ClientGen["Client Generation"]
        PublishedClient["Published Client"]
    end
    
    subgraph "External Usage"
        WebApp["Web Application"]
        MobileApp["Mobile Application"]
        BackendService["Backend Service"]
    end
    
    DevApp --> LocalRuntime
    LocalRuntime --> DevDashboard
    
    DevApp --> MetaExtract
    MetaExtract --> ClientGen
    ClientGen --> PublishedClient
    
    PublishedClient --> WebApp
    PublishedClient --> MobileApp
    PublishedClient --> BackendService
    
    WebApp --> LocalRuntime
    MobileApp --> LocalRuntime
    BackendService --> LocalRuntime
```

The generated clients automatically target the appropriate Encore environment (local development, staging, production) based on the `BaseURL` configuration, enabling seamless development and deployment workflows.

Sources: [e2e-tests/testdata/echo_client/ts/client.ts:10-27](), [e2e-tests/testdata/echo_client/js/client.js:9-25](), [internal/gocodegen/marshalling.go:60-85]()

---

# Page: Metadata and Code Generation

# Metadata and Code Generation

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [internal/gocodegen/marshalling.go](internal/gocodegen/marshalling.go)
- [proto/encore/engine/trace/trace.pb.go](proto/encore/engine/trace/trace.pb.go)
- [proto/encore/parser/meta/v1/meta.pb.go](proto/encore/parser/meta/v1/meta.pb.go)
- [proto/encore/parser/meta/v1/meta.pb.ts](proto/encore/parser/meta/v1/meta.pb.ts)
- [proto/encore/parser/meta/v1/meta.proto](proto/encore/parser/meta/v1/meta.proto)
- [proto/encore/parser/schema/v1/schema.pb.go](proto/encore/parser/schema/v1/schema.pb.go)
- [v2/app/legacymeta/legacymeta.go](v2/app/legacymeta/legacymeta.go)

</details>



This document covers Encore's metadata system and code generation pipeline. The metadata system extracts comprehensive structural information from Encore applications, while the code generation pipeline uses this metadata to generate client libraries, marshalling code, and other supporting artifacts.

For information about the parsing systems that feed into metadata collection, see [3.2](#3.2). For details about client generation specifically, see [5.2](#5.2).

## System Overview

Encore's metadata system serves as the central knowledge repository about application structure. It captures detailed information about services, APIs, infrastructure resources, and their relationships, then enables automated code generation based on this structured data.

```mermaid
graph TD
    App["Parsed Application"] --> MetaBuilder["legacymeta.builder"]
    MetaBuilder --> MetaData["meta.Data (protobuf)"]
    MetaData --> ClientGen["Client Generation"]
    MetaData --> MarshallingGen["Marshalling Code Generation"]
    MetaData --> TraceNodes["Trace Metadata"]
    
    subgraph "Metadata Collection"
        Services["Services & RPCs"]
        Infrastructure["Infrastructure Resources"]
        Schema["Type Schemas"]
        Packages["Package Information"]
    end
    
    App --> Services
    App --> Infrastructure  
    App --> Schema
    App --> Packages
    
    Services --> MetaBuilder
    Infrastructure --> MetaBuilder
    Schema --> MetaBuilder
    Packages --> MetaBuilder
```

Sources: [v2/app/legacymeta/legacymeta.go:43-54](), [proto/encore/parser/meta/v1/meta.proto:9-28]()

## Core Metadata Structures

The metadata system centers around the `meta.Data` protobuf structure, which contains comprehensive application information organized into logical categories.

```mermaid
graph TB
    Data["meta.Data"] --> ModuleInfo["Module Information"]
    Data --> Services["Services[]"]
    Data --> Packages["Packages[]"] 
    Data --> Infrastructure["Infrastructure Resources"]
    Data --> Schema["Type Declarations[]"]
    
    ModuleInfo --> ModulePath["module_path"]
    ModuleInfo --> AppRevision["app_revision"] 
    ModuleInfo --> Language["language (GO/TS)"]
    
    Services --> RPC["RPCs[]"]
    Services --> Databases["databases[]"]
    Services --> Migrations["migrations[]"]
    
    Infrastructure --> PubSubTopics["pubsub_topics[]"]
    Infrastructure --> CacheClusters["cache_clusters[]"]
    Infrastructure --> SqlDatabases["sql_databases[]"]
    Infrastructure --> Buckets["buckets[]"]
    Infrastructure --> Metrics["metrics[]"]
    Infrastructure --> CronJobs["cron_jobs[]"]
    Infrastructure --> Gateways["gateways[]"]
    
    Packages --> ServiceName["service_name"]
    Packages --> RpcCalls["rpc_calls[]"]
    Packages --> TraceNodes["trace_nodes[]"]
    Packages --> Secrets["secrets[]"]
```

Sources: [proto/encore/parser/meta/v1/meta.proto:10-28](), [proto/encore/parser/meta/v1/meta.pb.go:618-640]()

### RPC Metadata Structure

Each RPC endpoint is captured with detailed metadata including access control, request/response schemas, and routing information.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | RPC endpoint name |
| `service_name` | string | Owning service |
| `access_type` | `RPC_AccessType` | PUBLIC, AUTH, or PRIVATE |
| `request_schema` | `schema.v1.Type` | Request type schema |
| `response_schema` | `schema.v1.Type` | Response type schema |
| `path` | `Path` | URL path with segments |
| `http_methods` | string[] | Allowed HTTP methods |
| `expose` | map[string]ExposeOptions | Gateway exposure settings |

Sources: [proto/encore/parser/meta/v1/meta.proto:117-151](), [v2/app/legacymeta/legacymeta.go:86-121]()

## Metadata Collection Process

The `legacymeta.builder` coordinates metadata collection by traversing the parsed application and extracting information from various resource types.

```mermaid
graph TD
    Start["legacymeta.Compute()"] --> Builder["builder.Build()"]
    Builder --> InitMeta["Initialize meta.Data"]
    
    InitMeta --> ProcessServices["Process Services"]
    ProcessServices --> ProcessPackages["Process Packages"] 
    ProcessPackages --> ProcessResources["Process Resources"]
    
    subgraph "Resource Processing"
        CronJobs["crons.Job"]
        AuthHandlers["authhandler.AuthHandler"]
        Databases["sqldb.Database"]
        Topics["pubsub.Topic"]
        Buckets["objects.Bucket"]
        Clusters["caches.Cluster"]
        Metrics["metrics.Metric"]
        Config["config.Load"]
        Secrets["secrets.Secrets"]
        Middleware["middleware.Middleware"]
    end
    
    ProcessResources --> CronJobs
    ProcessResources --> AuthHandlers
    ProcessResources --> Databases
    ProcessResources --> Topics
    ProcessResources --> Buckets
    ProcessResources --> Clusters
    ProcessResources --> Metrics
    ProcessResources --> Config
    ProcessResources --> Secrets
    ProcessResources --> Middleware
    
    ProcessResources --> DependentPass["Process Dependent Resources"]
    DependentPass --> Subscriptions["pubsub.Subscription"]
    DependentPass --> Keyspaces["caches.Keyspace"]
    
    DependentPass --> FinalMeta["Final meta.Data + TraceNodes"]
```

Sources: [v2/app/legacymeta/legacymeta.go:56-548](), [v2/app/legacymeta/legacymeta.go:208-467]()

### Service and RPC Processing

Services are processed by extracting endpoint information and converting access patterns to metadata representation:

```mermaid
graph LR
    Service["app.Service"] --> Framework["Framework Endpoints"]
    Framework --> EndpointLoop["For each Endpoint"]
    
    EndpointLoop --> CreateRPC["Create meta.RPC"]
    CreateRPC --> AccessType["Determine AccessType"]
    
    subgraph "Access Type Mapping"
        PublicAPI["api.Public"] --> PublicRPC["RPC_PUBLIC + expose"]
        AuthAPI["api.Auth"] --> AuthRPC["RPC_AUTH + expose"] 
        PrivateAPI["api.Private"] --> PrivateRPC["RPC_PRIVATE"]
    end
    
    AccessType --> PublicAPI
    AccessType --> AuthAPI
    AccessType --> PrivateAPI
    
    CreateRPC --> SetSchemas["Set request/response schemas"]
    SetSchemas --> SetPath["Convert resourcepaths.Path"]
    SetPath --> AddToService["Add to meta.Service.Rpcs[]"]
```

Sources: [v2/app/legacymeta/legacymeta.go:84-127](), [v2/app/legacymeta/legacymeta.go:551-604]()

## Code Generation Pipeline

The marshalling code generator creates type conversion utilities for handling HTTP parameters and JSON data based on schema information.

```mermaid
graph TD
    MetaData["meta.Data"] --> SchemaTypes["schema.v1.Type"]
    SchemaTypes --> MarshallingGen["MarshallingCodeGenerator"]
    
    MarshallingGen --> BuiltinMethods["Generate Builtin Converters"]
    BuiltinMethods --> StringConv["String Conversions"]
    BuiltinMethods --> NumericConv["Numeric Conversions"] 
    BuiltinMethods --> TimeConv["Time/UUID Conversions"]
    
    MarshallingGen --> FromString["FromString Methods"]
    MarshallingGen --> ToString["ToString Methods"]
    MarshallingGen --> JSONParsing["JSON Parsing Methods"]
    
    subgraph "Generated Methods"
        ToInt64["ToInt64(field, s, required)"]
        FromBool["FromBool(s)"]
        ToUUID["ToUUID(field, s, required)"]
        ParseJSON["ParseJSON(field, iter, dst)"]
        Body["Body(body) []byte"]
    end
    
    FromString --> ToInt64
    ToString --> FromBool
    StringConv --> ToUUID
    JSONParsing --> ParseJSON
    JSONParsing --> Body
```

Sources: [internal/gocodegen/marshalling.go:19-32](), [internal/gocodegen/marshalling.go:88-98](), [internal/gocodegen/marshalling.go:173-301]()

### Marshalling Method Generation

The system generates type-specific conversion methods based on schema builtin types:

| Builtin Type | From String Method | To String Method | Notes |
|--------------|-------------------|------------------|-------|
| `Builtin_STRING` | `ToString()` | `FromString()` | Direct pass-through |
| `Builtin_INT64` | `ToInt64()` | `FromInt64()` | Uses `strconv.ParseInt` |
| `Builtin_UUID` | `ToUUID()` | `FromUUID()` | Uses `uuid.FromString` |
| `Builtin_TIME` | `ToTime()` | `FromTime()` | RFC3339 format |
| `Builtin_BYTES` | `ToBytes()` | `FromBytes()` | Base64 URL encoding |
| `Builtin_JSON` | `ToJSON()` | `FromJSON()` | Raw JSON message |

Sources: [internal/gocodegen/marshalling.go:203-296](), [internal/gocodegen/marshalling.go:335-417]()

## Trace Node Generation

The metadata system includes trace node generation for debugging and development tooling. Trace nodes capture source location information for various application constructs.

```mermaid
graph TB
    TraceNodes["TraceNodes"] --> NodeTypes["Node Types"]
    
    NodeTypes --> RPCDef["RPCDefNode"]
    NodeTypes --> RPCCall["RPCCallNode"] 
    NodeTypes --> StaticCall["StaticCallNode"]
    NodeTypes --> AuthHandler["AuthHandlerDefNode"]
    NodeTypes --> PubSubTopic["PubSubTopicDefNode"]
    NodeTypes --> PubSubPublish["PubSubPublishNode"]
    NodeTypes --> PubSubSub["PubSubSubscriberNode"]
    NodeTypes --> ServiceInit["ServiceInitNode"]
    NodeTypes --> MiddlewareDef["MiddlewareDefNode"]
    NodeTypes --> CacheKeyspace["CacheKeyspaceDefNode"]
    
    subgraph "Location Information"
        FilePath["filepath (relative to app root)"]
        Positions["start_pos, end_pos"]
        SourceLines["src_line_start, src_line_end"]
        SourceCols["src_col_start, src_col_end"]
    end
    
    RPCDef --> FilePath
    RPCCall --> FilePath
    StaticCall --> FilePath
```

Sources: [proto/encore/parser/meta/v1/meta.proto:197-286](), [v2/app/legacymeta/legacymeta.go:527-529]()

## Integration Points

The metadata system integrates with multiple Encore subsystems to provide a unified view of application structure:

- **Parser Integration**: Consumes parsed resources from `app.Parse.Resources()`
- **Schema System**: Uses `schema.v1.Type` for type representation  
- **Tracing System**: Generates trace nodes for runtime debugging
- **Client Generation**: Provides metadata for generating API clients
- **Development Tools**: Supports dashboard and debugging features

Sources: [v2/app/legacymeta/legacymeta.go:208-209](), [proto/encore/parser/schema/v1/schema.proto:176-200](), [proto/encore/engine/trace/trace.proto]()

---

# Page: Application Lifecycle

# Application Lifecycle

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.github/dockerimg/Dockerfile](.github/dockerimg/Dockerfile)
- [.github/dockerimg/encore-entrypoint.bash](.github/dockerimg/encore-entrypoint.bash)
- [.github/workflows/release.yml](.github/workflows/release.yml)
- [.gitignore](.gitignore)
- [cli/cmd/encore/app/create.go](cli/cmd/encore/app/create.go)
- [cli/cmd/encore/app/create_form.go](cli/cmd/encore/app/create_form.go)
- [cli/cmd/encore/app/create_test.go](cli/cmd/encore/app/create_test.go)
- [cli/cmd/encore/app/initialize.go](cli/cmd/encore/app/initialize.go)
- [cli/cmd/encore/build.go](cli/cmd/encore/build.go)
- [cli/cmd/encore/daemon/daemon.go](cli/cmd/encore/daemon/daemon.go)
- [cli/cmd/encore/version.go](cli/cmd/encore/version.go)
- [cli/daemon/sqldb/remote.go](cli/daemon/sqldb/remote.go)
- [cli/internal/update/update.go](cli/internal/update/update.go)
- [internal/env/env.go](internal/env/env.go)
- [internal/version/version.go](internal/version/version.go)
- [pkg/eerror/stack.go](pkg/eerror/stack.go)
- [pkg/make-release/make-release.go](pkg/make-release/make-release.go)
- [pkg/make-release/windows/.gitignore](pkg/make-release/windows/.gitignore)
- [pkg/make-release/windows/build.bat](pkg/make-release/windows/build.bat)
- [pkg/make-release/windows/manifest.xml](pkg/make-release/windows/manifest.xml)
- [pkg/make-release/windows/resources.rc](pkg/make-release/windows/resources.rc)
- [pkg/pgproxy/pgproxy.go](pkg/pgproxy/pgproxy.go)
- [v2/codegen/apigen/apigen.go](v2/codegen/apigen/apigen.go)

</details>



This document describes the complete lifecycle of an Encore application, from initial creation through local development to deployment. It details the internal processes and components that manage applications throughout their lifecycle.

## Overview

The application lifecycle in Encore is orchestrated by several core components: the `Daemon` service, `apps.Manager`, `run.Manager`, and various CLI commands. These components work together to provide a seamless experience from application creation to deployment.

```mermaid
flowchart TB
    subgraph "CLI Layer"
        createAppCmd["createAppCmd"]
        runCmd["encore run"]
        buildCmd["encore build docker"]
        versionCmd["encore version"]
    end
    
    subgraph "Daemon Layer"
        Daemon["Daemon struct"]
        AppsManager["apps.Manager"]
        RunMgr["run.Manager"]
        Server["daemon.Server"]
    end
    
    subgraph "Core Functions"
        createApp["createApp()"]
        validateName["validateName()"]
        parseTemplate["parseTemplate()"]
        initGitRepo["initGitRepo()"]
        dockerBuild["dockerBuild()"]
    end
    
    createAppCmd --> createApp
    createApp --> validateName
    createApp --> parseTemplate
    createApp --> initGitRepo
    createApp --> AppsManager
    
    runCmd --> Daemon
    Daemon --> RunMgr
    Daemon --> Server
    
    buildCmd --> dockerBuild
    
    versionCmd --> CheckUpdate["update.Check()"]
```

Sources:
- [cli/cmd/encore/daemon/daemon.go:96-125]()
- [cli/cmd/encore/app/create.go:38-53]()
- [cli/cmd/encore/app/create.go:118-337]()
- [cli/cmd/encore/build.go:33-76]()
- [cli/cmd/encore/version.go:17-60]()

## Application Creation

Applications in Encore can be created in two ways: creating a new application from scratch or initializing an existing codebase as an Encore application.

### Creating a New Application

The `createAppCmd` cobra command invokes the `createApp()` function, which orchestrates the entire application creation process. The process involves several key functions and validation steps:

| Function | Purpose | File Reference |
|----------|---------|----------------|
| `createApp()` | Main orchestration function | [cli/cmd/encore/app/create.go:118-337]() |
| `validateName()` | Validates app name constraints | [cli/cmd/encore/app/create.go:350-373]() |
| `parseTemplate()` | Parses GitHub template URLs | [cli/cmd/encore/app/create.go:438-445]() |
| `selectTemplate()` | Interactive template selection | [cli/cmd/encore/app/create_form.go:435-556]() |
| `initGitRepo()` | Initializes Git repository | [cli/cmd/encore/app/create.go:447-499]() |

```mermaid
sequenceDiagram
    participant User
    participant createAppCmd["createAppCmd"]
    participant createApp["createApp()"]
    participant validateName["validateName()"]
    participant parseTemplate["parseTemplate()"]
    participant createAppOnServer["createAppOnServer()"]
    participant generateWrappers["generateWrappers()"]
    participant DaemonCreateApp["daemon.CreateApp()"]
    
    User->>createAppCmd: "encore app create [name]"
    createAppCmd->>createApp: "createApp(ctx, name, template)"
    createApp->>validateName: "validateName(name)"
    validateName-->>createApp: "validation result"
    createApp->>parseTemplate: "parseTemplate(ctx, template)"
    parseTemplate-->>createApp: "*github.Tree"
    createApp->>createAppOnServer: "createAppOnServer(name, cfg)"
    createAppOnServer-->>createApp: "*platform.App"
    createApp->>generateWrappers: "generateWrappers(appPath)"
    createApp->>DaemonCreateApp: "daemon.CreateApp(ctx, req)"
    DaemonCreateApp-->>createApp: "response"
    createApp-->>User: "Success message"
```

The `createApp()` function performs several critical operations:

1. **Template Processing**: Uses `github.ExtractTree()` to download template code from GitHub repositories
2. **App Registration**: Calls `createAppOnServer()` to register the app with the Encore platform if logged in  
3. **File Generation**: Creates the `encore.app` configuration file using `setEncoreAppID()`
4. **Daemon Registration**: Registers the app with the local daemon via `daemon.CreateApp()`

### App Configuration File

The `encore.app` file structure is managed by the `setEncoreAppID()` function:

```json
{
    "id": "app-slug-from-platform",
    "lang": "typescript"  // Added for TypeScript apps
}
```

Sources:
- [cli/cmd/encore/app/create.go:626-680]()
- [cli/cmd/encore/app/create.go:273-286]()
- [cli/cmd/encore/app/initialize.go:94-105]()

### Initializing an Existing Codebase

The `initAppCmd` handles initialization of existing codebases through the `initializeApp()` function. This process is simpler than full app creation since it doesn't need to download templates:

```mermaid
sequenceDiagram
    participant User
    participant initAppCmd["initAppCmd"]
    participant initializeApp["initializeApp()"]
    participant MaybeAppRoot["cmdutil.MaybeAppRoot()"]
    participant selectTemplate["selectTemplate()"]
    participant createAppOnServer["createAppOnServer()"]
    participant WriteFile["xos.WriteFile()"]
    
    User->>initAppCmd: "encore app init [name]"
    initAppCmd->>initializeApp: "initializeApp(name)"
    initializeApp->>MaybeAppRoot: "Check for existing encore.app"
    MaybeAppRoot-->>initializeApp: "ErrNoEncoreApp"
    initializeApp->>selectTemplate: "selectTemplate(name, \"\", true)"
    selectTemplate-->>initializeApp: "name, template, lang"
    initializeApp->>createAppOnServer: "createAppOnServer(name, cfg)"
    createAppOnServer-->>initializeApp: "app slug"
    initializeApp->>WriteFile: "Write encore.app file"
    WriteFile-->>initializeApp: "success"
    initializeApp-->>User: "Success message"
```

The `initializeApp()` function uses different templates for Go vs TypeScript:

| Language | Template Format | File Reference |
|----------|----------------|----------------|
| Go | `goEncoreAppData` | [cli/cmd/encore/app/initialize.go:25-28]() |
| TypeScript | `tsEncoreAppData` | [cli/cmd/encore/app/initialize.go:20-24]() |

Sources:
- [cli/cmd/encore/app/initialize.go:56-132]()
- [cli/cmd/encore/app/initialize.go:36-54]()

## Local Development

The local development environment is orchestrated by the `Daemon` struct, which manages multiple services and provides runtime capabilities.

### Daemon Architecture

The `Daemon` struct coordinates various managers and services for local development:

```mermaid
graph TB
    subgraph "Daemon Struct"
        Daemon["Daemon"]
        Apps["Apps *apps.Manager"]
        RunMgr["RunMgr *run.Manager"]
        ClusterMgr["ClusterMgr *sqldb.ClusterManager"]
        Secret["Secret *secret.Manager"]
        Trace["Trace trace2.Store"]
        Server["Server *daemon.Server"]
    end
    
    subgraph "Network Listeners"
        DaemonSocket["Daemon Unix Socket"]
        Runtime["Runtime TCP :9600"]
        DBProxy["DBProxy TCP :9500"] 
        Dash["Dash TCP :9400"]
        Debug["Debug TCP :9700"]
        ObjectStorage["ObjectStorage TCP :9800"]
        MCP["MCP TCP :9900"]
    end
    
    Daemon --> Apps
    Daemon --> RunMgr
    Daemon --> ClusterMgr
    Daemon --> Secret
    Daemon --> Trace
    Daemon --> Server
    
    Daemon --> DaemonSocket
    Daemon --> Runtime
    Daemon --> DBProxy
    Daemon --> Dash
    Daemon --> Debug
    Daemon --> ObjectStorage
    Daemon --> MCP
```

The `Daemon.init()` method initializes all components and `Daemon.serve()` starts the network listeners:

| Service | Port | Purpose | Function |
|---------|------|---------|----------|
| Daemon | Unix Socket | CLI communication | `serveDaemon()` |
| Runtime | 9600 | App runtime | `serveRuntime()` |
| DBProxy | 9500 | Database proxy | `serveDBProxy()` |
| Dashboard | 9400 | Dev dashboard | `serveDash()` |
| Debug | 9700 | Debug/pprof | `serveDebug()` |

### Running Applications

The `run.Manager` handles application execution through the runtime port:

```mermaid
sequenceDiagram
    participant CLI
    participant DaemonServer["daemon.Server"]
    participant RunMgr["run.Manager"]
    participant Engine["engine.NewServer()"]
    participant Runtime["Application Runtime"]
    
    CLI->>DaemonServer: "daemon.Run(RunRequest)"
    DaemonServer->>RunMgr: "Start application"
    RunMgr->>Engine: "NewServer(RunMgr, recorder)"
    Engine->>Runtime: "Load and compile code"
    Runtime->>Engine: "HTTP server on :9600"
    Engine-->>CLI: "Stream command output"
    Note over CLI, Runtime: "Hot reload via file watchers"
```

The `run.Manager` configuration includes:

| Field | Purpose | File Reference |
|-------|---------|----------------|
| `RuntimePort` | Port for runtime server | [cli/cmd/encore/daemon/daemon.go:161]() |
| `DBProxyPort` | Port for database proxy | [cli/cmd/encore/daemon/daemon.go:162]() |
| `DashBaseURL` | URL for dashboard | [cli/cmd/encore/daemon/daemon.go:163]() |

Sources:
- [cli/cmd/encore/daemon/daemon.go:96-184]()
- [cli/cmd/encore/daemon/daemon.go:186-194]()
- [cli/cmd/encore/daemon/daemon.go:252-297]()

## Docker Image Building

The `dockerBuildCmd` initiates container image building through the `dockerBuild()` function, which communicates with the daemon's export system.

### Docker Build Implementation

The build process is handled by the daemon's `Export()` method, which receives a `ExportRequest` with Docker-specific parameters:

```mermaid
flowchart TB
    subgraph "CLI Layer"
        dockerBuildCmd["dockerBuildCmd"]
        buildParams["buildParams struct"]
        dockerBuild["dockerBuild()"]
    end
    
    subgraph "Daemon Layer"
        DaemonExport["daemon.Export()"]
        ExportRequest["ExportRequest"]
        DockerExportParams["DockerExportParams"]
    end
    
    subgraph "Build Parameters"
        AppRoot["AppRoot string"]
        ImageTag["ImageTag string"]
        BaseImg["BaseImg string"]
        CgoEnabled["CgoEnabled bool"]
        Goos["Goos string"]
        Goarch["Goarch string"]
    end
    
    dockerBuildCmd --> buildParams
    buildParams --> dockerBuild
    dockerBuild --> DaemonExport
    DaemonExport --> ExportRequest
    ExportRequest --> DockerExportParams
    
    buildParams --> AppRoot
    buildParams --> ImageTag
    buildParams --> BaseImg
    buildParams --> CgoEnabled
    buildParams --> Goos
    buildParams --> Goarch
```

The `buildParams` struct contains all Docker build configuration:

| Field | Purpose | File Reference |
|-------|---------|----------------|
| `AppRoot` | Application root directory | [cli/cmd/encore/build.go:79]() |
| `ImageTag` | Docker image tag | [cli/cmd/encore/build.go:81]() |
| `BaseImg` | Base image (default "scratch") | [cli/cmd/encore/build.go:83]() |
| `CgoEnabled` | Enable CGO compilation | [cli/cmd/encore/build.go:86]() |
| `Services` | Specific services to include | [cli/cmd/encore/build.go:89]() |
| `Gateways` | Specific gateways to include | [cli/cmd/encore/build.go:90]() |

### Export Request Processing

The `dockerBuild()` function constructs an `ExportRequest` with Docker-specific parameters:

```mermaid
sequenceDiagram
    participant dockerBuild["dockerBuild()"]
    participant setupDaemon["setupDaemon()"]
    participant DaemonExport["daemon.Export()"]
    participant StreamOutput["cmdutil.StreamCommandOutput()"]
    
    dockerBuild->>setupDaemon: "setupDaemon(ctx)"
    setupDaemon-->>dockerBuild: "daemon client"
    dockerBuild->>DaemonExport: "Export(ctx, ExportRequest)"
    Note over DaemonExport: "ExportRequest contains DockerExportParams"
    DaemonExport-->>dockerBuild: "stream response"
    dockerBuild->>StreamOutput: "Stream build output"
    StreamOutput-->>dockerBuild: "exit code"
```

The `DockerExportParams` determines the output destination:

| Field | Purpose | Usage |
|-------|---------|-------|
| `LocalDaemonTag` | Tag for local Docker daemon | When `Push=false` |
| `PushDestinationTag` | Tag for remote registry | When `Push=true` |
| `BaseImageTag` | Base image to build from | Always required |

Sources:
- [cli/cmd/encore/build.go:93-150]()
- [cli/cmd/encore/build.go:33-76]()
- [cli/cmd/encore/build.go:128-142]()

## Release Process

The Encore platform release process is automated through GitHub Actions and involves cross-platform compilation using the `make-release.go` tool.

### Release Workflow Architecture

The release workflow is defined in the `release.yml` GitHub Actions configuration and uses matrix builds for cross-platform compilation:

```mermaid
flowchart TB
    subgraph "GitHub Actions Workflow"
        WorkflowDispatch["workflow_dispatch trigger"]
        BuildMatrix["Build Matrix Strategy"]
        MakeRelease["make-release.go execution"]
        PublishDocker["publish-docker-images job"]
        NotifySuccess["notify_release_success job"]
    end
    
    subgraph "Build Matrix Targets"
        LinuxAMD64["linux/amd64"]
        LinuxARM64["linux/arm64"] 
        MacOSAMD64["darwin/amd64"]
        MacOSARM64["darwin/arm64"]
        WindowsAMD64["windows/amd64"]
    end
    
    subgraph "Build Artifacts"
        TarGZ["encore-VERSION-OS_ARCH.tar.gz"]
        DockerImages["Docker Registry Images"]
        Homebrew["Homebrew Formula Updates"]
    end
    
    WorkflowDispatch --> BuildMatrix
    BuildMatrix --> MakeRelease
    MakeRelease --> LinuxAMD64
    MakeRelease --> LinuxARM64
    MakeRelease --> MacOSAMD64
    MakeRelease --> MacOSARM64
    MakeRelease --> WindowsAMD64
    
    MakeRelease --> TarGZ
    PublishDocker --> DockerImages
    NotifySuccess --> Homebrew
```

The workflow accepts input parameters:

| Parameter | Purpose | File Reference |
|-----------|---------|----------------|
| `version` | Version to build (e.g., "1.2.3") | [.github/workflows/release.yml:7-8]() |
| `encorego_version` | Encore-Go version (e.g., "encore-go1.17.7") | [.github/workflows/release.yml:9-11]() |

### Cross-Platform Build Process

The `make-release.go` tool orchestrates the build process for all platforms using `DistBuilder` instances:

```mermaid
sequenceDiagram
    participant GitHubActions["GitHub Actions"]
    participant MakeRelease["make-release.go"]
    participant JSPackager["JSPackager"]
    participant DistBuilder["DistBuilder"]
    participant WindowsBuild["windows/build.bat"]
    
    GitHubActions->>MakeRelease: "Execute with version parameters"
    MakeRelease->>JSPackager: "Package JS runtime"
    JSPackager-->>MakeRelease: "JS package ready"
    
    loop "For each target platform"
        MakeRelease->>DistBuilder: "Build for OS/ARCH"
        alt "Windows build"
            DistBuilder->>WindowsBuild: "Execute build.bat"
            WindowsBuild-->>DistBuilder: "Windows artifacts"
        else "Unix build"
            DistBuilder->>DistBuilder: "Cross-compile with Go"
        end
        DistBuilder-->>MakeRelease: "Platform artifacts"
    end
    
    MakeRelease-->>GitHubActions: "All artifacts created"
```

The `DistBuilder` struct contains platform-specific configuration:

| Field | Purpose | File Reference |
|-------|---------|----------------|
| `OS`, `Arch` | Target platform | [pkg/make-release/make-release.go:68-74]() |
| `TSParserPath` | TypeScript parser location | [pkg/make-release/make-release.go:85]() |
| `DistBuildDir` | Build output directory | [pkg/make-release/make-release.go:86]() |
| `ArtifactsTarFile` | Final tar.gz location | [pkg/make-release/make-release.go:87]() |

### Version Management System

The version system uses the `Version` variable and `ReleaseChannel` enum to manage different release types:

```mermaid
graph TB
    subgraph "Version Types"
        GA["GA: v1.10.0"]
        Beta["Beta: v1.10.0-beta.1"]
        Nightly["Nightly: v1.10.0-nightly.20221231"] 
        DevBuild["DevBuild: v0.0.0-develop+commit"]
    end
    
    subgraph "Version Commands"
        VersionCmd["versionCmd"]
        VersionUpdateCmd["versionUpdateCmd"]
        UpdateCheck["update.Check()"]
        DoUpgrade["DoUpgrade()"]
    end
    
    VersionCmd --> UpdateCheck
    UpdateCheck --> GA
    UpdateCheck --> Beta
    UpdateCheck --> Nightly
    UpdateCheck --> DevBuild
    
    VersionUpdateCmd --> DoUpgrade
    DoUpgrade --> Homebrew["Homebrew upgrade"]
    DoUpgrade --> InstallScript["Install script execution"]
```

The `update.Check()` function queries the release API with platform-specific parameters:

| Query Parameter | Purpose | File Reference |
|----------------|---------|----------------|
| `channel` | Release channel filter | [cli/internal/update/update.go:45]() |
| `os`, `arch` | Platform specification | [cli/internal/update/update.go:46-47]() |
| `current` | Current version for comparison | [cli/internal/update/update.go:52]() |
| `actor` | User ID for pre-releases | [cli/internal/update/update.go:57]() |

Sources:
- [.github/workflows/release.yml:13-157]()
- [pkg/make-release/make-release.go:67-98]()
- [pkg/make-release/windows/build.bat:39-67]()
- [cli/cmd/encore/version.go:22-59]()
- [cli/internal/update/update.go:27-87]()
- [internal/version/version.go:16-31]()

## Command Reference and Code Mapping

The application lifecycle is managed through specific CLI commands that map to underlying Go functions and components:

| Command | Implementation Function | Primary Components | File Reference |
|---------|------------------------|-------------------|----------------|
| `encore app create [name]` | `createApp()` | `createAppCmd`, `validateName()`, `parseTemplate()` | [cli/cmd/encore/app/create.go:38-53]() |
| `encore app init [name]` | `initializeApp()` | `initAppCmd`, `MaybeAppRoot()` | [cli/cmd/encore/app/initialize.go:36-54]() |
| `encore run` | `daemon.Run()` | `Daemon`, `run.Manager`, `engine.NewServer()` | [cli/cmd/encore/daemon/daemon.go:252-263]() |
| `encore build docker [tag]` | `dockerBuild()` | `dockerBuildCmd`, `daemon.Export()` | [cli/cmd/encore/build.go:42-62]() |
| `encore version` | `versionCmd.Run()` | `update.Check()`, `version.Version` | [cli/cmd/encore/version.go:22-59]() |
| `encore version update` | `versionUpdateCmd.Run()` | `DoUpgrade()`, platform detection | [cli/cmd/encore/version.go:67-89]() |

### Daemon Service Architecture

The daemon coordinates all local development through its service architecture:

```mermaid
graph LR
    subgraph "Daemon Services"
        UnixSocket["encored.sock"]
        RuntimeHTTP["HTTP :9600"]
        DBProxyTCP["TCP :9500"]  
        DashHTTP["HTTP :9400"]
        DebugHTTP["HTTP :9700"]
        ObjectHTTP["HTTP :9800"]
        MCPHTTP["HTTP :9900"]
    end
    
    subgraph "Service Functions"
        serveDaemon["serveDaemon()"]
        serveRuntime["serveRuntime()"]
        serveDBProxy["serveDBProxy()"]
        serveDash["serveDash()"]
        serveDebug["serveDebug()"]
        serveObjects["serveObjects()"]
        serveMCP["serveMCP()"]
    end
    
    UnixSocket --> serveDaemon
    RuntimeHTTP --> serveRuntime
    DBProxyTCP --> serveDBProxy
    DashHTTP --> serveDash
    DebugHTTP --> serveDebug
    ObjectHTTP --> serveObjects
    MCPHTTP --> serveMCP
```

Each service runs concurrently and serves a specific purpose in the development environment:

| Service | Function | Purpose | Port |
|---------|----------|---------|------|
| Daemon | `serveDaemon()` | CLI communication via gRPC | Unix socket |
| Runtime | `serveRuntime()` | Application HTTP server | 9600 |
| DBProxy | `serveDBProxy()` | PostgreSQL proxy | 9500 |
| Dashboard | `serveDash()` | Developer web UI | 9400 |
| Debug | `serveDebug()` | pprof debugging endpoints | 9700 |
| Objects | `serveObjects()` | Object storage simulation | 9800 |
| MCP | `serveMCP()` | MCP protocol support | 9900 |

Sources:
- [cli/cmd/encore/daemon/daemon.go:186-194]()
- [cli/cmd/encore/daemon/daemon.go:252-297]()
- [cli/cmd/encore/daemon/daemon.go:127-134]()

## Conclusion

The application lifecycle in Encore provides a comprehensive set of tools and processes for creating, developing, and deploying applications. The seamless integration between these phases helps developers focus on building their applications without worrying about the underlying infrastructure.

---

# Page: Application Creation

# Application Creation

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [cli/cmd/encore/app/create.go](cli/cmd/encore/app/create.go)
- [cli/cmd/encore/app/create_form.go](cli/cmd/encore/app/create_form.go)
- [cli/cmd/encore/app/create_test.go](cli/cmd/encore/app/create_test.go)
- [cli/cmd/encore/app/initialize.go](cli/cmd/encore/app/initialize.go)
- [cli/cmd/encore/build.go](cli/cmd/encore/build.go)
- [cli/cmd/encore/daemon/daemon.go](cli/cmd/encore/daemon/daemon.go)
- [internal/env/env.go](internal/env/env.go)
- [internal/version/version.go](internal/version/version.go)
- [pkg/eerror/stack.go](pkg/eerror/stack.go)

</details>



This document covers the systems and processes involved in creating new Encore applications through the CLI. This includes the `encore app create` command for creating new applications from templates, the interactive template selection interface, project setup workflows, and platform integration. For information about the overall CLI architecture, see [CLI Interface](#4.1). For details about release and build processes, see [Release and Build Process](#6.2).

## Creation Workflow Overview

The application creation process in Encore follows a structured workflow that guides users through template selection, project initialization, and platform setup. The system supports both interactive and non-interactive modes, with optional integration to the Encore Cloud platform.

```mermaid
flowchart TD
    Start["encore app create"] --> CheckAuth["promptAccountCreation()"]
    CheckAuth --> SelectTemplate["selectTemplate()"]
    SelectTemplate --> ValidateName["validateName()"]
    ValidateName --> CreateDir["os.Mkdir()"]
    CreateDir --> ProcessTemplate["parseTemplate() + github.ExtractTree()"]
    ProcessTemplate --> PlatformApp["createAppOnServer()"]
    PlatformApp --> ConfigFiles["setEncoreAppID() + xos.WriteFile()"]
    ConfigFiles --> UpdateDeps["gogetEncore() / npmInstallEncore()"]
    UpdateDeps --> GitSetup["initGitRepo()"]
    GitSetup --> DaemonConn["cmdutil.ConnectDaemon()"]
    DaemonConn --> DaemonCreate["daemon.CreateApp(daemonpb.CreateAppRequest)"]
    DaemonCreate --> RunPrompt["promptRunApp()"]
    RunPrompt --> Complete["Application Ready"]
```

**Application Creation Flow with Code Entities**
Sources: [cli/cmd/encore/app/create.go:118-337]()

The main orchestration happens in the `createApp` function, which coordinates all aspects of project creation from template selection through final setup. The workflow integrates with the daemon service through gRPC calls using the `daemonpb.CreateAppRequest` protocol buffer.

## Interactive Template Selection

The template selection system provides an interactive terminal user interface for choosing application language and templates. The interface is built using the Bubble Tea framework and supports both local and remote template sources.

```mermaid
flowchart LR
    subgraph "Bubble Tea Models"
        CreateFormModel["createFormModel.step"] --> LangSelect["languageSelectModel.list"]
        LangSelect --> TemplateList["templateListModel.list"]
        TemplateList --> AppName["appNameModel.text"]
    end
    
    subgraph "Template Loading"
        LoadTemplates["loadTemplates()"] --> FetchRemote["fetchTemplates()"]
        FetchRemote --> GitHubAPI["GitHub raw content API"]
        GitHubAPI --> DefaultFallback["defaultTemplates[]"]
        DefaultFallback --> LoadedTemplates["loadedTemplates"]
    end
    
    subgraph "Template Items"
        GoLang["langItem{lang: languageGo}"]
        TSLang["langItem{lang: languageTS}"]
        HelloWorld["templateItem{Template: 'hello-world', Lang: 'go'}"]
        UptimeGo["templateItem{Template: 'uptime', Lang: 'go'}"]
        UptimeTS["templateItem{Template: 'ts/uptime', Lang: 'ts'}"]
        EmptyGo["templateItem{Template: '', Lang: 'go'}"]
        EmptyTS["templateItem{Template: 'ts/empty', Lang: 'ts'}"]
    end
    
    LoadedTemplates --> TemplateList
    GoLang --> LangSelect
    TSLang --> LangSelect
    HelloWorld --> TemplateList
    UptimeGo --> TemplateList
    UptimeTS --> TemplateList
    EmptyGo --> TemplateList
    EmptyTS --> TemplateList
```

**Template Selection with Code Entities**
Sources: [cli/cmd/encore/app/create_form.go:50-556](), [cli/cmd/encore/app/create_form.go:682-697](), [cli/cmd/encore/app/create_form.go:591-661]()

The system uses `tea.Model` interfaces for state management, with `loadTemplates()` fetching from `encoredev/examples` repository. Each `templateItem` contains `Template` path and `Lang` specification for language-specific filtering through `templateListModel.refreshFilter()`.

## Template Processing and Project Setup

Once a template is selected, the system processes it through several stages including download, file generation, dependency installation, and placeholder replacement.

```mermaid
sequenceDiagram
    participant CLI as "createApp()"
    participant GitHub as "github.ExtractTree()"
    participant Files as "File System"
    participant Platform as "platform.CreateApp()"
    participant Git as "Git Repository"
    
    CLI->>GitHub: parseTemplate() + ExtractTree()
    GitHub->>Files: Download template files
    CLI->>Platform: createAppOnServer()
    Platform-->>CLI: app.Slug
    CLI->>Files: setEncoreAppID() + encore.app
    CLI->>Files: gogetEncore() / npmInstallEncore()
    CLI->>Files: rewritePlaceholders()
    CLI->>Git: initGitRepo() + initial commit
    CLI->>Git: git remote add encore
```

**Template Processing Sequence**
Sources: [cli/cmd/encore/app/create.go:149-271](), [cli/cmd/encore/app/create.go:437-444](), [cli/cmd/encore/app/create.go:533-583]()

The template processing includes placeholder replacement for app-specific values like `{{ENCORE_APP_ID}}` and dependency updates to ensure the latest Encore framework versions are installed.

## Platform Integration and App Registration

The creation process optionally integrates with the Encore Cloud platform to register new applications and configure deployment settings. This integration is controlled by the `createAppOnPlatform` flag and user authentication status.

```mermaid
flowchart TD
    subgraph "Platform Integration"
        AuthCheck["conf.CurrentUser()"] --> CreateServer["createAppOnServer()"]
        CreateServer --> AppData["platform.App{Slug, MainBranch}"]
        AppData --> EncoreFile["setEncoreAppID()"]
        AppData --> GitRemote["git remote add encore"]
    end
    
    subgraph "Daemon Registration"
        DaemonConn["cmdutil.ConnectDaemon()"] --> CreateApp["daemon.CreateApp()"]
        CreateApp --> AppRequest["daemonpb.CreateAppRequest{AppRoot, Tutorial, Template}"]
        AppRequest --> AppsManager["apps.Manager.Create()"]
        AppsManager --> EncoreDB["EncoreDB *sql.DB"]
    end
    
    subgraph "Generated Files"
        EncoreApp["encore.app"] --> AppRoot["Project Directory"]
        GoMod["go.mod"] --> AppRoot
        GitIgnore[".gitignore"] --> AppRoot
        PackageJSON["package.json"] --> AppRoot
    end
    
    EncoreFile --> EncoreApp
    GitRemote --> AppRoot
    AppsManager --> AppRoot
```

**Platform Integration and Daemon Registration**
Sources: [cli/cmd/encore/app/create.go:204-236](), [cli/cmd/encore/app/create.go:424-436](), [cli/cmd/encore/app/create.go:273-286](), [cli/cmd/encore/daemon/daemon.go:137-138]()

The system creates applications both on the Encore platform (if authenticated) and registers them with the local daemon for development workflow management. The daemon uses an `apps.Manager` to persist application metadata in the `EncoreDB` SQLite database.

## Daemon Architecture for App Management

The Encore daemon provides a comprehensive application management system that coordinates multiple subsystems during app creation and ongoing development operations.

```mermaid
flowchart TD
    subgraph "Daemon Core"
        Server["daemon.Server"] --> AppsManager["Apps *apps.Manager"]
        Server --> RunMgr["RunMgr *run.Manager"]
        Server --> ClusterMgr["ClusterMgr *sqldb.ClusterManager"]
        Server --> SecretMgr["Secret *secret.Manager"]
        Server --> NS["NS *namespace.Manager"]
    end
    
    subgraph "Storage Layer"
        AppsManager --> EncoreDB["EncoreDB *sql.DB"]
        NS --> EncoreDB
        ClusterMgr --> SQLDBDriver["sqldb.Driver"]
    end
    
    subgraph "Runtime Services"
        RunMgr --> RuntimePort["Runtime.Port()"]
        RunMgr --> DBProxyPort["DBProxy.Port()"]
        RunMgr --> DashBaseURL["DashBaseURL"]
    end
    
    subgraph "App Creation Flow"
        CreateAppReq["daemonpb.CreateAppRequest"] --> Server
        Server --> AppsManager
        AppsManager --> DBStore["SQLite Storage"]
    end
```

**Daemon Subsystem Architecture**
Sources: [cli/cmd/encore/daemon/daemon.go:96-125](), [cli/cmd/encore/daemon/daemon.go:137-183]()

The daemon initializes multiple managers during startup: `apps.Manager` for application metadata, `run.Manager` for runtime orchestration, `sqldb.ClusterManager` for database management, and `namespace.Manager` for resource isolation. All application data is persisted in the `EncoreDB` SQLite database.

## File Generation and Project Structure

The creation process generates several essential files and establishes the proper project structure for Encore applications. The specific files generated depend on the target language and template selection.

| File | Purpose | Language |
|------|---------|----------|
| `encore.app` | Application metadata and ID | Both |
| `go.mod` | Go module definition | Go |
| `package.json` | Node.js dependencies | TypeScript |
| `.gitignore` | Git ignore patterns | Both |
| Template files | Application code | Both |

```mermaid
flowchart TD
    subgraph "File Generation"
        Template["Template Source"] --> Extract["github.ExtractTree()"]
        Extract --> Files["Project Files"]
        
        Config["exampleConfig"] --> AppPath["EncoreAppPath"]
        Config --> Secrets["InitialSecrets"]
        Config --> Tutorial["Tutorial flag"]
        
        AppID["app.Slug"] --> EncoreApp["encore.app generation"]
        EncoreApp --> SetID["setEncoreAppID()"]
        
        Lang["Language Detection"] --> GoDeps["gogetEncore()"]
        Lang --> TSDeps["npmInstallEncore()"]
    end
    
    subgraph "Validation"
        Name["App Name"] --> ValidateName["validateName()"]
        ValidateName --> Rules["lowercase, digits, dashes only"]
        ValidateName --> Length["max 50 chars"]
        ValidateName --> NoDups["no repeated dashes"]
    end
```

**File Generation and Validation**
Sources: [cli/cmd/encore/app/create.go:183-191](), [cli/cmd/encore/app/create.go:350-373](), [cli/cmd/encore/app/create.go:626-680](), [cli/cmd/encore/app/create.go:375-422]()

The validation system ensures app names follow strict conventions required for deployment and prevents common naming conflicts.

## Alternative Initialization Workflow

In addition to creating new applications, Encore supports initializing existing repositories as Encore applications through the `encore app init` command. This workflow is optimized for converting existing codebases.

```mermaid
flowchart LR
    subgraph "App Init Flow"
        ExistingRepo["Existing Repository"] --> CheckApp["MaybeAppRoot()"]
        CheckApp --> NoApp["ErrNoEncoreApp"]
        NoApp --> InitFlow["initializeApp()"]
        InitFlow --> CreateServer["createAppOnServer()"]
        CreateServer --> EncoreFile["Generate encore.app"]
        EncoreFile --> UpdateDeps["Update dependencies"]
    end
    
    subgraph "Template Selection"
        SelectName["name input"] --> SelectLang["language selection"]
        SelectLang --> SkipTemplate["skip template selection"]
    end
    
    SelectLang --> InitFlow
```

**App Initialization for Existing Repositories**
Sources: [cli/cmd/encore/app/initialize.go:56-132](), [cli/cmd/encore/app/initialize.go:19-28]()

The initialization process skips template selection but maintains the same platform integration and file generation patterns as full app creation.

## Template Configuration System

Templates can include optional configuration through `example-initial-setup.json` files that specify initial secrets, app structure, and tutorial flags. This configuration system enables complex templates with specific setup requirements.

```mermaid
graph TD
    subgraph "Template Config"
        ExampleJSON["example-initial-setup.json"] --> ParseConfig["parseExampleConfig()"]
        ParseConfig --> ConfigStruct["exampleConfig{EncoreAppPath, InitialSecrets, Tutorial}"]
        ConfigStruct --> ServerCreate["createAppOnServer()"]
        ConfigStruct --> DaemonCreate["daemon.CreateApp()"]
    end
    
    subgraph "Config Fields"
        EncoreAppPath["EncoreAppPath: './backend'"]
        InitialSecrets["InitialSecrets: {'DB_URL': 'postgres://...'}"]
        TutorialFlag["Tutorial: true"]
    end
    
    ConfigStruct --> EncoreAppPath
    ConfigStruct --> InitialSecrets
    ConfigStruct --> TutorialFlag
```

**Template Configuration Structure**
Sources: [cli/cmd/encore/app/create.go:585-624](), [cli/cmd/encore/app/create.go:196-202]()

The configuration system allows templates to specify where the Encore application should be located within the downloaded template structure and what initial platform configuration should be applied.

---

# Page: Release and Build Process

# Release and Build Process

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.github/dockerimg/Dockerfile](.github/dockerimg/Dockerfile)
- [.github/dockerimg/encore-entrypoint.bash](.github/dockerimg/encore-entrypoint.bash)
- [.github/workflows/release.yml](.github/workflows/release.yml)
- [.gitignore](.gitignore)
- [cli/cmd/encore/version.go](cli/cmd/encore/version.go)
- [cli/daemon/sqldb/remote.go](cli/daemon/sqldb/remote.go)
- [cli/internal/update/update.go](cli/internal/update/update.go)
- [pkg/dockerbuild/dockerbuild.go](pkg/dockerbuild/dockerbuild.go)
- [pkg/dockerbuild/dockerbuild_test.go](pkg/dockerbuild/dockerbuild_test.go)
- [pkg/dockerbuild/spec.go](pkg/dockerbuild/spec.go)
- [pkg/dockerbuild/spec_test.go](pkg/dockerbuild/spec_test.go)
- [pkg/dockerbuild/tarcopy.go](pkg/dockerbuild/tarcopy.go)
- [pkg/make-release/make-release.go](pkg/make-release/make-release.go)
- [pkg/make-release/windows/.gitignore](pkg/make-release/windows/.gitignore)
- [pkg/make-release/windows/build.bat](pkg/make-release/windows/build.bat)
- [pkg/make-release/windows/manifest.xml](pkg/make-release/windows/manifest.xml)
- [pkg/make-release/windows/resources.rc](pkg/make-release/windows/resources.rc)
- [pkg/pgproxy/pgproxy.go](pkg/pgproxy/pgproxy.go)
- [pkg/tarstream/LICENSE](pkg/tarstream/LICENSE)
- [pkg/tarstream/datavec.go](pkg/tarstream/datavec.go)
- [pkg/tarstream/datavec_test.go](pkg/tarstream/datavec_test.go)
- [pkg/tarstream/tarstream.go](pkg/tarstream/tarstream.go)
- [pkg/tarstream/tarstream_test.go](pkg/tarstream/tarstream_test.go)
- [pkg/xos/xos_unix.go](pkg/xos/xos_unix.go)
- [pkg/xos/xos_windows.go](pkg/xos/xos_windows.go)
- [v2/codegen/apigen/apigen.go](v2/codegen/apigen/apigen.go)

</details>



This document covers the automated build, release, and update systems for the Encore platform. It explains how Encore binaries are built for multiple platforms, packaged as Docker images, distributed through various channels, and automatically updated by end users.

The release system integrates with the broader Encore architecture by packaging the CLI tools, runtime components, and code generation systems into deployable artifacts. For application-level build processes, see [Metadata and Code Generation](#5.3). For runtime packaging, see [Application Execution](#2.3).

## Overview

The Encore release process centers around the `make-release.go` build orchestrator and GitHub Actions workflows that produce cross-platform binaries and Docker images. The system coordinates multiple build components including the `JSPackager` for JavaScript runtimes, `DistBuilder` instances for platform-specific builds, and the `dockerbuild` package for container image creation.

```mermaid
graph TB
    subgraph "Release Coordination"
        MakeRelease["make-release.go<br/>main()"]
        JSPackager["JSPackager<br/>Package()"]
        DistBuilder["DistBuilder<br/>Build()"]
    end
    
    subgraph "Docker Build System"
        BuildImage["dockerbuild.BuildImage()"]
        ImageSpec["dockerbuild.ImageSpec"]
        TarCopier["tarcopy.tarCopier"]
    end
    
    subgraph "Update System"
        UpdateCheck["update.Check()"]
        DoUpgrade["update.DoUpgrade()"]
        LatestVersion["update.LatestVersion"]
    end
    
    subgraph "GitHub Actions"
        ReleaseWorkflow[".github/workflows/release.yml"]
        MatrixStrategy["strategy.matrix"]
        PublishDocker["publish-docker-images"]
    end
    
    MakeRelease --> JSPackager
    MakeRelease --> DistBuilder
    DistBuilder --> BuildImage
    BuildImage --> ImageSpec
    ImageSpec --> TarCopier
    
    ReleaseWorkflow --> MakeRelease
    MatrixStrategy --> DistBuilder
    PublishDocker --> BuildImage
    
    UpdateCheck --> LatestVersion
    LatestVersion --> DoUpgrade
```

Sources: [.github/workflows/release.yml](), [pkg/make-release/make-release.go](), [pkg/dockerbuild/dockerbuild.go](), [cli/internal/update/update.go]()

## Release Workflow Architecture

```mermaid
graph TD
    Manual["Manual Trigger<br/>workflow_dispatch"] --> Matrix["Build Matrix"]
    Matrix --> Linux64["linux_x86-64<br/>ubuntu-24.04"]
    Matrix --> LinuxARM["linux_arm64<br/>ubuntu-24.04"] 
    Matrix --> MacOS64["macos_x86-64<br/>macos-11"]
    Matrix --> MacOSARM["macos_arm64<br/>macos-11"]
    Matrix --> Win64["windows_x86-64<br/>windows-latest"]
    
    Linux64 --> MakeRelease["make-release.go"]
    LinuxARM --> MakeRelease
    MacOS64 --> MakeRelease
    MacOSARM --> MakeRelease
    Win64 --> WinBuild["build.bat"]
    
    MakeRelease --> Artifacts["Tar Archives"]
    WinBuild --> Artifacts
    
    Artifacts --> Docker["Docker Images<br/>encoredotdev/encore"]
    Artifacts --> Webhook["Release Webhook"]
    
    Docker --> Registry["Docker Hub"]
    Webhook --> Platform["Encore Platform"]
```

The release process begins with a manual workflow dispatch that requires two inputs: the version to build and the Encore-Go version to use. The workflow uses a matrix strategy to build binaries for five platform combinations simultaneously.

Sources: [.github/workflows/release.yml:3-37]()

## Cross-Platform Build System

### Core Build Tools

```mermaid
graph LR
    subgraph "Build Dependencies"
        Go["Go Toolchain<br/>go.mod version"]
        Zig["Zig 0.10.1<br/>Cross-compilation"]
        EncoreGo["encore-go<br/>Custom Go Runtime"]
    end
    
    subgraph "Platform Builders"
        MakeRelease["make-release.go<br/>Unix Platforms"]
        WinBatch["build.bat<br/>Windows Platform"]
    end
    
    subgraph "Build Outputs"
        CLIBin["encore CLI<br/>Main Binary"]
        GitRemote["git-remote-encore<br/>Git Integration"]
        JSRuntime["JavaScript Runtime<br/>Packaged"]
        GoRuntime["Go Runtime Files<br/>Copied"]
    end
    
    Go --> MakeRelease
    Zig --> MakeRelease
    EncoreGo --> MakeRelease
    EncoreGo --> WinBatch
    
    MakeRelease --> CLIBin
    MakeRelease --> GitRemote
    MakeRelease --> JSRuntime
    WinBatch --> CLIBin
    
    CLIBin --> GoRuntime
    GitRemote --> GoRuntime
```

The build system uses several key components:
- **Go toolchain**: Set up from the repository's `go.mod` file
- **Zig compiler**: Used for cross-compilation capabilities
- **encore-go**: A custom Go runtime downloaded from GitHub releases
- **make-release.go**: The main build orchestrator for Unix platforms
- **build.bat**: Windows-specific build script with additional dependencies

Sources: [.github/workflows/release.yml:46-62](), [pkg/make-release/make-release.go:19-98]()

### JavaScript Runtime Packaging

The `JSPackager` coordinates JavaScript runtime compilation with platform-specific builds:

```mermaid
graph TD
    JSPackager["JSPackager<br/>struct"] --> WorkspaceRoot["WorkspaceRoot<br/>/runtimes/js"]
    JSPackager --> CompletedChan["compileCompleted<br/>chan struct{}"]
    JSPackager --> PackageFunc["Package()<br/>func() error"]
    
    PackageFunc --> CompilerPhase["JavaScript Runtime<br/>Compilation"]
    CompilerPhase --> CloseChannel["close(compileCompleted)"]
    
    CloseChannel --> DistBuilder1["DistBuilder{OS: darwin, Arch: amd64}"]
    CloseChannel --> DistBuilder2["DistBuilder{OS: linux, Arch: amd64}"]
    CloseChannel --> DistBuilder3["DistBuilder{OS: windows, Arch: amd64}"]
    
    subgraph "runParallel() Execution"
        ParallelFuncs["[]func() error"]
        JSPackage["jsBuilder.Package"]
        BuildFuncs["builder.Build methods"]
    end
    
    JSPackage --> ParallelFuncs
    BuildFuncs --> ParallelFuncs
    
    DistBuilder1 --> ArtifactsTar1["encore-v1.2.3-darwin_amd64.tar.gz"]
    DistBuilder2 --> ArtifactsTar2["encore-v1.2.3-linux_amd64.tar.gz"]
    DistBuilder3 --> ArtifactsTar3["encore-v1.2.3-windows_amd64.tar.gz"]
```

The synchronization ensures that `DistBuilder.Build()` methods wait for JavaScript compilation to complete via the `compileCompleted` channel before proceeding with platform-specific archive creation.

Sources: [pkg/make-release/make-release.go:60-96]()

### Windows Build Specifics

Windows builds use a separate batch script that handles additional complexity:

```mermaid
graph TD
    Env["Environment Variables<br/>ENCORE_VERSION<br/>ENCORE_GOROOT"] --> Deps["Download Dependencies"]
    
    Deps --> LLVM["llvm-mingw-msvcrt.zip<br/>Cross-compilation toolchain"]
    Deps --> Wintun["wintun.zip<br/>Windows networking"]
    Deps --> WIX["wix-binaries.zip<br/>Installer tools"]
    
    LLVM --> Resources["Windows Resources<br/>windres compilation"]
    Resources --> Build["Go Build<br/>-tags load_wintun_from_rsrc"]
    
    Build --> Encore["encore.exe"]
    Build --> GitRemote["git-remote-encore.exe"]
    
    Encore --> Copy["Copy Artifacts<br/>encore-go runtime"]
    GitRemote --> Copy
    Copy --> Output["dist/windows_amd64/"]
```

The Windows build process downloads and verifies specific dependencies, compiles Windows resources using `windres`, and builds binaries with special build tags for loading the Wintun networking library from embedded resources.

Sources: [pkg/make-release/windows/build.bat:28-74]()

## Docker Image Build System

The Docker build system uses the `dockerbuild` package to create optimized container images with Encore applications and runtimes:

### Core Build Functions

```mermaid
graph TB
    subgraph "dockerbuild.BuildImage() Process"
        BuildImage["BuildImage(ctx, spec, cfg)"]
        ResolveBase["resolveBaseImage()"]
        BuildFS["buildImageFilesystem()"]
        TarballLayer["tarball.LayerFromOpener()"]
        MutateAppend["mutate.Append()"]
    end
    
    subgraph "ImageSpec Configuration"
        ImageSpec["ImageSpec struct"]
        BundleSource["BundleSource option.Option"]
        CopyData["CopyData map[ImagePath]HostPath"]
        Supervisor["Supervisor option.Option"]
        WriteFiles["WriteFiles map[ImagePath][]byte"]
    end
    
    subgraph "Filesystem Assembly"
        TarCopier["tarCopier struct"]
        CopyDataFunc["tc.CopyData()"]
        SetupSupervisor["setupSupervisor()"]
        WriteBuildInfo["writeBuildInfo()"]
        AddCACerts["addCACerts()"]
    end
    
    BuildImage --> ResolveBase
    BuildImage --> BuildFS
    BuildFS --> TarCopier
    TarCopier --> CopyDataFunc
    TarCopier --> SetupSupervisor
    TarCopier --> WriteBuildInfo
    TarCopier --> AddCACerts
    
    ImageSpec --> BundleSource
    ImageSpec --> CopyData
    ImageSpec --> Supervisor
    ImageSpec --> WriteFiles
    
    BuildFS --> TarballLayer
    TarballLayer --> MutateAppend
```

The `BuildImage` function coordinates filesystem assembly through `tarCopier` and layer creation using `tarball.LayerFromOpener` with eStargz compression for optimized streaming.

Sources: [pkg/dockerbuild/dockerbuild.go:53-125](), [pkg/dockerbuild/spec.go:31-82](), [pkg/dockerbuild/tarcopy.go:26-195]()

### Image Specification and Assembly

```mermaid
graph TD
    subgraph "Describe() Function Flow"
        DescribeConfig["DescribeConfig struct"]
        ImageSpecBuilder["imageSpecBuilder"]
        AllocArtifactDir["allocArtifactDir()"]
        UseSupervisor["useSupervisor decision"]
        SupervisorConfig["supervisor.Config creation"]
    end
    
    subgraph "File System Operations"
        TarCopyier["tarCopier.CopyDir()"]
        ShouldInclude["shouldInclude() filtering"]
        RewriteSymlink["rewriteSymlink() processing"]
        MkdirAll["tc.MkdirAll()"]
        WriteFile["tc.WriteFile()"]
    end
    
    subgraph "Output Generation"
        TarOpener["tc.Opener() tarball.Opener"]
        TarVec["tarstream.TarVec"]
        DataVecs["[]tarstream.Datavec"]
    end
    
    DescribeConfig --> ImageSpecBuilder
    ImageSpecBuilder --> AllocArtifactDir
    ImageSpecBuilder --> UseSupervisor
    UseSupervisor --> SupervisorConfig
    
    AllocArtifactDir --> TarCopyier
    TarCopyier --> ShouldInclude
    TarCopyier --> RewriteSymlink
    TarCopyier --> MkdirAll
    TarCopyier --> WriteFile
    
    WriteFile --> TarOpener
    TarOpener --> TarVec
    TarVec --> DataVecs
```

The `Describe` function in `imageSpecBuilder` transforms compile results into `ImageSpec` configurations that specify exactly what files, binaries, and runtime components to include in the container image.

Sources: [pkg/dockerbuild/spec.go:210-434](), [pkg/dockerbuild/tarcopy.go:124-191](), [pkg/tarstream/tarstream.go:13-402]()

### Docker Publishing Pipeline

```mermaid
graph LR
    subgraph "GitHub Actions Workflow"
        BuildArtifacts["build job outputs"]
        DownloadArtifacts["actions/download-artifact@v3"]
        DockerBuildx["docker/setup-buildx-action@v1"]
        DockerLogin["docker/login-action@v2"]
        BuildPush["docker/build-push-action@v4"]
    end
    
    subgraph "Multi-platform Build"
        PlatformMatrix["linux/amd64,linux/arm64"]
        ContextPath[".github/dockerimg"]
        Dockerfile["Dockerfile"]
        RenameScript["rename-binary-if-needed.bash"]
    end
    
    subgraph "Image Metadata"
        ExtractMeta["docker/metadata-action@v4"]
        SemverTags["semver pattern tags"]
        OCILabels["OCI standard labels"]
        RegistryPush["encoredotdev/encore"]
    end
    
    BuildArtifacts --> DownloadArtifacts
    DownloadArtifacts --> DockerBuildx
    DockerBuildx --> DockerLogin
    DockerLogin --> BuildPush
    
    BuildPush --> PlatformMatrix
    BuildPush --> ContextPath
    ContextPath --> Dockerfile
    ContextPath --> RenameScript
    
    BuildPush --> ExtractMeta
    ExtractMeta --> SemverTags
    ExtractMeta --> OCILabels
    SemverTags --> RegistryPush
    OCILabels --> RegistryPush
```

The Docker publishing process uses GitHub Actions cache optimization and builds for multiple platforms simultaneously using Docker Buildx.

Sources: [.github/workflows/release.yml:83-144](), [.github/dockerimg/Dockerfile](), [.github/dockerimg/rename-binary-if-needed.bash]()

## Update Mechanism

### Update Check Process

The `update.Check()` function implements version checking and security update detection:

```mermaid
graph TD
    subgraph "update.Check() Implementation"
        CheckFunc["Check(ctx context.Context)"]
        ParseURL["url.Parse(encore.dev/api/releases)"]
        BuildQuery["releaseAPI.Query()"]
        HTTPRequest["http.NewRequestWithContext()"]
        JSONDecode["json.NewDecoder().Decode()"]
    end
    
    subgraph "Query Parameter Assembly"
        ChannelParam["qry.Set(channel, version.Channel)"]
        OSParam["qry.Set(os, runtime.GOOS)"]
        ArchParam["qry.Set(arch, runtime.GOARCH)"]
        CurrentParam["qry.Set(current, version.Version)"]
        ActorParam["qry.Set(actor, cfg.Actor)"]
    end
    
    subgraph "LatestVersion Response"
        LatestVersionStruct["LatestVersion struct"]
        ChannelField["Channel version.ReleaseChannel"]
        SupportedField["Supported bool"]
        RawVersionField["RawVersion string"]
        SecurityUpdateField["SecurityUpdate bool"]
        ForceUpgradeField["ForceUpgrade bool"]
        URLField["URL string"]
    end
    
    subgraph "Version Comparison"
        IsNewerMethod["lv.IsNewer(current string)"]
        SemverCompare["semver.Compare() for GA"]
        NightlyCompare["nightlyToNumber() for Nightly"]
    end
    
    CheckFunc --> ParseURL
    ParseURL --> BuildQuery
    BuildQuery --> ChannelParam
    BuildQuery --> OSParam
    BuildQuery --> ArchParam
    BuildQuery --> CurrentParam
    BuildQuery --> ActorParam
    
    HTTPRequest --> JSONDecode
    JSONDecode --> LatestVersionStruct
    
    LatestVersionStruct --> ChannelField
    LatestVersionStruct --> SupportedField
    LatestVersionStruct --> RawVersionField
    LatestVersionStruct --> SecurityUpdateField
    LatestVersionStruct --> ForceUpgradeField
    LatestVersionStruct --> URLField
    
    LatestVersionStruct --> IsNewerMethod
    IsNewerMethod --> SemverCompare
    IsNewerMethod --> NightlyCompare
```

The `Check` function constructs API queries with environment context and decodes responses into `LatestVersion` structs that contain security and upgrade metadata.

Sources: [cli/internal/update/update.go:29-86](), [cli/internal/update/update.go:89-143]()

### Automatic Update Process

The `DoUpgrade` method implements platform-specific update mechanisms:

```mermaid
graph TD
    subgraph "DoUpgrade() Method Flow"
        DoUpgradeFunc["lv.DoUpgrade(stdout, stderr io.Writer)"]
        ShellDetection["os.LookupEnv(SHELL)"]
        PlatformSwitch["runtime.GOOS switch"]
        BrewDetection["wasInstalledViaHomebrew()"]
        ExecCommand["exec.Command(shell, arg, script)"]
    end
    
    subgraph "Platform-Specific Scripts"
        WindowsScript["iwr https://encore.dev/install.ps1 -useb | iex"]
        UnixScript["curl -L https://encore.dev/install.sh | sh"]
        HomebrewGA["brew upgrade encore --fetch-head"]
        HomebrewNightly["brew upgrade encore-nightly --fetch-head"]
        HomebrewBeta["brew upgrade encore-beta --fetch-head"]
    end
    
    subgraph "Channel Restrictions"
        GAChannel["version.GA: All methods"]
        BetaChannel["version.Beta: Homebrew only"]
        NightlyChannel["version.Nightly: Homebrew only"]
        DevBuildChannel["version.DevBuild: Not updatable"]
    end
    
    subgraph "Homebrew Management"
        BrewLookPath["exec.LookPath(brew)"]
        BrewListCmd["brew list formulaName -1"]
        UpdateBrewTap["updateBrewTap()"]
        GitPullRebase["git pull --rebase origin main"]
    end
    
    DoUpgradeFunc --> ShellDetection
    ShellDetection --> PlatformSwitch
    PlatformSwitch --> BrewDetection
    
    BrewDetection --> HomebrewGA
    BrewDetection --> HomebrewNightly
    BrewDetection --> HomebrewBeta
    PlatformSwitch --> WindowsScript
    PlatformSwitch --> UnixScript
    
    GAChannel --> HomebrewGA
    GAChannel --> UnixScript
    BetaChannel --> HomebrewBeta
    NightlyChannel --> HomebrewNightly
    
    BrewDetection --> BrewLookPath
    BrewLookPath --> BrewListCmd
    HomebrewGA --> UpdateBrewTap
    UpdateBrewTap --> GitPullRebase
    
    ExecCommand --> WindowsScript
    ExecCommand --> UnixScript
    ExecCommand --> HomebrewGA
```

The `wasInstalledViaHomebrew` function detects installation method by executing `brew list` commands, while `updateBrewTap` manages git repository updates for Homebrew formula synchronization.

Sources: [cli/internal/update/update.go:149-214](), [cli/internal/update/update.go:232-254](), [cli/internal/update/update.go:256-287]()

## Release Channels and Versioning

The Encore platform supports multiple release channels with different update behaviors:

| Channel | Description | Update Method | Version Format |
|---------|-------------|---------------|----------------|
| `GA` | General Availability | Automatic via install scripts or Homebrew | `v1.2.3` (semver) |
| `Beta` | Beta releases | Homebrew only (`encore-beta`) | `v1.2.3-beta.1` |
| `Nightly` | Daily builds | Homebrew only (`encore-nightly`) | `nightly-20221010` |
| `DevBuild` | Development builds | Not updatable | `devel-...` |

The version comparison logic handles both semantic versioning for GA releases and date-based numbering for nightly builds.

Sources: [cli/internal/update/update.go:117-144](), [cli/internal/update/update.go:217-230]()

## Build Artifacts and Distribution

### Artifact Structure

Each platform build produces a standardized artifact structure:

```
encore-v1.2.3-{platform}_{arch}.tar.gz
├── bin/
│   ├── encore                    # Main CLI binary
│   └── git-remote-encore        # Git integration
├── encore-go/                   # Custom Go runtime
│   ├── bin/go
│   └── ...
└── runtimes/
    └── go/                      # Go runtime files
        └── ...
```

The artifacts include both the CLI tools and the complete runtime environment needed for local development.

Sources: [pkg/make-release/windows/build.bat:70-74](), [.github/workflows/release.yml:76-81]()

### Release Notification

Upon successful completion, the release workflow sends a webhook notification to the Encore platform:

```json
{
  "version": "${{ github.event.inputs.version }}", 
  "run_id": "${{ github.run_id }}"
}
```

This enables the platform to track successful releases and coordinate with the update API endpoints.

Sources: [.github/workflows/release.yml:151-156]()
#  Implementation Plan — Agentic Invoice Generator                                                                                                                               
                                                                                                                                                                                
  Problem Statement:                                                                                                                                                            
                                                                                                                                                                                
  A Next.js web app where authenticated users upload 4 Excel reference files per task, and a LangGraph.js agent parses free-text repair job descriptions, matches spare parts   
  from a catalog, and generates per-client invoice Excel files — with an iterative natural-language correction loop before archiving completed tasks.                           
                                                                                                                                                                                
   ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────               
                                                                                                                                                                                
  Requirements:                                                                                                                                                                 
                                                                                                                                                                                
  - Basic auth (credentials-based, POC level) to block unauthenticated access                                                                                                   
  - Upload 4 Excel input files per task + optional global/per-row instructions                                                                                                  
  - LangGraph.js agent: parse jobs → match parts → check device compatibility → generate output                                                                                 
  - Uncertain matches flagged with comments; incompatible parts get soft warnings in total sheet                                                                                
  - Output: ZIP with total_YYYY_MM_DD.xlsx (single sheet, grouped by client) + per-client invoice files                                                                         
  - Per-client templates have hardcoded headers; agent fills date, line items table, total row                                                                                  
  - Iterative corrections: re-upload file OR natural language (agent applies to current state)                                                                                  
  - Task lifecycle: uploaded → queued → processing → review → completed (archived)                                                                                              
  - Stack: Next.js App Router + TypeORM + Postgres + Docker on EC2; LangGraph.js orchestration                                                                                  
  - LLM: LiteLLM proxy (OpenAI-compatible) in dev → Bedrock Nova Lite 2 in prod via env config                                                                                  
  - UI: shadcn/ui + Tailwind CSS v4 + TanStack Table v8; desktop (FHD) only                                                                                                     
  - State: TanStack Query v5 for server state, useState for local UI state                                                                                                      
  - API: REST route handlers for uploads/polling/downloads; Server Actions for simple mutations                                                                                 
  - No NestJS — plain TypeScript service classes with manual DI via container.ts singleton registry                                                                             
  - OOP style, TypeScript throughout                                                                                                                                            
                                                                                                                                                                                
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────               
                                                                                                                                                                                
  Background:                                                                                                                                                                   
                                                                                                                                                                                
  - LangGraph.js (@langchain/langgraph) — StateGraph with typed state schema; each processing step is a typed node class                                                        
  - LLM adapter: ChatOpenAI from @langchain/openai with configurable baseURL+apiKey — LiteLLM proxy in dev, Bedrock OpenAI-compatible endpoint in prod; zero code change between
  environments                                                                                                                                                                  
  - TypeORM global DataSource singleton cached on global for HMR safety; entities imported explicitly                                                                           
  - next-auth v5 credentials provider: bcrypt-hashed password in DB, JWT session cookie                                                                                         
  - ExcelJS for all xlsx read/write; template filling by scanning for structural markers                                                                                        
  - Background worker: standalone Node.js process polling Postgres with SELECT FOR UPDATE SKIP LOCKED; runs alongside Next.js via concurrently                                  
  - Manual DI: lib/container.ts instantiates all service singletons at startup (TaskService, AuthService, LLMAdapterFactory, etc.) and exports them — no framework needed       
  - shadcn/ui DataTable pattern uses TanStack Table v8 — handles grouping/sorting for results view                                                                              
                                                                                                                                                                                
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────               
                                                                                                                                                                                
  Proposed Solution:                                                                                                                                                            
                                                                                                                                                                                
  flowchart TD                                                                                                                                                                  
      A[User logs in] --> B[Create task, upload 4 xlsx + instructions]                                                                                                          
      B --> C[Task saved to DB, files to EBS]                                                                                                                                   
      C --> D[Click Process → status = queued]                                                                                                                                  
      D --> E[Worker polls DB, picks up task]                                                                                                                                   
      E --> F[LangGraph: ParseNode]                                                                                                                                             
      F --> G[LangGraph: MatchPartsNode - per job]                                                                                                                              
      G --> H[LangGraph: ValidateCompatibilityNode]                                                                                                                             
      H --> I[LangGraph: GenerateOutputNode]                                                                                                                                    
      I --> J[ZIP created on EBS, status = review]                                                                                                                              
      J --> K{User reviews}                                                                                                                                                     
      K -- Download ZIP --> L[User checks in Excel]                                                                                                                             
      K -- Natural language correction --> M[LangGraph: CorrectionNode]                                                                                                         
      M --> I                                                                                                                                                                   
      K -- Re-upload file --> F                                                                                                                                                 
      K -- Complete --> N[status = completed, archived]                                                                                                                         
      N --> O[Manual delete only]                                                                                                                                               
                                                                                                                                                                                
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────               
                                                                                                                                                                                
  Task Breakdown:                                                                                                                                                               
                                                                                                                                                                                
  Task 1: Project scaffold, Docker setup, DB schema & DI container                                                                                                              
                                                                                                                                                                                
  - Objective: Runnable Next.js + Postgres environment with TypeORM entities, migrations, and service container                                                                 
  - Implementation: create-next-app --typescript, add typeorm, pg, reflect-metadata, tailwindcss, shadcn/ui init. Entities: User, Task, TaskFile (role enum:                    
  jobs/clients/parts/devices), TaskResult, CorrectionLog. DataSource singleton in lib/db/dataSource.ts cached on global. lib/container.ts instantiates and exports all service  
  singletons. Docker Compose: app + postgres, EBS volume at /data. TypeORM CLI migration script                                                                                 
  - Demo: docker compose up → app starts, DB migrates, /api/health returns 200 with DB ping                                                                                     
                                                                                                                                                                                
  Task 2: Authentication                                                                                                                                                        
                                                                                                                                                                                
  - Objective: Only authenticated users can access the app                                                                                                                      
  - Implementation: next-auth v5 credentials provider. AuthService class in container: verifyCredentials(username, password) with bcrypt. Middleware protects all routes except 
  /login. Seed script creates default admin from env vars (ADMIN_USER, ADMIN_PASSWORD). Login page with shadcn Card + Form                                                      
  - Demo: Unauthenticated / redirects to /login; valid credentials grant access; invalid shows error                                                                            
                                                                                                                                                                                
  Task 3: Task management UI & API                                                                                                                                              
                                                                                                                                                                                
  - Objective: User can create tasks, upload 4 xlsx files with instructions, and see task list                                                                                  
  - Implementation: TaskService class (TypeORM repository, registered in container). REST: POST /api/tasks, POST /api/tasks/[id]/files (multipart, saves to                     
  /data/tasks/<id>/input/). Server Actions: saveInstructions(taskId, instructions). Home page: shadcn Table with status Badge. Task detail page: 4 labeled file inputs +        
  instructions textarea                                                                                                                                                         
  - Demo: Create task → upload 4 files → task appears in list with status uploaded                                                                                              
                                                                                                                                                                                
  Task 4: Excel parsing layer (OOP)                                                                                                                                             
                                                                                                                                                                                
  - Objective: Parse all 4 input xlsx files into typed domain objects                                                                                                           
  - Implementation: Abstract ExcelParser<T> base class, concrete: JobsParser, ClientsParser, PartsParser, DevicePartsParser — each implements parse(filePath: string):          
  Promise<T[]> via ExcelJS. Typed interfaces: JobRow, ClientRow, PartRow, DevicePartRow. Unit tests with fixture xlsx files covering normal + edge cases                        
  - Demo: Unit tests pass; parsers return correctly typed arrays from fixture files                                                                                             
                                                                                                                                                                                
  Task 5: LLM adapter                                                                                                                                                           
                                                                                                                                                                                
  - Objective: Single LLM interface, zero code change between dev (LiteLLM) and prod (Bedrock)                                                                                  
  - Implementation: Abstract LLMAdapter class, concrete OpenAICompatibleAdapter wraps ChatOpenAI with baseURL+apiKey+model from env (LLM_BASE_URL, LLM_API_KEY, LLM_MODEL).     
  LLMAdapterFactory.create() registered in container. Unit test with mocked HTTP                                                                                                
  - Demo: Factory returns correct adapter per env; mock test confirms prompt/response round-trip                                                                                
                                                                                                                                                                                
  Task 6: LangGraph agent — core invoice pipeline                                                                                                                               
                                                                                                                                                                                
  - Objective: StateGraph processing a task end-to-end: parse → match → validate → generate                                                                                     
  - Implementation: InvoiceAgentState typed schema. Node classes: ParseNode, MatchPartsNode (LLM call per job → {partId, confidence, note?}[], flags low-confidence),           
  ValidateCompatibilityNode (cross-checks device-parts map, adds compatibilityWarning), GenerateOutputNode (delegates to Task 7 classes). Linear edges with conditional re-entry
  via CorrectionNode (Task 10). InvoiceAgent class wraps the compiled graph, registered in container. Integration test with fixture files + mocked LLM                          
  - Demo: Running the graph on fixture inputs produces a valid ZIP with correct total sheet and per-client files                                                                
                                                                                                                                                                                
  Task 7: Excel output generation (OOP)                                                                                                                                         
                                                                                                                                                                                
  - Objective: Generate total_YYYY_MM_DD.xlsx and fill per-client invoice templates                                                                                             
  - Implementation: TotalSheetBuilder: single sheet grouped by client, subtotals, Excel cell comments for flags/warnings. ClientTemplateWriter: opens template, locates date    
  cell + line items table + total row by structural scanning, writes data. OutputZipper: assembles final ZIP. All registered in container. Unit tests with fixture templates    
  - Demo: Unit tests confirm correct cell values; warnings appear as Excel cell comments                                                                                        
                                                                                                                                                                                
  Task 8: Background worker wiring                                                                                                                                              
                                                                                                                                                                                
  - Objective: Worker process picks up queued tasks and runs the LangGraph agent                                                                                                
  - Implementation: WorkerService class in worker/index.ts — uses container to get InvoiceAgent + TaskService; polls tasks WHERE status='queued' every 5s with SELECT FOR UPDATE
  SKIP LOCKED; updates status processing → review or failed with error stored. Run via concurrently in npm scripts. REST: POST /api/tasks/[id]/process sets status to queued    
  - Demo: Upload files → click "Process" → status cycles to review within ~30s                                                                                                  
                                                                                                                                                                                
  Task 9: Review UI — results display, download & corrections                                                                                                                   
                                                                                                                                                                                
  - Objective: User reviews results, downloads ZIP, submits corrections                                                                                                         
  - Implementation: Task detail page (status=review): TanStack Table grouped by client, flagged rows highlighted (yellow = uncertain, orange = compatibility warning). REST: GET
  /api/tasks/[id]/download streams ZIP. Correction panel: shadcn Textarea + button → POST /api/tasks/[id]/corrections → saves to CorrectionLog, re-queues task. Re-upload panel 
  replaces input file + re-queues. TanStack Query polls GET /api/tasks/[id] every 3s while processing                                                                           
  - Demo: Result table shows flags; correction re-triggers processing; status updates live in UI                                                                                
                                                                                                                                                                                
  Task 10: Correction node in LangGraph                                                                                                                                         
                                                                                                                                                                                
  - Objective: Apply natural language corrections to task state before re-generating output                                                                                     
  - Implementation: CorrectionNode activated when state.pendingCorrection is set — sends result JSON + correction message to LLM → returns updated result JSON. Supported:      
  remove job, add/remove/move part, edit quantity. Graph continues to GenerateOutputNode after applying. Unit tests with mocked LLM per correction type                         
  - Demo: "Move toner cartridge from job 2 to job 4" → result JSON updated → new ZIP generated                                                                                  
                                                                                                                                                                                
  Task 11: Task lifecycle completion & archive                                                                                                                                  
                                                                                                                                                                                
  - Objective: Completed tasks archived, browsable, manually deletable                                                                                                          
  - Implementation: Server Action completeTask(taskId) sets status completed. Home page: two shadcn Tabs — "Active" and "Archive". Completed tasks: read-only, show date/client 
  count/download link. Server Action deleteTask(taskId): removes DB record + EBS files                                                                                          
  - Demo: Complete task → moves to Archive tab; ZIP downloadable; delete removes from list and disk                                                                             
                                                                                                                                                                                
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────               
          


# User Stories — Agentic Invoice Generator                                                                                                                                      
                                                                                                                                                                                
  Authentication                                                                                                                                                                
                                                                                                                                                                                
  - As a user, I want to log in with a username and password so that only authorized staff can access the system.                                                               
  - As a user, I want to be automatically redirected to the login page if my session expires so that the system stays secure.                                                   
                                                                                                                                                                                
  Task Management                                                                                                                                                               
                                                                                                                                                                                
  - As a user, I want to create a new invoice task so that I can process a batch of completed repair jobs.                                                                      
  - As a user, I want to upload the list of completed works, the client list, the spare parts catalog, and the device catalog as Excel files so that the system has all the data
  it needs.                                                                                                                                                                     
  - As a user, I want to add general instructions for the whole task so that I can guide the agent on special cases for this batch.                                             
  - As a user, I want to see all my active tasks in a list with their current status so that I know what is in progress.                                                        
                                                                                                                                                                                
  Processing                                                                                                                                                                    
                                                                                                                                                                                
  - As a user, I want to trigger processing of an uploaded task with one click so that the agent starts generating invoices.                                                    
  - As a user, I want to see the task status update automatically (uploaded → processing → ready for review) so that I don't have to manually refresh.                          
  - As a user, I want the system to automatically parse the free-text repair descriptions and match the correct spare parts and tasks from the catalog so that I don't have to  
  do this manually for each job.                                                                                                                                                
  - As a user, I want uncertain part matches to be flagged with a comment in the output so that I can quickly spot and review anything the agent wasn't sure about.             
  - As a user, I want parts that don't match the repaired device to be flagged with a warning so that I can catch catalog errors before sending invoices.                       
                                                                                                                                                                                
  Review & Corrections                                                                                                                                                          
                                                                                                                                                                                
  - As a user, I want to download a ZIP archive containing the total summary sheet and individual client invoice files so that I can review them in Excel.                      
  - As a user, I want to see the processing results in the app as a table grouped by client so that I can review them without downloading.                                      
  - As a user, I want flagged and warned items to be visually highlighted in the results table so that I can find issues at a glance.                                           
  - As a user, I want to type a natural language correction (e.g. "remove job 5", "move the toner cartridge to job 3") so that I can fix mistakes without re-uploading files.   
  - As a user, I want to re-upload a corrected input file so that I can fix bulk data errors and re-run the agent.                                                              
  - As a user, I want the system to regenerate the output automatically after I apply a correction so that I always have an up-to-date ZIP ready.                               
                                                                                                                                                                                
  Completion & Archive                                                                                                                                                          
                                                                                                                                                                                
  - As a user, I want to mark a task as completed when I'm satisfied with the results so that it moves to the archive.                                                          
  - As a user, I want to browse completed tasks in an archive so that I can re-download past invoice batches if needed.                                                         
  - As a user, I want to delete a completed task when I no longer need it so that I can free up storage.                                                                        
                                                                                                                                                                                
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────               
                                                                                                                                                                                
  That's 20 stories covering the full scope. They're intentionally kept at the "what and why" level without technical detail — suitable for showing to end users for approval.  
  Want me to add acceptance criteria to any of them, or adjust the language for a specific audience?                                                                            
         

# Implementation Task Tracker                                                                                                                                                   
                                                                                                                                                                                
  ┌─────┬───────────────────────────────────────────────────┬──────────┬───────────────────────────────────────────────────────────────────────────────┐                        
  │ #   │ Task                                              │ Estimate │ Notes                                                                         │                        
  ├─────┼───────────────────────────────────────────────────┼──────────┼───────────────────────────────────────────────────────────────────────────────┤                        
  │ 1   │ Project scaffold, Docker, DB schema, DI container │ 3h       │ Next.js init, TypeORM entities, migrations, Docker Compose, `/api/health`     
Spent: 2h
│                        
  │ 2   │ Authentication                                    │ 2h       │ next-auth v5, login page, middleware, seed script                             │                        
  │ 3   │ Task management UI & API                          │ 4h       │ Create task, file upload (4 files), instructions, task list page              │                        
  │ 4   │ Excel parsing layer                               │ 3h       │ 4 parser classes, typed interfaces, fixture files, unit tests                 │                        
  │ 5   │ LLM adapter                                       │ 2h       │ Abstract class, OpenAI-compatible impl, factory, env config, mock test        │                        
  │ 6   │ LangGraph agent — core pipeline                   │ 6h       │ StateGraph, 4 node classes, edges, integration test — most complex task       │                        
  │ 7   │ Excel output generation                           │ 4h       │ TotalSheetBuilder, ClientTemplateWriter, OutputZipper, unit tests             │                        
  │ 8   │ Background worker wiring                          │ 3h       │ WorkerService, polling loop, status transitions, concurrently setup           │                        
  │ 9   │ Review UI                                         │ 4h       │ Results table, flags highlighting, download, correction panel, status polling │                        
  │ 10  │ Correction node in LangGraph                      │ 3h       │ CorrectionNode, LLM prompt, result JSON update, unit tests                    │                        
  │ 11  │ Task lifecycle & archive                          │ 2h       │ Complete/archive/delete, Archive tab, read-only view                          │                        
  └─────┴───────────────────────────────────────────────────┴──────────┴───────────────────────────────────────────────────────────────────────────────┘                        
                                                                                                                                                                                
  Total estimate: ~36 hours                                                                                                                                                     
                                                                                                                                                                                
  ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
                                                                                                                                                                                
  Rough phasing if you work in sprints:                                                                                                                                         
                                                                                                                                                                                
  - Sprint 1 (foundation) — Tasks 1–3 → ~9h → working app shell with auth and file upload                                                                                       
  - Sprint 2 (core engine) — Tasks 4–7 → ~15h → full agent pipeline producing correct output                                                                                    
  - Sprint 3 (UX + polish) — Tasks 8–11 → ~12h → end-to-end usable product                                                                                                      
                                                                                                                                                                                
  ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
                                                                                                                                                                                
  A few caveats on the estimates:                                                                                                                                               
                                                                                                                                                                                
  - Task 6 (LangGraph) is the biggest unknown — prompt engineering for part matching may need iteration                                                                         
  - Task 7 depends on how varied the real client templates turn out to be — structural scanning can get tricky                                                                  
  - These assume familiarity with the stack; LangGraph.js being new to you may add time to Tasks 6 and 10                                                                       
                                                                                                                                                                                
  Want me to proceed and hand this off to the execution agent to start with Task 1?                      

## Infrastructure

- AWS CDK IaC scripts live in `infra/`
- Provisions: EC2 (Amazon Linux) + EBS 4GB (mounted `/mnt/ebs`) + IAM role (`bedrock:InvokeModel`) + Security Group
- Docker bind mounts in `docker-compose.yml` map to EBS paths (`/mnt/ebs/invoice_data`, `/mnt/ebs/postgres_data`)
- See `infra/README.md` for full TODO list

#  Implementation Plan — Agentic Invoice Generator                                                                                                                               
                                                                                                                                                                                
  Problem Statement:                                                                                                                                                            
                                                                                                                                                                                
  A Next.js web app where authenticated users upload 4 CSV reference files per task, and a LangGraph.js agent parses free-text repair job descriptions, matches spare parts   
  from a catalog, and generates per-client invoice CSV files — with an iterative natural-language correction loop before archiving completed tasks.                           
                                                                                                                                                                                
   ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────               
                                                                                                                                                                                
  Requirements:                                                                                                                                                                 
                                                                                                                                                                                
  - Basic auth (credentials-based, POC level) to block unauthenticated access                                                                                                   
  - Upload 4 CSV input files per task + optional global/per-row instructions                                                                                                  
  - LangGraph.js agent: parse jobs → match parts → check device compatibility → generate output                                                                                 
  - Uncertain matches flagged with comments; incompatible parts get soft warnings in total sheet                                                                                
  - Output: ZIP with total_YYYY_MM_DD.csv (single sheet, grouped by client) + per-client invoice CSV files                                                                         
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
  - CSV parsing/writing; template filling by scanning for structural markers                                                                                        
  - Background worker: standalone Node.js process polling Postgres with SELECT FOR UPDATE SKIP LOCKED; runs alongside Next.js via concurrently                                  
  - Manual DI: lib/container.ts instantiates all service singletons at startup (TaskService, AuthService, LLMAdapterFactory, etc.) and exports them — no framework needed       
  - shadcn/ui DataTable pattern uses TanStack Table v8 — handles grouping/sorting for results view                                                                              
                                                                                                                                                                                
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────               
                                                                                                                                                                                
  Proposed Solution:                                                                                                                                                            
                                                                                                                                                                                
  flowchart TD                                                                                                                                                                  
      A[User logs in] --> B[Create task, upload 4 CSV files + instructions]                                                                                                          
      B --> C[Task saved to DB, files to EBS]                                                                                                                                   
      C --> D[Click Process → status = queued]                                                                                                                                  
      D --> E[Worker polls DB, picks up task]                                                                                                                                   
      E --> F[LangGraph: ParseNode]                                                                                                                                             
      F --> G[LangGraph: MatchPartsNode - per job]                                                                                                                              
      G --> H[LangGraph: ValidateCompatibilityNode]                                                                                                                             
      H --> I[LangGraph: GenerateOutputNode]                                                                                                                                    
      I --> J[ZIP created on EBS, status = review]                                                                                                                              
      J --> K{User reviews}                                                                                                                                                     
      K -- Download ZIP --> L[User checks in spreadsheet]                                                                                                                             
      K -- Natural language correction --> M[LangGraph: CorrectionNode]                                                                                                         
      M --> I                                                                                                                                                                   
      K -- Re-upload file --> F                                                                                                                                                 
      K -- Complete --> N[status = completed, archived]                                                                                                                         
      N --> O[Manual delete only]                                                                                                                                               
                                                                
        
## Infrastructure

- AWS CDK IaC scripts live in `infra/`
- Provisions: EC2 (Amazon Linux) + EBS 4GB (mounted `/mnt/ebs`) + IAM role (`bedrock:InvokeModel`) + Security Group
- Docker bind mounts in `docker-compose.yml` map to EBS paths (`/mnt/ebs/invoice_data`, `/mnt/ebs/postgres_data`)
- See `infra/README.md` for full TODO list



# User Stories — Agentic Invoice Generator                                                                                                                                      
                                                                                                                                                                                
  Authentication                                                                                                                                                                
                                                                                                                                                                                
  - As a user, I want to log in with a username and password so that only authorized staff can access the system.                                                               
  - As a user, I want to be automatically redirected to the login page if my session expires so that the system stays secure.                                                   
                                                                                                                                                                                
## Task Management                                                                                                                                                               
                                                                                                                                                                                
  - As a user, I want to create a new invoice task so that I can process a batch of completed repair jobs.                                                                      
  - As a user, I want to upload the list of completed works, the client list, the spare parts catalog, and the device catalog as CSV files so that the system has all the data
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
                                                                                                                                                                                
  - As a user, I want to download a ZIP archive containing the total summary sheet and individual client invoice CSV files so that I can review them.                      
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

## Infrastructure

- AWS CDK IaC scripts live in `infra/`
- Provisions: EC2 (Amazon Linux) + EBS 4GB (mounted `/mnt/ebs`) + IAM role (`bedrock:InvokeModel`) + Security Group
- Docker bind mounts in `docker-compose.yml` map to EBS paths (`/mnt/ebs/invoice_data`, `/mnt/ebs/postgres_data`)
- See `infra/README.md` for full TODO list

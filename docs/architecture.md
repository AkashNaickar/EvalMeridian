# Architecture

## System Overview

EvalMeridian is a Next.js application that uses Supabase as its backend-as-a-service. There is no separate backend server — the frontend communicates directly with Supabase for authentication, database queries, file storage, and real-time subscriptions.

```mermaid
flowchart LR
    subgraph Browser
        A[Next.js App]
    end

    subgraph Supabase
        B[Auth]
        C[PostgreSQL]
        D[Storage]
        E[Realtime]
    end

    A -->|Sign in/out| B
    A -->|CRUD queries| C
    A -->|PDF upload/download| D
    A -->|Live subscriptions| E
```

## Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Login as Login Page
    participant AuthCtx as AuthContext
    participant SB as Supabase Auth
    participant DB as profiles table

    User->>Login: Enter email + password
    Login->>AuthCtx: login(email, password)
    AuthCtx->>SB: signInWithPassword()
    SB-->>AuthCtx: Session + User ID

    AuthCtx->>DB: SELECT role FROM profiles WHERE id = user_id
    DB-->>AuthCtx: role (admin | teacher | evaluator | student)

    AuthCtx->>AuthCtx: setRole(role)
    AuthCtx->>Login: router.push(/role)

    Note over Login: Dashboard layout checks isAuthenticated<br/>Unauthenticated users redirect to /login
```

## Role-Based Routing

```mermaid
flowchart TD
    A[User visits /] --> B{Authenticated?}
    B -->|No| C[/login]
    B -->|Yes| D{Role from profiles}

    D -->|admin| E[/admin]
    D -->|evaluator| F[/evaluator]
    D -->|teacher| G[/teacher]
    D -->|student| H[/student]

    E --> E1[Overview]
    E --> E2[Operations]
    E --> E3[Scripts]
    E --> E4[Students]
    E --> E5[Results]
    E --> E6[Assign]

    F --> F1[Script Queue]
    F --> F2["/evaluator/canvas/[id]"]

    G --> G1[Overview]
    G --> G2[Resources]
    G --> G3[Results]

    H --> H1[Overview]
    H --> H2[Results]
```

## Exam Evaluation Workflow

This is the core operational flow managed by the admin:

```mermaid
flowchart TD
    A["1. Create Exam Session"] --> B["2. Import Student Roster (CSV)"]
    B --> C["3. Upload Scanned Scripts (PDF batches)"]
    C --> D["4. Run Reconciliation Engine"]

    D --> D1{Mapping Result}
    D1 -->|Matched| E["Scripts linked to students"]
    D1 -->|Unmapped / Ambiguous| F["Manual resolution queue"]
    F --> E

    E --> G["5. Assign Scripts to Evaluators"]
    G --> H["6. Evaluators mark on Canvas"]
    H --> I{Submission}
    I -->|Normal| J["Status: evaluated"]
    I -->|UFM Flag| K["Status: flagged_ufm"]

    J --> L["7. Results compiled"]
    K --> L
    L --> M["8. Results released to students"]
```

## Evaluator Canvas Architecture

The canvas is the most complex component. It runs as a full-screen workspace with the sidebar hidden.

```mermaid
flowchart LR
    subgraph Canvas Page
        direction TB
        A[Operations Bar] --- B[Main Workspace]
    end

    subgraph "Main Workspace"
        direction LR
        C[Tool Rail] --- D[PDF Viewer]
        D --- E[Scoring Panel]
    end

    subgraph "PDF Viewer"
        F[Student Script]
        G[Question Paper]
        H[Marking Scheme]
    end

    subgraph "Scoring Panel"
        I[Question-wise Marks]
        J[Total Marks]
        K[Comments]
        L[Submit / Flag UFM]
    end
```

Key implementation details:
- PDF rendering uses `react-pdf` with `pdfjs-dist`, loaded via `next/dynamic` (no SSR)
- Annotations are stored as a JSON array in the `scripts.annotations` column
- Auto-save uses a 2-second debounce after any marks/annotations/comments change
- Split view uses `react-resizable-panels` for adjustable pane widths
- Documents are loaded via Supabase Storage signed URLs (1-hour expiry)

## Data Flow: Script Loading

```mermaid
sequenceDiagram
    participant Canvas as Canvas Page
    participant SB as Supabase DB
    participant Storage as Supabase Storage

    Canvas->>SB: SELECT script by ID
    SB-->>Canvas: script record (file_path, marks, annotations)

    Canvas->>Storage: createSignedUrl(file_path)
    Storage-->>Canvas: Signed URL (1hr expiry)

    Canvas->>Canvas: Render PDF from signed URL
    Canvas->>Canvas: Hydrate marks + annotations from DB

    Note over Canvas: On edit: 2s debounce → auto-save to DB
    Note over Canvas: On submit: final save + status update
```

## Real-Time Subscriptions

The operations page uses Supabase Realtime to listen for changes to the `scripts` table:

```typescript
supabase
  .channel(`session-${sessionId}-scripts`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'scripts',
    filter: `exam_session_id=eq.${sessionId}`
  }, () => fetchUnmapped())
  .subscribe();
```

This means the admin's monitoring panel updates automatically when evaluators submit marks, without polling.

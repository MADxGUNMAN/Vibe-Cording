# Project Details: Vibe Corder

## 1. Project Overview
**Vibe Corder** is an advanced AI-powered website builder that allows users to transform natural language descriptions into fully functional, responsive websites. It leverages multiple state-of-the-art AI models (Gemini, Llama, GPT) to generate code in real-time, offering a "Vercel v0"-like experience but with a broader range of model choices and deep customization.

## 2. Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **UI Library:** React 19
- **Styling:** Tailwind CSS 4
- **State Management & Data Fetching:** React Hooks, Server Actions

### Backend & Services
- **Authentication:** Firebase Authentication (Google Sign-In)
- **Database:** Firebase Cloud Firestore (NoSQL)
- **Runtime:** Node.js (via Next.js API Routes)
- **Hosting:** Vercel (recommended) / Render

### AI Integration
- **Google Generative AI SDK:** For Gemini models (2.5 Flash, 2.0 Flash)
- **OpenAI SDK / OpenRouter:** For GPT-4o, GLM 4.5 Air, GPT OSS
- **Groq SDK:** For Llama 3.3 and 3.1 (high-speed inference)

## 3. Key Features
1.  **AI-Powered Code Generation:** Generates React/Tailwind code from text prompts.
2.  **Real-Time Streaming:** Uses Server-Sent Events (SSE) to stream code generation token-by-token.
3.  **Multi-Model Support:** Users can choose between various models (Gemini, Llama, GPT) based on speed/quality needs.
4.  **Interactive Editor:**
    - Live preview of generated websites.
    - Visual editing (Click-to-edit elements).
    - Responsive design testing (Desktop/Tablet/Mobile views).
5.  **Chat-Based Refinement:** Conversational interface to refine and iterate on the generated design.
6.  **Version Control:** Automatic versioning of generations with rollback capabilities.
7.  **Community & Publishing:** Users can publish their projects to a community gallery.
8.  **Credit System:** User quota management system for API usage.

## 4. Database Schema (Firestore)

### Collection: `users`
- **id** (string): User's unique ID.
- **email** (string): User's email.
- **name** (string): Display name.
- **imageUrl** (string): Profile picture URL.
- **credits** (number): Remaining generation credits.
- **totalCreation** (number): Total projects created.
- **isAdmin** (boolean): Admin privileges flag.
- **createdAt** (Timestamp): Account creation time.

### Collection: `projects`
- **id** (string): Project UUID.
- **name** (string): Project title.
- **initial_prompt** (string): Original user prompt.
- **current_code** (string): The current React code of the project.
- **published_code** (string, optional): Code version visible to public.
- **userId** (string): Owner's User ID.
- **isPublished** (boolean): Publishing status.
- **model** (string): AI model used for generation.
- **createdAt** (Timestamp): Creation time.
- **updatedAt** (Timestamp): Last update time.

#### Sub-collection: `projects/{projectId}/conversations`
- **id** (string): Message ID.
- **role** ('user' | 'assistant'): Sender role.
- **content** (string): Message text.
- **timestamp** (Timestamp): Time of message.

#### Sub-collection: `projects/{projectId}/versions`
- **id** (string): Version ID.
- **code** (string): Snapshot of code at this version.
- **description** (string): Change description.
- **timestamp** (Timestamp): Time of version snapshot.

## 5. API Structure (`src/app/api`)
- **`POST /api/projects/create`**: Initialize a new project.
- **`GET /api/projects/stream`**: SSE endpoint for streaming initial code generation.
- **`POST /api/projects/revise`**: Submit a revision request.
- **`GET /api/projects/revise-stream`**: SSE endpoint for applying revisions.
- **`POST /api/projects/publish`**: Publish a project to the community.

## 6. Project Directory Structure
```
vibe-corder/
├── src/
│   ├── app/                    # Next.js App Router (Pages & API)
│   ├── components/             # Reusable UI Components
│   ├── lib/                    # Utilities (Firebase, AI clients)
│   └── ...
├── public/                     # Static assets
├── firestore.rules             # Database security rules
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind configuration
└── ...
```

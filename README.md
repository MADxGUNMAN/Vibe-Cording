<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase"/>
</p>

<h1 align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=700&size=40&pause=1000&color=9333EA&center=true&vCenter=true&random=false&width=600&height=70&lines=Vibe+Corder;AI+Website+Builder;Turn+Thoughts+Into+Websites" alt="Typing SVG" />
</h1>

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=400&size=18&pause=1000&color=7C3AED&center=true&vCenter=true&random=false&width=500&lines=Create+websites+instantly+with+AI;No+coding+required;Powered+by+multiple+AI+models" alt="Tagline" />
</p>

<p align="center">
  <a href="https://ansarisouaib.in">
    <img src="https://img.shields.io/badge/Developer-Ansari_Souaib-purple?style=for-the-badge&logo=github" alt="Developer"/>
  </a>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"/>
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge" alt="Status"/>
</p>

---

## 🚀 About Vibe Corder

**Vibe Corder** is a powerful AI-powered website builder that transforms your ideas into fully functional websites in seconds. Simply describe what you want, select an AI model, and watch as your website comes to life with real-time streaming code generation.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🤖 **Multiple AI Models** | Choose from GLM 4.5 Air, Llama 3.3 70B, GPT OSS 120B, and more |
| ⚡ **Real-time Streaming** | Watch your code generate live with streaming SSE |
| 🎨 **Visual Editor** | Click-to-edit elements with live preview |
| 📱 **Responsive Design** | Preview in Desktop, Tablet, and Mobile views |
| 🌐 **One-Click Publish** | Share your creations with the community |
| 💬 **Chat Revisions** | Refine your website through conversational AI |
| 📜 **Version History** | Track and restore previous versions |
| 👑 **Admin Dashboard** | Unlimited credits for administrators |

---

## 📸 Screenshots

<p align="center">
  <img src="./screenshots/home.png" alt="Home Page" width="80%"/>
  <br/>
  <em>🏠 Home Page - Create websites with AI</em>
</p>

<p align="center">
  <img src="./screenshots/create.png" alt="Create Page" width="80%"/>
  <br/>
  <em>✨ Create Page - Describe your vision, choose an AI model</em>
</p>

<p align="center">
  <img src="./screenshots/projects.png" alt="My Projects" width="80%"/>
  <br/>
  <em>📁 My Projects - Manage all your creations</em>
</p>

<p align="center">
  <img src="./screenshots/community.png" alt="Community" width="80%"/>
  <br/>
  <em>🌍 Community - Explore published projects</em>
</p>

<p align="center">
  <img src="./screenshots/pricing.png" alt="Pricing" width="80%"/>
  <br/>
  <em>💰 Pricing - Choose your plan</em>
</p>

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.3.3 | React framework with App Router |
| **React** | 19.0.0 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Styling |

### Backend & Database
| Technology | Purpose |
|------------|---------|
| **Firebase Auth** | User authentication (Google Sign-in) |
| **Cloud Firestore** | NoSQL database for projects, users, messages |
| **Next.js API Routes** | Server-side API endpoints |

### AI Integration
| Provider | Models |
|----------|--------|
| **OpenRouter** | GLM 4.5 Air, GPT OSS 120B, GPT OSS 20B |
| **Groq** | Llama 3.3 70B, Llama 3.1 8B |

### DevOps & Deployment
| Technology | Purpose |
|------------|---------|
| **Vercel** | Hosting & Deployment |
| **Firebase** | Backend services |

---

## 📂 Project Structure

```
vibe-corder/
├── 📁 src/
│   ├── 📁 app/                    # Next.js App Router
│   │   ├── 📄 page.tsx            # Home page
│   │   ├── 📄 layout.tsx          # Root layout
│   │   ├── 📄 globals.css         # Global styles
│   │   ├── 📁 api/                # API Routes
│   │   │   └── 📁 projects/
│   │   │       ├── 📁 stream/     # SSE streaming for generation
│   │   │       ├── 📁 revise-stream/  # SSE for revisions
│   │   │       ├── 📁 create/     # Project creation
│   │   │       ├── 📁 revise/     # Project revisions
│   │   │       └── 📁 publish/    # Publishing projects
│   │   ├── 📁 generate/           # Create new website page
│   │   ├── 📁 editor/[id]/        # Project editor
│   │   ├── 📁 preview/[id]/       # Project preview
│   │   ├── 📁 projects/           # My Projects page
│   │   ├── 📁 community/          # Published projects
│   │   ├── 📁 pricing/            # Pricing plans
│   │   ├── 📁 active/             # Active generations
│   │   └── 📁 login/              # Authentication
│   ├── 📁 components/             # React Components
│   │   ├── 📄 Header.tsx          # Navigation header
│   │   ├── 📄 Footer.tsx          # Site footer
│   │   ├── 📄 AuthProvider.tsx    # Auth context
│   │   └── 📄 ActiveGenerationsProvider.tsx
│   └── 📁 lib/                    # Utilities
│       ├── 📄 firebase.ts         # Firebase config
│       └── 📄 firestore.ts        # Database operations
├── 📁 screenshots/                # App screenshots
├── 📄 package.json                # Dependencies
├── 📄 tailwind.config.ts          # Tailwind config
├── 📄 tsconfig.json               # TypeScript config
├── 📄 next.config.ts              # Next.js config
└── 📄 README.md                   # This file
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase account
- OpenRouter API key
- Groq API key

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/vibe-corder.git
cd vibe-corder
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env.local` file:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# AI API Keys
OPENROUTER_API_KEY=your_openrouter_key
GROQ_API_KEY=your_groq_key
```

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎯 Features Deep Dive

### 🤖 AI-Powered Generation
- **Multiple Models**: Switch between AI models for different results
- **Streaming**: Real-time code generation with SSE
- **Smart Prompts**: Enhanced prompt processing for better outputs

### 🎨 Visual Editor
- **Click-to-Edit**: Select any element to modify
- **Color Pickers**: Intuitive color selection for background and text
- **Live Preview**: See changes instantly
- **Responsive Testing**: Preview on different device sizes

### 💬 Chat Revisions
- **Conversational AI**: Describe changes naturally
- **Code Streaming**: Watch modifications in real-time
- **Version History**: Revert to any previous version

### 🌐 Publishing & Sharing
- **One-Click Publish**: Share your creations instantly
- **Community Gallery**: Explore projects from other users
- **Model Badges**: See which AI model created each project

---

## 🔐 Security Features

- **Firebase Authentication**: Secure Google Sign-in
- **Admin System**: Special privileges for administrators
- **Credit System**: Usage-based credits with admin bypass
- **Secure API Routes**: Protected backend endpoints

---

## 📊 Database Schema

### Users Collection
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  imageUrl?: string;
  credits: number;
  totalCreation: number;
  isAdmin: boolean;
  createdAt: Timestamp;
}
```

### Projects Collection
```typescript
interface Project {
  id: string;
  name: string;
  initial_prompt: string;
  current_code: string;
  userId: string;
  isPublished: boolean;
  model?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<h2 align="center">👨‍💻 Developer</h2>

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=24&pause=1000&color=9333EA&center=true&vCenter=true&random=false&width=400&lines=Ansari+Souaib" alt="Developer Name" />
</p>

<p align="center">
  <a href="https://ansarisouaib.in">
    <img src="https://img.shields.io/badge/Portfolio-ansarisouaib.in-purple?style=for-the-badge&logo=google-chrome&logoColor=white" alt="Portfolio"/>
  </a>
</p>

<p align="center">
  <b>Full Stack Developer & UI/UX Designer</b>
</p>

<p align="center">
  I create elegant, high-performance web experiences with clean code and modern design principles.
</p>

---

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=400&size=16&pause=1000&color=7C3AED&center=true&vCenter=true&random=false&width=500&lines=Made+with+%E2%9D%A4%EF%B8%8F+by+Ansari+Souaib;Thanks+for+visiting!" alt="Footer" />
</p>

<p align="center">
  ⭐ Star this repository if you found it helpful!
</p>

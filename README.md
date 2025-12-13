# ScholarKey AI 🎓

> Your Verifiable, AI-Powered Pathway to Global Education.

ScholarKey is an autonomous multi-agent AI system that simplifies the study abroad application process. It analyzes a user's academic profile (CV, GPA, Skills), autonomously searches for matching scholarships in real-time, and generates a structured Excel plan with Hedera blockchain verification.

![ScholarKey Demo](https://img.shields.io/badge/Demo-Live-brightgreen)
![Python](https://img.shields.io/badge/Python-3.13+-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

- **🤖 AI-Powered CV Analysis**: Upload your CV (PDF/DOCX) and let Claude AI extract your academic profile automatically
- **🔍 Smart Scholarship Search**: Real-time scholarship search using Tavily AI, tailored to your profile
- **📊 Match Scoring**: Get compatibility scores for each scholarship based on your profile
- **📝 Excel Export**: Download a structured plan with all scholarships, requirements, and deadlines
- **🔗 Blockchain Verification**: Immutable "Proof of Profile" using Hedera Consensus Service
- **💬 Multi-Agent Chat Interface**: Intelligent conversation with specialized agents (Profile, Search, Plan)
- **🎨 Modern UI**: Beautiful, responsive Next.js frontend with dark/light mode

## 🏗️ Architecture

ScholarKey uses a **multi-agent hand-off architecture** powered by LangGraph:

```
┌─────────────────────────────────────────────────────────────┐
│                    Supervisor Agent                          │
│            (Intent Classification & Routing)                 │
└─────────────────┬───────────────┬───────────────┬───────────┘
                  │               │               │
                  ▼               ▼               ▼
         ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
         │ Profile Agent │ │ Search Agent  │ │  Plan Agent   │
         │ (CV Analysis) │ │ (Scholarships)│ │ (Application) │
         └───────────────┘ └───────────────┘ └───────────────┘
```

- **Supervisor Agent**: Routes user queries to appropriate specialized agents
- **Profile Agent**: Parses CVs, extracts academic data, and enriches profiles
- **Search Agent**: Finds scholarships and programs matching user qualifications
- **Plan Agent**: Creates personalized application timelines and exports

## 🚀 Quick Start

### Prerequisites

- Python 3.13+
- Node.js 18+ (for frontend)
- [uv](https://docs.astral.sh/uv/) - Fast Python package manager

### Backend Installation

```bash
# Clone the repository
git clone https://github.com/nhat120904/ScholarKey-Agent.git
cd ScholarKey-Agent

# Install dependencies
uv sync

# Or install with dev dependencies
make dev
```

### Frontend Installation

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your API keys:
# - ANTHROPIC_API_KEY (required)
# - TAVILY_API_KEY (required)
# - HEDERA_ACCOUNT_ID (optional, for blockchain verification)
# - HEDERA_PRIVATE_KEY (optional, for blockchain verification)
```

### Running the Application

```bash
# Terminal 1: Start the FastAPI backend
make run

# Terminal 2: Start the Next.js frontend
cd frontend && npm run dev
```

- **Backend API**: `http://localhost:8000`
- **API Documentation**: `http://localhost:8000/docs`
- **Frontend**: `http://localhost:3000`

## 📚 API Endpoints

### Profile Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload-profile` | POST | Upload CV and create profile |
| `/api/chat` | POST | Multi-agent chat for profile updates |

### Session Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sessions` | GET | List all chat sessions |
| `/api/sessions/{id}` | GET | Get session details |
| `/api/sessions/{id}` | PUT | Update session (rename) |
| `/api/sessions/{id}` | DELETE | Delete session |
| `/api/sessions/{id}/history` | GET | Get conversation history |

### Scholarship Search

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search-scholarships` | POST | Search scholarships by profile |
| `/api/crawl-scholarship` | POST | Crawl scholarship URL for details |

### Export

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/export-excel` | POST | Export results to Excel |

### System

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/hedera/topic` | GET | Hedera topic info |

## 🛠️ Development

### Available Commands

```bash
# Install dependencies
make install       # Install production dependencies
make dev           # Install dev dependencies + setup pre-commit
make setup         # Full setup for new developers

# Code Quality
make lint          # Run ruff linter
make lint-fix      # Run ruff with auto-fix
make format        # Format code with ruff
make format-check  # Check formatting without changes
make type-check    # Run mypy type checker

# Testing
make test          # Run tests
make test-cov      # Run tests with coverage report

# All Checks
make check         # Run lint, format-check, type-check, and tests

# Utilities
make clean         # Clean build artifacts and caches
make pre-commit    # Run pre-commit on all files
make run           # Run the application
```

### Project Structure

```
ScholarKey-Agent/
├── src/
│   └── scholar_agent/
│       ├── __init__.py
│       ├── main.py              # FastAPI application entry point
│       ├── config.py            # Configuration settings
│       ├── models.py            # Pydantic data models
│       ├── py.typed             # PEP 561 marker for type hints
│       ├── api/
│       │   └── routes.py        # FastAPI routes
│       ├── agents/
│       │   ├── supervisor.py    # Supervisor agent (orchestrator)
│       │   ├── profile_agent.py # Profile analysis agent
│       │   ├── scholarship_agent.py  # Scholarship search agent
│       │   ├── state.py         # Shared agent states
│       │   └── llm.py           # LLM configuration
│       └── services/
│           ├── cv_parser.py     # CV parsing with Claude
│           ├── hedera.py        # Hedera blockchain integration
│           ├── scholarship_search.py  # Tavily search service
│           ├── session_manager.py     # Session management
│           └── excel_export.py  # Excel export service
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js app router pages
│   │   ├── components/          # React components
│   │   │   ├── chat/            # Chat interface components
│   │   │   ├── layout/          # Layout components
│   │   │   ├── steps/           # Onboarding step components
│   │   │   └── ui/              # Reusable UI components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utilities and API client
│   │   ├── stores/              # Zustand state stores
│   │   └── types/               # TypeScript types
│   ├── package.json
│   └── tailwind.config.js
├── tests/
│   └── test_main.py
├── plans/                       # Architecture documentation
├── exports/                     # Generated Excel exports
├── Makefile
├── pyproject.toml
└── README.md
```

## 🔧 Technology Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** - Modern, fast web framework for APIs
- **[LangGraph](https://langchain-ai.github.io/langgraph/)** - Multi-agent AI workflow orchestration
- **[Claude AI](https://anthropic.com/)** - CV parsing and intelligent conversations
- **[Tavily](https://tavily.com/)** - AI-optimized web search
- **[Pandas](https://pandas.pydata.org/)** - Data processing and Excel generation

### Frontend
- **[Next.js 14](https://nextjs.org/)** - React framework with App Router
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Radix UI](https://radix-ui.com/)** - Accessible UI primitives
- **[Zustand](https://zustand-demo.pmnd.rs/)** - Lightweight state management
- **[React Query](https://tanstack.com/query)** - Data fetching and caching
- **[Framer Motion](https://www.framer.com/motion/)** - Animations

### Blockchain
- **[Hedera Consensus Service](https://hedera.com/)** - Immutable verification layer

### Code Quality
- **[Ruff](https://docs.astral.sh/ruff/)** - Fast Python linting and formatting
- **[Mypy](https://mypy.readthedocs.io/)** - Static type checking
- **[Pytest](https://pytest.org/)** - Testing framework
- **[Pre-commit](https://pre-commit.com/)** - Git hooks for code quality

## 📖 Usage Examples

### Upload CV and Search Scholarships

```python
import httpx

# Upload CV
with open("my_cv.pdf", "rb") as f:
    response = httpx.post(
        "http://localhost:8000/api/upload-profile",
        files={"file": f},
        data={
            "target_country": "Australia",
            "desired_field": "Computer Science with focus on AI/ML",
            "level": "master"
        }
    )

profile = response.json()["profile"]

# Search scholarships
search_response = httpx.post(
    "http://localhost:8000/api/search-scholarships",
    json={
        "profile": profile,
        "search_mode": "by_scholarship",
        "min_match_score": 50
    }
)

scholarships = search_response.json()["scholarships"]
```

### Chat with Multi-Agent System

```python
# Start a conversation
chat_response = httpx.post(
    "http://localhost:8000/api/chat",
    json={
        "message": "I want to find scholarships for AI research in Germany",
        "session_id": "my-session-id"
    }
)

print(chat_response.json()["message"])
# The supervisor will route this to the Search Agent
```

### Export to Excel

```python
export_response = httpx.post(
    "http://localhost:8000/api/export-excel",
    json={
        "scholarships": scholarships,
        "profile": profile,
        "include_scholarships": True,
        "include_programs": True
    }
)

# Save the Excel file
with open("scholarship_plan.xlsx", "wb") as f:
    f.write(export_response.content)
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run code quality checks (`make check`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com/) for Claude AI
- [LangChain](https://langchain.com/) for LangGraph
- [Hedera](https://hedera.com/) for blockchain infrastructure
- [Tavily](https://tavily.com/) for AI-powered search

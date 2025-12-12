# ScholarKey AI 🎓

> Your Verifiable, AI-Powered Pathway to Global Education.

ScholarKey is an autonomous AI agent system that simplifies the study abroad application process. It analyzes a user's academic profile (CV, GPA, Skills), autonomously searches for matching scholarships in real-time, and generates a structured Excel plan with Hedera blockchain verification.

## ✨ Features

- **🤖 AI-Powered CV Analysis**: Upload your CV (PDF/DOCX) and let Claude AI extract your academic profile automatically
- **🔍 Smart Scholarship Search**: Real-time scholarship search using Tavily AI, tailored to your profile
- **📊 Match Scoring**: Get compatibility scores for each scholarship based on your profile
- **📝 Excel Export**: Download a structured plan with all scholarships, requirements, and deadlines
- **🔗 Blockchain Verification**: Immutable "Proof of Profile" using Hedera Consensus Service
- **💬 Chat Interface**: Update your profile through natural language conversation

## 🚀 Quick Start

### Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) - Fast Python package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/nhat120904/ScholarKey-Agent.git
cd ScholarAgent

# Install dependencies
uv sync

# Or install dev dependencies
make dev
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

### Running the Server

```bash
# Start the FastAPI server
make run

# Or manually
uv run scholar-agent
```

The API will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the interactive API documentation.

## 📚 API Endpoints

### Profile Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload-profile` | POST | Upload CV and create profile |
| `/api/chat` | POST | Update profile via chat |

### Scholarship Search

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search-scholarships` | POST | Search scholarships by profile |
| `/api/search-by-program` | POST | Find scholarships for specific program |
| `/api/search-programs-by-scholarship` | POST | Find programs matching scholarships |
| `/api/crawl-scholarship` | POST | Crawl scholarship URL for details |

### Schools & Programs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/search-schools` | GET | Search schools by country |
| `/api/search-programs` | GET | Search programs |

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
make dev           # Install dev dependencies + setup pre-commit

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
ScholarAgent/
├── src/
│   └── scholar_agent/
│       ├── __init__.py
│       ├── main.py              # FastAPI application entry point
│       ├── config.py            # Configuration settings
│       ├── models.py            # Pydantic data models
│       ├── py.typed             # PEP 561 marker for type hints
│       ├── api/
│       │   ├── __init__.py
│       │   └── routes.py        # FastAPI routes
│       ├── agents/
│       │   ├── __init__.py
│       │   ├── profile_agent.py      # LangGraph profile agent
│       │   └── scholarship_agent.py  # LangGraph search agent
│       └── services/
│           ├── __init__.py
│           ├── cv_parser.py     # CV parsing with Claude
│           ├── hedera.py        # Hedera blockchain integration
│           ├── scholarship_search.py  # Tavily search service
│           └── excel_export.py  # Excel export service
├── tests/
│   ├── __init__.py
│   └── test_main.py
├── .env.example
├── .gitignore
├── .pre-commit-config.yaml
├── Makefile
├── pyproject.toml
├── project-requirement.md
└── README.md
```

## 🔧 Technology Stack

### Backend
- **FastAPI** - Modern, fast web framework for APIs
- **LangGraph** - AI workflow orchestration
- **Claude AI** - CV parsing and analysis
- **Tavily** - AI-optimized web search
- **Pandas** - Data processing and Excel generation

### Blockchain
- **Hedera Consensus Service** - Immutable verification layer

### Code Quality
- **[Ruff](https://docs.astral.sh/ruff/)** - Linting and formatting
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

## 📝 License

MIT License

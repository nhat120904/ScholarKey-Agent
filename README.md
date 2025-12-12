# ScholarKey AI 🎓

> Your Verifiable, AI-Powered Pathway to Global Education.

ScholarKey is an autonomous AI agent system that simplifies the study abroad application process. It analyzes a user's academic profile (CV, GPA, Skills), autonomously searches for matching scholarships in real-time, and generates a structured Excel plan with Hedera blockchain verification.

## 🚀 Quick Start

### Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) - Fast Python package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/nhat120904/ScholarKey-Agent
cd ScholarKey-Agent

# Install development dependencies
make dev

# Or manually with uv
uv sync
uv run pre-commit install
```

### Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your API keys
```

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
│       ├── main.py
│       └── py.typed          # PEP 561 marker for type hints
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

### Code Quality Tools

- **[Ruff](https://docs.astral.sh/ruff/)** - Linting and formatting
- **[Mypy](https://mypy.readthedocs.io/)** - Static type checking
- **[Pytest](https://pytest.org/)** - Testing framework
- **[Pre-commit](https://pre-commit.com/)** - Git hooks for code quality

## 📝 License

MIT License

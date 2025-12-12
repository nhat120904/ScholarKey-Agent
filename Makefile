.PHONY: install dev lint format type-check test test-cov clean pre-commit all

# Install production dependencies
install:
	uv sync --no-dev

# Install development dependencies
dev:
	uv sync
	uv run pre-commit install

# Run linter
lint:
	uv run ruff check src tests

# Run linter with auto-fix
lint-fix:
	uv run ruff check --fix src tests

# Format code
format:
	uv run ruff format src tests

# Check formatting without making changes
format-check:
	uv run ruff format --check src tests

# Run type checker
type-check:
	uv run mypy src

# Run tests
test:
	uv run pytest

# Run tests with coverage
test-cov:
	uv run pytest --cov=src/scholar_agent --cov-report=term-missing --cov-report=html

# Run all checks (lint, format check, type check, tests)
check: lint format-check type-check test

# Clean up build artifacts and caches
clean:
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/
	rm -rf .pytest_cache/
	rm -rf .mypy_cache/
	rm -rf .ruff_cache/
	rm -rf htmlcov/
	rm -rf .coverage
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true

# Run pre-commit on all files
pre-commit:
	uv run pre-commit run --all-files

# Run the application
run:
	uv run scholar-agent

# Full setup for new developers
setup: dev
	@echo "✅ Development environment ready!"
	@echo "Run 'make check' to verify everything is working."

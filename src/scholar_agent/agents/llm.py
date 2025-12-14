"""LLM setup utilities for the multi-agent system."""

from functools import lru_cache

from langchain_anthropic import ChatAnthropic

from scholar_agent.config import get_settings


@lru_cache
def get_llm(
    temperature: float = 0.7, max_tokens: int = 4096, model: str | None = None
) -> ChatAnthropic:
    """Get Claude LLM instance via LangChain Anthropic.

    Args:
        temperature: Sampling temperature (0-1). Higher = more creative.
        max_tokens: Maximum tokens in response.
        model: Override model name. If None, uses config setting.

    Returns:
        Configured ChatAnthropic instance.

    Model options (set via CLAUDE_MODEL env var):
    - claude-haiku-4-5-20251001: Fast & cheap (default for development)
    - claude-sonnet-4-20250514: Best balance of speed and capability
    - claude-3-opus-20240229: Most capable for complex reasoning
    """
    settings = get_settings()

    return ChatAnthropic(
        model=model or settings.claude_model,
        temperature=temperature,
        max_tokens=max_tokens,
        api_key=settings.anthropic_api_key,
    )


def get_fast_llm() -> ChatAnthropic:
    """Get a fast LLM for simple tasks like intent classification.

    Uses lower temperature and fewer max_tokens for speed.
    """
    return get_llm(temperature=0.3, max_tokens=1024)


def get_creative_llm() -> ChatAnthropic:
    """Get a more creative LLM for tasks like suggestions and analysis.

    Uses higher temperature for more varied outputs.
    """
    return get_llm(temperature=0.8, max_tokens=4096)


def get_structured_llm() -> ChatAnthropic:
    """Get LLM optimized for structured output extraction.

    Uses very low temperature for consistent JSON output.
    """
    return get_llm(temperature=0.1, max_tokens=4096)


class LLMConfig:
    """Configuration for LLM behavior in different contexts."""

    # Intent classification
    INTENT_TEMPERATURE = 0.3
    INTENT_MAX_TOKENS = 512

    # Profile extraction
    PROFILE_TEMPERATURE = 0.2
    PROFILE_MAX_TOKENS = 4096

    # Search query generation
    SEARCH_TEMPERATURE = 0.5
    SEARCH_MAX_TOKENS = 2048

    # Match analysis
    ANALYSIS_TEMPERATURE = 0.6
    ANALYSIS_MAX_TOKENS = 4096

    # Plan generation
    PLAN_TEMPERATURE = 0.7
    PLAN_MAX_TOKENS = 8192

    # Conversation
    CHAT_TEMPERATURE = 0.7
    CHAT_MAX_TOKENS = 2048

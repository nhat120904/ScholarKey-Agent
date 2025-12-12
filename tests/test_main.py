"""Tests for the main module."""

from scholar_agent.main import main


def test_main(capsys) -> None:
    """Test main function output."""
    main()
    captured = capsys.readouterr()
    assert "Hello from scholar-agent!" in captured.out

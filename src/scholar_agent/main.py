"""Main entry point for ScholarAgent FastAPI application."""

import logging
import traceback
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from scholar_agent.api.routes import router
from scholar_agent.config import get_settings

# Configure logging with more detail
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """Application lifespan manager.

    Args:
        app: FastAPI application instance.

    Yields:
        None
    """
    # Startup
    logger.info("Starting ScholarKey AI...")
    settings = get_settings()

    # Initialize Hedera service
    try:
        from scholar_agent.services.hedera import get_hedera_service

        await get_hedera_service()
        logger.info("Hedera service initialized")
    except Exception as e:
        logger.warning(f"Hedera service initialization failed: {e}")

    logger.info(f"ScholarKey AI v{settings.app_version} started successfully")

    yield

    # Shutdown
    logger.info("Shutting down ScholarKey AI...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Returns:
        Configured FastAPI application.
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description="AI-powered scholarship search agent with Hedera blockchain verification",
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Add global exception handler for detailed error logging
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Handle all unhandled exceptions with detailed logging."""
        error_detail = {
            "error": str(exc),
            "type": type(exc).__name__,
            "path": str(request.url.path),
            "method": request.method,
            "traceback": traceback.format_exc(),
        }
        logger.error(f"Unhandled exception: {error_detail}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={
                "detail": str(exc),
                "type": type(exc).__name__,
                "traceback": traceback.format_exc().split("\n"),
            },
        )

    # Include routes
    app.include_router(router)

    return app


# Create the application instance
app = create_app()


def main() -> None:
    """Run the main application."""
    settings = get_settings()

    logger.info(f"Starting {settings.app_name} on {settings.api_host}:{settings.api_port}")

    uvicorn.run(
        "scholar_agent.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
        log_level="info",
    )


if __name__ == "__main__":
    main()

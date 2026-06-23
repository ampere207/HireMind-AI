import sys
import os
from loguru import logger
from app.config.config import settings

# Create logs directory
LOGS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

# Configure Loguru
logger.remove() # Remove default handler

# 1. Console logging (stdout)
logger.add(
    sys.stdout,
    level=settings.LOG_LEVEL,
    format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    enqueue=True
)

# 2. File logging - All logs
logger.add(
    os.path.join(LOGS_DIR, "app.log"),
    level="INFO",
    format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}",
    rotation="50 MB",
    retention="10 days",
    compression="zip",
    enqueue=True
)

# 3. File logging - Errors only
logger.add(
    os.path.join(LOGS_DIR, "errors.log"),
    level="ERROR",
    format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}\nException Details:\n{exception}",
    rotation="10 MB",
    retention="30 days",
    compression="zip",
    enqueue=True
)

# Export configure logger
app_logger = logger

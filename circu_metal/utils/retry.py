import asyncio
import logging

logger = logging.getLogger(__name__)

async def run_with_retry(coro_func, *args, retries=5, initial_delay=10, **kwargs):
    """
    Runs an async function with exponential backoff retry for 429 errors.
    """
    delay = initial_delay
    last_exception = None
    
    for i in range(retries):
        try:
            return await coro_func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                if i == retries - 1:
                    logger.error(f"Max retries ({retries}) reached. Last error: {error_str}")
                    raise last_exception
                
                logger.warning(f"Rate limit hit (429). Retrying in {delay}s... (Attempt {i+1}/{retries})")
                await asyncio.sleep(delay)
                delay *= 2 # Exponential backoff
            else:
                raise e
    raise last_exception

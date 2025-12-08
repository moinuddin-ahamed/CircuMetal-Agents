import asyncio
import logging

logger = logging.getLogger(__name__)

async def run_with_retry(coro_func, *args, retries=5, initial_delay=60, **kwargs):
    """
    Runs an async function with exponential backoff retry for 429 errors.
    Initial delay is 60 seconds to respect API rate limits.
    """
    delay = initial_delay
    last_exception = None
    
    for i in range(retries):
        try:
            return await coro_func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            error_str = str(e)
            # Check for various rate limit indicators
            is_rate_limit = (
                "429" in error_str or 
                "RESOURCE_EXHAUSTED" in error_str or 
                "Quota exceeded" in error_str or
                "Value: 100%" in error_str  # Catch the specific error user reported
            )
            
            if is_rate_limit:
                if i == retries - 1:
                    logger.error(f"Max retries ({retries}) reached. Last error: {error_str}")
                    raise last_exception
                
                logger.warning(f"Rate limit or quota error hit. Retrying in {delay}s... (Attempt {i+1}/{retries}). Error: {error_str}")
                await asyncio.sleep(delay)
                delay *= 2 # Exponential backoff
            else:
                logger.error(f"Non-retriable error: {error_str}")
                raise e
    raise last_exception

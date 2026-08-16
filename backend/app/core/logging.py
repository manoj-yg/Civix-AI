import logging
import sys

def setup_logging():
    log_format = "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    logger = logging.getLogger("civix_backend")
    logger.info("Structured logging initialized for CIVIX AI")
    return logger

logger = setup_logging()

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class LLMProvider(ABC):
    """
    Abstract Interface for LLM & RAG Integration Providers
    """

    @abstractmethod
    def generate(self, prompt: str, system_message: Optional[str] = None) -> str:
        """
        Generate completion text from LLM provider.
        """
        pass

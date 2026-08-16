import os
import logging
from typing import Optional
from app.core.config import settings
from app.ai.recommendation.base import LLMProvider

logger = logging.getLogger("civix_backend")

class MockLLMProvider(LLMProvider):
    def generate(self, prompt: str, system_message: Optional[str] = None) -> str:
        return (
            "[MOCK LLM RESPONSE] Based on detected infrastructure defects and historical severity scores, "
            "immediate field dispatch and surface resurfacing is recommended to prevent structural degradation."
        )

class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.LLM_API_KEY or os.getenv("OPENAI_API_KEY")
        self.model_name = model_name or settings.LLM_MODEL_NAME or "gpt-4o"

    def generate(self, prompt: str, system_message: Optional[str] = None) -> str:
        if not self.api_key:
            logger.warning("OpenAI API key missing. Falling back to MockLLMProvider.")
            return MockLLMProvider().generate(prompt, system_message)
        try:
            import openai
            client = openai.OpenAI(api_key=self.api_key)
            messages = []
            if system_message:
                messages.append({"role": "system", "content": system_message})
            messages.append({"role": "user", "content": prompt})

            response = client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.2
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI completion error ({e}), returning mock fallback.")
            return MockLLMProvider().generate(prompt, system_message)

class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.LLM_API_KEY or os.getenv("ANTHROPIC_API_KEY")
        self.model_name = model_name or "claude-3-5-sonnet-20240620"

    def generate(self, prompt: str, system_message: Optional[str] = None) -> str:
        if not self.api_key:
            logger.warning("Anthropic API key missing. Falling back to MockLLMProvider.")
            return MockLLMProvider().generate(prompt, system_message)
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.api_key)
            response = client.messages.create(
                model=self.model_name,
                max_tokens=500,
                system=system_message or "You are an AI infrastructure engineering expert.",
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Anthropic completion error ({e}), returning mock fallback.")
            return MockLLMProvider().generate(prompt, system_message)

class LocalLLMProvider(LLMProvider):
    def __init__(self, endpoint_url: Optional[str] = None):
        self.endpoint_url = endpoint_url or os.getenv("LOCAL_LLM_URL", "http://localhost:11434/api/generate")

    def generate(self, prompt: str, system_message: Optional[str] = None) -> str:
        try:
            import urllib.request
            import json
            req_data = json.dumps({
                "model": "llama3",
                "prompt": f"{system_message or ''}\n\n{prompt}",
                "stream": False
            }).encode('utf-8')
            req = urllib.request.Request(self.endpoint_url, data=req_data, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=5) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                return result.get("response", MockLLMProvider().generate(prompt))
        except Exception as e:
            logger.warning(f"Local LLM endpoint unreachable ({e}), using mock provider.")
            return MockLLMProvider().generate(prompt, system_message)

def get_llm_provider(provider_type: Optional[str] = None) -> LLMProvider:
    p_type = (provider_type or settings.LLM_PROVIDER).lower()
    if p_type == "openai":
        return OpenAIProvider()
    elif p_type == "anthropic":
        return AnthropicProvider()
    elif p_type == "local":
        return LocalLLMProvider()
    else:
        return MockLLMProvider()

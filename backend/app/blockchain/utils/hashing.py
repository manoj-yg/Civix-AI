import json
import hashlib
from typing import Dict, Any

def generate_canonical_json(data: Dict[str, Any]) -> str:
    """
    Produces deterministic, normalized canonical JSON string representation.
    Ensures identical dictionaries always produce identical byte representations across runtimes.
    """
    return json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=True)

def compute_sha256_hash(data: Dict[str, Any]) -> str:
    """
    Computes SHA-256 hex digest for a dictionary record.
    Returns 64-character hexadecimal SHA-256 string.
    """
    canonical_json = generate_canonical_json(data)
    return hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()

def string_to_bytes32(hex_string: str) -> bytes:
    """Converts hex string or string to 32-byte representation for EVM calls."""
    cleaned = hex_string.replace("0x", "")
    if len(cleaned) == 64:
        return bytes.fromhex(cleaned)
    encoded = hex_string.encode('utf-8')
    return hashlib.sha256(encoded).digest()

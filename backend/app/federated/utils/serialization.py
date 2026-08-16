import io
from typing import List
import numpy as np

def ndarrays_to_bytes(ndarrays: List[np.ndarray]) -> bytes:
    """Serializes a list of NumPy arrays to compressed bytes buffer."""
    buf = io.BytesIO()
    np.savez_compressed(buf, *ndarrays)
    return buf.getvalue()

def bytes_to_ndarrays(b: bytes) -> List[np.ndarray]:
    """Deserializes compressed bytes buffer back to a list of NumPy arrays."""
    buf = io.BytesIO(b)
    with np.load(buf) as npz:
        return [npz[f] for f in npz.files]

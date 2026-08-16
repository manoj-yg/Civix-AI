import numpy as np
from typing import Tuple, Any

class MunicipalLocalDataset:
    """
    Simulated or DB-backed local municipal dataset loader for federated training.
    Loads and partitions image feature tensors locally at municipal client nodes.
    Raw image files remain strictly within local boundary.
    """

    def __init__(self, client_id: str, num_samples: int = 100):
        self.client_id = client_id
        self.num_samples = num_samples

    def load_data(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Generates/fetches local train and test datasets for this municipality node.
        Returns: (x_train, y_train, x_test, y_test)
        Shapes: (N, 3, 64, 64), (N,)
        """
        np.random.seed(hash(self.client_id) % 2**32)
        
        n_train = int(self.num_samples * 0.8)
        n_test = self.num_samples - n_train
        
        x_train = np.random.randn(n_train, 3, 64, 64).astype(np.float32)
        y_train = np.random.randint(0, 4, size=(n_train,)).astype(np.int64)
        
        x_test = np.random.randn(n_test, 3, 64, 64).astype(np.float32)
        y_test = np.random.randint(0, 4, size=(n_test,)).astype(np.int64)
        
        return x_train, y_train, x_test, y_test

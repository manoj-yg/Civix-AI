from typing import List, Any
import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F

    class InfrastructureDefectNet(nn.Module):
        """
        PyTorch CNN Architecture for Decentralized Municipal Defect Classification.
        Used for Federated Learning across regional nodes.
        """
        def __init__(self, num_classes: int = 4):
            super(InfrastructureDefectNet, self).__init__()
            self.conv1 = nn.Conv2d(3, 16, kernel_size=3, padding=1)
            self.bn1 = nn.BatchNorm2d(16)
            self.pool = nn.MaxPool2d(2, 2)
            
            self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
            self.bn2 = nn.BatchNorm2d(32)
            
            self.conv3 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
            self.bn3 = nn.BatchNorm2d(64)
            
            self.fc1 = nn.Linear(64 * 8 * 8, 128)
            self.fc2 = nn.Linear(128, num_classes)
            self.dropout = nn.Dropout(0.3)

        def forward(self, x):
            # Input shape: (B, 3, 64, 64)
            x = self.pool(F.relu(self.bn1(self.conv1(x))))
            x = self.pool(F.relu(self.bn2(self.conv2(x))))
            x = self.pool(F.relu(self.bn3(self.conv3(x))))
            
            x = x.view(-1, 64 * 8 * 8)
            x = F.relu(self.fc1(x))
            x = self.dropout(x)
            x = self.fc2(x)
            return x

    def get_model_parameters(net: nn.Module) -> List[np.ndarray]:
        """Extract PyTorch model weights as list of NumPy arrays for Flower serialization."""
        return [val.cpu().numpy() for _, val in net.state_dict().items()]

    def set_model_parameters(net: nn.Module, parameters: List[np.ndarray]):
        """Set PyTorch model state dict from Flower NumPy parameter arrays."""
        params_dict = zip(net.state_dict().keys(), parameters)
        state_dict = {k: torch.tensor(v) for k, v in params_dict}
        net.load_state_dict(state_dict, strict=True)

except ImportError:
    # Lightweight NumPy fallback if PyTorch is absent in environment
    class InfrastructureDefectNet:
        def __init__(self, num_classes: int = 4):
            self.weights = np.random.randn(num_classes, 128)
            self.bias = np.zeros(num_classes)

    def get_model_parameters(net: Any) -> List[np.ndarray]:
        return [net.weights, net.bias]

    def set_model_parameters(net: Any, parameters: List[np.ndarray]):
        if len(parameters) >= 2:
            net.weights = parameters[0]
            net.bias = parameters[1]

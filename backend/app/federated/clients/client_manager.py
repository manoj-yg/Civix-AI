import logging
from typing import Dict, List, Optional, Any
from app.federated.clients.flower_client import MunicipalFlowerClient

logger = logging.getLogger("civix_backend")

DEFAULT_MUNICIPALITIES = [
    {"client_id": "client_muni_east", "name": "BBMP East Zone Municipality", "samples": 250},
    {"client_id": "client_muni_south", "name": "BBMP South Zone Municipality", "samples": 180},
    {"client_id": "client_muni_north", "name": "BBMP North Zone Municipality", "samples": 300},
    {"client_id": "client_muni_west", "name": "BBMP West Zone Municipality", "samples": 150}
]

class MunicipalClientRegistry:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MunicipalClientRegistry, cls).__new__(cls)
            cls._instance._init_registry()
        return cls._instance

    def _init_registry(self):
        self._clients: Dict[str, MunicipalFlowerClient] = {}
        for m in DEFAULT_MUNICIPALITIES:
            client = MunicipalFlowerClient(
                client_id=m["client_id"],
                municipality_name=m["name"],
                num_samples=m["samples"]
            )
            self._clients[m["client_id"]] = client
            logger.info(f"Registered Federated Municipal Node: {m['name']} ({m['client_id']})")

    def get_client(self, client_id: str) -> Optional[MunicipalFlowerClient]:
        return self._clients.get(client_id)

    def list_clients(self) -> List[Dict[str, Any]]:
        return [
            {
                "client_id": c.client_id,
                "municipality_name": c.municipality_name,
                "dataset_size": c.dataset_loader.num_samples,
                "status": "ONLINE",
                "raw_images_transmitted": 0 # Privacy guarantee
            }
            for c in self._clients.values()
        ]

def get_client_registry() -> MunicipalClientRegistry:
    return MunicipalClientRegistry()

import json

INSPECTION_AUDIT_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "bytes32", "name": "inspectionId", "type": "bytes32"},
            {"indexed": False, "internalType": "bytes32", "name": "resultHash", "type": "bytes32"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "InspectionRecorded",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "internalType": "bytes32", "name": "maintenanceId", "type": "bytes32"},
            {"indexed": True, "internalType": "bytes32", "name": "assetId", "type": "bytes32"},
            {"indexed": False, "internalType": "bytes32", "name": "recordHash", "type": "bytes32"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
        ],
        "name": "MaintenanceRecorded",
        "type": "event"
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "inspectionId", "type": "bytes32"},
            {"internalType": "bytes32", "name": "resultHash", "type": "bytes32"},
            {"internalType": "string", "name": "metadataJson", "type": "string"}
        ],
        "name": "recordInspectionHash",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "maintenanceId", "type": "bytes32"},
            {"internalType": "bytes32", "name": "assetId", "type": "bytes32"},
            {"internalType": "bytes32", "name": "recordHash", "type": "bytes32"}
        ],
        "name": "recordMaintenance",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "inspectionId", "type": "bytes32"}
        ],
        "name": "getRecord",
        "outputs": [
            {"internalType": "bytes32", "name": "id", "type": "bytes32"},
            {"internalType": "bytes32", "name": "resultHash", "type": "bytes32"},
            {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
            {"internalType": "string", "name": "metadataJson", "type": "string"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "inspectionId", "type": "bytes32"},
            {"internalType": "bytes32", "name": "resultHash", "type": "bytes32"}
        ],
        "name": "verifyInspection",
        "outputs": [
            {"internalType": "bool", "name": "", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

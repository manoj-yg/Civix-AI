// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InspectionAudit
 * @dev Immutable audit log smart contract for CIVIX AI Infrastructure Intelligence Platform.
 * Records SHA-256 canonical hashes of inspection results and maintenance activities.
 */
contract InspectionAudit {
    address public owner;

    struct AuditRecord {
        bytes32 inspectionId;
        bytes32 resultHash;
        uint256 timestamp;
        string metadataJson;
    }

    struct MaintenanceRecordEntry {
        bytes32 maintenanceId;
        bytes32 assetId;
        bytes32 recordHash;
        uint256 timestamp;
    }

    mapping(bytes32 => AuditRecord) private inspectionRecords;
    mapping(bytes32 => MaintenanceRecordEntry) private maintenanceRecords;

    event InspectionRecorded(
        bytes32 indexed inspectionId,
        bytes32 resultHash,
        uint256 timestamp
    );

    event MaintenanceRecorded(
        bytes32 indexed maintenanceId,
        bytes32 indexed assetId,
        bytes32 recordHash,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can execute this action");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function recordInspectionHash(
        bytes32 inspectionId,
        bytes32 resultHash,
        string calldata metadataJson
    ) external onlyOwner {
        require(inspectionRecords[inspectionId].timestamp == 0, "Record already exists");

        inspectionRecords[inspectionId] = AuditRecord({
            inspectionId: inspectionId,
            resultHash: resultHash,
            timestamp: block.timestamp,
            metadataJson: metadataJson
        });

        emit InspectionRecorded(inspectionId, resultHash, block.timestamp);
    }

    function recordMaintenance(
        bytes32 maintenanceId,
        bytes32 assetId,
        bytes32 recordHash
    ) external onlyOwner {
        require(maintenanceRecords[maintenanceId].timestamp == 0, "Maintenance record already exists");

        maintenanceRecords[maintenanceId] = MaintenanceRecordEntry({
            maintenanceId: maintenanceId,
            assetId: assetId,
            recordHash: recordHash,
            timestamp: block.timestamp
        });

        emit MaintenanceRecorded(maintenanceId, assetId, recordHash, block.timestamp);
    }

    function verifyInspection(
        bytes32 inspectionId,
        bytes32 resultHash
    ) external view returns (bool) {
        AuditRecord memory rec = inspectionRecords[inspectionId];
        if (rec.timestamp == 0) {
            return false;
        }
        return rec.resultHash == resultHash;
    }

    function getRecord(
        bytes32 inspectionId
    ) external view returns (
        bytes32 id,
        bytes32 resultHash,
        uint256 timestamp,
        string memory metadataJson
    ) {
        AuditRecord memory rec = inspectionRecords[inspectionId];
        require(rec.timestamp > 0, "Inspection record not found");
        return (rec.inspectionId, rec.resultHash, rec.timestamp, rec.metadataJson);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ExecutorSend} from "wormhole-solidity-sdk/Executor/Integration.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {CONSISTENCY_LEVEL_INSTANT} from "wormhole-solidity-sdk/constants/ConsistencyLevel.sol";

contract PriceFeedSender is ExecutorSend, AccessControl, Pausable {
    bytes32 public constant PEER_ADMIN_ROLE = keccak256("PEER_ADMIN_ROLE");
    bytes32 public constant PRICE_FEED_ROLE = keccak256("PRICE_FEED_ROLE");

    struct TargetChainParams {
        uint16 chainId;
        uint128 gasLimit;
        uint256 totalCost;
        bytes signedQuote;
    }

    mapping(uint16 => bytes32) public peers;
    mapping(string => uint256) public prices;

    event PricesUpdated(uint256 count, uint16 targetChain, uint64 sequence);
    event LocalPricesStored(string[] tokenNames, uint256[] prices);

    error ArrayLengthMismatch();
    error EmptyArray();
    error InsufficientValue();

    constructor(address coreBridge, address executor) ExecutorSend(coreBridge, executor) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PEER_ADMIN_ROLE, msg.sender);
        _grantRole(PRICE_FEED_ROLE, msg.sender);
    }

    function _getPeer(uint16 chainId) internal view override returns (bytes32) {
        return peers[chainId];
    }

    function setPeer(uint16 chainId, bytes32 peerAddress) external onlyRole(PEER_ADMIN_ROLE) {
        peers[chainId] = peerAddress;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function updatePrices(
        string[] calldata tokenNames,
        uint256[] calldata pricesArray,
        TargetChainParams[] calldata targets
    ) external payable onlyRole(PRICE_FEED_ROLE) whenNotPaused {
        // Cache array lengths for gas optimization
        uint256 tokensLength = tokenNames.length;
        uint256 targetsLength = targets.length;

        // Validation
        if (tokensLength != pricesArray.length) revert ArrayLengthMismatch();
        if (tokensLength == 0) revert EmptyArray();
        if (targetsLength == 0) revert EmptyArray();

        // Calculate total cost needed
        uint256 totalCostNeeded = 0;
        for (uint256 i = 0; i < targetsLength;) {
            totalCostNeeded += targets[i].totalCost;
            unchecked {
                ++i;
            }
        }
        if (msg.value != totalCostNeeded) revert InsufficientValue();

        // Store all prices locally
        for (uint256 i = 0; i < tokensLength;) {
            prices[tokenNames[i]] = pricesArray[i];
            unchecked {
                ++i;
            }
        }
        emit LocalPricesStored(tokenNames, pricesArray);

        // Encode the batch price update as bytes (arrays of tokenNames and prices)
        bytes memory payload = abi.encode(tokenNames, pricesArray);

        // Send to each target chain
        uint64[] memory sequences = new uint64[](targetsLength);
        for (uint256 i = 0; i < targetsLength;) {
            // Publish and relay the message to the target chain
            sequences[i] = _publishAndRelay(
                payload,
                CONSISTENCY_LEVEL_INSTANT,
                targets[i].totalCost,
                targets[i].chainId,
                msg.sender, // refund address
                targets[i].signedQuote,
                targets[i].gasLimit,
                0, // no msg.value forwarding
                "" // no extra relay instructions
            );

            emit PricesUpdated(tokensLength, targets[i].chainId, sequences[i]);

            unchecked {
                ++i;
            }
        }
    }
}

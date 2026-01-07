// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ExecutorSend} from "wormhole-solidity-sdk/Executor/Integration.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {CONSISTENCY_LEVEL_INSTANT} from "wormhole-solidity-sdk/constants/ConsistencyLevel.sol";

contract PriceFeedSender is ExecutorSend, AccessControl {
    bytes32 public constant PEER_ADMIN_ROLE = keccak256("PEER_ADMIN_ROLE");
    bytes32 public constant PRICE_FEED_ROLE = keccak256("PRICE_FEED_ROLE");

    mapping(uint16 => bytes32) public peers;
    mapping(string => uint256) public prices;

    event PricesUpdated(uint256 count, uint16 targetChain, uint64 sequence);
    event LocalPricesStored(string[] tokenNames, uint256[] prices);

    error ArrayLengthMismatch();
    error EmptyArray();

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

    function updatePrices(
        string[] calldata tokenNames,
        uint256[] calldata pricesArray,
        uint16 targetChain,
        uint128 gasLimit,
        uint256 totalCost,
        bytes calldata signedQuote
    ) external payable onlyRole(PRICE_FEED_ROLE) returns (uint64 sequence) {
        uint256 length = tokenNames.length;
        if (length == 0) {
            revert EmptyArray();
        }
        if (length != pricesArray.length) {
            revert ArrayLengthMismatch();
        }

        // Store all prices locally
        for (uint256 i = 0; i < length; i++) {
            prices[tokenNames[i]] = pricesArray[i];
        }
        emit LocalPricesStored(tokenNames, pricesArray);

        // Encode the batch price update as bytes (arrays of tokenNames and prices)
        bytes memory payload = abi.encode(tokenNames, pricesArray);

        // Publish and relay the message to the target chain
        sequence = _publishAndRelay(
            payload,
            CONSISTENCY_LEVEL_INSTANT,
            totalCost,
            targetChain,
            msg.sender, // refund address
            signedQuote,
            gasLimit,
            0, // no msg.value forwarding
            "" // no extra relay instructions
        );

        emit PricesUpdated(length, targetChain, sequence);
    }
}

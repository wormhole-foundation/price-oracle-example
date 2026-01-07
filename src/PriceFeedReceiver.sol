// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ExecutorReceive} from "wormhole-solidity-sdk/Executor/Integration.sol";
import {SequenceReplayProtectionLib} from "wormhole-solidity-sdk/libraries/ReplayProtection.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract PriceFeedReceiver is ExecutorReceive, AccessControl {
    using SequenceReplayProtectionLib for *;

    bytes32 public constant PEER_ADMIN_ROLE = keccak256("PEER_ADMIN_ROLE");

    mapping(uint16 => bytes32) public peers;
    mapping(string => uint256) public prices;

    event PricesReceived(uint256 count, uint16 senderChain, bytes32 sender);

    error NoValueAllowed();
    error ArrayLengthMismatch();
    error EmptyArray();

    constructor(address coreBridge) ExecutorReceive(coreBridge) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PEER_ADMIN_ROLE, msg.sender);
    }

    function _getPeer(uint16 chainId) internal view override returns (bytes32) {
        return peers[chainId];
    }

    function setPeer(uint16 chainId, bytes32 peerAddress) external onlyRole(PEER_ADMIN_ROLE) {
        peers[chainId] = peerAddress;
    }

    function _replayProtect(
        uint16 emitterChainId,
        bytes32 emitterAddress,
        uint64 sequence,
        bytes calldata /* encodedVaa */
    )
        internal
        override
    {
        SequenceReplayProtectionLib.replayProtect(emitterChainId, emitterAddress, sequence);
    }

    function _executeVaa(
        bytes calldata payload,
        uint32,
        /* timestamp */
        uint16 peerChain,
        bytes32 peerAddress,
        uint64,
        /* sequence */
        uint8 /* consistencyLevel */
    )
        internal
        override
    {
        if (msg.value > 0) {
            revert NoValueAllowed();
        }

        // Decode array format
        (string[] memory tokenNames, uint256[] memory pricesArray) = abi.decode(payload, (string[], uint256[]));

        uint256 length = tokenNames.length;
        if (length == 0) {
            revert EmptyArray();
        }
        if (length != pricesArray.length) {
            revert ArrayLengthMismatch();
        }

        // Store all prices
        for (uint256 i = 0; i < length; i++) {
            prices[tokenNames[i]] = pricesArray[i];
        }

        emit PricesReceived(length, peerChain, peerAddress);
    }
}

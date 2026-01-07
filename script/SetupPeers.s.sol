// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console} from "forge-std/Script.sol";
import {PriceFeedSender} from "../src/PriceFeedSender.sol";
import {PriceFeedReceiver} from "../src/PriceFeedReceiver.sol";
import {ChainIdHelper} from "./utils/ChainIdHelper.sol";
import {toUniversalAddress} from "wormhole-solidity-sdk/Utils.sol";

contract SetupPeersScript is Script {
    function setUp() public {}

    function run() public {
        uint256 chainId = block.chainid;
        address localContract;
        address remoteContract;
        uint256 remoteEvmChainId;
        uint16 remoteChainId;

        // Sepolia (chainId: 11155111) -> setup Base Sepolia and Polygon Amoy receivers as peers
        if (chainId == 11155111) {
            localContract = vm.envAddress("PRICE_FEED_SEPOLIA");
            remoteContract = vm.envAddress("PRICE_FEED_BASE_SEPOLIA");
            remoteEvmChainId = 84532; // Base Sepolia EVM chain ID
        }
        // Base Sepolia (chainId: 84532) -> setup Sepolia sender as peer
        else if (chainId == 84532) {
            localContract = vm.envAddress("PRICE_FEED_BASE_SEPOLIA");
            remoteContract = vm.envAddress("PRICE_FEED_SEPOLIA");
            remoteEvmChainId = 11155111; // Sepolia EVM chain ID
        }
        // Polygon Amoy (chainId: 80002) -> setup Sepolia sender as peer
        else if (chainId == 80002) {
            localContract = vm.envAddress("PRICE_FEED_POLYGON_AMOY");
            remoteContract = vm.envAddress("PRICE_FEED_SEPOLIA");
            remoteEvmChainId = 11155111; // Sepolia EVM chain ID
        } else {
            revert("Unsupported chain");
        }

        // Convert EVM chain ID to Wormhole chain ID
        remoteChainId = ChainIdHelper.toWormholeChainId(remoteEvmChainId);

        console.log("Setting up peer on chain ID:", chainId);
        console.log("Local contract:", localContract);
        console.log("Remote contract:", remoteContract);
        console.log("Remote Wormhole chain ID:", remoteChainId);

        // Convert address to Wormhole Universal Address format using SDK
        bytes32 peerAddress = toUniversalAddress(remoteContract);

        vm.startBroadcast();

        if (chainId == 11155111) {
            // Sepolia - setup sender
            PriceFeedSender sender = PriceFeedSender(localContract);
            sender.setPeer(remoteChainId, peerAddress);
        } else if (chainId == 84532 || chainId == 80002) {
            // Base Sepolia or Polygon Amoy - setup receiver
            PriceFeedReceiver receiver = PriceFeedReceiver(localContract);
            receiver.setPeer(remoteChainId, peerAddress);
        }

        console.log("Peer set successfully!");
        console.log("Peer address (bytes32):", vm.toString(peerAddress));

        vm.stopBroadcast();
    }
}

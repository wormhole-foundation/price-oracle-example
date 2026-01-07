// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console} from "forge-std/Script.sol";
import {PriceFeedReceiver} from "../src/PriceFeedReceiver.sol";

contract DeployPriceFeedReceiver is Script {
    PriceFeedReceiver public priceFeedReceiver;

    function setUp() public {}

    function run() public {
        uint256 chainId = block.chainid;
        address coreBridge;

        // Base Sepolia (EVM chainId: 84532, Wormhole chainId: 10004)
        if (chainId == 84532) {
            coreBridge = 0x79A1027a6A159502049F10906D333EC57E95F083;
        }
        // Sepolia (EVM chainId: 11155111, Wormhole chainId: 10002)
        else if (chainId == 11155111) {
            coreBridge = 0x4a8bc80Ed5a4067f1CCf107057b8270E0cC11A78;
        }
        // Allow env override for other chains
        else {
            coreBridge = vm.envAddress("CORE_BRIDGE_ADDRESS");
        }

        vm.startBroadcast();
        priceFeedReceiver = new PriceFeedReceiver(coreBridge);
        console.log("PriceFeedReceiver deployed at:", address(priceFeedReceiver));
        console.log("CoreBridge:", coreBridge);
        vm.stopBroadcast();

        // Verification info (run separately with --verify flag)
        console.log("\nTo verify, run:");
        console.log("forge verify-contract");
        console.log("  --chain-id", chainId);
        console.log("  --constructor-args $(cast abi-encode 'constructor(address)'", coreBridge, ")");
        console.log("  --etherscan-api-key <API_KEY>");
        console.log("  --watch");
        console.log("  ", address(priceFeedReceiver));
        console.log("  src/PriceFeedReceiver.sol:PriceFeedReceiver");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console} from "forge-std/Script.sol";
import {PriceFeedSender} from "../src/PriceFeedSender.sol";

contract DeployPriceFeedSender is Script {
    PriceFeedSender public priceFeedSender;

    function setUp() public {}

    function run() public {
        uint256 chainId = block.chainid;
        address coreBridge;
        address executor;

        // Sepolia (EVM chainId: 11155111, Wormhole chainId: 10002)
        if (chainId == 11155111) {
            coreBridge = 0x4a8bc80Ed5a4067f1CCf107057b8270E0cC11A78;
            executor = 0xD0fb39f5a3361F21457653cB70F9D0C9bD86B66B;
        }
        // Base Sepolia (EVM chainId: 84532, Wormhole chainId: 10004)
        else if (chainId == 84532) {
            coreBridge = 0x79A1027a6A159502049F10906D333EC57E95F083;
            executor = 0x51B47D493CBA7aB97e3F8F163D6Ce07592CE4482;
        }
        // Polygon Amoy (EVM chainId: 80002, Wormhole chainId: 10007)
        else if (chainId == 80002) {
            coreBridge = 0x6b9C8671cdDC8dEab9c719bB87cBd3e782bA6a35;
            executor = 0x7056721C33De437f0997F67BC87521cA86b721d3;
        }
        // Allow env override for other chains
        else {
            coreBridge = vm.envAddress("CORE_BRIDGE_ADDRESS");
            executor = vm.envAddress("EXECUTOR_ADDRESS");
        }

        vm.startBroadcast();
        priceFeedSender = new PriceFeedSender(coreBridge, executor);
        console.log("PriceFeedSender deployed at:", address(priceFeedSender));
        console.log("CoreBridge:", coreBridge);
        console.log("Executor:", executor);
        vm.stopBroadcast();

        // Verification info (run separately with --verify flag)
        console.log("\nTo verify, run:");
        console.log("forge verify-contract");
        console.log("  --chain-id", chainId);
        console.log("  --constructor-args $(cast abi-encode 'constructor(address,address)'", coreBridge, executor, ")");
        console.log("  --etherscan-api-key <API_KEY>");
        console.log("  --watch");
        console.log("  ", address(priceFeedSender));
        console.log("  src/PriceFeedSender.sol:PriceFeedSender");
    }
}

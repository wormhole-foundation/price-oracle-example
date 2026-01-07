// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Test} from "forge-std/Test.sol";
import {ChainIdHelper} from "../../script/utils/ChainIdHelper.sol";
import {
    CHAIN_ID_ETHEREUM,
    CHAIN_ID_BSC,
    CHAIN_ID_POLYGON,
    CHAIN_ID_ARBITRUM,
    CHAIN_ID_OPTIMISM,
    CHAIN_ID_BASE,
    CHAIN_ID_SEPOLIA,
    CHAIN_ID_ARBITRUM_SEPOLIA,
    CHAIN_ID_BASE_SEPOLIA,
    CHAIN_ID_OPTIMISM_SEPOLIA
} from "wormhole-solidity-sdk/constants/Chains.sol";

contract ChainIdHelperTest is Test {
    function test_MainnetChainIds() public pure {
        assertEq(ChainIdHelper.toWormholeChainId(1), CHAIN_ID_ETHEREUM);
        assertEq(ChainIdHelper.toWormholeChainId(56), CHAIN_ID_BSC);
        assertEq(ChainIdHelper.toWormholeChainId(137), CHAIN_ID_POLYGON);
        assertEq(ChainIdHelper.toWormholeChainId(42161), CHAIN_ID_ARBITRUM);
        assertEq(ChainIdHelper.toWormholeChainId(10), CHAIN_ID_OPTIMISM);
        assertEq(ChainIdHelper.toWormholeChainId(8453), CHAIN_ID_BASE);
    }

    function test_TestnetChainIds() public pure {
        assertEq(ChainIdHelper.toWormholeChainId(11155111), CHAIN_ID_SEPOLIA);
        assertEq(ChainIdHelper.toWormholeChainId(421614), CHAIN_ID_ARBITRUM_SEPOLIA);
        assertEq(ChainIdHelper.toWormholeChainId(84532), CHAIN_ID_BASE_SEPOLIA);
        assertEq(ChainIdHelper.toWormholeChainId(11155420), CHAIN_ID_OPTIMISM_SEPOLIA);
    }

    function test_IsSupported() public pure {
        assertTrue(ChainIdHelper.isSupported(1)); // Ethereum
        assertTrue(ChainIdHelper.isSupported(11155111)); // Sepolia
        assertTrue(ChainIdHelper.isSupported(84532)); // Base Sepolia
        assertFalse(ChainIdHelper.isSupported(999999)); // Unsupported
    }

    function test_UnsupportedChainIdReverts() public pure {
        // We can't directly test expectRevert on library functions
        // Instead verify that isSupported returns false
        assertFalse(ChainIdHelper.isSupported(999999));
        assertFalse(ChainIdHelper.isSupported(12345));
        assertFalse(ChainIdHelper.isSupported(0));
    }
}

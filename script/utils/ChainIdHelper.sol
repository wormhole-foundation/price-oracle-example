// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {
    CHAIN_ID_ETHEREUM,
    CHAIN_ID_BSC,
    CHAIN_ID_POLYGON,
    CHAIN_ID_AVALANCHE,
    CHAIN_ID_FANTOM,
    CHAIN_ID_KLAYTN,
    CHAIN_ID_CELO,
    CHAIN_ID_MOONBEAM,
    CHAIN_ID_ARBITRUM,
    CHAIN_ID_OPTIMISM,
    CHAIN_ID_BASE,
    CHAIN_ID_SCROLL,
    CHAIN_ID_MANTLE,
    CHAIN_ID_XLAYER,
    CHAIN_ID_LINEA,
    CHAIN_ID_BERACHAIN,
    CHAIN_ID_SEIEVM,
    CHAIN_ID_UNICHAIN,
    CHAIN_ID_WORLDCHAIN,
    CHAIN_ID_INK,
    CHAIN_ID_HYPER_EVM,
    CHAIN_ID_MONAD,
    CHAIN_ID_MEZO,
    CHAIN_ID_FOGO,
    CHAIN_ID_SONIC,
    CHAIN_ID_CONVERGE,
    CHAIN_ID_PLUME,
    CHAIN_ID_XRPLEVM,
    CHAIN_ID_PLASMA,
    CHAIN_ID_SEPOLIA,
    CHAIN_ID_ARBITRUM_SEPOLIA,
    CHAIN_ID_BASE_SEPOLIA,
    CHAIN_ID_OPTIMISM_SEPOLIA,
    CHAIN_ID_POLYGON_SEPOLIA
} from "wormhole-solidity-sdk/constants/Chains.sol";

/**
 * @title ChainIdHelper
 * @notice Utility library to convert EVM chain IDs to Wormhole chain IDs
 * @dev This helper maps standard EVM chain IDs (block.chainid) to their corresponding
 *      Wormhole chain IDs as defined in the Wormhole protocol.
 */
library ChainIdHelper {
    error UnsupportedChainId(uint256 evmChainId);

    /**
     * @notice Internal helper that returns 0 for unsupported chains
     * @param evmChainId The EVM chain ID (block.chainid)
     * @return wormholeChainId The corresponding Wormhole chain ID, or 0 if unsupported
     */
    function _toWormholeChainIdUnchecked(uint256 evmChainId) private pure returns (uint16 wormholeChainId) {
        // Mainnet chains
        if (evmChainId == 1) return CHAIN_ID_ETHEREUM; // Ethereum Mainnet
        if (evmChainId == 56) return CHAIN_ID_BSC; // BSC
        if (evmChainId == 137) return CHAIN_ID_POLYGON; // Polygon
        if (evmChainId == 43114) return CHAIN_ID_AVALANCHE; // Avalanche C-Chain
        if (evmChainId == 250) return CHAIN_ID_FANTOM; // Fantom
        if (evmChainId == 8217) return CHAIN_ID_KLAYTN; // Klaytn
        if (evmChainId == 42220) return CHAIN_ID_CELO; // Celo
        if (evmChainId == 1284) return CHAIN_ID_MOONBEAM; // Moonbeam
        if (evmChainId == 42161) return CHAIN_ID_ARBITRUM; // Arbitrum One
        if (evmChainId == 10) return CHAIN_ID_OPTIMISM; // Optimism
        if (evmChainId == 8453) return CHAIN_ID_BASE; // Base
        if (evmChainId == 534352) return CHAIN_ID_SCROLL; // Scroll
        if (evmChainId == 5000) return CHAIN_ID_MANTLE; // Mantle
        if (evmChainId == 196) return CHAIN_ID_XLAYER; // X Layer
        if (evmChainId == 59144) return CHAIN_ID_LINEA; // Linea
        if (evmChainId == 80084) return CHAIN_ID_BERACHAIN; // Berachain Bartio (testnet)
        if (evmChainId == 1329) return CHAIN_ID_SEIEVM; // Sei EVM
        if (evmChainId == 1301) return CHAIN_ID_UNICHAIN; // Unichain
        if (evmChainId == 480) return CHAIN_ID_WORLDCHAIN; // World Chain
        if (evmChainId == 57073) return CHAIN_ID_INK; // Ink
        if (evmChainId == 998) return CHAIN_ID_HYPER_EVM; // Hyper EVM
        if (evmChainId == 41454) return CHAIN_ID_MONAD; // Monad
        if (evmChainId == 686) return CHAIN_ID_MEZO; // Mezo
        if (evmChainId == 4294967168) return CHAIN_ID_FOGO; // Fogo
        if (evmChainId == 146) return CHAIN_ID_SONIC; // Sonic
        if (evmChainId == 35011) return CHAIN_ID_CONVERGE; // Converge
        if (evmChainId == 98865) return CHAIN_ID_PLUME; // Plume
        if (evmChainId == 1440002) return CHAIN_ID_XRPLEVM; // XRP EVM
        if (evmChainId == 21) return CHAIN_ID_PLASMA; // Plasma

        // Testnet chains
        if (evmChainId == 11155111) return CHAIN_ID_SEPOLIA; // Sepolia
        if (evmChainId == 421614) return CHAIN_ID_ARBITRUM_SEPOLIA; // Arbitrum Sepolia
        if (evmChainId == 84532) return CHAIN_ID_BASE_SEPOLIA; // Base Sepolia
        if (evmChainId == 11155420) return CHAIN_ID_OPTIMISM_SEPOLIA; // Optimism Sepolia
        if (evmChainId == 80002) return CHAIN_ID_POLYGON_SEPOLIA; // Polygon Amoy (Sepolia equivalent)

        return 0; // Unsupported chain
    }

    /**
     * @notice Converts an EVM chain ID to its corresponding Wormhole chain ID
     * @param evmChainId The EVM chain ID (block.chainid)
     * @return wormholeChainId The corresponding Wormhole chain ID
     * @dev Reverts with UnsupportedChainId if the chain is not supported
     */
    function toWormholeChainId(uint256 evmChainId) internal pure returns (uint16 wormholeChainId) {
        wormholeChainId = _toWormholeChainIdUnchecked(evmChainId);
        if (wormholeChainId == 0) {
            revert UnsupportedChainId(evmChainId);
        }
    }

    /**
     * @notice Checks if an EVM chain ID is supported
     * @param evmChainId The EVM chain ID to check
     * @return supported True if the chain is supported
     */
    function isSupported(uint256 evmChainId) internal pure returns (bool supported) {
        return _toWormholeChainIdUnchecked(evmChainId) != 0;
    }
}

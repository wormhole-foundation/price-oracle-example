/**
 * Wormhole address utilities
 */

/**
 * Convert EVM address to Wormhole universal address (bytes32)
 * Pads the address with zeros on the left to create a 32-byte value
 */
export function toUniversalAddress(address: string): string {
    return '0x' + address.slice(2).padStart(64, '0');
}

/**
 * Convert Wormhole universal address to EVM address
 * Extracts the last 20 bytes (40 hex chars) from the universal address
 */
export function fromUniversalAddress(universalAddress: string): string {
    return '0x' + universalAddress.slice(-40);
}

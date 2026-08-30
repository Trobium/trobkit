export const ADDRESS_SIZE = 34;
export const ADDRESS_PREFIX = '41';
export const ADDRESS_PREFIX_BYTE = 0x41;
export const ADDRESS_PREFIX_REGEX = /^(41)/;

export const TROBIUM_BIP39_PATH_PREFIX = "m/44'/195'";
export const TROBIUM_BIP39_PATH_INDEX_0 = TROBIUM_BIP39_PATH_PREFIX + "/0'/0/0";

/** Smallest unit: 1 TROB = 1_000_000 TROBI */
export const TROBI_PER_TROB = 1_000_000;

/** Trobium elects 21 Super Representatives (vs Tron's 27). Enforced by the chain; exposed for clients. */
export const SUPER_REPRESENTATIVE_COUNT = 21;
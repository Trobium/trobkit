import { HttpProvider, providers } from './lib/providers/index.js';
import type { Providers } from './lib/providers/index.js';
import utils from './utils/index.js';
import { BigNumber } from 'bignumber.js';
import EventEmitter from 'eventemitter3';
import semver from 'semver';

import { TransactionBuilder } from './lib/TransactionBuilder/TransactionBuilder.js';
import { Trob } from './lib/trob.js';
import { Contract } from './lib/contract/index.js';
import { Plugin } from './lib/plugin.js';
import { Event } from './lib/event.js';
import { keccak256 } from './utils/ethersUtils.js';
import { fromHex, fromPrivateKey, isAddress, toHex, toChecksumAddress, isChecksumAddress } from './utils/address.js';
import { TROBI_PER_TROB } from './utils/constants.js';
import { HeadersType } from './types/Providers.js';
import { isString } from './utils/validations.js';
import { DefaultAddress, NodeProvider, TrobkitOptions, IBigNumber } from './types/Trobkit.js';
import { ContractAbiInterface, ContractInstance } from './types/ABI.js';
import { Address } from './types/Trob.js';

const DEFAULT_VERSION = '4.7.1';

const FEE_LIMIT = 150000000;

const version = '1.0.2';

function isValidOptions(options: unknown): options is TrobkitOptions {
    return (
        !!options &&
        typeof options === 'object' &&
        (!!(options as TrobkitOptions).fullNode || !!(options as TrobkitOptions).fullHost)
    );
}

export class Trobkit extends EventEmitter {
    providers: Providers;
    BigNumber: typeof BigNumber;
    transactionBuilder: TransactionBuilder;
    trob: Trob;
    plugin: Plugin;
    event: Event;
    version: typeof Trobkit.version;
    static version = version;
    utils: typeof utils;

    defaultBlock: number | false | 'earliest' | 'latest';
    defaultPrivateKey: string | false;
    defaultAddress: DefaultAddress;
    fullnodeVersion: string;
    feeLimit: number;

    fullNode!: HttpProvider;
    solidityNode!: HttpProvider;
    eventServer?: HttpProvider;

    constructor(options: TrobkitOptions);
    constructor(fullNode: NodeProvider, solidityNode: NodeProvider, eventServer?: NodeProvider, privateKey?: string);
    /* prettier-ignore */
    constructor(fullNode: NodeProvider, solidityNode: NodeProvider, eventServer: NodeProvider, privateKey?: string);
    constructor(
        options: TrobkitOptions | NodeProvider,
        solidityNode: NodeProvider = '',
        eventServer?: NodeProvider,
        privateKey = ''
    ) {
        super();

        let fullNode;
        let headers: HeadersType | false = false;
        let eventHeaders: HeadersType | false = false;

        if (isValidOptions(options)) {
            fullNode = options.fullNode || options.fullHost;
            solidityNode = (options.solidityNode || options.fullHost)!;
            eventServer = (options.eventServer || options.fullHost)!;
            headers = options.headers || false;
            eventHeaders = options.eventHeaders || headers;
            privateKey = options.privateKey!;
        } else {
            fullNode = options;
        }
        if (utils.isString(fullNode)) fullNode = new providers.HttpProvider(fullNode);

        if (utils.isString(solidityNode)) solidityNode = new providers.HttpProvider(solidityNode);

        if (utils.isString(eventServer)) eventServer = new providers.HttpProvider(eventServer);

        this.event = new Event(this);
        this.transactionBuilder = new TransactionBuilder(this);
        this.trob = new Trob(this);
        this.plugin = new Plugin(this, {
            disablePlugins: isValidOptions(options) ? options.disablePlugins : false,
        });
        this.utils = utils;

        this.setFullNode(fullNode as HttpProvider);
        this.setSolidityNode(solidityNode as HttpProvider);
        this.setEventServer(eventServer!);

        this.providers = providers;
        this.BigNumber = BigNumber;

        this.defaultBlock = false;
        this.defaultPrivateKey = false;
        this.defaultAddress = {
            hex: false,
            base58: false,
        };

        this.version = Trobkit.version;
        this.sha3 = Trobkit.sha3;
        this.fromUtf8 = Trobkit.fromUtf8;
        this.address = Trobkit.address;
        this.toAscii = Trobkit.toAscii;
        this.toUtf8 = Trobkit.toUtf8;
        this.isAddress = Trobkit.isAddress;
        this.fromAscii = Trobkit.fromAscii;
        this.toHex = Trobkit.toHex;
        this.toBigNumber = Trobkit.toBigNumber;
        this.toDecimal = Trobkit.toDecimal;
        this.fromDecimal = Trobkit.fromDecimal;
        this.toTrobi = Trobkit.toTrobi;
        this.fromTrobi = Trobkit.fromTrobi;
        this.createAccount = Trobkit.createAccount;
        this.createRandom = Trobkit.createRandom;
        this.fromMnemonic = Trobkit.fromMnemonic;

        if (privateKey) this.setPrivateKey(privateKey);
        this.fullnodeVersion = DEFAULT_VERSION;
        this.feeLimit = FEE_LIMIT;

        if (headers) {
            this.setFullNodeHeader(headers);
        }

        if (eventHeaders) {
            this.setEventHeader(eventHeaders);
        }
    }

    async getFullnodeVersion() {
        try {
            const nodeInfo = await this.trob.getNodeInfo();
            this.fullnodeVersion = nodeInfo.configNodeInfo.codeVersion;
            if (this.fullnodeVersion.split('.').length === 2) {
                this.fullnodeVersion += '.0';
            }
        } catch (err) {
            this.fullnodeVersion = DEFAULT_VERSION;
        }
    }

    setDefaultBlock(blockID: false | 'latest' | 'earliest' | number = false) {
        if ([false, 'latest', 'earliest', 0].includes(blockID)) {
            return (this.defaultBlock = blockID);
        }

        if (!utils.isInteger(blockID) || !blockID) throw new Error('Invalid block ID provided');

        return (this.defaultBlock = Math.abs(blockID));
    }

    setPrivateKey(privateKey: string) {
        try {
            this.setAddress(Trobkit.address.fromPrivateKey(privateKey) as string);
        } catch {
            throw new Error('Invalid private key provided');
        }

        this.defaultPrivateKey = privateKey.replace(/^0x/, '');
    }

    setAddress(address: string) {
        if (!Trobkit.isAddress(address)) throw new Error('Invalid address provided');

        const hex = Trobkit.address.toHex(address);
        const base58 = Trobkit.address.fromHex(address);

        if (this.defaultPrivateKey && Trobkit.address.fromPrivateKey(this.defaultPrivateKey) !== base58)
            this.defaultPrivateKey = false;

        this.defaultAddress = {
            hex,
            base58,
        };

        // @deprecated - this emit will be removed in a future version
        this.emit('addressChanged', { hex, base58 });
    }

    fullnodeSatisfies(version: string) {
        return semver.satisfies(this.fullnodeVersion, version);
    }

    isValidProvider(provider: unknown) {
        return Object.values(providers).some((knownProvider) => provider instanceof knownProvider);
    }

    setFullNode(fullNode: HttpProvider | string) {
        if (isString(fullNode)) fullNode = new providers.HttpProvider(fullNode);

        if (!this.isValidProvider(fullNode)) throw new Error('Invalid full node provided');

        this.fullNode = fullNode;
        this.fullNode.setStatusPage('wallet/getnowblock');
    }

    setSolidityNode(solidityNode: HttpProvider | string) {
        if (utils.isString(solidityNode)) solidityNode = new providers.HttpProvider(solidityNode);

        if (!this.isValidProvider(solidityNode)) throw new Error('Invalid solidity node provided');

        this.solidityNode = solidityNode;
        this.solidityNode.setStatusPage('walletsolidity/getnowblock');
    }

    setEventServer(eventServer: NodeProvider, healthcheck?: string) {
        this.event.setServer(eventServer, healthcheck);
    }

    setHeader(headers = {}) {
        const fullNode = new providers.HttpProvider(this.fullNode.host, 30000, '', '', headers);
        const solidityNode = new providers.HttpProvider(this.solidityNode.host, 30000, '', '', headers);
        const eventServer = new providers.HttpProvider(this.eventServer!.host, 30000, '', '', headers);

        this.setFullNode(fullNode);
        this.setSolidityNode(solidityNode);
        this.setEventServer(eventServer);
    }

    setFullNodeHeader(headers = {}) {
        const fullNode = new providers.HttpProvider(this.fullNode.host, 30000, '', '', headers);
        const solidityNode = new providers.HttpProvider(this.solidityNode.host, 30000, '', '', headers);

        this.setFullNode(fullNode);
        this.setSolidityNode(solidityNode);
    }

    setEventHeader(headers = {}) {
        const eventServer = new providers.HttpProvider(this.eventServer!.host, 30000, '', '', headers);
        this.setEventServer(eventServer);
    }

    currentProviders() {
        return {
            fullNode: this.fullNode,
            solidityNode: this.solidityNode,
            eventServer: this.eventServer,
        };
    }

    currentProvider() {
        return this.currentProviders();
    }

    getEventResult(...params: Parameters<Event['getEventsByContractAddress']>): ReturnType<Event['getEventsByContractAddress']> {
        return this.event.getEventsByContractAddress(...params);
    }

    getEventByTransactionID(
        ...params: Parameters<Event['getEventsByTransactionID']>
    ): ReturnType<Event['getEventsByTransactionID']> {
        return this.event.getEventsByTransactionID(...params);
    }

    contract<Abi extends ContractAbiInterface>(abi: Abi = [] as any, address?: Address): ContractInstance<Abi> {
        return new Contract<Abi>(this, abi, address!) as ContractInstance<Abi>;
    }

    address: typeof Trobkit.address;
    static get address() {
        return {
            fromHex(address: string) {
                return fromHex(address);
            },
            toHex(address: string) {
                return toHex(address);
            },
            toChecksumAddress(address: string) {
                return toChecksumAddress(address);
            },
            isChecksumAddress(address: string) {
                return isChecksumAddress(address);
            },
            fromPrivateKey(privateKey: string, strict = false) {
                return fromPrivateKey(privateKey, strict);
            },
        };
    }

    sha3: typeof Trobkit.sha3;
    static sha3(string: string, prefix = true) {
        return (prefix ? '0x' : '') + keccak256(new TextEncoder().encode(string)).toString().substring(2);
    }

    toHex: typeof Trobkit.toHex;
    static toHex(val: string | number | boolean | Record<string | number | symbol, unknown> | unknown[] | IBigNumber) {
        if (utils.isBoolean(val)) return Trobkit.fromDecimal(+val);

        if (utils.isBigNumber(val)) return Trobkit.fromDecimal(val);

        if (typeof val === 'object') return Trobkit.fromUtf8(JSON.stringify(val));

        if (utils.isString(val)) {
            if (/^(-|)0x/.test(val)) return val;

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (!isFinite(val) || /^\s*$/.test(val)) return Trobkit.fromUtf8(val);
        }

        const result = Trobkit.fromDecimal(val as number);
        if (result === '0xNaN') {
            throw new Error('The passed value is not convertible to a hex string');
        } else {
            return result;
        }
    }

    toUtf8: typeof Trobkit.toUtf8;
    static toUtf8(hex: string) {
        if (utils.isHex(hex)) {
            hex = hex.replace(/^0x/, '');
            return new TextDecoder().decode(new Uint8Array(utils.code.hexStr2byteArray(hex)));
        } else {
            throw new Error('The passed value is not a valid hex string');
        }
    }

    fromUtf8: typeof Trobkit.fromUtf8;
    static fromUtf8(string: string) {
        if (!utils.isString(string)) {
            throw new Error('The passed value is not a valid utf-8 string');
        }
        return '0x' + utils.bytes.byteArray2hexStr(new TextEncoder().encode(string)).toLowerCase();
    }

    toAscii: typeof Trobkit.toAscii;
    static toAscii(hex: string) {
        if (utils.isHex(hex)) {
            let str = '';
            let i = 0;
            const l = hex.length;
            if (hex.substring(0, 2) === '0x') {
                i = 2;
            }
            for (; i < l; i += 2) {
                const code = parseInt(hex.substr(i, 2), 16);
                str += String.fromCharCode(code);
            }
            return str;
        } else {
            throw new Error('The passed value is not a valid hex string');
        }
    }

    fromAscii: typeof Trobkit.fromAscii;
    static fromAscii(string: string, padding?: number) {
        if (!utils.isString(string)) {
            throw new Error('The passed value is not a valid utf-8 string');
        }
        const bytes = new Uint8Array(string.length);
        for (let i = 0; i < string.length; i++) bytes[i] = string.charCodeAt(i) & 0xff;
        return '0x' + utils.bytes.byteArray2hexStr(bytes).toLowerCase().padEnd(padding!, '0');
    }

    toDecimal: typeof Trobkit.toDecimal;
    static toDecimal(value: string | number | IBigNumber) {
        return Trobkit.toBigNumber(value).toNumber();
    }

    fromDecimal: typeof Trobkit.fromDecimal;
    static fromDecimal(value: number | IBigNumber) {
        const number = Trobkit.toBigNumber(value);
        const result = number.toString(16);

        return number.isLessThan(0) ? '-0x' + result.substr(1) : '0x' + result;
    }

    fromTrobi: typeof Trobkit.fromTrobi;
    static fromTrobi(trobi: number): string | IBigNumber {
        const trob = Trobkit.toBigNumber(trobi).div(TROBI_PER_TROB);
        return utils.isBigNumber(trobi) ? trob : trob.toString(10);
    }

    toTrobi: typeof Trobkit.toTrobi;
    static toTrobi(trob: number): string | IBigNumber {
        const trobi = Trobkit.toBigNumber(trob).times(TROBI_PER_TROB);
        return utils.isBigNumber(trob) ? trobi : trobi.toString(10);
    }

    toBigNumber: typeof Trobkit.toBigNumber;
    static toBigNumber(amount: string | number | IBigNumber = 0): IBigNumber {
        if (utils.isBigNumber(amount)) return amount;

        if (utils.isString(amount) && /^(-|)0x/.test(amount)) return new BigNumber(amount.replace('0x', ''), 16);

        return new BigNumber(amount.toString(10), 10);
    }

    isAddress: typeof Trobkit.isAddress;
    static isAddress(address: unknown = ''): boolean {
        return isAddress(address);
    }

    createAccount: typeof Trobkit.createAccount;
    static async createAccount() {
        const account = utils.accounts.generateAccount();

        return account;
    }

    createRandom: typeof Trobkit.createRandom;
    static createRandom(
        ...params: Parameters<(typeof utils)['accounts']['generateRandom']>
    ): ReturnType<(typeof utils)['accounts']['generateRandom']> {
        const account = utils.accounts.generateRandom(...params);

        return account;
    }

    fromMnemonic: typeof Trobkit.fromMnemonic;
    static fromMnemonic(
        ...params: Parameters<(typeof utils)['accounts']['generateAccountWithMnemonic']>
    ): ReturnType<(typeof utils)['accounts']['generateAccountWithMnemonic']> {
        const account = utils.accounts.generateAccountWithMnemonic(...params);

        return account;
    }

    async isConnected() {
        return {
            fullNode: await this.fullNode.isConnected(),
            solidityNode: await this.solidityNode.isConnected(),
            eventServer: this.eventServer && (await this.eventServer.isConnected()),
        };
    }
}
export default Trobkit;

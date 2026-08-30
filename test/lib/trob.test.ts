/* eslint-disable @typescript-eslint/ban-ts-comment */
import { assert } from 'chai';
import assertThrow from '../helpers/assertThrow.js';
import wait from '../helpers/wait.js';
import broadcaster from '../helpers/broadcaster.js';
import trobkitBuilder from '../helpers/trobkitBuilder.js';
import { Trobkit, Trob } from '../setup/Trobkit.js';
import waitChainData from '../helpers/waitChainData.js';
import signMessageTests from '../testcases/src/sign-message.js';
import config from '../helpers/config.js';
import { Address, Exchange, Proposal, Token } from '../../src/types/Trob.js';
import { CreateSmartContractTransaction, SignedTransaction, Transaction } from '../../src/types/Transaction.js';
import { Permission } from '../../src/types/Contract.js';
import contracts from '../fixtures/contracts.js';
import { createEmptyBlock } from '../helpers/createEmptyBlock.js';
const tests = signMessageTests.tests;
const testRevertContract = contracts.testRevert;
const { ADDRESS_BASE58, PRIVATE_KEY, getTokenOptions, FULL_NODE_API } = config;

describe('Trobkit.trob', function () {
    let accounts: {
        hex: Address[];
        b58: Address[];
        pks: string[];
    };
    let trobkit: Trobkit;

    before(async function () {
        trobkit = trobkitBuilder.createInstance();
        // ALERT this works only with Trobium Quickstart:
        accounts = await trobkitBuilder.getTestAccounts(-1);
    });

    // Contrstuctor Test
    describe('#constructor()', function () {
        it('should have been set a full instance in trobkit', function () {
            assert.instanceOf(trobkit.trob, Trob);
        });
    });

    // Account Test
    describe('#Account Test', function () {
        describe('#getAccount', async function () {
            const idx = 10;

            it('should get account by hex or base58 address', async function () {
                const addressType = ['hex', 'b58'];
                let account;
                for (const type of addressType) {
                    account = await trobkit.trob.getAccount(accounts[type as keyof typeof accounts][idx]);
                    assert.equal(account.address, accounts.hex[idx]);
                }
            });

            it('should throw address is not valid error', async function () {
                await assertThrow(trobkit.trob.getAccount('notAnAddress'), 'Invalid address provided');
            });
        });

        describe('#getAccountById', async function () {
            const idx = 11;
            let accountId: string;

            before(async function () {
                this.timeout(10000);
                accountId = Trobkit.toHex(`testtest${Math.ceil(Math.random() * 100)}`);
                const transaction = await trobkit.transactionBuilder.setAccountId(accountId, accounts.hex[idx]);
                await broadcaster(null, accounts.pks[idx], transaction);
            });

            it('should get confirmed account by id', async function () {
                this.timeout(20000);

                while (true) {
                    const account = await trobkit.trob.getAccountById(accountId);
                    if (Object.keys(account).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        assert.equal(account.account_id, accountId.slice(2));
                        break;
                    }
                }
            });

            it('should throw accountId is not valid error', async function () {
                const ids = ['', '12', '616161616262626231313131313131313131313131313131313131313131313131313131313131'];
                for (const id of ids) {
                    await assertThrow(trobkit.trob.getAccountById(id), 'Invalid accountId provided');
                }
            });
        });

        describe('#getAccountResources', async function () {
            const idx = 10;

            it('should get account resource by hex or base58 address', async function () {
                const addressType = ['hex', 'b58'];
                let accountResource;
                for (const type of addressType) {
                    accountResource = await trobkit.trob.getAccountResources(accounts[type as keyof typeof accounts][idx]);
                    assert.isDefined(accountResource.freeNetLimit);
                    assert.isDefined(accountResource.TotalEnergyLimit);
                }
            });

            it('should throw address is not valid error', async function () {
                await assertThrow(trobkit.trob.getAccountResources('notAnAddress'), 'Invalid address provided');
            });
        });

        describe('#getDelegatedResourceV2', async function () {
            const idx = 10;

            before(async function () {
                const transaction2 = await trobkit.transactionBuilder.freezeBalanceV2(100e6, 'BANDWIDTH', accounts.hex[idx]);
                await broadcaster(null, accounts.pks[idx], transaction2);
                const transaction = await trobkit.transactionBuilder.delegateResource(
                    10e6,
                    accounts.hex[idx + 1],
                    'BANDWIDTH',
                    accounts.hex[idx]
                );
                await broadcaster(null, accounts.pks[idx], transaction);
                await wait(10);
            });

            it('should get the resource delegation information', async function () {
                const addressType = ['hex', 'b58'];
                let delegationInfo;
                for (const type of addressType) {
                    delegationInfo = await trobkit.trob.getDelegatedResourceV2(
                        accounts[type as keyof typeof accounts][idx],
                        accounts[type as keyof typeof accounts][idx + 1]
                    );
                    assert.isDefined(delegationInfo.delegatedResource);
                }
            });

            it('should get the resource delegation information when confirmed is true', async function () {
                const delegationInfo = await trobkit.trob.getDelegatedResourceV2(accounts['hex'][idx], accounts['hex'][idx + 1], {
                    confirmed: true,
                });
                assert.isDefined(delegationInfo.delegatedResource);
            });

            it('should get the resource delegation information when confirmed is false', async function () {
                const delegationInfo = await trobkit.trob.getDelegatedResourceV2(accounts['hex'][idx], accounts['hex'][idx + 1], {
                    confirmed: false,
                });
                assert.isDefined(delegationInfo.delegatedResource);
            });

            it('should not throw error when fromAddress and toAddress are omitted', async function () {
                await trobkit.trob.getDelegatedResourceV2();
            });

            it('should not throw error when toAddress is omitted', async function () {
                await trobkit.trob.getDelegatedResourceV2(accounts['hex'][idx]);
            });

            it('should not throw error when options is omitted', async function () {
                await trobkit.trob.getDelegatedResourceV2(accounts['hex'][idx], accounts['hex'][idx + 1]);
            });

            it('should throw origin address is not valid error', async function () {
                await assertThrow(trobkit.trob.getDelegatedResourceV2('notAnAddress'), 'Invalid address provided');
            });

            it('should throw receiver address is not valid error', async function () {
                await assertThrow(
                    trobkit.trob.getDelegatedResourceV2(accounts.hex[idx], 'notAnAddress'),
                    'Invalid address provided'
                );
            });
        });

        describe('#getDelegatedResourceAccountIndexV2', async function () {
            const idx = 10;

            before(async function () {
                const transaction2 = await trobkit.transactionBuilder.freezeBalanceV2(100e6, 'BANDWIDTH');
                await broadcaster(null, PRIVATE_KEY, transaction2);
                const transaction = await trobkit.transactionBuilder.delegateResource(
                    10e6,
                    accounts.hex[idx],
                    'BANDWIDTH',
                    trobkit.defaultAddress.hex as string
                );
                await broadcaster(null, PRIVATE_KEY, transaction);
                await wait(10); // wait for solidity
            });

            it('should get the resource delegation account information', async function () {
                const addressType = ['hex', 'b58'];
                let delegationInfo;
                for (const type of addressType) {
                    delegationInfo = await trobkit.trob.getDelegatedResourceAccountIndexV2(
                        accounts[type as keyof typeof accounts][idx]
                    );
                    assert.isDefined(delegationInfo.account);
                    assert.isArray(delegationInfo.toAccounts);
                }
            });

            it('should get the resource delegation account information when options is omitted', async function () {
                const delegationInfo = await trobkit.trob.getDelegatedResourceAccountIndexV2(accounts.hex[idx]);
                assert.isDefined(delegationInfo.account);
                assert.isArray(delegationInfo.toAccounts);
            });

            it('should get the resource delegation account information when confirmed is true', async function () {
                const delegationInfo = await trobkit.trob.getDelegatedResourceAccountIndexV2(accounts['hex'][idx], {
                    confirmed: true,
                });
                assert.isDefined(delegationInfo.account);
                assert.isArray(delegationInfo.toAccounts);
            });

            it('should get the resource delegation account information when confirmed is false', async function () {
                const delegationInfo = await trobkit.trob.getDelegatedResourceAccountIndexV2(accounts['hex'][idx], {
                    confirmed: false,
                });
                assert.isDefined(delegationInfo.account);
                assert.isArray(delegationInfo.toAccounts);
            });

            it('should get the resource delegation account information when origin address is omitted', async function () {
                const delegationInfo = await trobkit.trob.getDelegatedResourceAccountIndexV2();
                assert.isDefined(delegationInfo.account);
                assert.isArray(delegationInfo.toAccounts);
            });

            it('should throw address is not valid error', async function () {
                await assertThrow(trobkit.trob.getDelegatedResourceAccountIndexV2('notAnAddress'), 'Invalid address provided');
            });
        });

        describe('#getCanDelegatedMaxSize', async function () {
            const idx = 10;

            before(async function () {
                const transaction2 = await trobkit.transactionBuilder.freezeBalanceV2(10e6, 'ENERGY', accounts.hex[idx]);
                await broadcaster(null, accounts.pks[idx], transaction2);
                await wait(60); // wait for solidity
            });

            it('should get the max resource can delegate', async function () {
                const addressType = ['hex', 'b58'];
                for (const type of addressType) {
                    const { max_size } = await trobkit.trob.getCanDelegatedMaxSize(
                        accounts[type as keyof typeof accounts][idx],
                        'ENERGY'
                    );
                    assert.isNumber(max_size);
                }
            });

            it('should get the max resource can delegate when options is omitted', async function () {
                const { max_size } = await trobkit.trob.getCanDelegatedMaxSize(accounts.hex[idx], 'ENERGY');
                assert.isNumber(max_size);
            });

            it('should get the max resource can delegate when confirmed is true', async function () {
                const { max_size } = await trobkit.trob.getCanDelegatedMaxSize(accounts['hex'][idx], 'ENERGY', {
                    confirmed: true,
                });
                assert.isNumber(max_size);
            });

            it('should get the max resource can delegate when confirmed is false', async function () {
                const { max_size } = await trobkit.trob.getCanDelegatedMaxSize(accounts['hex'][idx], 'ENERGY', {
                    confirmed: false,
                });
                assert.isNumber(max_size);
            });

            it('should get the max resource can delegate when resource type is omitted', async function () {
                const { max_size } = await trobkit.trob.getCanDelegatedMaxSize(accounts['hex'][idx]);
                assert.isNumber(max_size);
            });

            it('should get the max resource can delegate when address and resource type are omitted', async function () {
                const { max_size } = await trobkit.trob.getCanDelegatedMaxSize();
                assert.isNumber(max_size);
            });

            it('should throw address is not valid error', async function () {
                await assertThrow(trobkit.trob.getCanDelegatedMaxSize('notAnAddress'), 'Invalid address provided');
            });

            it('should throw resource type is not valid error', async function () {
                await assertThrow(
                    // @ts-ignore
                    trobkit.trob.getCanDelegatedMaxSize(accounts.hex[idx], 'abc'),
                    'Invalid resource provided: Expected "BANDWIDTH" or "ENERGY"'
                );
            });
        });

        describe('#getAvailableUnfreezeCount', async function () {
            const idx = 10;

            it('should get the times user can do UnFreezeBalanceV2', async function () {
                const addressType = ['hex', 'b58'];
                for (const type of addressType) {
                    const { count } = await trobkit.trob.getAvailableUnfreezeCount(accounts[type as keyof typeof accounts][idx]);
                    assert.isNumber(count);
                }
            });

            it('should get the times user can do UnFreezeBalanceV2 when options is omitted', async function () {
                const { count } = await trobkit.trob.getAvailableUnfreezeCount(accounts.hex[idx]);
                assert.isNumber(count);
            });

            it('should get the times user can do UnFreezeBalanceV2 when confirmed is true', async function () {
                const { count } = await trobkit.trob.getAvailableUnfreezeCount(accounts['hex'][idx], { confirmed: true });
                assert.isNumber(count);
            });

            it('should get the times user can do UnFreezeBalanceV2 when confirmed is false', async function () {
                const { count } = await trobkit.trob.getAvailableUnfreezeCount(accounts['hex'][idx], { confirmed: false });
                assert.isNumber(count);
            });

            it('should get the times user can do UnFreezeBalanceV2 when address is omitted', async function () {
                const { count } = await trobkit.trob.getAvailableUnfreezeCount();
                assert.isNumber(count);
            });

            it('should throw address is not valid error', async function () {
                await assertThrow(trobkit.trob.getAvailableUnfreezeCount('notAnAddress'), 'Invalid address provided');
            });
        });

        describe('#getCanWithdrawUnfreezeAmount', async function () {
            const idx = 11;

            before(async function () {
                const transaction2 = await trobkit.transactionBuilder.freezeBalanceV2(100e6, 'ENERGY', accounts.hex[idx]);
                await broadcaster(null, accounts.pks[idx], transaction2);
                const transaction = await trobkit.transactionBuilder.unfreezeBalanceV2(10e6, 'ENERGY', accounts.hex[idx]);
                await broadcaster(null, accounts.pks[idx], transaction);

                const transaction3 = await trobkit.transactionBuilder.freezeBalanceV2(100e6, 'ENERGY');
                await broadcaster(null, PRIVATE_KEY, transaction3);
                const transaction4 = await trobkit.transactionBuilder.unfreezeBalanceV2(
                    10e6,
                    'ENERGY',
                    trobkit.defaultAddress.hex as Address
                );
                await broadcaster(null, PRIVATE_KEY, transaction4);
                await wait(65);
            });

            it('should get the amount of a widrawUnfreeze operation', async function () {
                const addressType = ['hex', 'b58'];
                for (const type of addressType) {
                    const { amount } = await trobkit.trob.getCanWithdrawUnfreezeAmount(
                        accounts[type as keyof typeof accounts][idx],
                        Date.now()
                    );
                    assert.isNumber(amount);
                }
            });

            it('should get the amount of a widrawUnfreeze operation when options is omitted', async function () {
                const { amount } = await trobkit.trob.getCanWithdrawUnfreezeAmount(accounts.hex[idx], Date.now());
                assert.isNumber(amount);
            });

            it('should get the amount of a widrawUnfreeze operation when confirmed is true', async function () {
                const { amount } = await trobkit.trob.getCanWithdrawUnfreezeAmount(accounts['hex'][idx], Date.now(), {
                    confirmed: true,
                });
                assert.isNumber(amount);
            });

            it('should get the amount of a widrawUnfreeze operation when confirmed is false', async function () {
                const { amount } = await trobkit.trob.getCanWithdrawUnfreezeAmount(accounts['hex'][idx], Date.now(), {
                    confirmed: false,
                });
                assert.isNumber(amount);
            });

            it('should get the amount of a widrawUnfreeze operation when address and timestamp are omitted', async function () {
                const { amount } = await trobkit.trob.getCanWithdrawUnfreezeAmount();
                assert.isNumber(amount);
            });

            it('should throw address is not valid error', async function () {
                await assertThrow(
                    trobkit.trob.getCanWithdrawUnfreezeAmount('notAnAddress', Date.now()),
                    'Invalid address provided'
                );
            });

            it('should throw timestamp is not valid error', async function () {
                await assertThrow(trobkit.trob.getCanWithdrawUnfreezeAmount(accounts.hex[idx], -1), 'Invalid timestamp provided');
            });
        });

        describe('#getBalance', async function () {
            const idx = 10;

            it('should get balance by hex or base58 address', async function () {
                const addressType = ['hex', 'b58'];
                let balance;
                for (const type of addressType) {
                    balance = await trobkit.trob.getBalance(accounts[type as keyof typeof accounts][idx]);
                    assert.isTrue(balance >= 0);
                }
            });
        });

        describe('#getBandwidth', async function () {
            const idx = 10;

            it('should get bandwith by hex or base58 address', async function () {
                const addressType = ['hex', 'b58'];
                let bp;
                for (const type of addressType) {
                    bp = await trobkit.trob.getBandwidth(accounts[type as keyof typeof accounts][idx]);
                    assert.isTrue(bp >= 0);
                }
            });
        });

        describe('#getUnconfirmedAccount', async function () {
            const idx = 11;
            let toHex: Address;

            before(async function () {
                this.timeout(10000);

                const account = await trobkit.createAccount();
                toHex = account.address.hex;
                const transaction = await trobkit.transactionBuilder.sendTrob(account.address.hex, 10e5, accounts.hex[idx]);
                await broadcaster(null, accounts.pks[idx], transaction);
                await waitChainData('account', account.address.hex);
            });

            it('should get unconfirmed account by address', async function () {
                const account = await trobkit.trob.getUnconfirmedAccount(toHex);
                assert.equal(account.address, toHex.toLowerCase());
            });

            it('should throw address is not valid error', async function () {
                await assertThrow(trobkit.trob.getUnconfirmedAccount('notAnAddress'), 'Invalid address provided');
            });
        });

        describe('#geUnconfirmedAccountById', async function () {
            const idx = 10;

            let accountId: string;

            before(async function () {
                this.timeout(10000);
                accountId = Trobkit.toHex(`testtest${Math.ceil(Math.random() * 100)}`);
                const transaction = await trobkit.transactionBuilder.setAccountId(accountId, accounts.hex[idx]);
                await broadcaster(null, accounts.pks[idx], transaction);
                await waitChainData('accountById', accountId);
            });

            it('should get unconfirmed account by id', async function () {
                const account = await trobkit.trob.getUnconfirmedAccountById(accountId);
                assert.equal(account.account_id, accountId.slice(2));
            });

            it('should throw accountId is not valid error', async function () {
                const ids = ['', '12', '616161616262626231313131313131313131313131313131313131313131313131313131313131'];
                for (const id of ids) {
                    await assertThrow(trobkit.trob.getUnconfirmedAccountById(id), 'Invalid accountId provided');
                }
            });
        });

        describe('#getUnconfirmedBalance', async function () {
            const idx = 12;
            let toHex: Address;

            before(async function () {
                this.timeout(10000);

                const account = await trobkit.createAccount();
                toHex = account.address.hex;
                const transaction = await trobkit.transactionBuilder.sendTrob(account.address.hex, 10e5, accounts.hex[idx]);
                await broadcaster(null, accounts.pks[idx], transaction);
                await waitChainData('account', account.address.hex);
            });

            it('should get unconfirmed balance by account address', async function () {
                const balance = await trobkit.trob.getUnconfirmedBalance(toHex);
                assert.equal(balance, 10e5);
            });
        });

        describe('#updateAccount', async function () {
            const idx = 13;

            it('should update account name', async function () {
                const accountName = Math.random().toString(36).substr(2);
                await trobkit.trob.updateAccount(accountName, { privateKey: accounts.pks[idx], address: accounts.hex[idx] });
                const account = await trobkit.trob.getUnconfirmedAccount(accounts.hex[idx]);
                assert.equal(trobkit.toUtf8(account.account_name), accountName);
            });

            it('should throw name must be a string error', async function () {
                await assertThrow(trobkit.trob.updateAccount(''), 'Name must be a string');
            });
        });
    });

    // Signature Test
    describe('#Sign Test', function () {
        describe('#sign', async function () {
            const idx = 14;
            let transaction: Transaction;

            beforeEach(async function () {
                transaction = await trobkit.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[idx]);
            });

            it('should sign a transaction', async function () {
                const signedTransaction = await trobkit.trob.sign(transaction, accounts.pks[idx]);
                assert.equal(signedTransaction.txID, transaction.txID);
                assert.equal(signedTransaction.signature.length, 1);
            });

            it('should throw transaction is already signed error', async function () {
                const signedTransaction = await trobkit.trob.sign(transaction, accounts.pks[idx]);
                await assertThrow(trobkit.trob.sign(signedTransaction, accounts.pks[idx]), 'Transaction is already signed');
            });

            it('should throw private key does not match address error', async function () {
                await assertThrow(
                    trobkit.trob.sign(transaction, accounts.pks[idx + 1]),
                    'Private key does not match address in transaction'
                );
            });

            it('should throw Invalid transaction', async function () {
                transaction.raw_data_hex += '00';
                await assertThrow(trobkit.trob.sign(transaction, accounts.pks[idx]), 'Invalid transaction');
            });
        });

        describe('#ecRecover', async function () {
            const idx = 14;
            let transaction: SignedTransaction;

            before(async function () {
                const tx = await trobkit.transactionBuilder.sendTrob(accounts.b58[idx - 1], 10, accounts.b58[idx]);
                transaction = await trobkit.trob.sign(tx, accounts.pks[idx]);
            });

            it('should verify signature of signed transaction', async function () {
                const recoveredAddress = trobkit.trob.ecRecover(transaction);
                assert.equal(recoveredAddress, accounts.b58[idx]);
            });

            it('should verify signatures of signed transaction', async function () {
                transaction = await trobkit.trob.multiSign(transaction, accounts.pks[idx + 1]);
                const recoveredAddresses = trobkit.trob.ecRecover(transaction);
                for (let i = 0; i < recoveredAddresses.length; i++) {
                    assert.equal(recoveredAddresses[i], accounts.b58[idx+i]);
                }
            });

            it('should throw Invalid transaction error', async function () {
                const tx = JSON.parse(JSON.stringify(transaction));
                tx.txID += 't';
                try {
                    trobkit.trob.ecRecover(tx);
                } catch (e: any) {
                    assert.equal(e.message, 'Invalid transaction');
                }
            });

            it('should throw Transaction is not signed error', async function () {
                const tx = JSON.parse(JSON.stringify(transaction));
                delete tx.signature;
                try {
                    trobkit.trob.ecRecover(tx);
                } catch (e: any) {
                    assert.equal(e.message, 'Transaction is not signed');
                }
            });
        });

        describe('#signMessage', async function () {
            const idx = 14;

            it('should sign a hex string message', async function () {
                const hexMsg = '0xe66f4c8f323229131006ad3e4a2ca65dfdf339f0';
                const signedMsg = await trobkit.trob.sign(hexMsg, accounts.pks[idx]);
                assert.isTrue(signedMsg.startsWith('0x'));
            });

            it('should throw expected hex message input error', async function () {
                const hexMsg = 'xxe66f4c8f323229131006ad3e4a2ca65dfdf339f0';
                await assertThrow(
                    trobkit.trob.sign(hexMsg, accounts.pks[idx]),
                    'Expected hex message input'
                );
            });
        });

        describe('#verifyMessage', async function () {
            const idx = 14;
            let hexMsg: string;
            let signedMsg: string;

            before(async function () {
                hexMsg = '0xe66f4c8f323229131006ad3e4a2ca65dfdf339f0';
                signedMsg = await trobkit.trob.sign(hexMsg, accounts.pks[idx], undefined, false);
            });

            it('should verify signature of signed string message', async function () {
                const result = await trobkit.trob.verifyMessage(hexMsg, signedMsg, accounts.hex[idx], undefined);
                assert.isTrue(result);
            });

            it('should throw expected hex message input error', async function () {
                await assertThrow(
                    trobkit.trob.verifyMessage(
                        'xxe66f4c8f323229131006ad3e4a2ca65dfdf339f0',
                        signedMsg,
                        accounts.hex[idx],
                        undefined
                    ),
                    'Expected hex message input'
                );
            });

            it('should throw signature does not match error', async function () {
                const fakeSig =
                    '0xafd220c015fd38ffcd34455ddf4f11d20549d9565f558dd84b508c37854727887879d62e675a285c0caf' +
                    'a34ea7814b0ae5b74835bdfb612205deb8b97d7c24811c';
                await assertThrow(
                    trobkit.trob.verifyMessage(hexMsg, fakeSig, accounts.hex[idx], undefined),
                    'Signature does not match'
                );
            });
        });

        describe('#signTypedData', async function () {
            // All properties on a domain are optional
            const domain = {
                name: 'TrcToken Test',
                version: '1',
                chainId: '0xd698d4192c56cb6be724a558448e2684802de4d6cd8690dc',
                verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
            };

            // The named list of all type definitions
            const types = {
                FromPerson: [
                    { name: 'name', type: 'string' },
                    { name: 'wallet', type: 'address' },
                    { name: 'trcTokenId', type: 'trcToken' },
                ],
                ToPerson: [
                    { name: 'name', type: 'string' },
                    { name: 'wallet', type: 'address' },
                    { name: 'trcTokenArr', type: 'trcToken[]' },
                ],
                Mail: [
                    { name: 'from', type: 'FromPerson' },
                    { name: 'to', type: 'ToPerson' },
                    { name: 'contents', type: 'string' },
                    { name: 'tAddr', type: 'address[]' },
                    { name: 'trcTokenId', type: 'trcToken' },
                    { name: 'trcTokenArr', type: 'trcToken[]' },
                ],
            };

            // The data to sign
            const value = {
                from: {
                    name: 'Cow',
                    wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                    trcTokenId: '1002000',
                },
                to: {
                    name: 'Bob',
                    wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
                    trcTokenArr: ['1002000', '1002000'],
                },
                contents: 'Hello, Bob!',
                tAddr: ['0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB', '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB'],
                trcTokenId: '1002000',
                trcTokenArr: ['1002000', '1002000'],
            };

            it('should sign typed data', async function () {
                const signature = trobkit.trob.signTypedData(domain, types, value);
                const result = trobkit.trob.verifyTypedData(domain, types, value, signature);

                // assert.equal(signature, '0xb98a61f301a383be6b078fa602ebdd76294302e6bab51cd4bcb3e4f241e7cae662ac21b2e95d8db637fa5db9dd38f2e7d1236e8f2ed3ee1d0e80bac641578f191c');
                assert.isTrue(result);

                const signature2 = trobkit.trob.signTypedData(domain, types, value);
                const result2 = trobkit.trob.verifyTypedData(domain, types, value, signature);
                assert.isTrue(signature2.startsWith('0x'));
                assert.isTrue(result2);
            });

            it('should sign typed data with private key', function () {
                const idx = 14;

                const signature = Trob.signTypedData(domain, types, value, accounts.pks[idx]);

                const tDomain = {
                    ...domain,
                    verifyingContract: 'TUe6BwpA7sVTDKaJQoia7FWZpC9sK8WM2t',
                };
                const tValue = {
                    ...value,
                    from: {
                        ...value.from,
                        wallet: 'TUg28KYvCXWW81EqMUeZvCZmZw2BChk1HQ',
                    },
                    to: {
                        ...value.to,
                        wallet: 'TT5rFsXYCrnzdE2q1WdR9F2SuVY59A4hoM',
                    },
                    tAddr: ['TT5rFsXYCrnzdE2q1WdR9F2SuVY59A4hoM', 'TT5rFsXYCrnzdE2q1WdR9F2SuVY59A4hoM'],
                };
                const tSignature = Trob.signTypedData(tDomain, types, tValue, accounts.pks[idx]);

                const result = Trob.verifyTypedData(domain, types, value, signature, accounts.b58[idx]);

                assert.isTrue(signature.startsWith('0x'));
                assert.equal(tSignature, signature);
                assert.isTrue(result);
            });

            it('should throw signature does not match error', function () {
                const idx = 14;

                try {
                    const signature = Trob.signTypedData(domain, types, value, accounts.pks[idx - 1]);
                    trobkit.trob.verifyTypedData(domain, types, value, signature, accounts.b58[idx]);
                } catch (error: any) {
                    assert.equal(error.message, 'Signature does not match');
                }
            });
        });

        describe('#multiSignTransaction', async function () {
            const ownerIdx = 15;
            const idxS = 15;
            const idxE = 18;
            const threshold = 3;

            before(async function () {
                this.timeout(10000);
                // update account permission
                const ownerAddress = accounts.hex[ownerIdx];
                const ownerPk = accounts.pks[ownerIdx];
                const ownerPermission: Permission = {
                    type: 0,
                    permission_name: 'owner',
                    threshold,
                    keys: [],
                };
                const activePermission: Permission = {
                    type: 2,
                    permission_name: 'active0',
                    threshold,
                    operations: '7fff1fc0033ec107000000000000000000000000000000000000000000000000',
                    keys: [],
                };

                for (let i = idxS; i < idxE; i++) {
                    const address = accounts.hex[i];
                    const weight = 1;
                    ownerPermission.keys.push({ address: address, weight: weight });
                    activePermission.keys.push({ address: address, weight: weight });
                }

                const updateTransaction = await trobkit.transactionBuilder.updateAccountPermissions(
                    ownerAddress,
                    ownerPermission,
                    undefined,
                    [activePermission]
                );
                assert.isTrue(updateTransaction.txID && updateTransaction.txID.length === 64);

                // broadcast update transaction
                const signedUpdateTransaction = await trobkit.trob.sign(updateTransaction, ownerPk, undefined, false);
                await trobkit.trob.broadcast(signedUpdateTransaction);

                await wait(3);
            });

            it('should multi-sign a transaction by owner permission', async function () {
                const transaction = await trobkit.transactionBuilder.freezeBalanceV2(10e5, 'BANDWIDTH', accounts.b58[ownerIdx]);
                let signedTransaction = transaction as SignedTransaction;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await trobkit.trob.multiSign(signedTransaction, accounts.pks[i], 0);
                }

                assert.equal(signedTransaction.signature.length, 3);

                // broadcast multi-sign transaction
                const result = await trobkit.trob.broadcast(signedTransaction);
                assert.isTrue(result.result);
                await waitChainData('tx', result.transaction.txID);
                await wait(10);
            });

            it('should multi-sign a transaction by owner permission (permission id inside tx)', async function () {
                const transaction = await trobkit.transactionBuilder.freezeBalanceV2(10e5, 'BANDWIDTH', accounts.b58[ownerIdx], {
                    permissionId: 0,
                });
                let signedTransaction = transaction as SignedTransaction;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await trobkit.trob.multiSign(signedTransaction, accounts.pks[i]);
                }

                assert.equal(signedTransaction.signature.length, 3);

                // broadcast multi-sign transaction
                const result = await trobkit.trob.broadcast(signedTransaction);
                assert.isTrue(result.result);
                await waitChainData('tx', result.transaction.txID);
                await wait(10);
            });

            it('should verify weight after multi-sign by owner permission', async function () {
                // create transaction and do multi-sign
                const transaction = await trobkit.transactionBuilder.freezeBalanceV2(10e5, 'BANDWIDTH', accounts.b58[ownerIdx]);

                // sign and verify sign weight
                let signedTransaction = transaction as SignedTransaction;
                let signWeight;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await trobkit.trob.multiSign(signedTransaction, accounts.pks[i], 0);
                    signWeight = await trobkit.trob.getSignWeight(signedTransaction);
                    if (i < idxE - 1) {
                        assert.equal(signWeight.result.code, 'NOT_ENOUGH_PERMISSION');
                    }
                    assert.equal(signWeight.approved_list.length, i - idxS + 1);
                }

                // get approved list
                const approvedList = await trobkit.trob.getApprovedList(signedTransaction);
                assert.isTrue(approvedList.approved_list.length === threshold);

                // broadcast multi-sign transaction
                const result = await trobkit.trob.broadcast(signedTransaction);
                assert.isTrue(result.result);
                await waitChainData('tx', result.transaction.txID);
                await wait(10);
            });

            it('should verify weight after multi-sign by owner permission (permission id inside tx)', async function () {
                // create transaction and do multi-sign
                const transaction = await trobkit.transactionBuilder.freezeBalanceV2(10e5, 'BANDWIDTH', accounts.b58[ownerIdx], {
                    permissionId: 0,
                });

                // sign and verify sign weight
                let signedTransaction = transaction as SignedTransaction;
                let signWeight;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await trobkit.trob.multiSign(signedTransaction, accounts.pks[i]);
                    signWeight = await trobkit.trob.getSignWeight(signedTransaction);
                    if (i < idxE - 1) {
                        assert.equal(signWeight.result.code, 'NOT_ENOUGH_PERMISSION');
                    }
                    assert.equal(signWeight.approved_list.length, i - idxS + 1);
                }

                // get approved list
                const approvedList = await trobkit.trob.getApprovedList(signedTransaction);
                assert.isTrue(approvedList.approved_list.length === threshold);

                // broadcast multi-sign transaction
                const result = await trobkit.trob.broadcast(signedTransaction);
                assert.isTrue(result.result);
            });

            it('should multi-sign a transaction with no permission error by owner permission', async function () {
                const transaction = await trobkit.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx]);
                try {
                    await trobkit.trob.multiSign(transaction, accounts.pks[ownerIdx] + '123', 2);
                } catch (e: any) {
                    assert.isTrue(e.message.indexOf('has no permission to sign') != -1);
                }
            });

            it('should multi-sign duplicated a transaction by owner permission', async function () {
                const transaction = await trobkit.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx]);
                try {
                    const signedTransaction = await trobkit.trob.multiSign(transaction, accounts.pks[ownerIdx], 0);
                    await trobkit.trob.multiSign(signedTransaction, accounts.pks[ownerIdx], 0);
                } catch (e: any) {
                    assert.isTrue(e.message.indexOf('already sign transaction') != -1);
                }
            });

            it('should multi-sign a transaction by active permission', async function () {
                const transaction = await trobkit.transactionBuilder.freezeBalanceV2(10e5, 'BANDWIDTH', accounts.b58[ownerIdx]);
                let signedTransaction = transaction as SignedTransaction;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await trobkit.trob.multiSign(signedTransaction, accounts.pks[i], 2);
                }

                assert.equal(signedTransaction.signature.length, 3);

                // broadcast multi-sign transaction
                const result = await trobkit.trob.broadcast(signedTransaction);
                assert.isTrue(result.result);
                await waitChainData('tx', result.transaction.txID);
                await wait(10);
            });

            it('should multi-sign a transaction by active permission (permission id inside tx)', async function () {
                const transaction = await trobkit.transactionBuilder.freezeBalanceV2(10e5, 'BANDWIDTH', accounts.b58[ownerIdx], {
                    permissionId: 2,
                });
                let signedTransaction = transaction as SignedTransaction;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await trobkit.trob.multiSign(signedTransaction, accounts.pks[i]);
                }

                assert.equal(signedTransaction.signature.length, 3);

                // broadcast multi-sign transaction
                const result = await trobkit.trob.broadcast(signedTransaction);
                assert.isTrue(result.result);
                await waitChainData('tx', result.transaction.txID);
                await wait(10);
            });

            it('should verify weight after multi-sign by active permission', async function () {
                // create transaction and do multi-sign
                const transaction = await trobkit.transactionBuilder.freezeBalanceV2(10e5, 'BANDWIDTH', accounts.b58[ownerIdx]);

                // sign and verify sign weight
                let signedTransaction = transaction as SignedTransaction;
                let signWeight;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await trobkit.trob.multiSign(signedTransaction, accounts.pks[i], 2);
                    signWeight = await trobkit.trob.getSignWeight(signedTransaction, 2);
                    if (i < idxE - 1) {
                        assert.equal(signWeight.result.code, 'NOT_ENOUGH_PERMISSION');
                    }
                    assert.equal(signWeight.approved_list.length, i - idxS + 1);
                }

                // get approved list
                const approvedList = await trobkit.trob.getApprovedList(signedTransaction);
                assert.isTrue(approvedList.approved_list.length === threshold);

                // broadcast multi-sign transaction
                const result = await trobkit.trob.broadcast(signedTransaction);
                assert.isTrue(result.result);
                await waitChainData('tx', result.transaction.txID);
                await wait(10);
            });

            it('should verify weight after multi-sign by active permission (permission id inside tx)', async function () {
                // create transaction and do multi-sign
                const transaction = await trobkit.transactionBuilder.freezeBalanceV2(10e5, 'BANDWIDTH', accounts.b58[ownerIdx], {
                    permissionId: 2,
                });

                // sign and verify sign weight
                let signedTransaction = transaction as SignedTransaction;
                let signWeight;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await trobkit.trob.multiSign(signedTransaction, accounts.pks[i]);
                    signWeight = await trobkit.trob.getSignWeight(signedTransaction);
                    if (i < idxE - 1) {
                        assert.equal(signWeight.result.code, 'NOT_ENOUGH_PERMISSION');
                    }
                    assert.equal(signWeight.approved_list.length, i - idxS + 1);
                }

                // get approved list
                const approvedList = await trobkit.trob.getApprovedList(signedTransaction);
                assert.isTrue(approvedList.approved_list.length === threshold);

                // broadcast multi-sign transaction
                const result = await trobkit.trob.broadcast(signedTransaction);
                assert.isTrue(result.result);
            });

            it('should multi-sign a transaction with no permission error by active permission', async function () {
                const transaction = await trobkit.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx]);
                try {
                    await trobkit.trob.multiSign(transaction, accounts.pks[ownerIdx] + '123', 2);
                } catch (e: any) {
                    assert.isTrue(e.message.indexOf('has no permission to sign') != -1);
                }
            });

            it('should multi-sign duplicated a transaction by active permission', async function () {
                const transaction = await trobkit.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx]);
                try {
                    const signedTransaction = await trobkit.trob.multiSign(transaction, accounts.pks[ownerIdx], 2);
                    await trobkit.trob.multiSign(signedTransaction, accounts.pks[ownerIdx], 2);
                } catch (e: any) {
                    assert.isTrue(e.message.indexOf('already sign transaction') != -1);
                }
            });

            it('should multi-sign a transaction with permission error by both owner and active permission', async function () {
                try {
                    const transaction = await trobkit.transactionBuilder.freezeBalance(
                        10e5,
                        3,
                        'BANDWIDTH',
                        accounts.b58[ownerIdx]
                    );
                    const signedTransaction = await trobkit.trob.multiSign(transaction, accounts.pks[ownerIdx], 0);
                    await trobkit.trob.multiSign(signedTransaction, accounts.pks[ownerIdx], 2);
                } catch (e: any) {
                    assert.isTrue(e.message.indexOf('not contained of permission') != -1);
                }
            });

            it('should multi-sign a transaction with wrong permission id error', async function () {
                try {
                    const transaction = await trobkit.transactionBuilder.freezeBalance(
                        10e5,
                        3,
                        'BANDWIDTH',
                        accounts.b58[ownerIdx]
                    );
                    await trobkit.trob.multiSign(transaction, accounts.pks[ownerIdx], 1);
                } catch (e: any) {
                    assert.isTrue(
                        e.message.indexOf("permission isn't exit") != -1 ||
                            e.message.indexOf('Permission for this, does not exist!') != -1
                    );
                }
            });
        });
    });

    // Block Test
    describe('#Block Test', function () {
        describe('#getBlock', async function () {
            it('should get earliest or latest block', async function () {
                const earliestParentHash = '957dc2d350daecc7bb6a38f3938ebde0a0c1cedafe15f0edae4256a2907449f6';
                const blockType = ['earliest', 'latest'];
                let block;
                for (const type of blockType) {
                    block = await trobkit.trob.getBlock(type);
                    if (type === 'earliest') {
                        assert.equal(earliestParentHash, block.block_header.raw_data.parentHash);
                    }
                    if (type === 'latest') {
                        assert.isNumber(block.block_header.raw_data.number);
                    }
                }
            });

            it('should throw no block identifier provided error', async function () {
                await assertThrow(trobkit.trob.getBlock(false), 'No block identifier provided');
            });

            it('should throw block not found error', async function () {
                await assertThrow(trobkit.trob.getBlock(10e10), 'Block not found');
            });

            it('should throw invalid block number provided error', async function () {
                await assertThrow(trobkit.trob.getBlock(-1), 'Invalid block number provided');
            });
        });

        describe('#getBlockByHash', async function () {
            it('should get block by block hash (id)', async function () {
                const block = await trobkit.trob.getBlock('latest');
                const blockByHash = await trobkit.trob.getBlockByHash(block.blockID);
                assert.equal(block.blockID, blockByHash.blockID);
            });
        });

        describe('#getBlockByNumber', async function () {
            it('should get block by block number', async function () {
                const block = await trobkit.trob.getBlock('latest');
                const blockByNumber = await trobkit.trob.getBlockByNumber(block.block_header.raw_data.number);
                assert.equal(block.blockID, blockByNumber.blockID);
            });
        });

        describe('#getBlockRange', async function () {
            it('should get block by range', async function () {
                const blocks = await trobkit.trob.getBlockRange(0, 5);
                assert.equal(blocks.length, 6);
            });

            it('should get invalid start or end error by range', async function () {
                const ranges: [number, number, string][] = [
                    [-1, 5, 'start'],
                    [1, -5, 'end'],
                ];
                for (const range of ranges) {
                    await assertThrow(trobkit.trob.getBlockRange(range[0], range[1]), `Invalid ${range[2]} of range provided`);
                }
            });
        });

        describe('#getBlockTransactionCount', async function () {
            it("should get transaction count by block number, 'latest' or 'earliest'", async function () {
                const blockType = [1, 'latest', 'earliest'];
                for (const type of blockType) {
                    const count = await trobkit.trob.getBlockTransactionCount(type);
                    assert.isNumber(count);
                }
            });
        });

        describe('#getCurrentBlock', async function () {
            it('should get current block', async function () {
                const block = await trobkit.trob.getCurrentBlock();
                assert.isNumber(block.block_header.raw_data.number);
            });
        });

        describe('#getConfirmedCurrentBlock', async function () {
            it('should get confirmed current block', async function () {
                const block = await trobkit.trob.getConfirmedCurrentBlock();
                assert.isNumber(block.block_header.raw_data.number);
            });
        });
    });

    // Transaction Test
    describe('#Transaction Test', function () {
        describe('#send', async function () {
            const fromIdx = 19;
            const toIdx = 20;

            it('should send trob', async function () {
                this.timeout(10000);

                const balanceBefore = await trobkit.trob.getUnconfirmedBalance(accounts.hex[toIdx]);
                await trobkit.trob.send(accounts.hex[toIdx], 10e5, {
                    privateKey: accounts.pks[fromIdx],
                    address: accounts.hex[fromIdx],
                });
                await waitChainData('balance', accounts.hex[toIdx], balanceBefore);
                const balanceAfter = await trobkit.trob.getUnconfirmedBalance(accounts.hex[toIdx]);
                assert.equal(balanceAfter - balanceBefore, 10e5);
            });

            it('should throw invalid recipient provided error', async function () {
                await assertThrow(
                    trobkit.trob.send('notValidAddress', 10e5, { privateKey: accounts.pks[fromIdx] }),
                    'Invalid recipient provided'
                );
            });

            it('should throw invalid amount provided error', async function () {
                await assertThrow(
                    trobkit.trob.send(accounts.hex[toIdx], -1, { privateKey: accounts.pks[fromIdx] }),
                    'Invalid amount provided'
                );
            });
        });

        describe('#sendTransaction', async function () {
            const fromIdx = 21;
            const toIdx = 22;

            it('should send trob', async function () {
                this.timeout(10000);

                const balanceBefore = await trobkit.trob.getUnconfirmedBalance(accounts.hex[toIdx]);
                await trobkit.trob.sendTransaction(accounts.hex[toIdx], 10e5, { privateKey: accounts.pks[fromIdx] });
                await waitChainData('balance', accounts.hex[toIdx], balanceBefore);
                const balanceAfter = await trobkit.trob.getUnconfirmedBalance(accounts.hex[toIdx]);
                assert.equal(balanceAfter - balanceBefore, 10e5);
            });

            it('should throw invalid recipient provided error', async function () {
                await assertThrow(
                    trobkit.trob.sendTransaction('notValidAddress', 10e5, { privateKey: accounts.pks[fromIdx] }),
                    'Invalid recipient provided'
                );
            });

            it('should throw invalid amount provided error', async function () {
                await assertThrow(
                    trobkit.trob.sendTransaction(accounts.hex[toIdx], -1, { privateKey: accounts.pks[fromIdx] }),
                    'Invalid amount provided'
                );
            });
        });

        describe('#sendTrob', async function () {
            const fromIdx = 23;
            const toIdx = 24;

            it('should send trob', async function () {
                this.timeout(10000);

                const balanceBefore = await trobkit.trob.getUnconfirmedBalance(accounts.hex[toIdx]);
                await trobkit.trob.sendTrob(accounts.hex[toIdx], 10e5, {
                    privateKey: accounts.pks[fromIdx],
                    address: accounts.hex[fromIdx],
                });
                await waitChainData('balance', accounts.hex[toIdx], balanceBefore);
                const balanceAfter = await trobkit.trob.getUnconfirmedBalance(accounts.hex[toIdx]);
                assert.equal(balanceAfter - balanceBefore, 10e5);
            });

            it('should throw invalid recipient provided error', async function () {
                await assertThrow(
                    trobkit.trob.sendTrob('notValidAddress', 10e5, { privateKey: accounts.pks[fromIdx] }),
                    'Invalid recipient provided'
                );
            });

            it('should throw invalid amount provided error', async function () {
                await assertThrow(
                    trobkit.trob.sendTrob(accounts.hex[18], -1, { privateKey: accounts.pks[fromIdx] }),
                    'Invalid amount provided'
                );
            });
        });

        describe.skip('#freezeBalance', async function () {
            const idx = 25;
            // const receiverIdx = 26;

            it('should freeze balance for energy or bandwidth', async function () {
                this.timeout(20000);

                let accountBefore = await trobkit.trob.getAccount(accounts.hex[idx]);
                await trobkit.trob.freezeBalance(10e5, 3, 'BANDWIDTH', {
                    privateKey: accounts.pks[idx],
                    address: accounts.hex[idx],
                });
                await waitChainData('freezeBp', accounts.hex[idx], 0);
                let accountAfter = await trobkit.trob.getUnconfirmedAccount(accounts.hex[idx]);
                assert.equal(
                    (!accountBefore.frozen ? 0 : accountBefore.frozen[0].frozen_balance) + 10e5,
                    accountAfter.frozen[0].frozen_balance
                );

                accountBefore = accountAfter;
                await trobkit.trob.freezeBalance(10e5, 3, 'ENERGY', { privateKey: accounts.pks[idx], address: accounts.hex[idx] });
                await waitChainData('freezeEnergy', accounts.hex[idx], 0);
                accountAfter = await trobkit.trob.getUnconfirmedAccount(accounts.hex[idx]);
                assert.equal(
                    (!accountBefore.account_resource || !accountBefore.account_resource.frozen_balance_for_energy
                        ? 0
                        : accountBefore.account_resource.frozen_balance_for_energy.frozen_balance) + 10e5,
                    accountAfter.account_resource.frozen_balance_for_energy.frozen_balance
                );
            });

            it('should throw invalid resource provided: expected "BANDWIDTH" or "ENERGY" error', async function () {
                await assertThrow(
                    // @ts-ignore
                    trobkit.trob.freezeBalance(10e8, 3, 'GAS', { privateKey: accounts.pks[idx], address: accounts.hex[idx] }),
                    'Invalid resource provided: Expected "BANDWIDTH" or "ENERGY"'
                );
            });

            it('should throw invalid amount provided error', async function () {
                await assertThrow(
                    trobkit.trob.freezeBalance(-10, 3, 'BANDWIDTH', { privateKey: accounts.pks[idx], address: accounts.hex[idx] }),
                    'Invalid amount provided'
                );
            });

            it('should throw invalid duration provided, minimum of 3 days error', async function () {
                await assertThrow(
                    trobkit.trob.freezeBalance(10e8, 2, 'BANDWIDTH', {
                        privateKey: accounts.pks[idx],
                        address: accounts.hex[idx],
                    }),
                    'Invalid duration provided, minimum of 3 days'
                );
            });
        });

        // skip since duration too long
        /**
        describe.skip("#unfreezeBalance", async function () {

            before(async function(){
                await trobkit.trob.freezeBalance(10e5, 3, 'BANDWIDTH', {}, accounts.b58[15]);
                await trobkit.trob.freezeBalance(10e5, 3, 'ENERGY', {}, accounts.b58[15]);
            });

            it('should unfreeze balance', async function () {
                let accountBefore = await trobkit.trob.getUnconfirmedAccount(ADDRESS_HEX);
                await trobkit.trob.unfreezeBalance('BANDWIDTH', {}, accounts.b58[15]);
                let accountAfter = await trobkit.trob.getUnconfirmedAccount(ADDRESS_HEX);
                assert.equal(accountBefore.frozen[0].frozen_balance - 10e5, accountAfter.frozen[0].frozen_balance);

                accountBefore = accountAfter;
                await trobkit.trob.unfreezeBalance('ENERGY', {}, accounts.b58[15]);
                accountAfter = await trobkit.trob.getUnconfirmedAccount(ADDRESS_HEX);
                assert.equal(
                    accountBefore.account_resource.frozen_balance_for_energy.frozen_balance - 10e5,
                    accountAfter.account_resource.frozen_balance_for_energy.frozen_balance
                );
            });

            it('should throw invalid resource provided: expected "BANDWIDTH" or "ENERGY" error', async function () {
                await assertThrow(
                    trobkit.trob.unfreezeBalance(10e8, 3, 'GAS', {}, accounts.b58[15]),
                    'Invalid resource provided: Expected "BANDWIDTH" or "ENERGY"'
                );
            });

        });
        */

        describe('#broadcast', async function () {
            const idx = 26;
            let transaction: Transaction;
            let signedTransaction: SignedTransaction;

            before(async function () {
                transaction = await trobkit.transactionBuilder.freezeBalanceV2(10e5, 'BANDWIDTH', accounts.b58[idx]);
                signedTransaction = await trobkit.trob.sign(transaction, accounts.pks[idx]);
            });

            it('should broadcast a transaction', async function () {
                this.timeout(20000);
                const result = await trobkit.trob.broadcast(signedTransaction);
                assert.isTrue(result.result);
                assert.equal(result.transaction.signature[0], signedTransaction.signature[0]);
            });

            it('should throw invalid transaction provided error', async function () {
                // @ts-ignore
                await assertThrow(trobkit.trob.broadcast(false), 'Invalid transaction provided');
            });

            it('should throw transaction is not signed error', async function () {
                // @ts-expect-error
                delete transaction.signature;
                // @ts-expect-error
                await assertThrow(trobkit.trob.broadcast(transaction), 'Transaction is not signed');
            });
        });

        describe('#broadcastHex', async function () {
            const idx = 26;

            it('should broadcast a hex transaction', async function () {
                const receiver = await trobkit.createAccount();
                const transaction = await trobkit.transactionBuilder.sendTrob(receiver.address.base58, 1e6, accounts.b58[idx]);
                const signedTransaction = await trobkit.trob.sign(transaction, accounts.pks[idx]);
                const signedTransactionPb = trobkit.utils.transaction.txJsonToPb(signedTransaction);
                signedTransactionPb.addSignature(Buffer.from(signedTransaction.signature[0], 'hex'), 0);
                const signedHexTransaction = trobkit.utils.bytes.byteArray2hexStr(signedTransactionPb.serializeBinary());
                const result = await trobkit.trob.broadcastHex(signedHexTransaction);
                assert.isTrue(result.result);
            });

            it('should throw invalid hex transaction provided error', async function () {
                // @ts-ignore
                await assertThrow(trobkit.trob.broadcastHex(false), 'Invalid hex transaction provided');
            });
        });

        describe('#getTransaction', async function () {
            const idx = 26;
            let transaction: Transaction;

            before(async function () {
                this.timeout(10000);

                transaction = (
                    await broadcaster(
                        trobkit.transactionBuilder.freezeBalanceV2(10e5, 'BANDWIDTH', accounts.hex[idx]),
                        accounts.pks[idx]
                    )
                ).transaction;
                await waitChainData('tx', transaction.txID);
            });

            it('should get transaction by id', async function () {
                const tx = await trobkit.trob.getTransaction(transaction.txID);
                assert.equal(tx.txID, transaction.txID);
            });

            it('should throw transaction not found error', async function () {
                await assertThrow(
                    trobkit.trob.getTransaction('a8813981b1737d9caf7d51b200760a16c9cdbc826fa8de102386af898048cbe5'),
                    'Transaction not found'
                );
            });
        });

        describe('#getTransactionFromBlock', async function () {
            const idx = 26;
            let transaction: Transaction;
            let currBlockNum: number;

            before(async function () {
                this.timeout(10000);
                await wait(5); // wait for new clear block generated in tre
                const receipt = await broadcaster(
                    trobkit.transactionBuilder.sendTrob(accounts.hex[idx], 1),
                );
                transaction = receipt.transaction;
                await wait(3);
                const transactionInfo = await trobkit.trob.getUnconfirmedTransactionInfo(transaction.txID);
                currBlockNum = transactionInfo.blockNumber;
            });

            it('should get transaction from block', async function () {
                this.timeout(10000);
                while (true) {
                    try {
                        const tx = await trobkit.trob.getTransactionFromBlock(currBlockNum, 0);
                        assert.equal(tx.txID, transaction.txID);
                        break;
                    } catch (e: any) {
                        if (e.message === 'Transaction not found in block') {
                            await wait(3);
                            continue;
                        } else if (e.message === 'Block not found') {
                            await wait(3);
                            continue;
                        } else {
                            throw new Error(e.message);
                        }
                    }
                }
            });

            it('should throw transaction not found error by transaction from block', async function () {
                await createEmptyBlock(trobkit);
                await wait(3);
                await createEmptyBlock(trobkit);
                const nowBlock = await trobkit.trob.getCurrentBlock();
                await assertThrow(trobkit.trob.getTransactionFromBlock(nowBlock.block_header.raw_data.number - 1, 0), 'Transaction not found in block');
            });

            it('should throw block not found error by transaction from block', async function () {
                await assertThrow(trobkit.trob.getTransactionFromBlock(currBlockNum + 50, 0), 'Block not found');
            });

            it('should throw invalid index error by transaction from block', async function () {
                const account = await trobkit.createAccount();
                const receipt = await broadcaster(
                    trobkit.transactionBuilder.sendTrob(account.address.base58, 1, accounts.b58[idx]),
                    accounts.pks[idx]
                );
                let blockNum;
                do {
                    await wait(3);
                    const transactionInfo = await trobkit.trob.getUnconfirmedTransactionInfo(receipt.transaction.txID);
                    blockNum = transactionInfo.blockNumber;
                } while (!blockNum);
                await assertThrow(trobkit.trob.getTransactionFromBlock(blockNum, -1), 'Invalid transaction index provided');
            });
        });

        describe('#getTransactionsFromBlock', async function () {
            const idx = 26;
            let currBlockNum: number;

            before(async function () {
                this.timeout(10000);
                const receipt = await trobkit.trob.sendTrob(accounts.hex[idx], 1e6);
                await wait(3);
                const transaction = await trobkit.trob.getUnconfirmedTransactionInfo(receipt.txid);
                currBlockNum = transaction.blockNumber;
            });

            it('should get transactions from block', async function () {
                this.timeout(10000);
                for (let i = currBlockNum; i < currBlockNum + 3; ) {
                    try {
                        const txs = await trobkit.trob.getTransactionsFromBlock(i);
                        assert.isArray(txs);
                        if (txs.length > 0) {
                            break;
                        } else {
                            i++;
                            continue;
                        }
                    } catch (e: any) {
                        if (e.message === 'Block not found') {
                            await wait(3);
                            continue;
                        } else {
                            throw new Error(e.message);
                        }
                    }
                }
            });

            it('should throw block not found error by transactions from block', async function () {
                await assertThrow(trobkit.trob.getTransactionsFromBlock(currBlockNum + 50), 'Block not found');
            });
        });

        describe('#getTransactionInfo (Confirmed)', async function () {
            const idx = 26;
            let transaction: Transaction;

            before(async function () {
                transaction = (
                    await broadcaster(
                        trobkit.transactionBuilder.freezeBalanceV2(10e5, 'BANDWIDTH', accounts.hex[idx]),
                        accounts.pks[idx]
                    )
                ).transaction;
            });

            it('should get transaction info by id', async function () {
                this.timeout(20000);

                while (true) {
                    const tx = await trobkit.trob.getTransactionInfo(transaction.txID);
                    if (Object.keys(tx).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        assert.equal(tx.id, transaction.txID);
                        break;
                    }
                }
            });
        });

        describe('#geUnconfirmedTransactionInfo', async function () {
            const idx = 25;
            let transaction: Transaction;

            before(async function () {
                transaction = (
                    await broadcaster(
                        trobkit.transactionBuilder.freezeBalanceV2(10e5, 'BANDWIDTH', accounts.hex[idx]),
                        accounts.pks[idx]
                    )
                ).transaction;
                await waitChainData('tx', transaction.txID);
            });

            it('should get unconfirmed transaction by id', async function () {
                this.timeout(10000);
                await wait(3);
                const tx = await trobkit.trob.getUnconfirmedTransactionInfo(transaction.txID);
                assert.equal(tx.id, transaction.txID);
            });

            it('should return empty object', async function () {
                const ret = await trobkit.trob.getUnconfirmedTransactionInfo('a8813981b1737d9caf7d51b200760a16c9cdbc826fa8de102386af898048cbe5');
                // @ts-expect-error
                assert.deepEqual(ret, {})
            });
        });

        describe('#getConfirmedTransaction', async function () {
            const idx = 26;
            let transaction: Transaction;

            before(async function () {
                transaction = (
                    await broadcaster(
                        trobkit.transactionBuilder.freezeBalanceV2(10e5, 'BANDWIDTH', accounts.hex[idx]),
                        accounts.pks[idx]
                    )
                ).transaction;
            });

            it('should get confirmed transaction by tx id', async function () {
                this.timeout(20000);

                while (true) {
                    try {
                        const tx = await trobkit.trob.getConfirmedTransaction(transaction.txID);
                        assert.equal(tx.txID, transaction.txID);
                        break;
                    } catch (e: any) {
                        if (e.message === 'Transaction not found') {
                            await wait(3);
                            continue;
                        } else {
                            throw new Error(e.message);
                        }
                    }
                }
            });
        });
    });

    // TRC 10 Token Test
    describe('#Token Test', function () {
        describe('#sendAsset', async function () {
            let token: Record<string, Token>;
            const fromIdx = 27;
            const toIdx = 28;

            before(async function () {
                this.timeout(10000);

                const options = getTokenOptions();
                const transaction = await trobkit.transactionBuilder.createToken(options, accounts.hex[fromIdx]);
                await broadcaster(null, accounts.pks[fromIdx], transaction);
                await waitChainData('token', accounts.hex[fromIdx]);
                token = await trobkit.trob.getTokensIssuedByAddress(accounts.hex[fromIdx]);
            });

            it('should send trob by to address and verify account balance', async function () {
                this.timeout(20000);

                const assetBefore = (await trobkit.trob.getUnconfirmedAccount(accounts.hex[toIdx])).assetV2;
                await waitChainData('tokenById', token[Object.keys(token)[0]]['id']);
                await trobkit.trob.sendAsset(accounts.hex[toIdx], 10e4, token[Object.keys(token)[0]]['id'], {
                    privateKey: accounts.pks[fromIdx],
                    address: accounts.hex[fromIdx],
                });

                await waitChainData('sendToken', accounts.hex[toIdx], !assetBefore ? 0 : assetBefore[0].value);
                const assetAfter = (await trobkit.trob.getUnconfirmedAccount(accounts.hex[toIdx])).assetV2;
                assert.equal(!assetBefore ? 0 : assetBefore[0].value, assetAfter[0].value - 10e4);
            });

            it('should throw invalid recipient provided error', async function () {
                await assertThrow(
                    trobkit.trob.sendAsset('notValidAddress', 10e4, token[Object.keys(token)[0]]['id'], {
                        privateKey: accounts.pks[fromIdx],
                        address: accounts.hex[fromIdx],
                    }),
                    'Invalid recipient provided'
                );
            });

            it('should throw invalid amount provided error', async function () {
                await assertThrow(
                    trobkit.trob.sendAsset(accounts.hex[toIdx], -10, token[Object.keys(token)[0]]['id'], {
                        privateKey: accounts.pks[fromIdx],
                        address: accounts.hex[fromIdx],
                    }),
                    'Invalid amount provided'
                );
            });

            it('should throw invalid token ID provided error', async function () {
                await assertThrow(
                    trobkit.trob.sendAsset(
                        accounts.hex[toIdx],
                        10e4,
                        // @ts-ignore
                        {},
                        { privateKey: accounts.pks[fromIdx], address: accounts.hex[fromIdx] }
                    ),
                    'Invalid token ID provided'
                );
            });

            it('should throw cannot transfer tokens to the same account provided error', async function () {
                await assertThrow(
                    trobkit.trob.sendAsset(accounts.hex[fromIdx], 10e4, token[Object.keys(token)[0]]['id'], {
                        privateKey: accounts.pks[fromIdx],
                        address: accounts.hex[fromIdx],
                    }),
                    'Cannot transfer tokens to the same account'
                );
            });
        });

        describe('#sendToken', async function () {
            let token: Record<string, Token>;
            const fromIdx = 60;
            const toIdx = 61;

            before(async function () {
                this.timeout(10000);

                const options = getTokenOptions();
                const transaction = await trobkit.transactionBuilder.createToken(options, accounts.hex[fromIdx]);
                await broadcaster(null, accounts.pks[fromIdx], transaction);
                await waitChainData('token', accounts.hex[fromIdx]);
                token = await trobkit.trob.getTokensIssuedByAddress(accounts.hex[fromIdx]);
            });

            it('should send trob by to address and verify account balance', async function () {
                this.timeout(10000);

                const assetBefore = (await trobkit.trob.getUnconfirmedAccount(accounts.hex[toIdx])).assetV2;
                // transfer from account 10 to 11
                await trobkit.trob.sendToken(accounts.hex[toIdx], 10e4, token[Object.keys(token)[0]]['id'], {
                    privateKey: accounts.pks[fromIdx],
                    address: accounts.hex[fromIdx],
                });
                await waitChainData('sendToken', accounts.hex[toIdx], !assetBefore ? 0 : assetBefore[0].value);
                const assetAfter = (await trobkit.trob.getUnconfirmedAccount(accounts.hex[toIdx])).assetV2;

                assert.equal(
                    !assetBefore ? 0 : assetBefore[0].value,
                    assetAfter[0].value - 10e4,
                    `assetBefore:${assetBefore} vs assetAfter ${assetAfter}`
                );
            });

            it('should throw invalid recipient provided error', async function () {
                await assertThrow(
                    trobkit.trob.sendToken('notValidAddress', 10e4, token[Object.keys(token)[0]]['id'], {
                        privateKey: accounts.pks[fromIdx],
                        address: accounts.hex[fromIdx],
                    }),
                    'Invalid recipient provided'
                );
            });

            it('should throw invalid amount provided error', async function () {
                await assertThrow(
                    trobkit.trob.sendToken(accounts.hex[toIdx], -10, token[Object.keys(token)[0]]['id'], {
                        privateKey: accounts.pks[fromIdx],
                        address: accounts.hex[fromIdx],
                    }),
                    'Invalid amount provided'
                );
            });

            it('should throw invalid token ID provided error', async function () {
                await assertThrow(
                    trobkit.trob.sendAsset(
                        accounts.hex[toIdx],
                        10e4,
                        // @ts-ignore
                        {},
                        { privateKey: accounts.pks[fromIdx], address: accounts.hex[fromIdx] }
                    ),
                    'Invalid token ID provided'
                );
            });

            it('should throw cannot transfer tokens to the same account provided error', async function () {
                await assertThrow(
                    trobkit.trob.sendAsset(accounts.hex[fromIdx], 10e4, token[Object.keys(token)[0]]['id'], {
                        privateKey: accounts.pks[fromIdx],
                        address: accounts.hex[fromIdx],
                    }),
                    'Cannot transfer tokens to the same account'
                );
            });
        });

        describe('#getTokenFromID', async function () {
            const idx = 26;

            before(async function () {
                this.timeout(10000);

                const options = getTokenOptions();
                const transaction = await trobkit.transactionBuilder.createToken(options, accounts.hex[idx]);
                await broadcaster(null, accounts.pks[idx], transaction);
                await waitChainData('token', accounts.hex[idx]);
            });

            it('should get token by name', async function () {
                const tokens = await trobkit.trob.listTokens(5, 0);
                for (const token of tokens) {
                    const tk = await trobkit.trob.getTokenFromID(token.id);
                    assert.equal(tk.id, token.id);
                }
            });

            it('should throw invalid token ID provided error', async function () {
                // @ts-ignore
                await assertThrow(trobkit.trob.getTokenFromID({}), 'Invalid token ID provided');
            });

            it('should throw token does not exist error', async function () {
                await assertThrow(trobkit.trob.getTokenFromID(1234565), 'Token does not exist');
            });
        });

        describe('#getTokenByID', async function () {
            const idx = 48;
            let options: any;

            before(async function () {
                this.timeout(10000);

                options = getTokenOptions();
                const transaction = await trobkit.transactionBuilder.createToken(options, accounts.hex[idx]);
                await broadcaster(null, accounts.pks[idx], transaction);
                await waitChainData('token', accounts.hex[idx]);
            });

            it('should get token by name', async function () {
                const tokens = ([] as any[]).concat(await trobkit.trob.getTokenListByName(options.name));
                for (const token of tokens) {
                    const tk = await trobkit.trob.getTokenByID(token.id);
                    assert.equal(tk.id, token.id);
                }
            });

            it('should throw invalid token ID provided error', async function () {
                try {
                    // @ts-ignore
                    trobkit.trob.getTokenByID({})
                } catch (e: any) {
                    assert.equal(e.message, 'Invalid token ID provided');
                }
            });

            it('should throw token does not exist error', async function () {
                await assertThrow(trobkit.trob.getTokenByID(1234565), 'Token does not exist');
            });
        });

        describe('#getTokensIssuedByAddress', async function () {
            const idx = 49;

            before(async function () {
                this.timeout(10000);

                const options = getTokenOptions();
                const transaction = await trobkit.transactionBuilder.createToken(options, accounts.hex[idx]);
                await broadcaster(null, accounts.pks[idx], transaction);
                await waitChainData('token', accounts.hex[idx]);
            });

            it('should get token by issued address', async function () {
                const tokens = await trobkit.trob.listTokens(5, 0);
                for (const token of tokens) {
                    const tk = await trobkit.trob.getTokensIssuedByAddress(token.owner_address);
                    assert.equal(tk[Object.keys(tk)[0]]['id'], token.id);
                }
            });

            it('should throw invalid address provided error', async function () {
                await assertThrow(trobkit.trob.getTokensIssuedByAddress('abcdefghijklmn'), 'Invalid address provided');
            });
        });

        describe('#listTokens', async function () {
            it('should list all tokens by limit', async function () {
                const tokens = await trobkit.trob.listTokens(10, 0);
                assert.isArray(tokens);
                for (const token of tokens) {
                    assert.isDefined(token.id);
                }
            });

            it('should throw invalid limit provided error', async function () {
                await assertThrow(trobkit.trob.listTokens(-1, 0), 'Invalid limit provided');
            });

            it('should throw invalid offset provided error', async function () {
                await assertThrow(trobkit.trob.listTokens(5, -1), 'Invalid offset provided');
            });
        });

        describe('#parseToken', async function () {
            it('should list all tokens by limit', async function () {
                const tokens = await trobkit.trob.listTokens(10, 0);
                for (const token of tokens) {
                    const cloneToken = JSON.parse(JSON.stringify(token));
                    token.name = trobkit.fromUtf8(token.name);
                    token.abbr = trobkit.fromUtf8(token.abbr);
                    token.description = token.description && trobkit.fromUtf8(token.description);
                    token.url = trobkit.fromUtf8(token.url);

                    const tk = trobkit.trob._parseToken(token);
                    assert.equal(tk.name, cloneToken.name);
                    assert.equal(tk.abbr, cloneToken.abbr);
                    assert.equal(tk.description, cloneToken.description);
                    assert.equal(tk.url, cloneToken.url);
                }
            });
        });
    });

    // Exchange Test
    describe('#Exchange Test', function () {
        describe('#listExchanges', async function () {
            const idxS = 33;
            const idxE = 35;
            const toIdx = 35;

            before(async function () {
                this.timeout(20000);

                const tokenNames = [];

                // create token
                for (let i = idxS; i < idxE; i++) {
                    const options = getTokenOptions();
                    const transaction = await trobkit.transactionBuilder.createToken(options, accounts.hex[i]);
                    await broadcaster(null, accounts.pks[i], transaction);
                    await waitChainData('token', accounts.hex[i]);
                    const token = await trobkit.trob.getTokensIssuedByAddress(accounts.hex[i]);
                    await waitChainData('tokenById', token[Object.keys(token)[0]]['id']);
                    await broadcaster(
                        null,
                        accounts.pks[i],
                        await trobkit.transactionBuilder.sendToken(
                            accounts.hex[toIdx],
                            10e4,
                            token[Object.keys(token)[0]]['id'],
                            token[Object.keys(token)[0]]['owner_address']
                        )
                    );
                    await waitChainData('sendToken', accounts.hex[toIdx], 0);
                    tokenNames.push(token[Object.keys(token)[0]]['id']);
                }
                await broadcaster(
                    null,
                    accounts.pks[toIdx],
                    await trobkit.transactionBuilder.createTokenExchange(
                        tokenNames[0],
                        10e3,
                        tokenNames[1],
                        10e3,
                        accounts.hex[toIdx]
                    )
                );
            });

            it('should get exchange by id', async function () {
                const exchanges = await trobkit.trob.listExchanges();
                assert.isArray(exchanges);
                for (const exchange of exchanges) {
                    assert.isDefined(exchange.exchange_id);
                }
            });
        });

        describe('#listExchangesPaginated', async function () {
            const idxS = 36;
            const idxE = 38;
            const toIdx = 38;

            before(async function () {
                this.timeout(20000);

                const tokenNames = [];

                // create token
                for (let i = idxS; i < idxE; i++) {
                    const options = getTokenOptions();
                    const transaction = await trobkit.transactionBuilder.createToken(options, accounts.hex[i]);
                    await broadcaster(null, accounts.pks[i], transaction);
                    await waitChainData('token', accounts.hex[i]);
                    const token = await trobkit.trob.getTokensIssuedByAddress(accounts.hex[i]);
                    await waitChainData('tokenById', token[Object.keys(token)[0]]['id']);
                    await broadcaster(
                        null,
                        accounts.pks[i],
                        await trobkit.transactionBuilder.sendToken(
                            accounts.hex[toIdx],
                            10e4,
                            token[Object.keys(token)[0]]['id'],
                            token[Object.keys(token)[0]]['owner_address']
                        )
                    );
                    await waitChainData('sendToken', accounts.hex[toIdx], 0);
                    tokenNames.push(token[Object.keys(token)[0]]['id']);
                }

                await broadcaster(
                    null,
                    accounts.pks[toIdx],
                    await trobkit.transactionBuilder.createTokenExchange(
                        tokenNames[0],
                        10e3,
                        tokenNames[1],
                        10e3,
                        accounts.hex[toIdx]
                    )
                );
            });

            it('should get exchange by id', async function () {
                const exchanges = await trobkit.trob.listExchangesPaginated(10, 0);
                assert.isArray(exchanges);
                assert.isTrue(exchanges.length > 0);
                for (const exchange of exchanges) {
                    assert.isDefined(exchange.exchange_id);
                }
            });
        });

        describe('#getExchangeByID', async function () {
            const idxS = 39;
            const idxE = 41;
            const toIdx = 41;
            let exchanges: Exchange[];

            before(async function () {
                this.timeout(20000);

                const tokenNames = [];

                // create token
                for (let i = idxS; i < idxE; i++) {
                    const options = getTokenOptions();
                    await broadcaster(
                        null,
                        accounts.pks[i],
                        await trobkit.transactionBuilder.createToken(options, accounts.hex[i])
                    );
                    await waitChainData('token', accounts.hex[i]);
                    const token = await trobkit.trob.getTokensIssuedByAddress(accounts.hex[i]);
                    await waitChainData('tokenById', token[Object.keys(token)[0]]['id']);
                    await broadcaster(
                        null,
                        accounts.pks[i],
                        await trobkit.transactionBuilder.sendToken(
                            accounts.hex[toIdx],
                            10e4,
                            token[Object.keys(token)[0]]['id'],
                            token[Object.keys(token)[0]]['owner_address']
                        )
                    );
                    await waitChainData('sendToken', accounts.hex[toIdx], 0);
                    tokenNames.push(token[Object.keys(token)[0]]['id']);
                }

                await broadcaster(
                    null,
                    accounts.pks[toIdx],
                    await trobkit.transactionBuilder.createTokenExchange(
                        tokenNames[0],
                        10e3,
                        tokenNames[1],
                        10e3,
                        accounts.hex[toIdx]
                    )
                );

                exchanges = await trobkit.trob.listExchanges();
            });

            it('should get exchange by id', async function () {
                for (const exchange of exchanges) {
                    const ex = await trobkit.trob.getExchangeByID(exchange.exchange_id);
                    assert.equal(ex.exchange_id, exchange.exchange_id);
                }
            });
        });
    });

    // Proposal Test
    describe('#Proposal Test', async function () {
        describe('#getChainParameters', async function () {
            it('should get proposal list', async function () {
                const params = await trobkit.trob.getChainParameters();
                assert.isArray(params);
                assert.isDefined(params[0].key);
            });
        });

        describe('#getProposal', async function () {
            let proposals: Proposal[];

            before(async function () {
                // create proposal
                const parameters = [
                    { key: 0, value: 100000 },
                    { key: 1, value: 2 },
                ];
                await broadcaster(
                    null,
                    PRIVATE_KEY,
                    await trobkit.transactionBuilder.createProposal(parameters[0], ADDRESS_BASE58)
                );

                proposals = await trobkit.trob.listProposals();
            });

            it('should get proposal by id', async function () {
                for (const proposal of proposals) {
                    const ps = await trobkit.trob.getProposal(proposal.proposal_id);
                    assert.equal(ps.proposal_id, proposal.proposal_id);
                }
            });

            it('should throw invalid proposalID provided error', async function () {
                await assertThrow(trobkit.trob.getProposal(-1), 'Invalid proposalID provided');
            });
        });

        describe('#listProposals', async function () {
            before(async function () {
                // create proposal
                for (let i = 0; i < 5; i++) {
                    const parameters = [
                        { key: i + 1, value: 100000 },
                        { key: i + 2, value: 2 },
                    ];
                    await broadcaster(
                        null,
                        PRIVATE_KEY,
                        await trobkit.transactionBuilder.createProposal(parameters[0], ADDRESS_BASE58)
                    );
                }
            });

            it('should list seeds node', async function () {
                const proposals = await trobkit.trob.listProposals();
                for (const proposal of proposals) {
                    assert.isDefined(proposal.proposal_id);
                    assert.isDefined(proposal.proposer_address);
                }
            });
        });
    });

    // Contract Test
    describe('#getContract', async function () {
        const idx = 42;
        let transaction: CreateSmartContractTransaction;

        before(async function () {
            this.timeout(10000);

            transaction = await trobkit.transactionBuilder.createSmartContract(
                {
                    abi: testRevertContract.abi,
                    bytecode: testRevertContract.bytecode,
                },
                accounts.hex[idx]
            );
            await broadcaster(null, accounts.pks[idx], transaction);
            await waitChainData('contract', transaction.contract_address);
        });

        it('should get contract by contract address', async function () {
            const contract = await trobkit.trob.getContract(transaction.contract_address);
            assert.equal(contract.contract_address, transaction.contract_address);
        });

        it('should throw invalid contract address provided error', async function () {
            await assertThrow(trobkit.trob.getContract('notAddress'), 'Invalid contract address provided');
        });

        it('should return empty object', async function () {
            const ret = await trobkit.trob.getContract('417cbcc41052b59584d1ac9fc1ce39106533aa1d40');
            assert.deepEqual(ret, {});
        });
    });

    describe('#getContractInfo', async function () {
        const idx = 58;
        let transaction: CreateSmartContractTransaction;

        before(async function () {
            this.timeout(10000);

            transaction = await trobkit.transactionBuilder.createSmartContract(
                {
                    abi: testRevertContract.abi,
                    bytecode: testRevertContract.bytecode,
                },
                accounts.hex[idx]
            );
            await broadcaster(null, accounts.pks[idx], transaction);
            await waitChainData('contract', transaction.contract_address);
        });

        it('should get contract info by contract address', async function () {
            const contractInfo = await trobkit.trob.getContractInfo(transaction.contract_address);
            assert.isDefined(contractInfo.runtimecode);
            assert.isDefined(contractInfo.contract_state);
            assert.isDefined(contractInfo.smart_contract);
        });

        it('should throw invalid contract address provided error', async function () {
            await assertThrow(trobkit.trob.getContractInfo('notAddress'), 'Invalid contract address provided');
        });

        it('should return empty object', async function () {
            const ret = await trobkit.trob.getContractInfo('417cbcc41052b59584d1ac9fc1ce39106533aa1d40');
            assert.deepEqual(ret, {});
        });
    });

    

    // Node Test
    describe('#listNodes', async function () {
        it('should list seeds node', async function () {
            const nodes = await trobkit.trob.listNodes();
            assert.isArray(nodes);
        });
    });

    describe('#getNodeInfo', async function () {
        it('should get node info', async function () {
            const nodeInfo = await trobkit.trob.getNodeInfo();
            assert.isDefined(nodeInfo);
        });
    });

    // SR Test
    describe('#listSuperRepresentatives', async function () {
        it('should list super representatives', async function () {
            const srs = await trobkit.trob.listSuperRepresentatives();
            assert.isArray(srs);

            for (const sr of srs) {
                assert.isDefined(sr.address);
            }
        });
    });

    describe('#timeUntilNextVoteCycle', async function () {
        it('should get time util next vote cycle', async function () {
            const num = await trobkit.trob.timeUntilNextVoteCycle();
            assert.isNumber(num);
        });
    });

    describe('#getReward', async function () {
        it('should get the reward', async function () {
            const reward = await trobkit.trob.getReward(accounts.b58[0]);
            assert.equal(reward, 0);
        });
    });

    describe('#getUnconfirmedReward', async function () {
        it('should get the reward', async function () {
            const reward = await trobkit.trob.getUnconfirmedReward(accounts.b58[0]);
            assert.equal(reward, 0);
        });
    });

    describe('#getBrokerage', async function () {
        it('should get the brokerage', async function () {
            const brokerage = await trobkit.trob.getBrokerage(accounts.hex[0]);
            assert.equal(brokerage, 20);
        });
    });

    describe('#getUnconfirmedBrokerage', async function () {
        it('should get the brokerage', async function () {
            const brokerage = await trobkit.trob.getUnconfirmedBrokerage(accounts.hex[0]);
            assert.equal(brokerage, 20);
        });
    });

    describe('#getBandwidthPrices', async function () {
        it('should get bandwidth prices', async function () {
            const prices = await trobkit.trob.getBandwidthPrices();
            assert.isString(prices);
        });
    });

    describe('#getEnergyPrices', async function () {
        it('should get energy prices', async function () {
            const prices = await trobkit.trob.getEnergyPrices();
            assert.isString(prices);
        });
    });

    describe('#signMessageV2', async function () {
        tests.forEach(function (test) {
            it('signs a message "' + test.name + '"', async function () {
                const trobkit = new Trobkit({ fullHost: FULL_NODE_API, privateKey: test.privateKey });
                const signature = await trobkit.trob.signMessageV2(test.message);
                assert.equal(signature, test.signature, 'computes message signature');
            });
        });
    });

    describe('#verifyMessageV2', async function () {
        tests.forEach(function (test) {
            it('signs a message "' + test.name + '"', async function () {
                const trobkit = new Trobkit({ fullHost: FULL_NODE_API, privateKey: test.privateKey });
                const address = await trobkit.trob.verifyMessageV2(test.message, test.signature);
                assert.equal(address, test.address, 'verifies message signature');
            });
        });
    });

    describe('#getCurrentRefBlockParams', async function () {
        it('should fetch current ref block params', async () => {
            const result = await trobkit.trob.getCurrentRefBlockParams();

            assert.equal(result.ref_block_bytes.length, 4, 'ref_block_bytes should be 4 hex characters');
            assert.isNotEmpty(result.ref_block_hash, 'ref_block_hash should not be empty');
            assert.isNumber(result.expiration, 'expiration should be number');
            assert.isNumber(result.timestamp, 'timestamp should be number');
        });

        it('should throw error when block data is missing required fields', async () => {
            const trobkitInstance = new Trobkit({ fullHost: 'https://trobium.network' });

            try {
                await trobkitInstance.trob.getCurrentRefBlockParams();
            } catch (error: any) {
                assert.match(error.message, /Unable to get params:/, 'should throw unable to get params error');
            }
        });
    });

    describe('#getNowWitnessList', async function () {
        it('should fetch now witness list', async () => {
            const witnesses = await trobkit.trob.getNowWitnessList({
                offset: 0,
                limit: 10,
                visible: true,
                confirmed: true,
            });
            assert.isArray(witnesses, 'witnesses should be an array');
            const witness = witnesses[0];
            assert.isTrue(trobkit.isAddress(witness.address));
            assert.isNumber(witness.voteCount);
            assert.isString(witness.url);
            assert.isNumber(witness.totalProduced);
            // assert.isNumber(witness.totalMissed);
            assert.isNumber(witness.latestBlockNum);
            assert.isNumber(witness.latestSlotNum);
            assert.isBoolean(witness.isJobs);
        });

        it('should fetch now witness list with default params', async () => {
            await trobkit.trob.getNowWitnessList({});
        });

        it('should return [] when API returns empty object', async () => {
            class MockNode extends trobkitBuilder.providers.HttpProvider {
                async request<T>(_url: string, _data?: any, _method?: 'get' | 'post'): Promise<T> {
                    return {} as unknown as T;
                }
            }
            const trobkit = new Trobkit({
                fullHost: new MockNode('https://mock.trobium.network'),
            });
            const result = await trobkit.trob.getNowWitnessList();
            assert.deepEqual(result, []);
        });

        it('should throw error for server returned error', async () => {
            class MockNode extends trobkitBuilder.providers.HttpProvider {
                async request<T>(_url: string, _data?: any, _method?: 'get' | 'post'): Promise<T> {
                    return {
                        Error: 'Some server error',
                    } as unknown as T;
                }
            }
            const trobkit = new Trobkit({
                fullHost: new MockNode('https://mock.trobium.network'),
            });
            await assertThrow(trobkit.trob.getNowWitnessList({}), 'Some server error');
        });

        it('should throw error for invalid offset', async () => {
            await assertThrow(trobkit.trob.getNowWitnessList({ offset: -1 }), 'Invalid offset: must be an integer >= 0');
        });

        it('should throw error for invalid limit', async () => {
            await assertThrow(trobkit.trob.getNowWitnessList({ limit: 0 }), 'Invalid limit: must be an integer > 0');
        });

        it('should throw error for non-boolean visible', async () => {
            // @ts-expect-error testing invalid input
            await assertThrow(trobkit.trob.getNowWitnessList({ visible: 'yes' }), 'Invalid visible: must be a boolean');
        });
    });
});

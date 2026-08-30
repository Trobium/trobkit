import { assert } from 'chai';
import trobkitBuilder from '../helpers/trobkitBuilder.js';
import assertThrow from '../helpers/assertThrow.js';

describe('Trobkit.utils.accounts', function () {
    describe('#generateAccount()', function () {
        it('should generate a new account', async function () {
            const trobkit = trobkitBuilder.createInstance();

            const newAccount = await trobkit.utils.accounts.generateAccount();
            assert.equal(newAccount.privateKey.length, 64);
            assert.equal(newAccount.publicKey.length, 130);
            const address = trobkit.address.fromPrivateKey(newAccount.privateKey);
            assert.equal(address, newAccount.address.base58);
            assert.equal(trobkit.address.toHex(address as string), newAccount.address.hex.toLowerCase());
        });
    });

    describe('#generateRandom()', function () {
        describe('should generate a mnemonic phrase and an account', function () {
            it('should generate an account of the zero index when options param is not passed', async function () {
                const trobkit = trobkitBuilder.createInstance();

                const newAccount = await trobkit.utils.accounts.generateRandom();
                assert.equal(newAccount.privateKey.substring(2).length, 64);
                assert.equal(newAccount.publicKey.substring(2).length, 130);
                assert.isTrue(trobkit.utils.ethersUtils.isValidMnemonic(newAccount.mnemonic!.phrase));
                const address = trobkit.address.fromPrivateKey(newAccount.privateKey.replace(/^0x/, ''));
                assert.equal(address, newAccount.address);
                assert.equal(trobkit.address.toHex(address as string), trobkit.address.toHex(newAccount.address));
            });

            it('should generate an account of the given path when options param has a valid bip39 trobium path', async function () {
                const trobkit = trobkitBuilder.createInstance();
                const newAccount = await trobkit.utils.accounts.generateRandom('', "m/44'/195'/0'/0/1");
                assert.equal(newAccount.privateKey.substring(2).length, 64);
                assert.equal(newAccount.publicKey.substring(2).length, 130);
                assert.isTrue(trobkit.utils.ethersUtils.isValidMnemonic(newAccount.mnemonic!.phrase));
                const address = trobkit.address.fromPrivateKey(newAccount.privateKey.replace(/^0x/, ''));
                assert.equal(address, newAccount.address);
                assert.equal(trobkit.address.toHex(address as string), trobkit.address.toHex(newAccount.address));
            });
        });
    });

    describe('#generateAccountWithMnemonic()', function () {
        describe('should generate an account of the given mnemonic phrase', function () {
            it('should generate an account when passed a normal mnemonic pharase', async function () {
                const trobkit = trobkitBuilder.createInstance();

                const accountCreated = await trobkit.utils.accounts.generateRandom();

                const newAccount = await trobkit.utils.accounts.generateAccountWithMnemonic(accountCreated.mnemonic!.phrase);
                assert.equal(newAccount.privateKey.substring(2).length, 64);
                assert.equal(newAccount.publicKey.substring(2).length, 130);
                const address = trobkit.address.fromPrivateKey(newAccount.privateKey.replace(/^0x/, ''));
                assert.equal(address, newAccount.address);
                assert.equal(trobkit.address.toHex(address as string), trobkit.address.toHex(newAccount.address));
            });

            it('should generate an account when path is passed', async function () {
                const trobkit = trobkitBuilder.createInstance();

                const accountCreated = await trobkit.utils.accounts.generateRandom();

                const path = "m/44'/195'/0'/0/1";

                const newAccount = await trobkit.utils.accounts.generateAccountWithMnemonic(
                    accountCreated.mnemonic!.phrase,
                    path
                );
                assert.equal(newAccount.privateKey.substring(2).length, 64);
                assert.equal(newAccount.publicKey.substring(2).length, 130);
                const address = trobkit.address.fromPrivateKey(newAccount.privateKey.replace(/^0x/, ''));
                assert.equal(address, newAccount.address);
                assert.equal(trobkit.address.toHex(address as string), trobkit.address.toHex(newAccount.address));
            });

            it('should throw when path is an invalid bip39 path', async function () {
                const trobkit = trobkitBuilder.createInstance();

                const accountCreated = await trobkit.utils.accounts.generateRandom();

                const path = '11';

                await assertThrow(
                    new Promise(() => trobkit.utils.accounts.generateAccountWithMnemonic(accountCreated.mnemonic!.phrase, path)),
                    'Invalid trobium path provided'
                );
            });

            it('should throw when path is an invalid bip39 trobium path', async function () {
                const trobkit = trobkitBuilder.createInstance();

                const accountCreated = await trobkit.utils.accounts.generateRandom();

                const path = "m/44'/60'/0'/0/1";

                await assertThrow(
                    new Promise(() => trobkit.utils.accounts.generateAccountWithMnemonic(accountCreated.mnemonic!.phrase, path)),
                    'Invalid trobium path provided'
                );
            });
        });
    });
});

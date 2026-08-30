import { Address } from '../../../src/types/Trob';
import { assert } from 'chai';
import wait from '../../helpers/wait.js';
import broadcaster from '../../helpers/broadcaster.js';
import trobkitBuilder from '../../helpers/trobkitBuilder.js';
import { Trobkit } from '../../setup/Trobkit.js';
import contracts from '../../fixtures/contracts';
import { Contract } from '../../../src/lib/contract';

const testCustomError = contracts.testCustomError;

describe('#contract.index', function () {
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

    describe('#customError', function () {
        let customError: Contract;

        before(async function () {
            const tx = await broadcaster(
                trobkit.transactionBuilder.createSmartContract(
                    {
                        abi: testCustomError.abi,
                        bytecode: testCustomError.bytecode,
                    },
                    accounts.b58[0]
                ),
                accounts.pks[0]
            );
            customError = trobkit.contract(testCustomError.abi, tx.transaction.contract_address);
        });

        it('should revert with custom error', async () => {
            const txid = await customError.test(111).send();
            let data;
            while (true) {
                data = await trobkit.trob.getTransactionInfo(txid);
                if (Object.keys(data).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }
            const errorData = data.contractResult;
            const expectedErrorData =
                Trobkit.sha3('CustomError(uint256,uint256)', false).slice(0, 8) +
                '000000000000000000000000000000000000000000000000000000000000006f' + // 111
                '0000000000000000000000000000000000000000000000000000000000000001'; // 1
            assert.equal(errorData.join(''), expectedErrorData);
        });
    });
});

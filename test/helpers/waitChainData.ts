// @ts-nocheck
import trobkitBuilder from './trobkitBuilder.js';
import wait from './wait.js';
import chalk from 'chalk';
const trobkit = trobkitBuilder.createInstance();

function log(x: string) {
    process.stdout.write(chalk.yellow(x));
}

export default async function (type: string, ...params: any[]) {
    let startTimestamp = Date.now();
    let timeLimit = 5000;
    do {
        let data;
        let isFound = false;
        try {
            switch (type) {
                case 'tx': {
                    data = await trobkit.trob.getTransaction(params[0]);
                    isFound = !!data.txID;
                    break;
                }
                case 'account': {
                    data = await trobkit.trob.getUnconfirmedAccount(params[0]);
                    isFound = !!data.address;
                    break;
                }
                case 'accountById': {
                    data = await trobkit.trob.getUnconfirmedAccountById(params[0]);
                    isFound = !!data.address;
                    break;
                }
                case 'token': {
                    data = await trobkit.trob.getTokensIssuedByAddress(params[0]);
                    isFound = !!Object.keys(data).length;
                    break;
                }
                case 'tokenById': {
                    data = await trobkit.trob.getTokenFromID(params[0]);
                    isFound = !!data.name;
                    break;
                }
                case 'sendToken': {
                    data = await trobkit.trob.getUnconfirmedAccount(params[0]);
                    isFound = data && data.assetV2 && data.assetV2.length && data.assetV2[0].value !== params[1];
                    break;
                }
                case 'balance': {
                    data = await trobkit.trob.getUnconfirmedBalance(params[0]);
                    isFound = data !== params[1];
                    break;
                }
                case 'freezeBp': {
                    data = await trobkit.trob.getUnconfirmedAccount(params[0]);
                    isFound = data.frozen && data.frozen[0].frozen_balance !== params[1];
                    break;
                }
                case 'freezeEnergy': {
                    data = await trobkit.trob.getUnconfirmedAccount(params[0]);
                    isFound =
                        data.account_resource &&
                        data.account_resource.frozen_balance_for_energy &&
                        data.account_resource.frozen_balance_for_energy.frozen_balance !== params[1];
                    break;
                }
                case 'contract': {
                    data = await trobkit.trob.getContract(params[0]);
                    isFound = !!data.contract_address;
                    break;
                }
                case 'exchange': {
                    data = await trobkit.trob.getExchangeByID(params[0]);
                    isFound = !!data.exchange_id;
                    break;
                }
                default:
                    isFound = true;
            }
        } catch (e: any) {
            log(e);
            await wait(1);
            continue;
        }
        // console.log(...params, 'wait for chain data result: ', isFound, data, type);
        if (isFound) return;
        log(`waiting for unconfirmed data,${type}...`);
        await wait(1);
    } while (Date.now() - startTimestamp < timeLimit);

    throw new Error('No unconfirmed data found on chain');
}

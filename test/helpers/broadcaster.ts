import { SignedTransaction, Transaction } from '../../src/types/Transaction.js';
import trobkitBuilder from '../helpers/trobkitBuilder.js';

export default async function <T extends Transaction>(func: Promise<T> | null | T, pk?: string, transaction?: T) {
    const trobkit = trobkitBuilder.createInstance();
    if (!transaction) {
        transaction = (await func)!;
    }
    const signedTransaction = await trobkit.trob.sign(transaction, pk);
    const result = {
        transaction,
        signedTransaction,
        receipt: await trobkit.trob.sendRawTransaction(signedTransaction as SignedTransaction),
    };
    return Promise.resolve(result);
}

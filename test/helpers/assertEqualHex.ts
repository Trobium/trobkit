import { assert } from 'chai';
import { Trobkit } from '../setup/Trobkit.js';

export default async function (result: any, string: any) {
    assert.equal(result, Trobkit.toHex(string).substring(2));
}

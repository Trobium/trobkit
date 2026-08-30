import { assert } from 'chai';
import trobkitBuilder from '../helpers/trobkitBuilder.js';
import { Trobkit, Plugin, Trob } from '../setup/Trobkit.js';
import GetNowBlock from '../helpers/GetNowBlock.js';
import BlockLib from '../helpers/BlockLib.js';
import { Block } from '../../src/types/APIResponse';

declare global {
    interface MyTrobkit1 extends Trobkit {
        trob: {
            getCurrentBlock(): Promise<Block & { fromPlugin: true }>;
            getLatestBlock(): Promise<Block & { fromPlugin: true }>;
            getSomeParameter(): any;
        } & Trob;
    }

    interface MyTrobkit2 extends Trobkit {
        blockLib: {
            getCurrent(): Promise<Block & { fromPlugin: true }>;
        }
    }
}

describe('Trobkit.lib.plugin', async function () {
    let trobkit: Trobkit;

    before(async function () {
        trobkit = trobkitBuilder.createInstance();
    });

    describe('#constructor()', function () {
        it('should have been set a full instance in trobkit', function () {
            assert.instanceOf(trobkit.plugin, Plugin);
        });
    });

    describe('#plug GetNowBlock into trobkit.trob', async function () {
        it('should register the plugin GetNowBlock', async function () {
            const someParameter = 'someValue';

            const result = trobkit.plugin.register(GetNowBlock, {
                someParameter,
            });
            assert.isTrue(result.skipped.includes('_parseToken'));
            assert.isTrue(result.plugged.includes('getCurrentBlock'));
            assert.isTrue(result.plugged.includes('getLatestBlock'));

            const result2 = await (trobkit as globalThis.MyTrobkit1).trob.getCurrentBlock();
            assert.isTrue(result2.fromPlugin);
            assert.equal(result2.blockID.length, 64);
            assert.isTrue(/^00000/.test(result2.blockID));

            const result3 = await (trobkit as globalThis.MyTrobkit1).trob.getSomeParameter();
            assert.equal(result3, someParameter);
        });
    });

    describe('#plug BlockLib into trobkit at first level', async function () {
        it('should register the plugin and call a method', async function () {
            const result = trobkit.plugin.register(BlockLib);
            assert.equal(result.libs[0], 'BlockLib');
            const result2 = await (trobkit as globalThis.MyTrobkit2).blockLib.getCurrent();
            assert.isTrue(result2.fromPlugin);
            assert.equal(result2.blockID.length, 64);
            assert.isTrue(/^00000/.test(result2.blockID));
        });

        it('should not register if trobkit is instantiated with the disablePlugins option', async function () {
            const trobkit2 = trobkitBuilder.createInstance({ disablePlugins: true });
            const result = trobkit2.plugin.register(BlockLib);
            assert.isTrue(typeof result.error === 'string');
        });
    });
});

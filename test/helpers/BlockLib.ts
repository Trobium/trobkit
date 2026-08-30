import { Trobkit } from '../setup/Trobkit.js';

export default class BlockLib {
    trobkit: Trobkit;
    constructor(trobkit: Trobkit) {
        if (!trobkit) throw new Error('Expected instances of Trobkit and utils');
        this.trobkit = trobkit;
    }

    async getCurrent() {
        const block: any = await this.trobkit.fullNode.request('wallet/getnowblock');
        block.fromPlugin = true;
        return block;
    }

    pluginInterface() {
        return {
            requires: '^6.0.0',
            fullClass: true,
        };
    }
}

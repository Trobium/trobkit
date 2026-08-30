import { Trobkit } from '../setup/Trobkit.js';

let someParameter: any;

export default class GetNowBlock {
    trobkit: Trobkit;
    constructor(trobkit: Trobkit) {
        if (!trobkit) throw new Error('Expected instance of Trobkit');

        this.trobkit = trobkit;
    }

    async someMethod() {
        const block: any = await this.trobkit.fullNode.request('wallet/getnowblock');
        block.fromPlugin = true;
        return block;
    }

    getSomeParameter() {
        return someParameter;
    }

    pluginInterface(options: any) {
        if (options.someParameter) {
            someParameter = options.someParameter;
        }
        return {
            requires: '^6.0.0',
            components: {
                trob: {
                    // will be overridden
                    getCurrentBlock: this.someMethod,

                    // will be added
                    getLatestBlock: this.someMethod,
                    getSomeParameter: this.getSomeParameter,

                    // will be skipped
                    _parseToken: function () {
                        //
                    },
                },
            },
        };
    }
}

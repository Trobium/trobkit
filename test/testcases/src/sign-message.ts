import trobkitBuilder from '../../helpers/trobkitBuilder.js';
const utils = trobkitBuilder.utils;

const tests = [
    // message is string
    {
        address: 'TMVQGm1qAQYVdetCeGRRkTWYYrLXuHK2HC',
        name: 'string("hello world")',
        message: 'hello world',
        messageHash: '0xdedbfd635aafe5ff5cff1b35f552ae963ba006408fb65f8cb0886a47c2729ed5',
        privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
        signature:
            '0x8c57296f99252c58bf6b184adaba7153b7b50ae80bdff59071e5e2c20b4cb09e5085e4c9fc2c26408cc48646c9c5d849a3132f388b586e0f17e9caae5279ea411c',
    },
    // message starts with 0x, and wanted to be treated as bytes, use Trobkit.utils.ethersUtils.arrayify to deal with the message first
    {
        address: 'TMVQGm1qAQYVdetCeGRRkTWYYrLXuHK2HC',
        name: 'bytes(0x47173285...4cb01fad)',
        message: utils.ethersUtils.arrayify('0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad'),
        messageHash: '0x0c7ceed8fca454fe58c5c904c8836d5b5ba1036685e74955418caa9ad9e340f3',
        privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
        signature:
            '0xe9f85daec3cc2a733d4aa10132d91c59510f198457c22d04314a11d81a91a56c58c0748d6155d76bfab59c546e7184358007ba6acd53d291a811f78674734e5c1b',
    },
    {
        address: 'TMVQGm1qAQYVdetCeGRRkTWYYrLXuHK2HC',
        name: 'zero-prefixed signature',
        message: utils.ethersUtils.arrayify(utils.ethersUtils.id('0x7f23b5eed5bc7e89f267f339561b2697faab234a2')),
        messageHash: '0x48cede5a3c5996da5cfea96d24691bc400e885d424269db4cc937288045e1404',
        privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
        signature:
            '0x4f2dd8de67f2537dbfd958c693b6b83c3815e3c94a1512bd6bf9c4a22cf07fd842a2d36f171b6241c33d9d7fbd75f4dba95a4210e82eb6e8742405df8a75f19f1c',
    },
];

export default {
    tests,
};

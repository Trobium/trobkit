import trobkitBuilder from "./trobkitBuilder.js";

let JSON_RPC_ID = 1;

export async function createEmptyBlock(trobkit: InstanceType<typeof trobkitBuilder.Trobkit>) {
    return trobkit.fullNode.request('/tre', {
        "jsonrpc": "2.0",
        "method": "tre_mine",
        "id": JSON_RPC_ID++,
    }, 'POST');
}
    
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
const wait = require('./wait');
const trobkitBuilder = require('./trobkitBuilder');

module.exports = async function pollAccountFor(address, property, value = false, interval = 3, timeout = 10000) {
    const trobkit = trobkitBuilder.createInstance();
    const now = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (Date.now() > now + timeout) {
            throw new Error('Timeout...');
        }
        wait(interval);
        const result = await trobkit.trob.getAccount(address);
        if (typeof property === 'string') {
            const data = result[property];
            if (data) {
                if (value) {
                    if (data == value) return Promise.resolve(result);
                } else {
                    return Promise.resolve(result);
                }
            }
        } else if (typeof property === 'function') {
            if (property(result)) {
                return Promise.resolve(result);
            }
        }
    }
};

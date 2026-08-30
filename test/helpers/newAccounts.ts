import trobkitBuilder from './trobkitBuilder.js';

const amount = Number(process.argv[2]) || 10;

(async function () {
    await trobkitBuilder.newTestAccounts(amount);
})();

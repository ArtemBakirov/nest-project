const { Wallet } = require('ethers');
const w = Wallet.createRandom();
console.log('ADDRESS=', w.address); // в .env: LIGHTHOUSE_WALLET_ADDRESS
console.log('PRIVATE_KEY=', w.privateKey); // в .env: LIGHTHOUSE_WALLET_PRIVATE_KEY

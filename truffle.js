let HDWalletProvider = require("truffle-hdwallet-provider");
let mnemonic = "cable high nice seek trash erase garage already fork fog manual series express clay easily pelican imitate detect gaze level protect agree stem area"
/*
 * NB: since truffle-hdwallet-provider 0.0.5 you must wrap HDWallet providers in a 
 * function when declaring them. Failure to do so will cause commands to hang. ex:
 * ```
 * mainnet: {
 *     provider: function() { 
 *       return new HDWalletProvider(mnemonic, 'https://mainnet.infura.io/<infura-key>') 
 *     },
 *     network_id: '1',
 *     gas: 4500000,
 *     gasPrice: 10000000000,
 *   },
 */

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
    networks: {
        development: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "*"
        },
        rinkeby: {
            provider: function() {
                return new HDWalletProvider(
                    mnemonic,
                    "https://rinkeby.infura.io/v3/08664baf7af14eda956db2b71a79f12f",
                    0,
                    2   // one for coop owner (Coop contract), one for toke issuer (EUR contract)
                );
            },
            network_id: 4,
            gas: 6000000,
            gasPrice: 10000000000,
        }
    },
    mocha: {
        reporter: 'eth-gas-reporter',
        reporterOptions : {
            currency: 'EUR'
        }
    },
    compilers: {
        solc: {
            version: "0.4.25"
        }
    }
};

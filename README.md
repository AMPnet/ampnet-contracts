# AMPnet Crowdfunding contracts

AMPnet Crowdfunding core smart contracts written in Solidity using [Truffle tools](https://truffleframework.com/) environment.

## Running the tests

In order to run the tests, ganache-cli (fast Ethereum RPC client) must be active. Start it by executing following command
```
$ ./initialize-ganache-cli.sh
```

NOTE: This script has to be run only once. It will create local docker image named _ampnet-ganache_ with preloaded wallets and balances. Next time when booting ganache simply use
```
$ docker start ampnet-ganache
```

For running all the tests use following command
```
$ npm run test
```
or 
```
$ truffle test
```

## Running linter

For linting purposes, [protofire/solhint](https://github.com/protofire/solhint) package is used. This package provides both *Security* and *Style Guide* validations. It conforms to officially recommended [Solidity Style Guide](https://solidity.readthedocs.io/en/v0.5.0/style-guide.html).

Run following command to start linter on all contract source files
```
$ npm run lint
```
var EUR = artifacts.require("./EUR.sol")
var AMPnet = artifacts.require("./AMPnet.sol");

module.exports = function(deployer, network, accounts) {

    const ampnetOwner = accounts[0];
    const eurTokenOwner = accounts[1];

    deployer.deploy(AMPnet, { from: ampnetOwner }).then(() => {
        deployer.deploy(EUR, AMPnet.address, { from: eurTokenOwner }).then(() => {
            AMPnet.deployed().then(function(instance) {
                return instance.setEur(EUR.address);
            })
        })
    });

}
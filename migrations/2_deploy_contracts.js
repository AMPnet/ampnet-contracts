const EUR = artifacts.require("./EUR.sol")
const Cooperative = artifacts.require("./Cooperative.sol");

module.exports = async function(deployer, network, accounts) {

    const coopOwner = accounts[0];
    const eurTokenOwner = accounts[1];

    deployer.deploy(Cooperative, { from: coopOwner }).then(() => {
        return deployer.deploy(EUR, Cooperative.address, { from: eurTokenOwner }).then(() => {
            Cooperative.deployed().then(function(instance) {
                instance.setToken(EUR.address, { from: ampnetOwner });
            })
        })
    });

};
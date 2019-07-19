const EUR = artifacts.require("./EUR.sol")
const Cooperative = artifacts.require("./Cooperative.sol");

module.exports = async function(deployer, network, accounts) {

    const coopOwner = accounts[0];
    const eurTokenOwner = accounts[1];

    deployer.deploy(Cooperative, { from: coopOwner })
        .then(() => Cooperative.deployed())
        .then((coopInstance) => {
            return deployer.deploy(EUR, coopInstance.address, { from: eurTokenOwner }).then(() => EUR.deployed())
                .then((eurInstance) => {
                    return coopInstance.setToken(eurInstance.address, { from: coopOwner });
                });
        });
};

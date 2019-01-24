const EUR = artifacts.require("./EUR.sol")
const AMPnet = artifacts.require("./AMPnet.sol");

module.exports = async function(deployer, network, accounts) {

    const ampnetOwner = accounts[0];
    const eurTokenOwner = accounts[1];

    deployer.deploy(AMPnet, { from: ampnetOwner }).then(() => {
        console.log(`ampnet owner: ${ampnetOwner}`);
        return deployer.deploy(EUR, AMPnet.address, { from: eurTokenOwner }).then(() => {
            AMPnet.deployed().then(function(instance) {
                instance.setEur(EUR.address, { from: ampnetOwner });
            })
        })
    });

};
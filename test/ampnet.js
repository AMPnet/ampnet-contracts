const AMPnet = artifacts.require("./AMPnet.sol");
const EUR = artifacts.require("./EUR.sol");
const Organization = artifacts.require("./Organization.sol");

const getCurrentTime = require('./utils/time').getCurrentTime;
const assertRevert = require('./utils/assertRevert').assertRevert;

contract('AMPnet', function(accounts) {

    // Preloaded accounts

    const ampnetOwner = accounts[0];
    const eurTokenOwner = accounts[1];
    const bob = accounts[2];

    // Reference to deployed contracts

    var ampnet;
    var eur;

    // Redeploy for each test (clean state)

    beforeEach(async () => {
        ampnet = await AMPnet.new({ from: ampnetOwner });       // deploy AMPnet with ampnetOwner account
        eur = await EUR.new(ampnet.address, { from: eurTokenOwner });   // deploy EUR token with eurTokenOwner as minter
        await ampnet.setEur(eur.address, { from: ampnetOwner });        // save EUR token address in AMPnet contract
    });

    // --- TEST CASES ---- //

    it("is deployed with AMPnet as owner", async () => {
        const actualOwner = await ampnet.owner();
        assert.strictEqual(actualOwner, ampnetOwner, "AMPnet was not deployed by expected owner.")
    });

    it("can register new user if caller is AMPnet owner", async () => {
        await ampnet.addWallet(bob, { from: ampnetOwner });
        const bobWalletActive = await ampnet.isWalletActive(bob);
        assert.ok(bobWalletActive, "Bob's wallet is active!");
    });

    it("should fail if trying to register new user when caller not AMPnet owner", async () => {
        const addWallet = ampnet.addWallet(bob, { from: bob });
        await assertRevert(addWallet, "Not allowed to add wallet, not an AMPnet owner!");
    });

    it("can add new organization if caller's wallet is registered by AMPnet", async () => {
        const organizationName = "Greenpeace";

        await ampnet.addWallet(bob, { from: ampnetOwner });
        await ampnet.addOrganization(organizationName, { from: bob });
        const organizations = await ampnet.getAllOrganizations();

        assert.isArray(organizations, "Result not an array!");
        assert.strictEqual(organizations.length, 1, "Expected array of size 1.");

        const organizationContract = Organization.at(organizations[0]);
        const deployedOrganizationName = await organizationContract.getName();
        assert.strictEqual(
            deployedOrganizationName,
            organizationName,
            "Expected deployed organization name to be `Greenpeace`."
        )

    });

    it("should signal organization does not exist if org not created by AMPnet", async () => {
        const bob = accounts[0];
        const organization = await Organization.new(bob, "Greenpeace", ampnet.address);
        const organizationExists = await ampnet.organizationExists(organization.address);

        assert.notOk(organizationExists, "Organization should not exist if created by anyone other than AMPnet!");
    });

    it("should fail if non-registered user is trying to create organization", async () => {
        const organizationName = "Greenpeace";
        const addOrganization = ampnet.addOrganization(organizationName, { from: bob });
        await assertRevert(addOrganization, "Not allowed to create organization as non-registered user.");
    });

});
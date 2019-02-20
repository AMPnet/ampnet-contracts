const Cooperative = artifacts.require("./Cooperative.sol");
const EUR = artifacts.require("./EUR.sol");
const Organization = artifacts.require("./Organization.sol");

const assertRevert = require('./utils/assertRevert').assertRevert;
const truffleAssert = require('truffle-assertions');

contract('Cooperative', function(accounts) {

    // Preloaded accounts

    const coopOwner = accounts[0];
    const eurTokenOwner = accounts[1];
    const bob = accounts[2];

    // Reference to deployed contracts

    var coop;
    var eur;

    // Redeploy for each test (clean state)

    beforeEach(async () => {
        coop = await Cooperative.new({ from: coopOwner });          // deploy Cooperative with coopOwner account
        eur = await EUR.new(coop.address, { from: eurTokenOwner }); // deploy EUR token with eurTokenOwner as minter
        await coop.setToken(eur.address, { from: coopOwner });    // save EUR token address in Cooperative contract
    });

    // --- TEST CASES ---- //

    it("is deployed with coopOwner wallet as owner", async () => {
        const actualOwner = await coop.owner();
        assert.strictEqual(actualOwner, coopOwner, "Cooperative was not deployed by expected owner.")
    });

    it("can register new user if caller is Cooperative owner", async () => {
        let result = await coop.addWallet(bob, { from: coopOwner });
        const bobWalletActive = await coop.isWalletActive(bob);
        assert.ok(bobWalletActive, "Bob's wallet is active!");
        truffleAssert.eventEmitted(result, 'WalletAdded', (ev) => {
            return ev.wallet === bob
        }, "Wallet creation transaction did not emit correct event!")
    });

    it("should fail if trying to register new user when caller not Cooperative owner", async () => {
        const addWallet = coop.addWallet(bob, { from: bob });
        await assertRevert(addWallet, "Not allowed to add wallet, not an Cooperative owner!");
    });

    it("can add new organization if caller's wallet is registered by Cooperative", async () => {
        await coop.addWallet(bob, { from: coopOwner });
        let result = await coop.addOrganization({ from: bob });
        const organizations = await coop.getOrganizations();

        assert.isArray(organizations, "Result not an array!");
        assert.strictEqual(organizations.length, 1, "Expected array of size 1.");

        truffleAssert.eventEmitted(result, 'OrganizationAdded', (ev) => {
            return ev.organization === organizations[0]
        }, "Organization creation transaction did not emit correct event!");
    });

    it("should signal organization does not exist if org not created by Cooperative", async () => {
        const bob = accounts[0];
        const organization = await Organization.new(bob, coop.address);
        const organizationExists = await coop.isOrganizationActive(organization.address);

        assert.notOk(organizationExists, "Organization should not exist if created by anyone other than Cooperative!");
    });

    it("should fail if non-registered user is trying to create organization", async () => {
        const addOrganization = coop.addOrganization({ from: bob });
        await assertRevert(addOrganization, "Not allowed to create organization as non-registered user.");
    });

});
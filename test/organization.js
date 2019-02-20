const Cooperative = artifacts.require("./Cooperative.sol");
const EUR = artifacts.require("./EUR.sol");
const Organization = artifacts.require("./Organization.sol");
const Project = artifacts.require("./Project.sol");

const eurToToken = require('./utils/eur').eurToToken;
const assertRevert = require('./utils/assertRevert').assertRevert;

const truffleAssert = require('truffle-assertions');

contract('Organization', function(accounts) {

    // Preloaded accounts

    const coopOwner = accounts[0];
    const eurTokenOwner = accounts[1];
    const bob = accounts[2];
    const alice = accounts[3];

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

    it("is not verified by default", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization(bob);
        const organizationStatus = await organization.verifiedByCoop();
        assert.isNotOk(organizationStatus);
    });

    it("has no active wallet by default", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization(bob);
        const walletActive = await coop.isWalletActive(organization.address);
        assert.isNotOk(walletActive, "Expected organization's wallet to be disabled by default.")
    });

    it("can get verified by Cooperative (which results in active organization wallet)", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization(bob);
        const result = await organization.activate({from: coopOwner});

        const organizationStatus = await organization.verifiedByCoop();
        assert.isOk(organizationStatus);

        const walletStatus = await coop.isWalletActive(organization.address);
        assert.isOk(walletStatus);

        truffleAssert.eventEmitted(result, 'OrganizationApproved');
    });

    it("cannot get verified by anyone other than Cooperative", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization(bob);
        const activate = organization.activate( {from: bob} );
        await assertRevert(activate, "Only Cooperative owner can activate an organization!");
    });

    it("can create new project if caller is organization admin and organization is verified", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization(bob);
        await organization.activate( {from: coopOwner} );
        let result = await addTestProject(organization, bob);

        const deployedProjects = await organization.getProjects();
        assert.isArray(deployedProjects, "Result not an array!");
        assert.strictEqual(deployedProjects.length, 1, "Expected array of size 1.");

        const deployedProject = Project.at(deployedProjects[0]);

        const actualMaxInvestmentPerUser    = await deployedProject.maxInvestmentPerUser();
        const actualMinInvestmentPerUser    = await deployedProject.minInvestmentPerUser();
        const actualInvestmentCap           = await deployedProject.investmentCap();

        const isProjectWalletActive = await coop.isWalletActive(deployedProject.address);

        assert.strictEqual(
            actualMaxInvestmentPerUser.toNumber(),
            testProject.maxInvestment,
            "Deployed project max investment per user different from expected."
        );

        assert.strictEqual(
            actualMinInvestmentPerUser.toNumber(),
            testProject.minInvestment,
            "Deployed project min investment per user different from expected."
        );

        assert.strictEqual(
            actualInvestmentCap.toNumber(),
            testProject.investmentCap,
            "Deployed project investment cap different from expected."
        );

        assert.isOk(isProjectWalletActive, "When project is created, project's EUR wallet should be active.");

        truffleAssert.eventEmitted(result, 'ProjectAdded', (ev) => {
            return ev.project === deployedProjects[0]
        }, "Project creation transaction did not emit correct event!")
    });

    it("should fail to create project if caller is not an organization admin", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization(bob);
        await organization.activate( {from: coopOwner} );
        const addProject = addTestProject(organization, alice);
        await assertRevert(addProject, "Only organization admin can add projects!");
    });

    it("should fail to create project if organization is not verified", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization(bob);
        const addProject = addTestProject(organization, bob);
        await assertRevert(addProject, "Only verified organizations can create new projects!");
    });

    it(`can add new user if:
           user is registered by coop,
           organization is confirmed by coop
           and caller is organization admin`, async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        const organization = await createTestOrganization(bob);
        await organization.activate( {from: coopOwner} );
        const result = await organization.addMember(alice, { from: bob });

        const members = await organization.getMembers();
        assert.isArray(members, "Result not an array!");
        assert.strictEqual(members.length, 1, "Expected array of size 1.");

        const actualMember = members[0];
        assert.strictEqual(actualMember, alice, "Organization member not the same as added one!");

        truffleAssert.eventEmitted(result, 'MemberAdded', (ev) => {
            return ev.member === alice
        }, "Member add transaction did not emit correct event!")
    });

    it("should fail if trying to add user as organization member if caller not org admin", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        const organization = await createTestOrganization(bob);
        await organization.activate( {from: coopOwner} );
        const addMember = organization.addMember(alice, { from: alice });
        await assertRevert(addMember, "Only organization admin can add new members!");
    });

    it("should fail if trying to add user as organization member but org not verified", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        const organization = await createTestOrganization(bob);
        const addMember = organization.addMember(bob, { from: alice });
        await assertRevert(addMember, "Only verified organizations can accept new members!");
    });

    it("should fail if trying to add user as organization member but user not registered by Cooperative", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization(bob);
        await organization.activate( {from: coopOwner} );
        const addMember = organization.addMember(alice, { from: bob });
        await assertRevert(addMember, "Only users registered by Cooperative can become members of organizations!");
    });

    it("can receive and withdraw funds only if caller is organization admin", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization(bob);
        await organization.activate( {from: coopOwner} );

        const initialOrganizationBalance = eurToToken(1000);
        const withdrawAmount = eurToToken(500);
        const remainingOrganizationBalance = initialOrganizationBalance - withdrawAmount;

        await eur.mint(organization.address, initialOrganizationBalance, { from: eurTokenOwner });
        await organization.withdrawFunds(eurTokenOwner, withdrawAmount, { from: bob });
        await eur.burnFrom(organization.address, withdrawAmount, { from: eurTokenOwner });

        const fetchedAmount = await eur.balanceOf(organization.address);
        assert.strictEqual(
            fetchedAmount.toNumber(),
            remainingOrganizationBalance,
            "Expected organization's balance to be reduced by withdrawn amount!"
        );
    });

    it("fails to withdraw funds if caller not organization admin", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        const organization = await createTestOrganization(bob);
        await organization.activate( {from: coopOwner} );

        await eur.mint(organization.address, eurToToken(1000), { from: eurTokenOwner });
        const failedWithdraw = organization.withdrawFunds(eurTokenOwner, eurToToken(500), { from: alice });
        await assertRevert(
            failedWithdraw,
            "Expected withdraw action to fail when called by anyone other but organization admin!"
        );
    });

    // --- HELPER FUNCTIONS --- ///

    async function createTestUser(wallet) {
        await coop.addWallet(wallet, {from: coopOwner});
    }

    async function createTestOrganization(admin) {
        await coop.addOrganization({from: admin});
        const organizations = await coop.getOrganizations();
        return Organization.at(organizations[0]);
    }

    async function addTestProject(organization, creatorWallet) {
        return organization.addProject(
            testProject.maxInvestment,      // max investment per user (10k EUR)
            testProject.minInvestment,      // min investment per user (1k EUR)
            testProject.investmentCap,      // investment cap (10M EUR)
            { from: creatorWallet }
        );
    }

    // --- TEST DATA --- ///

    const testProject = {
        maxInvestment: eurToToken(10000),
        minInvestment: eurToToken(1000),
        investmentCap: eurToToken(10000000)
    }

});
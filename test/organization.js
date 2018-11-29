const AMPnet = artifacts.require("./AMPnet.sol");
const EUR = artifacts.require("./EUR.sol");
const Organization = artifacts.require("./Organization.sol");
const Project = artifacts.require("./Project.sol");

const eurToToken = require('./utils/eur').eurToToken;
const assertRevert = require('./utils/assertRevert').assertRevert;

contract('Organization', function(accounts) {

    // Preloaded accounts

    const ampnetOwner = accounts[0];
    const eurTokenOwner = accounts[1];
    const bob = accounts[2];
    const alice = accounts[3];

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

    it("is not verified by default", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization("Greenpeace", bob);
        const organizationStatus = await organization.isVerified();
        assert.isNotOk(organizationStatus);
    });

    it("can get verified by AMPnet", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization("Greenpeace", bob);
        await organization.activate({from: ampnetOwner});
        const organizationStatus = await organization.isVerified();
        assert.isOk(organizationStatus);
    });

    it("cannot get verified by anyone other than AMPnet", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization("Greenpeace", bob);
        const activate = organization.activate( {from: bob} );
        await assertRevert(activate, "Only AMPnet can activate an organization!");
    });

    it("can create new project if caller is organization admin and organization is verified", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization("Greenpeace", bob);
        await organization.activate( {from: ampnetOwner} );
        await addTestProject(organization, bob);

        const deployedProjects = await organization.getAllProjects();
        assert.isArray(deployedProjects, "Result not an array!");
        assert.strictEqual(deployedProjects.length, 1, "Expected array of size 1.");

        const deployedProject = Project.at(deployedProjects[0]);

        const actualName                    = await deployedProject.getName();
        const actualDescription             = await deployedProject.getDescription();
        const actualMaxInvestmentPerUser    = await deployedProject.getMaxInvestmentPerUser();
        const actualMinInvestmentPerUser    = await deployedProject.getMinInvestmentPerUser();
        const actualInvestmentCap           = await deployedProject.getInvestmentCap();

        assert.strictEqual(
            actualName,
            testProject.name,
            "Deployed project name different from expected."
        );

        assert.strictEqual(
            actualDescription,
            testProject.description,
            "Deployed project description different from expected."
        );

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
    });

    it("should fail to create project if caller is not an organization admin", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization("Greenpeace", bob);
        await organization.activate( {from: ampnetOwner} );
        const addProject = addTestProject(organization, alice);
        await assertRevert(addProject, "Only organization admin can add projects!");
    });

    it("should fail to create project if organization is not verified", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization("Greenpeace", bob);
        const addProject = addTestProject(organization, bob);
        assertRevert(addProject, "Only verified organizations can create new projects!");
    });

    it(`can add new user if: 
           user is registered by ampnet, 
           organization is confirmed by ampnet 
           and caller is organization admin`, async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        const organization = await createTestOrganization("Greenpeace", bob);
        await organization.activate( {from: ampnetOwner} );
        await organization.addMember(alice, { from: bob });

        const members = await organization.getMembers();
        assert.isArray(members, "Result not an array!");
        assert.strictEqual(members.length, 1, "Expected array of size 1.");

        const actualMember = members[0];
        assert.strictEqual(actualMember, alice, "Organization member not the same as added one!");
    });

    it("should fail if trying to add user as organization member if caller not org admin", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        const organization = await createTestOrganization("Greenpeace", bob);
        await organization.activate( {from: ampnetOwner} );
        const addMember = organization.addMember(alice, { from: alice });
        await assertRevert(addMember, "Only organization admin can add new members!");
    });

    it("should fail if trying to add user as organization member but org not verified", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        const organization = await createTestOrganization("Greenpeace", bob);
        const addMember = organization.addMember(bob, { from: alice });
        await assertRevert(addMember, "Only verified organizations can accept new members!");
    });

    it("should fail if trying to add user as organization member but user not registered by AMPnet", async () => {
        await createTestUser(bob);
        const organization = await createTestOrganization("Greenpeace", bob);
        await organization.activate( {from: ampnetOwner} );
        const addMember = organization.addMember(alice, { from: bob });
        await assertRevert(addMember, "Only users registered by AMPnet can become members of organizations!");
    });

    // --- HELPER FUNCTIONS --- ///

    async function createTestUser(wallet) {
        await ampnet.addWallet(wallet, {from: ampnetOwner});
    }

    async function createTestOrganization(name, admin) {
        await ampnet.addOrganization(name, {from: admin});
        const organizations = await ampnet.getAllOrganizations();
        return Organization.at(organizations[0]);
    }

    async function addTestProject(organization, creatorWallet) {
        return organization.addProject(
            testProject.name,               // project name
            testProject.description,        // project description
            testProject.maxInvestment,      // max investment per user (10k EUR)
            testProject.minInvestment,      // min investment per user (1k EUR)
            testProject.investmentCap,      // investment cap (10M EUR)
            { from: creatorWallet }
        );
    }

    // --- TEST DATA --- ///

    const testProject = {
        name: "VE Lukovac",
        description: "Najbolja vjetroelektrana ikad",
        maxInvestment: eurToToken(10000),
        minInvestment: eurToToken(1000),
        investmentCap: eurToToken(10000000)
    }

});
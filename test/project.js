const AMPnet = artifacts.require("./AMPnet.sol");
const EUR = artifacts.require("./EUR.sol");
const Organization = artifacts.require("./Organization.sol");
const Project = artifacts.require("./Project.sol");

const eurToToken = require('./utils/eur').eurToToken;
const tokenToEur = require('./utils/eur').tokenToEur;
const assertRevert = require('./utils/assertRevert').assertRevert;

contract('Project', function(accounts) {

    // Preloaded accounts

    const ampnetOwner = accounts[0];
    const eurTokenOwner = accounts[1];
    const bob = accounts[2];
    const alice = accounts[3];
    const jane = accounts[4];

    // Reference to deployed contracts

    var ampnet;
    var eur;

    // Redeploy for each test (clean state)

    beforeEach(async () => {
        ampnet = await AMPnet.new({from: ampnetOwner});       // deploy AMPnet with ampnetOwner account
        eur = await EUR.new(ampnet.address, {from: eurTokenOwner});   // deploy EUR token with eurTokenOwner as minter
        await ampnet.setEur(eur.address, {from: ampnetOwner});        // save EUR token address in AMPnet contract
    });

    // --- TEST CASES ---- //

    it("is open for investments by default", async () => {
        await createTestUser(bob);
        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);
        const openForInvestments = !(await project.isLockedForInvestments());
        assert.ok(openForInvestments, "Expected project to be open for investments by default!");
    });

    it("has an active EUR wallet for receiving investments", async () => {
        await createTestUser(bob);
        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);
        const walletActive = await ampnet.isWalletActive(project.address);
        assert.ok(walletActive, "Expected project's EUR wallet to be active!");
    });

    it("can accept new user investment", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);

        const aliceInitialBalance = eurToToken(1000);
        const aliceInvestment = eurToToken(1000);
        const aliceFinalBalance = aliceInitialBalance - aliceInvestment;

        await eur.mint(alice, aliceInitialBalance, { from: eurTokenOwner });
        await eur.invest(project.address, aliceInvestment, { from: alice });

        const fetchedAliceBalance = await eur.balanceOf(alice);
        assert.strictEqual(
            fetchedAliceBalance.toNumber(),
            aliceFinalBalance,
            "Alice balance expected to be zero!"
        );

        const fetchedAliceInvestment = await project.getTotalInvestmentForUser(alice);
        assert.strictEqual(
            fetchedAliceInvestment.toNumber(),
            aliceInvestment,
            "Alice investment expected to be 1k EUR!"
        );
    });

    it("allows user to cancel complete investment if project not locked", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);

        const aliceBalance = eurToToken(1000);
        await eur.mint(alice, aliceBalance, { from: eurTokenOwner });
        await eur.invest(project.address, aliceBalance, { from: alice });
        await project.cancelInvestment(aliceBalance, { from: alice });

        const fetchedAliceBalance = await eur.balanceOf(alice);
        assert.strictEqual(
            fetchedAliceBalance.toNumber(),
            aliceBalance,
            "Expected alice balance to be equal to initial, as she cancelled full investment."
        );

        const fetchedAliceInvestment = await project.getTotalInvestmentForUser(alice);
        assert.strictEqual(
            fetchedAliceInvestment.toNumber(),
            0,
            "Expected alice's project to be zero, as she cancelled full investment."
        );
    });

    it("allows user to cancel portion of investment, if remaining part is still greater than or equal to min per-user investment", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);

        const aliceBalance = eurToToken(1100);
        const aliceInitialInvestment = eurToToken(1100);
        const aliceCancelledPortion = eurToToken(100);
        const aliceRemainingInvestment = aliceInitialInvestment - aliceCancelledPortion;
        const aliceRemainingBalance = aliceBalance - aliceInitialInvestment + aliceCancelledPortion;

        await eur.mint(alice, aliceBalance, { from: eurTokenOwner });
        await eur.invest(project.address, aliceInitialInvestment, { from: alice });
        await project.cancelInvestment(aliceCancelledPortion, { from: alice });

        const fetchedAliceBalance = await eur.balanceOf(alice);
        const fetchedAliceInvestment = await project.getTotalInvestmentForUser(alice);

        assert.strictEqual(
            fetchedAliceBalance.toNumber(),
            aliceRemainingBalance,
            "Expected alice's balance to be equal to cancelled portion of investment."
        );

        assert.strictEqual(
            fetchedAliceInvestment.toNumber(),
            aliceRemainingInvestment,
            "Expected alice's remaining investment to be equal to initial investment reduced by cancelled amount."
        );
    });

    it("should fail if user cancels portion of investment and remaining part is smaller than min per-user investment", async () => {
        await createTestUser(bob);
        await createTestUser(alice);

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);

        await eur.mint(alice, eurToToken(1000), { from: eurTokenOwner }); // 1k EUR is min investment for testProject
        await eur.invest(project.address, eurToToken(1000), { from: alice });

        const failedCancel = project.cancelInvestment(eurToToken(100), { from: alice });
        await assertRevert(
            failedCancel,
            "If portion of investment cancelled, remaining part must be at least equal to min per-user investment"
        );

    });

    it("should fail if user tries to cancel 0 tokens of investment", async () => {
        await createTestUser(bob);
        await createTestUser(alice);

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);

        await eur.mint(alice, eurToToken(1100), { from: eurTokenOwner }); // 1k EUR is min investment for testProject
        await eur.invest(project.address, eurToToken(1100), { from: alice });

        const failedCancel = project.cancelInvestment(eurToToken(0), { from: alice });
        await assertRevert(
            failedCancel,
            "Cannot cancel 0 tokens of investment!"
        );
    });

    it("should fail if user tries to cancel more than actually invested", async () => {
        await createTestUser(bob);
        await createTestUser(alice);

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);

        await eur.mint(alice, eurToToken(1100), { from: eurTokenOwner }); // 1k EUR is min investment for testProject
        await eur.invest(project.address, eurToToken(1100), { from: alice });

        const failedCancel = project.cancelInvestment(eurToToken(1500), { from: alice });
        await assertRevert(
            failedCancel,
            "Cannot cancel more than actually invested!"
        );
    });

    it("locks for investment after investment cap has been reached", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        await createTestUser(jane);

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, smallTestProject); // investment cap 5k EUR

        await eur.mint(alice, eurToToken(2500), { from: eurTokenOwner });
        await eur.mint(jane, eurToToken(2500), { from: eurTokenOwner });

        // Alice and Jane invest 2.5k EUR each, and project's 5k EUR cap should be reached
        await eur.invest(project.address, eurToToken(2500), { from: alice });
        await eur.invest(project.address, eurToToken(2500), { from: jane });

        const isLockedForInvestments = await project.isLockedForInvestments();
        assert.isOk(isLockedForInvestments, "Project should be locked for investments when cap is reached");
    });

    it("should fail if user tries to invest in locked project", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        await createTestUser(jane);

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, smallTestProject); // investment cap 5k EUR

        await eur.mint(alice, eurToToken(5000), { from: eurTokenOwner });
        await eur.mint(jane, eurToToken(1000), { from: eurTokenOwner });

        // Alice invests 5k EUR and caps project
        await eur.invest(project.address, eurToToken(5000), { from: alice });

        // Jane tries to invest more but should fail because cap reached
        const failedInvest = eur.invest(project.address, eurToToken(1000), { from: jane });
        await assertRevert(
            failedInvest,
            "User cannot invest in projects that reached their investment cap"
        );
    });

    it("should fail if user tries to cancel investment from locked project", async () => {
        await createTestUser(bob);
        await createTestUser(alice);

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, smallTestProject); // investment cap 5k EUR

        await eur.mint(alice, eurToToken(5000), { from: eurTokenOwner });

        // Alice invests 5k EUR and caps project (project is locked)
        await eur.invest(project.address, eurToToken(5000), { from: alice });

        // Alice tries to cancel portion of investment even though project has been locked (should fail)
        const failedCancel = project.cancelInvestment(eurToToken(1000), { from: alice });

        await assertRevert(
            failedCancel,
            "User cannot cancel investment if project has been locked"
        );
    });


    it("can process ownership transfer from one account to another", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        await createTestUser(jane);

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, smallTestProject); // investment cap 5k EUR

        const aliceInitialInvestment = eurToToken(5000);
        const janeInitialInvestment = eurToToken(0);
        const aliceToJaneTransferAmount = eurToToken(5000);
        const aliceFinalInvestment = aliceInitialInvestment - aliceToJaneTransferAmount;
        const janeFinalInvestment = janeInitialInvestment + aliceToJaneTransferAmount;

        // Alice invests 5k EUR and caps project (project is locked)
        await eur.mint(alice, aliceInitialInvestment, { from: eurTokenOwner });
        await eur.invest(project.address, aliceInitialInvestment, { from: alice });

        await project.transferOwnership(jane, aliceToJaneTransferAmount, { from: alice });

        const aliceFetchedInvestment = await project.getTotalInvestmentForUser(alice);
        const janeFetchedInvestment = await project.getTotalInvestmentForUser(jane);

        await assert.strictEqual(
            aliceFetchedInvestment.toNumber(),
            aliceFinalInvestment,
            "Expected Alice's investment to be decreased for amount of tokens sent to Jane"
        );

        await assert.strictEqual(
            janeFetchedInvestment.toNumber(),
            janeFinalInvestment,
            "Expected Jane's investment to be increased for amount of tokens sent from Alice"
        );
    });

    it("should fail if user trying to transfer 0 tokens of ownership", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        await createTestUser(jane);

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, smallTestProject); // investment cap 5k EUR

        await eur.mint(alice, eurToToken(5000), { from: eurTokenOwner });
        await eur.invest(project.address, eurToToken(5000), { from: alice });

        const failedTransfer = project.transferOwnership(jane, eurToToken(0), { from: alice });
        await assertRevert(
            failedTransfer,
            "Cannot transfer ownership of 0 tokens!"
        );
    });

    it("should fail if user trying to transfer more tokens than actually invested", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        await createTestUser(jane);

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, smallTestProject); // investment cap 5k EUR

        await eur.mint(alice, eurToToken(5000), { from: eurTokenOwner });
        await eur.invest(project.address, eurToToken(3000), { from: alice });

        // Alice is trying to transfer 4000 EUR tokens but owns only 3000 EUR of investments
        const failedTransfer = project.transferOwnership(jane, eurToToken(4000), { from: alice });
        await assertRevert(
            failedTransfer,
            "Cannot transfer more tokens than actually invested!"
        );
    });

    it("should fail if user trying to transfer tokens to someone not registered by AMPnet", async () => {
        await createTestUser(bob);
        await createTestUser(alice);

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, smallTestProject); // investment cap 5k EUR

        await eur.mint(alice, eurToToken(5000), { from: eurTokenOwner });
        await eur.invest(project.address, eurToToken(3000), { from: alice });

        // Alice is trying to transfer 3000 EUR tokens to someone not registered by AMPnet
        const failedTransfer = project.transferOwnership(jane, eurToToken(3000), { from: alice });
        await assertRevert(
            failedTransfer,
            "Cannot transfer tokens to someone not registered by AMPnet!"
        );
    });

    it("allows organization admin to withdraw funds from project, if funding cap reached", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        await createTestUser(jane);

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, smallTestProject); // investment cap 5k EUR

        await eur.mint(alice, eurToToken(2500), { from: eurTokenOwner });
        await eur.mint(jane, eurToToken(2500), { from: eurTokenOwner });

        // Alice and Jane invest 2.5k EUR each, and project's 5k EUR cap should be reached
        await eur.invest(project.address, eurToToken(2500), { from: alice });
        await eur.invest(project.address, eurToToken(2500), { from: jane });

        // Withdraw complete investment amount after cap reached
        await project.withdrawFunds(eurTokenOwner, smallTestProject.investmentCap, { from: bob });
        await eur.burnFrom(project.address, smallTestProject.investmentCap, { from: eurTokenOwner });
        const fetchedBalance = await eur.balanceOf(project.address);
        assert.strictEqual(
            fetchedBalance.toNumber(),
            eurToToken(0),
            "Expected project balance to be zero after investment cap reached and funds withdrawn!"
        );
    });

    it("should fail if trying to withdraw funds from project which is not yet completely funded", async () => {
        await createTestUser(bob);
        await createTestUser(alice);

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, smallTestProject); // investment cap 5k EUR

        await eur.mint(alice, eurToToken(2500), { from: eurTokenOwner });

        // Alice invests 2.5k, project investment cap not reached
        await eur.invest(project.address, eurToToken(2500), { from: alice });

        const failedWithdraw = project.withdrawFunds(eurTokenOwner, eurToToken(2500), { from: bob });
        assertRevert(
            failedWithdraw,
            "Expected withdraw action to fail since project investment cap not reached."
        );
    });

    it("should fail if anyone other but organization admin tries to withdraw project funds", async () => {
        await createTestUser(bob);
        await createTestUser(alice);
        await createTestUser(jane);

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, smallTestProject); // investment cap 5k EUR

        await eur.mint(alice, eurToToken(2500), { from: eurTokenOwner });

        // Alice invests 5k, and caps project
        await eur.invest(project.address, eurToToken(2500), { from: alice });

        // Evil Jane tries to withdraw project funds
        const failedWithdraw = project.withdrawFunds(eurTokenOwner, eurToToken(5000), { from: jane })
        assertRevert(
            failedWithdraw,
            "Expected withdraw action to fail since caller not organization admin."
        );
    });

    // --- HELPER FUNCTIONS --- ///

    async function createTestUser(wallet) {
        await ampnet.addWallet(wallet, { from: ampnetOwner });
    }

    async function createAndActivateTestOrganization(admin) {
        await ampnet.addOrganization({ from: admin });
        const organizations = await ampnet.getAllOrganizations();
        const organization = Organization.at(organizations[0]);
        await organization.activate( {from: ampnetOwner });
        return organization
    }

    async function addTestProject(organization, creatorWallet, project) {
        await organization.addProject(
            project.name,               // project name
            project.description,        // project description
            project.maxInvestment,      // max investment per user (10k EUR)
            project.minInvestment,      // min investment per user (1k EUR)
            project.investmentCap,      // investment cap (10M EUR)
            { from: creatorWallet }
        );
        const projects = await organization.getAllProjects();
        return Project.at(projects[0]);
    }

    // --- TEST DATA --- ///

    const testProject = {
        name: "VE Lukovac",
        description: "Najbolja vjetroelektrana ikad",
        maxInvestment: eurToToken(10000),
        minInvestment: eurToToken(1000),
        investmentCap: eurToToken(10000000)
    };

    const smallTestProject = {
        name: "Small project",
        description: "Low investments",
        maxInvestment: eurToToken(5000),
        minInvestment: eurToToken(1000),
        investmentCap: eurToToken(5000)
    };

});
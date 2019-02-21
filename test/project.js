const Cooperative = artifacts.require("./Cooperative.sol");
const EUR = artifacts.require("./EUR.sol");
const Organization = artifacts.require("./Organization.sol");
const Project = artifacts.require("./Project.sol");

const eurToToken = require('./utils/eur').eurToToken;
const time = require('./utils/time');

const truffleAssert = require('truffle-assertions');
const assertRevert = require('./utils/assertRevert').assertRevert;

contract('Project', function(accounts) {

    // Preloaded accounts

    const coopOwner = accounts[0];
    const eurTokenOwner = accounts[1];
    const bob = accounts[2];
    const alice = accounts[3];
    const jane = accounts[4];

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

    it("is open for investments by default", async () => {
        await createTestUser(bob);
        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);
        const openForInvestments = !(await project.isCompletelyFunded());
        assert.ok(openForInvestments, "Expected project to be open for investments by default!");
    });

    it("has an active EUR wallet for receiving investments", async () => {
        await createTestUser(bob);
        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);
        const walletActive = await coop.isWalletActive(project.address);
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

        // Deposit and invest in project
        await eur.mint(alice, aliceInitialBalance, { from: eurTokenOwner });
        await eur.approve(project.address, aliceInvestment, { from: alice });
        const result = await project.invest({ from: alice });

        const fetchedAliceBalance = await eur.balanceOf(alice);
        assert.strictEqual(
            fetchedAliceBalance.toNumber(),
            aliceFinalBalance,
            "Alice balance expected to be zero!"
        );

        const fetchedAliceInvestment = await project.investments(alice);
        assert.strictEqual(
            fetchedAliceInvestment.toNumber(),
            aliceInvestment,
            "Alice investment expected to be 1k EUR!"
        );

        truffleAssert.eventEmitted(result, 'NewUserInvestment', (ev) => {
            return ev.investor === alice && ev.amount.eq(aliceInvestment)
        }, "Invest transaction did not emit correct event!");
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
        await eur.approve(project.address, eurToToken(2500), { from: alice });
        await project.invest({ from: alice });
        await eur.approve(project.address, eurToToken(2500), { from: jane });
        await project.invest({ from: jane });

        const isLockedForInvestments = await project.isCompletelyFunded();
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
        await eur.approve(project.address, eurToToken(5000), { from: alice });
        await project.invest({ from: alice });

        // Jane tries to invest more but should fail because cap reached
        await eur.approve(project.address, eurToToken(1000), { from: jane });
        const failedInvest = project.invest({ from: jane });
        await assertRevert(
            failedInvest,
            "User cannot invest in projects that reached their investment cap"
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
        await eur.approve(project.address, eurToToken(2500), { from: alice });
        await project.invest({ from: alice });
        await eur.approve(project.address, eurToToken(2500), { from: jane });
        await project.invest({ from: jane });

        // Withdraw complete investment amount after cap reached
        const result = await project.withdraw(eurTokenOwner, smallTestProject.investmentCap, { from: bob });
        await eur.burnFrom(project.address, smallTestProject.investmentCap, { from: eurTokenOwner });
        const fetchedBalance = await eur.balanceOf(project.address);
        assert.strictEqual(
            fetchedBalance.toNumber(),
            eurToToken(0),
            "Expected project balance to be zero after investment cap reached and funds withdrawn!"
        );

        truffleAssert.eventEmitted(result, 'WithdrawProjectFunds', (ev) => {
            return ev.spender === bob && ev.amount.eq(smallTestProject.investmentCap)
        }, "Withdraw project funds action did not emit correct event!");
    });

    it("should fail if trying to withdraw funds from project which is not yet completely funded", async () => {
        await createTestUser(bob);
        await createTestUser(alice);

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, smallTestProject); // investment cap 5k EUR

        await eur.mint(alice, eurToToken(2500), { from: eurTokenOwner });

        // Alice invests 2.5k, project investment cap not reached
        await eur.approve(project.address, eurToToken(2500), { from: alice });
        await project.invest({ from: alice });

        const failedWithdraw = project.withdraw(eurTokenOwner, eurToToken(2500), { from: bob });
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
        await eur.approve(project.address, eurToToken(2500), { from: alice });
        await project.invest({ from: alice });

        // Evil Jane tries to withdraw project funds
        const failedWithdraw = project.withdraw(eurTokenOwner, eurToToken(5000), { from: jane });
        assertRevert(
            failedWithdraw,
            "Expected withdraw action to fail since caller not organization admin."
        );
    });

    it("should fail if user trying to invest in project not registered by Cooperative", async () => {
        await createTestUser(bob);
        const organization = await createAndActivateTestOrganization(bob);
        const project = await Project.new(  // create Project but not through Cooperative
            testProject.maxInvestment,
            testProject.minInvestment,
            testProject.investmentCap,
            time.addDays(new Date(), 30),
            organization.address
        );
        await eur.mint(bob, eurToToken(2000), { from: eurTokenOwner });
        const failedApprove = eur.approve(project.address, eurToToken(1000), { from: bob });
        await assertRevert(failedApprove, "User can invest in Cooperative registered projects only!");
    });

    it("should fail if user trying to invest in project but user not registered in Copperative contract", async () => {
        await createTestUser(bob);
        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);
        const failedApprove = eur.approve(project.address, eurToToken(1000), { from: alice });
        await assertRevert(failedApprove, "Only registered users can invest in Cooperative projects!");
    });

    it("should fail if user investing 0 tokens", async () => {
        await createTestUser(bob);
        await eur.mint(bob, eurToToken(2000), { from: eurTokenOwner });
        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);
        const failedInvest = project.invest({ from: bob }); // invest 0 approved tokens
        await assertRevert(failedInvest, "Can't invest 0 tokens!");
    });

    it("should fail if user investing more than available on account balance", async () => {
        await createTestUser(bob);
        await eur.mint(bob, eurToToken(2000), { from: eurTokenOwner });
        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);
        await eur.approve(project.address, eurToToken(3000), { from: bob });
        const failedInvest = project.invest({ from: bob });
        await assertRevert(failedInvest, "Can't invest more tokens than actually owned!");
    });

    it("should fail if user investing more than project's per-user max investment limit", async () => {
        await createTestUser(bob);
        await eur.mint(bob, eurToToken(20000), { from: eurTokenOwner });
        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);
        await eur.approve(project.address, eurToToken(10001), { from: bob });
        const failedInvest = project.invest({ from: bob });
        await assertRevert(failedInvest, "Can't invest more than project's per-user maximum!");
    });

    it("should fail if user investing less than project's per-user min investment limit", async () => {
        await createTestUser(bob);
        await eur.mint(bob, eurToToken(2000), { from: eurTokenOwner });
        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, testProject);
        await eur.approve(project.address, eurToToken(999), { from: bob });
        const failedInvest = project.invest({ from: bob });
        await assertRevert(failedInvest, "Can't invest less than project's per-user minimum!");
    });

    it("should fail if user trying to invest funds after which project's total investment would surpass investment cap", async () => {
        await createTestUser(bob);
        await createTestUser(alice);

        await eur.mint(bob, eurToToken(5000), { from: eurTokenOwner });
        await eur.mint(alice, eurToToken(5000), { from: eurTokenOwner });

        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, smallTestProject);

        // Alice invests 3k EUR
        await eur.approve(project.address, eurToToken(3000), { from: alice });
        await project.invest({ from: alice });

        // Bob will also try to invest 3k EUR but only 2k is possible (5k investment cap), expecting fail
        await eur.approve(project.address, eurToToken(3000), { from: bob});
        const failedInvest = project.invest({ from: bob });
        await assertRevert(failedInvest, "Surpassed project's investment cap!");
    });

    it("can process multiple user investments in same project, as long as total investment is in min/max boundaries", async () => {
        await createTestUser(bob);
        await createTestUser(alice);

        const bobStartingBalance = eurToToken(5000);
        const bobFirstInvestment = eurToToken(1000);
        const bobSecondInvestment = eurToToken(1000);
        const bobRemainingBalance = bobStartingBalance - bobFirstInvestment - bobSecondInvestment;

        await eur.mint(bob, bobStartingBalance, { from: eurTokenOwner });
        const organization = await createAndActivateTestOrganization(alice);
        const project = await addTestProject(organization, alice, smallTestProject);

        await eur.approve(project.address, bobFirstInvestment, { from: bob });
        await project.invest({ from: bob });

        await eur.approve(project.address, bobSecondInvestment, { from: bob });
        await project.invest({ from: bob });

        const bobFetchedBalance = await eur.balanceOf(bob);

        assert.strictEqual(
            bobFetchedBalance.toNumber(),
            bobRemainingBalance,
            "Bob's fetched remaining balance not equal to expected one."
        );
    });

    it("should be able for token issuer to mint revenue shares for users after project got funded", async () => {
        await createTestUser(bob);
        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, smallTestProject);

        await createTestUser(alice);
        await createTestUser(jane);

        const aliceInvestment = eurToToken(3000);
        const janeInvestment = eurToToken(2000);

        await eur.mint(alice, aliceInvestment, { from: eurTokenOwner });        // give user Alice 3k EUR balance
        await eur.mint(jane, janeInvestment, { from: eurTokenOwner });          // give user Jane 2k EUR balance

        await eur.approve(project.address, aliceInvestment, { from: alice });
        await project.invest({ from: alice });                                  // Alice invests 3k EUR
        await eur.approve(project.address, janeInvestment, { from: jane });
        await project.invest({ from: jane });                                   // Jane invests 2k EUR

        const projectFunded = await project.isCompletelyFunded();               // Check if project completely funded
        assert.isOk(projectFunded, "Project should be locked for investments if cap is reached!");


        // Assume project funded, powerplant earns money, revenue of 1000 EUR has to be shared between shareholders
        const revenue = eurToToken(1000);
        await eur.mint(project.address, revenue, { from: eurTokenOwner});
        const startPayoutResult = await project.startRevenueSharesPayout(revenue, { from: bob });
        const executePayoutBatchResult = await project.payoutRevenueShares({ from: bob });

        const fetchedAliceBalance = await eur.balanceOf(alice);
        const expectedAliceShare = revenue * aliceInvestment / smallTestProject.investmentCap;
        assert.strictEqual(
            fetchedAliceBalance.toNumber(),
            expectedAliceShare,
            "Invalid revenue share minted."
        );

        const fetchedJaneBalance = await eur.balanceOf(jane);
        const expectedJaneShare = revenue * janeInvestment / smallTestProject.investmentCap;
        assert.strictEqual(
            fetchedJaneBalance.toNumber(),
            expectedJaneShare,
            "Invalid revenue share minted."
        );

        truffleAssert.eventEmitted(startPayoutResult, 'RevenuePayoutStarted', (ev) => {
            return ev.revenue.eq(revenue)
        }, "Revenue payout start action did not emit correct event!");

        truffleAssert.eventEmitted(executePayoutBatchResult, 'RevenueShareMinted', (ev) => {
            return ev.investor === alice && ev.amount.eq(expectedAliceShare)
        }, "Revenue share payout to investor did not emit correct event!");

        truffleAssert.eventEmitted(executePayoutBatchResult, 'RevenueShareMinted', (ev) => {
            return ev.investor === jane && ev.amount.eq(expectedJaneShare)
        }, "Revenue share payout to investor did not emit correct event!");
    });

    it("should fail for users to investment if the project has expired", async () => {
        await createTestUser(bob);
        const organization = await createAndActivateTestOrganization(bob);
        const endInvestmentTime = time.currentTimeWithSecondsOffset(-10);
        const project = await addTestProjectWithEndInvestmentTime(organization, bob, testProject, endInvestmentTime);

        await createTestUser(alice);
        const aliceInvestment = eurToToken(6000);
        await eur.mint(alice, aliceInvestment, {from: eurTokenOwner});

        await eur.approve(project.address, aliceInvestment, {from: alice});
        const failedInvest = project.invest({from: alice});
        assertRevert(
            failedInvest,
            "Expected invest action to fail since project funding has ended."
        );
    });

    it("should be able for users to withdraw investment if the project has expired", async () => {
        await createTestUser(bob);
        const organization = await createAndActivateTestOrganization(bob);
        const endInvestmentTime = time.currentTimeWithSecondsOffset(1);
        const project = await addTestProjectWithEndInvestmentTime(organization, bob, testProject, endInvestmentTime);

        await createTestUser(alice);
        await createTestUser(jane);

        const aliceInvestment = eurToToken(6000);
        const janeInvestment = eurToToken(8000);

        await eur.mint(alice, aliceInvestment, {from: eurTokenOwner});        // give user Alice 6k EUR balance
        await eur.mint(jane, janeInvestment, {from: eurTokenOwner});          // give user Jane 8k EUR balance

        await eur.approve(project.address, aliceInvestment / 2, {from: alice});
        await project.invest({from: alice});                                  // Alice invests 3k EUR
        await eur.approve(project.address, aliceInvestment / 2, {from: alice});
        await project.invest({from: alice});                                  // Alice invests 3k EUR
        await eur.approve(project.address, janeInvestment, {from: jane});
        await project.invest({from: jane});                                   // Jane invests 8k EUR

        await time.timeout(2000);

        const projectExpired = await project.hasFundingExpired();               // Check if project funding has expired
        assert.isOk(projectExpired, "Project should expire!");

        const aliceWithdraw = await project.withdrawInvestment({from: alice});
        const aliceBalance = await eur.balanceOf(alice);
        assert.strictEqual(
            aliceBalance.toNumber(),
            aliceInvestment,
            "Alice account should get full project investment withdraw!"
        );
        truffleAssert.eventEmitted(aliceWithdraw, 'WithdrawProjectInvestment', (ev) => {
            return ev.investor === alice && ev.amount.eq(aliceInvestment)
        }, "Withdraw project investment action did not emit correct event!");

        const janeWithdraw = await project.withdrawInvestment({from: jane});
        const janeBalance = await eur.balanceOf(jane);
        assert.strictEqual(
            janeBalance.toNumber(),
            janeInvestment,
            "Jane account should get full project investment withdraw!"
        );
        truffleAssert.eventEmitted(janeWithdraw, 'WithdrawProjectInvestment', (ev) => {
            return ev.investor === jane && ev.amount.eq(janeInvestment)
        }, "Withdraw project investment action did not emit correct event!");
    });

    it("should fail for users to withdraw investment if the project has not expired", async () => {
        await createTestUser(bob);
        const organization = await createAndActivateTestOrganization(bob);
        const endInvestmentTime = time.currentTimeWithSecondsOffset(100);
        const project = await addTestProjectWithEndInvestmentTime(organization, bob, testProject, endInvestmentTime);

        await createTestUser(alice);
        const aliceInvestment = eurToToken(6000);
        await eur.mint(alice, aliceInvestment, {from: eurTokenOwner});

        await eur.approve(project.address, aliceInvestment, {from: alice});
        await project.invest({from: alice});

        const failedWithdraw = project.withdrawInvestment({from: alice});
        assertRevert(
            failedWithdraw,
            "Expected withdraw investment action to fail since project funding has not ended."
        );
    });

    it('should fail for users to withdraw investment if the project was completely funded', async () => {
        await createTestUser(bob);
        const organization = await createAndActivateTestOrganization(bob);
        const project = await addTestProject(organization, bob, smallTestProject); // investment cap 5k EUR

        await createTestUser(alice);

        await eur.mint(alice, eurToToken(5000), { from: eurTokenOwner });

        // Alice invest 5k EUR
        await eur.approve(project.address, eurToToken(5000), { from: alice });
        await project.invest({ from: alice });

        const failedWithdraw = project.withdrawInvestment({from: alice});
        assertRevert(
            failedWithdraw,
            "Expected withdraw investment action to fail since project has reached funding."
        );
    });

    // --- HELPER FUNCTIONS --- ///

    async function createTestUser(wallet) {
        await coop.addWallet(wallet, { from: coopOwner });
    }

    async function createAndActivateTestOrganization(admin) {
        await coop.addOrganization({ from: admin });
        const organizations = await coop.getOrganizations();
        const organization = Organization.at(organizations[0]);
        await organization.activate( {from: coopOwner });
        return organization
    }

    async function addTestProject(organization, creatorWallet, project) {
        await organization.addProject(
            project.maxInvestment,      // max investment per user (10k EUR)
            project.minInvestment,      // min investment per user (1k EUR)
            project.investmentCap,      // investment cap (10M EUR)
            project.endInvestmentTime,
            { from: creatorWallet }
        );
        const projects = await organization.getProjects();
        return Project.at(projects[0]);
    }

    async function addTestProjectWithEndInvestmentTime(organization, creatorWallet, project, endInvestmentTime) {
        await organization.addProject(
            project.maxInvestment,      // max investment per user (10k EUR)
            project.minInvestment,      // min investment per user (1k EUR)
            project.investmentCap,      // investment cap (10M EUR)
            endInvestmentTime,
            { from: creatorWallet }
        );
        const projects = await organization.getProjects();
        return Project.at(projects[0]);
    }

    // --- TEST DATA --- ///

    const testProject = {
        maxInvestment: eurToToken(10000),
        minInvestment: eurToToken(1000),
        investmentCap: eurToToken(10000000),
        endInvestmentTime: time.addDays(new Date(), 30)
    };

    const smallTestProject = {
        maxInvestment: eurToToken(5000),
        minInvestment: eurToToken(1000),
        investmentCap: eurToToken(5000),
        endInvestmentTime: time.addDays(new Date(), 30)
    };
});

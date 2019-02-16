const AMPnet = artifacts.require("./AMPnet.sol");
const EUR = artifacts.require("./EUR.sol");
const Organization = artifacts.require("./Organization.sol");
const Project = artifacts.require("./Project.sol");

const eurToToken = require('./utils/eur').eurToToken;
const tokenToEur = require('./utils/eur').tokenToEur;
const assertRevert = require('./utils/assertRevert').assertRevert;
const truffleAssert = require('truffle-assertions');

contract("EUR", function(accounts) {

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
        ampnet = await AMPnet.new({ from: ampnetOwner });       // deploy AMPnet with ampnetOwner account
        eur = await EUR.new(ampnet.address, { from: eurTokenOwner });   // deploy EUR token with eurTokenOwner as minter
        await ampnet.setEur(eur.address, { from: ampnetOwner });        // save EUR token address in AMPnet contract
    });

    // it("is deployed with minter role assigned to eurTokenOwner (not AMPnet?)", async () => {
    //     const minterValid = await eur.isMinter(eurTokenOwner);
    //     assert.isOk(minterValid, "EUR token minter is wallet which deployed contract.");
    // });
    //
    // it("can mint tokens on wallet registered by AMPnet if caller is token issuer (deposit option)", async () => {
    //     const expectedBalance = eurToToken(1000);
    //     await createTestUser(bob);
    //     await eur.mint(bob, expectedBalance, { from: eurTokenOwner }); // mint 1000 EUR to bob
    //     const actualBalance = await eur.balanceOf(bob);
    //     assert.strictEqual(actualBalance.toNumber(), expectedBalance, "Expected Bob's balance not equal to fetched one!")
    // });
    //
    // it("should fail if trying to mint tokens to user registered by AMPnet when caller not issuing authority", async () => {
    //     await createTestUser(bob);
    //     const forbiddenMint = eur.mint(bob, eurToToken(1000), { from: bob });
    //     await assertRevert(forbiddenMint, "Only EUR token issuer can mint tokens!");
    // });
    //
    // it("should fail if issuing authority trying to mint tokens to user not registered by AMPnet", async () => {
    //     const forbiddenMint = eur.mint(bob, eurToToken(1000), { from: eurTokenOwner });
    //     await assertRevert(forbiddenMint, "Token issuer can mint only for users registered by AMPnet!");
    // });
    //
    // it("can burn tokens if user allowed token issuer to do so (withdraw option)", async () => {
    //     await createTestUser(bob);
    //
    //     const bobStartingBalance = eurToToken(1000);
    //     const bobWithdrawAmount = eurToToken(500);
    //     const bobRemainingBalance = bobStartingBalance - bobWithdrawAmount;
    //
    //     await eur.mint(bob, bobStartingBalance, { from: eurTokenOwner }); // mint 1k EUR to bob
    //     await eur.approve(eurTokenOwner, bobWithdrawAmount, { from: bob });
    //     await eur.burnFrom(bob, bobWithdrawAmount, { from: eurTokenOwner });
    //
    //     const fetchedBalance = await eur.balanceOf(bob);
    //     assert.strictEqual(fetchedBalance.toNumber(), bobRemainingBalance, "Remaining balance incorrect!");
    // });
    //
    // it("should fail if issuing authority is trying to burn tokens not reserved by user", async () => {
    //     await createTestUser(bob);
    //
    //     await eur.mint(bob, eurToToken(1000), { from: eurTokenOwner });
    //     const failedBurn = eur.burnFrom(bob, eurToToken(1000), { from: eurTokenOwner });
    //     await assertRevert(failedBurn, "Only reserved tokens can be burnt by issuing authority.");
    // });
    //
    // it("should fail if trying to burn tokens but caller not token issuer", async () => {
    //     await createTestUser(bob);
    //     await eur.mint(bob, eurToToken(1000), { from: eurTokenOwner }); // mint 1k EUR to bob
    //     await eur.approve(eurTokenOwner, eurToToken(500), { from: bob });
    //
    //     const failedBurn = eur.burnFrom(bob, eurToToken(1000), { from: bob });
    //     await assertRevert(failedBurn, "Only issuing authority can burn tokens.");
    // });
    //
    // it("should fail if trying to give allowance to anyone other but issuing authority", async () => {
    //     await createTestUser(bob);
    //     await eur.mint(bob, eurToToken(1000), { from: eurTokenOwner }); // mint 1k EUR to bob
    //     const failedApprove = eur.approve(alice, eurToToken(500), { from: bob });
    //     await assertRevert(failedApprove, "Can only give allowance to issuing authority.");
    // });
    //
    // it("can process new investment into specific project registered on AMPnet platform", async () => {
    //     await createTestUser(bob);
    //     const organization = await createAndActivateTestOrganization(bob);
    //     const project = await addTestProject(organization, bob, testProject);
    //     await createTestUser(alice);
    //
    //     const startingAliceBalance = eurToToken(2000);
    //     const investment = eurToToken(1000);
    //     const remainingAliceBalance = startingAliceBalance - investment;
    //
    //     await eur.mint(alice, eurToToken(2000), { from: eurTokenOwner });       // give user Alice 2k EUR balance
    //     await eur.invest(project.address, eurToToken(1000), { from: alice });   // alice invests 1k EUR in VE Lukovac
    //     const fetchedAliceBalance = await eur.balanceOf(alice);
    //
    //     const fetchedAliceInvestment = await project.getTotalInvestmentForUser(alice);
    //
    //     assert.strictEqual(
    //         fetchedAliceBalance.toNumber(),
    //         remainingAliceBalance,
    //         "Remaining Alice balance incorrect!"
    //     );
    //
    //     assert.strictEqual(
    //         fetchedAliceInvestment.toNumber(),
    //         investment,
    //         "Alice's total investment incorrect!"
    //     );
    // });
    //
    // it("should fail if user trying to invest in project not registered by AMPnet", async () => {
    //     await createTestUser(bob);
    //     const organization = await createAndActivateTestOrganization(bob);
    //     const project = await Project.new( // create Project but not through AMPnet
    //         testProject.maxInvestment,
    //         testProject.minInvestment,
    //         testProject.investmentCap,
    //         ampnet.address,
    //         organization.address
    //     );
    //     await eur.mint(bob, eurToToken(2000), { from: eurTokenOwner });
    //     const failedInvest = eur.invest(project.address, eurToToken(1000), { from: bob });
    //     await assertRevert(failedInvest, "User can invest in AMPnet registered projects only!");
    // });
    //
    // it("should fail if user trying to invest in project but user not registered in AMPnet contract", async () => {
    //     await createTestUser(bob);
    //     const organization = await createAndActivateTestOrganization(bob);
    //     const project = await addTestProject(organization, bob, testProject);
    //     const failedInvest = eur.invest(project.address, eurToToken(1000), { from: alice });
    //     await assertRevert(failedInvest, "Only registered users can invest in AMPnet projects!");
    // });
    //
    // it("should fail if user investing 0 tokens", async () => {
    //     await createTestUser(bob);
    //     await eur.mint(bob, eurToToken(2000), { from: eurTokenOwner });
    //     const organization = await createAndActivateTestOrganization(bob);
    //     const project = await addTestProject(organization, bob, testProject);
    //     const failedInvest = eur.invest(project.address, eurToToken(0), { from: bob });
    //     await assertRevert(failedInvest, "Can't invest 0 tokens!");
    // });
    //
    // it("should fail if user investing more than available on account balance", async () => {
    //     await createTestUser(bob);
    //     await eur.mint(bob, eurToToken(2000), { from: eurTokenOwner });
    //     const organization = await createAndActivateTestOrganization(bob);
    //     const project = await addTestProject(organization, bob, testProject);
    //     const failedInvest = eur.invest(project.address, eurToToken(3000), { from: bob });
    //     await assertRevert(failedInvest, "Can't invest more tokens than actually owned!");
    // });
    //
    // it("should fail if user investing more than project's per-user max investment limit", async () => {
    //     await createTestUser(bob);
    //     await eur.mint(bob, eurToToken(20000), { from: eurTokenOwner });
    //     const organization = await createAndActivateTestOrganization(bob);
    //     const project = await addTestProject(organization, bob, testProject);
    //     const failedInvest = eur.invest(project.address, eurToToken(10001), { from: bob });
    //     await assertRevert(failedInvest, "Can't invest more than project's per-user maximum!");
    // });
    //
    // it("should fail if user investing less than project's per-user min investment limit", async () => {
    //     await createTestUser(bob);
    //     await eur.mint(bob, eurToToken(2000), { from: eurTokenOwner });
    //     const organization = await createAndActivateTestOrganization(bob);
    //     const project = await addTestProject(organization, bob, testProject);
    //     const failedInvest = eur.invest(project.address, eurToToken(999), { from: bob });
    //     await assertRevert(failedInvest, "Can't invest less than project's per-user minimum!");
    // });
    //
    // it("should fail if user trying to invest funds after which project's total investment would surpass investment cap", async () => {
    //     await createTestUser(bob);
    //     await createTestUser(alice);
    //
    //     await eur.mint(bob, eurToToken(5000), { from: eurTokenOwner });
    //     await eur.mint(alice, eurToToken(5000), { from: eurTokenOwner });
    //
    //     const organization = await createAndActivateTestOrganization(bob);
    //     const project = await addTestProject(organization, bob, smallTestProject);
    //
    //     // Alice invests 3k EUR
    //     await eur.invest(project.address, eurToToken(3000), { from: alice });
    //
    //     // Bob will also try to invest 3k EUR but only 2k is possible (5k investment cap), expecting fail
    //     const failedInvest = eur.invest(project.address, eurToToken(3000), { from: bob });
    //     await assertRevert(failedInvest, "Surpassed project's investment cap!");
    // });
    //
    // it("can process multiple user investments in same project, as long as total investment is in min/max boundaries", async () => {
    //     await createTestUser(bob);
    //     await createTestUser(alice);
    //
    //     const bobStartingBalance = eurToToken(5000);
    //     const bobFirstInvestment = eurToToken(1000);
    //     const bobSecondInvestment = eurToToken(1000);
    //     const bobRemainingBalance = bobStartingBalance - bobFirstInvestment - bobSecondInvestment;
    //
    //     await eur.mint(bob, bobStartingBalance, { from: eurTokenOwner });
    //     const organization = await createAndActivateTestOrganization(alice);
    //     const project = await addTestProject(organization, alice, smallTestProject);
    //
    //     await eur.invest(project.address, bobFirstInvestment, { from: bob });
    //     await eur.invest(project.address, bobSecondInvestment, { from: bob });
    //     const bobFetchedBalance = await eur.balanceOf(bob);
    //
    //     assert.strictEqual(
    //         bobFetchedBalance.toNumber(),
    //         bobRemainingBalance,
    //         "Bob's fetched remaining balance not equal to expected one."
    //     );
    // });
    //
    // it("is possible to send funds to another registered AMPnet user", async () => {
    //     await createTestUser(bob);
    //     await createTestUser(alice);
    //
    //     const bobInitialBalance = eurToToken(5000);
    //     const aliceInitialBalance = eurToToken(0);
    //     const transferAmountBobToAlice = eurToToken(5000);
    //     const bobFinalBalance = bobInitialBalance - transferAmountBobToAlice;
    //     const aliceFinalBalance = aliceInitialBalance + transferAmountBobToAlice;
    //
    //     await eur.mint(bob, bobInitialBalance, { from: eurTokenOwner });
    //     await eur.transfer(alice, transferAmountBobToAlice, { from: bob });
    //
    //     const fetchedBobBalance = await eur.balanceOf(bob);
    //     const fetchedAliceBalance = await eur.balanceOf(alice);
    //
    //     assert.strictEqual(
    //         fetchedBobBalance.toNumber(),
    //         bobFinalBalance,
    //         "Bob's final balance incorrect!"
    //     );
    //     assert.strictEqual(
    //         fetchedAliceBalance.toNumber(),
    //         aliceFinalBalance,
    //         "Alice's final balance incorrect!"
    //     );
    // });
    //
    // it("should fail if trying to send funds to user not registered in AMPnet contract", async () => {
    //     await createTestUser(bob);
    //     await eur.mint(bob, eurToToken(5000), { from: eurTokenOwner });
    //
    //     const failingTransaction = eur.transfer(alice, eurToToken(1000), { from: bob });
    //     await assertRevert(failingTransaction, "Cannot transfer funds to wallets not registered by AMPnet!");
    // });
    //
    // it("should fail when anyone tries to burn his own tokens - only token issuer can burn", async () => {
    //     await createTestUser(bob);
    //     await eur.mint(bob, eurToToken(1000), { from: eurTokenOwner });
    //     const failedBurn = eur.burn(eurToToken(1000));
    //     await assertRevert(failedBurn, "Expected burning own tokens to fail!")
    // });
    //
    // it("should fail when calling transferFrom - blocked function", async () => {
    //     await createTestUser(bob);
    //     await createTestUser(alice);
    //     const failedTransfer = eur.transferFrom(bob, alice, eurToToken(100));
    //     await assertRevert(failedTransfer, "Expected function transferFrom to be blocked!");
    // });
    //
    // it("can only increase/decrease allowance if spender is token issuer", async () => {
    //     await createTestUser(bob);
    //     await createTestUser(alice);
    //
    //     await eur.mint(bob, eurToToken(1000), { from: eurTokenOwner });
    //
    //     // Bob can increase allowance for token issuer
    //     await eur.increaseAllowance(eurTokenOwner, eurToToken(500), { from: bob });
    //     const increasedAllowance = await eur.allowance(bob, eurTokenOwner);
    //     assert.strictEqual(
    //         increasedAllowance.toNumber(),
    //         eurToToken(500),
    //         "Expected allowance to increase by 500!"
    //     );
    //
    //     await eur.decreaseAllowance(eurTokenOwner, eurToToken(500), { from: bob });
    //     const decreasedAllowance = await eur.allowance(bob, eurTokenOwner);
    //     assert.strictEqual(
    //         decreasedAllowance.toNumber(),
    //         0,
    //         "Expected allowance to decrease by 500!"
    //     );
    //
    //     const failedAllowanceIncrease =  eur.increaseAllowance(alice, eurToToken(500), { from: bob });
    //     await assertRevert(
    //         failedAllowanceIncrease,
    //         "Expected allowance increase to fail when spender not token issuer."
    //     );
    //
    //     const failedAllowanceDecrease =  eur.decreaseAllowance(alice, eurToToken(500), { from: bob });
    //     await assertRevert(
    //         failedAllowanceDecrease,
    //         "Expected allowance decrease to fail when spender not token issuer."
    //     );
    // });
    //
    // it("allows user to withdraw funds by reserving some amount for token issuer to burn", async () => {
    //     await createTestUser(bob);
    //
    //     const bobInitialAmount = eurToToken(1000);
    //     const bobWithdrawAmount = eurToToken(500);
    //     const bobRemainingAmount = bobInitialAmount - bobWithdrawAmount;
    //
    //
    //     await eur.mint(bob, bobInitialAmount, { from: eurTokenOwner });
    //     await eur.approve(eurTokenOwner, bobWithdrawAmount, { from: bob });
    //     await eur.burnFrom(bob, bobWithdrawAmount, { from: eurTokenOwner });
    //
    //     const fetchedBalance = await eur.balanceOf(bob);
    //     assert.strictEqual(
    //         fetchedBalance.toNumber(),
    //         bobRemainingAmount,
    //         "Expected Bob's remaining balance to be decreased after burning!"
    //     );
    // });
    //
    // it("should fail if user tries to grant burn allowance to anyone other but token issuer", async () => {
    //     await createTestUser(bob);
    //     await createTestUser(alice);
    //     await eur.mint(bob, eurToToken(1000), { from: eurTokenOwner });
    //     const failedApproval = eur.approve(alice, eurToToken(500), { from: bob });
    //     await assertRevert(
    //         failedApproval,
    //         "Expected approval to fail when approved party not token issuer."
    //     );
    // });

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

        await eur.invest(project.address, aliceInvestment, { from: alice });    // Alice invests 3k EUR
        await eur.invest(project.address, janeInvestment, { from: jane });      // Jane invests 2k EUR

        const projectFunded = await project.isLockedForInvestments();           // Check if project completely funded
        assert.isOk(projectFunded, "Project should be locked for investments if cap is reached!");


        // Assume project funded, powerplant earns money, revenue of 1000 EUR has to be shared between shareholders
        const revenue = eurToToken(300);
        let result = await eur.mintRevenue(project.address, revenue, { from: eurTokenOwner });
        await truffleAssert.eventEmitted(result, 'RevenueShareMinted', (ev) => {
            return ev.wallet === jane
        }, "Organization creation transaction did not emit correct event!")


        await eur.mintRevenue(project.address, revenue, { from: eurTokenOwner });

        const fetchedAliceBalance = await eur.balanceOf(alice);
        const fetchedJaneBalance = await eur.balanceOf(jane);

        console.log(`Alice balance: ${tokenToEur(fetchedAliceBalance.toNumber())}`);
        console.log(`Jane balance: ${tokenToEur(fetchedJaneBalance.toNumber())}`);



        // assert.strictEqual(
        //     fetchedAliceBalance.toNumber(),
        //     remainingAliceBalance,
        //     "Remaining Alice balance incorrect!"
        // );
        //
        // assert.strictEqual(
        //     fetchedAliceInvestment.toNumber(),
        //     investment,
        //     "Alice's total investment incorrect!"
        // );
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
        maxInvestment: eurToToken(10000),
        minInvestment: eurToToken(1000),
        investmentCap: eurToToken(10000000)
    };

    const smallTestProject = {
        maxInvestment: eurToToken(3000),
        minInvestment: eurToToken(1000),
        investmentCap: eurToToken(5000)
    };

});
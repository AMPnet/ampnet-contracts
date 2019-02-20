const Cooperative = artifacts.require("./Cooperative.sol");
const EUR = artifacts.require("./EUR.sol");

const eurToToken = require('./utils/eur').eurToToken;
const assertRevert = require('./utils/assertRevert').assertRevert;


contract("EUR", function(accounts) {

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

    it("is deployed with minter role assigned to eurTokenOwner (not Coop owner?)", async () => {
        const minterValid = await eur.isMinter(eurTokenOwner);
        assert.isOk(minterValid, "EUR token minter is wallet which deployed contract.");
    });

    it("can mint tokens on wallet registered by Cooperative if caller is token issuer (deposit option)", async () => {
        const expectedBalance = eurToToken(1000);
        await createTestUser(bob);
        await eur.mint(bob, expectedBalance, { from: eurTokenOwner }); // mint 1000 EUR to bob
        const actualBalance = await eur.balanceOf(bob);
        assert.strictEqual(
            actualBalance.toNumber(),
            expectedBalance,
            "Expected Bob's balance not equal to fetched one!"
        )
    });

    it("should fail if trying to mint tokens to user registered by Cooperative when caller not token issuer", async () => {
        await createTestUser(bob);
        const forbiddenMint = eur.mint(bob, eurToToken(1000), { from: bob });
        await assertRevert(forbiddenMint, "Only EUR token issuer can mint tokens!");
    });

    it("should fail if issuing authority trying to mint tokens to user not registered by Cooperative", async () => {
        const forbiddenMint = eur.mint(bob, eurToToken(1000), { from: eurTokenOwner });
        await assertRevert(forbiddenMint, "Token issuer can mint only for users registered by Cooperative!");
    });

    it("can burn tokens if user allowed token issuer to do so (withdraw option)", async () => {
        await createTestUser(bob);

        const bobStartingBalance = eurToToken(1000);
        const bobWithdrawAmount = eurToToken(500);
        const bobRemainingBalance = bobStartingBalance - bobWithdrawAmount;

        await eur.mint(bob, bobStartingBalance, { from: eurTokenOwner }); // mint 1k EUR to bob
        await eur.approve(eurTokenOwner, bobWithdrawAmount, { from: bob });
        await eur.burnFrom(bob, bobWithdrawAmount, { from: eurTokenOwner });

        const fetchedBalance = await eur.balanceOf(bob);
        assert.strictEqual(fetchedBalance.toNumber(), bobRemainingBalance, "Remaining balance incorrect!");
    });

    it("should fail if issuing authority is trying to burn tokens not reserved by user", async () => {
        await createTestUser(bob);

        await eur.mint(bob, eurToToken(1000), { from: eurTokenOwner });
        const failedBurn = eur.burnFrom(bob, eurToToken(1000), { from: eurTokenOwner });
        await assertRevert(failedBurn, "Only reserved tokens can be burnt by issuing authority.");
    });

    it("should fail if trying to burn tokens but caller not token issuer", async () => {
        await createTestUser(bob);
        await eur.mint(bob, eurToToken(1000), { from: eurTokenOwner }); // mint 1k EUR to bob
        await eur.approve(eurTokenOwner, eurToToken(500), { from: bob });

        const failedBurn = eur.burnFrom(bob, eurToToken(1000), { from: bob });
        await assertRevert(failedBurn, "Only issuing authority can burn tokens.");
    });

    it("should fail if trying to give allowance to wallet not registered by Cooperative", async () => {
        await createTestUser(bob);
        await eur.mint(bob, eurToToken(1000), { from: eurTokenOwner }); // mint 1k EUR to bob
        const failedApprove = eur.approve(alice, eurToToken(500), { from: bob });
        await assertRevert(
            failedApprove,
            "Can only give allowance to registered Coopereative entities (users, organizations, projects)."
        );
    });

    it("is possible to send funds to another registered Cooperative user", async () => {
        await createTestUser(bob);
        await createTestUser(alice);

        const bobInitialBalance = eurToToken(5000);
        const aliceInitialBalance = eurToToken(0);
        const transferAmountBobToAlice = eurToToken(5000);
        const bobFinalBalance = bobInitialBalance - transferAmountBobToAlice;
        const aliceFinalBalance = aliceInitialBalance + transferAmountBobToAlice;

        await eur.mint(bob, bobInitialBalance, { from: eurTokenOwner });
        await eur.transfer(alice, transferAmountBobToAlice, { from: bob });

        const fetchedBobBalance = await eur.balanceOf(bob);
        const fetchedAliceBalance = await eur.balanceOf(alice);

        assert.strictEqual(
            fetchedBobBalance.toNumber(),
            bobFinalBalance,
            "Bob's final balance incorrect!"
        );
        assert.strictEqual(
            fetchedAliceBalance.toNumber(),
            aliceFinalBalance,
            "Alice's final balance incorrect!"
        );
    });

    it("should fail if trying to send funds to user not registered in Cooperative contract", async () => {
        await createTestUser(bob);
        await eur.mint(bob, eurToToken(5000), { from: eurTokenOwner });

        const failingTransaction = eur.transfer(alice, eurToToken(1000), { from: bob });
        await assertRevert(failingTransaction, "Cannot transfer funds to wallets not registered by Cooperative!");
    });

    it("should fail when anyone tries to burn his own tokens - only token issuer can burn", async () => {
        await createTestUser(bob);
        await eur.mint(bob, eurToToken(1000), { from: eurTokenOwner });
        const failedBurn = eur.burn(eurToToken(1000));
        await assertRevert(failedBurn, "Expected burning own tokens to fail!")
    });

    it("can only increase/decrease allowance if spender is token issuer", async () => {
        await createTestUser(bob);
        await createTestUser(alice);

        await eur.mint(bob, eurToToken(1000), { from: eurTokenOwner });

        // Bob can increase allowance for token issuer
        await eur.increaseAllowance(eurTokenOwner, eurToToken(500), { from: bob });
        const increasedAllowance = await eur.allowance(bob, eurTokenOwner);
        assert.strictEqual(
            increasedAllowance.toNumber(),
            eurToToken(500),
            "Expected allowance to increase by 500!"
        );

        await eur.decreaseAllowance(eurTokenOwner, eurToToken(500), { from: bob });
        const decreasedAllowance = await eur.allowance(bob, eurTokenOwner);
        assert.strictEqual(
            decreasedAllowance.toNumber(),
            0,
            "Expected allowance to decrease by 500!"
        );

        const failedAllowanceIncrease =  eur.increaseAllowance(alice, eurToToken(500), { from: bob });
        await assertRevert(
            failedAllowanceIncrease,
            "Expected allowance increase to fail when spender not token issuer."
        );

        const failedAllowanceDecrease =  eur.decreaseAllowance(alice, eurToToken(500), { from: bob });
        await assertRevert(
            failedAllowanceDecrease,
            "Expected allowance decrease to fail when spender not token issuer."
        );
    });

    it("allows user to withdraw funds by reserving some amount for token issuer to burn", async () => {
        await createTestUser(bob);

        const bobInitialAmount = eurToToken(1000);
        const bobWithdrawAmount = eurToToken(500);
        const bobRemainingAmount = bobInitialAmount - bobWithdrawAmount;


        await eur.mint(bob, bobInitialAmount, { from: eurTokenOwner });
        await eur.approve(eurTokenOwner, bobWithdrawAmount, { from: bob });
        await eur.burnFrom(bob, bobWithdrawAmount, { from: eurTokenOwner });

        const fetchedBalance = await eur.balanceOf(bob);
        assert.strictEqual(
            fetchedBalance.toNumber(),
            bobRemainingAmount,
            "Expected Bob's remaining balance to be decreased after burning!"
        );
    });

    // --- HELPER FUNCTIONS --- ///

    async function createTestUser(wallet) {
        await coop.addWallet(wallet, { from: coopOwner });
    }

});
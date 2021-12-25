import { expect } from "chai";
import { OmniBusContract, OmniBusInstance } from "../types/truffle-contracts";

const {
    BN,           // Big Number support e.g. new BN(1)
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
  } = require('@openzeppelin/test-helpers');

const Omnibus: OmniBusContract = artifacts.require("OmniBus");

contract("Omnibus", accounts => {
    const [owner, silvan, alice, michel, ETH, BNB, BTC, EXZO] = accounts;
    let omnibusInstance: OmniBusInstance;
    beforeEach(async () => {
        omnibusInstance = await Omnibus.new({from: owner});
    });
    context.skip("transfering the amount of the token from an account to another directly", async () => {
        it("should register accounts and change status, and add tokens and transfer token", async () => {
            // registering all accounts
            let result = await omnibusInstance.registerAccount({from: silvan});
            // testing if transaction is done sccessfully
            expect(result.receipt.status).to.equal(true);
            // test if registerAccountEvent triggered and account is equal 'owner'
            expectEvent(result, 'RegisterAccountEvent', {account: silvan});
            // registering the rest accounts
            await omnibusInstance.registerAccount({from: alice});
            await omnibusInstance.registerAccount({from: michel});
            
            // changing the status of accounts except michel.
            result = await omnibusInstance.setAccountStatus(silvan, 1, {from: owner});
            expect(result.receipt.status).to.equal(true);
            expectEvent(result, 'SetStatusEvent', {account: silvan, status: new BN(1)});
            await omnibusInstance.setAccountStatus(alice, 1, {from: owner})
            
            //registering the tokens with amount
            result = await omnibusInstance.registerToken(owner, ETH, 100, {from: owner});
            expect(result.receipt.status).to.equal(true);
            expectEvent(result, 'RegisterTokenEvent', {account: owner, token: ETH, amount: new BN(100)})
           
            // owner register the tokens and their amount.
            await omnibusInstance.registerToken(owner, BNB, 100, {from: owner});
            await omnibusInstance.registerToken(owner, EXZO, 100, {from: owner});
            await omnibusInstance.registerToken(owner, BTC, 100, {from: owner});
            await omnibusInstance.registerToken(silvan, ETH, 100, {from: owner});
            await omnibusInstance.registerToken(alice, ETH, 100, {from: owner});
            await omnibusInstance.registerToken(silvan, BNB, 100, {from: owner});
            await omnibusInstance.registerToken(michel, BNB, 100, {from: owner});
            await omnibusInstance.registerToken(alice, EXZO, 100, {from: owner});
            await omnibusInstance.registerToken(michel, EXZO, 100, {from: owner});
            await omnibusInstance.registerToken(silvan, BTC, 100, {from: owner});
        
            // transfering the 30BNB from owner to silvan directly
            result = await omnibusInstance.transferFrom(silvan, BNB, 30, {from: owner});
            expect(result.receipt.status).to.equal(true);
            expectEvent(result, 'TransferEvent', {from: owner, to: silvan, token: BNB, amount: new BN(30)});
            let balance = await omnibusInstance.getConfirmBalance(BNB, {from: silvan});
            expect(balance.toNumber()).to.equal(130);
            balance = await omnibusInstance.getConfirmBalance(BNB, {from: owner});
            expect(balance.toNumber()).to.equal(70);

            // transfering directly the 20BTC from silvan to alice who has no BTC
            result = await omnibusInstance.transferFrom(alice, BTC, 20, {from: silvan});
            expect(result.receipt.status).to.equal(true);
            expectEvent(result, 'TransferEvent', {from: silvan, to: alice, token: BTC, amount: new BN(20)})
            balance = await omnibusInstance.getConfirmBalance(BTC, {from: silvan});
            expect(balance.toNumber()).to.equal(80);
            balance = await omnibusInstance.getConfirmBalance(BTC, {from: alice});
            expect(balance.toNumber()).to.equal(20);

            // // transfering directly the 40ETH from silvan to michel who status is deactived
            // await expectRevert(
            //      await omnibusInstance.transferFrom(michel, ETH, 40, {from: silvan}),
            //      "Account deactived."
            // );

            // michel has no ETH, so balance is 0ETH.
            balance = await omnibusInstance.getConfirmBalance(ETH, {from: michel});
            expect(balance.toNumber()).to.equal(0);

            //changing the status of michel to 1, and transfering directly the 40ETH from silvan to michel again
            await omnibusInstance.setAccountStatus(michel, 1, {from: owner})
            result = await omnibusInstance.transferFrom(michel, ETH, 40, {from: silvan});
            expect(result.receipt.status).to.equal(true);
            expectEvent(result, 'TransferEvent', {from: silvan, to: michel, token: ETH, amount: new BN(40)})
            balance = await omnibusInstance.getConfirmBalance(ETH, {from: michel});
            expect(balance.toNumber()).to.equal(40);
        })
    })
    context.skip("transfering the amount of the token from an account to another calling confirmTransfer function", async () => {
        it("should add holds of seller and buyer, and should call confirmTransfer function", async () => {
            // registering all accounts
            let result = await omnibusInstance.registerAccount({from: silvan});
            // testing if transaction is done sccessfully
            expect(result.receipt.status).to.equal(true);
            // test if registerAccountEvent triggered and account is equal 'owner'
            expectEvent(result, 'RegisterAccountEvent', {account: silvan});
            // registering the rest accounts
            await omnibusInstance.registerAccount({from: alice});
            await omnibusInstance.registerAccount({from: michel});
            
            // changing the status of accounts except alice.
            result = await omnibusInstance.setAccountStatus(silvan, 1, {from: owner});
            expect(result.receipt.status).to.equal(true);
            expectEvent(result, 'SetStatusEvent', {account: silvan, status: new BN(1)});
            await omnibusInstance.setAccountStatus(michel, 1, {from: owner})
            
            //registering the tokens with amount
            result = await omnibusInstance.registerToken(owner, ETH, 100, {from: owner});
            expect(result.receipt.status).to.equal(true);
            expectEvent(result, 'RegisterTokenEvent', {account: owner, token: ETH, amount: new BN(100)})
           
            // owner register the tokens and their amount.
            await omnibusInstance.registerToken(owner, BNB, 100, {from: owner});
            await omnibusInstance.registerToken(owner, EXZO, 100, {from: owner});
            await omnibusInstance.registerToken(owner, BTC, 100, {from: owner});
            await omnibusInstance.registerToken(silvan, ETH, 100, {from: owner});
            await omnibusInstance.registerToken(alice, ETH, 100, {from: owner});
            await omnibusInstance.registerToken(silvan, BNB, 100, {from: owner});
            await omnibusInstance.registerToken(michel, BNB, 100, {from: owner});
            await omnibusInstance.registerToken(alice, EXZO, 100, {from: owner});
            await omnibusInstance.registerToken(michel, EXZO, 100, {from: owner});
            await omnibusInstance.registerToken(silvan, BTC, 100, {from: owner});

            // transfering directly the 20BTC from silvan to alice who has no BTC.
            // and alice's status is deactive, so add sendHold.
            result = await omnibusInstance.transferFrom(alice, BTC, 20, {from: silvan});
            expectEvent(result, 'TransferRequestEvent', {from: silvan, to: alice, token: BTC, amount: new BN(20), holdIndex: new BN(0)});
            let balance = await omnibusInstance.getConfirmBalance(BTC, {from: silvan});
            expect(balance.toNumber(), "incorrect value").to.equal(100);
            balance = await omnibusInstance.getConfirmBalance(BTC, {from: alice});
            expect(balance.toNumber()).to.equal(0);

            // confirming sendHold of Silvan for 20BTC.
            result = await omnibusInstance.confirmTransfer(silvan, BTC, 0, {from: owner});
            expectEvent(result, 'TransferEvent', {from: silvan, to: alice, token: BTC, amount: new BN(20)});
            balance = await omnibusInstance.getConfirmBalance(BTC, {from: silvan});
            expect(balance.toNumber()).to.equal(80); //100 - 20
     
            // silvan calls the sellToken function to sell BTC 3 times
            result = await omnibusInstance.sellToken(BTC, 50, {from: silvan});
            // let timestamp = result.logs[0].args. // index = 0
            expectEvent(result, 'SellEvent', {account: silvan, token: BTC, amount: new BN(50), holdIndex: new BN(0)});
            result = await omnibusInstance.sellToken(BTC, 20, {from: silvan}); // index = 1
           
            //The third is an error because the actual payable amount is 10 BTC (80 - 50 - 20).
            // await expectRevert(
            //     await omnibusInstance.sellToken(BTC, 30, {from: silvan}),
            //     "Buyable amount is not enough"
            // );
            
            result = await omnibusInstance.buyToken(BTC, 40, {from: silvan}); // index = 2
            
            // owner calls the 'confirmTransfer' function to complete the pending transaction.
            // confirming sell-hold of silvan for 20BTC.
            result = await omnibusInstance.confirmTransfer(silvan, BTC, 1, {from: owner});
            expectEvent(result, 'TransferEvent', {from: silvan, to: '0x0000000000000000000000000000000000000000', token: BTC, amount: new BN(20)});
            balance = await omnibusInstance.getConfirmBalance(BTC, {from: silvan});
            expect(balance.toNumber()).to.equal(60); //80 - 20

            // confirming buy-hold of silvan for 40BTC.
            result = await omnibusInstance.confirmTransfer(silvan, BTC, 2, {from: owner});
            expectEvent(result, 'TransferEvent', {from: '0x0000000000000000000000000000000000000000', to: silvan, token: BTC, amount: new BN(40)});
            balance = await omnibusInstance.getConfirmBalance(BTC, {from: silvan});
            expect(balance.toNumber()).to.equal(100); //60 + 40
    
            // set alice's status to 1, beacasue alice's status is 0.
            let status = await omnibusInstance.getAccountStatus({from: alice});
            expect(status.toNumber()).to.equal(0);
            await omnibusInstance.setAccountStatus(alice, 1, {from: owner});
            // alice calls the buyToken function to buy the 30ETH.
            result = await omnibusInstance.buyToken(ETH, 30, {from: alice});
            expectEvent(result, 'BuyEvent', {account: alice, token: ETH, amount: new BN(30), holdIndex: new BN(0)});
            result = await omnibusInstance.confirmTransfer(alice, ETH, 0, {from: owner});
            expectEvent(result, 'TransferEvent', {from: '0x0000000000000000000000000000000000000000', to: alice, token: ETH, amount: new BN(30)});
            balance = await omnibusInstance.getConfirmBalance(ETH, {from: alice});
            expect(balance.toNumber()).to.equal(130); // 100 + 30

           
            // michel calls the buyToken function to buy 60BTC
            // michel has no BTC token, so balance of BTC is 60BTC.
            result = await omnibusInstance.buyToken(BTC, 60, {from: michel});
            expectEvent(result, 'BuyEvent', {account: michel, token: BTC, amount: new BN(60), holdIndex: new BN(0)});
            result = await omnibusInstance.confirmTransfer(michel, BTC, 0, {from: owner});
            expectEvent(result, 'TransferEvent', {from: '0x0000000000000000000000000000000000000000', to: michel, token: BTC, amount: new BN(60)});
            balance = await omnibusInstance.getConfirmBalance(BTC, {from: michel});
            expect(balance.toNumber()).to.equal(60);  // 0 + 60

            // alice calls burnToken function to burn 50ETH
            result = await omnibusInstance.burnToken(ETH, 50, {from: alice});
            expectEvent(result, 'BurnTokenEvent', {account: alice, token: ETH, amount: new BN(50), holdIndex: new BN(0)});
            result = await omnibusInstance.confirmTransfer(alice, ETH, 0, {from: owner});
            expectEvent(result, 'TransferEvent', {from: alice, to: '0x0000000000000000000000000000000000000000', token: ETH, amount: new BN(50)});
            balance = await omnibusInstance.getConfirmBalance(ETH, {from: alice});
            expect(balance.toNumber()).to.equal(80);  // 130 - 50

        })
    })
})
import { expect } from "chai";
import { AllowListContractContract, AllowListContractInstance } from "../types/truffle-contracts";

const {
    BN,           // Big Number support e.g. new BN(1)
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
  } = require('@openzeppelin/test-helpers');

const allowListContract: AllowListContractContract = artifacts.require("AllowListContract");

contract("AllowListContract", accounts => {
    const [owner, silvan, alice, leon, ETH, BNB, BTC, EXZO] = accounts;
    let contractInstance: AllowListContractInstance;
    beforeEach(async () => {
        contractInstance = await allowListContract.new({from: owner});
    });
    context("transfering the amount of the token between approved accounts", async () => {
        it("should add to whitelist, start the Transaction", async () => {
            // add 'silvan' to sender's whitelist
            let result = await contractInstance.setApprovedSender(silvan, true, {from: owner});
            expectEvent(result, 'SetApprovedSenderEvent', {account: silvan, approved: true});
            let approvedStatus = await contractInstance.approvedSenders(silvan);
            expect(approvedStatus).to.equal(true);
            
            // add 'alice' to receiver's whitelist
            result = await contractInstance.setApprovedReceiver(alice, true, {from: owner});
            expectEvent(result, 'SetApprovedReceiverEvent', {account: alice, approved: true});
            approvedStatus = await contractInstance.approvedRecipients(alice);
            expect(approvedStatus).to.equal(true);

            // add 'leon' to receiver's whitelist
            result = await contractInstance.setApprovedReceiver(leon, true, {from: owner});
            expectEvent(result, 'SetApprovedReceiverEvent', {account: leon, approved: true});
            approvedStatus = await contractInstance.approvedRecipients(leon);
            expect(approvedStatus).to.equal(true);

            
            // 'silvan' calls the transferFrom function to transfer the 30BNB to 'alice'.
            // 'silvan' and 'alice' are approved accounts, so emit 'TransferRequestEvent'
            // pendingIndex = 0
            result = await contractInstance.transferFrom(alice, BNB, 30, {from: silvan});
            expect(result.receipt.status).to.equal(true);
            expectEvent(result, 'TransferRequestEvent', {from: silvan, to: alice, token: BNB, amount: new BN(30), pendingIndex: new BN(0)});

        
            // 'silvan' calls the transferFrom function to transfer the 40BNB to 'leon'.
            // pendingIndex = 1
            result = await contractInstance.transferFrom(leon, BNB, 40, {from: silvan});
            expect(result.receipt.status).to.equal(true);
            expectEvent(result, 'TransferRequestEvent', {from: silvan, to: leon, token: BNB, amount: new BN(40), pendingIndex: new BN(1)});

            // owner calls the confirmTransfer function to close the opened transaction
            result = await contractInstance.confirmTransfer(silvan, BNB, 1, {from: owner});
            expectEvent(result, 'TransferEvent', {from: silvan, to: leon, token: BNB, amount: new BN(40)});

            // check status of first transaction
            let transaction = await contractInstance.pendingTransactions(BNB, 0);
            expect(transaction[0].toNumber()).to.equal(1); // Opened(status)
            expect(transaction[1].toNumber()).to.equal(30); // 30BNB(amount)
            expect(transaction[2].toString()).to.equal(alice); // 'alice'(receiver)

            // check status of second transaction
            transaction = await contractInstance.pendingTransactions(BNB, 1);
            expect(transaction[0].toNumber()).to.equal(0); // Closed(status)
            expect(transaction[1].toNumber()).to.equal(40); // 40BNB(amount)
            expect(transaction[2].toString()).to.equal(leon); // 'leon'(receiver)
        })
    })
})
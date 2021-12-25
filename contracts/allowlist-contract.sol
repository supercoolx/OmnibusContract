// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract AllowListContract is Ownable {
    using SafeMath for uint256;

    // status of transaction
    enum Status {
        Closed,
        Opened
    }

    // structs
    struct Transaction {
        Status status; // status of trading
        uint256 amount; // amount of tokens
        address receiver; // address of recipient
    }

    // mappings
    mapping(address => Transaction[]) public pendingTransactions; // the status of transaction for specific token
    mapping(address => bool) public approvedSenders; // approved senders
    mapping(address => bool) public approvedRecipients; // approved receivers

    // events
    event SetApprovedSenderEvent(address indexed account, bool approved);
    event SetApprovedReceiverEvent(address indexed account, bool approved);
    event TransferEvent(address indexed from, address indexed to, address indexed token, uint256 amount);
    event TransferRequestEvent(
        address indexed from,
        address indexed to,
        address indexed token,
        uint256 amount,
        uint256 pendingIndex
    );

    // check if account is active
    modifier isApprovedSender() {
        require(approvedSenders[msg.sender], "Sender not allowed");
        _;
    }

    // add the address of deployer to owner
    constructor() {
        approvedSenders[owner()] = true;
        approvedRecipients[owner()] = true;
    }

    // when transfer the token from sender to _to, store it as an open " transaction" and emit an event
    function transferFrom(
        address _to,
        address _token,
        uint256 _amount
    ) external isApprovedSender {
        require(approvedRecipients[_to] == true, "Recipient not allowed");
        Transaction memory opend = Transaction(Status.Opened, _amount, _to);
        uint256 pendingIndex = _addPending(_token, opend);
        emit TransferRequestEvent(_msgSender(), _to, _token, _amount, pendingIndex);
    }

    // process the open transaction, and close the transaction.
    function confirmTransfer(
        address _account,
        address _token,
        uint256 _pendingIndex
    ) external onlyOwner {
        require(approvedSenders[_account], "Sender not allowed");
        Transaction storage opened = pendingTransactions[_token][_pendingIndex];
        require(approvedRecipients[opened.receiver], "Recipient not allowed");
        opened.status = Status.Closed;
        emit TransferEvent(_account, opened.receiver, _token, opened.amount);
    }

    // add sender to the whitelist
    function setApprovedSender(address _account, bool _approved) external onlyOwner {
        approvedSenders[_account] = _approved;
        emit SetApprovedSenderEvent(_account, _approved);
    }

    // add receiver to the whitelist
    function setApprovedReceiver(address _account, bool _approved) external onlyOwner {
        approvedRecipients[_account] = _approved;
        emit SetApprovedReceiverEvent(_account, _approved);
    }

    function _addPending(address _token, Transaction memory transaction) internal returns (uint256) {
        uint256 pendingIndex = _getNextAvailablePendingIndex(_token);
        // if pendingIndex is greater than 0, replace with the new transaction.
        // otherwise, add a new transaction to transaction-array.
        if (pendingIndex > 0) {
            pendingIndex -= 1;
            pendingTransactions[_token][pendingIndex] = transaction;
        } else {
            pendingTransactions[_token].push(transaction);
            pendingIndex = pendingTransactions[_token].length - 1;
        }
        return pendingIndex;
    }

    function _getNextAvailablePendingIndex(address _token) internal view returns (uint256) {
        uint256 availableIndex = 0;
        // because index of array start with 0, we assign 'i' to = 1. In result, we return the index + 1.
        for (uint256 i = 0; i < pendingTransactions[_token].length; i++) {
            if (pendingTransactions[_token][i].status == Status.Closed) {
                availableIndex = i + 1;
                break;
            }
        }
        return availableIndex;
    }
}

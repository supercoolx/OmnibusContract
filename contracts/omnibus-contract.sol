// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract OmniBus is Ownable {
    using SafeMath for uint256;

    // status of confirmed hold, selling hold, and of buying hold
    enum HoldStatus {
        Confirmed,
        Selling,
        Buying,
        Sending,
        Burning
    }
    struct Hold {
        HoldStatus flag; // status of hold
        uint64 timestamp; // date when hold was added
        uint256 amount; // amount of tokens
        address receiver; // recipient when transfer, or become 0x00 address when selling or buying
    }
    struct Account {
        uint256 status; // represents status of account(active or deactivated)
        mapping(address => Hold[]) holds; // the holds on a specific token
        mapping(address => uint256) balances; // confirmed balance of the token
        address[] tokens; // a list of tokens by the account
    }

    mapping(address => Account) public accounts; // a list of accounts
    mapping(address => uint256) public totalBalances; // total Balances of tokens

    // the timestamps for sell and buy event are removed for testing temporarly.
    // after test is success, just only add them again.
    event RegisterAccountEvent(address indexed account, uint256 status);
    event SetStatusEvent(address indexed account, uint256 status);
    event SellEvent(address indexed account, address indexed token, uint256 amount, uint256 holdIndex);
    event BuyEvent(address indexed account, address indexed token, uint256 amount, uint256 holdIndex);
    event BurnTokenEvent(address indexed account, address indexed token, uint256 amount, uint256 holdIndex);
    event TransferEvent(address indexed from, address indexed to, address indexed token, uint256 amount);
    event TransferRequestEvent(
        address indexed from,
        address indexed to,
        address indexed token,
        uint256 amount,
        uint256 holdIndex
    );
    // used for testing, after test finished, just only remove it.
    event RegisterTokenEvent(address indexed account, address indexed token, uint256 amount);

    // check if account is active
    modifier isActive() {
        require(accounts[_msgSender()].status == 1, "Your account is deactivated");
        _;
    }

    // add the address of deployer to owner
    constructor() {
        accounts[owner()].status = 1;
    }

    // register the account by caller
    function registerAccount() external {
        accounts[_msgSender()];
        emit RegisterAccountEvent(_msgSender(), accounts[_msgSender()].status);
    }

    // this funcion is used for test. after test finished, just only remove it.
    function registerToken(
        address _account,
        address _token,
        uint256 _amount
    ) external onlyOwner {
        if (!_hasToken(_account, _token)) {
            accounts[_account].tokens.push(_token);
        }
        accounts[_account].balances[_token] = accounts[_account].balances[_token].add(_amount);
        totalBalances[_token] = totalBalances[_token].add(_amount);
        emit RegisterTokenEvent(_account, _token, _amount);
    }

    // set account's status by owner (active or deactive)
    function setAccountStatus(address _account, uint256 _status) external onlyOwner {
        accounts[_account].status = _status;
        emit SetStatusEvent(_account, accounts[_account].status);
    }

    // get account's status
    function getAccountStatus() external view returns (uint256) {
        return accounts[msg.sender].status;
    }

    // when we want to buy a token, call the buyToken function.
    function buyToken(address _token, uint256 _amount) external isActive {
        require(_amount > 0, "Amount must be greater than 0");
        uint64 buyTime = uint64(block.timestamp);
        Hold memory buyHold = Hold(HoldStatus.Buying, buyTime, _amount, address(0));
        uint256 holdIndex = _addHold(_msgSender(), _token, buyHold);
        emit BuyEvent(_msgSender(), _token, _amount, holdIndex);
    }

    // when we want to sell a token, call the sellToken function
    function sellToken(address _token, uint256 _amount) external isActive {
        require(_amount > 0, "Amount must be greater than 0"); // this is to check if amount has a value higher than 0
        require(getSpendableBalance(_msgSender(), _token) >= _amount, "unenough balance.");
        uint64 sellTime = uint64(block.timestamp);
        Hold memory sellHold = Hold(HoldStatus.Selling, sellTime, _amount, address(0));
        uint256 holdIndex = _addHold(_msgSender(), _token, sellHold);
        emit SellEvent(_msgSender(), _token, _amount, holdIndex);
    }

    // burning the token
    function burnToken(address _token, uint256 _amount) external isActive {
        require(_amount > 0, "Amount must be greater than 0");
        require(_hasToken(_msgSender(), _token), "There is no token to burn.");
        require(getSpendableBalance(_msgSender(), _token) >= _amount, "Burnable amount is not enough.");
        uint64 burnTime = uint64(block.timestamp);
        Hold memory burnHold = Hold(HoldStatus.Burning, burnTime, _amount, address(0));
        uint256 holdIndex = _addHold(_msgSender(), _token, burnHold);
        emit BurnTokenEvent(_msgSender(), _token, _amount, holdIndex);
    }

    // transferFrom function transfer the token to "_to" with the amount and internal transfer between accounts.
    function transferFrom(
        address _to,
        address _token,
        uint256 _amount
    ) external isActive {
        require(_amount > 0, "Amount must be greater than 0"); // checks if the "_amount" is of higher balance than 0
        // checks the spendableBalance
        require(getSpendableBalance(_msgSender(), _token) >= _amount, "unenough balance");
        // if _to is actived, we settle it right away and triggers a TransferEvent.
        if (accounts[_to].status == 1) {
            if (!_hasToken(_to, _token)) accounts[_to].tokens.push(_token); // if _to has no token, add the token.
            accounts[_msgSender()].balances[_token] = accounts[_msgSender()].balances[_token].sub(_amount);
            accounts[_to].balances[_token] = accounts[_to].balances[_token].add(_amount); // increase to balance
            emit TransferEvent(_msgSender(), _to, _token, _amount);
        } else {
            // add sendHold.
            uint64 transferTime = uint64(block.timestamp);
            Hold memory sendHold = Hold(HoldStatus.Sending, transferTime, _amount, _to);
            uint256 holdIndex = _addHold(_msgSender(), _token, sendHold);
            emit TransferRequestEvent(_msgSender(), _to, _token, _amount, holdIndex);
        }
    }

    function confirmTransfer(
        address _account,
        address _token,
        uint256 _holdIndex
    ) external onlyOwner {
        require(_account != address(0), "invaild address");
        require(_holdIndex >= 0, "invaild hold-index.");
        Hold storage hold = accounts[_account].holds[_token][_holdIndex];
        // if flag is 'Confirmed', revert the transaction
        require(hold.flag != HoldStatus.Confirmed, "already confirmed hold");
        address from;
        address to;
        // if hold's flag is selling or burning, decreasing from balance and total-balance of the given token
        if (hold.flag == HoldStatus.Selling || hold.flag == HoldStatus.Burning) {
            accounts[_account].balances[_token] = accounts[_account].balances[_token].sub(hold.amount);
            totalBalances[_token] = totalBalances[_token].sub(hold.amount);
            from = _account;
            to = hold.receiver;
        }
        // if hold's flag is buying, increasing from balance and total-balance of the given token
        else if (hold.flag == HoldStatus.Buying) {
            if (!_hasToken(_account, _token)) accounts[_account].tokens.push(_token);
            accounts[_account].balances[_token] = accounts[_account].balances[_token].add(hold.amount);
            totalBalances[_token] = totalBalances[_token].add(hold.amount);
            from = hold.receiver;
            to = _account;
        }
        // if hold's flag is sending, decreasing or increasing only from balance of the given token
        else if (hold.flag == HoldStatus.Sending) {
            if (!_hasToken(hold.receiver, _token)) accounts[hold.receiver].tokens.push(_token);
            accounts[_account].balances[_token] = accounts[_account].balances[_token].sub(hold.amount);
            accounts[hold.receiver].balances[_token] = accounts[hold.receiver].balances[_token].add(hold.amount);
            from = _account;
            to = hold.receiver;
        } else {
            return;
        }
        // settling the hold.
        hold.flag = HoldStatus.Confirmed;
        emit TransferEvent(from, to, _token, hold.amount);
    }

    // add hold
    function _addHold(
        address _account,
        address _token,
        Hold memory hold
    ) internal returns (uint256) {
        uint256 holdIndex = _getNextAvailableHoldIndex(_account, _token);
        // if holdIndex is greater than 0, replace with the new hold.
        // otherwise, add a new hold to hold-array.
        if (holdIndex > 0) {
            holdIndex -= 1;
            accounts[_account].holds[_token][holdIndex] = hold;
        } else {
            accounts[_account].holds[_token].push(hold);
            holdIndex = accounts[_account].holds[_token].length - 1;
        }
        return holdIndex;
    }

    //check if _account has the _token.
    function _hasToken(address _account, address _token) internal view returns (bool) {
        for (uint256 i = 0; i < accounts[_account].tokens.length; i++) {
            if (accounts[_account].tokens[i] == _token) {
                return true;
            }
        }
        return false;
    }

    // get the real spendableBalance of token that caller owns.
    function getSpendableBalance(address _account, address _token) public view returns (uint256) {
        uint256 spendableBalance = accounts[_account].balances[_token];
        for (uint256 i = 0; i < accounts[_account].holds[_token].length; i++) {
            if (
                accounts[_account].holds[_token][i].flag == HoldStatus.Selling ||
                accounts[_account].holds[_token][i].flag == HoldStatus.Sending ||
                accounts[_account].holds[_token][i].flag == HoldStatus.Burning
            ) {
                spendableBalance = spendableBalance.sub(accounts[_account].holds[_token][i].amount);
            }
        }
        return spendableBalance;
    }

    // get the first holdIndex with status in hold-array
    function _getNextAvailableHoldIndex(address _account, address _token) internal view returns (uint256) {
        uint256 availableIndex = 0;
        // because index of array start with 0, we assign 'i' to = 1. In result, we return the index + 1.
        for (uint256 i = 0; i < accounts[_account].holds[_token].length; i++) {
            if (accounts[_account].holds[_token][i].flag == HoldStatus.Confirmed) {
                availableIndex = i + 1;
                break;
            }
        }
        return availableIndex;
    }

    // get confirmBalance of token owned by the caller.
    function getConfirmBalance(address _token) external view returns (uint256) {
        return accounts[_msgSender()].balances[_token];
    }

    // get tokens owned by the caller.
    function getTokensOf(address _account) external view returns (address[] memory) {
        return accounts[_account].tokens;
    }
}

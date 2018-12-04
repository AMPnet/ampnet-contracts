pragma solidity 0.4.24;

import "./Organization.sol";
import "./AMPnet.sol";


contract Project {

    string private _name;
    string private _description;

    uint256 private _maxInvestmentPerUser;
    uint256 private _minInvestmentPerUser;
    uint256 private _investmentCap;

    bool private _lockedForInvestments = false;

    mapping (address => uint256) private _investments;

    Organization private _organization; // every project investment belongs to one organization

    AMPnet private _ampnet;

    constructor(
        string name,
        string description,
        uint256 maxInvestmentPerUser,
        uint256 minInvestmentPerUser,
        uint256 investmentCap,
        Organization organization,
        AMPnet ampnet
    ) public {
        _name = name;
        _description = description;
        _maxInvestmentPerUser = maxInvestmentPerUser;
        _minInvestmentPerUser = minInvestmentPerUser;
        _investmentCap = investmentCap;
        _organization = organization;
        _ampnet = ampnet;
    }

    /**
        Modifiers
    */
    modifier isEurContract() {
        require(
            msg.sender == address(_ampnet.getEurContract()),
            "Function accessible only to EUR token!"
        );
        _;
    }

    /**
        Functions
    */
    function addNewUserInvestment(address user, uint256 amount) public isEurContract {
        _investments[user] += amount;

        if (getCurrentTotalInvestment() == _investmentCap) {
            _lockedForInvestments = true;
        }
    }

    function transferOwnership(address to, uint256 amount) public {

        // TODO: - Should we check if this transfer will make `to` user too rich in tokens?

        require(amount != 0);                              // cannot transfer 0 tokens
        require(amount <= _investments[msg.sender]);       // cannot transfer more than actually owned in this project
        require(_ampnet.isWalletActive(msg.sender));       // check if sender in AMPnet system
        require(_ampnet.isWalletActive(to));               // check if receiver is in AMPnet system

        _investments[msg.sender] -= amount;
        _investments[to] += amount;

    }

    function cancelInvestment(uint256 amount) public {
        require(amount != 0);
        require(amount <= _investments[msg.sender]);
        require(amount == _investments[msg.sender] || (_investments[msg.sender] - amount) >= _minInvestmentPerUser);
        require(!isLockedForInvestments());
        require(_ampnet.isWalletActive(msg.sender));

        _ampnet.getEurContract().transfer(msg.sender, amount);
        _investments[msg.sender] -= amount;
    }

    function getName() public view returns (string) {
        return _name;
    }

    function getDescription() public view returns (string) {
        return _description;
    }

    function getMaxInvestmentPerUser() public view returns (uint256) {
        return _maxInvestmentPerUser;
    }

    function getMinInvestmentPerUser() public view returns (uint256) {
        return _minInvestmentPerUser;
    }

    function getInvestmentCap() public view returns (uint256) {
        return _investmentCap;
    }

    function getCurrentTotalInvestment() public view returns (uint256) {
        return _ampnet.getEurContract().balanceOf(this);
    }

    function getTotalInvestmentForUser(address user) public view returns (uint256) {
        return _investments[user];
    }

    function isLockedForInvestments() public view returns (bool) {
        return _lockedForInvestments;
    }

}
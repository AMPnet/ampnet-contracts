pragma solidity 0.4.25;

import "./Organization.sol";
import "./AMPnet.sol";
import "./EUR.sol";


contract Project {

    uint256 public maxPerUserInvestment;
    uint256 public minPerUserInvestment;
    uint256 public investmentCap;

    bool public fundingCompleted = false;

    mapping (address => uint256) private investments;
    address[] private investors;

    Organization private organization;
    AMPnet private ampnet;
    ERC20 private token;

    event RevenueShareMinted(address indexed wallet, uint256 amount);

    constructor(
        uint256 _maxInvestmentPerUser,
        uint256 _minInvestmentPerUser,
        uint256 _investmentCap,
        Organization _organization,
        AMPnet _ampnet,
        ERC20 _token
    ) public {
        maxInvestmentPerUser = _maxInvestmentPerUser;
        minInvestmentPerUser = _minInvestmentPerUser;
        investmentCap = _investmentCap;
        organization = _organization;
        ampnet = _ampnet;
        token = _token;
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

    modifier isOrganizationAdmin() {
        require(
            _organization.isAdmin(msg.sender),
            "Function accessible only to organization admin!"
        );
        _;
    }

    modifier fundingCompleted() {
        require(
            _lockedForInvestments,
            "Function accessible only when project's investment cap is reached."
        );
        _;
    }

    /**
        Functions
    */
    function addNewUserInvestment(address user, uint256 amount) public isEurContract {
        _investments[user] += amount;
        if (!isInvestor(user)) {
            _investors.push(user);
        }
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

    function withdrawFunds(address tokenIssuer, uint256 amount) public isOrganizationAdmin fundingCompleted {
        EUR eur = _ampnet.getEurContract();
        eur.approve(tokenIssuer, amount);
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

    function getInvestors() public view returns (address[]) {
        return _investors;
    }

    function isInvestor(address wallet) private view returns (bool) {
        uint count = _investors.length;
        for (uint i=0; i < count; i++) {
            if (_investors[i] == wallet) return true;
        }
        return false;
    }

    function payoutRevenueSharesBatch() private {
        uint256 investmentCap = getCurrentTotalInvestment();
        address[] memory investors = lastRevenueProject.getInvestors();

        uint numOfInvestors = investors.length;

        uint lastInvestorIndex = numOfInvestors - 1;
        uint lastBatchIndex = nextInvestorIndexToPayout + REVENUE_MINT_BATCH_SIZE - 1;

        uint upperLimit = (lastInvestorIndex < lastBatchIndex) ? lastInvestorIndex : lastBatchIndex;

        for (uint i = nextInvestorIndexToPayout; i <= upperLimit; i++) {
            address investor = investors[i];
            uint256 investment = lastRevenueProject.getTotalInvestmentForUser(investors[i]);
            uint256 share = lastRevenueAmount * investment / investmentCap;

            _mint(investor, share);

            emit RevenueShareMinted(investor, share);
        }

        if (upperLimit == lastInvestorIndex) {
            revenueSharePayoutInProgress = false;
        } else {
            nextInvestorIndexToPayout = upperLimit + 1;
        }
    }

}
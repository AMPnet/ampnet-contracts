pragma solidity 0.4.25;

import "./Organization.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract Project {

    /**
        State
    */
    uint256 public maxInvestmentPerUser;
    uint256 public minInvestmentPerUser;
    uint256 public investmentCap;
    uint256 public totalFundsRaised;

    bool public payoutInProcess;
    uint256 private revenueToSplit;
    uint private nextInvestorPayoutIndex;

    uint constant private REVENUE_MINT_BATCH_SIZE = 50;

    mapping (address => uint256) public investments;
    address[] private investors;

    Organization private organization;

    /**
        Events
    */
    event NewUserInvestment(address indexed investor, uint256 amount);
    event WithdrawProjectFunds(address indexed spender, uint256 amount);
    event RevenuePayoutStarted(uint256 revenue);
    event RevenueShareMinted(address indexed investor, uint256 amount);

    /**
        Constructor
    */
    constructor(
        uint256 _maxInvestmentPerUser,
        uint256 _minInvestmentPerUser,
        uint256 _investmentCap,
        Organization _organization
    ) public {
        maxInvestmentPerUser = _maxInvestmentPerUser;
        minInvestmentPerUser = _minInvestmentPerUser;
        investmentCap = _investmentCap;
        organization = _organization;
    }

    /**
        Modifiers
    */
    modifier isOrganizationAdmin() {
        require(
            organization.isAdmin(msg.sender),
            "Function accessible only to organization admin!"
        );
        _;
    }

    modifier fundingCompleted() {
        require(
            isCompletelyFunded(),
            "Function accessible only when project's investment cap is reached."
        );
        _;
    }

    /**
        Functions
    */
    function invest() external {
        ERC20 token = organization.coop().token();

        uint256 amount = token.allowance(msg.sender, address(this));
        uint256 usersPreviousTotalInvesment = investments[msg.sender];
        uint256 usersNewTotalInvestment = usersPreviousTotalInvesment + amount;
        uint256 projectNewTotalInvestment = totalFundsRaised + amount;

        require(
            totalFundsRaised < investmentCap,
            "Can not invest, project already completely funded."
        );
        require(
            amount != 0,
            "Can not invest zero tokens!"
        );
        require(
            usersNewTotalInvestment <= maxInvestmentPerUser,
            "User's investment will surpass maximum per-user investment for this project. Aborting."
        );
        require(
            usersNewTotalInvestment >= minInvestmentPerUser,
            "User's investment does not meet required minimum per-user investment for this project. Aborting."
        );
        require(
            projectNewTotalInvestment <= investmentCap,
            "User's investment will make total funds raised greater than project's investment cap. Aborting."
        );


        token.transferFrom(msg.sender, address(this), amount);
        totalFundsRaised += amount;
        investments[msg.sender] += amount;

        if (usersPreviousTotalInvesment == 0) {
            investors.push(msg.sender);
        }

        emit NewUserInvestment(msg.sender, amount);
    }

    function withdraw(
        address tokenIssuer,
        uint256 amount
    )
        external
        isOrganizationAdmin
        fundingCompleted
    {
        require(
            amount > 0,
            "Can not withdraw zero tokens. Aborting."
        );
        require(
            !payoutInProcess,
            "Can not withdraw money from project while revenue share payout is in process."
        );

        organization.coop().token().approve(tokenIssuer, amount);

        emit WithdrawProjectFunds(msg.sender, amount);
    }

    function startRevenueSharesPayout(
        uint256 revenue
    )
        external
        isOrganizationAdmin
        fundingCompleted
    {
        require(
            revenue > 0,
            "Revenue is zero. Aborting."
        );
        require(
            !payoutInProcess,
            "Finish current revenue share payout process before starting another one."
        );

        revenueToSplit = revenue;
        payoutInProcess = true;
        nextInvestorPayoutIndex = 0;

        emit RevenuePayoutStarted(revenue);
    }

    function payoutRevenueShares()
        external
        isOrganizationAdmin
        fundingCompleted
    {
        uint numOfInvestors = investors.length;

        uint lastInvestorIndex = numOfInvestors - 1;
        uint lastBatchIndex = nextInvestorPayoutIndex + REVENUE_MINT_BATCH_SIZE - 1;

        uint fromIndex = nextInvestorPayoutIndex;
        uint toIndex = (lastInvestorIndex < lastBatchIndex) ? lastInvestorIndex : lastBatchIndex;
        uint256 revenue = revenueToSplit;

        if (toIndex == lastInvestorIndex) {
            payoutInProcess = false;
            revenueToSplit = 0;
            nextInvestorPayoutIndex = 0;
        } else {
            nextInvestorPayoutIndex = toIndex + 1;
        }

        for (uint i = fromIndex; i <= toIndex; i++) {
            address investor = investors[i];
            uint256 investment = investments[investor];
            uint256 share = revenue * investment / totalFundsRaised;

            organization.coop().token().transfer(investor, share);

            emit RevenueShareMinted(investor, share);
        }
    }

    function isCompletelyFunded() public view returns (bool) {
        return totalFundsRaised == investmentCap;
    }

}
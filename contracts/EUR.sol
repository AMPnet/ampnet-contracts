pragma solidity 0.4.25;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./AMPnet.sol";
import "./Project.sol";


contract EUR is ERC20, ERC20Detailed("AMPnet EUR token", "EUR", 18), ERC20Mintable, ERC20Burnable {

    AMPnet private _ampnet;

    bool private revenueSharePayoutInProgress = false;

    Project private lastRevenueProject;
    uint256 private lastRevenueAmount;
    uint private nextInvestorIndexToPayout;

    uint constant private REVENUE_MINT_BATCH_SIZE = 1;

    constructor(AMPnet ampnet) public {
        _ampnet = ampnet;
    }

    /**
        Events
    */
    event RevenueShareMinted(address indexed wallet, uint256 amount);

    /**
        Modifiers
    */
    modifier isRegistered(address _user) {
        require(
            _ampnet.isWalletActive(_user),
            "Not a registered AMPnet user."
        );
        _;
    }

    modifier senderRegistered() {
        require(
            _ampnet.isWalletActive(msg.sender),
            "Not a registered AMPnet user."
        );
        _;
    }

    modifier isTokenIssuer(address wallet) {
        require(
            isMinter(wallet),
            "Not token issuer!"
        );
        _;
    }

    /**
        Investment logic
    */
    function invest(
        Project project,
        uint256 amount
    )
        public
        senderRegistered
        isRegistered(project)
    {
        require(amount != 0);
        require(balanceOf(msg.sender) >= amount);
        require(!project.isLockedForInvestments());

        uint256 usersCurrentTotalInvestment = project.getTotalInvestmentForUser(msg.sender);
        uint256 usersNewTotalInvestment = usersCurrentTotalInvestment + amount;

        uint256 projectCurrentTotalInvestment = project.getCurrentTotalInvestment();
        uint256 projectNewTotalInvestment = projectCurrentTotalInvestment + amount;

        require(usersNewTotalInvestment >= project.getMinInvestmentPerUser());
        require(usersNewTotalInvestment <= project.getMaxInvestmentPerUser());
        require(projectNewTotalInvestment <= project.getInvestmentCap());

        transfer(project, amount);
        project.addNewUserInvestment(msg.sender, amount);
    }

    /**
        Revenue share payout logic
    */
    function mintRevenue(
        Project project,
        uint256 revenue
    )
        public
        onlyMinter
    {
        if (revenueSharePayoutInProgress) {
            require(project == lastRevenueProject, "Revenue share payout in progress but wrong project provided!");
            require(revenue == lastRevenueAmount, "Revenue share payout in progress but wrong revenue provided!");
        } else {
            revenueSharePayoutInProgress = true;
            lastRevenueProject = project;
            lastRevenueAmount = revenue;
            nextInvestorIndexToPayout = 0;
        }
        payoutRevenueSharesBatch();
    }

    /**
        Override standard ERC20 implementation in order to
        bound token transfers between registered users only.
    */
    function transfer(
        address to,
        uint256 value
    )
        public
        isRegistered(to)
        senderRegistered
        returns (bool)
    {
        return super.transfer(to, value);
    }

    function approve(
        address spender,
        uint256 value
    )
        public
        isTokenIssuer(spender)
        senderRegistered
        returns (bool)
    {
        return super.approve(spender, value);
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    )
        public
        returns (bool)
    {
        revert();
    }

    function increaseAllowance(
        address spender,
        uint256 addedValue
    )
        public
        senderRegistered
        isTokenIssuer(spender)
        returns (bool)
    {
        return super.increaseAllowance(spender, addedValue);
    }

    function decreaseAllowance(
        address spender,
        uint256 subtractedValue
    )
        public
        senderRegistered
        isTokenIssuer(spender)
        returns (bool)
    {
        return super.decreaseAllowance(spender, subtractedValue);
    }

    function mint(
        address to,
        uint256 value
    )
        public
        onlyMinter
        isRegistered(to)
        returns (bool)
    {
        _mint(to, value);
        return true;
    }

    function burn(uint256 value) public { revert(); }

    function burnFrom(address from, uint256 value) public {
        _burnFrom(from, value);
    }

    /**
        HELPER FUNCTIONS
    */
    function payoutRevenueSharesBatch() private {
        uint256 investmentCap = lastRevenueProject.getCurrentTotalInvestment();
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
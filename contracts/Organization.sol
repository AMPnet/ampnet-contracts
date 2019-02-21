pragma solidity 0.4.25;

import "./Project.sol";
import "./Cooperative.sol";


contract Organization {

    /**
        State
    */
    address private admin;
    address[] private members;
    Project[] private projects;
    Cooperative public coop;
    bool public verifiedByCoop = false;

    /**
        Events
    */
    event ProjectAdded(address indexed project);
    event MemberAdded(address indexed member);
    event OrganizationApproved();

    /**
        Constructor
    */
    constructor(address _admin, Cooperative _coop) public {
        admin = _admin;
        coop = _coop;
    }

    /**
        Modifiers
    */
    modifier coopOnly {
        require(
            msg.sender == coop.owner(),
            "Illegal action. Only Cooperative can make this action!"
        );
        _;
    }

    modifier organizationVerified {
        require(
            verifiedByCoop,
            "Organization not verified by Cooperative!"
        );
        _;
    }

    modifier adminOnly {
        require(
            isAdmin(msg.sender),
            "Illegal action. Must be organization admin!"
        );
        _;
    }

    modifier walletActive(address wallet) {
        require(
            coop.isWalletActive(wallet),
            "Wallet not registered as Cooperative member."
        );
        _;
    }

    /**
        Functions
    */
    function activate() public coopOnly {
        verifiedByCoop = true;
        coop.addOrganizationWallet(this);
        emit OrganizationApproved();
    }

    function addProject(
        uint256 maxInvestmentPerUser,
        uint256 minInvestmentPerUser,
        uint256 investmentCap,
        uint256 endInvestmentTime
    )
        public
        adminOnly
        organizationVerified
    {
        Project project = new Project(
            maxInvestmentPerUser,
            minInvestmentPerUser,
            investmentCap,
            endInvestmentTime,
            this
        );
        projects.push(project);
        coop.addProjectWallet(project);
        emit ProjectAdded(project);
    }

    function addMember(
        address wallet
    )
        public
        adminOnly
        organizationVerified
        walletActive(wallet)
    {
        members.push(wallet);
        emit MemberAdded(wallet);
    }

    function withdrawFunds(
        address tokenIssuer,
        uint256 amount
    )
        public
        adminOnly
        organizationVerified
    {
        coop.token().approve(tokenIssuer, amount);
    }

    function getProjects() public view returns (Project[]) {
        return projects;
    }

    function getMembers() public view returns (address[]) {
        return members;
    }

    function isAdmin(address user) public view returns (bool) {
        return user == admin;
    }

}

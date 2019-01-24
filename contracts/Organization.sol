pragma solidity 0.4.25;

import "./Project.sol";
import "./AMPnet.sol";


contract Organization {

    /**
        State vars
    */
    address private _admin;

    string private _name;

    address[] private _members;

    Project[] private _projects;

    AMPnet private _ampnet;

    bool private _verifiedByAMPnet = false;

    /**
        Events
    */
    event ProjectAdded(address indexed project);

    /**
        Init
    */
    constructor(address admin, string name, AMPnet ampnet) public {
        _admin = admin;
        _name = name;
        _ampnet = ampnet;
    }

    /**
        Modifiers
    */
    modifier ampnetOnly {
        require(
            msg.sender == _ampnet.owner(),
            "Illegal action. Only AMPnet can make this action!"
        );
        _;
    }

    modifier organizationVerified {
        require(
            _verifiedByAMPnet,
            "Organization not verified by AMPnet!"
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
            _ampnet.isWalletActive(wallet),
            "Wallet not registered as AMPnet user."
        );
        _;
    }

    /**
        Functions
    */
    function activate() public ampnetOnly {
        _verifiedByAMPnet = true;
        _ampnet.addOrganizationWallet(this);
    }

    function addProject(
        string name,
        string description,
        uint256 maxInvestmentPerUser,
        uint256 minInvestmentPerUser,
        uint256 investmentCap
    )
        public
        adminOnly
        organizationVerified
    {
        Project project = new Project(
            name,
            description,
            maxInvestmentPerUser,
            minInvestmentPerUser,
            investmentCap,
            this,
            _ampnet
        );
        _projects.push(project);
        _ampnet.addProjectWallet(project);
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
        _members.push(wallet);
    }

    function withdrawFunds(
        address tokenIssuer,
        uint256 amount
    )
        public
        adminOnly
        organizationVerified
    {
        EUR eur = _ampnet.getEurContract();
        eur.approve(tokenIssuer, amount);
    }

    function isVerified() public view returns (bool) {
        return _verifiedByAMPnet;
    }

    function getName() public view returns (string) {
        return _name;
    }

    function getAllProjects() public view returns (Project[]) {
        return _projects;
    }

    function getMembers() public view returns (address[]) {
        return _members;
    }

    function isAdmin(address user) public view returns (bool) {
        return user == _admin;
    }

}

pragma solidity 0.4.25;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./Organization.sol";
import "./EUR.sol";


contract Cooperative is Ownable {

    /**
        State
    */
    mapping (address => bool) private activeWallets;
    mapping (address => bool) private activeOrganizations;
    Organization[] private organizations;
    ERC20 public token;

    /**
        Events
    */
    event WalletAdded(address indexed wallet);
    event OrganizationAdded(address indexed organization);

    /**
        Modifiers
    */
    modifier walletActive {
        require(
            isWalletActive(msg.sender),
            "Wallet not active."
        );
        _;
    }

    modifier onlyVerifiedOrganization {
        Organization org = Organization(msg.sender);
        require(
            isOrganizationActive(org) && org.verifiedByCoop(),
            "Provided organization is not approved by Cooperative."
        );
        _;
    }

    /**
        Functions
    */
    function setToken(EUR _token) public onlyOwner {
        token = _token;
    }

    function addWallet(address wallet) public onlyOwner {
        activeWallets[wallet] = true;
        emit WalletAdded(wallet);
    }

    function addOrganization() public walletActive {
        Organization organization = new Organization(msg.sender, this);
        organizations.push(organization);
        activeOrganizations[organization] = true;
        emit OrganizationAdded(organization);
    }

    function addProjectWallet(Project project) public onlyVerifiedOrganization {
        activeWallets[project] = true;
        emit WalletAdded(project);
    }

    function addOrganizationWallet(Organization organization) public onlyVerifiedOrganization {
        activeWallets[organization] = true;
        emit WalletAdded(organization);
    }

    function getOrganizations() public view returns (Organization[]) {
        return organizations;
    }

    function isWalletActive(address wallet) public view returns (bool) {
        return activeWallets[wallet];
    }

    function isOrganizationActive(address wallet) public view returns (bool) {
        return activeOrganizations[wallet];
    }

}
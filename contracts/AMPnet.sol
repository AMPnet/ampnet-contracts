pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./Organization.sol";
import "./EUR.sol";


contract AMPnet is Ownable {

    mapping (address => bool) private _activeWallets;

    Organization[] private _organizations;

    EUR private _eur;

    /**
        Events
    */
    event WalletAdded(address indexed wallet);
    event WalletRemoved(address indexed wallet);

    /**
        Modifiers
    */
    modifier walletActive {
        require(
            isWalletActive(msg.sender),
            "Wallet not active!"
        );
        _;
    }

    modifier onlyVerifiedOrganization {
        Organization org = Organization(msg.sender);
        require(
            organizationExists(org) && org.isVerified()
        );
        _;
    }

    /**
        Functions
    */
    function setEur(EUR eur) public onlyOwner {
        _eur = eur;
        addWallet(eur);
    }

    function addWallet(address wallet) public onlyOwner {
        _activeWallets[wallet] = true;
        emit WalletAdded(wallet);
    }

    function addProjectWallet(Project project) public onlyVerifiedOrganization {
        _activeWallets[project] = true;
        emit WalletAdded(project);
    }

    function addOrganizationWallet(Organization organization) public onlyVerifiedOrganization {
        _activeWallets[organization] = true;
        emit WalletAdded(organization);
    }
    
    function addOrganization(
        string name
    )
        public
        walletActive
    {
        _organizations.push(new Organization(msg.sender, name, this));
    }

    function getAllOrganizations() public view returns (Organization[]) {
        return _organizations;
    }

    function organizationExists(Organization organization) public view returns (bool) {
        uint count = _organizations.length;
        for (uint i=0; i < count; i++) {
            if (_organizations[i] == organization) return true;
        }
        return false;
    }

    function isWalletActive(address wallet) public view returns (bool) {
        return _activeWallets[wallet];
    }

    function getEurContract() public view returns (EUR) {
        return _eur;
    }

    // ONLY FOR TESTING PURPOSES! (avoid redeploying contracts after each test-case in blockchain service)
    // DELETE BEFOR MIGRATING CONTRACTS ON LIVENET!
    function removeOrganizations() public onlyOwner {
        delete _organizations;
    }

    function removeUser(address user) public onlyOwner {
        _activeWallets[user] = false;
    }

}
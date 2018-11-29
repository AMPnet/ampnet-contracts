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

    /**
        Functions
    */
    function setEur(EUR eur) public onlyOwner {
        _eur = eur;
    }

    function addWallet(address wallet) public onlyOwner {
        _activeWallets[wallet] = true;
        emit WalletAdded(wallet);
    }

    function removeWallet(address wallet) public onlyOwner {
        // TODO: - How to handle this case?
        // What if user has balance in EUR? Should this even be supported?
    }

    function addOrganization(
        string name
    )
        public
        walletActive
    {
        _organizations.push(new Organization(msg.sender, name, this));
    }

    function removeOrganization() public onlyOwner {
        // Should we allow this?
    }

    function getAllOrganizations() public view returns (Organization[]) {
        return _organizations;
    }

    function isWalletActive(address wallet) public view returns (bool) {
        return _activeWallets[wallet];
    }

    function getEurContract() public view returns (EUR) {
        return _eur;
    }

}
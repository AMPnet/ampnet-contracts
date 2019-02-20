pragma solidity 0.4.25;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "./Cooperative.sol";


contract EUR is ERC20, ERC20Detailed("Digital EUR", "EUR", 18), ERC20Mintable, ERC20Burnable {

    /**
        This contract is owned by Cooperative and contains wallets
        approved for using EUR token in order to invest/earn revenue shares.
    */
    Cooperative private coop;

    /**
        Constructor - gets reference to Cooperative contract
    */
    constructor(Cooperative _coop) public {
        coop = _coop;
    }

    /**
        Modifiers
    */
    modifier isRegistered(address wallet) {
        require(
            coop.isWalletActive(wallet) || isMinter(wallet),
            "Not a registered Cooperative user."
        );
        _;
    }

    modifier senderRegistered() {
        require(
            coop.isWalletActive(msg.sender),
            "Not a registered Cooperative user."
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
        isRegistered(spender)
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
        isRegistered(from)
        isRegistered(to)
        senderRegistered
        returns (bool)
    {
        return super.transferFrom(from, to, value);
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

}
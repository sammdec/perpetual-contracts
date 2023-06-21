// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IPerpetualEditionsSaleStrategy {
    struct ContractConfig {
        /// @notice Total tokens minted use MAX_INT for unlimited
        uint256 totalTokens;
        /// @notice Base URI for the token
        string baseURI;
        /// @notice Funds recipient (0 if no different funds recipient than the contract global)
        address fundsRecipient;
    }

    struct SalesConfig {
        /// @notice Unix timestamp for the sale start
        uint64 saleStart;
        /// @notice Unix timestamp for the sale end
        uint64 saleEnd;
        /// @notice Max tokens that can be minted for an address, 0 if unlimited
        uint64 maxTokensPerAddress;
        /// @notice Price per token in eth wei
        uint96 pricePerToken;
        /// @notice Creator this token
        address creator;
    }

    struct CreateTokenSaleOptions {
        /// @notice Max supply of the token
        uint256 maxSupply;
        /// @notice Max tokens that can be minted for an address, 0 if unlimited
        uint64 maxTokensPerAddress;
        /// @notice Price per token in eth wei
        uint96 pricePerToken;
    }

    error WrongValueSent();
    error SaleStillActive();
    error SaleEnded();
    error SaleHasNotStarted();
    error SetSaleNotInUse();
    error NotOwnerOfContract();
    error ContractConfigNotSet();

    event SaleSet(address indexed mediaContract, uint256 indexed tokenId, SalesConfig salesConfig);
    event MintComment(address indexed sender, address indexed tokenContract, uint256 indexed tokenId, uint256 quantity, string comment);
    event CreatorComment(address indexed sender, address indexed tokenContract, uint256 indexed tokenId, string comment);
}

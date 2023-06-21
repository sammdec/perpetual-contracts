// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {SaleStrategy} from "./utils/SaleStrategy.sol";
import {LimitedMintPerAddress} from "./utils/LimitedMintPerAddress.sol";
import {SaleCommandHelper} from "./utils/SaleCommandHelper.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

import {IPerpetualEditionsSaleStrategy} from "./interfaces/IPerpetualEditionsSaleStrategy.sol";
import {ICreatorCommands} from "./interfaces/zora/ICreatorCommands.sol";
import {IZoraCreator1155} from "./interfaces/zora/IZoraCreator1155.sol";

import "hardhat/console.sol";

/// @title Perpetual editions sale strategy
/// @notice A sales strategy for ZoraCreator that enables perpetual editions
/// @author @sammdec
contract PerpetualEditionsSaleStrategy is IPerpetualEditionsSaleStrategy, SaleStrategy, LimitedMintPerAddress {
    using SaleCommandHelper for ICreatorCommands.CommandSet;

    uint64 constant EDITION_DURATION = 86400;

    // target (nft contract) -> tokenId -> settings
    mapping(address => mapping(uint256 => SalesConfig)) internal salesConfigs;
    // target (nft contract) -> settings
    mapping(address => ContractConfig) internal contractConfigs;

    function contractURI() external pure override returns (string memory) {
        // TODO: update this to actual url
        return "https://github.com/ourzora/zora-1155-contracts/";
    }

    /// @notice The name of the sale strategy
    function contractName() external pure override returns (string memory) {
        return "Perpetual Editions Sale Strategy";
    }

    /// @notice The version of the sale strategy
    function contractVersion() external pure override returns (string memory) {
        return "1.0.0";
    }

    function setContractConfig(IZoraCreator1155 nftAddress, ContractConfig memory contractConfig) external {
        if (!nftAddress.isAdminOrRole(msg.sender, 0, nftAddress.PERMISSION_BIT_ADMIN())) {
            revert NotOwnerOfContract();
        }

        contractConfigs[address(nftAddress)] = contractConfig;
    }

    /// @notice Compiles and returns the commands needed to mint a token using this sales strategy
    /// @param tokenId The token ID to mint
    /// @param quantity The quantity of tokens to mint
    /// @param ethValueSent The amount of ETH sent with the transaction
    /// @param minterArguments The arguments passed to the minter, which should be the address to mint to
    function requestMint(
        address,
        uint256 tokenId,
        uint256 quantity,
        uint256 ethValueSent,
        bytes calldata minterArguments
    ) external returns (ICreatorCommands.CommandSet memory commands) {
        address mintTo;
        string memory comment = "";
        if (minterArguments.length == 32) {
            mintTo = abi.decode(minterArguments, (address));
        } else {
            (mintTo, comment) = abi.decode(minterArguments, (address, string));
        }

        SalesConfig storage config = salesConfigs[msg.sender][tokenId];
        ContractConfig memory contractConfig = contractConfigs[msg.sender];

        // If sales config does not exist this first check will always fail.

        // Check sale end
        if (block.timestamp > config.saleEnd) {
            revert SaleEnded();
        }

        // Check sale start
        if (block.timestamp < config.saleStart) {
            revert SaleHasNotStarted();
        }

        // Check value sent
        if (config.pricePerToken * quantity != ethValueSent) {
            revert WrongValueSent();
        }

        // Check minted per address limit
        if (config.maxTokensPerAddress > 0) {
            _requireMintNotOverLimitAndUpdate(config.maxTokensPerAddress, quantity, msg.sender, tokenId, mintTo);
        }

        bool shouldTransferFunds = contractConfig.fundsRecipient != address(0);
        commands.setSize(shouldTransferFunds ? 2 : 1);

        // Mint command
        commands.mint(mintTo, tokenId, quantity);

        if (bytes(comment).length > 0) {
            emit MintComment(mintTo, msg.sender, tokenId, quantity, comment);
        }

        // Should transfer funds if funds recipient is set to a non-default address
        if (shouldTransferFunds) {
            commands.transfer(contractConfig.fundsRecipient, ethValueSent);
        }
    }

    /// @notice Sets the sale config for the next token
    function createToken(IZoraCreator1155 nftAddress, CreateTokenSaleOptions memory salesOptions, string calldata creatorComment) external {
        uint256 currentTokenId = nftAddress.nextTokenId() - 1;

        SalesConfig memory currentSalesConfig = salesConfigs[address(nftAddress)][currentTokenId];
        ContractConfig memory contractConfig = contractConfigs[address(nftAddress)];

        if (bytes(contractConfig.baseURI).length == 0) {
            revert ContractConfigNotSet();
        }

        // Check current sale is not active
        if (block.timestamp < currentSalesConfig.saleEnd) {
            revert SaleStillActive();
        }

        SalesConfig memory salesConfig = SalesConfig({
            saleStart: uint64(block.timestamp),
            saleEnd: uint64(block.timestamp) + EDITION_DURATION,
            maxTokensPerAddress: salesOptions.maxTokensPerAddress,
            pricePerToken: salesOptions.pricePerToken,
            creator: msg.sender
        });

        //  Create next tokens config
        uint256 nextTokenId = nftAddress.setupNewToken(string.concat(contractConfig.baseURI, Strings.toString(currentTokenId + 1)), salesOptions.maxSupply);

        salesConfigs[address(nftAddress)][nextTokenId] = salesConfig;

        // Mint 1 token to the creator
        nftAddress.adminMint(msg.sender, nextTokenId, 1, "");

        // Emit event
        emit SaleSet(address(nftAddress), nextTokenId, salesConfig);

        if (bytes(creatorComment).length > 0) {
            emit CreatorComment(msg.sender, address(nftAddress), nextTokenId, creatorComment);
        }
    }

    /// @notice As we want everyone to be able to create a token and sale we wont be using function, but leaving this here as its convention within ZoraCreator
    function setSale(uint256, SalesConfig memory) external pure {
        revert SetSaleNotInUse();
    }

    /// @notice Deletes the sale config for a given token
    function resetSale(uint256 tokenId) external override {
        delete salesConfigs[msg.sender][tokenId];

        // Deleted sale emit event
        emit SaleSet(msg.sender, tokenId, salesConfigs[msg.sender][tokenId]);
    }

    /// @notice Returns the sale config for a given token
    function getSaleConfig(address tokenContract, uint256 tokenId) external view returns (SalesConfig memory) {
        return salesConfigs[tokenContract][tokenId];
    }

    function getContractConfig(address tokenContract) external view returns (ContractConfig memory) {
        return contractConfigs[tokenContract];
    }

    function supportsInterface(bytes4 interfaceId) public pure virtual override(LimitedMintPerAddress, SaleStrategy) returns (bool) {
        return super.supportsInterface(interfaceId) || LimitedMintPerAddress.supportsInterface(interfaceId) || SaleStrategy.supportsInterface(interfaceId);
    }
}

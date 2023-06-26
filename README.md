# Perpetual Editions Sale Strategy

The Perpetual Editions Sale Strategy is a sale & minting strategy that is compatible with the Zora Creator 1155 Contracts. Inspired by the Nouns auction model of a 1/1 daily auction forever, the Perpetual Editions Sale Strategy allows for the sale of a single open edition of a work per day, forever (or until the max tokens limit is reached).

However, unlike the Nouns auction model, there is no need for a `settle` function to be called. Instead this is replaced by a `createToken` function that can be called after the open edition sale is finished. Whoever calls this function will have some control over the parameters of the next open edition, these are;

- the price
- the maximum number of tokens that can be minted per wallet
- the maximum supply of the tokens that can be minted

They will also be minted one of the tokens from the new open edition.

## How it works

There are 2 main contracts used for creating a perpetual open edition, the first is the `ZoraCreator1155`, this is the main 1155 nft contract that is deployed when you create a multi-edition 1155 collection on Zora.

The second contract is the `PerpetualEditionsSaleStrategy`, this is the contract that is used to create the open editions and handle the sales of the 1155's.

The sequence of operation for creating a 1155 contract and settiig up a perpetual open edition is as follows;

- Call `createContract` on the `ZoraCreator1155Factory` contract, this will deploy a new `ZoraCreator1155` contract and return the address of the new contract
- Call `createContractConfig` on the `PerpetualEditionsSaleStrategy` contract, this takes in some collection level settings that you wouldn't want each editions creator changing, these are
  - `baseURI`, the main url that will host the metadata for each token, the token ID will be appended to the uri
  - `totalTokens`, the total number of tokens that will be created for the collection, if you want it to be inifnite then set this to MAX_UINT256
  - `fundsRecipient`, if you would like the funds from each sale to go to a different address than the default owner of the collection you can set this here, otherwise set it to the zero address
- Call `addPermission` on the collection contract, this will allow the `PerpetualEditionsSaleStrategy` contract to create tokens and mint tokens on behalf of the collection contract

Those are all of the one-off setup steps required, the following steps will be repeated for each open edition that you want to create;

- Call `createToken` on the `PerpetualEditionsSaleStrategy` contract, this will create a new open edition and mint the first token to the creator of the token
- Call `mint` on the 1155 collection contract, this will mint the token to minter

## Architecture

![Architecture diagram](/media/architecture.png)

## Addresses

Zora - `0x716453979dF2785920c0A183Af370fC69151A7D5`
Zora testnet - `0x00892d11Aa7914400D7A121c5FB63999910Fc53D`

## Quickstart

1. Clone the repo
2. Run `yarn install`

To run the tests:
`yarn test`

To build the contracts:
`yarn build`

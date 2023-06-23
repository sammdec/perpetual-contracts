import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers"
import { expect } from "chai"
import { ethers } from "hardhat"
import {
  AbiCoder,
  MaxUint256,
  ZeroAddress,
  ZeroHash,
  encodeBytes32String,
  parseEther,
} from "ethers"

describe("PerpetualSalesStrategy", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function createContractFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners()

    const factory1155 = await ethers.getContractAt(
      "IZoraCreator1155Factory",
      "0xA6C5f2DE915240270DaC655152C3f6A91748cb85"
    )

    const contractAddress = await factory1155.createContract.staticCall(
      "https://test-api.com/contract-metadata",
      "TEST",
      {
        royaltyMintSchedule: 0,
        royaltyBPS: 0,
        royaltyRecipient: ZeroAddress,
      },
      owner,
      []
    )

    const contractTx = await factory1155.createContract(
      "https://test-api.com/api/",
      "TEST",
      {
        royaltyMintSchedule: 0,
        royaltyBPS: 0,
        royaltyRecipient: ZeroAddress,
      },
      owner,
      []
    )

    await contractTx.wait()

    const nft1155 = await ethers.getContractAt(
      "IZoraCreator1155",
      contractAddress
    )

    const perpetualEditions = await ethers.deployContract(
      "PerpetualEditionsSaleStrategy"
    )

    const permissionTx = await nft1155.addPermission(
      0,
      perpetualEditions,
      2 ** 2
    )

    await permissionTx.wait()

    return { nft1155, perpetualEditions, owner, otherAccount }
  }

  describe("Create Token", function () {
    it("Should create a instance of the ZoraCreator1155 contract", async function () {
      const { nft1155 } = await loadFixture(createContractFixture)

      const contractUri = await nft1155.contractURI()

      expect(contractUri).to.equal("https://test-api.com/api/")
    })

    it("Should create an edition if there isnt an active one", async function () {
      const { nft1155, perpetualEditions, otherAccount } = await loadFixture(
        createContractFixture
      )

      const createContractConfigTx = await perpetualEditions.setContractConfig(
        nft1155,
        {
          totalTokens: MaxUint256,
          baseURI: "https://test-api.com/",
          fundsRecipient: ZeroAddress,
          duration: 24 * 60 * 60,
        }
      )

      await createContractConfigTx.wait()

      const createEditionTx = await perpetualEditions
        .connect(otherAccount)
        .createToken(
          nft1155,
          {
            maxSupply: 1_000,
            maxTokensPerAddress: 100,
            pricePerToken: parseEther("0.01"),
          },
          ""
        )

      await createEditionTx.wait()

      const nextTokenId = await nft1155.nextTokenId()
      const uri = await nft1155.uri(1)
      const tokenInfo = await nft1155.getTokenInfo(1)

      expect(nextTokenId).to.equal(2)
      expect(uri).to.equal("https://test-api.com/1")
      expect(tokenInfo.totalMinted).to.equal(1)
    })

    it("Should not create an edition if there is an active one", async function () {
      const { nft1155, perpetualEditions, otherAccount } = await loadFixture(
        createContractFixture
      )

      const createContractConfigTx = await perpetualEditions.setContractConfig(
        nft1155,
        {
          totalTokens: MaxUint256,
          baseURI: "https://test-api.com/",
          fundsRecipient: ZeroAddress,
          duration: 24 * 60 * 60,
        }
      )

      await createContractConfigTx.wait()

      const createEditionTx = await perpetualEditions
        .connect(otherAccount)
        .createToken(
          nft1155,
          {
            maxSupply: 1_000,
            maxTokensPerAddress: 100,
            pricePerToken: parseEther("0.01"),
          },
          ""
        )

      await createEditionTx.wait()

      await expect(
        perpetualEditions.connect(otherAccount).createToken(
          nft1155,
          {
            maxSupply: 1_000,
            maxTokensPerAddress: 100,
            pricePerToken: parseEther("0.01"),
          },
          ""
        )
      ).to.be.revertedWithCustomError(perpetualEditions, "SaleStillActive")
    })

    it("Should allow creation of new token after 24 hours", async function () {
      const { nft1155, perpetualEditions, otherAccount } = await loadFixture(
        createContractFixture
      )

      const createContractConfigTx = await perpetualEditions.setContractConfig(
        nft1155,
        {
          totalTokens: MaxUint256,
          baseURI: "https://test-api.com/",
          fundsRecipient: ZeroAddress,
          duration: 24 * 60 * 60,
        }
      )

      await createContractConfigTx.wait()

      const createEditionTx = await perpetualEditions
        .connect(otherAccount)
        .createToken(
          nft1155,
          {
            maxSupply: 1_000,
            maxTokensPerAddress: 100,
            pricePerToken: parseEther("0.01"),
          },
          ""
        )

      await createEditionTx.wait()

      const nextTokenId = await nft1155.nextTokenId()
      const uri = await nft1155.uri(1)
      const tokenInfo = await nft1155.getTokenInfo(1)

      expect(nextTokenId).to.equal(2)
      expect(uri).to.equal("https://test-api.com/1")
      expect(tokenInfo.totalMinted).to.equal(1)

      await expect(
        perpetualEditions.connect(otherAccount).createToken(
          nft1155,
          {
            maxSupply: 1_000,
            maxTokensPerAddress: 100,
            pricePerToken: parseEther("0.01"),
          },
          ""
        )
      ).to.be.revertedWithCustomError(perpetualEditions, "SaleStillActive")

      // Move ahead a day
      await time.increase(86400)
      const createNextEditionTx = await perpetualEditions
        .connect(otherAccount)
        .createToken(
          nft1155,
          {
            maxSupply: 1_000,
            maxTokensPerAddress: 1,
            pricePerToken: parseEther("0.01"),
          },
          ""
        )

      await createNextEditionTx.wait()

      const nextTokenId2 = await nft1155.nextTokenId()
      const uri2 = await nft1155.uri(2)
      const tokenInfo2 = await nft1155.getTokenInfo(2)

      expect(nextTokenId2).to.equal(3)
      expect(uri2).to.equal("https://test-api.com/2")
      expect(tokenInfo2.totalMinted).to.equal(1)
    })
  })

  describe("Create contract config", function () {
    it("Should revert if non-owner of nft contract tries to add config", async function () {
      const { nft1155, perpetualEditions, otherAccount } = await loadFixture(
        createContractFixture
      )

      const createContractConfigTx = await perpetualEditions.setContractConfig(
        nft1155,
        {
          totalTokens: MaxUint256,
          baseURI: "https://test-api.com/",
          fundsRecipient: ZeroAddress,
          duration: 24 * 60 * 60,
        }
      )

      await createContractConfigTx.wait()

      await expect(
        perpetualEditions.connect(otherAccount).setContractConfig(nft1155, {
          totalTokens: MaxUint256,
          baseURI: "https://test-api.com/",
          fundsRecipient: ZeroAddress,
          duration: 24 * 60 * 60,
        })
      ).to.be.revertedWithCustomError(perpetualEditions, "NotOwnerOfContract")
    })

    it("Should allow for different durations for each contract", async function () {
      const { nft1155, perpetualEditions, otherAccount } = await loadFixture(
        createContractFixture
      )

      const createContractConfigTx = await perpetualEditions.setContractConfig(
        nft1155,
        {
          totalTokens: MaxUint256,
          baseURI: "https://test-api.com/",
          fundsRecipient: ZeroAddress,
          duration: 1 * 60 * 60,
        }
      )

      const createEditionTx = await perpetualEditions
        .connect(otherAccount)
        .createToken(
          nft1155,
          {
            maxSupply: 1_000,
            maxTokensPerAddress: 100,
            pricePerToken: parseEther("0.01"),
          },
          ""
        )

      await createEditionTx.wait()

      const nextTokenId = await nft1155.nextTokenId()

      expect(nextTokenId).to.equal(2)

      // Move ahead an hour
      await time.increase(1 * 60 * 60)

      await createContractConfigTx.wait()

      const createEdition2Tx = await perpetualEditions
        .connect(otherAccount)
        .createToken(
          nft1155,
          {
            maxSupply: 1_000,
            maxTokensPerAddress: 100,
            pricePerToken: parseEther("0.01"),
          },
          ""
        )

      await createEdition2Tx.wait()

      const nextTokenId2 = await nft1155.nextTokenId()

      expect(nextTokenId2).to.equal(3)

      // Move ahead 30 mins
      await time.increase(30 * 60)

      await expect(
        perpetualEditions.connect(otherAccount).createToken(
          nft1155,
          {
            maxSupply: 1_000,
            maxTokensPerAddress: 100,
            pricePerToken: parseEther("0.01"),
          },
          ""
        )
      ).to.be.revertedWithCustomError(perpetualEditions, "SaleStillActive")

      // Move ahead 30 mins
      await time.increase(30 * 60)

      const createEdition3Tx = await perpetualEditions
        .connect(otherAccount)
        .createToken(
          nft1155,
          {
            maxSupply: 1_000,
            maxTokensPerAddress: 100,
            pricePerToken: parseEther("0.01"),
          },
          ""
        )

      await createEdition3Tx.wait()

      const nextTokenId3 = await nft1155.nextTokenId()

      expect(nextTokenId3).to.equal(4)
    })
  })

  describe("Mint", function () {
    it("Should mint the current token", async function () {
      const { nft1155, perpetualEditions, otherAccount } = await loadFixture(
        createContractFixture
      )

      const createContractConfigTx = await perpetualEditions.setContractConfig(
        nft1155,
        {
          totalTokens: MaxUint256,
          baseURI: "https://test-api.com/",
          fundsRecipient: ZeroAddress,
          duration: 24 * 60 * 60,
        }
      )

      await createContractConfigTx.wait()

      const createEditionTx = await perpetualEditions
        .connect(otherAccount)
        .createToken(
          nft1155,
          {
            maxSupply: 1_000,
            maxTokensPerAddress: 100,
            pricePerToken: parseEther("0.01"),
          },
          ""
        )

      await createEditionTx.wait()

      const abi = AbiCoder.defaultAbiCoder()
      const minterArgs = abi.encode(["address"], [otherAccount.address])

      const mintTx = await nft1155
        .connect(otherAccount)
        .mint(perpetualEditions, 1, 1, minterArgs, {
          value: parseEther("0.01") + parseEther("0.000777"),
        })

      await mintTx.wait()

      const tokenInfo = await nft1155.getTokenInfo(1)

      expect(tokenInfo.totalMinted).to.equal(2)
    })
  })
})

import { MaxUint256, ZeroAddress, parseEther } from "ethers"
import { ethers, deployments, getNamedAccounts } from "hardhat"

const nftContractAddress = "0x925e0a3f97b13fdb833f87fa2c5eedfca231be9b"

async function main() {
  const { execute } = deployments
  const { deployer } = await getNamedAccounts()
  const nftContract = await ethers.getContractAt(
    "IZoraCreator1155",
    nftContractAddress
  )

  const perpetualEditionsContract = await deployments.get(
    "PerpetualEditionsSaleStrategy"
  )

  const permissionTx = await nftContract.addPermission(
    0,
    perpetualEditionsContract.address,
    2 ** 2
  )

  await permissionTx.wait()

  console.log("Permission added")

  await execute(
    "PerpetualEditionsSaleStrategy",
    { from: deployer },
    "setContractConfig",
    nftContractAddress,
    {
      totalTokens: MaxUint256,
      baseURI: "https://test-api.com/",
      fundsRecipient: ZeroAddress,
      duration: 24 * 60 * 60,
    }
  )

  console.log("Contract config set")
  await execute(
    "PerpetualEditionsSaleStrategy",
    { from: deployer },
    "createToken",
    nftContractAddress,
    {
      maxSupply: 1_000,
      maxTokensPerAddress: 100,
      pricePerToken: parseEther("0.01"),
    },
    ""
  )

  console.log("Token created")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

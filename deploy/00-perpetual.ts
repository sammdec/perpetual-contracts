import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre
  const { deploy } = deployments

  const chainId = await getChainId()

  const { deployer } = await getNamedAccounts()

  const perpetual = await deploy("PerpetualEditionsSaleStrategy", {
    from: deployer,
    args: [],
    log: true,
  })

  console.log(
    `PerpetualEditionsSaleStrategy deployed to ${perpetual.address} on chain ${chainId}`
  )
}

export default deploy

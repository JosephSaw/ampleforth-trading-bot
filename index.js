require('dotenv').config()

const contractsABI = require("./contractABI");
const contracts = {
  wEthToken: {
    address: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
  },
  ampleToken: {
    address: "0x027dbcA046ca156De9622cD1e2D907d375e53aa7",
    abi: contractsABI.ampleToken
  },
  daiToken: {
    address: "0x6b175474e89094c44da98b954eedeac495271d0f"
  },
  monetaryPolicy: {
    address: "0x1D2771AFC894107c4edc072e3bd15Cb7F1BCC007",
    abi: contractsABI.monetaryPolicy,
  },
  orchestrator: {
    address: "0xF473604Be74A69a6bB4ebED33A91a291f6C5b5DE"
  },
  marketOracle: {
    address: "0x47fB203e1d75FB2c518Cd56f3a8094D22A46aF83",
    abi: contractsABI.marketOracle
  },
  cpiOracle: {
    address: "0xDB021b1B247fe2F1fa57e0A87C748Cc1E321F07F",
    abi: contractsABI.cpiOracle
  },
  chainlinkMarketOracle: {
    address: "0xfc4b1Ce32ed7310028DCC0d94C7B3D96dCd880e0",
    abi: contractsABI.chainlinkMarketOracle,
  },
  uniswapFactory: {
    address: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    abi: contractsABI.uniswapFactory
  },
  uniswapExchangeAmpleAndWeth: {
    address: "0xc5be99A02C6857f9Eac67BbCE58DF5572498F40c",
    abi: contractsABI.uniswapExchange
  },
  uniswapRouter: {
    address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    abi: contractsABI.uniswapRouter
  },
  trader: {
    address: "0xB53B9583330F56497Fe740cF92D56fe5b80D10DF",
    abi: contractsABI.trader
  }
}

const networks = {
  rinkeby: {
    chainID: '4',
    infura: process.env.PROVIDER_URL
  }
}

const { ChainId, Token, Fetcher, WETH, TokenAmount, Route, TradeType, Trade, Percent } = require("@uniswap/sdk")

const daiAddress = {
  rinkeby: '0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735'
}

const ampleAddress = {
  rinkeby: '0x027dbcA046ca156De9622cD1e2D907d375e53aa7'
}

const DAI = new Token(ChainId.RINKEBY, daiAddress.rinkeby, 18, 'DAI', 'DAI TOKEN')
const WALLET_ADDRESS = process.env.WALLET_ADDRESS
/* 
1. Get Rates
2. Calc if rebase will happen
3. If rebase happens, decide which strategy to use
4. ???
5. Profit
*/
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY
// Ample Rebase time: 10AM GMT +8
const moment = require("moment-timezone");
const BigNumber = require("bignumber.js")
const HDWalletProvider = require("@truffle/hdwallet-provider");
const provider = new HDWalletProvider(WALLET_PRIVATE_KEY, networks.rinkeby.infura)
const Web3 = require("web3");
const EIGHTEENDECIMALS = 1000000000000000000
var web3 = new Web3(provider)

// @return deviationThreshold in percentage
function fetchDeviationThreshold() {
  return new Promise((resolve, reject) => {
    try {
      const MonetaryPolicyContract = new web3.eth.Contract(contracts.monetaryPolicy.abi, contracts.monetaryPolicy.address)

      MonetaryPolicyContract.methods.deviationThreshold().call().then(function (result) {
        const obj = {
          default: result,
          formatted: result / 10000000000000000
        }
        resolve(obj)
      })
    } catch (err) {
      console.log(err)
      reject("Something has went wrong in fetchDeviationThreshold")
    }
  })
}

function fetchMinRebaseTimeInterval() {
  return new Promise((resolve, reject) => {
    try {
      const MonetaryPolicyContract = new web3.eth.Contract(contracts.monetaryPolicy.abi, contracts.monetaryPolicy.address)

      MonetaryPolicyContract.methods.minRebaseTimeIntervalSec().call().then(function (result) {
        resolve(result)
      })
    } catch (err) {
      console.log(err)
      reject("Something has went wrong in fetchDeviationThreshold")
    }
  })
}

function fetchLastRebaseTimestamp() {
  return new Promise((resolve, reject) => {
    try {
      const MonetaryPolicyContract = new web3.eth.Contract(contracts.monetaryPolicy.abi, contracts.monetaryPolicy.address)

      MonetaryPolicyContract.methods.lastRebaseTimestampSec().call().then(function (result) {
        resolve(result)
      })
    } catch (err) {
      console.log(err)
      reject("Something has went wrong in fetchDeviationThreshold")
    }
  })
}

function fetchInRebaseWindow() {
  return new Promise((resolve, reject) => {
    try {
      const MonetaryPolicyContract = new web3.eth.Contract(contracts.monetaryPolicy.abi, contracts.monetaryPolicy.address)

      MonetaryPolicyContract.methods.inRebaseWindow().call().then(function (result) {
        resolve(result)
      })
    } catch (err) {
      console.log(err)
      reject("Something has went wrong in fetchDeviationThreshold")
    }
  })
}

function fetchOraclePrice() {
  return new Promise((resolve, reject) => {
    const MarketOracleContract = new web3.eth.Contract(contracts.marketOracle.abi, contracts.marketOracle.address)
    MarketOracleContract.methods.getData().call().then(function (result) {
      const obj = {
        default: parseInt(result[0]),
        result,
        formatted: result[0] / EIGHTEENDECIMALS
      }
      resolve(obj)
    })
  })
}

function fetchTargetPrice() {
  return new Promise(async (resolve, reject) => {
    const CPIOracleContract = new web3.eth.Contract(contracts.cpiOracle.abi, contracts.cpiOracle.address)

    const baseCPI = 109149850000000000000
    CPIOracleContract.methods.getData().call().then(result => {
      resolve((result[0] / baseCPI) * EIGHTEENDECIMALS)
    })
  })

}

function calcPriceThreshold(deviationThreshold, targetRate) {
  const difference = (deviationThreshold.formatted / 100) * targetRate

  const obj = {
    contractionThreshold: (targetRate - difference) / EIGHTEENDECIMALS,
    expansionThreshold: (targetRate + difference) / EIGHTEENDECIMALS,
  }

  return obj
}

function fetchTotalSupply() {
  return new Promise((resolve, reject) => {
    const AmpleTokenContract = new web3.eth.Contract(contracts.ampleToken.abi, contracts.ampleToken.address)
    AmpleTokenContract.methods.totalSupply().call().then((result) => {
      resolve(parseInt(result))
    })
  })
}

function fetchMarketPrice(path, value) {
  return new Promise((resolve, reject) => {
    const UniswapRouterContract = new web3.eth.Contract(contracts.uniswapRouter.abi, contracts.uniswapRouter.address)

    // UniswapRouterContract.methods.getReserves(contracts.uniswapFactory.address, contracts.daiToken.address, contracts.ampleToken.address).call().then(result => {
    //   resolve(result)
    // })

    const oneDai = Web3.utils.toWei(value, 'ether')

    if (!path) {
      const daiContract = contracts.daiToken.address
      const ampleContract = contracts.ampleToken.address
      path = [daiContract, ampleContract]
    }

    UniswapRouterContract.methods.getAmountsOut(oneDai, path).call().then(result => {
      const ampleValue = Web3.utils.fromWei(result[1], 'gwei');
      resolve(ampleValue)
    }).catch(err => console.log(err))
  })
}

function swapDaiForAmple(amountOutMin, path, toAddress, deadline, value, account) {
  return new Promise(async (resolve, reject) => {
    const UniswapRouterContract = new web3.eth.Contract(contracts.uniswapRouter.abi, contracts.uniswapRouter.address, account)
    const daiContract = new web3.eth.Contract(contractsABI.erc20, daiAddress.rinkeby, account)

    daiContract.methods.approve(contracts.uniswapRouter.address, value).send({
      from: WALLET_ADDRESS
    }).then((result) => {
      console.log(result)
      console.log('spending approved')
      return UniswapRouterContract.methods.swapExactTokensForTokens(value, amountOutMin, path, toAddress, deadline).send({
        from: WALLET_ADDRESS,
        // value
        // gasPrice (Optional) in wei
        // gas (Optional) in wei, basically gasLimit
      })
    }).then((result) => {
      resolve(result)
    })

  })
}


function swapAmpleForDai(amountOutMin, path, toAddress, deadline, value, account) {
  return new Promise(async (resolve, reject) => {
    const UniswapRouterContract = new web3.eth.Contract(contracts.uniswapRouter.abi, contracts.uniswapRouter.address, account)
    const ampleContract = new web3.eth.Contract(contractsABI.erc20, ampleAddress.rinkeby, account)

    ampleContract.methods.approve(contracts.uniswapRouter.address, value).send({
      from: WALLET_ADDRESS
    }).then((result) => {
      console.log(result)
      console.log('spending approved')
      return UniswapRouterContract.methods.swapExactTokensForTokens(value, amountOutMin, path, toAddress, deadline).send({
        from: WALLET_ADDRESS,
        // value
        // gasPrice (Optional) in wei
        // gas (Optional) in wei, basically gasLimit
      })
    }).then((result) => {
      resolve(result)
    })

  })
}

function uniswapSwapExactETHForTokens(amountOutMin, path, toAddress, deadline, value, account) {
  return new Promise(async (resolve, reject) => {
    const UniswapRouterContract = new web3.eth.Contract(contracts.uniswapRouter.abi, contracts.uniswapRouter.address, account)
    const wethContract = new web3.eth.Contract(contractsABI.erc20, contracts.wEthToken.address, account)
    value = Web3.utils.toWei(value, 'ether')

    wethContract.methods.approve(contracts.uniswapRouter.address, value).send({
      from: WALLET_ADDRESS
    }).then((result) => {
      console.log(result)
      console.log('spending approved')
      return UniswapRouterContract.methods.swapExactTokensForTokens(value, amountOutMin, path, toAddress, deadline).send({
        from: WALLET_ADDRESS,
        // value
        // gasPrice (Optional) in wei
        // gas (Optional) in wei, basically gasLimit
      })
    }).then((result) => {
      resolve(result)
    })

  })
}

function isRebaseHappeningSoon(timestamp) {
  return moment.unix(timestamp).add('55', 'minutes').isBefore(moment())
}

async function letsTrade() {

  // Rebase is every hour on Rinkeby, so trade execution won't run unless it's 5 minutes before the next rebase
  if (lastRebaseTimestamp && !isRebaseHappeningSoon(lastRebaseTimestamp) && !rebaseTimestampDuringTradeExecution) return
  if (running) return

  running = true
  const minRebaseTimeInterval = await fetchMinRebaseTimeInterval()
  lastRebaseTimestamp = await fetchLastRebaseTimestamp()
  const inRebaseWindow = await fetchInRebaseWindow()

  const deviationThreshold = await fetchDeviationThreshold()
  const targetRate = await fetchTargetPrice()
  const priceThreshold = calcPriceThreshold(deviationThreshold, targetRate)
  const oraclePrice = await fetchOraclePrice();
  const tenDays = 10
  const totalSupply = await fetchTotalSupply()

  const dailyAdjustmentPercentage = (((oraclePrice.default - targetRate) * 100) / tenDays / EIGHTEENDECIMALS)
  const supplyDelta = (totalSupply / 100) * dailyAdjustmentPercentage
  const newSupply = totalSupply + supplyDelta

  console.log('============================================')

  console.log('minRebaseTimeInterval', minRebaseTimeInterval)
  console.log('lastRebaseTimestamp', lastRebaseTimestamp)
  console.log('inRebaseWindow', inRebaseWindow)
  console.log('deviationThreshold', deviationThreshold)
  console.log('targetRate', targetRate)
  console.log('priceThreshold', priceThreshold)
  console.log('oraclePrice', oraclePrice)
  console.log('totalSupply', totalSupply)
  console.log('dailyAdjustmentPercentage', dailyAdjustmentPercentage)
  console.log('supplyDelta', supplyDelta)
  console.log('newSupply', newSupply)

  //If rebase percentage change is less than 5% then do not execute trade
  // if (Math.abs(dailyAdjustmentPercentage) <= 5) {
    // console.log('Not within risk threshold, exitting')
  //   running = false
  //   return
  // }

  // If supply expansion is less than 5% then do not execute trade
   if (dailyAdjustmentPercentage <= 5) {
    console.log('supply expansion is less than 5%, exitting')
    running = false
    return
  }

  // Rebase is every hour on Rinkeby, so trade execution won't run unless it's 5 minutes before the next rebase
  if (!isRebaseHappeningSoon(lastRebaseTimestamp) && !rebaseTimestampDuringTradeExecution) {
    console.log('rebase not happening soon, exitting')
    running = false
    return
  }

  // Exit code if we've swapped Dai to Ample but the rebase has not completed yet
  if (rebaseTimestampDuringTradeExecution === lastRebaseTimestamp) {
    console.log('rebase has not finished, will not swap AMPLE for DAI, exitting')
    running = false
    return
  }

  const rinkebyAccount = web3.eth.accounts.privateKeyToAccount(WALLET_PRIVATE_KEY)
  const AMPLE = await Fetcher.fetchTokenData(DAI.chainId, ampleAddress.rinkeby, undefined, 'AMPL', 'AMPLE TOKEN')
  const DAI_WETH_PAIR = await Fetcher.fetchPairData(DAI, WETH[DAI.chainId])
  const AMPLE_WETH_PAIR = await Fetcher.fetchPairData(AMPLE, WETH[DAI.chainId])
  const to = WALLET_ADDRESS

  const TraderContract = new web3.eth.Contract(contracts.trader.abi, contracts.trader.address, rinkebyAccount)

  if (!rebaseTimestampDuringTradeExecution) { // Swap DAI for AMPLE
    console.log("Swapping 1 DAI for AMPLE")

    const route = new Route([DAI_WETH_PAIR, AMPLE_WETH_PAIR], DAI)
    const trade = new Trade(route, new TokenAmount(DAI, Web3.utils.toWei('1', 'ether')), TradeType.EXACT_INPUT)

    console.log('trade.executionPrice', trade.executionPrice.toSignificant(6))
    console.log('trade.nextMidPrice', trade.nextMidPrice.toSignificant(6))

    const slippageTolerance = new Percent('50', '10000') // 50 bips, or 0.50%
    const amountOutMin = trade.minimumAmountOut(slippageTolerance).toExact()
    const path = trade.route.path.map(path => path.address)
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20
    const value = trade.inputAmount.toExact()

    const swapDaiForAmpleResult = await swapDaiForAmple(Web3.utils.toWei(amountOutMin, 'gwei'), path, to, deadline, Web3.utils.toWei(value, 'ether'), rinkebyAccount)

    // const swapDaiForAmpleResult = await TraderContract.methods.swapDaiForAmple(value, amountOutMin, path, deadline).send({
    //   from: 'WALLET_ADDRESS'
    // })
    console.log(swapDaiForAmpleResult)

  } else if (rebaseTimestampDuringTradeExecution !== lastRebaseTimestamp) { // Swap AMPLE for DAI
    console.log("Swapping all AMPLE for DAI")

    const route = new Route([AMPLE_WETH_PAIR, DAI_WETH_PAIR], AMPLE)
    const ampleContract = new web3.eth.Contract(contracts.ampleToken.abi, ampleAddress.rinkeby, rinkebyAccount)
    const ampleBalance = await ampleContract.methods.balanceOf(WALLET_ADDRESS).call()
    const trade = new Trade(route, new TokenAmount(AMPLE, ampleBalance), TradeType.EXACT_INPUT)

    console.log('trade.executionPrice', trade.executionPrice.toSignificant(6))
    console.log('trade.nextMidPrice', trade.nextMidPrice.toSignificant(6))

    const slippageTolerance = new Percent('50', '10000') // 50 bips, or 0.50%
    const amountOutMin = trade.minimumAmountOut(slippageTolerance).toExact()
    const path = trade.route.path.map(path => path.address)
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20
    const value = trade.inputAmount.toExact()
    console.log('amountOutMin', amountOutMin)
    const swapAmpleForDaiResult = await swapAmpleForDai(Web3.utils.toWei(amountOutMin, 'ether'), path, to, deadline, Web3.utils.toWei(value, 'gwei'), rinkebyAccount)
    rebaseTimestampDuringTradeExecution = null; 
    // const swapAmpleForDaiResult = await TraderContract.methods.swapAmpleForDai(value, amountOutMin, path, deadline).send({
    //   from: 'WALLET_ADDRESS'
    // })
    console.log(swapAmpleForDaiResult)
  }

  rebaseTimestampDuringTradeExecution = lastRebaseTimestamp
  console.log('moment.unix(lastRebaseTimestamp)', moment.unix(lastRebaseTimestamp))

  running = false
}

let running = false
let rebaseTimestampDuringTradeExecution;
let lastRebaseTimestamp;
setInterval(letsTrade, 500)

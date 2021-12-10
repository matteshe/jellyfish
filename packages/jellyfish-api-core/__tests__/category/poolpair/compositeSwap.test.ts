import { LoanMasterNodeRegTestContainer } from '../loan/loan_container'
import { ContainerAdapterClient } from '../../container_adapter_client'
import { RpcApiError } from '../../../src'
import { poolpair } from '@defichain/jellyfish-api-core'
import { Testing } from '@defichain/jellyfish-testing'
import { GenesisKeys } from '@defichain/testcontainers'
import { UTXO } from 'packages/jellyfish-api-core/src/category/wallet'
import BigNumber from 'bignumber.js'

function now (): number {
  return Math.floor(new Date().getTime() / 1000)
}

describe('compositeSwap', () => {
  const container = new LoanMasterNodeRegTestContainer()
  const testing = Testing.create(container)
  const client = new ContainerAdapterClient(container)
  let loanVaultId: string
  let loanMinterAddr: string

  beforeAll(async () => {
    await testing.container.start()
    await testing.container.waitForWalletCoinbaseMaturity()
    await testing.token.dfi({ amount: 30000 })
    await testing.generate(1)

    // setup oracle
    const priceFeeds = [
      { token: 'DFI', currency: 'USD' },
      { token: 'BTC', currency: 'USD' },
      { token: 'TSLA', currency: 'USD' },
      { token: 'ABC', currency: 'USD' },
      { token: 'CAT', currency: 'USD' },
      { token: 'DOG', currency: 'USD' },
      { token: 'PATHA', currency: 'USD' },
      { token: 'PATHB', currency: 'USD' },
      { token: 'XYZ', currency: 'USD' },
      { token: 'ELF', currency: 'USD' },
      { token: 'ORC', currency: 'USD' },
      { token: 'UNDY', currency: 'USD' },
      { token: 'HUMAN', currency: 'USD' },
      { token: 'EMPTY', currency: 'USD' }
    ]

    const oraclePriceData = {
      prices: [
        { tokenAmount: '1@DFI', currency: 'USD' },
        { tokenAmount: '0.1@CAT', currency: 'USD' },
        { tokenAmount: '0.1@DOG', currency: 'USD' },
        { tokenAmount: '0.1@TSLA', currency: 'USD' },
        { tokenAmount: '0.1@ABC', currency: 'USD' },
        { tokenAmount: '0.1@PATHA', currency: 'USD' },
        { tokenAmount: '0.1@PATHB', currency: 'USD' },
        { tokenAmount: '0.1@XYZ', currency: 'USD' },
        { tokenAmount: '0.1@ELF', currency: 'USD' },
        { tokenAmount: '0.1@ORC', currency: 'USD' },
        { tokenAmount: '0.1@UNDY', currency: 'USD' },
        { tokenAmount: '0.1@HUMAN', currency: 'USD' },
        { tokenAmount: '0.1@EMPTY', currency: 'USD' }
      ]
    }

    const oracleAddr = await testing.generateAddress()
    const oracleId = await testing.rpc.oracle.appointOracle(oracleAddr, priceFeeds, { weightage: 1 })
    await testing.generate(1)

    await testing.rpc.oracle.setOracleData(oracleId, now(), oraclePriceData)

    // set up loan vaults for loan tokens
    loanMinterAddr = await testing.generateAddress()
    const utxos = await testing.rpc.wallet.listUnspent()
    const inputs = utxos.map((utxo: { txid: string, vout: number }) => {
      return {
        txid: utxo.txid,
        vout: utxo.vout
      }
    })

    await testing.rpc.account.utxosToAccount({ [loanMinterAddr]: '10000000@DFI' }, inputs)
    await testing.generate(1)

    // create loan and vault for minting of loan tokens
    const loanTokenSchemeId = 'minter'
    await testing.rpc.loan.createLoanScheme({
      minColRatio: 100,
      interestRate: new BigNumber(0.01),
      id: loanTokenSchemeId
    })

    await testing.generate(1)
    const loanTokenVaultAddr = await testing.generateAddress()
    loanVaultId = await testing.rpc.loan.createVault({
      ownerAddress: loanTokenVaultAddr,
      loanSchemeId: loanTokenSchemeId
    })

    await testing.generate(1)

    // setup collateral token and loan token
    await testing.rpc.loan.setCollateralToken({
      token: 'DFI',
      factor: new BigNumber(1),
      fixedIntervalPriceId: 'DFI/USD'
    })

    await testing.container.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'TSLA',
      fixedIntervalPriceId: 'TSLA/USD'
    })
    await testing.rpc.loan.setLoanToken({
      symbol: 'CAT',
      fixedIntervalPriceId: 'CAT/USD'
    })
    await testing.rpc.loan.setLoanToken({
      symbol: 'DOG',
      fixedIntervalPriceId: 'CAT/USD'
    })
    await testing.rpc.loan.setLoanToken({
      symbol: 'ABC',
      fixedIntervalPriceId: 'ABC/USD'
    })
    await testing.rpc.loan.setLoanToken({
      symbol: 'PATHA',
      fixedIntervalPriceId: 'PATHA/USD'
    })
    await testing.rpc.loan.setLoanToken({
      symbol: 'PATHB',
      fixedIntervalPriceId: 'PATHB/USD'
    })
    await testing.rpc.loan.setLoanToken({
      symbol: 'XYZ',
      fixedIntervalPriceId: 'XYZ/USD'
    })
    await testing.rpc.loan.setLoanToken({
      symbol: 'ELF',
      fixedIntervalPriceId: 'ELF/USD'
    })
    await testing.container.generate(1)

    await testing.rpc.loan.setLoanToken({
      symbol: 'ORC',
      fixedIntervalPriceId: 'ORC/USD'
    })
    await testing.container.generate(1)
    await testing.rpc.loan.setLoanToken({
      symbol: 'UNDY',
      fixedIntervalPriceId: 'UNDY/USD'
    })
    await testing.container.generate(1)
    await testing.rpc.loan.setLoanToken({
      symbol: 'HUMAN',
      fixedIntervalPriceId: 'HUMAN/USD'
    })
    await testing.container.generate(1)
    await testing.rpc.loan.setLoanToken({
      symbol: 'EMPTY',
      fixedIntervalPriceId: 'EMPTY/USD'
    })

    await testing.container.generate(1)

    // take loan for each loan tokens that we need
    await testing.rpc.loan.depositToVault({
      vaultId: loanVaultId,
      from: loanMinterAddr,
      amount: '10000000@DFI'
    })

    await testing.container.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId: loanVaultId,
      amounts: '30000@CAT',
      to: loanMinterAddr
    })

    await container.generate(1)
    await testing.poolpair.create({ tokenA: 'CAT', tokenB: 'DFI' })
    await container.generate(1)
    await testing.poolpair.add({
      a: { symbol: 'CAT', amount: 25000 },
      b: { symbol: 'DFI', amount: 10000 }
    })

    await container.generate(1)
    await testing.poolpair.create({ tokenA: 'DOG', tokenB: 'DFI' })
    await container.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId: loanVaultId,
      amounts: '30000@DOG',
      to: loanMinterAddr
    })
    await container.generate(1)
    await testing.poolpair.add({
      a: { symbol: 'DOG', amount: 28000 },
      b: { symbol: 'DFI', amount: 10000 }
    })
    await container.generate(1)

    await testing.poolpair.create({ tokenA: 'ABC', tokenB: 'PATHA' })
    await testing.poolpair.create({ tokenA: 'XYZ', tokenB: 'PATHA' })
    await testing.poolpair.create({ tokenA: 'ABC', tokenB: 'PATHB' })
    await testing.poolpair.create({ tokenA: 'XYZ', tokenB: 'PATHB' })
    await container.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId: loanVaultId,
      amounts: '10000@ABC',
      to: loanMinterAddr
    })

    await testing.rpc.loan.takeLoan({
      vaultId: loanVaultId,
      amounts: '10000@PATHA',
      to: loanMinterAddr
    })

    await testing.rpc.loan.takeLoan({
      vaultId: loanVaultId,
      amounts: '10000@PATHB',
      to: loanMinterAddr
    })

    await testing.rpc.loan.takeLoan({
      vaultId: loanVaultId,
      amounts: '10000@XYZ',
      to: loanMinterAddr
    })
    await container.generate(1)

    // PATH A: expensive
    await testing.poolpair.add({
      a: { symbol: 'ABC', amount: 3000 },
      b: { symbol: 'PATHA', amount: 1 }
    })
    await testing.poolpair.add({
      a: { symbol: 'XYZ', amount: 5 },
      b: { symbol: 'PATHA', amount: 1 }
    })

    // PATH B: 10x cheaper than PATH A
    await testing.poolpair.add({
      a: { symbol: 'ABC', amount: 3000 },
      b: { symbol: 'PATHB', amount: 1 }
    })
    await testing.poolpair.add({
      a: { symbol: 'XYZ', amount: 50 },
      b: { symbol: 'PATHB', amount: 1 }
    })
    await container.generate(1)

    // longer conversion path (3 swaps)
    await testing.poolpair.create({ tokenA: 'ELF', tokenB: 'ORC' })
    await testing.poolpair.create({ tokenA: 'ORC', tokenB: 'UNDY' })
    await testing.poolpair.create({ tokenA: 'UNDY', tokenB: 'HUMAN' })
    await container.generate(1)

    await testing.rpc.loan.takeLoan({
      vaultId: loanVaultId,
      amounts: '160000@ELF',
      to: loanMinterAddr
    })

    await testing.rpc.loan.takeLoan({
      vaultId: loanVaultId,
      amounts: '160000@ORC',
      to: loanMinterAddr
    })

    await testing.rpc.loan.takeLoan({
      vaultId: loanVaultId,
      amounts: '160000@UNDY',
      to: loanMinterAddr
    })

    await testing.rpc.loan.takeLoan({
      vaultId: loanVaultId,
      amounts: '160000@HUMAN',
      to: loanMinterAddr
    })
    await container.generate(1)

    // large pool volume to minimize slippage effect on swap
    await testing.poolpair.add({
      a: { symbol: 'ELF', amount: 55555 },
      b: { symbol: 'ORC', amount: 66666 }
    })
    await testing.poolpair.add({
      a: { symbol: 'ORC', amount: 66666 },
      b: { symbol: 'UNDY', amount: 77777 }
    })
    await testing.poolpair.add({
      a: { symbol: 'UNDY', amount: 77777 },
      b: { symbol: 'HUMAN', amount: 88888 }
    })
    await container.generate(1)
  })

  afterAll(async () => {
    await testing.container.stop()
  })

  it('should compositeSwap', async () => {
    const [toAddress, fromAddress] = await testing.generateAddress(2)
    await testing.token.send({ symbol: 'CAT', amount: 456, address: fromAddress })
    await testing.generate(1)

    { // before swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('456.00000000@CAT')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(0)
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'CAT',
      amountFrom: 123,
      to: toAddress,
      tokenTo: 'DOG'
    }

    const hex = await client.poolpair.compositeSwap(metadata)
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)
    await container.generate(1)

    { // after swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('333.00000000@CAT')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(1)
      expect(toBalances[0]).toStrictEqual('136.41765034@DOG') // (123 * 28000 / 25000 = ~137.7) ~136.4 as result include slope
    }
  })

  it('should compositeSwap with max price', async () => {
    const [toAddress, fromAddress] = await testing.generateAddress(2)
    await testing.token.send({ symbol: 'CAT', amount: 45.6, address: fromAddress })
    await testing.generate(1)

    { // before swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('45.60000000@CAT')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(0)
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'CAT',
      amountFrom: 12.3,
      to: toAddress,
      tokenTo: 'DOG',
      maxPrice: 1.2
    }

    const hex = await client.poolpair.compositeSwap(metadata)
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)
    await container.generate(1)

    { // after swap
      const fromBalances = await testing.rpc.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('33.30000000@CAT')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(1)
      const [amount, symbol] = toBalances[0].split('@')
      expect(symbol).toStrictEqual('DOG')
      // allow test to run standalone, with first case success swap, TokenTo/TokenFrom price reduced
      expect(Number(amount)).toBeGreaterThan(13)
      expect(Number(amount)).toBeLessThan(14)
    }
  })

  it('should compositeSwap with utxo specified', async () => {
    const [toAddress, fromAddress] = await testing.generateAddress(2)
    await testing.token.send({ symbol: 'CAT', amount: 45.6, address: fromAddress })
    await testing.generate(1)

    const utxo = await container.fundAddress(fromAddress, 10)

    { // before swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('45.60000000@CAT')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(0)

      const unspents = await container.call('listunspent')
      const unspent = unspents.find((u: UTXO) => u.txid === utxo.txid && u.vout === utxo.vout)
      expect(unspent).not.toStrictEqual(undefined)
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'CAT',
      amountFrom: 12.3,
      to: toAddress,
      tokenTo: 'DOG',
      maxPrice: 1.2
    }

    const hex = await client.poolpair.compositeSwap(metadata, [utxo])
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)
    await container.generate(1)

    { // after swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('33.30000000@CAT')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(1)
      const [amount, symbol] = toBalances[0].split('@')
      expect(symbol).toStrictEqual('DOG')
      // allow test to run standalone, with first case success swap, TokenTo/TokenFrom price reduced
      expect(Number(amount)).toBeGreaterThan(13)
      expect(Number(amount)).toBeLessThan(14)

      const unspents = await container.call('listunspent')
      const unspent = unspents.find((u: UTXO) => u.txid === utxo.txid && u.vout === utxo.vout)
      expect(unspent).toStrictEqual(undefined)
    }
  })

  it('should compositeSwap for longer than 2 poolswaps path', async () => {
    const [toAddress, fromAddress] = await testing.generateAddress(2)
    await testing.token.send({ symbol: 'ELF', amount: 123, address: fromAddress })
    await testing.generate(1)

    { // before swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('123.00000000@ELF')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(0)
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'ELF',
      amountFrom: 100,
      to: toAddress,
      tokenTo: 'HUMAN',
      maxPrice: 1
    }

    const hex = await client.poolpair.compositeSwap(metadata)
    expect(typeof hex).toStrictEqual('string')
    expect(hex.length).toStrictEqual(64)
    await container.generate(1)

    { // after swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('23.00000000@ELF')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(1)
      const [amount, symbol] = toBalances[0].split('@')
      expect(symbol).toStrictEqual('HUMAN')
      expect(Number(amount)).toBeGreaterThan(159)
      expect(Number(amount)).toBeLessThan(160)
    }
  })

  it('should not compositeSwap with not mine utxo', async () => {
    const [toAddress, fromAddress] = await testing.generateAddress(2)
    await testing.token.send({ symbol: 'CAT', amount: 45.6, address: fromAddress })
    await testing.generate(1)

    const randomAddress = await container.getNewAddress()
    const utxo = await container.fundAddress(randomAddress, 10)

    { // before swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('45.60000000@CAT')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(0)
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'CAT',
      amountFrom: 12.3,
      to: toAddress,
      tokenTo: 'DOG',
      maxPrice: 1.2
    }

    const promise = client.poolpair.compositeSwap(metadata, [utxo])
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('tx must have at least one input from account owner')
  })

  it('Should compositeSwap with lower rate path', async () => {
    const [toAddress, fromAddress] = await testing.generateAddress(2)
    await testing.token.send({ symbol: 'ABC', amount: 3001, address: fromAddress })
    await testing.generate(1)

    { // before swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('3001.00000000@ABC')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(0)
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'ABC',
      amountFrom: 3000,
      to: toAddress,
      tokenTo: 'XYZ'
    }
    await client.poolpair.compositeSwap(metadata)
    await container.generate(1)

    { // after swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('1.00000000@ABC')

      const toBalances = await client.account.getAccount(toAddress)
      expect(toBalances.length).toStrictEqual(1)
      expect(toBalances[0]).toStrictEqual('16.66666667@XYZ')

      // pool (ABC-PATHA)'s ABC unchanged
      const pathA = Object.values(await client.poolpair.getPoolPair('ABC-PATHA'))
      expect(pathA.length).toStrictEqual(1)
      expect(pathA[0].reserveA).toStrictEqual(new BigNumber(3000))

      // path B taken, pool (ABC-PATHB)'s ABC increased
      const pathB = Object.values(await client.poolpair.getPoolPair('ABC-PATHB'))
      expect(pathB.length).toStrictEqual(1)
      expect(pathB[0].reserveA).toStrictEqual(new BigNumber(6000))
    }
  })

  it('should not compositeSwap - invalid auth', async () => {
    const anotherMn = new LoanMasterNodeRegTestContainer(GenesisKeys[1])
    await anotherMn.start()
    const notMine = await anotherMn.getNewAddress()
    await testing.token.send({ symbol: 'CAT', amount: 45.6, address: notMine })
    await testing.generate(1)

    { // has balance
      const fromBalances = await client.account.getAccount(notMine)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('45.60000000@CAT')
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: notMine,
      tokenFrom: 'CAT',
      amountFrom: 1,
      to: await testing.generateAddress(),
      tokenTo: 'DOG'
    }

    const promise = client.poolpair.compositeSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Incorrect authorization')
  })

  it('should not compositeSwap - Cannot find usable pool pair', async () => {
    const fromAddress = await testing.generateAddress()

    await testing.token.create({ symbol: 'APPL' })
    await container.generate(1)
    await testing.poolpair.create({ tokenA: 'TSLA', tokenB: 'DFI' })
    await container.generate(1)
    await testing.rpc.loan.takeLoan({
      vaultId: loanVaultId,
      amounts: '100@TSLA',
      to: loanMinterAddr
    })
    await container.generate(1)

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'TSLA',
      amountFrom: 50,
      to: await testing.generateAddress(),
      tokenTo: 'APPL'
    }

    const promise = client.poolpair.compositeSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot find usable pool pair')
  })

  it('should not compositeSwap - status false poolpair equivalent to not exist', async () => {
    const fromAddress = await testing.generateAddress()
    await testing.token.create({ symbol: 'FALSE' })
    await container.generate(1)
    await testing.poolpair.create({ tokenA: 'FALSE', tokenB: 'DFI', status: false })
    await container.generate(1)

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'FALSE',
      amountFrom: 50,
      to: await testing.generateAddress(),
      tokenTo: 'DOG'
    }

    const promise = client.poolpair.compositeSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Cannot find usable pool pair')
  })

  it('should not compositeSwap - lack of liquidity', async () => {
    const fromAddress = await testing.generateAddress()

    await testing.poolpair.create({ tokenA: 'EMPTY', tokenB: 'DFI' })
    await container.generate(1)
    await testing.rpc.loan.takeLoan({
      vaultId: loanVaultId,
      amounts: '100@EMPTY',
      to: loanMinterAddr
    })
    await container.generate(1)

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'EMPTY',
      amountFrom: 50,
      to: await testing.generateAddress(),
      tokenTo: 'DOG'
    }

    const promise = client.poolpair.compositeSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Lack of liquidity')
  })

  it('should not compositeSwap - Price is higher than indicated', async () => {
    const fromAddress = await testing.generateAddress()
    await testing.token.send({ symbol: 'CAT', amount: 100, address: fromAddress })
    await testing.generate(1)

    { // before swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('100.00000000@CAT')
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'CAT',
      amountFrom: 50,
      to: await testing.generateAddress(),
      tokenTo: 'DOG',
      maxPrice: 0.8// current price ~25000/28000 = ~0.89
    }

    const promise = client.poolpair.compositeSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('Price is higher than indicated')
  })

  it('should not compositeSwap - TokenFrom was not found', async () => {
    const fromAddress = await testing.generateAddress()

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'INVALID',
      amountFrom: 50,
      to: await testing.generateAddress(),
      tokenTo: 'DOG',
      maxPrice: 0.8// current price ~25000/28000 = ~0.89
    }

    const promise = client.poolpair.compositeSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('TokenFrom was not found')
  })

  it('should not compositeSwap - TokenTo was not found', async () => {
    const fromAddress = await testing.generateAddress()
    await testing.token.send({ symbol: 'CAT', amount: 100, address: fromAddress })
    await testing.generate(1)

    { // before swap
      const fromBalances = await client.account.getAccount(fromAddress)
      expect(fromBalances.length).toStrictEqual(1)
      expect(fromBalances[0]).toStrictEqual('100.00000000@CAT')
    }

    const metadata: poolpair.PoolSwapMetadata = {
      from: fromAddress,
      tokenFrom: 'CAT',
      amountFrom: 50,
      to: await testing.generateAddress(),
      tokenTo: 'INVALID',
      maxPrice: 0.8// current price ~25000/28000 = ~0.89
    }

    const promise = client.poolpair.compositeSwap(metadata)
    await expect(promise).rejects.toThrow(RpcApiError)
    await expect(promise).rejects.toThrow('TokenTo was not found')
  })
})

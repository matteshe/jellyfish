import { MasterNodeKey, RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { StartOptions } from '../DeFiDContainer'
import { MasterNodeRegTestContainer } from './Masternode'

export class LoanMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor (masternodeKey: MasterNodeKey = RegTestFoundationKeys[0]) {
    super(masternodeKey, 'defi/defichain:HEAD-afc41ef')
  }

  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      '-fortcanningheight=8'
    ]
  }
}
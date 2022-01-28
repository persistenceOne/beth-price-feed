import BigNumber from 'bignumber.js'
import { assert } from 'chai'
import {
  AssetSafeValueLimitValidator,
  BAtomSafePriceValidator,
  MaxDeviationError,
  ValueTooHighError,
  ValueTooLowError,
} from '../src/BAtomSafePriceValidator'

const ASSET_NAMES = ['bAtomPrice', 'atomPrice']

const PRICE_INFO = {
  bAtomPrice: new BigNumber(30),
  atomPrice: 30,
  // stEthRate: '0.99',
  // bEthRate: '1.1',
}

const BLOCK_NUMBER = 123456789

const CONFIG_POOR = {
  deviationBlockOffsets: [200],
  bAtomPrice: { maxValue: 30 },
  // bEthRate: { minValue: 1.01 },
  // stEthRate: { maxDeviations: [10] },
  atomPrice: { maxValue: 40, minValue: 17, maxDeviations: [4] },
}

const CONFIG_FULL = {
  deviationBlockOffsets: [44800, 6400, 250],
  bAtomPrice: {
    maxValue: 31,
    minValue: '30',
    maxDeviations: [2, 1.5, 0.5],
  },
  // bEthRate: { maxDeviations: [10, 5, 2] },
  // stEthRate: { maxValue: 1.05, minValue: 0.95, maxDeviations: [20, 10, 0.003] },
  atomPrice: { maxValue: 40, minValue: 25, maxDeviations: [5, 2.5, 1.5] },
}

function validateValidatorsIsCorrect(bAtomSafePriceValidator, config = {}) {
  const { validators, deviationBlockOffsets } = bAtomSafePriceValidator
  assert(deviationBlockOffsets === config.deviationBlockOffsets || [])

  for (const assetName of ASSET_NAMES) {
    const expectedDeviations = config[assetName]?.maxDeviations || []
    assert.equal(
      validators[assetName].maxDeviations.length,
      expectedDeviations.length,
    )
    for (let i = 0; i < expectedDeviations.length; ++i) {
      assert.isTrue(
        validators[assetName].maxDeviations[i].eq(expectedDeviations[i]),
      )
    }

    assert.isTrue(
      validators[assetName].maxValue.eq(
        config[assetName]?.maxValue || Number.POSITIVE_INFINITY,
      ),
    )
    assert.isTrue(
      validators[assetName].minValue.eq(
        config[assetName]?.minValue || Number.NEGATIVE_INFINITY,
      ),
    )
  }
}

describe('BAtomInfoValidator', () => {
  it('constructor without params', () => {
    const bAtomSafePriceValidator = new BAtomSafePriceValidator()
    validateValidatorsIsCorrect(bAtomSafePriceValidator, {})
  })

  it('constructor with poor config', () => {
    const bAtomSafePriceValidator = new BAtomSafePriceValidator(CONFIG_POOR)
    validateValidatorsIsCorrect(bAtomSafePriceValidator, CONFIG_POOR)
  })

  it('constructor with reach config', () => {
    const bAtomSafePriceValidator = new BAtomSafePriceValidator(CONFIG_FULL)
    validateValidatorsIsCorrect(bAtomSafePriceValidator, CONFIG_FULL)
  })

  it('validate bAtomPrice invalid', () => {
    const config = { bAtomPrice: { maxValue: 25 } }
    const validator = new BAtomSafePriceValidator(config)
    assert.throws(() => validator.validate(BLOCK_NUMBER, PRICE_INFO))
  })

  it('validate atomPrice invalid', () => {
    const config = { atomPrice: { minValue: '31' } }
    const validator = new BAtomSafePriceValidator(config)
    assert.throws(() => validator.validate(BLOCK_NUMBER, PRICE_INFO))
  })

  /* it('validate stEthRate invalid', () => {
    const config = { stEthRate: { maxDeviations: [5] } }
    const validator = new BAtomSafePriceValidator(config)
    assert.throws(() =>
      validator.validate(BLOCK_NUMBER, PRICE_INFO, [
        { stEthRate: new BigNumber('1.3') },
      ]),
    )
  })

  it('validate bEthRate invalid', () => {
    const config = {
      deviationBlockOffsets: [10, 20, 30],
      bEthRate: { maxValue: 1.09, minValue: 0.9, maxDeviations: [5] },
    }
    const validator = new BAtomSafePriceValidator(config)
    assert.throws(() => validator.validate(BLOCK_NUMBER, PRICE_INFO))
  }) */

  it('validate all validations passed', () => {
    const validator = new BAtomSafePriceValidator(CONFIG_POOR)
    const referenceValues = [[123456789, { atomPrice: 30 }]]
    validator.validate(BLOCK_NUMBER, PRICE_INFO, referenceValues)
  })
})

describe('AssetSafeValueLimit', () => {
  it('constructor maxValue is NaN', () => {
    assert.throws(
      () => new AssetSafeValueLimitValidator('bAtomPrice', { maxValue: '' }),
    )
  })

  it('constructor minValue is NaN', () => {
    assert.throws(
      () => new AssetSafeValueLimitValidator('bAtomPrice', { maxValue: null }),
    )
  })

  it('constructor minValue > maxValue', () => {
    assert.throws(
      () =>
        new AssetSafeValueLimitValidator('bAtomPrice', {
          maxValue: 1.1,
          minValue: 1.2,
        }),
    )
  })

  it('constructor maxDeviations contains NaN values', () => {
    assert.throws(
      () =>
        new AssetSafeValueLimitValidator('bAtomPrice', {
          maxDeviations: [0, 'null'],
        }),
    )
  })

  it('constructor maxDeviations contains negative values', () => {
    assert.throws(
      () =>
        new AssetSafeValueLimitValidator('bAtomPrice', {
          maxDeviations: [-0.1],
        }),
      'maxDeviations contains negative values',
    )
  })

  it('constructor not full set of limits', () => {
    const configs = [{ minValue: 1 }, { maxValue: 2 }]
    const deviationsConfig = { maxDeviations: ['1'] }
    let validator = new AssetSafeValueLimitValidator('test', deviationsConfig)
    assert(
      validator.maxDeviations.length === deviationsConfig.maxDeviations.length,
    )
    assert(
      validator.maxDeviations[0].isEqualTo(deviationsConfig.maxDeviations[0]),
    )
    for (const config of configs) {
      const validator = new AssetSafeValueLimitValidator('test', config)
      for (const [key, value] of Object.entries(config)) {
        assert(validator[key].isEqualTo(value))
      }
    }
  })

  it('constructor without config', () => {
    const validator = new AssetSafeValueLimitValidator('test')
    assert(validator.maxDeviations.length === 0)
    assert(validator.maxValue.isEqualTo(Number.POSITIVE_INFINITY))
    assert(validator.minValue.isEqualTo(Number.NEGATIVE_INFINITY))
  })

  it('constructor with full set of limits', () => {
    const config = { maxDeviations: [0], maxValue: 1.05, minValue: '0.95' }
    const validator = new AssetSafeValueLimitValidator('test', config)
    assert(validator.maxValue.isEqualTo(config.maxValue))
    assert(validator.minValue.isEqualTo(config.minValue))
    assert(validator.maxDeviations.length === config.maxDeviations.length)
    assert(validator.maxDeviations[0].isEqualTo(config.maxDeviations[0]))
  })

  it('validate price too high', () => {
    const validator = new AssetSafeValueLimitValidator('test', { maxValue: 1 })

    try {
      validator.validate(BLOCK_NUMBER, 1.1)
    } catch (e) {
      const expectedError = new ValueTooHighError('test', 1, 1.1)
      assert.deepEqual(e.data, expectedError.data)
      assert.equal(e.code, expectedError.code)
      assert.equal(e.message, expectedError.message)
    }
  })

  it('validate price too low', () => {
    const validator = new AssetSafeValueLimitValidator('test', { minValue: 1 })
    try {
      validator.validate(BLOCK_NUMBER, '0.95')
    } catch (e) {
      const expectedError = new ValueTooLowError('test', 1, 0.95)
      assert.equal(e.code, expectedError.code)
      assert.equal(e.message, expectedError.message)
      assert.deepEqual(e.data, expectedError.data)
    }
  })

  it('validate maxDeviations exceeded', () => {
    const validator = new AssetSafeValueLimitValidator('test', {
      maxDeviations: [2],
    })
    try {
      validator.validate(BLOCK_NUMBER, '1', [
        [BLOCK_NUMBER - 1000, new BigNumber(1.021)],
      ])
    } catch (e) {
      const expectedError = new MaxDeviationError(
        'test',
        2.1,
        2,
        BLOCK_NUMBER,
        BLOCK_NUMBER - 1000,
        1.021,
        1,
      )
      assert.equal(e.code, expectedError.code)
      assert.equal(e.message, expectedError.message)
      assert.deepEqual(e.data, expectedError.data)
    }
  })

  it('validate value is NaN', () => {
    const validator = new AssetSafeValueLimitValidator('test', { maxValue: 2 })
    assert.throws(() => validator.validate(BLOCK_NUMBER, null), 'Value is NaN')
  })

  it('validate maxDeviations with zero value', () => {
    const validator = new AssetSafeValueLimitValidator('test', {
      maxDeviations: [2],
    })
    try {
      validator.validate(BLOCK_NUMBER, '0', [
        [BLOCK_NUMBER - 1000, new BigNumber(0.1)],
      ])
    } catch (e) {
      const expectedError = new MaxDeviationError(
        'test',
        Number.POSITIVE_INFINITY,
        2,
        BLOCK_NUMBER,
        BLOCK_NUMBER - 1000,
        0.1,
        0,
      )
      assert.equal(e.code, expectedError.code)
      assert.equal(e.message, expectedError.message)
      assert.deepEqual(e.data, expectedError.data)
    }
  })
})

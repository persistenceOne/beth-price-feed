import BigNumber from 'bignumber.js'

const ERROR_CODES = {
  VALUE_TOO_HIGH: -40001,
  VALUE_TOO_LOW: -40002,
  DEVIATION_TOO_HIGH: -40003,
}

const ASSET_NAMES = ['bEthPrice', 'bEthRate', 'stEthRate', 'ethPrice']

/**
 * Validates info about bETH price: ethPrice, stEthRate, bEthRate, bEthPrice
 * according to passed config in the constructor.
 */
export class BEthSafePriceValidator {
  /**
   * Creates new instance of BEthSafePriceValidator.
   * @param config - validation rules to be applied
   * @param config.deviationBlockOffsets - contains offsets of blocks
   *  where bEth price info in reference values were retrieved from
   * @param config.bEthPrice - contains validations for bEthPrice in bEth price info
   * @param config.bEthPrice.maxValue - upper bound for bEthPrice. Number.POSITIVE_INFINITY by default.
   * @param config.bEthPrice.minValue - lower bound for bEthPrice. Number.NEGATIVE_INFINITY by default.
   * @param config.bEthPrice.maxDeviations - array of max deviations for bEthPrice relatively to reference value at position with same index.
   * @param config.bEthRate - contains validations for bEthRate in bEth price info
   * @param config.bEthRate.maxValue - upper bound for bEthRate. Number.POSITIVE_INFINITY by default.
   * @param config.bEthRate.minValue - lower bound for bEthRate. Number.NEGATIVE_INFINITY by default.
   * @param config.bEthRate.maxDeviations - array of max deviations for bEthRate relatively to reference value at position with same index.
   * @param config.stEthRate - contains validations for stEthRate in bEth price info
   * @param config.stEthRate.maxValue - upper bound for stEthRate. Number.POSITIVE_INFINITY by default.
   * @param config.stEthRate.minValue - lower bound for stEthRate. Number.NEGATIVE_INFINITY by default.
   * @param config.stEthRate.maxDeviations - array of max deviations for stEthRate relatively to reference value at position with same index.
   * @param config.ethPrice - contains validations for ethPrice in bEth price info
   * @param config.ethPrice.maxValue - upper bound for ethPrice. Number.POSITIVE_INFINITY by default.
   * @param config.ethPrice.minValue - lower bound for ethPrice. Number.NEGATIVE_INFINITY by default.
   * @param config.ethPrice.maxDeviations - array of max deviations for ethPrice relatively to reference value at position with same index.
   */
  constructor(config = {}) {
    const { deviationBlockOffsets = [], ...limits } = config
    this.deviationBlockOffsets = deviationBlockOffsets
    this.validators = {}
    for (const assetName of ASSET_NAMES) {
      this.validators[assetName] = new AssetSafeValueLimitValidator(
        assetName,
        limits[assetName],
      )
    }
  }

  /**
   * Makes validation of bETH price info.
   * @param valueBlockNumber - number of block where value was retrieved from
   * @param value - bETH price info
   * @param referenceValues - array of bETH price info which used as reference
   * values to calculate deviations of current price
   */
  validate(valueBlockNumber, value, referenceValues) {
    for (const assetName of Object.keys(value)) {
      const assertReferenceValues = referenceValues.map(
        ([blockNumber, referenceValue]) => [
          blockNumber,
          referenceValue[assetName] === undefined
            ? value[assetName]
            : referenceValue[assetName],
        ],
      )
      assert(
        assertReferenceValues.every(rv => rv[1] !== undefined),
        new Error('Reference value for deviation offset was not provided'),
      )
      this.validators[assetName].validate(
        valueBlockNumber,
        value[assetName],
        assertReferenceValues,
      )
    }
  }
}

/**
 * Validates one part of bETH price info
 * according to passed config in the constructor.
 */
export class AssetSafeValueLimitValidator {
  /**
   * Creates new instance of AssetSafeValueLimitValidator
   * @param name - name of part of bETH price. Might be one of ethPrice, stEthRate, bEthRate, bEthPrice.
   * @param config - validation rules
   * @param config.maxValue - upper bound for value. Number.POSITIVE_INFINITY by default.
   * @param config.minValue - lower bound for value.  Number.NEGATIVE_INFINITY by default.
   * @param config.maxDeviations - array of max deviations for value relatively to reference value at position with same index.
   */
  constructor(name, config = {}) {
    const { maxValue, minValue, maxDeviations } = config
    this.name = name
    this.maxValue = new BigNumber(
      maxValue !== undefined ? maxValue : Number.POSITIVE_INFINITY,
    )
    this.minValue = new BigNumber(
      minValue !== undefined ? minValue : Number.NEGATIVE_INFINITY,
    )
    this.maxDeviations = (maxDeviations || []).map(
      deviation => new BigNumber(deviation),
    )
    assert(!this.maxValue.isNaN(), new Error('maxValue is NaN'))
    assert(!this.minValue.isNaN(), new Error('minValue is NaN'))
    assert(this.minValue.lte(this.maxValue), new Error('minValue > maxValue'))
    assert(
      this.maxDeviations.every(diffLimit => !diffLimit.isNaN()),
      new Error('maxDeviations contains NaN values'),
    )
    assert(
      this.maxDeviations.every(diffLimit => diffLimit.gte(0)),
      new Error('maxDeviations contains negative values'),
    )
  }

  /**
   * Makes validation of part of the bETH price info.
   * @param valueBlockNumber - number of block where value was retrieved from
   * @param value - value of bETH price info
   * @param referenceValues - array of tuples [blockNumber, value of reference value]
   * to calculate deviations of current value
   */
  validate(valueBlockNumber, value, referenceValues = []) {
    value = new BigNumber(value)
    assert(!value.isNaN(), new Error('Value is NaN'))
    this._validateUpperBound(value)
    this._validateLowerBound(value)
    this._validateDeviations(valueBlockNumber, value, referenceValues)
  }

  _validateUpperBound(value) {
    assert(
      this.maxValue.gte(value),
      new ValueTooHighError(
        this.name,
        this.maxValue.toString(),
        value.toString(),
      ),
    )
  }

  _validateLowerBound(value) {
    assert(
      this.minValue.lte(value),
      new ValueTooLowError(
        this.name,
        this.minValue.toString(),
        value.toString(),
      ),
    )
  }

  _validateDeviations(valueBlockNumber, value, referenceValues) {
    const referenceValueChecks = Math.min(
      referenceValues.length,
      this.maxDeviations.length,
    )

    for (let i = 0; i < referenceValueChecks; ++i) {
      const [referenceBlockNumber, referencePriceInfo] = referenceValues[i]
      const maxDeviation = this.maxDeviations[i]
      const deviation = value
        .minus(referencePriceInfo)
        .absoluteValue()
        .dividedBy(value)
        .multipliedBy(100)
      assert(
        deviation.lte(maxDeviation),
        new MaxDeviationError(
          this.name,
          deviation,
          maxDeviation,
          valueBlockNumber,
          referenceBlockNumber,
          referencePriceInfo,
          value,
        ),
      )
    }
  }
}

export class ValueTooHighError extends Error {
  constructor(name, maxValue, currentValue) {
    super(`Unsafe Price: value of "${name}" too high`)
    this.code = ERROR_CODES.VALUE_TOO_HIGH
    this.data = {
      maxValue: maxValue.toString(),
      currentValue: currentValue.toString(),
    }
  }
}

export class ValueTooLowError extends Error {
  constructor(name, minValue, currentValue) {
    super(`Unsafe Price: value of "${name}" too low`)
    this.code = ERROR_CODES.VALUE_TOO_LOW
    this.data = {
      minValue: minValue.toString(),
      currentValue: currentValue.toString(),
    }
  }
}

export class MaxDeviationError extends Error {
  constructor(
    name,
    currentDeviation,
    maxDeviation,
    valueBlock,
    referenceBlock,
    referenceValue,
    currentValue,
  ) {
    super(`Unsafe Price: Max deviation of "${name}" exceeded`)
    this.code = ERROR_CODES.DEVIATION_TOO_HIGH
    this.data = {
      maxDeviation: maxDeviation.toString(),
      currentDeviation: currentDeviation.toString(),
      currentValue: {
        block: valueBlock,
        value: currentValue.toString(),
      },
      referenceValue: {
        block: referenceBlock,
        value: referenceValue.toString(),
      },
    }
  }
}

function assert(isOk, error) {
  if (isOk) {
    return
  }
  throw error
}

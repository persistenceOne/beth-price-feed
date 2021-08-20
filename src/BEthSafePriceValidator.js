import BigNumber from 'bignumber.js'

const ERROR_CODES = {
  PRICE_UNSAFE: -40000,
}

const ASSET_NAMES = ['bEthPrice', 'bEthRate', 'stEthRate', 'ethPrice']

export class BEthSafePriceValidator {
  constructor({ deviationBlockOffsets = [], ...limits } = {}) {
    this.deviationBlockOffsets = deviationBlockOffsets
    this.validators = {}
    for (const assetName of ASSET_NAMES) {
      this.validators[assetName] = new AssetSafeValueLimitValidator(
        assetName,
        limits[assetName],
      )
    }
  }

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

export class AssetSafeValueLimitValidator {
  constructor(name, { maxValue, minValue, deviations } = {}) {
    this.name = name
    this.maxValue = new BigNumber(
      maxValue !== undefined ? maxValue : Number.POSITIVE_INFINITY,
    )
    this.minValue = new BigNumber(
      minValue !== undefined ? minValue : Number.NEGATIVE_INFINITY,
    )
    this.deviations = (deviations || []).map(
      deviation => new BigNumber(deviation),
    )
    assert(!this.maxValue.isNaN(), new Error('maxValue is NaN'))
    assert(!this.minValue.isNaN(), new Error('minValue is NaN'))
    assert(this.minValue.lte(this.maxValue), new Error('minValue > maxValue'))
    assert(
      this.deviations.every(diffLimit => !diffLimit.isNaN()),
      new Error('deviations contains NaN values'),
    )
    assert(
      this.deviations.every(diffLimit => diffLimit.gte(0)),
      new Error('deviations contains negative values'),
    )
  }

  validate(valueBlockNumber, value, referenceValues = []) {
    value = new BigNumber(value)
    assert(!value.isNaN(), new Error('Value is NaN'))
    this.validateUpperBound(value)
    this.validateLowerBound(value)
    this.validateDeviations(valueBlockNumber, value, referenceValues)
  }

  validateUpperBound(value) {
    assert(
      this.maxValue.gte(value),
      new ValueTooHighError(
        this.name,
        this.maxValue.toString(),
        value.toString(),
      ),
    )
  }

  validateLowerBound(value) {
    assert(
      this.minValue.lte(value),
      new ValueTooLowError(
        this.name,
        this.minValue.toString(),
        value.toString(),
      ),
    )
  }

  validateDeviations(valueBlockNumber, value, referenceValues) {
    const referenceValueChecks = Math.min(
      referenceValues.length,
      this.deviations.length,
    )

    for (let i = 0; i < referenceValueChecks; ++i) {
      const [referenceBlockNumber, referencePriceInfo] = referenceValues[i]
      const maxDeviation = this.deviations[i]
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
    this.code = ERROR_CODES.PRICE_UNSAFE
    this.data = {
      maxValue: maxValue.toString(),
      currentValue: currentValue.toString(),
    }
  }
}

export class ValueTooLowError extends Error {
  constructor(name, minValue, currentValue) {
    super(`Unsafe Price: value of "${name}" too low`)
    this.code = ERROR_CODES.PRICE_UNSAFE
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
    this.code = ERROR_CODES.PRICE_UNSAFE
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

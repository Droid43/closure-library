// Copyright 2009 The Closure Library Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Defines a Long class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "long". This
 * implementation is derived from LongLib in GWT.
 *
 */

goog.provide('goog.math.Long');

goog.require('goog.asserts');
goog.require('goog.reflect');



/**
 * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
 * values as *signed* integers.  See the from* functions below for more
 * convenient ways of constructing Longs.
 *
 * The internal representation of a long is the two given signed, 32-bit values.
 * We use 32-bit pieces because these are the size of integers on which
 * JavaScript performs bit-operations.  For operations like addition and
 * multiplication, we split each number into 16-bit pieces, which can easily be
 * multiplied within JavaScript's floating-point representation without overflow
 * or change in sign.
 *
 * In the algorithms below, we frequently reduce the negative case to the
 * positive case by negating the input(s) and then post-processing the result.
 * Note that we must ALWAYS check specially whether those values are MIN_VALUE
 * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
 * a positive number, it overflows back into a negative).  Not handling this
 * case would often result in infinite recursion.
 *
 * @param {number} low  The low (signed) 32 bits of the long.
 * @param {number} high  The high (signed) 32 bits of the long.
 * @struct
 * @constructor
 * @final
 */
goog.math.Long = function(low, high) {
  /**
   * @const {number}
   * @private
   */
  this.low_ = low | 0;  // force into 32 signed bits.

  /**
   * @const {number}
   * @private
   */
  this.high_ = high | 0;  // force into 32 signed bits.
};


// NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
// from* methods on which they depend.


/**
 * A cache of the Long representations of small integer values.
 * @type {!Object<number, !goog.math.Long>}
 * @private
 */
goog.math.Long.IntCache_ = {};


/**
 * A cache of the Long representations of common values.
 * @type {!Object<goog.math.Long.ValueCacheId_, !goog.math.Long>}
 * @private
 */
goog.math.Long.valueCache_ = {};

/**
 * Returns a cached long number representing the given (32-bit) integer value.
 * @param {number} value The 32-bit integer in question.
 * @return {!goog.math.Long} The corresponding Long value.
 * @private
 */
goog.math.Long.getCachedIntValue_ = function(value) {
  return goog.reflect.cache(goog.math.Long.IntCache_, value, function(val) {
    return new goog.math.Long(val, val < 0 ? -1 : 0);
  });
};

/**
 * The array of maximum values of a Long in string representation for a given
 * radix between 2 and 36, inclusive.
 * @private @const {!Array<string>}
 */
goog.math.Long.MAX_VALUE_FOR_RADIX_ = [
  '', '',  // unused
  '111111111111111111111111111111111111111111111111111111111111111',
  // base 2
  '2021110011022210012102010021220101220221',  // base 3
  '13333333333333333333333333333333',          // base 4
  '1104332401304422434310311212',              // base 5
  '1540241003031030222122211',                 // base 6
  '22341010611245052052300',                   // base 7
  '777777777777777777777',                     // base 8
  '67404283172107811827',                      // base 9
  '9223372036854775807',                       // base 10
  '1728002635214590697',                       // base 11
  '41a792678515120367',                        // base 12
  '10b269549075433c37',                        // base 13
  '4340724c6c71dc7a7',                         // base 14
  '160e2ad3246366807',                         // base 15
  '7fffffffffffffff',                          // base 16
  '33d3d8307b214008',                          // base 17
  '16agh595df825fa7',                          // base 18
  'ba643dci0ffeehh',                           // base 19
  '5cbfjia3fh26ja7',                           // base 20
  '2heiciiie82dh97',                           // base 21
  '1adaibb21dckfa7',                           // base 22
  'i6k448cf4192c2',                            // base 23
  'acd772jnc9l0l7',                            // base 24
  '64ie1focnn5g77',                            // base 25
  '3igoecjbmca687',                            // base 26
  '27c48l5b37oaop',                            // base 27
  '1bk39f3ah3dmq7',                            // base 28
  'q1se8f0m04isb',                             // base 29
  'hajppbc1fc207',                             // base 30
  'bm03i95hia437',                             // base 31
  '7vvvvvvvvvvvv',                             // base 32
  '5hg4ck9jd4u37',                             // base 33
  '3tdtk1v8j6tpp',                             // base 34
  '2pijmikexrxp7',                             // base 35
  '1y2p0ij32e8e7'                              // base 36
];


/**
 * The array of minimum values of a Long in string representation for a given
 * radix between 2 and 36, inclusive.
 * @private @const {!Array<string>}
 */
goog.math.Long.MIN_VALUE_FOR_RADIX_ = [
  '', '',  // unused
  '-1000000000000000000000000000000000000000000000000000000000000000',
  // base 2
  '-2021110011022210012102010021220101220222',  // base 3
  '-20000000000000000000000000000000',          // base 4
  '-1104332401304422434310311213',              // base 5
  '-1540241003031030222122212',                 // base 6
  '-22341010611245052052301',                   // base 7
  '-1000000000000000000000',                    // base 8
  '-67404283172107811828',                      // base 9
  '-9223372036854775808',                       // base 10
  '-1728002635214590698',                       // base 11
  '-41a792678515120368',                        // base 12
  '-10b269549075433c38',                        // base 13
  '-4340724c6c71dc7a8',                         // base 14
  '-160e2ad3246366808',                         // base 15
  '-8000000000000000',                          // base 16
  '-33d3d8307b214009',                          // base 17
  '-16agh595df825fa8',                          // base 18
  '-ba643dci0ffeehi',                           // base 19
  '-5cbfjia3fh26ja8',                           // base 20
  '-2heiciiie82dh98',                           // base 21
  '-1adaibb21dckfa8',                           // base 22
  '-i6k448cf4192c3',                            // base 23
  '-acd772jnc9l0l8',                            // base 24
  '-64ie1focnn5g78',                            // base 25
  '-3igoecjbmca688',                            // base 26
  '-27c48l5b37oaoq',                            // base 27
  '-1bk39f3ah3dmq8',                            // base 28
  '-q1se8f0m04isc',                             // base 29
  '-hajppbc1fc208',                             // base 30
  '-bm03i95hia438',                             // base 31
  '-8000000000000',                             // base 32
  '-5hg4ck9jd4u38',                             // base 33
  '-3tdtk1v8j6tpq',                             // base 34
  '-2pijmikexrxp8',                             // base 35
  '-1y2p0ij32e8e8'                              // base 36
];


/**
 * Returns a Long representing the given (32-bit) integer value.
 * @param {number} value The 32-bit integer in question.
 * @return {!goog.math.Long} The corresponding Long value.
 */
goog.math.Long.fromInt = function(value) {
  var intValue = value | 0;
  goog.asserts.assert(value === intValue, 'value should be a 32-bit integer');

  if (-128 <= intValue && intValue < 128) {
    return goog.math.Long.getCachedIntValue_(intValue);
  } else {
    return new goog.math.Long(intValue, intValue < 0 ? -1 : 0);
  }
};


/**
 * Returns a Long representing the given value.
 * NaN will be returned as zero. Infinity is converted to max value and
 * -Infinity to min value.
 * @param {number} value The number in question.
 * @return {!goog.math.Long} The corresponding Long value.
 */
goog.math.Long.fromNumber = function(value) {
  if (isNaN(value)) {
    return goog.math.Long.getZero();
  }
  if (value < 0) {
    if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
      return goog.math.Long.getMinValue();
    }
    return goog.math.Long.fromNumber(-value).negate();
  }
  // Max possible non-overflown value: 0x7ffffffffffffc00
  if (value >= goog.math.Long.TWO_PWR_63_DBL_) {
    return goog.math.Long.getMaxValue();
  }
  // Only lower 32 bits will be kept by constructor.
  return new goog.math.Long(value, value / goog.math.Long.TWO_PWR_32_DBL_);
};


/**
 * Returns a Long representing the 64-bit integer that comes by concatenating
 * the given high and low bits.  Each is assumed to use 32 bits.
 * @param {number} lowBits The low 32-bits.
 * @param {number} highBits The high 32-bits.
 * @return {!goog.math.Long} The corresponding Long value.
 */
goog.math.Long.fromBits = function(lowBits, highBits) {
  return new goog.math.Long(lowBits, highBits);
};


/**
 * TODO(goktug): Replace with Number.MAX_SAFE_INTEGER when polyfil is guaranteed
 * to be removed.
 * @type {number}
 * @private
 */
goog.math.Long.MAX_SAFE_INTEGER_ = 0x1fffffffffffff;


/**
 * Returns a Long representation of the given string, written using the given
 * radix.
 * @param {string} str The textual representation of the Long.
 * @param {number=} opt_radix The radix in which the text is written.
 * @return {!goog.math.Long} The corresponding Long value.
 */
goog.math.Long.fromString = function(str, opt_radix) {
  if (str.charAt(0) == '-') {
    return goog.math.Long.fromString(str.substring(1), opt_radix).negate();
  }

  // We can avoid very expensive multiply based code path for some common cases.
  var numberValue = parseInt(str, opt_radix || 10);
  if (numberValue <= goog.math.Long.MAX_SAFE_INTEGER_) {
    return new goog.math.Long(
        (numberValue % goog.math.Long.TWO_PWR_32_DBL_) | 0,
        (numberValue / goog.math.Long.TWO_PWR_32_DBL_) | 0);
  }

  if (str.length == 0) {
    throw new Error('number format error: empty string');
  }
  if (str.indexOf('-') >= 0) {
    throw new Error('number format error: interior "-" character: ' + str);
  }

  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw new Error('radix out of range: ' + radix);
  }

  // Do several (8) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated multiply.
  var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));

  var result = goog.math.Long.getZero();
  for (var i = 0; i < str.length; i += 8) {
    var size = Math.min(8, str.length - i);
    var value = parseInt(str.substring(i, i + size), radix);
    if (size < 8) {
      var power = goog.math.Long.fromNumber(Math.pow(radix, size));
      result = result.multiply(power).add(goog.math.Long.fromNumber(value));
    } else {
      result = result.multiply(radixToPower);
      result = result.add(goog.math.Long.fromNumber(value));
    }
  }
  return result;
};

/**
 * Returns the boolean value of whether the input string is within a Long's
 * range. Assumes an input string containing only numeric characters with an
 * optional preceding '-'.
 * @param {string} str The textual representation of the Long.
 * @param {number=} opt_radix The radix in which the text is written.
 * @return {boolean} Whether the string is within the range of a Long.
 */
goog.math.Long.isStringInRange = function(str, opt_radix) {
  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw new Error('radix out of range: ' + radix);
  }

  var extremeValue = (str.charAt(0) == '-') ?
      goog.math.Long.MIN_VALUE_FOR_RADIX_[radix] :
      goog.math.Long.MAX_VALUE_FOR_RADIX_[radix];

  if (str.length < extremeValue.length) {
    return true;
  } else if (str.length == extremeValue.length && str <= extremeValue) {
    return true;
  } else {
    return false;
  }
};

// NOTE: the compiler should inline these constant values below and then remove
// these variables, so there should be no runtime penalty for these.


/**
 * Number used repeated below in calculations.  This must appear before the
 * first call to any from* function above.
 * @const {number}
 * @private
 */
goog.math.Long.TWO_PWR_32_DBL_ = 0x100000000;


/**
 * @const {number}
 * @private
 */
goog.math.Long.TWO_PWR_63_DBL_ = 0x8000000000000000;

/**
 * @return {!goog.math.Long}
 * @public
 */
goog.math.Long.getZero = function() {
  return goog.math.Long.getCachedIntValue_(0);
};


/**
 * @return {!goog.math.Long}
 * @public
 */
goog.math.Long.getOne = function() {
  return goog.math.Long.getCachedIntValue_(1);
};


/**
 * @return {!goog.math.Long}
 * @public
 */
goog.math.Long.getNegOne = function() {
  return goog.math.Long.getCachedIntValue_(-1);
};


/**
 * @return {!goog.math.Long}
 * @public
 */
goog.math.Long.getMaxValue = function() {
  return goog.reflect.cache(
      goog.math.Long.valueCache_, goog.math.Long.ValueCacheId_.MAX_VALUE,
      function() {
        return goog.math.Long.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);
      });
};


/**
 * @return {!goog.math.Long}
 * @public
 */
goog.math.Long.getMinValue = function() {
  return goog.reflect.cache(
      goog.math.Long.valueCache_, goog.math.Long.ValueCacheId_.MIN_VALUE,
      function() {
        return goog.math.Long.fromBits(0, 0x80000000 | 0);
      });
};


/**
 * @return {!goog.math.Long}
 * @public
 */
goog.math.Long.getTwoPwr24 = function() {
  return goog.reflect.cache(
      goog.math.Long.valueCache_, goog.math.Long.ValueCacheId_.TWO_PWR_24,
      function() {
        return goog.math.Long.fromInt(1 << 24);
      });
};


/** @return {number} The value, assuming it is a 32-bit integer. */
goog.math.Long.prototype.toInt = function() {
  return this.low_;
};


/** @return {number} The closest floating-point representation to this value. */
goog.math.Long.prototype.toNumber = function() {
  return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ +
      this.getLowBitsUnsigned();
};


/**
 * @return {boolean} if can be exactly represented using number (i.e. abs(value)
 *     < 2^53).
 */
goog.math.Long.prototype.isSafeInteger = function() {
  var top11Bits = this.high_ >> 21;
  // If top11Bits are all 0s, then the number is between [0, 2^53-1]
  return top11Bits == 0
      // If top11Bits are all 1s, then the number is between [-1, -2^53]
      || (top11Bits == -1
          // and exclude -2^53
          && !(this.low_ == 0 && this.high_ == (0xffe00000 | 0)));
};

/**
 * @param {number=} opt_radix The radix in which the text should be written.
 * @return {string} The textual representation of this value.
 * @override
 */
goog.math.Long.prototype.toString = function(opt_radix) {
  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw new Error('radix out of range: ' + radix);
  }

  if (this.isZero()) {
    return '0';
  }

  // We can avoid very expensive division based code path for some common cases.
  if (this.isSafeInteger()) {
    var asNumber = this.toNumber();
    // Shortcutting for radix 10 (common case) to avoid boxing via toString:
    // https://jsperf.com/tostring-vs-vs-if
    return radix == 10 ? ('' + asNumber) : asNumber.toString(radix);
  }

  if (this.isNegative()) {
    if (this.equals(goog.math.Long.getMinValue())) {
      // We need to change the Long value before it can be negated, so we remove
      // the bottom-most digit in this base and then recurse to do the rest.
      var radixLong = goog.math.Long.fromNumber(radix);
      var div = this.div(radixLong);
      var rem = div.multiply(radixLong).subtract(this);
      return div.toString(radix) + rem.toInt().toString(radix);
    } else {
      return '-' + this.negate().toString(radix);
    }
  }

  // Do several (6) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated div.
  var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));

  var rem = this;
  var result = '';
  while (true) {
    var remDiv = rem.div(radixToPower);
    // The right shifting fixes negative values in the case when
    // intval >= 2^31; for more details see
    // https://github.com/google/closure-library/pull/498
    var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt() >>> 0;
    var digits = intval.toString(radix);

    rem = remDiv;
    if (rem.isZero()) {
      return digits + result;
    } else {
      while (digits.length < 6) {
        digits = '0' + digits;
      }
      result = '' + digits + result;
    }
  }
};


/** @return {number} The high 32-bits as a signed value. */
goog.math.Long.prototype.getHighBits = function() {
  return this.high_;
};


/** @return {number} The low 32-bits as a signed value. */
goog.math.Long.prototype.getLowBits = function() {
  return this.low_;
};


/** @return {number} The low 32-bits as an unsigned value. */
goog.math.Long.prototype.getLowBitsUnsigned = function() {
  return (this.low_ >= 0) ? this.low_ :
                            goog.math.Long.TWO_PWR_32_DBL_ + this.low_;
};


/**
 * @return {number} Returns the number of bits needed to represent the absolute
 *     value of this Long.
 */
goog.math.Long.prototype.getNumBitsAbs = function() {
  if (this.isNegative()) {
    if (this.equals(goog.math.Long.getMinValue())) {
      return 64;
    } else {
      return this.negate().getNumBitsAbs();
    }
  } else {
    var val = this.high_ != 0 ? this.high_ : this.low_;
    for (var bit = 31; bit > 0; bit--) {
      if ((val & (1 << bit)) != 0) {
        break;
      }
    }
    return this.high_ != 0 ? bit + 33 : bit + 1;
  }
};


/** @return {boolean} Whether this value is zero. */
goog.math.Long.prototype.isZero = function() {
  // Check low part first as there is high chance it's not 0.
  return this.low_ == 0 && this.high_ == 0;
};


/** @return {boolean} Whether this value is negative. */
goog.math.Long.prototype.isNegative = function() {
  return this.high_ < 0;
};


/** @return {boolean} Whether this value is odd. */
goog.math.Long.prototype.isOdd = function() {
  return (this.low_ & 1) == 1;
};


/**
 * @param {goog.math.Long} other Long to compare against.
 * @return {boolean} Whether this Long equals the other.
 */
goog.math.Long.prototype.equals = function(other) {
  // Compare low parts first as there is higher chance they are different.
  return (this.low_ == other.low_) && (this.high_ == other.high_);
};


/**
 * @param {goog.math.Long} other Long to compare against.
 * @return {boolean} Whether this Long does not equal the other.
 */
goog.math.Long.prototype.notEquals = function(other) {
  return !this.equals(other);
};


/**
 * @param {goog.math.Long} other Long to compare against.
 * @return {boolean} Whether this Long is less than the other.
 */
goog.math.Long.prototype.lessThan = function(other) {
  return this.compare(other) < 0;
};


/**
 * @param {goog.math.Long} other Long to compare against.
 * @return {boolean} Whether this Long is less than or equal to the other.
 */
goog.math.Long.prototype.lessThanOrEqual = function(other) {
  return this.compare(other) <= 0;
};


/**
 * @param {goog.math.Long} other Long to compare against.
 * @return {boolean} Whether this Long is greater than the other.
 */
goog.math.Long.prototype.greaterThan = function(other) {
  return this.compare(other) > 0;
};


/**
 * @param {goog.math.Long} other Long to compare against.
 * @return {boolean} Whether this Long is greater than or equal to the other.
 */
goog.math.Long.prototype.greaterThanOrEqual = function(other) {
  return this.compare(other) >= 0;
};


/**
 * Compares this Long with the given one.
 * @param {goog.math.Long} other Long to compare against.
 * @return {number} 0 if they are the same, 1 if the this is greater, and -1
 *     if the given one is greater.
 */
goog.math.Long.prototype.compare = function(other) {
  if (this.high_ == other.high_) {
    if (this.low_ == other.low_) {
      return 0;
    }
    // Invert a sign bit to compare as unsigned.
    return (this.low_ ^ (0x80000000 | 0)) > (other.low_ ^ (0x80000000 | 0)) ?
        1 :
        -1;
  }
  return this.high_ > other.high_ ? 1 : -1;
};


/** @return {!goog.math.Long} The negation of this value. */
goog.math.Long.prototype.negate = function() {
  var negLow = (~this.low_ + 1) | 0;
  var overflowFromLow = !negLow;
  var negHigh = (~this.high_ + overflowFromLow) | 0;
  return goog.math.Long.fromBits(negLow, negHigh);
};


/**
 * Returns the sum of this and the given Long.
 * @param {goog.math.Long} other Long to add to this one.
 * @return {!goog.math.Long} The sum of this and the given Long.
 */
goog.math.Long.prototype.add = function(other) {
  // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xFFFF;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xFFFF;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xFFFF;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xFFFF;

  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 + b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 + b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 + b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 + b48;
  c48 &= 0xFFFF;
  return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};


/**
 * Returns the difference of this and the given Long.
 * @param {goog.math.Long} other Long to subtract from this.
 * @return {!goog.math.Long} The difference of this and the given Long.
 */
goog.math.Long.prototype.subtract = function(other) {
  return this.add(other.negate());
};


/**
 * Returns the product of this and the given long.
 * @param {goog.math.Long} other Long to multiply with this.
 * @return {!goog.math.Long} The product of this and the other.
 */
goog.math.Long.prototype.multiply = function(other) {
  if (this.isZero()) {
    return goog.math.Long.getZero();
  } else if (other.isZero()) {
    return goog.math.Long.getZero();
  }

  if (this.equals(goog.math.Long.getMinValue())) {
    return other.isOdd() ? goog.math.Long.getMinValue() :
                           goog.math.Long.getZero();
  } else if (other.equals(goog.math.Long.getMinValue())) {
    return this.isOdd() ? goog.math.Long.getMinValue() :
                          goog.math.Long.getZero();
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().multiply(other.negate());
    } else {
      return this.negate().multiply(other).negate();
    }
  } else if (other.isNegative()) {
    return this.multiply(other.negate()).negate();
  }

  // If both longs are small, use float multiplication
  if (this.lessThan(goog.math.Long.getTwoPwr24()) &&
      other.lessThan(goog.math.Long.getTwoPwr24())) {
    return goog.math.Long.fromNumber(this.toNumber() * other.toNumber());
  }

  // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
  // We can skip products that would overflow.

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xFFFF;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xFFFF;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xFFFF;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xFFFF;

  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 * b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 * b00;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c16 += a00 * b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 * b00;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a16 * b16;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a00 * b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
  c48 &= 0xFFFF;
  return goog.math.Long.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};


/**
 * Returns this Long divided by the given one.
 * @param {goog.math.Long} other Long by which to divide.
 * @return {!goog.math.Long} This Long divided by the given one.
 */
goog.math.Long.prototype.div = function(other) {
  if (other.isZero()) {
    throw new Error('division by zero');
  }
  if (this.isNegative()) {
    if (this.equals(goog.math.Long.getMinValue())) {
      if (other.equals(goog.math.Long.getOne()) ||
          other.equals(goog.math.Long.getNegOne())) {
        return goog.math.Long.getMinValue();  // recall -MIN_VALUE == MIN_VALUE
      }
      if (other.equals(goog.math.Long.getMinValue())) {
        return goog.math.Long.getOne();
      }
      // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
      var halfThis = this.shiftRight(1);
      var approx = halfThis.div(other).shiftLeft(1);
      if (approx.equals(goog.math.Long.getZero())) {
        return other.isNegative() ? goog.math.Long.getOne() :
                                    goog.math.Long.getNegOne();
      }
      var rem = this.subtract(other.multiply(approx));
      var result = approx.add(rem.div(other));
      return result;
    }
    if (other.isNegative()) {
      return this.negate().div(other.negate());
    }
    return this.negate().div(other).negate();
  }
  if (this.isZero()) {
    return goog.math.Long.getZero();
  }
  if (other.isNegative()) {
    if (other.equals(goog.math.Long.getMinValue())) {
      return goog.math.Long.getZero();
    }
    return this.div(other.negate()).negate();
  }

  // Repeat the following until the remainder is less than other:  find a
  // floating-point that approximates remainder / other *from below*, add this
  // into the result, and subtract it from the remainder.  It is critical that
  // the approximate value is less than or equal to the real value so that the
  // remainder never becomes negative.
  var res = goog.math.Long.getZero();
  var rem = this;
  while (rem.greaterThanOrEqual(other)) {
    // Approximate the result of division. This may be a little greater or
    // smaller than the actual value.
    var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

    // We will tweak the approximate result by changing it in the 48-th digit or
    // the smallest non-fractional digit, whichever is larger.
    var log2 = Math.ceil(Math.log(approx) / Math.LN2);
    var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

    // Decrease the approximation until it is smaller than the remainder.  Note
    // that if it is too large, the product overflows and is negative.
    var approxRes = goog.math.Long.fromNumber(approx);
    var approxRem = approxRes.multiply(other);
    while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
      approx -= delta;
      approxRes = goog.math.Long.fromNumber(approx);
      approxRem = approxRes.multiply(other);
    }

    // We know the answer can't be zero... and actually, zero would cause
    // infinite recursion since we would make no progress.
    if (approxRes.isZero()) {
      approxRes = goog.math.Long.getOne();
    }

    res = res.add(approxRes);
    rem = rem.subtract(approxRem);
  }
  return res;
};


/**
 * Returns this Long modulo the given one.
 * @param {goog.math.Long} other Long by which to mod.
 * @return {!goog.math.Long} This Long modulo the given one.
 */
goog.math.Long.prototype.modulo = function(other) {
  return this.subtract(this.div(other).multiply(other));
};


/** @return {!goog.math.Long} The bitwise-NOT of this value. */
goog.math.Long.prototype.not = function() {
  return goog.math.Long.fromBits(~this.low_, ~this.high_);
};


/**
 * Returns the bitwise-AND of this Long and the given one.
 * @param {goog.math.Long} other The Long with which to AND.
 * @return {!goog.math.Long} The bitwise-AND of this and the other.
 */
goog.math.Long.prototype.and = function(other) {
  return goog.math.Long.fromBits(
      this.low_ & other.low_, this.high_ & other.high_);
};


/**
 * Returns the bitwise-OR of this Long and the given one.
 * @param {goog.math.Long} other The Long with which to OR.
 * @return {!goog.math.Long} The bitwise-OR of this and the other.
 */
goog.math.Long.prototype.or = function(other) {
  return goog.math.Long.fromBits(
      this.low_ | other.low_, this.high_ | other.high_);
};


/**
 * Returns the bitwise-XOR of this Long and the given one.
 * @param {goog.math.Long} other The Long with which to XOR.
 * @return {!goog.math.Long} The bitwise-XOR of this and the other.
 */
goog.math.Long.prototype.xor = function(other) {
  return goog.math.Long.fromBits(
      this.low_ ^ other.low_, this.high_ ^ other.high_);
};


/**
 * Returns this Long with bits shifted to the left by the given amount.
 * @param {number} numBits The number of bits by which to shift.
 * @return {!goog.math.Long} This shifted to the left by the given amount.
 */
goog.math.Long.prototype.shiftLeft = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var low = this.low_;
    if (numBits < 32) {
      var high = this.high_;
      return goog.math.Long.fromBits(
          low << numBits, (high << numBits) | (low >>> (32 - numBits)));
    } else {
      return goog.math.Long.fromBits(0, low << (numBits - 32));
    }
  }
};


/**
 * Returns this Long with bits shifted to the right by the given amount.
 * The new leading bits match the current sign bit.
 * @param {number} numBits The number of bits by which to shift.
 * @return {!goog.math.Long} This shifted to the right by the given amount.
 */
goog.math.Long.prototype.shiftRight = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return goog.math.Long.fromBits(
          (low >>> numBits) | (high << (32 - numBits)), high >> numBits);
    } else {
      return goog.math.Long.fromBits(
          high >> (numBits - 32), high >= 0 ? 0 : -1);
    }
  }
};


/**
 * Returns this Long with bits shifted to the right by the given amount, with
 * zeros placed into the new leading bits.
 * @param {number} numBits The number of bits by which to shift.
 * @return {!goog.math.Long} This shifted to the right by the given amount, with
 *     zeros placed into the new leading bits.
 */
goog.math.Long.prototype.shiftRightUnsigned = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return goog.math.Long.fromBits(
          (low >>> numBits) | (high << (32 - numBits)), high >>> numBits);
    } else if (numBits == 32) {
      return goog.math.Long.fromBits(high, 0);
    } else {
      return goog.math.Long.fromBits(high >>> (numBits - 32), 0);
    }
  }
};


/**
 * @enum {number} Ids of commonly requested Long instances.
 * @private
 */
goog.math.Long.ValueCacheId_ = {
  MAX_VALUE: 1,
  MIN_VALUE: 2,
  TWO_PWR_24: 6
};

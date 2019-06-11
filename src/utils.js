import { Writable } from 'stream';
import { StringDecoder } from 'string_decoder';

/**
 * Collect data from a stream into a single string, accessible as a Promise via data instance field.
 *
 * Adapted from https://nodejs.org/api/stream.html#stream_decoding_buffers_in_a_writable_stream.
 */
class CollectWritable extends Writable {
  /**
   * @param {Object=} options Stream options - particularly `defaultEncoding`.
   */
  constructor(options) {
    super(options);
    this._decoder = new StringDecoder(options && options.defaultEncoding);
    this._data = [];
    this._finalData = null;

    this.data = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this.once('error', reject);
    });
  }

  _write(chunk, encoding, cb) {
    this._data.push(encoding === 'buffer' ? this._decoder.write(chunk) : chunk);
    cb();
  }

  _final(cb) {
    this._data.push(this._decoder.end());
    this._resolve((this._finalData = this._data.join('')));
    cb();
  }
}

/**
 * Collect the data in the given readable stream into a single string.
 *
 * @param {Readable} stream The readable stream from which to collect the string.
 * @param {Object=} options The optional stream options - particularly `defaultEncoding`.
 */
export async function collect(stream, options) {
  return stream.pipe(new CollectWritable(options)).data;
}

/**
 * Coalesce the given value to a string.
 *
 * @param {string|Buffer|Readable} value The value to decode.
 * @param {string=} encoding The encoding of the buffer or buffer-containing stream.
 */
export async function toString(value, { encoding = 'utf8' } = {}) {
  if (typeof value === 'string') {
    return value;
  }

  if (!value || typeof value !== 'object') {
    throw new TypeError('no defined stringify rules for non-string, non-object values');
  }

  if (Buffer.isBuffer(value)) {
    return value.toString(encoding);
  }

  // Duck typing for readable streams.
  if (typeof value.pipe === 'function') {
    return collect(value, { defaultEncoding: encoding });
  }

  throw new TypeError('no string conversion for unknown object type');
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidBucketName = exports.isPlainObject = exports.recursiveToCamel = exports.resolveResponse = exports.resolveFetch = void 0;
const resolveFetch = (customFetch) => {
    if (customFetch) {
        return (...args) => customFetch(...args);
    }
    return (...args) => fetch(...args);
};
exports.resolveFetch = resolveFetch;
const resolveResponse = () => {
    return Response;
};
exports.resolveResponse = resolveResponse;
const recursiveToCamel = (item) => {
    if (Array.isArray(item)) {
        return item.map((el) => (0, exports.recursiveToCamel)(el));
    }
    else if (typeof item === 'function' || item !== Object(item)) {
        return item;
    }
    const result = {};
    Object.entries(item).forEach(([key, value]) => {
        const newKey = key.replace(/([-_][a-z])/gi, (c) => c.toUpperCase().replace(/[-_]/g, ''));
        result[newKey] = (0, exports.recursiveToCamel)(value);
    });
    return result;
};
exports.recursiveToCamel = recursiveToCamel;
/**
 * Determine if input is a plain object
 * An object is plain if it's created by either {}, new Object(), or Object.create(null)
 * source: https://github.com/sindresorhus/is-plain-obj
 */
const isPlainObject = (value) => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return ((prototype === null ||
        prototype === Object.prototype ||
        Object.getPrototypeOf(prototype) === null) &&
        !(Symbol.toStringTag in value) &&
        !(Symbol.iterator in value));
};
exports.isPlainObject = isPlainObject;
/**
 * Validates if a given bucket name is valid according to Supabase Storage API rules
 * Mirrors backend validation from: storage/src/storage/limits.ts:isValidBucketName()
 *
 * Rules:
 * - Length: 1-100 characters
 * - Allowed characters: alphanumeric (a-z, A-Z, 0-9), underscore (_), and safe special characters
 * - Safe special characters: ! - . * ' ( ) space & $ @ = ; : + , ?
 * - Forbidden: path separators (/, \), path traversal (..), leading/trailing whitespace
 *
 * AWS S3 Reference: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
 *
 * @param bucketName - The bucket name to validate
 * @returns true if valid, false otherwise
 */
const isValidBucketName = (bucketName) => {
    if (!bucketName || typeof bucketName !== 'string') {
        return false;
    }
    // Check length constraints (1-100 characters)
    if (bucketName.length === 0 || bucketName.length > 100) {
        return false;
    }
    // Check for leading/trailing whitespace
    if (bucketName.trim() !== bucketName) {
        return false;
    }
    // Explicitly reject path separators (security)
    // Note: Consecutive periods (..) are allowed by backend - the AWS restriction
    // on relative paths applies to object keys, not bucket names
    if (bucketName.includes('/') || bucketName.includes('\\')) {
        return false;
    }
    // Validate against allowed character set
    // Pattern matches backend regex: /^(\w|!|-|\.|\*|'|\(|\)| |&|\$|@|=|;|:|\+|,|\?)*$/
    // This explicitly excludes path separators (/, \) and other problematic characters
    const bucketNameRegex = /^[\w!.\*'() &$@=;:+,?-]+$/;
    return bucketNameRegex.test(bucketName);
};
exports.isValidBucketName = isValidBucketName;
//# sourceMappingURL=helpers.js.map
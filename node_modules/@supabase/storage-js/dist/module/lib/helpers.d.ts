type Fetch = typeof fetch;
export declare const resolveFetch: (customFetch?: Fetch) => Fetch;
export declare const resolveResponse: () => typeof Response;
export declare const recursiveToCamel: (item: Record<string, any>) => unknown;
/**
 * Determine if input is a plain object
 * An object is plain if it's created by either {}, new Object(), or Object.create(null)
 * source: https://github.com/sindresorhus/is-plain-obj
 */
export declare const isPlainObject: (value: object) => boolean;
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
export declare const isValidBucketName: (bucketName: string) => boolean;
export {};
//# sourceMappingURL=helpers.d.ts.map
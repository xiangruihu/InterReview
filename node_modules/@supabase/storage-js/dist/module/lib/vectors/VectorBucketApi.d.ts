import { Fetch } from './fetch';
import { ApiResponse, VectorBucket, ListVectorBucketsOptions, ListVectorBucketsResponse } from './types';
/**
 * @hidden
 * Base implementation for vector bucket operations.
 * Use {@link StorageVectorsClient} via `supabase.storage.vectors` instead.
 */
export default class VectorBucketApi {
    protected url: string;
    protected headers: {
        [key: string]: string;
    };
    protected fetch: Fetch;
    protected shouldThrowOnError: boolean;
    /** Creates a new VectorBucketApi instance */
    constructor(url: string, headers?: {
        [key: string]: string;
    }, fetch?: Fetch);
    /** Enable throwing errors instead of returning them in the response */
    throwOnError(): this;
    /** Creates a new vector bucket */
    createBucket(vectorBucketName: string): Promise<ApiResponse<undefined>>;
    /** Retrieves metadata for a specific vector bucket */
    getBucket(vectorBucketName: string): Promise<ApiResponse<{
        vectorBucket: VectorBucket;
    }>>;
    /** Lists vector buckets with optional filtering and pagination */
    listBuckets(options?: ListVectorBucketsOptions): Promise<ApiResponse<ListVectorBucketsResponse>>;
    /** Deletes a vector bucket (must be empty first) */
    deleteBucket(vectorBucketName: string): Promise<ApiResponse<undefined>>;
}
//# sourceMappingURL=VectorBucketApi.d.ts.map
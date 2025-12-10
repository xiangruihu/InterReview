import { Fetch } from './fetch';
import { ApiResponse, VectorIndex, ListIndexesOptions, ListIndexesResponse, VectorDataType, DistanceMetric, MetadataConfiguration } from './types';
/**
 * @alpha
 *
 * Options for creating a vector index
 *
 * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
 */
export interface CreateIndexOptions {
    vectorBucketName: string;
    indexName: string;
    dataType: VectorDataType;
    dimension: number;
    distanceMetric: DistanceMetric;
    metadataConfiguration?: MetadataConfiguration;
}
/**
 * @hidden
 * Base implementation for vector index operations.
 * Use {@link VectorBucketScope} via `supabase.storage.vectors.from('bucket')` instead.
 */
export default class VectorIndexApi {
    protected url: string;
    protected headers: {
        [key: string]: string;
    };
    protected fetch: Fetch;
    protected shouldThrowOnError: boolean;
    /** Creates a new VectorIndexApi instance */
    constructor(url: string, headers?: {
        [key: string]: string;
    }, fetch?: Fetch);
    /** Enable throwing errors instead of returning them in the response */
    throwOnError(): this;
    /** Creates a new vector index within a bucket */
    createIndex(options: CreateIndexOptions): Promise<ApiResponse<undefined>>;
    /** Retrieves metadata for a specific vector index */
    getIndex(vectorBucketName: string, indexName: string): Promise<ApiResponse<{
        index: VectorIndex;
    }>>;
    /** Lists vector indexes within a bucket with optional filtering and pagination */
    listIndexes(options: ListIndexesOptions): Promise<ApiResponse<ListIndexesResponse>>;
    /** Deletes a vector index and all its data */
    deleteIndex(vectorBucketName: string, indexName: string): Promise<ApiResponse<undefined>>;
}
//# sourceMappingURL=VectorIndexApi.d.ts.map
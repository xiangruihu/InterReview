import VectorIndexApi, { CreateIndexOptions } from './VectorIndexApi';
import VectorDataApi from './VectorDataApi';
import { Fetch } from './fetch';
import VectorBucketApi from './VectorBucketApi';
import { ApiResponse, DeleteVectorsOptions, GetVectorsOptions, ListIndexesOptions, ListVectorsOptions, ListVectorBucketsOptions, ListVectorBucketsResponse, PutVectorsOptions, QueryVectorsOptions, VectorBucket } from './types';
/**
 *
 * @alpha
 *
 * Configuration options for the Storage Vectors client
 *
 * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
 */
export interface StorageVectorsClientOptions {
    /**
     * Custom headers to include in all requests
     */
    headers?: {
        [key: string]: string;
    };
    /**
     * Custom fetch implementation (optional)
     * Useful for testing or custom request handling
     */
    fetch?: Fetch;
}
/**
 *
 * @alpha
 *
 * Main client for interacting with S3 Vectors API
 * Provides access to bucket, index, and vector data operations
 *
 * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
 *
 * **Usage Patterns:**
 *
 * ```typescript
 * const { data, error } = await supabase
 *  .storage
 *  .vectors
 *  .createBucket('embeddings-prod')
 *
 * // Access index operations via buckets
 * const bucket = supabase.storage.vectors.from('embeddings-prod')
 * await bucket.createIndex({
 *   indexName: 'documents',
 *   dataType: 'float32',
 *   dimension: 1536,
 *   distanceMetric: 'cosine'
 * })
 *
 * // Access vector operations via index
 * const index = bucket.index('documents')
 * await index.putVectors({
 *   vectors: [
 *     { key: 'doc-1', data: { float32: [...] }, metadata: { title: 'Intro' } }
 *   ]
 * })
 *
 * // Query similar vectors
 * const { data } = await index.queryVectors({
 *   queryVector: { float32: [...] },
 *   topK: 5,
 *   returnDistance: true
 * })
 * ```
 */
export declare class StorageVectorsClient extends VectorBucketApi {
    /**
     * @alpha
     *
     * Creates a StorageVectorsClient that can manage buckets, indexes, and vectors.
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param url - Base URL of the Storage Vectors REST API.
     * @param options.headers - Optional headers (for example `Authorization`) applied to every request.
     * @param options.fetch - Optional custom `fetch` implementation for non-browser runtimes.
     *
     * @example
     * ```typescript
     * const client = new StorageVectorsClient(url, options)
     * ```
     */
    constructor(url: string, options?: StorageVectorsClientOptions);
    /**
     *
     * @alpha
     *
     * Access operations for a specific vector bucket
     * Returns a scoped client for index and vector operations within the bucket
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param vectorBucketName - Name of the vector bucket
     * @returns Bucket-scoped client with index and vector operations
     *
     * @example
     * ```typescript
     * const bucket = supabase.storage.vectors.from('embeddings-prod')
     * ```
     */
    from(vectorBucketName: string): VectorBucketScope;
    /**
     *
     * @alpha
     *
     * Creates a new vector bucket
     * Vector buckets are containers for vector indexes and their data
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param vectorBucketName - Unique name for the vector bucket
     * @returns Promise with empty response on success or error
     *
     * @example
     * ```typescript
     * const { data, error } = await supabase
     *   .storage
     *   .vectors
     *   .createBucket('embeddings-prod')
     * ```
     */
    createBucket(vectorBucketName: string): Promise<ApiResponse<undefined>>;
    /**
     *
     * @alpha
     *
     * Retrieves metadata for a specific vector bucket
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param vectorBucketName - Name of the vector bucket
     * @returns Promise with bucket metadata or error
     *
     * @example
     * ```typescript
     * const { data, error } = await supabase
     *   .storage
     *   .vectors
     *   .getBucket('embeddings-prod')
     *
     * console.log('Bucket created:', data?.vectorBucket.creationTime)
     * ```
     */
    getBucket(vectorBucketName: string): Promise<ApiResponse<{
        vectorBucket: VectorBucket;
    }>>;
    /**
     *
     * @alpha
     *
     * Lists all vector buckets with optional filtering and pagination
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param options - Optional filters (prefix, maxResults, nextToken)
     * @returns Promise with list of buckets or error
     *
     * @example
     * ```typescript
     * const { data, error } = await supabase
     *   .storage
     *   .vectors
     *   .listBuckets({ prefix: 'embeddings-' })
     *
     * data?.vectorBuckets.forEach(bucket => {
     *   console.log(bucket.vectorBucketName)
     * })
     * ```
     */
    listBuckets(options?: ListVectorBucketsOptions): Promise<ApiResponse<ListVectorBucketsResponse>>;
    /**
     *
     * @alpha
     *
     * Deletes a vector bucket (bucket must be empty)
     * All indexes must be deleted before deleting the bucket
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param vectorBucketName - Name of the vector bucket to delete
     * @returns Promise with empty response on success or error
     *
     * @example
     * ```typescript
     * const { data, error } = await supabase
     *   .storage
     *   .vectors
     *   .deleteBucket('embeddings-old')
     * ```
     */
    deleteBucket(vectorBucketName: string): Promise<ApiResponse<undefined>>;
}
/**
 *
 * @alpha
 *
 * Scoped client for operations within a specific vector bucket
 * Provides index management and access to vector operations
 *
 * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
 */
export declare class VectorBucketScope extends VectorIndexApi {
    private vectorBucketName;
    /**
     * @alpha
     *
     * Creates a helper that automatically scopes all index operations to the provided bucket.
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @example
     * ```typescript
     * const bucket = supabase.storage.vectors.from('embeddings-prod')
     * ```
     */
    constructor(url: string, headers: {
        [key: string]: string;
    }, vectorBucketName: string, fetch?: Fetch);
    /**
     *
     * @alpha
     *
     * Creates a new vector index in this bucket
     * Convenience method that automatically includes the bucket name
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param options - Index configuration (vectorBucketName is automatically set)
     * @returns Promise with empty response on success or error
     *
     * @example
     * ```typescript
     * const bucket = supabase.storage.vectors.from('embeddings-prod')
     * await bucket.createIndex({
     *   indexName: 'documents-openai',
     *   dataType: 'float32',
     *   dimension: 1536,
     *   distanceMetric: 'cosine',
     *   metadataConfiguration: {
     *     nonFilterableMetadataKeys: ['raw_text']
     *   }
     * })
     * ```
     */
    createIndex(options: Omit<CreateIndexOptions, 'vectorBucketName'>): Promise<ApiResponse<undefined>>;
    /**
     *
     * @alpha
     *
     * Lists indexes in this bucket
     * Convenience method that automatically includes the bucket name
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param options - Listing options (vectorBucketName is automatically set)
     * @returns Promise with response containing indexes array and pagination token or error
     *
     * @example
     * ```typescript
     * const bucket = supabase.storage.vectors.from('embeddings-prod')
     * const { data } = await bucket.listIndexes({ prefix: 'documents-' })
     * ```
     */
    listIndexes(options?: Omit<ListIndexesOptions, 'vectorBucketName'>): Promise<ApiResponse<import("./types").ListIndexesResponse>>;
    /**
     *
     * @alpha
     *
     * Retrieves metadata for a specific index in this bucket
     * Convenience method that automatically includes the bucket name
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param indexName - Name of the index to retrieve
     * @returns Promise with index metadata or error
     *
     * @example
     * ```typescript
     * const bucket = supabase.storage.vectors.from('embeddings-prod')
     * const { data } = await bucket.getIndex('documents-openai')
     * console.log('Dimension:', data?.index.dimension)
     * ```
     */
    getIndex(indexName: string): Promise<ApiResponse<{
        index: import("./types").VectorIndex;
    }>>;
    /**
     *
     * @alpha
     *
     * Deletes an index from this bucket
     * Convenience method that automatically includes the bucket name
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param indexName - Name of the index to delete
     * @returns Promise with empty response on success or error
     *
     * @example
     * ```typescript
     * const bucket = supabase.storage.vectors.from('embeddings-prod')
     * await bucket.deleteIndex('old-index')
     * ```
     */
    deleteIndex(indexName: string): Promise<ApiResponse<undefined>>;
    /**
     *
     * @alpha
     *
     * Access operations for a specific index within this bucket
     * Returns a scoped client for vector data operations
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param indexName - Name of the index
     * @returns Index-scoped client with vector data operations
     *
     * @example
     * ```typescript
     * const index = supabase.storage.vectors.from('embeddings-prod').index('documents-openai')
     *
     * // Insert vectors
     * await index.putVectors({
     *   vectors: [
     *     { key: 'doc-1', data: { float32: [...] }, metadata: { title: 'Intro' } }
     *   ]
     * })
     *
     * // Query similar vectors
     * const { data } = await index.queryVectors({
     *   queryVector: { float32: [...] },
     *   topK: 5
     * })
     * ```
     */
    index(indexName: string): VectorIndexScope;
}
/**
 *
 * @alpha
 *
 * Scoped client for operations within a specific vector index
 * Provides vector data operations (put, get, list, query, delete)
 *
 * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
 */
export declare class VectorIndexScope extends VectorDataApi {
    private vectorBucketName;
    private indexName;
    /**
     *
     * @alpha
     *
     * Creates a helper that automatically scopes all vector operations to the provided bucket/index names.
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @example
     * ```typescript
     * const index = supabase.storage.vectors.from('embeddings-prod').index('documents-openai')
     * ```
     */
    constructor(url: string, headers: {
        [key: string]: string;
    }, vectorBucketName: string, indexName: string, fetch?: Fetch);
    /**
     *
     * @alpha
     *
     * Inserts or updates vectors in this index
     * Convenience method that automatically includes bucket and index names
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param options - Vector insertion options (bucket and index names automatically set)
     * @returns Promise with empty response on success or error
     *
     * @example
     * ```typescript
     * const index = supabase.storage.vectors.from('embeddings-prod').index('documents-openai')
     * await index.putVectors({
     *   vectors: [
     *     {
     *       key: 'doc-1',
     *       data: { float32: [0.1, 0.2, ...] },
     *       metadata: { title: 'Introduction', page: 1 }
     *     }
     *   ]
     * })
     * ```
     */
    putVectors(options: Omit<PutVectorsOptions, 'vectorBucketName' | 'indexName'>): Promise<ApiResponse<undefined>>;
    /**
     *
     * @alpha
     *
     * Retrieves vectors by keys from this index
     * Convenience method that automatically includes bucket and index names
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param options - Vector retrieval options (bucket and index names automatically set)
     * @returns Promise with response containing vectors array or error
     *
     * @example
     * ```typescript
     * const index = supabase.storage.vectors.from('embeddings-prod').index('documents-openai')
     * const { data } = await index.getVectors({
     *   keys: ['doc-1', 'doc-2'],
     *   returnMetadata: true
     * })
     * ```
     */
    getVectors(options: Omit<GetVectorsOptions, 'vectorBucketName' | 'indexName'>): Promise<ApiResponse<import("./types").GetVectorsResponse>>;
    /**
     *
     * @alpha
     *
     * Lists vectors in this index with pagination
     * Convenience method that automatically includes bucket and index names
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param options - Listing options (bucket and index names automatically set)
     * @returns Promise with response containing vectors array and pagination token or error
     *
     * @example
     * ```typescript
     * const index = supabase.storage.vectors.from('embeddings-prod').index('documents-openai')
     * const { data } = await index.listVectors({
     *   maxResults: 500,
     *   returnMetadata: true
     * })
     * ```
     */
    listVectors(options?: Omit<ListVectorsOptions, 'vectorBucketName' | 'indexName'>): Promise<ApiResponse<import("./types").ListVectorsResponse>>;
    /**
     *
     * @alpha
     *
     * Queries for similar vectors in this index
     * Convenience method that automatically includes bucket and index names
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param options - Query options (bucket and index names automatically set)
     * @returns Promise with response containing matches array of similar vectors ordered by distance or error
     *
     * @example
     * ```typescript
     * const index = supabase.storage.vectors.from('embeddings-prod').index('documents-openai')
     * const { data } = await index.queryVectors({
     *   queryVector: { float32: [0.1, 0.2, ...] },
     *   topK: 5,
     *   filter: { category: 'technical' },
     *   returnDistance: true,
     *   returnMetadata: true
     * })
     * ```
     */
    queryVectors(options: Omit<QueryVectorsOptions, 'vectorBucketName' | 'indexName'>): Promise<ApiResponse<import("./types").QueryVectorsResponse>>;
    /**
     *
     * @alpha
     *
     * Deletes vectors by keys from this index
     * Convenience method that automatically includes bucket and index names
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @param options - Deletion options (bucket and index names automatically set)
     * @returns Promise with empty response on success or error
     *
     * @example
     * ```typescript
     * const index = supabase.storage.vectors.from('embeddings-prod').index('documents-openai')
     * await index.deleteVectors({
     *   keys: ['doc-1', 'doc-2', 'doc-3']
     * })
     * ```
     */
    deleteVectors(options: Omit<DeleteVectorsOptions, 'vectorBucketName' | 'indexName'>): Promise<ApiResponse<undefined>>;
}
//# sourceMappingURL=StorageVectorsClient.d.ts.map
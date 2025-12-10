import StorageFileApi from './packages/StorageFileApi';
import StorageBucketApi from './packages/StorageBucketApi';
import StorageAnalyticsClient from './packages/StorageAnalyticsClient';
import { Fetch } from './lib/fetch';
import { StorageVectorsClient } from './lib/vectors';
export interface StorageClientOptions {
    useNewHostname?: boolean;
}
export declare class StorageClient extends StorageBucketApi {
    /**
     * Creates a client for Storage buckets, files, analytics, and vectors.
     *
     * @category File Buckets
     * @example
     * ```ts
     * import { StorageClient } from '@supabase/storage-js'
     *
     * const storage = new StorageClient('https://xyzcompany.supabase.co/storage/v1', {
     *   apikey: 'public-anon-key',
     * })
     * const avatars = storage.from('avatars')
     * ```
     */
    constructor(url: string, headers?: {
        [key: string]: string;
    }, fetch?: Fetch, opts?: StorageClientOptions);
    /**
     * Perform file operation in a bucket.
     *
     * @category File Buckets
     * @param id The bucket id to operate on.
     *
     * @example
     * ```typescript
     * const avatars = supabase.storage.from('avatars')
     * ```
     */
    from(id: string): StorageFileApi;
    /**
     *
     * @alpha
     *
     * Access vector storage operations.
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Vector Buckets
     * @returns A StorageVectorsClient instance configured with the current storage settings.
     */
    get vectors(): StorageVectorsClient;
    /**
     *
     * @alpha
     *
     * Access analytics storage operations using Iceberg tables.
     *
     * **Public alpha:** This API is part of a public alpha release and may not be available to your account type.
     *
     * @category Analytics Buckets
     * @returns A StorageAnalyticsClient instance configured with the current storage settings.
     */
    get analytics(): StorageAnalyticsClient;
}
//# sourceMappingURL=StorageClient.d.ts.map
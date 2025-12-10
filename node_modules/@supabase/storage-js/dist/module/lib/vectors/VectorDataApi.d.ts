import { Fetch } from './fetch';
import { ApiResponse, PutVectorsOptions, GetVectorsOptions, GetVectorsResponse, DeleteVectorsOptions, ListVectorsOptions, ListVectorsResponse, QueryVectorsOptions, QueryVectorsResponse } from './types';
/**
 * @hidden
 * Base implementation for vector data operations.
 * Use {@link VectorIndexScope} via `supabase.storage.vectors.from('bucket').index('idx')` instead.
 */
export default class VectorDataApi {
    protected url: string;
    protected headers: {
        [key: string]: string;
    };
    protected fetch: Fetch;
    protected shouldThrowOnError: boolean;
    /** Creates a new VectorDataApi instance */
    constructor(url: string, headers?: {
        [key: string]: string;
    }, fetch?: Fetch);
    /** Enable throwing errors instead of returning them in the response */
    throwOnError(): this;
    /** Inserts or updates vectors in batch (1-500 per request) */
    putVectors(options: PutVectorsOptions): Promise<ApiResponse<undefined>>;
    /** Retrieves vectors by their keys in batch */
    getVectors(options: GetVectorsOptions): Promise<ApiResponse<GetVectorsResponse>>;
    /** Lists vectors in an index with pagination */
    listVectors(options: ListVectorsOptions): Promise<ApiResponse<ListVectorsResponse>>;
    /** Queries for similar vectors using approximate nearest neighbor search */
    queryVectors(options: QueryVectorsOptions): Promise<ApiResponse<QueryVectorsResponse>>;
    /** Deletes vectors by their keys in batch (1-500 per request) */
    deleteVectors(options: DeleteVectorsOptions): Promise<ApiResponse<undefined>>;
}
//# sourceMappingURL=VectorDataApi.d.ts.map
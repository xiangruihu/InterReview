import { __awaiter } from "tslib";
import { DEFAULT_HEADERS } from './constants';
import { isStorageVectorsError } from './errors';
import { post } from './fetch';
import { resolveFetch } from './helpers';
/**
 * @hidden
 * Base implementation for vector data operations.
 * Use {@link VectorIndexScope} via `supabase.storage.vectors.from('bucket').index('idx')` instead.
 */
export default class VectorDataApi {
    /** Creates a new VectorDataApi instance */
    constructor(url, headers = {}, fetch) {
        this.shouldThrowOnError = false;
        this.url = url.replace(/\/$/, '');
        this.headers = Object.assign(Object.assign({}, DEFAULT_HEADERS), headers);
        this.fetch = resolveFetch(fetch);
    }
    /** Enable throwing errors instead of returning them in the response */
    throwOnError() {
        this.shouldThrowOnError = true;
        return this;
    }
    /** Inserts or updates vectors in batch (1-500 per request) */
    putVectors(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate batch size
                if (options.vectors.length < 1 || options.vectors.length > 500) {
                    throw new Error('Vector batch size must be between 1 and 500 items');
                }
                const data = yield post(this.fetch, `${this.url}/PutVectors`, options, {
                    headers: this.headers,
                });
                return { data: data || {}, error: null };
            }
            catch (error) {
                if (this.shouldThrowOnError) {
                    throw error;
                }
                if (isStorageVectorsError(error)) {
                    return { data: null, error };
                }
                throw error;
            }
        });
    }
    /** Retrieves vectors by their keys in batch */
    getVectors(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield post(this.fetch, `${this.url}/GetVectors`, options, {
                    headers: this.headers,
                });
                return { data, error: null };
            }
            catch (error) {
                if (this.shouldThrowOnError) {
                    throw error;
                }
                if (isStorageVectorsError(error)) {
                    return { data: null, error };
                }
                throw error;
            }
        });
    }
    /** Lists vectors in an index with pagination */
    listVectors(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate segment configuration
                if (options.segmentCount !== undefined) {
                    if (options.segmentCount < 1 || options.segmentCount > 16) {
                        throw new Error('segmentCount must be between 1 and 16');
                    }
                    if (options.segmentIndex !== undefined) {
                        if (options.segmentIndex < 0 || options.segmentIndex >= options.segmentCount) {
                            throw new Error(`segmentIndex must be between 0 and ${options.segmentCount - 1}`);
                        }
                    }
                }
                const data = yield post(this.fetch, `${this.url}/ListVectors`, options, {
                    headers: this.headers,
                });
                return { data, error: null };
            }
            catch (error) {
                if (this.shouldThrowOnError) {
                    throw error;
                }
                if (isStorageVectorsError(error)) {
                    return { data: null, error };
                }
                throw error;
            }
        });
    }
    /** Queries for similar vectors using approximate nearest neighbor search */
    queryVectors(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield post(this.fetch, `${this.url}/QueryVectors`, options, {
                    headers: this.headers,
                });
                return { data, error: null };
            }
            catch (error) {
                if (this.shouldThrowOnError) {
                    throw error;
                }
                if (isStorageVectorsError(error)) {
                    return { data: null, error };
                }
                throw error;
            }
        });
    }
    /** Deletes vectors by their keys in batch (1-500 per request) */
    deleteVectors(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate batch size
                if (options.keys.length < 1 || options.keys.length > 500) {
                    throw new Error('Keys batch size must be between 1 and 500 items');
                }
                const data = yield post(this.fetch, `${this.url}/DeleteVectors`, options, {
                    headers: this.headers,
                });
                return { data: data || {}, error: null };
            }
            catch (error) {
                if (this.shouldThrowOnError) {
                    throw error;
                }
                if (isStorageVectorsError(error)) {
                    return { data: null, error };
                }
                throw error;
            }
        });
    }
}
//# sourceMappingURL=VectorDataApi.js.map
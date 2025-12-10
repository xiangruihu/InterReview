import { __awaiter } from "tslib";
import { DEFAULT_HEADERS } from './constants';
import { isStorageVectorsError } from './errors';
import { post } from './fetch';
import { resolveFetch } from './helpers';
/**
 * @hidden
 * Base implementation for vector index operations.
 * Use {@link VectorBucketScope} via `supabase.storage.vectors.from('bucket')` instead.
 */
export default class VectorIndexApi {
    /** Creates a new VectorIndexApi instance */
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
    /** Creates a new vector index within a bucket */
    createIndex(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield post(this.fetch, `${this.url}/CreateIndex`, options, {
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
    /** Retrieves metadata for a specific vector index */
    getIndex(vectorBucketName, indexName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield post(this.fetch, `${this.url}/GetIndex`, { vectorBucketName, indexName }, { headers: this.headers });
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
    /** Lists vector indexes within a bucket with optional filtering and pagination */
    listIndexes(options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield post(this.fetch, `${this.url}/ListIndexes`, options, {
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
    /** Deletes a vector index and all its data */
    deleteIndex(vectorBucketName, indexName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield post(this.fetch, `${this.url}/DeleteIndex`, { vectorBucketName, indexName }, { headers: this.headers });
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
//# sourceMappingURL=VectorIndexApi.js.map
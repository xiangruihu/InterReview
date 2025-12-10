import { __awaiter } from "tslib";
import { DEFAULT_HEADERS } from './constants';
import { isStorageVectorsError } from './errors';
import { post } from './fetch';
import { resolveFetch } from './helpers';
/**
 * @hidden
 * Base implementation for vector bucket operations.
 * Use {@link StorageVectorsClient} via `supabase.storage.vectors` instead.
 */
export default class VectorBucketApi {
    /** Creates a new VectorBucketApi instance */
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
    /** Creates a new vector bucket */
    createBucket(vectorBucketName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield post(this.fetch, `${this.url}/CreateVectorBucket`, { vectorBucketName }, { headers: this.headers });
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
    /** Retrieves metadata for a specific vector bucket */
    getBucket(vectorBucketName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield post(this.fetch, `${this.url}/GetVectorBucket`, { vectorBucketName }, { headers: this.headers });
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
    /** Lists vector buckets with optional filtering and pagination */
    listBuckets() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            try {
                const data = yield post(this.fetch, `${this.url}/ListVectorBuckets`, options, {
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
    /** Deletes a vector bucket (must be empty first) */
    deleteBucket(vectorBucketName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield post(this.fetch, `${this.url}/DeleteVectorBucket`, { vectorBucketName }, { headers: this.headers });
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
//# sourceMappingURL=VectorBucketApi.js.map
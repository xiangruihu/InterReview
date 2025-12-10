"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const constants_1 = require("./constants");
const errors_1 = require("./errors");
const fetch_1 = require("./fetch");
const helpers_1 = require("./helpers");
/**
 * @hidden
 * Base implementation for vector bucket operations.
 * Use {@link StorageVectorsClient} via `supabase.storage.vectors` instead.
 */
class VectorBucketApi {
    /** Creates a new VectorBucketApi instance */
    constructor(url, headers = {}, fetch) {
        this.shouldThrowOnError = false;
        this.url = url.replace(/\/$/, '');
        this.headers = Object.assign(Object.assign({}, constants_1.DEFAULT_HEADERS), headers);
        this.fetch = (0, helpers_1.resolveFetch)(fetch);
    }
    /** Enable throwing errors instead of returning them in the response */
    throwOnError() {
        this.shouldThrowOnError = true;
        return this;
    }
    /** Creates a new vector bucket */
    createBucket(vectorBucketName) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, fetch_1.post)(this.fetch, `${this.url}/CreateVectorBucket`, { vectorBucketName }, { headers: this.headers });
                return { data: data || {}, error: null };
            }
            catch (error) {
                if (this.shouldThrowOnError) {
                    throw error;
                }
                if ((0, errors_1.isStorageVectorsError)(error)) {
                    return { data: null, error };
                }
                throw error;
            }
        });
    }
    /** Retrieves metadata for a specific vector bucket */
    getBucket(vectorBucketName) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, fetch_1.post)(this.fetch, `${this.url}/GetVectorBucket`, { vectorBucketName }, { headers: this.headers });
                return { data, error: null };
            }
            catch (error) {
                if (this.shouldThrowOnError) {
                    throw error;
                }
                if ((0, errors_1.isStorageVectorsError)(error)) {
                    return { data: null, error };
                }
                throw error;
            }
        });
    }
    /** Lists vector buckets with optional filtering and pagination */
    listBuckets() {
        return tslib_1.__awaiter(this, arguments, void 0, function* (options = {}) {
            try {
                const data = yield (0, fetch_1.post)(this.fetch, `${this.url}/ListVectorBuckets`, options, {
                    headers: this.headers,
                });
                return { data, error: null };
            }
            catch (error) {
                if (this.shouldThrowOnError) {
                    throw error;
                }
                if ((0, errors_1.isStorageVectorsError)(error)) {
                    return { data: null, error };
                }
                throw error;
            }
        });
    }
    /** Deletes a vector bucket (must be empty first) */
    deleteBucket(vectorBucketName) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, fetch_1.post)(this.fetch, `${this.url}/DeleteVectorBucket`, { vectorBucketName }, { headers: this.headers });
                return { data: data || {}, error: null };
            }
            catch (error) {
                if (this.shouldThrowOnError) {
                    throw error;
                }
                if ((0, errors_1.isStorageVectorsError)(error)) {
                    return { data: null, error };
                }
                throw error;
            }
        });
    }
}
exports.default = VectorBucketApi;
//# sourceMappingURL=VectorBucketApi.js.map
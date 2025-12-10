"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const constants_1 = require("./constants");
const errors_1 = require("./errors");
const fetch_1 = require("./fetch");
const helpers_1 = require("./helpers");
/**
 * @hidden
 * Base implementation for vector index operations.
 * Use {@link VectorBucketScope} via `supabase.storage.vectors.from('bucket')` instead.
 */
class VectorIndexApi {
    /** Creates a new VectorIndexApi instance */
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
    /** Creates a new vector index within a bucket */
    createIndex(options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, fetch_1.post)(this.fetch, `${this.url}/CreateIndex`, options, {
                    headers: this.headers,
                });
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
    /** Retrieves metadata for a specific vector index */
    getIndex(vectorBucketName, indexName) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, fetch_1.post)(this.fetch, `${this.url}/GetIndex`, { vectorBucketName, indexName }, { headers: this.headers });
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
    /** Lists vector indexes within a bucket with optional filtering and pagination */
    listIndexes(options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, fetch_1.post)(this.fetch, `${this.url}/ListIndexes`, options, {
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
    /** Deletes a vector index and all its data */
    deleteIndex(vectorBucketName, indexName) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, fetch_1.post)(this.fetch, `${this.url}/DeleteIndex`, { vectorBucketName, indexName }, { headers: this.headers });
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
exports.default = VectorIndexApi;
//# sourceMappingURL=VectorIndexApi.js.map
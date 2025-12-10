"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const constants_1 = require("./constants");
const errors_1 = require("./errors");
const fetch_1 = require("./fetch");
const helpers_1 = require("./helpers");
/**
 * @hidden
 * Base implementation for vector data operations.
 * Use {@link VectorIndexScope} via `supabase.storage.vectors.from('bucket').index('idx')` instead.
 */
class VectorDataApi {
    /** Creates a new VectorDataApi instance */
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
    /** Inserts or updates vectors in batch (1-500 per request) */
    putVectors(options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                // Validate batch size
                if (options.vectors.length < 1 || options.vectors.length > 500) {
                    throw new Error('Vector batch size must be between 1 and 500 items');
                }
                const data = yield (0, fetch_1.post)(this.fetch, `${this.url}/PutVectors`, options, {
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
    /** Retrieves vectors by their keys in batch */
    getVectors(options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, fetch_1.post)(this.fetch, `${this.url}/GetVectors`, options, {
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
    /** Lists vectors in an index with pagination */
    listVectors(options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
                const data = yield (0, fetch_1.post)(this.fetch, `${this.url}/ListVectors`, options, {
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
    /** Queries for similar vectors using approximate nearest neighbor search */
    queryVectors(options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield (0, fetch_1.post)(this.fetch, `${this.url}/QueryVectors`, options, {
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
    /** Deletes vectors by their keys in batch (1-500 per request) */
    deleteVectors(options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                // Validate batch size
                if (options.keys.length < 1 || options.keys.length > 500) {
                    throw new Error('Keys batch size must be between 1 and 500 items');
                }
                const data = yield (0, fetch_1.post)(this.fetch, `${this.url}/DeleteVectors`, options, {
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
}
exports.default = VectorDataApi;
//# sourceMappingURL=VectorDataApi.js.map
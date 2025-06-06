// SPDX-License-Identifier: Apache-2.0

import { ALL_WEB_NETWORK_NODES } from "../constants/ClientConstants.js";
import GrpcServiceError from "../grpc/GrpcServiceError.js";
import GrpcStatus from "../grpc/GrpcStatus.js";
import HttpError from "../http/HttpError.js";
import HttpStatus from "../http/HttpStatus.js";
import Channel, { encodeRequest, decodeUnaryResponse } from "./Channel.js";

export default class WebChannel extends Channel {
    /**
     * @param {string} address
     */
    constructor(address) {
        super();

        /**
         * @type {string}
         * @private
         */
        this._address = address;
    }

    /**
     * @override
     * @returns {void}
     */
    close() {
        // do nothing
    }

    /**
     * @override
     * @protected
     * @param {string} serviceName
     * @returns {import("protobufjs").RPCImpl}
     */
    _createUnaryClient(serviceName) {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        return async (method, requestData, callback) => {
            try {
                // this will be executed in a browser environment so eslint is
                // disabled for the fetch call
                //eslint-disable-next-line n/no-unsupported-features/node-builtins
                const response = await fetch(
                    `${this._address}/proto.${serviceName}/${method.name}`,
                    {
                        method: "POST",
                        headers: {
                            "content-type": "application/grpc-web+proto",
                            "x-user-agent": "hedera-sdk-js/v2",
                            "x-grpc-web": "1",
                        },
                        body: encodeRequest(requestData),
                    },
                );

                if (!response.ok) {
                    const error = new HttpError(
                        HttpStatus._fromValue(response.status),
                    );
                    callback(error, null);
                }

                // Check headers for gRPC errors
                const grpcStatus = response.headers.get("grpc-status");
                const grpcMessage = response.headers.get("grpc-message");

                if (grpcStatus != null && grpcMessage != null) {
                    const error = new GrpcServiceError(
                        GrpcStatus._fromValue(parseInt(grpcStatus)),
                        ALL_WEB_NETWORK_NODES[this._address].toString(),
                    );
                    error.message = grpcMessage;
                    callback(error, null);
                }

                const responseBuffer = await response.arrayBuffer();
                const unaryResponse = decodeUnaryResponse(responseBuffer);

                callback(null, unaryResponse);
            } catch (error) {
                const err = new GrpcServiceError(
                    // retry on grpc web errors
                    GrpcStatus._fromValue(18),
                    ALL_WEB_NETWORK_NODES[this._address].toString(),
                );
                callback(err, null);
            }
        };
    }
}
